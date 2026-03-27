<div align="center">
  <img src="https://img.shields.io/badge/SmartSpend-Cloud%20Expense%20Manager-7c3aed?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0xIDE1aC0ydi02aDJ2NnptMC04aC0yVjdoMnYyeiIvPjwvc3ZnPg==" />
  <br/>
  <h1>💸 SmartSpend</h1>
  <p><strong>Cloud-Native Expense Manager · Full-Stack · AI-Powered · Production-Ready</strong></p>

  ![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
  ![Python](https://img.shields.io/badge/Python_3.12-3776AB?style=flat-square&logo=python&logoColor=white)
  ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
  ![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)
  ![Firebase](https://img.shields.io/badge/Firebase_Auth-FFCA28?style=flat-square&logo=firebase&logoColor=black)
  ![Gemini AI](https://img.shields.io/badge/Gemini_AI-886FBF?style=flat-square&logo=googlegemini&logoColor=white)
  ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
</div>

---

## 🚀 What is SmartSpend?

**SmartSpend** is a production-grade, cloud-native personal finance application designed for the AIML/Data Science era. It helps users track expenses, analyze spending patterns, and receive hyper-personalized financial advice through a conversational AI grounded in their real financial data.

Built with a **Python/FastAPI** backbone and a stunning glassmorphic **React** frontend, it implements industry best practices including async database IO, Firebase identity verification, and statistical anomaly detection.

> 🎓 **PBL Project** — Cloud Native Expense Manager (March 2026)

---

## ✨ Key Features

### 🤖 AIML-Powered Intelligence (Gemini 2.0 Flash)
- **Conversational Chat**: A financial advisor that knows your history. Ask "Can I afford a new laptop?" or "Where did my money go this week?" 
- **AI Auto-Categorization**: Automatic labeling of transactions based on intent.
- **Spending Insights**: Deep-dive analysis of patterns with actionable savings tips.
- **Anomaly Detection**: Statistical Z-Score flagging of unusual spending spikes.
- **Vision OCR**: Real-time receipt scanning to auto-fill expense forms.

### 📊 Analytics & Visualization
- Interactive charts: Area, Bar, Donut, Daily breakdown (Recharts).
- 3-month rolling average trend lines and month-end spend predictions.
- Comprehensive category analytics (avg, max, min, std deviation).

### 🎯 Smart Budgeting
- Per-category monthly budgets with configurable alert thresholds.
- Real-time tracking with Toast + Banner alerts for budget health.

### 📄 Export & Reports
- CSV and Branded PDF report generation.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite, Framer Motion, Recharts, React Router v7 |
| **Backend** | Python 3.12, FastAPI, Pydantic v2 |
| **Database** | MongoDB Atlas (Motor Async Driver) |
| **Auth** | Firebase Authentication (Admin SDK) |
| **AI** | Google Gemini 2.0 Flash (Vision + Chat) |
| **Logging** | Python Logging (standard) |
| **Security** | CORS, Firebase ID Token Verification, Rate Limiting |

---

## 📁 Project Structure

```
SmartSpend/
├── backend/                      # Python/FastAPI backend (Current)
│   ├── app/
│   │   ├── api/                  # FastAPI routers (Expenses, AI, Analytics)
│   │   ├── core/                 # Config, Database (Motor), Firebase Auth
│   │   ├── models/               # Pydantic models (Schemas)
│   │   └── services/             # Gemini AI, OCR, Insights logic
│   ├── requirements.txt          # Python dependencies
│   └── main.py                   # Entry point
├── client/                       # React + Vite frontend
│   ├── src/
│   │   ├── components/           # UI, Skeletons, Layout, ErrorBoundaries
│   │   ├── pages/                # Dashboard, Chat, Analytics, etc.
│   │   ├── services/             # Axios API client
│   │   └── hooks/                # Custom logic (useDebounce, etc.)
│   └── vite.config.js
├── server/                       # Node.js backend (Legacy)
└── README.md
```

---

## ⚙️ Local Setup

### 1. Configure Environment

**Backend** — copy `backend/.env.example` to `backend/.env`:
```env
MONGODB_URI=mongodb+srv://...
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY="..."
FIREBASE_CLIENT_EMAIL=...
GEMINI_API_KEY=...
```

**Frontend** — update `client/.env`:
```env
VITE_API_URL=http://localhost:8000/api
```

### 2. Run the App

```bash
# Backend (Python 3.12+)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd client
npm install
npm run dev
```

---

## 📊 Architecture

```
                    ┌──────────────────────┐
                    │    User (Browser)     │
                    └──────────┬───────────┘
                               │ HTTPS
                    ┌──────────▼───────────┐
                    │  React Frontend (SPA) │ ← Modern UX
                    │  Vite + Framer Motion │
                    └──────────┬───────────┘
                               │ REST API + Firebase Token
                    ┌──────────▼───────────┐
                    │  FastAPI (Python)     │ ← Async I/O
                    │  Firebase Auth Verify │
                    │  Gemini AI Core       │
                    └──────┬────────┬──────┘
                           │        │
               ┌────────────▼┐  ┌────▼────────────┐
               │ MongoDB Atlas│  │ Google Gemini AI │
               │   (Motor)    │  │  (2.0 Flash)     │
               └─────────────┘  └─────────────────┘
```

---

<div align="center">
  <br/>
  <strong>Built with by Ishika Dubey</strong>
  <br/>
  SmartSpend PBL Project 2026 — AIML Edition
</div>
