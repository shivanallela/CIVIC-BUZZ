# CivicLink — AI-Powered Civic Issue Reporter

A full-stack web app for reporting and managing civic infrastructure issues, with AI-powered issue detection.

## 🚀 Quick Start on Replit

### Step 1: Upload these files to Replit
Replace all files in your Replit project with the files from this folder.

### Step 2: Set Replit Secrets (Environment Variables)
Go to **Secrets** tab in Replit and add:
```
SESSION_SECRET = any-random-string-here-change-this
OPENAI_API_KEY = sk-... (your OpenAI key — optional but recommended)
FRONTEND_URL = https://your-replit-app.replit.app
```

### Step 3: Build the Frontend
In Replit Shell:
```bash
cd frontend
npm install
npm run build
```

### Step 4: Start the Backend
The `.replit` file is already configured. Click **Run** or:
```bash
cd backend
npm install
node server.js
```

---

## 🔐 Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Resident | alice | user123 |
| Resident | bob | user123 |
| City Employee | emp01 | emp123 |
| City Employee | emp02 | emp123 |

---

## ✅ What Was Fixed

### 1. Authentication (CRITICAL FIX)
- **Was broken because:** Users stored in memory reset on every Replit sleep
- **Fixed:** Users now stored in `backend/data/users.json` (persistent)
- **Also fixed:** Passwords now hashed with bcrypt (secure)
- **Also fixed:** Sessions now stored in files (`backend/sessions/`), survive restarts

### 2. Session Management
- **Was broken:** Sessions were in-memory, cleared on sleep
- **Fixed:** `session-file-store` keeps sessions in files for 24 hours

### 3. Image Upload
- Proper multer setup with file type validation
- Supports JPEG, PNG, WEBP, GIF, HEIC
- Max 10MB file size

### 4. AI Issue Detection (NEW)
- Upload a photo → AI (GPT-4o Vision) classifies the issue automatically
- Returns: issue type, description, severity, suggested action
- Works without API key (falls back to manual classification)

### 5. Location from EXIF (NEW)
- GPS coordinates extracted from photo EXIF metadata automatically
- Free reverse geocoding via OpenStreetMap Nominatim (no API key needed)
- Falls back to manual location input if no GPS in photo

### 6. Persistent Report Storage (NEW)
- Reports saved to `backend/data/reports.json`
- Survive server restarts/Replit sleep

### 7. Error Handling
- Clear error messages on login failure
- Validation for all form fields
- Graceful fallbacks for AI/location failures

---

## 📁 Project Structure

```
├── backend/
│   ├── server.js           # Express server (fixed)
│   ├── routes/
│   │   ├── auth.js         # Login/register/logout (FIXED)
│   │   └── reports.js      # Report CRUD + AI analysis
│   ├── utils/
│   │   ├── aiAnalysis.js   # OpenAI Vision API
│   │   └── exifLocation.js # GPS extraction + geocoding
│   ├── data/
│   │   ├── users.json      # Persistent user store
│   │   └── reports.json    # Persistent reports store
│   ├── uploads/            # Uploaded images
│   └── sessions/           # Session files
├── frontend/
│   ├── src/
│   │   ├── pages/          # All page components
│   │   ├── components/     # Shared components
│   │   ├── context/        # Auth context
│   │   ├── api.js          # API helper
│   │   └── index.css       # Global styles
│   └── dist/               # Built frontend (run npm run build)
└── .replit                 # Replit config
```

---

## 🤖 AI Setup (Optional but Recommended)

1. Get an API key from https://platform.openai.com/api-keys
2. Add it as `OPENAI_API_KEY` in Replit Secrets
3. The app will automatically use GPT-4o Vision to classify issues

**Without an API key:** The app still works — users just classify issues manually.

---

## 🔧 Development (Local)

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your values
npm install
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173, Backend on http://localhost:3001
