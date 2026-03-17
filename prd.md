# Attendify MVP PRD

## 1) MVP Summary

**Product name:** Attendify  
**MVP pitch:** A secure, frictionless web attendance flow for residential colleges where users scan a QR code and attendance is auto-logged in seconds.

MVP focus: make attendance logging as close to one action as possible while preserving anti-proxy protections.

---

## 2) Problem (MVP Scope)

Residential colleges need to solve three immediate issues:

- Proxy/fake attendance
- Manual, slow event operations
- No instant visibility into attendance outcomes

---

## 3) MVP Goals

1. Enable a frictionless scan-to-log web flow with minimal user steps
2. Prevent basic proxy attendance with backend-verified rotating QR
3. Support check-in and check-out with attendance status computation
4. Give organisers a live dashboard during events
5. Auto-generate post-event summary and CSV export
6. Show students their attendance history and basic participation badges

---

## 4) MVP Non-Goals

- Native mobile app
- Complex recommendation engine
- Face verification, geofence, NFC
- Deep AI analytics
- Full offline-first support
- External SIS/LMS integrations

---

## 5) Users (MVP)

1. **Student**: logs in, scans QR, checks own attendance history
2. **Organiser**: creates event, runs live QR, monitors attendance, exports CSV
3. **Admin (light role)**: read-only access to event summaries

---

## 6) MVP Features

### 6.1 Student Features

- Login (Google auth with optional domain restriction)
- Smart scan link flow:
  - QR opens a deep link directly to active event + phase
  - if unauthenticated, user is prompted to login then resumes automatically
  - attendance is auto-submitted immediately after token validation (no extra form)
  - clear success/failure screen with timestamp and event name
- Optional fallback event list (upcoming + ongoing)
- Personal attendance history
- Basic badges/points summary

### 6.2 Organiser Features

- Create/edit/publish event
- Start check-in and check-out phases
- Show rotating QR (refresh every 30 seconds)
- Live dashboard:
  - total attended / expected
  - late arrivals
  - missing attendees
  - scans in last 30 seconds
  - suspicious duplicate attempts
- Attendance table + CSV export
- One-click event close to trigger summary

### 6.3 Backend Features

- Signed rotating token issuance (30s expiry)
- Scan validation endpoint
- Duplicate prevention (one scan per user per phase)
- Attendance status computation
- Summary aggregation on event close

---

## 7) Functional Requirements

### 7.1 Event Setup

Event fields required:

- title
- category
- venue
- start/end datetime
- check-in window
- check-out window

### 7.2 Rotating QR Security

- Backend issues signed token every 30 seconds
- Token includes: `eventId`, `phase`, `issuedAt`, `expiresAt`, `nonce`
- QR payload uses an app URL/deep link so scan can directly trigger logging flow
- Frontend displays token as QR only; cannot sign tokens

### 7.3 Frictionless Scan Journey

The default student journey must be:

1. user scans organiser QR
2. web app opens target route for event/phase
3. if needed, login occurs once and returns to same route
4. backend validates token and writes attendance automatically
5. user sees immediate confirmation (success or explicit failure reason)

No manual event search or separate submit action is required in the happy path.

### 7.4 Scan Validation Rules

Validation must check:

1. authenticated user
2. valid signature
3. token not expired
4. correct event + phase
5. scan inside active phase window
6. no duplicate scan for same user + phase

Rejected scans return explicit reason code.

### 7.5 Attendance Statuses

Derived per student per event:

- **Attended fully**
- **Late**
- **Left early**
- **Partial**
- **Absent**

### 7.6 Suspicious Attempt Flagging

MVP heuristic flags:

- repeated duplicate attempts from same account
- abnormal rapid retries

Flags are visible on organiser dashboard.

### 7.7 Post-Event Summary

Generated at event close with:

- attendance rate
- late percentage
- first-time attendees (within project dataset)
- busiest scan interval
- suspicious attempt count

---

## 8) Non-Functional Requirements (MVP)

- End-to-end scan-to-confirmation target: under 3 seconds on stable network
- Backend validation response target: under 2 seconds at hackathon load
- Realtime dashboard updates without refresh
- No accepted-scan data loss
- Firebase rules enforce role-based read/write
- Minimum PII storage; optional device hint must be hashed

---

## 9) MVP Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Firebase Cloud Functions
- **Database/Realtime:** Firestore + listeners
- **Auth:** Firebase Authentication (Google)
- **Hosting:** Firebase Hosting

---

## 10) Firestore Data Model (MVP)

- `users/{userId}`: role, profile, points, badges
- `events/{eventId}`: metadata, windows, organiserId, status
- `scans/{scanId}`: eventId, userId, phase, result, reason
- `attendance/{eventId_userId}`: checkInAt, checkOutAt, status
- `eventSummaries/{eventId}`: aggregate metrics

Critical writes (scan acceptance, attendance status, summary) are function-controlled.

---

## 11) MVP APIs / Functions

- `issueRotatingToken(eventId, phase)`
- `validateScan(token, eventId, phase)`
- `closeEvent(eventId)`

---

## 12) Acceptance Criteria (MVP)

1. Organiser can create and publish an event.
2. QR rotates every 30 seconds and expired tokens fail.
3. QR scan opens the web app directly to the correct event phase route.
4. Unauthenticated users can login and resume scan flow without rescanning.
5. Valid scan is auto-logged exactly once per phase (no manual submit required).
6. Duplicate scans are rejected with reason code.
7. Check-in/check-out produce correct final attendance status.
8. Live dashboard updates in real time.
9. CSV export downloads event attendance records.
10. Event close generates and stores summary metrics.
11. Student can view own attendance history and earned badges.

---

## 13) MVP Delivery Plan (Hackathon)

### Day 1

- Auth, role gating, event CRUD
- Firestore schema + security rules baseline

### Day 2

- Rotating token generation
- Scan validation + duplicate prevention
- Check-in/check-out storage

### Day 3

- Live organiser dashboard
- Attendance table + CSV export
- Event close + summary generation

### Day 4 (Polish)

- Student history + badges view
- Error handling, latency tuning, demo rehearsal

---

## 14) Demo Flow (MVP)

1. Organiser creates and starts an event.
2. QR rotates with visible 30s countdown.
3. Student scans QR and is routed directly into auto-log flow.
4. If login is needed, app returns to same scan route and completes logging automatically.
5. Duplicate attempt is rejected and flagged.
6. Check-out runs; final statuses update.
7. Organiser closes event; summary and CSV are generated.

---

## 15) Out of Scope After MVP

- Geofence / organiser Wi-Fi validation
- Face verification workflows
- NFC mode
- AI event insights
- Messaging integrations (Telegram/email reminders)
