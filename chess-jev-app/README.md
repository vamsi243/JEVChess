# JEVChess ⚡

> **Fast, reactive Blitz and Bullet Chess powered by TypeSafe JEV System-One inference.**

JEVChess is an elegant, minimal chess platform designed around the authentic **Chess.com** aesthetic (`#2c2b29` background, `#4e7837` green squares, `#ffffff` white squares). It delivers rapid tactical responses using TypeSafe AI's **Jev** System-One model and heuristic fallback evaluation, without requiring any external database.

---

## Table of Contents
- [Game Rules & Controls](#game-rules--controls)
- [How JEV Thinks: System-One Inference](#how-jev-thinks-system-one-inference)
- [Technical Architecture](#technical-architecture)
- [Database-Free Logging on Vercel](#database-free-logging-on-vercel)
- [API Reference](#api-reference)
- [Local Setup & Running](#local-setup--running)
- [Deploying to Vercel](#deploying-to-vercel)

---

## Game Rules & Controls

### Rules of Play
1. **Standard Chess Rules (FIDE Compliant)**:
   - All standard piece movements, captures, checks, checkmates, stalemates, and pawn promotions (auto-promotes to Queen for blitz speed) are strictly enforced.
   - **Illegal moves are physically prevented**: You can only drop pieces on valid squares.
2. **Move Indicators**:
   - Selecting a piece highlights it in soft gold/green (`#baca2b`) and places translucent indicator dots on all legal destination squares.
   - Clicking an enemy piece with a capture indicator executes the capture.
   - Clicking another friendly piece immediately switches selection without deselecting.
3. **Time Controls**:
   - **1 Minute (Bullet) — Default**: High-speed reactive game testing quick reflexes.
   - **3 Minutes (Blitz)**: Fast-paced classical blitz game.
   - **5 Minutes (Rapid)**: Strategic play with extra thinking time.
   - Running out of time immediately concludes the match with a **Time Out** defeat.
4. **AI Playstyle Modes**:
   - **Moderate (Balanced Strategy)**: Positional solidity, center control, sound material trades, and castling safety.
   - **Aggressive (Tactical Attack)**: Forward piece advancement, relentless checks, pawn storming, and high-pressure attacks on the enemy King and Queen.
   - **Defensive (Solid Fortress)**: Safeguards every piece, avoids hanging material, retreats attacked pieces to secure squares, and prioritizes King cover.
5. **Mandatory Username**:
   - Every player must supply a username before starting. Matches and statistics are indexed and exported per user.

---

## How JEV Thinks: System-One Inference & Dynamic Confidence

Most computer chess engines (like Stockfish or Leela) use **System-Two** cognition: deep, tree-searching minimax algorithms calculating 15 to 30 moves ahead across millions of positions. 

**JEVChess approaches blitz chess like a human Grandmaster's intuitive "System-One" reflex:**

```
                  ┌──────────────────────────────┐
                  │    Current Position (FEN)    │
                  └──────────────┬───────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              ▼                                     ▼
   [ Candidate Move Set ]                [ Position Context ]
   - Legal moves from Chess.js           - Active AI Mode (Aggressive / Defensive / Moderate)
   - Piece-Square centipawn tables       - Threat detection & guarded squares
   - Checks, escapes & promotions        - Favorable vs bad trades (Q=900, R=500, B=330, N=320, P=100)
              │                                     │
              └──────────────────┬──────────────────┘
                                 │
                                 ▼
              ┌─────────────────────────────────────┐
              │    TypeSafe Jev System-One API      │
              │  (Single-pass Parallel Evaluation)  │
              └──────────────────┬──────────────────┘
                                 │
                                 ▼
                     Highest Confidence Move
                 (e.g., e5 [57%] Controls Center)
```

### 1. Intuitive Parallel Scoring
Rather than simulating branching trees, JEV evaluates candidate moves in a single parallel pass:
- **Blunder & Hanging Piece Prevention**: Evaluates whether a piece moving into the center or attacking territory is guarded or exposed to lower-value recaptures.
- **King Safety & Check Defence**: When the King is in check, moves that resolve the threat (capturing the checking piece, interposing, or escaping) are given immediate priority.
- **Material Exchange Quality**: Evaluates relative piece values in centipawns (Queen: 900, Rook: 500, Bishop: 330, Knight: 320, Pawn: 100). Favorable trades receive high positive scoring.
- **Center Control & Development**: Occupying central squares (`d4`, `e4`, `d5`, `e5`) and developing Knights/Bishops to active outposts.
- **Mode-Specific Bias**: Adjusts aggression, pawn advancement, check appetite, and defensive fortress positioning dynamically.

### 2. Truly Dynamic Confidence Probabilities
Confidence scores are **100% dynamic**, calculated continuously from the evaluation delta and tactical advantage:
- **Winning / Decisive Advantage**: `75% – 98%` confidence.
- **Equal / Tactical Struggle**: `50% – 65%` confidence.
- **Under Heavy Attack / Material Down**: `30% – 45%` confidence.

---

## Technical Architecture

```
chess-jev-app/
├── public/
│   ├── index.html        # Single-page UI with Chess.com theme & game engine
│   └── chess.min.js      # Self-contained UMD chess rules engine (v0.10.3)
├── logs/                 # Local JSON log directory (auto-created)
│   └── <user>_logs.json  # Individual user match histories
├── server.py             # Python 3.11 backend (runs locally without Node)
├── server.js             # Node.js Express backend (pre-configured for Vercel)
├── package.json          # Node dependencies & project metadata
└── vercel.json           # Vercel deployment configuration
```

### Technology Highlights
- **Front-End**: Pure Vanilla HTML5, CSS3, and JavaScript with zero heavy front-end framework overhead for instant load times and zero build steps.
- **Design System**: Strict adherence to the official Chess.com color palette:
  - App Canvas: `#2c2b29`
  - Button Neutral: `#4b4847`
  - Button Active/Hover: `#4e7837`
  - Dark Board Squares: `#4e7837`
  - Light Board Squares: `#ffffff`
  - Typography: Clean, consistent Sans-Serif across all elements.
- **Offline Resilience**: Uses a bundled local UMD build of `chess.min.js` to ensure zero CDN breakages or ES module syntax errors.

---

## Database-Free Logging on Vercel

### The Challenge with Serverless
On Vercel, Serverless Functions run inside ephemeral AWS Lambda execution environments where the local filesystem is **strictly read-only** (except `/tmp`). Calling `fs.writeFileSync('logs.json')` in production throws:
```text
EROFS: read-only file system
```
Furthermore, `/tmp` is wiped as lambda instances spin down or scale across regions.

### The JEVChess Solution
1. **Client-Side `localStorage` Storage**:
   - Every completed match (timestamp, opponent, time mode, outcome, time remaining) is stored directly in the player's browser under `jevchess_logs_<username>`.
   - Data persists across browser sessions and page refreshes without needing a database server.
2. **One-Click JSON Export**:
   - The UI includes a **"Download Log (.json)"** button that dynamically generates `<username>_jevchess_logs.json` and downloads it directly to the user's computer.
3. **Local File Persistence**:
   - When running locally via `server.py` or `server.js`, files are also automatically saved to `./logs/<username>_logs.json`.

---

## API Reference

### 1. `GET /api/jev-test`
Tests JEV inference connectivity and returns benchmark latency and readiness.
- **Query Params**: `fen` (optional, position to evaluate)
- **Response**:
```json
{
  "success": true,
  "app": "JEVChess",
  "gateway": "typesafe-ai-system-one",
  "confidence_score": 0.96,
  "legal_ready": true,
  "latency_ms": 28,
  "model": "typesafe-ai/jev"
}
```

### 2. `POST /api/jev-move`
Evaluates legal candidate moves and selects the optimal tactical blitz move.
- **Body**:
```json
{
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "inCheck": false,
  "legalMoves": [ ... ]
}
```
- **Response**:
```json
{
  "from": "e7",
  "to": "e5",
  "san": "e5",
  "confidence": 0.58,
  "reason": "Occupies Center",
  "inCheckState": false,
  "engine": "JEV-SystemOne-Blitz"
}
```

### 3. `POST /api/save-game`
Logs match outcome for a specific user.
- **Body**:
```json
{
  "username": "SaiMaster",
  "mode": "3 Min Blitz",
  "result": "Victory",
  "timeLeft": "1m 45s"
}
```

### 4. `GET /api/user-logs?username=<name>`
Fetches all recorded matches for the specified username.

---

## Local Setup & Running

### Option A: Using Python (Recommended when Node is not installed)
Since this environment does not require Node.js, you can run the server directly with Python 3:
```powershell
python server.py
```
Then visit **`http://localhost:3000`** (or `http://localhost:52090`).

### Option B: Using Node.js (If Node is installed)
```powershell
npm install
npm start
```

---

## Deploying to Vercel

1. Push your repository to GitHub.
2. In your Vercel Dashboard, click **Add New Project** and import `chess-jev-app`.
3. Vercel automatically detects the configuration in [vercel.json](file:///c:/Users/saichunduru/chess-jev-app/chess-jev-app/vercel.json):
   - Runtime: `@vercel/node`
   - Entry point: `server.js`
4. *(Optional)* Add your TypeSafe AI key under Project Settings > Environment Variables:
   - `TYPESAFE_API_KEY`: Your key (or Vercel AI Gateway key).
5. Click **Deploy**. Your app is live with full serverless functionality!
