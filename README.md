# 🏛️ Civic Buzz — AI-Powered Citizen Civic Intelligence Platform

[![GitHub Repository](https://img.shields.io/badge/GitHub-CIVIC--BUZZ-10b981?style=for-the-badge&logo=github)](https://github.com/shivanallela/CIVIC-BUZZ)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

> **Empowering Every Citizen's Voice into Action.**  
> Civic Buzz is an AI-assisted rural and civic governance platform that empowers citizens to report community hazards (potholes, live wires, water leaks, garbage accumulation) with automated AI Vision classification, GPS geotagging, real-time weather alerts, and regional mandi market crop pricing.

🌐 **Repository Link**: [https://github.com/shivanallela/CIVIC-BUZZ](https://github.com/shivanallela/CIVIC-BUZZ)

---

## 🌟 Key Features

### 📸 1. AI Vision Hazard Reporting
- Citizens can capture or upload photos of civic issues (broken roads, sparking wires, pipeline leaks).
- AI automatically detects hazard severity, assigns urgency levels, and identifies the responsible department.
- Automated 30-minute rapid SLA flagging for life-threatening emergencies (active fires, snapped live wires).

### 📍 2. Precise GPS Geotagging
- One-click browser geolocation detects latitude, longitude, ward, and village information.
- OpenStreetMap reverse geocoding provides accurate human-readable addresses.

### 🌦️ 3. Live Weather & Farm Advisories
- Live temperature, humidity, wind conditions, and a 7-day extended outlook tailored for rural farming communities.

### 🌾 4. Mandi Crop Rates & Village News
- Daily live market prices for key crops (Paddy, Cotton, Maize, Chana).
- Public community announcements and village health notices.

### 🛡️ 5. High-Availability Offline Fallback
- Backend automatically falls back to an embedded SQLite database (`inventory.db`) whenever remote cloud databases are unreachable or offline.

---

## 🚀 Quick Start

### ⚡ One-Click Startup (Windows)
Double-click [`run.bat`](run.bat) or execute in PowerShell:
```powershell
.\run.ps1
```
This automatically boots both the FastAPI backend on port `8000`, the Next.js frontend on port `3000`, and opens your default browser to [http://localhost:3000](http://localhost:3000).

---

### 🛠️ Manual Installation & Launch

#### 1. Clone the Repository
```bash
git clone https://github.com/shivanallela/CIVIC-BUZZ.git
cd CIVIC-BUZZ
```

#### 2. Backend Setup (FastAPI)
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
- **Backend API**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs)

#### 3. Frontend Setup (Next.js 16)
```bash
cd ../frontend
npm install
npm run dev
```
- **Citizen Portal**: [http://localhost:3000](http://localhost:3000)

---

## 🔐 Demo Credentials

| Role | Email / Identifier | Password | Access Level |
|---|---|---|---|
| **Rural Citizen / Villager** | `citizen@civic.gov.in` | `citizen123` | Full Citizen Portal & Reporting |

*Alternatively, click **"1-Click Citizen Portal Access"** on the landing page for immediate direct login.*

---

## 📁 Architecture & Project Structure

```
CIVIC-BUZZ/
├── backend/
│   ├── routers/
│   │   ├── complaints.py     # AI complaints & geocoding endpoints
│   │   └── demo.py           # Demo session endpoints
│   ├── db.py                 # SQLite database initialization & schema
│   ├── db_complaints.py      # Complaints data manager (Cloud + SQLite fallback)
│   ├── priority_engine.py    # 6-factor AI priority intelligence scoring
│   ├── main.py               # FastAPI application entry point
│   ├── requirements.txt      # Python dependencies
│   └── inventory.db          # Embedded local database
│
├── frontend/
│   ├── app/
│   │   ├── citizen/dashboard/# Citizen Portal main view & modules
│   │   ├── page.tsx          # Landing page & authentication gateway
│   │   ├── layout.tsx        # Root Next.js layout & typography
│   │   └── globals.css       # Design tokens & responsive styles
│   ├── components/           # UI components (CivicLogo, LoginForm, LanguageSelector)
│   ├── services/             # Frontend APIs (complaintsApi, weatherApi, demoSession)
│   ├── package.json          # Next.js dependencies & scripts
│   └── next.config.ts        # Next.js configuration
│
├── run.bat                   # 1-Click Windows batch launcher
├── run.ps1                   # 1-Click PowerShell launcher
└── README.md                 # Project documentation
```

---

## 🔗 Links & Resources

- **GitHub Repository**: [https://github.com/shivanallela/CIVIC-BUZZ](https://github.com/shivanallela/CIVIC-BUZZ)
- **Issue Tracker**: [https://github.com/shivanallela/CIVIC-BUZZ/issues](https://github.com/shivanallela/CIVIC-BUZZ/issues)
- **API Documentation**: [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs)
