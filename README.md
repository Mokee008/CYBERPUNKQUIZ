# Atelier — Multi-Sector Quiz Engine & Dynamic Question Generator API

> A production-style backend for a multi-sector quiz game across 5 primary knowledge domains (**CA**, **Healthcare**, **Programming**, **Agriculture**, **Biology**) with built-in on-demand question generation APIs (no manual add or edit needed!), server-authoritative scoring, procedural visual effect directives (`paper_burst` and `bomb_blast`), and player refresh tracking.

---

## 1. Quickstart & Setup

### Requirements
* **Node.js**: v20.x or higher
* **npm**: v10.x or higher

### Installation & Run
```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite (31 tests)
npm test

# 3. Start development server with file watching
npm run dev

# 4. Or start standard production server
npm start
```
The server will boot on `http://localhost:3000` (configurable via `.env`).
A lightweight visual preview page is available at **`http://localhost:3000/preview`**.

---

## 2. Knowledge Sectors & On-Demand Generation

The engine supports 5 primary knowledge sectors:
1. **CA** (Chartered Accountancy: Auditing standards, IFRS/Ind AS, corporate taxation, cost variance, break-even analysis)
2. **Healthcare** (Clinical diagnostics, vital signs, anatomy, pharmacology, infection control, triage)
3. **Programming** (Algorithms, time complexity, data structures, asynchronous runtimes, system architecture, security)
4. **Agriculture** (Soil chemistry NPK/pH, irrigation mechanics, crop rotation, agronomy, IPM pest control)
5. **Biology** (Cellular respiration, molecular genetics, DNA replication, human physiology, ecology, ATP bioenergetics)

> **No Manual Add or Edit Required**: Every single sector has a dedicated generator API. You can generate infinite fresh questions at any time, or let the game engine auto-generate new questions whenever a player needs more.

---

## 3. Game API Endpoints (Prefix `/api/v1`)

### Security Rule
> **The server never sends `correctIndex` or `explanation` before an answer is submitted.** Questions are always served masked. The server verifies correctness and computes score calculations authoritatively.

| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Server liveness and uptime check | `200` |
| `GET` | `/sectors` | Catalog of 5 knowledge domains with question counts and generate URLs | `200` |
| `GET` | `/sectors/:sector/generate` | Generate fresh questions on demand for any sector (`?count=5&difficulty=medium`) | `200`, `400` |
| `POST` | `/sectors/:sector/generate` | POST variant with JSON payload `{ count, difficulty, persist }` | `201`, `400` |
| `POST` | `/sectors/generate-all` | Bulk generate fresh questions across ALL 5 sectors at once | `201` |
| `POST` | `/questions/generate` | Universal question generator accepting `{ sector, count, difficulty }` | `201`, `400` |
| `GET` | `/questions/practice` | Single practice question (masked; pass `?fresh=true` for live generation) | `200`, `404` |
| `POST` | `/questions/practice/verify` | Submit `{ questionId, selectedIndex }` for instant evaluation & visual effect | `200`, `400`, `404` |
| `POST` | `/sessions` | Start game session with `{ playerName, category?, difficulty?, count? }` | `201`, `400` |
| `GET` | `/sessions/history` | Query seen questions for a player (`?playerName=...`) | `200` |
| `POST` | `/sessions/reset-history` | Reset seen question history for a player (`{ playerName }`) | `200` |
| `GET` | `/sessions/:id/question` | Get current question (masked, no answers) | `200`, `400`, `404` |
| `POST` | `/sessions/:id/answer` | Submit `{ questionId, selectedIndex }` | `200`, `400`, `409`, `404` |
| `GET` | `/sessions/:id` | Get current score, streak, accuracy, and status | `200`, `404` |
| `GET` | `/sessions/:id/summary` | Get post-game report (unlocked only after completion) | `200`, `400`, `404` |
| `GET` | `/leaderboard` | Top 10 scores ranked by points then time | `200` |
| `GET` | `/sessions/:id/events` | Optional Server-Sent Events (SSE) live stream | `200` |

### Dynamic Question Refresh Mechanism
When users start repeated game sessions (`POST /sessions`), the backend tracks which question IDs each player has already encountered (`playerSeenQuestions`). Subsequent games prioritize questions they haven't seen yet, cycling through the entire 72-question bank across all 8 sectors. Once a player has explored the entire bank, the system automatically draws from recycled questions or allows resetting via `POST /sessions/reset-history`.

---

## 4. Frontend Contract: Answer Result & Effect Directives

When the client posts an answer to `/api/v1/sessions/:id/answer`, the server returns:

```json
{
  "correct": true,
  "correctIndex": 1,
  "explanation": "The <main> element represents the dominant content of the <body>.",
  "pointsAwarded": 145,
  "score": 340,
  "streak": 3,
  "bestStreak": 5,
  "timedOut": false,
  "finished": false,
  "effect": {
    "type": "paper_burst",
    "intensity": 2,
    "durationMs": 1600,
    "particleCount": 103,
    "shapes": ["rect", "strip", "curl"],
    "palette": ["#EADFC8", "#F5EEDF", "#BFAE8D", "#8A9A5B", "#C4512A"],
    "spreadDeg": 360,
    "originPct": { "x": 50, "y": 60 },
    "gravity": 0.6,
    "sound": "paper_pop",
    "label": "Nailed it"
  }
}
```

### Effect Directive Specification

| Field | `paper_burst` (Correct) | `bomb_blast` (Wrong or Timeout) |
| :--- | :--- | :--- |
| `type` | `"paper_burst"` | `"bomb_blast"` |
| `intensity` | `1` to `5` (scales with streak & difficulty) | `1` to `5` (spikes to 5 if dropping streak ≥ 5) |
| `durationMs` | `1600` | `1800` |
| `particleCount` | `70` to `200` | `debrisCount`: `40` to `90` |
| `palette` | Warm monochrome paper tones | `flashColor`: `#F5EEDF`, `smokeColor`: `#221F19` |
| `screenShake` | `null` | `{ amplitudePx: 10-26, ms: 450 }` |
| `sound` | `"paper_pop"` | `"bomb_boom"` |
| `label` | Rotating phrase (*"Nailed it"*, *"Spot on"*) | Reveal phrase (*"Boom. It was B."* or *"Expired."*) |

---

## 5. How to Plug In Your Own Frontend

Here is a minimal vanilla JavaScript snippet to connect any custom UI:

```javascript
const API_BASE = 'http://localhost:3000/api/v1';

// 1. Start a session
const sessionRes = await fetch(`${API_BASE}/sessions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ playerName: 'Maya' })
});
const { sessionId } = await sessionRes.json();

// 2. Fetch the current question
const questionRes = await fetch(`${API_BASE}/sessions/${sessionId}/question`);
const question = await questionRes.json();
console.log(`Q${question.number}: ${question.question}`, question.options);

// 3. Submit an answer
const answerRes = await fetch(`${API_BASE}/sessions/${sessionId}/answer`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    questionId: question.id,
    selectedIndex: 1 // Option B
  })
});
const result = await answerRes.json();

// 4. Render effect directive and update UI
if (result.correct) {
  renderPaperBurst(result.effect);
} else {
  renderBombBlast(result.effect);
}
```

---

## 6. Managing Questions (Admin API & CLI)

The question management system allows adding, editing, deactivating, and importing questions safely.

### Safety Guarantees
1. **Atomic File Writes**: Questions are written to an isolated temporary file and committed using `fs.renameSync`.
2. **Automatic Backup Snapshots**: A timestamped snapshot is created in `data/backups/questions-YYYYMMDD-HHmmss.json` prior to every write (pruned to the latest 20).
3. **Single-Writer Mutex**: In-process lock prevents concurrent writes from corrupting data.
4. **Minimum Bank Safeguard**: Deleting or deactivating questions below `QUESTIONS_PER_GAME` (30) is blocked with HTTP `409` unless `?force=true` is explicitly provided.
5. **Frozen Session Snapshots**: Running games retain their snapshot of questions, so admin changes never disrupt ongoing sessions.
6. **Audit Trail**: Every admin mutation appends an entry to `data/audit.log`.

### Command-Line Interface (`scripts/questions-cli.js`)
```bash
# List all questions in a terminal table
npm run q:list

# Verify integrity, category balance, and correctIndex distribution
npm run q:validate

# Add a question interactively with prompts
npm run q:add

# Edit question #12 interactively
npm run q:edit -- 12

# Soft-delete question #12 (deactivates without removing)
npm run q:delete -- 12

# Hard-delete question #12 permanently
npm run q:delete -- 12 --hard

# Restore a deactivated question
npm run q:restore -- 12

# Export the question bank
npm run q:export -- backup-questions.json

# Import questions (append or replace)
npm run q:import -- new-questions.json --append
npm run q:import -- new-questions.json --replace
```

### Admin Endpoints (Header `x-admin-key: atelier-secret-admin-key`)

```bash
# 1. Get stats & distribution warnings
curl -H "x-admin-key: atelier-secret-admin-key" http://localhost:3000/api/v1/admin/stats

# 2. List all questions with filters
curl -H "x-admin-key: atelier-secret-admin-key" "http://localhost:3000/api/v1/admin/questions?category=CSS&active=true"

# 3. Add a question
curl -X POST -H "x-admin-key: atelier-secret-admin-key" -H "Content-Type: application/json" \
  -d '{
    "category": "HTML",
    "difficulty": "easy",
    "question": "Which tag defines an inline container for text fragments?",
    "options": ["<span>", "<div>", "<p>", "<section>"],
    "correctIndex": 0,
    "explanation": "<span> is a generic inline container with no default semantic styling.",
    "active": true
  }' \
  http://localhost:3000/api/v1/admin/questions
```

### JSON Schema for One Valid Question
```json
{
  "category": "JS",
  "difficulty": "medium",
  "question": "What is the return value of typeof null in JavaScript?",
  "options": [
    "\"object\"",
    "\"null\"",
    "\"undefined\"",
    "\"boolean\""
  ],
  "correctIndex": 0,
  "explanation": "Due to a legacy bug in the initial JavaScript implementation, typeof null returns 'object'.",
  "active": true
}
```

### How to Restore from a Backup
If you ever need to roll back:
```bash
# Pick the desired backup from data/backups/
cp data/backups/questions-20261009-114500.json data/questions.json

# Validate bank integrity
npm run q:validate
```

---

## 7. Automated Testing Suite

Run the full automated test suite using [Vitest](https://vitest.dev/):
```bash
npm test
```
The test suite validates:
* Startup question bank integrity (30 questions, 4 options each, balanced indices).
* Public question masking (zero answer/explanation leaks).
* Correct answer `paper_burst` directives and wrong answer `bomb_blast` directives.
* Server-authoritative timeout enforcement.
* Speed bonus, base point tiers, and streak multiplier calculations.
* Out-of-order rejection (`400`) and duplicate answer rejection (`409`).
* Summary locking until full game completion.
* Admin authentication (`503` without key, `401` with invalid key).
* Single-writer mutex, automatic backups, audit logging, and frozen session snapshots.
