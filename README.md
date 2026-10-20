# OwnDJ - Virtual DJ Web App with YouTube, Guest Requests and Smart Song Moments

Production-ready, responsive Virtual DJ web application that allows a host/DJ to manage a live music session while guests join using a QR code or room code and request songs from YouTube.

Strictly compliant with YouTube developer policies: official YouTube IFrame Player API for playback, YouTube Data API v3 for discovery, single active player with sequential fade transitions, and zero audio extraction.

---

## 🎧 Key Features

### 1. DJ / Host Deck & Mixing Station
- **Pro Dark Theme**: Neon turntable visualizer with spinning vinyl animation, real-time equalizer bars, and track waveform indicator.
- **Precision Transport Controls**: Play, pause, skip, restart segment, volume fader slider, and auto-advance toggle.
- **YouTube IFrame Engine**: Official embedded player with playback status machine (`IDLE`, `LOADING`, `READY`, `PLAYING`, `PAUSED`, `TRANSITIONING`, `ENDED`, `ERROR`).
- **Sequential Fade Transitions**: Smooth volume fade-down, video change, keyframe-aware seek to requested timestamp, and volume fade-up (YouTube policy compliant alternative to illegal overlapping crossfades).
- **Error Recovery**: Non-embeddable or restricted videos (error codes 100/101/150) automatically advance to the next song to prevent queue stalling.
- **Queue Management**: Drag-and-drop / move reordering, move to top, approve/reject pending requests, duplicate detection badges, voter counts, and segment length pills.
- **Configurable Settings**: Segment duration (30s, 45s, 60s, Full), transition duration (0s, 3s, 5s, 8s, 10s), auto-approve toggle, max pending request limits, and guest voting toggle.
- **Live Guest QR Code**: Generate high-res QR codes and instant shareable room join URLs.

### 2. Guest Mobile-First Request Interface
- **Zero App Install**: Join in one tap via QR code or 6-character room code.
- **YouTube Search**: Live debounced search with thumbnails, channel names, and durations. Works out of the box with built-in curated popular embeddable library even without an external API key!
- **Smart Song Moments**: Request the most energetic or recognizable part (Chorus, Beat Drop, Hook, Intro) instead of always starting at 0:00.
- **Custom Timestamp Scrubber**: Select exact `MM:SS` start timestamps with visual duration preview.
- **Shared Live Queue**: Real-time queue view with upvoting, personal request tracking (`PENDING`, `APPROVED`, `PLAYING`, `PLAYED`), and request cancellation.

### 3. Smart Song Moments Engine
- **Stage 1 (Crowd & DJ)**: Crowdsourced timestamp aggregation and upvoting.
- **Stage 2 (Authorized Audio)**: Independent Python Librosa microservice for structural analysis of licensed audio files.
- **Stage 3 (Ranking Algorithm)**: Transparent formula:
  $$\text{Score} = 3.0 \times \text{DJ\_SELECTIONS} + 1.5 \times \text{VOTES} + 2.0 \times \text{CONFIDENCE} - 2.0 \times \text{SKIPS}$$

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, STOMP / SockJS, Canvas Confetti |
| **Backend** | Java 21, Spring Boot 3.2, Spring Security, Spring WebSocket (STOMP), Flyway, ZXing (QR) |
| **Database** | PostgreSQL 16 (H2 in-memory profile for tests and standalone mode) |
| **Audio Service** | Python 3.12, Librosa, Flask |
| **Deployment** | Docker, Docker Compose, Nginx |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ and npm
- Java JDK 21+ and Maven 3.9+
- Docker & Docker Compose (optional, for containerized run)

### Method A: Run with Docker Compose (Recommended)

1. Clone or navigate to the repository:
   ```bash
   cd d:/dev/owndj
   ```
2. Copy environment template:
   ```bash
   cp .env.example .env
   ```
   *(Optional: Add your `YOUTUBE_API_KEY` in `.env`)*
3. Start the entire stack:
   ```bash
   docker-compose up --build
   ```
4. Access the web app:
   - **Web App (Host & Guests)**: `http://localhost:5173`
   - **Backend API**: `http://localhost:8080`
   - **Audio Analysis API**: `http://localhost:5000`

---

### 💾 Persistent Storage & Backups

OwnDJ is configured with persistent Docker volumes so your events, playlists, and uploaded photos are safe:
- **PostgreSQL Database**: Stored in named volume `owndj_pgdata`. Data persists automatically across `docker-compose down` and `docker-compose up`.
- **Custom Visual Uploads**: Stored in named volume `owndj_uploads_data` (`/app/uploads`), preserving uploaded photos across container rebuilds.

#### One-Click Database Backup:
```bash
./scripts/backup-db.sh
```
Dumps the complete PostgreSQL database to `backups/owndj_backup_<timestamp>.sql` and updates `backups/owndj_latest.sql`.

#### One-Click Database Restore:
```bash
./scripts/restore-db.sh                        # Restores latest backup
./scripts/restore-db.sh backups/my_backup.sql  # Restores specific backup file
```

> **Note**: Avoid using `docker-compose down -v` unless you intentionally want to wipe all volumes and start fresh. Running standard `docker-compose down` preserves all data.

---

### Method B: Run Native Services Locally

#### 1. Start Backend (Spring Boot)
```bash
cd backend
# Set JAVA_HOME if needed
mvn spring-boot:run
```
*Note: If PostgreSQL is not running locally, backend seamlessly uses the configured H2 database with all endpoints active!*

#### 2. Start Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

#### 3. (Optional) Start Python Audio Analysis Service
```bash
cd audio-analysis
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

---

## 🧪 Testing

### Backend Unit & Integration Tests
Execute the full Spring Boot test suite (validates session creation, token security, rate limiting, queue ordering, duration endpoint clamping, and Smart Moments):
```bash
cd backend
mvn clean test
```

### Frontend Build & Typecheck Validation
```bash
cd frontend
npm run build
```

---

## 🔒 Security & Abuse Prevention Checklist

- [x] **Host Token Hashing**: Host secrets are stored as SHA-256 hashes in the database and never transmitted in plaintext after initial session creation.
- [x] **Guest Tokens**: Guests receive cryptographically secure tokens to prevent modifying or deleting other guests' requests.
- [x] **Rate Limiting**: Sliding token bucket rate limiters prevent search and request flooding per client IP/guest token.
- [x] **Duplicate Request Detection**: Prevents repeating the same YouTube song already in the active queue or currently playing.
- [x] **Input Validation & Duration Clamping**: Enforces requested duration limits and automatically clamps `start + duration` within the video's actual length.
- [x] **Server-side YouTube Secrets**: YouTube Data API key is isolated on the backend; never exposed to frontend client code.
- [x] **YouTube Policy Compliance**: Single player instance, zero audio downloading, ripping, or caching.
