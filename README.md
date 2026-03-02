<div align="center">
  <img src="https://img.shields.io/badge/SmartSpend-Cloud%20Expense%20Manager-7c3aed?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0xIDE1aC0ydi02aDJ2NnptMC04aC0yVjdoMnYyeiIvPjwvc3ZnPg==" />
  <br/>
  <h1>💸 SmartSpend</h1>
  <p><strong>Cloud-Native Expense Manager · React · Node.js · MongoDB · Firebase · Docker</strong></p>

  ![CI/CD](https://img.shields.io/github/actions/workflow/status/YOUR_USERNAME/SmartSpend/deploy.yml?label=CI%2FCD&style=flat-square)
  ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
  ![Node](https://img.shields.io/badge/node-20.x-brightgreen?style=flat-square&logo=node.js)
  ![React](https://img.shields.io/badge/react-19-blue?style=flat-square&logo=react)
  ![Docker](https://img.shields.io/badge/docker-ready-blue?style=flat-square&logo=docker)
</div>

---

## 🚀 Overview

**SmartSpend** is a production-grade, cloud-native personal expense management web application built as a PBL (Project-Based Learning) project. It features real-time analytics, AI-powered budget alerts, multi-format exports, and a stunning dark-mode UI.

> **Live Demo:** [smartspend.vercel.app](https://smartspend.vercel.app)  
> **API:** [smartspend-api.render.com](https://smartspend-api.render.com/api/health)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Auth** | Firebase Google OAuth + Email/Password |
| 💳 **Expense CRUD** | Add, edit, delete, bulk-delete with filters & pagination |
| 📊 **Analytics** | Area/Bar/Donut charts — trends, categories, payment methods, daily |
| 🎯 **Budget Alerts** | Per-category limits with configurable threshold alerts |
| 📄 **Export** | Download expenses as **CSV** or styled **PDF** |
| 📱 **PWA** | Installable on mobile & desktop with offline caching |
| 🐳 **Docker** | Multi-stage Dockerfile for server & client |
| ⚡ **CI/CD** | GitHub Actions → Docker Hub → Render + Vercel auto-deploy |
| 🔔 **Smart Alerts** | Real-time toast banner when budget threshold hit |
| 🌙 **Dark Mode** | Premium deep-space dark theme with glassmorphism |

---

## 🛠️ Tech Stack

```
Frontend:  React 19 + Vite + Recharts + React Router v7 + Firebase Auth
Backend:   Node.js + Express.js + MongoDB Atlas (Mongoose)
Auth:      Firebase Authentication (Google + Email)
Cloud:     Vercel (frontend) · Render (backend) · MongoDB Atlas (DB)
DevOps:    Docker · docker-compose · GitHub Actions CI/CD
PWA:       vite-plugin-pwa + Workbox service worker
```

---

## 📁 Project Structure

```
SmartSpend/
├── client/                   # React + Vite frontend
│   ├── src/
│   │   ├── components/       # Layout, reusable UI
│   │   ├── context/          # AuthContext (Firebase)
│   │   ├── pages/            # Dashboard, Expenses, Analytics, Budget, Settings
│   │   ├── services/         # API client (Axios + Firebase token)
│   │   └── config/           # Firebase config
│   ├── Dockerfile
│   └── nginx.conf
├── server/                   # Node.js + Express backend
│   ├── controllers/          # expense, budget, analytics, export, user
│   ├── models/               # Mongoose schemas (User, Expense, Budget)
│   ├── routes/               # REST API routes
│   ├── middleware/           # Firebase auth middleware
│   ├── config/               # DB + Firebase Admin config
│   └── Dockerfile
├── .github/workflows/
│   └── deploy.yml            # CI/CD pipeline
├── docker-compose.yml
└── .gitignore
```

---

## ⚙️ Local Setup

### Prerequisites
- Node.js 20+
- MongoDB Atlas account
- Firebase project (Auth enabled)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/SmartSpend.git
cd SmartSpend
```

### 2. Configure Environment

**Server** — copy `.env.example` → `.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/smartspend
JWT_SECRET=your_secret
CLIENT_URL=http://localhost:5173
FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
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

---

## 🐳 Docker

```bash
# Build & run full stack
docker-compose up --build

# App available at http://localhost
```

---

## 🔌 API Reference

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET`  | `/api/health` | Health check | ❌ |
| `POST` | `/api/users/sync` | Sync Firebase user | ✅ |
| `GET`  | `/api/expenses` | List expenses (paginated, filtered) | ✅ |
| `POST` | `/api/expenses` | Create expense + budget check | ✅ |
| `PUT`  | `/api/expenses/:id` | Update expense | ✅ |
| `DELETE` | `/api/expenses/:id` | Delete expense | ✅ |
| `GET`  | `/api/analytics/summary` | Dashboard summary | ✅ |
| `GET`  | `/api/analytics/trends` | 12-month trend | ✅ |
| `GET`  | `/api/analytics/categories` | Category breakdown | ✅ |
| `POST` | `/api/budgets` | Set/update budget | ✅ |
| `GET`  | `/api/export/csv` | Download CSV | ✅ |
| `GET`  | `/api/export/pdf` | Download PDF report | ✅ |

---

## 🔐 GitHub Actions Secrets Required

| Secret | Value |
|--------|-------|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `RENDER_DEPLOY_HOOK_URL` | Render deploy hook URL |
| `VERCEL_TOKEN` | Vercel personal access token |
| `VITE_API_URL` | Production API URL |
| `VITE_FIREBASE_API_KEY` | Firebase API key |

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
                    │  CRUD + Analytics     │
                    └──────────┬───────────┘
                               │ Mongoose ODM
                    ┌──────────▼───────────┐
                    │   MongoDB Atlas       │ ← Cloud DB
                    └──────────────────────┘

 CI/CD: GitHub Actions → Docker Hub → Render + Vercel
```

---

## 🎓 PBL Project Info

> **Project:** SmartSpend — Cloud Native Expense Manager  
> **Timeline:** March 2 – March 31, 2026  
> **Phase:** Week 1–2 (Development) → Week 3 (Deployment) → Week 4 (Testing + Presentation)

---

<div align="center">
  Made with ❤️ · SmartSpend PBL Project 2026
</div>
