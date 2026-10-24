using BoardGame.Api.Games.Bang;
using BoardGame.Api.Platform;
using System.Text.Json;
using Xunit;

namespace BoardGame.Api.Tests.Bang;

/// <summary>
/// "Hợp đồng" JSON giữa backend và frontend TypeScript (games/bang/types.ts phải khớp
/// CHÍNH XÁC các chuỗi này). Enum serialize dạng camelCase — test này chốt lại chính tả
/// để đổi enum ở C# không âm thầm phá vỡ frontend.
/// </summary>
public class BangJsonContractTests
{
    [Theory]
    [InlineData(CardKind.Bang, "\"bang\"")]
    [InlineData(CardKind.Missed, "\"missed\"")]
    [InlineData(CardKind.Beer, "\"beer\"")]
    [InlineData(CardKind.Gatling, "\"gatling\"")]
    [InlineData(CardKind.Duel, "\"duel\"")]
    [InlineData(CardKind.Panic, "\"panic\"")]
    [InlineData(CardKind.CatBalou, "\"catBalou\"")]
    [InlineData(CardKind.Stagecoach, "\"stagecoach\"")]
    [InlineData(CardKind.WellsFargo, "\"wellsFargo\"")]
    [InlineData(CardKind.Indians, "\"indians\"")]
    [InlineData(CardKind.Volcanic, "\"volcanic\"")]
    [InlineData(CardKind.Schofield, "\"schofield\"")]
    [InlineData(CardKind.Remington, "\"remington\"")]
    [InlineData(CardKind.Mustang, "\"mustang\"")]
    [InlineData(CardKind.Barrel, "\"barrel\"")]
    public void CardKind_SerializesAsExpectedCamelCase(CardKind kind, string expectedJson)
    {
        Assert.Equal(expectedJson, GameJson.Serialize(kind));
    }

    [Theory]
    [InlineData(RoleKind.Sheriff, "\"sheriff\"")]
    [InlineData(RoleKind.Deputy, "\"deputy\"")]
    [InlineData(RoleKind.Outlaw, "\"outlaw\"")]
    [InlineData(RoleKind.Renegade, "\"renegade\"")]
    public void RoleKind_SerializesAsExpectedCamelCase(RoleKind kind, string expectedJson)
    {
        Assert.Equal(expectedJson, GameJson.Serialize(kind));
    }

    [Theory]
    [InlineData(GamePhase.WaitingForPlayers, "\"waitingForPlayers\"")]
    [InlineData(GamePhase.Action, "\"action\"")]
    [InlineData(GamePhase.AwaitingResponse, "\"awaitingResponse\"")]
    [InlineData(GamePhase.Finished, "\"finished\"")]
    public void GamePhase_SerializesAsExpectedCamelCase(GamePhase phase, string expectedJson)
    {
        Assert.Equal(expectedJson, GameJson.Serialize(phase));
    }

    [Theory]
    [InlineData(PendingResponseKind.Bang, "\"bang\"")]
    [InlineData(PendingResponseKind.Duel, "\"duel\"")]
    [InlineData(PendingResponseKind.Indians, "\"indians\"")]
    [InlineData(PendingResponseKind.Gatling, "\"gatling\"")]
    public void PendingResponseKind_SerializesAsExpectedCamelCase(PendingResponseKind kind, string expectedJson)
    {
        Assert.Equal(expectedJson, GameJson.Serialize(kind));
    }

    [Fact]
    public void ViewerProjection_UsesCamelCaseStringsExpectedByFrontend()
    {
        var engine = new BangEngine();
        var state = TestFactory.MakeState(4);
        var actionJson = engine.RedactStateForViewer(GameJson.Serialize(state), "P0");
        using (var action = JsonDocument.Parse(actionJson))
            Assert.Equal("action", action.RootElement.GetProperty("phase").GetString());

        state.Phase = GamePhase.AwaitingResponse;
        state.PendingResponse = new PendingResponse
        {
            Kind = PendingResponseKind.Bang,
            FromPlayerId = "P1",
            TargetIds = new List<string> { "P0" },
        };
        var responseJson = engine.RedactStateForViewer(GameJson.Serialize(state), "P0");
        using var response = JsonDocument.Parse(responseJson);
        Assert.Equal("awaitingResponse", response.RootElement.GetProperty("phase").GetString());
        Assert.Equal("bang", response.RootElement.GetProperty("pendingResponse").GetProperty("kind").GetString());
        Assert.True(response.RootElement.GetProperty("pendingResponse").GetProperty("itsYourTurn").GetBoolean());
    }
}
