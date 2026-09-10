import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useGameStore } from "../platform/gameStore";
import { useLobbyHub } from "../platform/useLobbyHub";
import { getGameInstructions, getGameMetadata, getCreateOptionsForm } from "../platform/gameRegistry";
import { ARTWORK_BG } from "../platform/artworkTheme";
import GameInstructions from "./GameInstructions";

export default function GameDetails() {
  const { gameKey = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    engines, enginesLoading, rooms, playerName, error,
    fetchEngines, fetchRooms, createRoom, cancelRoom, quickMatch, setError,
  } = useGameStore();

  useLobbyHub();

  const [creating, setCreating] = useState(false);
  const [matching, setMatching] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [options, setOptions] = useState<Record<string, unknown>>({});
  const roomPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (engines.length === 0) fetchEngines();
  }, [engines.length, fetchEngines]);

  // Chỉ paint lần đầu — cập nhật realtime sau đó qua useLobbyHub (group SignalR "lobby"), không polling.
  useEffect(() => {
    fetchRooms(gameKey);
  }, [gameKey, fetchRooms]);

  useEffect(() => {
    if (searchParams.get("play") === "1") {
      roomPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchParams]);

  const engine = engines.find((e) => e.key === gameKey);
  const metadata = engine ? getGameMetadata(engine) : null;
  const instructions = useMemo(() => getGameInstructions(gameKey), [gameKey]);
  const CreateOptionsForm = getCreateOptionsForm(gameKey);
  const gameRooms = useMemo(() => rooms.filter((r) => r.gameKey === gameKey), [rooms, gameKey]);
  const waitingRooms = gameRooms.filter((r) => r.status === "Waiting");
  const myActiveRoom = gameRooms.find((r) => r.status === "Playing" && r.isMine);

  const scrollToRoomPanel = () => roomPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  async function handleCreate() {
    setError("");
    setCreating(true);
    const room = await createRoom(gameKey, options);
    setCreating(false);
    if (room) navigate(`/games/${gameKey}/room/${room.id}`);
  }

  async function handleQuickMatch() {
    setError("");
    setMatching(true);
    const room = await quickMatch(gameKey);
    setMatching(false);
    if (room) navigate(`/games/${gameKey}/room/${room.id}`);
  }

  async function handleCancel(roomId: string) {
    setError("");
    setCancelingId(roomId);
    await cancelRoom(roomId);
    setCancelingId(null);
    // Không cần fetchRooms thủ công nữa — huỷ thành công server tự phát LobbyUpdated qua SignalR.
  }

  function handleJoin(roomId: string) {
    navigate(`/games/${gameKey}/room/${roomId}`);
  }

  if (enginesLoading || (!engine && engines.length === 0)) {
    return (
      <div className="w-full max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-8 w-40 bg-slate-800 rounded" />
        <div className="h-64 bg-slate-800/60 rounded-2xl" />
      </div>
    );
  }

  if (!engine || !metadata) {
    return (
      <div className="w-full max-w-md mx-auto text-center space-y-4 py-10">
        <div className="text-3xl">❓</div>
        <p className="text-slate-300">Không tìm thấy trò chơi này.</p>
        <button
          onClick={() => navigate("/games")}
          className="rounded-xl bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm font-medium"
        >
          ← QUAY LẠI THƯ VIỆN
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-24 sm:pb-6">
      <button
        onClick={() => navigate("/games")}
        className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1"
      >
        ← QUAY LẠI
      </button>

      {/* Header: artwork trái, thông tin phải (desktop 2 cột, mobile xếp chồng) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`rounded-2xl h-52 md:h-full min-h-[13rem] flex items-center justify-center ${ARTWORK_BG[metadata.accent]}`}>
          <span className="text-8xl drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]" role="img" aria-label={`Hình minh hoạ ${metadata.title}`}>
            {metadata.emblem}
          </span>
        </div>

        <div className="flex flex-col justify-center space-y-3">
          <div>
            <h1 className="text-3xl font-black tracking-wide text-amber-100">{metadata.title}</h1>
            <p className="text-amber-200/60">{metadata.subtitle}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-slate-800/60 border border-slate-700 px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase">👥 Người chơi</div>
              <div className="font-semibold text-slate-200">
                {metadata.minPlayers === metadata.maxPlayers ? `${metadata.minPlayers} người` : `${metadata.minPlayers}–${metadata.maxPlayers} người`}
              </div>
            </div>
            <div className="rounded-xl bg-slate-800/60 border border-slate-700 px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase">⏱ Thời gian</div>
              <div className="font-semibold text-slate-200">{metadata.duration}</div>
            </div>
            <div className="rounded-xl bg-slate-800/60 border border-slate-700 px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase">🎯 Độ khó</div>
              <div className="font-semibold text-slate-200">{metadata.difficulty}</div>
            </div>
            <div className="rounded-xl bg-slate-800/60 border border-slate-700 px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase">🏆 Thể loại</div>
              <div className="font-semibold text-slate-200 truncate">{metadata.category.join(" / ") || "—"}</div>
            </div>
          </div>

          <button
            onClick={scrollToRoomPanel}
            className="hidden sm:block w-full rounded-xl bg-amber-700 hover:bg-amber-600 px-4 py-3 font-bold text-white transition-colors"
          >
            CHƠI NGAY
          </button>
        </div>
      </div>

      {/* Hướng dẫn */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <GameInstructions sections={instructions} />
      </div>

      {/* Vào lại ván đang chơi — nếu người dùng có 1 phòng "Playing" của chính mình */}
      {myActiveRoom && (
        <button
          onClick={() => handleJoin(myActiveRoom.id)}
          className="w-full rounded-xl bg-indigo-700 hover:bg-indigo-600 px-4 py-3 font-bold text-white transition-colors"
        >
          ↩ VÀO LẠI VÁN ĐANG CHƠI
        </button>
      )}

      {/* Tạo phòng / Vào phòng */}
      <div ref={roomPanelRef} className="space-y-3">
        <h2 className="text-lg font-bold text-amber-100">🚪 CHƠI {metadata.title}</h2>

        <div className="rounded-2xl border border-amber-700/40 bg-[#1c150c] p-4 space-y-3">
          <h3 className="text-sm font-semibold text-amber-200">TẠO PHÒNG MỚI</h3>
          <p className="text-xs text-slate-400">Bạn sẽ vào phòng với tên: <span className="text-slate-200 font-medium">{playerName}</span></p>

          {CreateOptionsForm && <CreateOptionsForm value={options} onChange={setOptions} />}

          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 px-4 py-3 font-bold text-white transition-colors"
          >
            {creating ? "ĐANG TẠO…" : "➕ TẠO PHÒNG"}
          </button>

          <button
            onClick={handleQuickMatch}
            disabled={matching}
            className="w-full rounded-xl bg-amber-700 hover:bg-amber-600 disabled:opacity-50 px-4 py-3 font-bold text-white transition-colors"
          >
            {matching ? "ĐANG TÌM TRẬN…" : "⚡ TÌM TRẬN NHANH"}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">
            PHÒNG ĐANG CHỜ {waitingRooms.length > 0 && <span className="text-slate-500">({waitingRooms.length})</span>}
          </h3>
          {waitingRooms.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">Chưa có phòng nào đang chờ — hãy tạo phòng mới!</p>
          )}
          <ul className="space-y-2">
            {waitingRooms.map((r) => {
              const occupied = r.seats.filter((s) => s.displayName !== null).length;
              const owner = r.seats.find((s) => s.displayName !== null)?.displayName ?? null;
              return (
                <li key={r.id} className="bg-slate-800/60 rounded-xl p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-200 truncate">
                      Phòng của {owner ?? "Ẩn danh"}
                    </div>
                    <div className="text-xs text-slate-500">👥 {occupied} / {r.seatCount} · Trạng thái: Đang chờ</div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {r.isMine && (
                      <button
                        onClick={() => handleCancel(r.id)}
                        disabled={cancelingId === r.id}
                        className="rounded-lg bg-slate-700 hover:bg-red-800 disabled:opacity-50 px-3 py-2 text-sm font-medium text-slate-300"
                        title="Huỷ phòng"
                      >
                        {cancelingId === r.id ? "…" : "HUỶ"}
                      </button>
                    )}
                    <button
                      onClick={() => handleJoin(r.id)}
                      className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-sm font-semibold text-white"
                    >
                      VÀO PHÒNG
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {error && <div className="rounded-xl p-2.5 text-center bg-red-900/40 text-red-300 text-sm">{error}</div>}

      {/* Nút CHƠI NGAY dính đáy màn hình trên mobile — luôn dễ bấm */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent z-40">
        <button
          onClick={scrollToRoomPanel}
          className="w-full max-w-md mx-auto block rounded-xl bg-amber-700 hover:bg-amber-600 px-4 py-3.5 font-bold text-white shadow-lg"
        >
          CHƠI NGAY
        </button>
      </div>
    </div>
  );
}
