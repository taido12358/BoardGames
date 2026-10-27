using BoardGame.Api.Games.Monopoly;
using BoardGame.Api.Games.VayBat;
using BoardGame.Api.Platform;
using BoardGame.Api.Platform.Abstractions;
using BoardGame.Api.Platform.Models;

namespace BoardGame.Api.Tests.Platform;

public class ReplayArtifactTests
{
    [Fact]
    public void MonopolySnapshotsAndFinalFrameContainOutcomesWithoutHiddenDeckOrder()
    {
        IGameEngine engine=new MonopolyEngine();
        var room=new GameRoom{GameKey="monopoly",MapJson=GameJson.Serialize(new MonopolyMap()),StateJson=GameJson.Serialize(new MonopolyState{Chance=[1,2],Chest=[3,4]})};
        var before=GameJson.Serialize(new MonopolyState{Dice=[0,0],Chance=[1,2],Chest=[3,4]});
        var after=GameJson.Serialize(new MonopolyState{Dice=[3,4],Chance=[2,1],Chest=[3,4]});
        var moves=new[]{
            new GameMove{MoveNumber=2,Side="P0",MoveJson="{\"type\":\"ROLL\"}",ReplayStateJson=engine.CreatePublicReplaySnapshot(after)},
            new GameMove{MoveNumber=1,Side="SYSTEM",MoveJson="{\"type\":\"__room_full__\"}",ReplayStateJson=engine.CreatePublicReplaySnapshot(before)}
        };
        var replay=GameJson.Element(ReplayArtifact.Serialize(room,moves));
        Assert.False(replay.GetProperty("finalState").TryGetProperty("chance",out _));
        var frames=replay.GetProperty("moves").EnumerateArray().ToArray();
        Assert.Equal(1,frames[0].GetProperty("moveNumber").GetInt32());
        Assert.Equal(0,frames[0].GetProperty("state").GetProperty("dice")[0].GetInt32());
        Assert.Equal(3,frames[1].GetProperty("state").GetProperty("dice")[0].GetInt32());
        Assert.All(frames,f=>Assert.False(f.GetProperty("state").TryGetProperty("chest",out _)));
    }

    [Fact]
    public void EnginesWithoutSnapshotOptInKeepLegacyReplayAndNoExtraStateStorage()
    {
        IGameEngine engine=new VayBatEngine();Assert.Null(engine.CreatePublicReplaySnapshot("{}"));
        var room=new GameRoom{GameKey="vaybat",MapJson="{}",StateJson="{\"winner\":\"RED\"}"};
        var replay=GameJson.Element(ReplayArtifact.Serialize(room,[new GameMove{MoveNumber=1,MoveJson="{}"}]));
        Assert.Equal(System.Text.Json.JsonValueKind.Null,replay.GetProperty("moves")[0].GetProperty("state").ValueKind);
        Assert.Equal("RED",replay.GetProperty("finalState").GetProperty("winner").GetString());
    }
}
