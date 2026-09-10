using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BoardGame.Api.Platform.Auth;
using Xunit;

namespace BoardGame.Api.Tests.Platform.Auth;

/// <summary>
/// Test HTTP tích hợp qua đúng pipeline thật (routing + model binding + [Authorize] + cookie JWT)
/// cho <see cref="Platform.Auth.AuthController"/> — trước đây CHỈ được verify bằng
/// <see cref="TokenServiceTests"/> (tạo/validate JWT thuần, không qua HTTP) và live-test thủ công
/// qua Docker Compose + curl (không tự động, không chạy trong CI). Đây là lần đầu tiên luồng
/// đăng nhập OTP đầy đủ + refresh cookie đổi tên hiển thị được verify tự động qua HTTP thật.
///
/// Mỗi test dùng 1 email ngẫu nhiên riêng (<see cref="UniqueEmail"/>) để chạy độc lập trên
/// CÙNG 1 container Postgres chia sẻ (xem <see cref="AuthApiFactory"/>) mà không đụng rate-limit/
/// dữ liệu của nhau.
/// </summary>
[Collection("AuthApi")]
public class AuthControllerIntegrationTests
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    private readonly AuthApiFactory _factory;
    private readonly HttpClient _client;

    public AuthControllerIntegrationTests(AuthApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient(); // HandleCookies=true mặc định — cookie JWT tự giữ giữa các request cùng client.
    }

    private static string UniqueEmail([System.Runtime.CompilerServices.CallerMemberName] string test = "")
        => $"{test.ToLowerInvariant()}-{Guid.NewGuid():N}@test.local";

    private async Task<string> RequestOtpAndGetCode(string email)
    {
        var res = await _client.PostAsJsonAsync("/api/auth/request-otp", new { email });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        return _factory.ExtractOtpCode(email);
    }

    [Fact]
    public async Task FullLoginFlow_RequestThenVerify_IssuesCookieAndReturnsUser()
    {
        var email = UniqueEmail();
        var code = await RequestOtpAndGetCode(email);

        var verifyRes = await _client.PostAsJsonAsync("/api/auth/verify-otp", new { email, code });

        Assert.Equal(HttpStatusCode.OK, verifyRes.StatusCode);
        var user = await verifyRes.Content.ReadFromJsonAsync<UserDto>(JsonOpts);
        Assert.NotNull(user);
        Assert.Equal(email, user!.Email);
        Assert.Equal(email.Split('@')[0], user.DisplayName); // tên hiển thị mặc định = phần trước @

        // Cookie JWT vừa nhận phải dùng được ngay cho request khác cần đăng nhập.
        var meRes = await _client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, meRes.StatusCode);
        var me = await meRes.Content.ReadFromJsonAsync<UserDto>(JsonOpts);
        Assert.Equal(user.Id, me!.Id);
    }

    [Fact]
    public async Task RequestOtp_InvalidEmail_ReturnsBadRequest()
    {
        var res = await _client.PostAsJsonAsync("/api/auth/request-otp", new { email = "khong-phai-email" });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task VerifyOtp_WrongCode_ReturnsBadRequestAndDoesNotSetCookie()
    {
        var email = UniqueEmail();
        await RequestOtpAndGetCode(email);

        var res = await _client.PostAsJsonAsync("/api/auth/verify-otp", new { email, code = "000000" });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains("Mã không đúng", body.GetProperty("error").GetString());

        var meRes = await _client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, meRes.StatusCode);
    }

    [Fact]
    public async Task VerifyOtp_NoOtpRequested_ReturnsBadRequest()
    {
        var res = await _client.PostAsJsonAsync("/api/auth/verify-otp", new { email = UniqueEmail(), code = "123456" });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Me_WithoutCookie_ReturnsUnauthorized()
    {
        using var anonClient = _factory.CreateClient();

        var res = await anonClient.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task UpdateDisplayName_Authenticated_PersistsAndRefreshesCookie()
    {
        using var client = _factory.CreateClient();
        var email = UniqueEmail();
        var code = await RequestOtpAndGetCode(email);
        await client.PostAsJsonAsync("/api/auth/verify-otp", new { email, code });

        var updateRes = await client.PutAsJsonAsync("/api/auth/display-name", new { displayName = "Tên Mới" });

        Assert.Equal(HttpStatusCode.OK, updateRes.StatusCode);
        var updated = await updateRes.Content.ReadFromJsonAsync<UserDto>(JsonOpts);
        Assert.Equal("Tên Mới", updated!.DisplayName);

        // Cookie refresh đúng claim mới — /me ngay sau đó (không cần đăng nhập lại) phản ánh tên mới.
        var meRes = await client.GetAsync("/api/auth/me");
        var me = await meRes.Content.ReadFromJsonAsync<UserDto>(JsonOpts);
        Assert.Equal("Tên Mới", me!.DisplayName);
    }

    [Fact]
    public async Task UpdateDisplayName_TooLong_ReturnsBadRequestAndDoesNotChangeName()
    {
        using var client = _factory.CreateClient();
        var email = UniqueEmail();
        var code = await RequestOtpAndGetCode(email);
        await client.PostAsJsonAsync("/api/auth/verify-otp", new { email, code });

        var res = await client.PutAsJsonAsync("/api/auth/display-name", new { displayName = new string('a', 31) });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var me = await (await client.GetAsync("/api/auth/me")).Content.ReadFromJsonAsync<UserDto>(JsonOpts);
        Assert.Equal(email.Split('@')[0], me!.DisplayName);
    }

    [Fact]
    public async Task UpdateDisplayName_WithoutAuth_ReturnsUnauthorized()
    {
        using var anonClient = _factory.CreateClient();

        var res = await anonClient.PutAsJsonAsync("/api/auth/display-name", new { displayName = "Hacker" });

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Logout_ClearsCookie_MeReturnsUnauthorizedAfter()
    {
        using var client = _factory.CreateClient();
        var email = UniqueEmail();
        var code = await RequestOtpAndGetCode(email);
        await client.PostAsJsonAsync("/api/auth/verify-otp", new { email, code });
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);

        var logoutRes = await client.PostAsync("/api/auth/logout", null);

        Assert.Equal(HttpStatusCode.OK, logoutRes.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
    }
}
