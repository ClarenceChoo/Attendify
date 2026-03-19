# Attendify

Attendify is a smart campus engagement platform that makes event attendance fast, secure, and measurable.

It helps organisers run smoother events with live attendance visibility and helps students check in with a frictionless scan flow.

## Project Story (Devpost)

### About the project

We built Attendify to solve a common problem in residential colleges: attendance taking is often slow, easy to game through proxy sign-ins, and hard to analyze after the event.

Our goal was simple: make attendance a one-scan experience for students, while giving organisers secure and trustworthy records in real time.

Core flow:
1. Organiser starts check-in for an event.
2. A live QR rotates frequently.
3. Student scans and attendance is validated + recorded.
4. Organiser sees live attendance and post-event export.

### How we built it

- Frontend: React + TypeScript + Vite
- Backend: Express + TypeScript
- Database: Firestore
- Auth/Security: JWT + signed scan tokens
- Real-time: QR stream updates and live dashboard polling

Key implementation highlights:
- Event lifecycle management (`draft` → `ongoing` → `completed`)
- Secure scan validation with expiring tokens
- Duplicate scan rejection and suspicious activity flagging
- Student attendance history and badge progression
- CSV export for organiser reporting

Attendance rate is computed as:

$$
	ext{Attendance Rate} = \frac{\text{Total Scanned}}{\text{Expected Attendees}} \times 100\%
$$

### Challenges we faced

- Balancing fast UX with secure token validation
- Handling token expiry and refresh timing cleanly
- Managing edge cases (expired token, duplicate scans, auth redirects)
- Keeping the MVP scope tight enough for a hackathon timeline

### What we learned

- A simple user flow requires strong backend design
- Security and usability must be designed together, not separately
- Shipping one complete loop is better than many half-built features

### What’s next

- Production hardening for auth and role policies
- Better anomaly detection for suspicious scans
- Richer organiser analytics and trend views
- Notifications and deeper campus integration

## Features

### Student
- Secure login
- Event listing and quick scan flow
- Instant attendance confirmation
- Attendance history and badges

### Organiser
- Create and manage events
- Start/stop check-in windows
- Live QR generation
- Real-time attendance dashboard
- Suspicious activity visibility
- CSV export after event completion

## Tech Stack

- React 19
- TypeScript
- Vite
- Express
- Firebase Firestore
- JWT

## Local Development

### Prerequisites
- Node.js 18+

### 1) Install dependencies

```bash
npm install
cd server && npm install && cd ..
```

### 2) Run backend

```bash
cd server
npm run dev
```

Backend runs on `http://localhost:3001`.

### 3) Run frontend

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Environment Variables

Create `.env` files as needed:

- Root frontend (example):
  - `VITE_API_URL=http://localhost:3001/api`
- Server:
  - `PORT=3001`
  - `JWT_SECRET=your-secret`
  - `APP_URL=http://localhost:5173`

## Deployment Notes

- `vercel.json` rewrites all routes to `index.html` for SPA routing.
- Ensure backend API hosting and frontend `VITE_API_URL` are aligned in production.
