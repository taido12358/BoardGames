import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useGameStore } from "../platform/gameStore";
import { useLobbyHub } from "../platform/useLobbyHub";
import { getGameInstructions, getGameMetadata, getCreateOptionsForm } from "../platform/gameRegistry";
import { ARTWORK_BG } from "../platform/artworkTheme";
import GameInstructions from "./GameInstructions";
import LobbyLoadStatus from "../platform/LobbyLoadStatus";

export default function GameDetails() {
  const { gameKey = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    engines, enginesLoading, enginesError, rooms, roomsLoading, roomsError, playerName, error,
    fetchEngines, fetchRooms, createRoom, cancelRoom, quickMatch, setError,
  } = useGameStore();

  useLobbyHub();

  const [creating, setCreating] = useState(false);
  const [matching, setMatching] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [optionDraft, setOptionDraft] = useState<{ gameKey: string; value: Record<string, unknown> }>({ gameKey, value: {} });
  const options = optionDraft.gameKey === gameKey ? optionDraft.value : {};
  const setOptions = (value: Record<string, unknown>) => setOptionDraft({ gameKey, value });
  const roomPanelRef = useRef<HTMLDivElement>(null);
  const actionLock = useRef(false);
  const pageVersion = useRef(0);
  useEffect(() => {
    pageVersion.current += 1;
    actionLock.current = false;
    setCreating(false);
    setMatching(false);
    setCancelingId(null);
    return () => { pageVersion.current += 1; };
  }, [gameKey]);
  const busy = creating || matching || cancelingId !== null;
  const playTarget = searchParams.get("play") === "1" ? gameKey : null;
  const gameReady = !enginesLoading && engines.some((entry) => entry.key === gameKey);
  const jumpedTo = useRef<string | null>(null);

  useEffect(() => {
    if (engines.length === 0) fetchEngines();
  }, [engines.length, fetchEngines]);

  // Chỉ paint lần đầu — cập nhật realtime sau đó qua useLobbyHub (group SignalR "lobby"), không polling.
  useEffect(() => {
    fetchRooms(gameKey);
  }, [gameKey, fetchRooms]);

  useEffect(() => {
    if (!playTarget) { jumpedTo.current = null; return; }
    if (gameReady && jumpedTo.current !== playTarget && roomPanelRef.current) {
      jumpedTo.current = playTarget;
      roomPanelRef.current.focus({ preventScroll: true });
      roomPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [gameReady, playTarget]);

  const engine = engines.find((e) => e.key === gameKey);
  const metadata = engine ? getGameMetadata(engine) : null;
  const instructions = useMemo(() => getGameInstructions(gameKey), [gameKey]);
  const CreateOptionsForm = getCreateOptionsForm(gameKey);
  const gameRooms = useMemo(() => rooms.filter((r) => r.gameKey === gameKey), [rooms, gameKey]);
  const waitingRooms = gameRooms.filter((r) => r.status === "Waiting");
  const myActiveRoom = gameRooms.find((r) => r.status === "Playing" && r.isMine);

  const scrollToRoomPanel = () => {
    roomPanelRef.current?.focus({ preventScroll: true });
    roomPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  async function handleCreate() {
    if (actionLock.current) return;
    const version = pageVersion.current;
    actionLock.current = true;
    setError("");
    setCreating(true);
    try {
      const room = await createRoom(gameKey, options);
      if (room && version === pageVersion.current) navigate(`/games/${gameKey}/room/${room.id}`);
    } catch {
      if (version === pageVersion.current) setError("Không kết nối được máy chủ để tạo phòng. Vui lòng thử lại.");
    } finally {
      if (version === pageVersion.current) {
        actionLock.current = false;
        setCreating(false);
      }
    }
  }

  async function handleQuickMatch() {
    if (actionLock.current) return;
    const version = pageVersion.current;
    actionLock.current = true;
    setError("");
    setMatching(true);
    try {
      const room = await quickMatch(gameKey);
      if (room && version === pageVersion.current) navigate(`/games/${gameKey}/room/${room.id}`);
    } catch {
      if (version === pageVersion.current) setError("Không kết nối được máy chủ để tìm trận. Vui lòng thử lại.");
    } finally {
      if (version === pageVersion.current) {
        actionLock.current = false;
        setMatching(false);
      }
    }
  }

  async function handleCancel(roomId: string) {
    if (actionLock.current) return;
    const version = pageVersion.current;
    actionLock.current = true;
    setError("");
    setCancelingId(roomId);
    try {
      await cancelRoom(roomId);
    } catch {
      if (version === pageVersion.current) setError("Không kết nối được máy chủ để hủy phòng. Vui lòng thử lại.");
    } finally {
      if (version === pageVersion.current) {
        actionLock.current = false;
        setCancelingId(null);
      }
    }
    // Không cần fetchRooms thủ công nữa — huỷ thành công server tự phát LobbyUpdated qua SignalR.
  }

  function handleJoin(roomId: string) {
    if (actionLock.current) return;
    navigate(`/games/${gameKey}/room/${roomId}`);
  }

  if (!engine && enginesError && !enginesLoading) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-10 text-center">
        <p role="alert" className="text-red-300">{enginesError}</p>
        <p className="text-sm text-amber-700/60">Kiểm tra kết nối rồi tải lại danh sách trò chơi.</p>
        <button onClick={() => fetchEngines()} className="rounded-xl bg-amber-700 px-4 py-3 font-semibold text-white hover:bg-amber-600">Thử lại</button>
      </div>
    );
  }

  if (enginesLoading || (!engine && engines.length === 0)) {
    return (
      <div role="status" aria-label="Đang tải trò chơi" className="w-full max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-8 w-40 bg-amber-950/40 rounded" />
        <div className="h-64 bg-amber-950/30 rounded-2xl" />
      </div>
    );
  }

  if (!engine || !metadata) {
    return (
      <div className="w-full max-w-md mx-auto text-center space-y-4 py-10">
        <div className="text-3xl">❓</div>
        <p className="text-amber-300/70">Không tìm thấy trò chơi này.</p>
        <button
          onClick={() => navigate("/games")}
          className="rounded-xl border border-amber-950/80 bg-[#140e0b]/90 hover:border-amber-700/60 hover:bg-[#1a120d] px-4 py-2 text-sm font-medium text-amber-700/70 hover:text-amber-400 transition-colors"
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
        className="text-sm text-amber-700/60 hover:text-amber-300 flex items-center gap-1 transition-colors"
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
            <h1 className="text-3xl font-black tracking-widest uppercase text-[#f5d09d] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{metadata.title}</h1>
            <p className="text-[#d4b996]/60">{metadata.subtitle}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { icon: "👥", label: "Người chơi", value: metadata.minPlayers === metadata.maxPlayers ? `${metadata.minPlayers} người` : `${metadata.minPlayers}–${metadata.maxPlayers} người` },
              { icon: "⏱", label: "Thời gian", value: metadata.duration },
              { icon: "🎯", label: "Độ khó", value: metadata.difficulty },
              { icon: "🏆", label: "Thể loại", value: metadata.category.join(" / ") || "—" },
            ].map(({ icon, label, value }) => (
              <div key={label} className="relative overflow-hidden rounded-lg border border-amber-800/40 bg-gradient-to-b from-[#1c130d] to-[#120b07] p-3 shadow-[inset_0_1px_0_rgba(245,158,11,0.15),0_4px_12px_rgba(0,0,0,0.6)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-700/90 [text-shadow:0_1px_0_rgba(255,255,255,0.05)]">{icon} {label}</div>
                <div className="mt-0.5 font-semibold text-amber-200 truncate [text-shadow:0_1px_2px_rgba(0,0,0,0.9),0_0_8px_rgba(245,158,11,0.2)]">{value}</div>
              </div>
            ))}
          </div>

          <button
            onClick={scrollToRoomPanel}
            className="group relative hidden sm:block w-full overflow-hidden rounded-lg border-t border-amber-300/60 bg-gradient-to-b from-amber-500 via-amber-600 to-amber-800 py-3 px-6 text-sm font-black uppercase tracking-widest text-[#2a1305] shadow-[0_5px_0_0_#451a03,0_10px_20px_rgba(0,0,0,0.8)] transition-all duration-100 hover:brightness-110 active:translate-y-1 active:shadow-[0_1px_0_0_#451a03,0_4px_8px_rgba(0,0,0,0.6)]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />
            <span className="relative flex items-center justify-center gap-2 [text-shadow:0_1px_0_rgba(255,255,255,0.3)]">
              <span>CHƠI NGAY</span>
              <span className="transition-transform duration-200 group-hover:translate-x-1">➔</span>
            </span>
          </button>
        </div>
      </div>

      {/* Saloon divider */}
      <div className="relative flex items-center justify-center">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-600/40 to-transparent" />
        <div className="absolute flex items-center justify-center bg-[#0d0a07] px-3">
          <span className="h-2 w-2 rotate-45 border border-amber-500/60 bg-amber-900/60 shadow-[0_0_6px_rgba(245,158,11,0.3)]" />
        </div>
      </div>

      {/* Hướng dẫn */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-900/20 bg-[#1a1208]/40 p-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/25 to-transparent" />
        <GameInstructions sections={instructions} />
      </div>

      {/* Vào lại ván đang chơi — nếu người dùng có 1 phòng "Playing" của chính mình */}
      {myActiveRoom && (
        <button
          onClick={() => handleJoin(myActiveRoom.id)}
          className="relative w-full rounded-lg bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 px-4 py-3 font-bold text-amber-50 border-t border-amber-400/50 shadow-[0_4px_0_0_#451a03,0_8px_16px_rgba(0,0,0,0.5)] transition-all hover:brightness-110 active:top-[2px] active:shadow-[0_2px_0_0_#451a03] text-sm tracking-wide uppercase"
        >
          ↩ VÀO LẠI VÁN ĐANG CHƠI
        </button>
      )}

      {/* Tạo phòng / Vào phòng */}
      <div ref={roomPanelRef} role="region" aria-label="Tạo và vào phòng" tabIndex={-1} className="space-y-3 scroll-mt-4">
        <h2 className="text-lg font-bold text-amber-100 [text-shadow:0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.8)]">🚪 CHƠI {metadata.title}</h2>
        {error && <div role="alert" className="rounded-xl bg-red-900/40 p-3 text-sm text-red-300">{error}</div>}

        <fieldset disabled={busy} aria-busy={busy} className="min-w-0 rounded-2xl border border-amber-700/40 bg-[#1c150c] p-4 space-y-3">
          <h3 className="text-sm font-semibold text-amber-200">TẠO PHÒNG MỚI</h3>
          <p className="text-xs text-amber-700/60">Bạn sẽ vào phòng với tên: <span className="text-amber-200 font-medium">{playerName}</span></p>

          {CreateOptionsForm && <CreateOptionsForm value={options} onChange={setOptions} />}

          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full rounded-xl border border-amber-900/40 bg-[#1a1208] hover:bg-[#241a0e] disabled:opacity-50 px-4 py-3 text-sm font-bold uppercase tracking-wide text-amber-300/80 hover:text-amber-200 transition-colors shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]"
          >
            {creating ? "ĐANG TẠO…" : "➕ TẠO PHÒNG"}
          </button>

          <button
            onClick={handleQuickMatch}
            disabled={matching}
            className="relative w-full rounded-lg bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 px-4 py-3 font-bold text-amber-50 border-t border-amber-400/50 shadow-[0_4px_0_0_#451a03,0_8px_16px_rgba(0,0,0,0.5)] transition-all hover:brightness-110 active:top-[2px] active:shadow-[0_2px_0_0_#451a03] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {matching ? "ĐANG TÌM TRẬN…" : "⚡ TÌM TRẬN NHANH"}
          </button>
        </fieldset>

        <div className="rounded-2xl border border-amber-900/30 bg-[#160f08]/60 p-4">
          <h3 className="text-sm font-semibold text-amber-300/70 mb-2 uppercase tracking-widest">
            Phòng Đang Chờ {waitingRooms.length > 0 && <span className="text-amber-700/60">({waitingRooms.length})</span>}
          </h3>
          <LobbyLoadStatus loading={roomsLoading} error={roomsError} onRetry={() => fetchRooms(gameKey)} />
          {!roomsLoading && !roomsError && waitingRooms.length === 0 && (
            <p className="text-amber-900/60 text-sm text-center py-4">Chưa có phòng nào đang chờ — hãy tạo phòng mới!</p>
          )}
          <ul className="space-y-2">
            {waitingRooms.map((r) => {
              const occupied = r.seats.filter((s) => s.displayName !== null).length;
              const owner = r.seats.find((s) => s.displayName !== null)?.displayName ?? null;
              return (
                <li key={r.id} className="relative overflow-hidden rounded-xl border border-amber-900/30 bg-gradient-to-r from-[#1c1408] to-[#150f06] p-3 flex items-center justify-between gap-2">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
                  <div className="min-w-0">
                    <div className="text-sm text-amber-100 truncate font-medium">
                      🚪 Phòng của {owner ?? "Ẩn danh"}
                    </div>
                    <div className="text-xs text-amber-700/70 mt-0.5">👥 {occupied}/{r.seatCount} người · Đang chờ</div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {r.isMine && (
                      <button
                        onClick={() => handleCancel(r.id)}
                        disabled={busy}
                        className="rounded-lg bg-[#140e0b]/90 hover:bg-red-900/60 border border-amber-950/80 hover:border-red-700/50 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-amber-700/60 hover:text-red-300 transition-colors"
                        title="Huỷ phòng"
                      >
                        {cancelingId === r.id ? "…" : "HUỶ"}
                      </button>
                    )}
                    <button
                      onClick={() => handleJoin(r.id)}
                      disabled={busy}
                      className="relative rounded-lg bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 px-3.5 py-1.5 text-xs font-semibold text-amber-50 border-t border-amber-400/50 shadow-[0_2px_0_0_#451a03] transition-all hover:brightness-110 active:top-[1px] active:shadow-none disabled:opacity-50"
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

      {/* Nút CHƠI NGAY dính đáy màn hình trên mobile — luôn dễ bấm */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-[#0d0a07] via-[#0d0a07]/95 to-transparent z-40">
        <button
          onClick={scrollToRoomPanel}
          className="group relative w-full max-w-md mx-auto block overflow-hidden rounded-lg border-t border-amber-300/60 bg-gradient-to-b from-amber-500 via-amber-600 to-amber-800 py-3.5 px-6 text-sm font-black uppercase tracking-widest text-[#2a1305] shadow-[0_5px_0_0_#451a03,0_10px_20px_rgba(0,0,0,0.8)] transition-all duration-100 hover:brightness-110 active:translate-y-1 active:shadow-[0_1px_0_0_#451a03,0_4px_8px_rgba(0,0,0,0.6)]"
        >
          CHƠI NGAY
        </button>
      </div>
    </div>
  );
}
