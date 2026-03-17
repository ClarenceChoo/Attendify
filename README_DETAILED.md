# Attendify - Smart Campus Engagement Platform

## Project Setup

This is a mono-repo with frontend and backend:

- **Frontend** (`/`): React + Vite + TypeScript + Tailwind
- **Backend** (`/server`): Express.js + Node.js

## Quick Start

### 1. Frontend Setup

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

### 2. Backend Setup

```bash
cd server
npm install
npm run dev
```

Backend runs on `http://localhost:3001`

### 3. Demo Accounts

- **Student**: `student1@u.nus.edu`
- **Organiser**: `org1@u.nus.edu`

## Architecture

### Features Implemented

#### Student Side
- ✅ NUS email login with JWT auth
- ✅ Event list (upcoming and filters)
- ✅ Rotate QR scanner (30s refresh, HMAC-signed token)
- ✅ Instant check-in with backend validation
- ✅ Attendance history view
- ✅ Participation badges (Community Builder, Night Owl, Enthusiast)
- ✅ Engagement scoring

#### Organiser Side
- ✅ Event creation (title, category, venue, time, capacity)
- ✅ Live QR generation (30s refresh, HMAC-signed)
- ✅ Live attendance dashboard
- ✅ Real-time attendee list with status
- ✅ Suspicious activity flagging (duplicate scans)
- ✅ One-click check-in/check-out phases
- ✅ CSV export of attendances
- ✅ Post-event summary

#### Backend Security
- ✅ Rotating QR tokens (valid for 30s)
- ✅ HMAC-SHA256 signed tokens (unforgeab le)
- ✅ One scan per user per phase
- ✅ Optional event time window validation
- ✅ Duplicate prevention
- ✅ Suspicious pattern detection (same device)
- ✅ Bearer token auth (JWT)

#### Analytics
- ✅ Attendance rate computation
- ✅ Late arrival detection
- ✅ Engagement profile (frequency, categories, consistency)
- ✅ Badge system
- ✅ Organiser event summary

## Tech Stack

- **Frontend**: React 19, React Router, Vite 8, Tailwind CSS 4
- **Backend**: Express.js, JWT, crypto (HMAC)
- **Auth**: NUS email verification + JWT
- **Storage**: In-memory (development) — ready for PostgreSQL/Firestore
- **QR**: Server-generated signed tokens + qrcode library
- **Real-time**: Server-Sent Events (SSE) for QR refresh

## File Structure

```
.
├── src/
│   ├── api.ts                    # API client
│   ├── App.tsx                   # Main router
│   ├── App.css                   # Global styles
│   ├── contexts/
│   │   └── AuthContext.tsx       # Auth provider & hooks
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── StudentDashboard.tsx
│   │   ├── ScanQRPage.tsx
│   │   ├── OrganiserDashboard.tsx
│   │   └── EventManagementPage.tsx
│   └── ...
├── server/
│   ├── src/
│   │   └── index.js              # Express server + all routes
│   └── package.json
├── package.json
├── vite.config.ts
└── postcss.config.js
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Login with NUS email

### Events
- `GET /api/events` - List events (student/organiser)
- `POST /api/events` - Create event (organiser)
- `GET /api/events/:eventId` - Get event details
- `PATCH /api/events/:eventId/start` - Start check-in phase
- `PATCH /api/events/:eventId/end` - End event

### QR & Scanning
- `GET /api/events/:eventId/qr-stream` - SSE stream of rotating QR tokens
- `POST /api/scan` - Submit QR scan

### Attendance & Analytics
- `GET /api/events/:eventId/attendances` - Get event attendances (organiser)
- `GET /api/events/:eventId/export-csv` - Download attendance CSV
- `GET /api/me/attendances` - Get my attendance history
- `GET /api/organiser/summary` - Get organiser's events summary

## Key Hackathon Features

1. **Secure Rotating QR**
   - 30-second refresh with HMAC-SHA256 signatures
   - Impossible to forge or replay tokens
   - Protects against proxy attendance

2. **Live Organiser Dashboard**
   - Real-time attendance % and count
   - Suspicious activity alerts
   - Live attendee list with event metadata
   - One-click check-in/check-out phase management

3. **Engagement Analytics**
   - Participation scoring
   - Badges and recognition
   - Event category diversity tracking
   - House/floor leaderboards (extensible)

4. **Event Management**
   - Multi-status workflow (draft → ongoing → completed)
   - CSV export for further analysis
   - Post-event summary generation

5. **Anti-Proxy Protections**
   - One scan per user per phase
   - Same-device detection
   - Optional device binding (extensible)
   - Optional geofence/Wi-Fi check (extensible)

## Future Enhancements

- Database integration (PostgreSQL / Firestore)
- Push notifications (email/Telegram)
- Facial verification for suspicious scans
- NFC card scanning
- Offline fallback mode
- Multi-language support
- Mobile app
- Integration with college SIS

## Notes

- In-memory storage resets on server restart
- All attendances and events are persisted in-memory for hackathon demo
- For production: swap in PostgreSQL/Firestore with proper schema
- Consider adding rate limiting and session management
