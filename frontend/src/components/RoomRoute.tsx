import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGameStore } from "../platform/gameStore";
import { useGameRoomHubActions } from "../platform/GameRoomHubContext";
import ChatPanel from "../platform/ChatPanel";
import { RematchInviteBanner } from "../platform/RoomShell";
import type { RoomDto } from "../platform/types";
import VayBatBoard from "../games/vaybat/VayBatBoard";
import BangBoard from "../games/bang/BangBoard";

/**
 * Route thật cho "đang ở trong một phòng" (`/games/:gameKey/room/:roomId`) — trước đây
 * việc hiển thị board chỉ dựa vào `gameStore.room` (bộ nhớ), không dựa vào URL, nên F5
 * giữa ván mất sạch context. Ở đây: lúc mount, nếu store chưa có đúng phòng này thì tự
 * GET phòng qua REST (vẽ ngay, không chờ SignalR) rồi join qua hub để nhận state/ghế thật.
 */
export default function RoomRoute() {
  const { gameKey = "", roomId = "" } = useParams();
  const navigate = useNavigate();
  const { room, setRoom, setMySide, setSelected, setError, clearChat, rematchInvite, setRematchInvite } = useGameStore();
  const { joinRoom, makeMove, leaveRoom, announceRematch } = useGameRoomHubActions();

  const [loading, setLoading] = useState(room?.id !== roomId);
  const [notFound, setNotFound] = useState(false);
  const [rematching, setRematching] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function ensureRoom() {
      if (useGameStore.getState().room?.id === roomId) {
        setLoading(false);
        return;
      }
      clearChat(); // phòng mới -> chat của phòng cũ không còn liên quan (chỉ tồn tại trong bộ nhớ)
      setRematchInvite(null);
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/games/${roomId}`, { credentials: "include" });
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const dto = (await res.json()) as RoomDto;
        if (cancelled) return;

        // Link cũ/gõ nhầm gameKey trên URL — điều hướng lại đúng gameKey thật, không lỗi.
        if (dto.gameKey !== gameKey) {
          navigate(`/games/${dto.gameKey}/room/${roomId}`, { replace: true });
          return;
        }

        setRoom(dto);
        await joinRoom(roomId);
      } catch {
        if (!cancelled) setError("Không tải được phòng — thử tải lại trang.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    ensureRoom();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const handleLeave = () => {
    leaveRoom(roomId);
    setRoom(null);
    setMySide(null);
    setSelected(null);
    setError("");
    clearChat();
    setRematchInvite(null);
    navigate(`/games/${gameKey}`);
  };

  /** Tạo phòng mới cùng game/cùng số ghế rồi tự vào luôn — báo cho người khác còn ở phòng cũ qua SignalR. */
  const handleRematch = async () => {
    setRematching(true);
    try {
      const res = await fetch(`/api/games/${roomId}/rematch`, { method: "POST", credentials: "include" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Không tạo được phòng chơi lại.");
        return;
      }
      const newRoom = (await res.json()) as RoomDto;
      announceRematch(roomId, newRoom.id);
      leaveRoom(roomId);
      setRoom(null);
      clearChat();
      setRematchInvite(null);
      navigate(`/games/${newRoom.gameKey}/room/${newRoom.id}`);
    } catch {
      setError("Không kết nối được máy chủ.");
    } finally {
      setRematching(false);
    }
  };

  /** Nhận lời mời chơi lại từ người khác — rời phòng cũ rồi vào thẳng phòng mới của họ. */
  const handleJoinRematch = (newRoomId: string) => {
    leaveRoom(roomId);
    setRoom(null);
    clearChat();
    setRematchInvite(null);
    navigate(`/games/${gameKey}/room/${newRoomId}`);
  };

  if (notFound) {
    return (
      <div className="w-full max-w-md mx-auto text-center space-y-4 py-10">
        <div className="text-3xl">❓</div>
        <p className="text-slate-300">Không tìm thấy phòng này — có thể đã bị đóng.</p>
        <button
          onClick={() => navigate(`/games/${gameKey}`)}
          className="rounded-xl bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm font-medium"
        >
          ← QUAY LẠI
        </button>
      </div>
    );
  }

  if (loading || !room || room.id !== roomId) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-10 text-slate-400 text-sm animate-pulse">
        Đang vào phòng…
      </div>
    );
  }

  if (room.status === "Cancelled" || room.status === "Abandoned") {
    return (
      <div className="w-full max-w-md mx-auto text-center space-y-4 py-10">
        <div className="text-3xl">🚪</div>
        <p className="text-slate-300">
          {room.status === "Cancelled" ? "Phòng đã bị huỷ." : "Phòng đã đóng do mất kết nối kéo dài."}
        </p>
        <button
          onClick={() => navigate(`/games/${gameKey}`)}
          className="rounded-xl bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm font-medium"
        >
          ← QUAY LẠI
        </button>
      </div>
    );
  }

  const board = (() => {
    switch (room.gameKey) {
      case "vaybat":
        return <VayBatBoard makeMove={makeMove} onLeave={handleLeave} onRematch={handleRematch} rematching={rematching} />;
      case "bang":
        return <BangBoard makeMove={makeMove} onLeave={handleLeave} onRematch={handleRematch} rematching={rematching} />;
      default:
        return (
          <div className="bg-slate-800 rounded-2xl p-6 text-center space-y-4">
            <p>Game "{room.gameKey}" chưa có giao diện.</p>
            <button
              onClick={handleLeave}
              className="rounded-lg bg-slate-700 hover:bg-slate-600 px-4 py-2 font-medium"
            >
              ← Rời phòng
            </button>
          </div>
        );
    }
  })();

  return (
    <div className="flex flex-col gap-3">
      <RematchInviteBanner invite={rematchInvite} onJoin={handleJoinRematch} />
      {board}
      <ChatPanel roomId={roomId} />
    </div>
  );
}
