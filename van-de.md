You are a senior full-stack game developer specializing in ASP.NET Core, React, real-time multiplayer systems, deterministic game engines, and board/card games.

I have an existing BoardGame platform.

Your task is to add a new multiplayer Western hidden-role card game inspired by the classic BANG! gameplay into the EXISTING architecture.

IMPORTANT:

DO NOT create a new backend architecture.

DO NOT replace ASP.NET Core.

DO NOT replace SignalR with Socket.IO.

DO NOT create another Node.js backend.

DO NOT replace PostgreSQL.

DO NOT replace Redis.

DO NOT replace RabbitMQ.

DO NOT replace OpenSearch.

DO NOT replace MinIO.

DO NOT rewrite the existing Platform.

DO NOT break the existing Vây Bắt game.

You MUST integrate the new game into the current Platform/GameEngine architecture.

============================================================
1. EXISTING PROJECT ARCHITECTURE
============================================================

The repository already contains:

Backend:
- ASP.NET Core
- PostgreSQL
- Entity Framework Core
- Redis
- RabbitMQ
- OpenSearch
- MinIO
- SignalR

Frontend:
- React
- TypeScript
- Vite
- Zustand
- Tailwind CSS

Architecture:

BoardGame/
├── README.md
├── docker-compose.yml
├── backend/
│   └── BoardGame.Api/
│       ├── Program.cs
│       ├── Data/
│       ├── Services/
│       ├── Controllers/
│       ├── Models/
│       ├── Platform/
│       │   ├── Abstractions/
│       │   ├── Models/
│       │   ├── GamesController.cs
│       │   ├── GameHub.cs
│       │   ├── RoomDto.cs
│       │   └── GameJson.cs
│       │
│       └── Games/
│           └── VayBat/
│               ├── VayBatTypes.cs
│               ├── VayBatRules.cs
│               └── VayBatEngine.cs
│
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── platform/
│       ├── games/
│       │   └── vaybat/
│       │       ├── types.ts
│       │       └── VayBatBoard.tsx
│       ├── components/
│       │   └── GameView.tsx
│       ├── store/
│       └── hooks/
│
└── k8s/

The Platform already exposes a generic IGameEngine abstraction.

The existing Vây Bắt game demonstrates the intended architecture.

============================================================
2. PRIMARY OBJECTIVE
============================================================

Add a new game:

GAME NAME:
BANG!

GAME KEY:

bang

The game must be a real playable online multiplayer game.

The game must be server-authoritative.

The client may provide UI hints and local calculations for responsiveness, but the server MUST validate every move.

The new game must coexist with:

vaybat

and must not break it.

============================================================
3. FIRST STEP — INSPECT THE REPOSITORY
============================================================

Before modifying anything:

1. Inspect the entire existing repository structure.
2. Read:
   - README.md
   - Platform/Abstractions/IGameEngine
   - Platform/Abstractions/MoveOutcome
   - Platform/Models/GameRoom
   - Platform/Models/GameMove
   - Platform/Models/GameRecord
   - GamesController
   - GameHub
   - VayBatTypes
   - VayBatRules
   - VayBatEngine
   - Program.cs
   - frontend platform code
   - GameView.tsx
   - Zustand stores
   - SignalR hooks
3. Understand exactly how Vây Bắt is integrated.
4. Reuse the existing patterns.

Do not guess the architecture.

Do not introduce duplicate infrastructure.

After inspection, briefly explain how you will integrate BANG! into the existing architecture.

Then start implementing.

============================================================
4. INTEGRATION REQUIREMENT
============================================================

Backend:

Create:

backend/BoardGame.Api/Games/Bang/

with:

BangTypes.cs
BangRules.cs
BangEngine.cs

Potentially additional files if necessary:

BangCards.cs
BangCharacters.cs
BangRoles.cs
BangDeck.cs
BangEvents.cs
BangState.cs

But keep the game self-contained inside:

Games/Bang/

The game must implement:

IGameEngine

Example:

public sealed class BangEngine : IGameEngine

Register it in Program.cs using the existing engine registration pattern.

Example:

builder.Services.AddSingleton<IGameEngine, BangEngine>();

Use the existing GameEngineRegistry.

Do not modify generic Platform logic unless absolutely necessary.

If Platform changes are genuinely required, keep them generic and backward compatible.

============================================================
5. FRONTEND INTEGRATION
============================================================

Create:

frontend/src/games/bang/

Suggested structure:

bang/
├── types.ts
├── BangBoard.tsx
├── components/
│   ├── BangPlayerSeat.tsx
│   ├── BangPlayerHud.tsx
│   ├── BangLocalPlayer.tsx
│   ├── BangCard.tsx
│   ├── BangHand.tsx
│   ├── BangActionBar.tsx
│   ├── BangDistanceIndicator.tsx
│   ├── BangTargetIndicator.tsx
│   ├── BangGameLog.tsx
│   ├── BangChat.tsx
│   ├── BangDeck.tsx
│   ├── BangDiscardPile.tsx
│   └── BangVictoryScreen.tsx
└── ...

Add the appropriate:

case "bang":

branch in GameView.tsx following the existing Vây Bắt pattern.

Do not break Vây Bắt routing.

============================================================
6. LANGUAGE REQUIREMENT
============================================================

THIS IS EXTREMELY IMPORTANT.

The code, variable names, class names, interfaces and architecture may remain in English.

BUT:

THE ENTIRE USER INTERFACE MUST BE IN VIETNAMESE.

Do NOT show English gameplay text to the player.

Examples:

"YOUR TURN"
must become:

"ĐẾN LƯỢT BẠN"

"END TURN"
must become:

"KẾT THÚC LƯỢT"

"PLAY CARD"
must become:

"ĐÁNH BÀI"

"SELECT TARGET"
must become:

"CHỌN MỤC TIÊU"

"IN RANGE"
must become:

"TRONG TẦM"

"OUT OF RANGE"
must become:

"NGOÀI TẦM"

"GAME LOG"
must become:

"NHẬT KÝ TRẬN ĐẤU"

"CHAT"
must become:

"TRÒ CHUYỆN"

"CARDS"
must become:

"LÁ BÀI"

"HEALTH"
must become:

"HP"

"WEAPON"
must become:

"VŨ KHÍ"

"DISTANCE"
must become:

"KHOẢNG CÁCH"

"ROLE HIDDEN"
must become:

"VAI TRÒ ẨN"

"ELIMINATED"
must become:

"ĐÃ BỊ LOẠI"

"WAITING"
must become:

"ĐANG CHỜ"

"READY"
must become:

"SẴN SÀNG"

"VICTORY"
must become:

"CHIẾN THẮNG"

"DEFEAT"
must become:

"THẤT BẠI"

"ROOM"
must become:

"PHÒNG"

"PLAY AGAIN"
must become:

"CHƠI LẠI"

"RETURN TO LOBBY"
must become:

"VỀ PHÒNG CHỜ"

"DRAW CARDS"
must become:

"RÚT BÀI"

"PASS"
must become:

"QUA LƯỢT"

"TARGET"
must become:

"MỤC TIÊU"

"CONFIRM"
must become:

"XÁC NHẬN"

"CANCEL"
must become:

"HỦY"

All notifications, tooltips, buttons, labels, error messages, dialogs and game events visible to users must be Vietnamese.

============================================================
7. VIETNAMESE GAME TERMINOLOGY
============================================================

Use consistent Vietnamese terminology throughout the entire game.

Suggested terminology:

Sheriff:
Cảnh sát trưởng

Deputy:
Phó cảnh sát

Outlaw:
Kẻ ngoài vòng pháp luật

Renegade:
Kẻ phản bội

Role:
Vai trò

Character:
Nhân vật

Health:
HP / Sinh lực

Card:
Lá bài

Hand:
Bài trên tay

Weapon:
Vũ khí

Range:
Tầm bắn

Distance:
Khoảng cách

Target:
Mục tiêu

Turn:
Lượt

Draw:
Rút bài

Discard:
Bỏ bài

Attack:
Tấn công

Defense:
Phòng thủ

Damage:
Sát thương

Heal:
Hồi HP

Eliminated:
Bị loại

Alive:
Còn sống

Deck:
Nọc bài

Discard pile:
Chồng bài bỏ

Game log:
Nhật ký trận đấu

Active effects:
Hiệu ứng đang có

Cards in hand:
Số lá trên tay

In range:
Trong tầm bắn

Out of range:
Ngoài tầm bắn

Spectator:
Khán giả

Do not randomly mix Vietnamese and English.

Character names may remain Western-style names.

============================================================
8. GAMEPLAY
============================================================

Build a multiplayer Western hidden-role card game.

Recommended player count:

4–8 players.

The game has hidden roles:

- Sheriff
- Deputies
- Outlaws
- Renegade

The Sheriff role is publicly visible.

Other roles are hidden.

Each player receives a character.

Each character has:

- name
- max HP
- ability

Each player receives cards.

Gameplay revolves around:

- drawing cards
- playing cards
- attacking
- defending
- healing
- equipping weapons
- changing effective distance
- eliminating opponents
- hidden roles
- victory conditions

============================================================
9. IMPORTANT LEGAL / DESIGN NOTE
============================================================

Implement the requested gameplay concept and mechanics.

Do not copy copyrighted artwork from the original commercial game.

Do not scrape or download official card artwork.

Use original UI illustrations, icons, CSS styling, or simple placeholder/vector illustrations.

Use Western-themed visual design.

============================================================
10. ROLES
============================================================

Implement:

SHERIFF
DEPUTY
OUTLAW
RENEGADE

The server privately stores each player's actual role.

Public state:

Sheriff:
"CẢNH SÁT TRƯỞNG"

Others:
"VAI TRÒ ẨN"

Private state for local player:

"VAI TRÒ CỦA BẠN"

The client MUST NEVER receive another player's hidden role.

============================================================
11. ROLE DISTRIBUTION
============================================================

Create a deterministic/testable role assignment function.

Example:

4 players:
1 Sheriff
1 Renegade
2 Outlaws

5 players:
1 Sheriff
1 Deputy
1 Renegade
2 Outlaws

6 players:
1 Sheriff
1 Deputy
1 Renegade
3 Outlaws

7 players:
1 Sheriff
2 Deputies
1 Renegade
3 Outlaws

8 players:
1 Sheriff
2 Deputies
1 Renegade
4 Outlaws

Shuffle roles securely on the server.

Sheriff is always assigned exactly once.

============================================================
12. CHARACTERS
============================================================

Create multiple original Western characters.

Examples:

Wyatt
Calamity
Billy
Jesse
Doc
Jack
Rose
Morgan

Each character must have a distinct ability.

Keep abilities simple enough for the first playable implementation.

Example:

Wyatt:
Passive ability related to targeting or range.

Calamity:
Special interaction with defensive cards.

Billy:
Special attack behavior.

Doc:
Healing-related ability.

The character ability system must be implemented in the backend rules engine.

Do not hardcode character logic inside React.

============================================================
13. CARD SYSTEM
============================================================

Create a proper deck system.

Each card must have:

id
type
name
suit
rank
description

Card categories:

ATTACK
DEFENSE
HEAL
WEAPON
EQUIPMENT
ACTION

Implement cards conceptually corresponding to:

BANG!
MISSED!
BEER
GATLING
DUEL
PANIC!
CAT BALOU
STAGECOACH
WELLS FARGO
INDIANS!
VOLCANIC
SCHOFIELD
REMINGTON
MUSTANG
BARREL

Use Vietnamese UI names where appropriate.

Examples:

BANG!
"Bang!"

MISSED!
"Trượt!"

BEER
"Bia"

GATLING
"Súng Gatling"

DUEL
"Đấu súng"

PANIC!
"Hoảng loạn!"

CAT BALOU
"Cat Balou"

STAGECOACH
"Xe ngựa"

WELLS FARGO
"Wells Fargo"

INDIANS!
"Người da đỏ!"

VOLCANIC
"Volcanic"

SCHOFIELD
"Schofield"

REMINGTON
"Remington"

MUSTANG
"Mustang"

BARREL
"Thùng rượu"

Do not translate proper card/weapon names unnecessarily if the Vietnamese UI reads better with the original name.

============================================================
14. CARD RULE ENGINE
============================================================

Implement actual card validation.

Every card action must be validated by:

BangRules.cs

The frontend must never be authoritative.

Examples:

- Cannot play a card you don't own.
- Cannot play a card when it is not your turn.
- Cannot target dead players.
- Cannot attack yourself unless explicitly allowed.
- Cannot attack out-of-range targets.
- Cannot exceed card restrictions.
- Cannot perform actions after the turn has ended.

============================================================
15. TURN SYSTEM
============================================================

Implement:

START TURN
↓
RÚT 2 LÁ
↓
MAIN ACTION PHASE
↓
END TURN
↓
NEXT ALIVE PLAYER

Server owns the turn.

The client only displays it.

Dead players must be skipped.

Turn order must remain deterministic.

============================================================
16. DISTANCE SYSTEM
============================================================

THIS IS ONE OF THE MOST IMPORTANT FEATURES.

Players sit around a circular table.

Distance must be calculated from player positions.

Example for 6 players:

A
B
C
D
E
F

Distance:

A → B = 1
A → C = 2
A → D = 3
A → E = 2
A → F = 1

Implement:

CalculateDistance(sourcePlayerId, targetPlayerId)

Account for:

- eliminated players if rules require them to be skipped
- Mustang
- Scope
- weapon range
- other distance modifiers

The server calculates the authoritative result.

============================================================
17. TARGET RANGE
============================================================

This must be extremely clear in the UI.

Example:

YOU

Vũ khí:
Volcanic

Tầm bắn:
1

Billy:

Khoảng cách:
1

Result:

✓ TRONG TẦM

Jesse:

Khoảng cách:
2

Result:

✕ NGOÀI TẦM

The player should NOT have to calculate this manually.

Implement a server-supported target validation result.

============================================================
18. PLAYER INFORMATION
============================================================

Every player around the table MUST show:

- Portrait
- Username
- Public role if applicable
- HP
- Maximum HP
- Number of cards
- Equipped weapon
- Weapon range
- Distance from current player
- Public equipment
- Status effects
- Alive/dead
- Turn indicator

Example:

┌───────────────────────────┐
│ [ẢNH NHÂN VẬT]            │
│ Billy                     │
│ Kẻ ngoài vòng pháp luật  │
│                           │
│ ❤️ ❤️ ❤️ ❤️              │
│ HP 4 / 4                  │
│                           │
│ 🔫 Cattleman              │
│ Tầm bắn: 1                │
│                           │
│ 🃏 5 lá                   │
│                           │
│ Khoảng cách: 1            │
│ ✓ TRONG TẦM               │
└───────────────────────────┘

DO NOT reveal opponent card faces.

Only show:

🃏 5 lá

============================================================
19. GAME BOARD
============================================================

The actual gameplay screen must be optimized for gameplay.

DO NOT use the previous large left sidebar.

Do not display:

Saloon
Players
Journal
Armory
Store

inside the main game board.

The main game board should contain:

TOP:
- Logo
- Room
- Player count
- Turn
- Timer
- Settings
- Sound
- Exit

CENTER:
- Western table
- Players around table
- Distance indicators
- Target indicators

CENTER OF TABLE:
- Nọc bài
- Chồng bài bỏ
- Active effects

BOTTOM:
- Local player information
- Action bar
- Player hand

RIGHT:
- Nhật ký trận đấu
- Trò chuyện

============================================================
20. LOCAL PLAYER
============================================================

The local player is always displayed at the bottom center.

Show:

BẠN

[Nhân vật]

[Vai trò riêng]

HP:
❤️ ❤️ ❤️ ❤️
4 / 4

Vũ khí:
Volcanic

Tầm bắn:
1

Số lá:
6

Hiệu ứng:

Thùng rượu
Mustang

============================================================
21. PLAYER HAND
============================================================

The player's own cards must show the card faces.

Each card should show:

- Card name
- Suit
- Rank
- Icon/illustration
- Description
- Category

Example:

BANG!
2 ♥
"Tấn công một người chơi trong tầm bắn."

BIA
7 ♦
"Hồi 1 HP."

TRƯỢT!
Q ♠
"Chặn một phát BANG!"

Cards should:

- overlap slightly
- enlarge on hover
- rise when selected
- show selected state
- have smooth animation

============================================================
22. ACTION BAR
============================================================

Buttons should be Vietnamese:

BANG!
ĐÁNH BÀI
BIA
TRƯỢT!
KẾT THÚC LƯỢT

Only legal actions should be enabled.

Disabled actions must have a clear visual state.

============================================================
23. TARGET SELECTION
============================================================

When clicking:

BANG!

enter target selection.

Display:

CHỌN MỤC TIÊU

Valid target:

Billy

HP: 4 / 4

Khoảng cách: 1

Vũ khí: Cattleman

Số lá: 5

✓ TRONG TẦM

Invalid target:

Jesse

Khoảng cách: 2

Tầm bắn hiện tại: 1

✕ NGOÀI TẦM

Valid targets should have:

- golden outline
- crosshair
- glow
- clickable state

Invalid targets:

- muted
- no click
- clear explanation

============================================================
24. TARGETING MUST BE INTELLIGENT
============================================================

The UI should explicitly communicate:

"Bạn có thể bắn người này."

rather than forcing the player to calculate.

For example:

Billy
Khoảng cách: 1
Tầm bắn: 1
✓ CÓ THỂ BẮN

Jesse
Khoảng cách: 2
Tầm bắn: 1
✕ KHÔNG THỂ BẮN

============================================================
25. GAME LOG
============================================================

Create:

NHẬT KÝ TRẬN ĐẤU

Example:

Wyatt đã rút 2 lá.

Wyatt sử dụng BANG! lên Billy.

Billy sử dụng TRƯỢT!

Billy mất 1 HP.

Calamity trang bị Volcanic.

Đến lượt Billy.

Use icons:

🔫 Tấn công
🛡 Phòng thủ
🍺 Hồi HP
🃏 Lá bài
❤️ Sát thương
💀 Bị loại

============================================================
26. CHAT
============================================================

Create:

TRÒ CHUYỆN

Messages:

Billy:
"Chúc may mắn!"

Calamity:
"Đến lượt tôi rồi."

Doc:
"😂"

Input:

"Nhập tin nhắn..."

Send button:

"Gửi"

Chat must be secondary to gameplay.

============================================================
27. ELIMINATED PLAYERS
============================================================

When a player is eliminated:

Show:

💀 ĐÃ BỊ LOẠI

Their player panel becomes grayscale.

Show:

HP 0 / 4

They remain around the table.

Do not remove them completely if their position is required for distance calculation.

They become spectators.

============================================================
28. SPECTATOR MODE
============================================================

Eliminated players can watch the match.

Show:

"ĐANG THEO DÕI"

They cannot:

- play cards
- make moves
- affect the game

They must not gain access to hidden information that they were not previously allowed to know.

============================================================
29. VICTORY
============================================================

Create a cinematic Vietnamese victory screen.

Examples:

"CẢNH SÁT TRƯỞNG CHIẾN THẮNG"

"KẺ NGOÀI VÒNG PHÁP LUẬT CHIẾN THẮNG"

"KẺ PHẢN BỘI CHIẾN THẮNG"

Show:

- phe thắng
- người còn sống
- người bị loại
- thời gian trận đấu
- thống kê

Buttons:

"CHƠI LẠI"

"VỀ PHÒNG CHỜ"

============================================================
30. SIGNALR
============================================================

Use the EXISTING SignalR implementation.

Existing hub:

/hubs/game

Existing methods include:

JoinRoom(roomId, name)

MakeMove(roomId, moveJson, name)

LeaveRoom(roomId)

Follow the existing Vây Bắt implementation.

Do not create a new realtime transport.

Game moves should be represented as game-specific JSON.

For example:

{
  "type": "PLAY_CARD",
  "cardId": "card-123",
  "targetPlayerId": "player-456"
}

or equivalent according to the existing GameMove architecture.

The backend should deserialize the move into Bang-specific move types.

============================================================
31. SERVER AUTHORITATIVE
============================================================

The client sends INTENT.

Example:

"PLAY_CARD"

The server:

1. receives move
2. identifies player
3. loads game state
4. validates move
5. runs BangRules
6. updates state
7. persists appropriate data
8. publishes events
9. updates cache
10. broadcasts state through SignalR

The client must never directly modify authoritative HP, role, cards, turn or victory state.

============================================================
32. POSTGRESQL
============================================================

Reuse the existing generic GameRoom/GameMove/GameRecord architecture.

Do not create a separate Bang database.

Do not create unnecessary Bang-specific tables unless there is a strong architectural reason.

Use the generic platform persistence.

The game state should be serializable into the existing JSONB mechanism.

============================================================
33. REDIS
============================================================

Reuse the existing Redis infrastructure.

Use Redis for active room/game state caching if that is already how the platform handles Vây Bắt.

Do not introduce another cache.

============================================================
34. RABBITMQ
============================================================

Use the existing RabbitMQ event infrastructure.

Publish meaningful game events where appropriate.

Examples:

Bang.GameStarted
Bang.CardPlayed
Bang.AttackStarted
Bang.DefensePlayed
Bang.DamageTaken
Bang.PlayerEliminated
Bang.TurnStarted
Bang.GameEnded

Follow the existing project's event conventions.

Do not invent a completely separate messaging system.

============================================================
35. OPENSEARCH
============================================================

Reuse existing OpenSearch infrastructure for completed game/history search if the Platform already supports it.

Do not modify generic search architecture unnecessarily.

Index completed Bang matches using the existing GameRecord/history mechanism.

Potential searchable fields:

gameKey
winner
duration
player count
players
timestamp

============================================================
36. MINIO
============================================================

Reuse existing MinIO infrastructure.

If the existing platform stores replay artifacts, store Bang replay information through the existing mechanism.

Do not create another storage provider.

============================================================
37. REPLAY
============================================================

The game engine should produce deterministic events/moves.

Store:

- initial game configuration
- role assignment metadata securely
- character assignment
- game moves
- game events
- timestamps

The platform should be able to replay a completed match later.

Do not expose hidden roles/cards incorrectly during normal gameplay.

============================================================
38. GAME STATE
============================================================

Create a strongly typed Bang state.

Conceptually:

BangGameState:

gamePhase
players
currentPlayerId
turnNumber
deck
discardPile
activeEffects
winner
gameLog
turnTimer
lastAction

Player:

id
name
character
role
hp
maxHp
hand
weapon
equipment
statusEffects
alive
seatIndex

Do not expose private fields in public state.

============================================================
39. PUBLIC STATE VS PRIVATE STATE
============================================================

This is mandatory.

Create a public projection for each player.

Example:

BangPublicPlayer:

id
name
character
publicRole
hp
maxHp
cardCount
weapon
equipment
statusEffects
alive
seatIndex

Private player state:

role
hand

The server must generate a player-specific state payload.

For player A:

Player A receives:
- own role
- own hand

Player A receives only:
- card count
- hidden role indicator

for players B, C, D, etc.

Never serialize opponent hands into the response and merely hide them with CSS.

============================================================
40. DISTANCE DISPLAY
============================================================

Distance must be visible directly on the table.

Every opponent should show:

KHOẢNG CÁCH
1

or:

KHOẢNG CÁCH
2

Use subtle lines between the local player and targets.

Do not clutter the screen.

When target selection begins:

Valid targets:
- green/gold indicator
- crosshair
- "TRONG TẦM"

Invalid targets:
- gray/red indicator
- "NGOÀI TẦM"

============================================================
41. WEAPON DISPLAY
============================================================

Every player's equipped weapon is public.

Example:

🔫 Volcanic
Tầm bắn: 1

or:

🔫 Schofield
Tầm bắn: 2

Display this directly on player HUD.

Do not require opening a modal to inspect weapons.

============================================================
42. UI INFORMATION HIERARCHY
============================================================

Priority:

1. ĐẾN LƯỢT AI?
2. HP của tôi
3. Bài trên tay
4. Vũ khí + tầm bắn của tôi
5. HP của đối thủ
6. Số lá bài của đối thủ
7. Vũ khí của đối thủ
8. Khoảng cách
9. Ai đang trong tầm?
10. Nhật ký trận đấu

The user should understand the game state in 1–2 seconds.

============================================================
43. VISUAL DESIGN
============================================================

Create a premium Wild West board-game visual style.

Materials:

- dark wood
- leather
- aged paper
- brass
- metal
- rope
- saloon table
- Western card styling

Primary visual colors:

dark brown
warm black
aged parchment
muted gold
dark red
deep green

Gold:
current turn
selection
important interactive states

Red:
BANG!
damage
danger

Green:
valid target
in range
positive effect

Gray:
disabled
out of range
dead

Avoid:

- neon cyberpunk
- SaaS dashboard
- excessive glassmorphism
- excessive gradients
- huge empty spaces

============================================================
44. NO LEFT SIDEBAR IN GAMEPLAY
============================================================

Do NOT reproduce the large sidebar from the old Stitch design.

The game board must use the entire screen.

Navigation/settings can be opened through compact controls.

Gameplay should dominate the screen.

============================================================
45. RESPONSIVE DESIGN
============================================================

Desktop is the primary target.

Support:

4 players
5 players
6 players
7 players
8 players

The layout must adapt.

Do not let 8 players overlap.

Tablet:

- smaller player HUD
- collapsible game log
- collapsible chat

Mobile:

Do not simply scale down desktop.

Create a dedicated mobile layout.

Mobile:

Top:
- turn
- timer

Middle:
- current game area
- compact opponent strip

Bottom:
- player's hand
- action buttons

Drawers:
- game log
- chat
- player details

============================================================
46. ANIMATIONS
============================================================

Add subtle game animations.

Card draw:
card moves from deck to hand

BANG!:
gunshot/muzzle flash

Damage:
player HUD shakes slightly

HP:
heart decreases

Beer:
healing effect

Weapon:
weapon equip animation

Turn:
golden highlight moves

Target:
crosshair appears

Player eliminated:
HUD becomes grayscale

Do not overdo animations.

Gameplay clarity is more important.

============================================================
47. ERROR MESSAGES MUST BE VIETNAMESE
============================================================

Examples:

"Không phải lượt của bạn."

"Bạn không có lá bài này."

"Mục tiêu không hợp lệ."

"Mục tiêu nằm ngoài tầm bắn."

"Người chơi này đã bị loại."

"Bạn không thể thực hiện hành động này."

"Phòng đã đầy."

"Không thể kết nối đến máy chủ."

"Mất kết nối. Đang kết nối lại..."

"Bạn đã bị loại khỏi trận đấu."

All user-facing errors must be Vietnamese.

============================================================
48. GAME LOG MUST ALSO BE VIETNAMESE
============================================================

Examples:

"Wyatt đã rút 2 lá."

"Wyatt sử dụng BANG! lên Billy."

"Billy sử dụng TRƯỢT!"

"Billy mất 1 HP."

"Calamity trang bị Volcanic."

"Đến lượt Billy."

"Jesse đã bị loại."

"Cảnh sát trưởng đã bị hạ."

"Kẻ ngoài vòng pháp luật chiến thắng."

============================================================
49. TESTING
============================================================

Add backend unit tests for:

- role assignment
- character assignment
- deck initialization
- card drawing
- card ownership
- turn validation
- distance calculation
- weapon range
- target validation
- BANG!
- MISSED!
- BEER
- weapon equip
- elimination
- dead-player turn skipping
- victory conditions
- invalid moves
- hidden role protection
- hidden hand protection

Test multiple player counts:

4
5
6
7
8

Test distance around the circular table.

Example:

For 6 players:

A-B = 1
A-C = 2
A-D = 3
A-E = 2
A-F = 1

============================================================
50. SECURITY TESTING
============================================================

Verify that a client cannot:

- modify own HP
- modify opponent HP
- modify role
- reveal hidden role
- add cards
- remove cards
- play a card they don't own
- play during another player's turn
- attack dead players
- attack out-of-range targets
- force victory
- manipulate turn order

All must be rejected by server-side rules.

============================================================
51. DEVELOPMENT MODE
============================================================

For development only, create a debug panel if the existing project architecture allows it.

The debug panel can:

- switch between test players
- inspect game state
- inspect legal actions
- force draw
- force damage
- end turn

Only compile/show it in Development mode.

Never expose it in production.

============================================================
52. DO NOT BREAK EXISTING GAME
============================================================

After implementation:

Vây Bắt must still work.

Verify:

gameKey = "vaybat"

still routes correctly.

Verify:

gameKey = "bang"

routes to BangBoard.

Platform APIs must remain backward compatible.

============================================================
53. README UPDATE
============================================================

After implementation, update README.md.

Add:

## 🎯 Game 002 — BANG!

Explain:

- game concept
- player count
- roles
- cards
- gameplay
- server-authoritative rules
- SignalR
- how to start
- how to test
- how Bang integrates into Platform

Keep documentation in English if that is the project's current documentation style, but clearly mention:

"All player-facing gameplay UI is Vietnamese."

============================================================
54. ACCEPTANCE CRITERIA
============================================================

The implementation is successful only if:

1. Existing infrastructure still starts with Docker Compose.

2. Existing Vây Bắt game still works.

3. /api/games/engines lists:

vaybat
bang

4. A user can create a Bang room.

5. Other users can join.

6. 4–8 players can participate.

7. Roles are assigned server-side.

8. Hidden roles remain private.

9. Characters are assigned.

10. Players receive cards.

11. Players can draw cards.

12. Players can play valid cards.

13. Invalid cards are rejected.

14. Players can attack.

15. Players can defend.

16. HP changes correctly.

17. Players can be eliminated.

18. Dead players cannot act.

19. Turns rotate correctly.

20. Distance is calculated correctly.

21. Weapon range is calculated correctly.

22. Valid targets are highlighted.

23. Out-of-range targets are disabled.

24. Every player HUD shows:
    - HP
    - card count
    - weapon
    - range
    - distance
    - public role status

25. Local player sees their own cards.

26. Opponent cards remain hidden.

27. Game events appear in Vietnamese.

28. UI is entirely Vietnamese.

29. SignalR synchronizes players in real time.

30. PostgreSQL persistence continues working.

31. Redis integration continues working.

32. RabbitMQ integration continues working.

33. OpenSearch integration continues working.

34. MinIO integration continues working.

35. Game records/replays use the existing Platform architecture.

36. Victory conditions work.

37. Spectator mode works.

38. Reconnection works if supported by existing Platform.

39. Frontend is responsive.

40. TypeScript build succeeds.

41. .NET build succeeds.

42. Tests pass.

43. Docker Compose starts successfully.

============================================================
55. IMPLEMENTATION ORDER
============================================================

Follow this order:

PHASE 1
Inspect repository and understand Platform.

PHASE 2
Create BangTypes.

PHASE 3
Create BangRules.

PHASE 4
Create BangEngine implementing IGameEngine.

PHASE 5
Register BangEngine in Program.cs.

PHASE 6
Test game rules independently.

PHASE 7
Create frontend Bang types.

PHASE 8
Create BangBoard.

PHASE 9
Create player HUDs.

PHASE 10
Create card system UI.

PHASE 11
Create target selection UI.

PHASE 12
Create distance and range visualization.

PHASE 13
Connect frontend to existing SignalR.

PHASE 14
Test multiplayer with multiple browser tabs.

PHASE 15
Integrate persistence/cache/events using existing Platform services.

PHASE 16
Add victory/spectator/reconnect states.

PHASE 17
Polish animations and responsive layout.

PHASE 18
Update README.

After each phase:

- compile
- run tests
- fix errors
- inspect resulting code

Do not accumulate broken code.

============================================================
56. IMPORTANT FINAL INSTRUCTION
============================================================

Do not merely produce a UI mockup.

Do not stop after creating React components.

Build the actual playable game.

The final experience should feel like:

A real Vietnamese online Western card game.

The user should be able to look at the board and immediately understand:

"Đây là Billy."
"Billy còn 4 HP."
"Billy có 5 lá."
"Billy đang dùng Cattleman."
"Tầm bắn của tôi là 1."
"Khoảng cách đến Billy là 1."
"Vì vậy tôi có thể bắn Billy."

This information must be visible directly on the game board.

The interface should never force the user to open multiple menus to understand targeting.

============================================================
57. START NOW
============================================================

First inspect the repository.

Do not create a new project.

Do not replace the infrastructure.

Do not rewrite the Platform.

Explain briefly:

1. What existing architecture you found.
2. How Vây Bắt currently works.
3. Where Bang will be added.
4. Which files you will create/change.

Then begin implementation immediately.

At the end:

- run backend tests
- run frontend type checking
- run frontend build
- run dotnet build
- verify Docker Compose
- verify Vây Bắt
- verify Bang
- fix any errors you encounter

Report the final implementation clearly.