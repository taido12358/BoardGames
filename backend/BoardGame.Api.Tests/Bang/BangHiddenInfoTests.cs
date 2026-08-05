using System.Text.Json;
using BoardGame.Api.Games.Bang;
using BoardGame.Api.Platform;
using Xunit;

namespace BoardGame.Api.Tests.Bang;

/// <summary>
/// §39/§50 của spec: server không bao giờ được nghiêm túc gửi bài/vai trò người khác
/// cho một client — không chỉ ẩn bằng CSS. Test bằng cách soi thẳng JSON đã serialize.
/// </summary>
public class BangHiddenInfoTests
{
    private static readonly Random Rng = new(9);

    [Fact]
    public void BuildViewerPayload_OwnHandVisible_ToSelf()
    {
        var state = TestFactory.MakeState(4);
        var myCard = TestFactory.Card(CardKind.Bang, "♥", "K");
        state.Players[0].Hand.Add(myCard);

        var payload = BangRules.BuildViewerPayload(state, "P0");

        Assert.NotNull(payload.You);
        Assert.Contains(payload.You!.Hand, c => c.Id == myCard.Id);
    }

    [Fact]
    public void BuildViewerPayload_NeverSerializesOtherPlayersHandContents()
    {
        var state = TestFactory.MakeState(4);
        var secretCard = TestFactory.Card(CardKind.Bang, "♥", "K");
        state.Players[1].Hand.Add(secretCard); // bài bí mật của P1

        var payload = BangRules.BuildViewerPayload(state, "P0"); // P0 xem
        var json = GameJson.Serialize(payload);

        // ID lá bài bí mật của đối thủ không được xuất hiện DƯỚI BẤT KỲ HÌNH THỨC nào
        // trong payload gửi cho P0 — không chỉ "ẩn ở UI".
        Assert.DoesNotContain(secretCard.Id, json);
        // Chỉ có số lượng bài (cardCount), không phải nội dung.
        var p1Public = payload.Players.Single(p => p.Id == "P1");
        Assert.Equal(1, p1Public.CardCount);
    }

    [Fact]
    public void BuildViewerPayload_HidesRoleOfAliveNonSheriffPlayers_FromOthers()
    {
        var state = TestFactory.MakeState(4, roles: new[] { RoleKind.Sheriff, RoleKind.Outlaw, RoleKind.Renegade, RoleKind.Deputy });

        var payload = BangRules.BuildViewerPayload(state, "P0"); // Sheriff xem người khác

        Assert.Equal("Cảnh sát trưởng", payload.Players.Single(p => p.Id == "P0").PublicRole); // Sheriff luôn công khai
        Assert.Equal("Vai trò ẩn", payload.Players.Single(p => p.Id == "P1").PublicRole);
        Assert.Equal("Vai trò ẩn", payload.Players.Single(p => p.Id == "P2").PublicRole);
        Assert.Equal("Vai trò ẩn", payload.Players.Single(p => p.Id == "P3").PublicRole);
    }

    [Fact]
    public void BuildViewerPayload_RevealsOwnRole_ButNotOthers()
    {
        var state = TestFactory.MakeState(4, roles: new[] { RoleKind.Sheriff, RoleKind.Outlaw, RoleKind.Renegade, RoleKind.Deputy });

        var payload = BangRules.BuildViewerPayload(state, "P2"); // Renegade xem chính mình

        Assert.Equal("Renegade", payload.You!.Role);
        Assert.Equal("Kẻ phản bội", payload.You.RoleDisplay);
        // Nhưng danh sách public vẫn ẩn vai trò của CHÍNH MÌNH đối với người khác nhìn vào
        // — publicRole của bản thân trong payload của bản thân được lộ (đúng, vì đó là ĐÚNG người xem).
        Assert.Equal("Kẻ phản bội", payload.Players.Single(p => p.Id == "P2").PublicRole);
        Assert.Equal("Vai trò ẩn", payload.Players.Single(p => p.Id == "P1").PublicRole);
    }

    [Fact]
    public void BuildViewerPayload_RevealsRoleOnceEliminated()
    {
        var state = TestFactory.MakeState(4, roles: new[] { RoleKind.Sheriff, RoleKind.Outlaw, RoleKind.Renegade, RoleKind.Deputy });
        state.Players[1].Alive = false; // Outlaw đã bị loại

        var payload = BangRules.BuildViewerPayload(state, "P0");

        Assert.Equal("Kẻ ngoài vòng pháp luật", payload.Players.Single(p => p.Id == "P1").PublicRole);
    }

    [Fact]
    public void BuildViewerPayload_Spectator_SeesNoYouAndNoRoles()
    {
        var state = TestFactory.MakeState(4, roles: new[] { RoleKind.Sheriff, RoleKind.Outlaw, RoleKind.Renegade, RoleKind.Deputy });

        var payload = BangRules.BuildViewerPayload(state, side: null);

        Assert.Null(payload.You);
        Assert.Equal("Cảnh sát trưởng", payload.Players.Single(p => p.Id == "P0").PublicRole); // Sheriff luôn công khai
        Assert.Equal("Vai trò ẩn", payload.Players.Single(p => p.Id == "P1").PublicRole);
    }

    [Fact]
    public void BangEngine_RedactStateForViewer_NeverLeaksHandJsonToOtherViewer()
    {
        var engine = new BangEngine();
        var (mapJson, _) = engine.NewGame(null);
        var state = BangRules.StartGame(new[] { "An", "Binh", "Chi", "Dung" }, new Random(3));
        var stateJson = GameJson.Serialize(state);

        var p1SecretCardId = state.Players[1].Hand[0].Id;

        var viewForP0 = engine.RedactStateForViewer(stateJson, "P0");
        Assert.DoesNotContain(p1SecretCardId, viewForP0);

        var viewForP1 = engine.RedactStateForViewer(stateJson, "P1");
        Assert.Contains(p1SecretCardId, viewForP1); // P1 thấy bài của chính mình

        Assert.NotNull(mapJson);
    }
}
