# Attendify: Smart Campus Engagement Platform

Attendify is a smart campus engagement platform that makes event attendance fast, secure, and measurable. It helps organisers run smoother events with live attendance visibility and helps students check in with a frictionless scan flow.

**Live Demo**: [https://attendify-bf098.web.app](https://attendify-bf098.web.app)

## Problem Statement

Residential college event management faces three critical pain points:

- **Slow Attendance Processing**: Manual or manual-adjacent check-in systems waste valuable event time and create bottlenecks
- **Proxy Sign-ins & Gaming**: Traditional attendance methods (sign sheets, static codes) are easily exploited through proxy attendance
- **Poor Post-Event Analytics**: Organisers lack real-time visibility and struggle to extract meaningful attendance insights

## The Solution

Attendify replaces manual attendance with a secure, real-time scan-based system that focuses on **scan once, verify instantly, surface insights immediately**.

- **Instant Check-in**: Students scan a rotating QR code for one-step attendance verification
- **Anti-Proxy Protections**: Frequently rotating QR codes, signed scan tokens, and duplicate prevention eliminate proxy abuse
- **Live Organiser Dashboard**: Real-time attendance updates, suspicious activity flagging, and instant CSV export
- **Student Engagement**: Attendance history, personal engagement tracking, and achievement badges

## Core Flow

1. **Organiser initiates check-in** → Event state changes to "ongoing"
2. **Live QR code generation** → Backend rotates a signed token every few seconds
3. **Student scans** → Frontend validates token signature and sends scan request
4. **Backend verification** → Checks token expiry, duplicate attempts, and user auth status
5. **Instant confirmation** → Student receives success/error, organiser sees real-time update
6. **Export & Analysis** → Organiser downloads attendance CSV after event

## Tech Stack

**Frontend**
- React 19 + TypeScript + Vite
- Responsive UI and real-time QR code rotation
- Tailwind CSS

**Backend**
- Express + TypeScript
- JWT token generation and validation
- Cryptographic signed scan token verification

**Database**
- Firebase Firestore (NoSQL) for event, attendance, and user data

## Local Development

### Prerequisites

- Node.js 18+
- A Google Firebase Account

### 1) Set up Firebase

1. Create a new project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore Database** (start in test mode for development).
3. Register a Web App in your Firebase project settings to get your Firebase configuration keys.

### 2) Environment Variables

Create a single `.env` file at the root of the project bridging both frontend and backend environments:

```env
# Frontend API and App URLs
VITE_API_URL=http://localhost:3001/api
APP_URL=http://localhost:5173

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Backend Configuration
PORT=3001
JWT_SECRET=your_secure_development_secret
```

*Note: The backend retrieves Firebase environment variables from the root `.env` as well.*

### 3) Install dependencies

In the root directory, install frontend and backend dependencies:

```bash
npm install
cd server && npm install && cd ..
```

### 4) Run Backend Server

Open a new terminal:

```bash
cd server
npm run dev
```

The backend server runs on `http://localhost:3001`. (Health check: `http://localhost:3001/api/health`)

### 5) Run Frontend Application

Open another terminal:

```bash
npm run dev
```

The frontend runs on `http://localhost:5173`.

## Deployment

- **Frontend**: Designed to deploy seamlessly on platforms like Vercel or Netlify. When deploying to Vercel, `vercel.json` rewrites all routes to `index.html` for SPA routing. Set all frontend-related environment variables (`VITE_*`) on your hosting platform.
- **Backend**: Can be deployed to services like Render, Heroku or Railway. Ensure `PORT`, `JWT_SECRET`, and `APP_URL` are aligned.
- Point the production frontend `VITE_API_URL` to your live deployed backend URL securely.
