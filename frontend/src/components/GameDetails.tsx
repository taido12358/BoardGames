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
        <button onClick={() => fetchEngines()} className="rounded-sm bg-amber-700 px-4 py-3 font-semibold text-white hover:bg-amber-600">Thử lại</button>
      </div>
    );
  }

  if (enginesLoading || (!engine && engines.length === 0)) {
    return (
      <div role="status" aria-label="Đang tải trò chơi" className="w-full max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-8 w-40 bg-amber-950/40 rounded-sm" />
        <div className="h-64 bg-amber-950/30 rounded-sm" />
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
          className="rounded-sm border border-[#6b4725]/60 bg-[#22140c]/90 hover:border-[#b47a3c]/80 hover:bg-[#2c1a10] px-4 py-2 text-sm font-medium text-[#bba182] hover:text-[#f3d4a2] transition-colors"
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
        {/* Double border khung tranh gỗ quán rượu */}
        <div className="rounded-sm h-52 md:h-full min-h-[13rem] border-2 border-[#5e3a19] p-1.5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.9),0_15px_30px_rgba(0,0,0,0.9)] bg-[#1a0d06]">
          <div className={`relative h-full rounded-xs flex items-center justify-center overflow-hidden border border-[#8f5a28]/40 ${ARTWORK_BG[metadata.accent]}`}>
            {/* Corner bracket nẹp kim loại */}
            <span className="pointer-events-none absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-[#c8924b]/60 z-20" />
            <span className="pointer-events-none absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-[#c8924b]/60 z-20" />
            <span className="pointer-events-none absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-[#c8924b]/60 z-20" />
            <span className="pointer-events-none absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-[#c8924b]/60 z-20" />
            {/* Rivet giữa top/bottom */}
            <span className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#f0c379] to-[#59330e] shadow-sm z-20" />
            <span className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#f0c379] to-[#59330e] shadow-sm z-20" />
            <span className="text-8xl drop-shadow-[0_12px_16px_rgba(0,0,0,0.95)] relative z-0 select-none" role="img" aria-label={`Hình minh hoạ ${metadata.title}`}>
              {metadata.emblem}
            </span>
            {/* Vignette đèn dầu */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.85)_100%)] z-10" />
          </div>
        </div>

        <div className="flex flex-col justify-center space-y-3">
          <div>
            <h1 className="font-serif text-3xl font-black tracking-widest uppercase bg-gradient-to-b from-[#fff3db] via-[#f7cb85] to-[#c7883a] bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] [text-shadow:0_1px_0_rgba(255,255,200,0.15),0_3px_6px_rgba(0,0,0,0.9)]">{metadata.title}</h1>
            <p className="text-[11px] font-serif font-bold uppercase tracking-[0.25em] text-[#c99a5e] mt-0.5">{metadata.subtitle}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { icon: "👥", label: "Người chơi", value: metadata.minPlayers === metadata.maxPlayers ? `${metadata.minPlayers} người` : `${metadata.minPlayers}–${metadata.maxPlayers} người` },
              { icon: "⏱", label: "Thời gian", value: metadata.duration },
              { icon: "🎯", label: "Độ khó", value: metadata.difficulty },
              { icon: "🏆", label: "Thể loại", value: metadata.category.join(" / ") || "—" },
            ].map(({ icon, label, value }) => (
              <div key={label} className="p-3 bg-gradient-to-b from-[#26170d] to-[#170e08] border border-[#6f4520]/50 rounded-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.7)] flex flex-col justify-between transition-all hover:border-[#c8924b]/50 hover:shadow-[inset_0_1px_2px_rgba(0,0,0,0.7),0_0_8px_rgba(217,144,53,0.12)] hover:from-[#2e1d0f] hover:to-[#1c1009]">
                <div className="flex items-center gap-1 text-[11px] font-serif font-semibold uppercase tracking-wider text-[#c99a5e]"><span>{icon}</span><span>{label}</span></div>
                <div className="mt-1 text-sm font-bold text-[#fcebd6] tracking-wide truncate">{value}</div>
              </div>
            ))}
          </div>

          <button
            onClick={scrollToRoomPanel}
            className="group hidden sm:flex items-center justify-center gap-2 w-full py-3 px-6 font-black uppercase tracking-[0.2em] text-sm text-[#271206] bg-gradient-to-b from-[#fce295] via-[#df9031] to-[#87460e] border-t border-[#fff4d1] border-b-4 border-[#4d2506] rounded-sm shadow-[0_6px_16px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:brightness-110 hover:shadow-[0_8px_20px_rgba(223,144,49,0.35)] active:translate-y-1 active:border-b-0 active:shadow-[0_2px_4px_rgba(0,0,0,0.9)] transition-all duration-150"
          >
            <span>CHƠI NGAY</span>
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
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
      <div className="relative overflow-hidden rounded-sm border border-amber-900/20 bg-[#1a1208]/40 p-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/25 to-transparent" />
        <GameInstructions sections={instructions} />
      </div>

      {/* Vào lại ván đang chơi — nếu người dùng có 1 phòng "Playing" của chính mình */}
      {myActiveRoom && (
        <button
          onClick={() => handleJoin(myActiveRoom.id)}
          className="w-full rounded-sm font-bold text-sm text-[#271206] bg-gradient-to-b from-[#fce295] via-[#df9031] to-[#87460e] px-4 py-3 border-t border-[#fff4d1] border-b-4 border-[#4d2506] shadow-[0_4px_12px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:brightness-110 active:translate-y-1 active:border-b-0 active:shadow-[0_1px_4px_rgba(0,0,0,0.8)] transition-all duration-150 tracking-wide uppercase"
        >
          ↩ VÀO LẠI VÁN ĐANG CHƠI
        </button>
      )}

      {/* Tạo phòng / Vào phòng */}
      <div ref={roomPanelRef} role="region" aria-label="Tạo và vào phòng" tabIndex={-1} className="space-y-3 scroll-mt-4">
        <h2 className="font-serif text-xl font-black text-[#f5d09d] uppercase tracking-[0.2em] [text-shadow:0_1px_0_rgba(255,255,255,0.1),0_2px_6px_rgba(0,0,0,0.9)] flex items-center gap-2">
          <span className="text-[#c99a5e] text-base">✦</span> CHƠI {metadata.title} <span className="text-[#c99a5e] text-base">✦</span>
        </h2>
        {error && <div role="alert" className="rounded-sm bg-red-900/40 p-3 text-sm text-red-300">{error}</div>}

        <fieldset disabled={busy} aria-busy={busy} className="min-w-0 rounded-sm border border-amber-700/40 bg-[#1c150c] p-4 space-y-3">
          <h3 className="font-serif text-sm font-bold text-[#c99a5e] uppercase tracking-widest">TẠO PHÒNG MỚI</h3>
          <p className="text-xs text-[#bba182]">Bạn sẽ vào phòng với tên: <span className="text-[#f5d09d] font-semibold">{playerName}</span></p>

          {CreateOptionsForm && <CreateOptionsForm value={options} onChange={setOptions} />}

          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full rounded-sm font-bold text-[#271206] text-sm bg-gradient-to-b from-[#d4a853] via-[#a0672a] to-[#6b3e10] px-4 py-3 border-t border-[#f5d09d]/50 border-b-4 border-[#3a1f06] shadow-[0_4px_12px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:brightness-110 active:translate-y-1 active:border-b-0 active:shadow-[0_1px_4px_rgba(0,0,0,0.8)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? "ĐANG TẠO…" : "➕ TẠO PHÒNG"}
          </button>

          <button
            onClick={handleQuickMatch}
            disabled={matching}
            className="w-full rounded-sm font-bold text-[#271206] bg-gradient-to-b from-[#fce295] via-[#df9031] to-[#87460e] px-4 py-3 border-t border-[#fff4d1] border-b-4 border-[#4d2506] shadow-[0_4px_12px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:brightness-110 active:translate-y-1 active:border-b-0 active:shadow-[0_1px_4px_rgba(0,0,0,0.8)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {matching ? "ĐANG TÌM TRẬN…" : "⚡ TÌM TRẬN NHANH"}
          </button>
        </fieldset>

        <div className="rounded-sm border border-amber-900/30 bg-[#160f08]/60 p-4">
          <h3 className="font-serif text-sm font-bold text-[#c99a5e] mb-2 uppercase tracking-widest">
            Phòng Đang Chờ {waitingRooms.length > 0 && <span className="text-[#e8c07e]/70">({waitingRooms.length})</span>}
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
                <li key={r.id} className="relative overflow-hidden rounded-sm border border-amber-900/30 bg-gradient-to-r from-[#1c1408] to-[#150f06] p-3 flex items-center justify-between gap-2">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
                  <div className="min-w-0">
                    <div className="text-sm text-[#f5d09d] truncate font-medium">
                      🚪 Phòng của {owner ?? "Ẩn danh"}
                    </div>
                    <div className="text-xs text-amber-700/70 mt-0.5">👥 {occupied}/{r.seatCount} người · Đang chờ</div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {r.isMine && (
                      <button
                        onClick={() => handleCancel(r.id)}
                        disabled={busy}
                        className="rounded-sm bg-[#22140c]/90 hover:bg-red-900/60 border border-[#6b4725]/60 hover:border-red-700/50 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-[#bba182] hover:text-red-300 transition-colors"
                        title="Huỷ phòng"
                      >
                        {cancelingId === r.id ? "…" : "HUỶ"}
                      </button>
                    )}
                    <button
                      onClick={() => handleJoin(r.id)}
                      disabled={busy}
                      className="rounded-sm font-semibold text-[#271206] text-xs bg-gradient-to-b from-[#fce295] via-[#df9031] to-[#87460e] px-3.5 py-1.5 border-t border-[#fff4d1] border-b-2 border-[#4d2506] shadow-[0_2px_6px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:brightness-110 active:translate-y-0.5 active:border-b-0 transition-all duration-150 disabled:opacity-50"
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
          className="w-full max-w-md mx-auto block rounded-sm font-black uppercase tracking-widest text-[#271206] text-sm bg-gradient-to-b from-[#fce295] via-[#df9031] to-[#87460e] py-3.5 px-6 border-t border-[#fff4d1] border-b-4 border-[#4d2506] shadow-[0_6px_16px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:brightness-110 active:translate-y-1 active:border-b-0 active:shadow-[0_2px_4px_rgba(0,0,0,0.9)] transition-all duration-150"
        >
          CHƠI NGAY
        </button>
      </div>
    </div>
  );
}
