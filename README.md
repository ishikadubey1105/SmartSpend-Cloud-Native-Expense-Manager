<div align="center">
  <img src="https://img.shields.io/badge/SmartSpend-Cloud%20Expense%20Manager-7c3aed?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0xIDE1aC0ydi02aDJ2NnptMC04aC0yVjdoMnYyeiIvPjwvc3ZnPg==" />
  <br/>
  <h1>💸 SmartSpend</h1>
  <p><strong>Cloud-Native Expense Manager · Full-Stack · AI-Powered · Production-Ready</strong></p>

  ![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
  ![Node.js](https://img.shields.io/badge/Node.js_20-339933?style=flat-square&logo=node.js&logoColor=white)
  ![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)
  ![Firebase](https://img.shields.io/badge/Firebase_Auth-FFCA28?style=flat-square&logo=firebase&logoColor=black)
  ![Gemini AI](https://img.shields.io/badge/Gemini_AI-886FBF?style=flat-square&logo=googlegemini&logoColor=white)
  ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
  ![Jest](https://img.shields.io/badge/Jest_Tests-C21325?style=flat-square&logo=jest&logoColor=white)
  ![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
</div>

---

## 🚀 What is SmartSpend?

**SmartSpend** is a production-grade, cloud-native personal finance application that helps users track expenses, analyze spending patterns, set per-category budgets, and receive AI-powered financial insights — all wrapped in a stunning glassmorphic dark-mode UI.

Built with industry best practices including input validation, rate limiting, structured logging, comprehensive testing, and CI/CD pipelines.

> 🎓 **PBL Project** — Cloud Native Expense Manager (March 2026)

---

## ✨ Key Features

### 💳 Expense Management
- Full CRUD with pagination, filtering, and full-text search
- Bulk delete, recurring expense tracking, and tag support
- AI auto-categorization powered by Google Gemini
- Anomaly detection (z-score flagging of unusual spending)

### 📊 Analytics & Visualization
- Interactive charts: Area, Bar, Donut, Daily breakdown (Recharts)
- 3-month rolling average trend lines
- Month-end spend prediction based on current pace
- Per-category stats: total, count, avg, max, min, std deviation
- Recurring vs. discretionary spending analysis

### 🎯 Smart Budgeting
- Per-category monthly budgets with configurable alert thresholds
- Real-time spent/remaining/usedPercent calculations
- Toast + banner alerts when budgets are approached or exceeded
- Budget reference lines on charts

### 🤖 AI-Powered Insights (Gemini 2.0 Flash)
- Personalized spending analysis using real user data
- AI auto-categorize expenses by title
- Budget health assessment with actionable recommendations
- Graceful fallback when API is unavailable

### 📄 Export & Reports
- CSV export with all expense fields
- Branded PDF reports with dynamic row heights, page breaks, and alternating rows
- Filtered exports (by category, date range)

### 🔐 Security & Production Readiness
- Firebase Authentication (Google OAuth + Email/Password)
- Backend token verification middleware
- Input validation on every route (express-validator)
- Mass assignment protection (explicit field whitelisting)
- Rate limiting: auth (20/15min), AI endpoints (5/min)
- Helmet security headers + strict CORS
- Winston structured logging (console + file rotation)
- Graceful shutdown on SIGTERM/SIGINT
- Environment variable validation at startup

### 📱 Responsive Design
- Premium glassmorphic dark theme with design system tokens
- Mobile: slide-in sidebar, bottom-sheet modals, hide secondary columns
- Tablet: optimized 220px sidebar, 2-column grids
- Skeleton loading screens on every page
- Smooth micro-animations and staggered entry effects

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite, Recharts, React Router v7, React Hot Toast |
| **Backend** | Node.js 20, Express.js, Mongoose ODM |
| **Database** | MongoDB Atlas (connection pooling, heartbeat, retry) |
| **Auth** | Firebase Authentication (Google + Email) |
| **AI** | Google Gemini 2.0 Flash (via HTTPS proxy) |
| **Testing** | Jest + Supertest (25 API tests with mocked auth) |
| **Logging** | Winston (console + error.log + combined.log) |
| **Validation** | express-validator, express-async-errors |
| **Security** | Helmet, CORS, express-rate-limit |
| **DevOps** | Docker, docker-compose, GitHub Actions CI/CD |
| **Cloud** | Vercel (frontend), Render (backend), MongoDB Atlas |
| **PWA** | vite-plugin-pwa + Workbox service worker |

---

## 📁 Project Structure

```
SmartSpend/
├── client/                       # React + Vite frontend
│   ├── src/
│   │   ├── components/           # Layout (responsive sidebar + topbar)
│   │   ├── context/              # AuthContext (Firebase)
│   │   ├── pages/                # Dashboard, Expenses, Analytics, Budget, Settings, Insights
│   │   ├── services/             # API client (Axios + Firebase token interceptor)
│   │   └── config/               # Firebase client config
│   ├── Dockerfile
│   └── nginx.conf
├── server/                       # Node.js + Express backend
│   ├── controllers/              # expense, budget, analytics, export, user, insights
│   ├── models/                   # Mongoose schemas (User, Expense, Budget)
│   ├── routes/                   # REST API routes (6 route files)
│   ├── middleware/               # Firebase auth + express-validator rules
│   ├── config/                   # DB, Firebase Admin, Winston logger
│   ├── tests/                    # Jest API test suite
│   ├── logs/                     # Winston log output (gitignored)
│   └── Dockerfile
├── .github/workflows/
│   └── deploy.yml                # CI/CD: lint → test → build → deploy
├── SmartSpend.postman_collection.json  # Complete API documentation (22 endpoints)
├── docker-compose.yml
└── .gitignore
```

---

## ⚙️ Local Setup

### Prerequisites
- Node.js 20+ and npm
- MongoDB Atlas account (free tier works)
- Firebase project with Authentication enabled
- (Optional) Gemini API key for AI features

### 1. Clone
```bash
git clone https://github.com/ishikadubey1105/SmartSpend-Cloud-Native-Expense-Manager.git
cd SmartSpend-Cloud-Native-Expense-Manager
```

### 2. Configure Environment

**Server** — copy `server/.env.example` → `server/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/smartspend
FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=your-gemini-key          # Optional — AI features degrade gracefully
LOG_LEVEL=info
```

**Client** — create `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Install & Run
```bash
# Backend
cd server && npm install && npm run dev

# Frontend (new terminal)
cd client && npm install && npm run dev
```

App runs at **http://localhost:5173**

### 4. Run Tests
```bash
cd server && npm test
```

---

## 🐳 Docker

```bash
docker-compose up --build
# App available at http://localhost
```

---

## 🔌 API Reference (22 Endpoints)

> 📬 Full Postman collection included: `SmartSpend.postman_collection.json`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET`    | `/api/health`               | Health check + version          | ❌ |
| `POST`   | `/api/users/sync`           | Sync Firebase user to MongoDB   | ✅ |
| `GET`    | `/api/users/me`             | Get current user profile        | ✅ |
| `PUT`    | `/api/users/me`             | Update profile & budget         | ✅ |
| `GET`    | `/api/expenses`             | Paginated list with filters     | ✅ |
| `POST`   | `/api/expenses`             | Create + budget alert check     | ✅ |
| `PUT`    | `/api/expenses/:id`         | Update (whitelist-protected)    | ✅ |
| `DELETE` | `/api/expenses/:id`         | Delete single expense           | ✅ |
| `DELETE` | `/api/expenses/bulk`        | Bulk delete by IDs              | ✅ |
| `GET`    | `/api/expenses/anomalies`   | Z-score anomaly detection       | ✅ |
| `GET`    | `/api/analytics/summary`    | Dashboard + prediction          | ✅ |
| `GET`    | `/api/analytics/trends`     | 12-month trend + rolling avg    | ✅ |
| `GET`    | `/api/analytics/categories` | Category stats + std deviation  | ✅ |
| `GET`    | `/api/analytics/daily`      | Daily spending breakdown        | ✅ |
| `GET`    | `/api/analytics/payment-methods` | Payment method distribution | ✅ |
| `GET`    | `/api/analytics/recurring`  | Recurring vs discretionary      | ✅ |
| `GET`    | `/api/budgets`              | Budgets with real-time spent    | ✅ |
| `POST`   | `/api/budgets`              | Create/update budget (upsert)   | ✅ |
| `DELETE` | `/api/budgets/:id`          | Delete budget                   | ✅ |
| `GET`    | `/api/export/csv`           | Download CSV                    | ✅ |
| `GET`    | `/api/export/pdf`           | Download branded PDF            | ✅ |
| `GET`    | `/api/insights`             | AI spending analysis (Gemini)   | ✅ |
| `POST`   | `/api/insights/categorize`  | AI auto-categorize expense      | ✅ |

---

## 🧪 Testing

| Category | Tests | Coverage |
|----------|-------|----------|
| Health check | ✅ | API reachability |
| Expense CRUD | ✅ | Create, read, update, delete with validation |
| Input validation | ✅ | 422 for invalid title, amount, date, category |
| Bulk operations | ✅ | Multi-delete with ownership check |
| Export | ✅ | CSV/PDF content-type verification |
| Analytics | ✅ | Summary shape, prediction, rolling average |
| Ownership | ✅ | Cross-user access prevention |
| 404 handling | ✅ | Unknown routes return JSON error |

```bash
cd server && npm test        # Run all tests
cd server && npm run test:watch  # Watch mode
```

---

## 📊 Architecture

```
                    ┌──────────────────────┐
                    │    User (Browser)     │
                    └──────────┬───────────┘
                               │ HTTPS
                    ┌──────────▼───────────┐
                    │  React Frontend (PWA) │ ← Vercel
                    │  Vite + Recharts      │
                    └──────────┬───────────┘
                               │ REST API + Firebase Token
                    ┌──────────▼───────────┐
                    │  Node.js + Express    │ ← Render
                    │  Firebase Auth Verify │
                    │  Gemini AI Proxy      │
                    │  Winston Logger       │
                    └──────┬────────┬──────┘
                           │        │
              ┌────────────▼┐  ┌────▼────────────┐
              │ MongoDB Atlas│  │ Google Gemini AI │
              │  (Mongoose)  │  │  (2.0 Flash)     │
              └─────────────┘  └─────────────────┘

 CI/CD: GitHub Actions → Docker Hub → Render + Vercel
```

---

## 🔐 Security Highlights

| Layer | Implementation |
|-------|---------------|
| **Authentication** | Firebase token verification on every protected route |
| **Input Validation** | express-validator with unified 422 error responses |
| **Mass Assignment** | Explicit field whitelisting on create/update |
| **Rate Limiting** | Auth: 20 req/15min · AI: 5 req/min · General: 100 req/15min |
| **Headers** | Helmet with strict CSP, HSTS, X-Frame-Options |
| **CORS** | Whitelist-based origin checking with credentials |
| **Logging** | Winston structured logs (never logs secrets) |
| **Startup** | Crashes immediately if required env vars are missing |
| **Shutdown** | Graceful SIGTERM/SIGINT with DB connection cleanup |

---

## 🎓 PBL Project Info

> **Project:** SmartSpend — Cloud Native Expense Manager
> **Timeline:** March 2 – March 31, 2026
> **Phase:** Week 1–2 (Development) → Week 3 (Deployment) → Week 4 (Testing + Presentation)

---

<div align="center">
  <br/>
  <strong>Built with ❤️ by Ishika Dubey</strong>
  <br/>
  SmartSpend PBL Project 2026
  <br/><br/>
  <a href="https://github.com/ishikadubey1105/SmartSpend-Cloud-Native-Expense-Manager">⭐ Star this repo</a> · <a href="https://github.com/ishikadubey1105/SmartSpend-Cloud-Native-Expense-Manager/issues">🐛 Report Bug</a>
</div>
