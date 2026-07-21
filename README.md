<div align="center">
  <h1>⚔️ ClashCode</h1>
  <p><strong>1v1 Live Coding Battles for Colleges</strong></p>

  <p>
    <a href="https://github.com/PraveenNPatil07/ClashCode/actions"><img src="https://img.shields.io/github/actions/workflow/status/PraveenNPatil07/ClashCode/test.yml?branch=main" alt="Build Status"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
  </p>
</div>

ClashCode is a real-time, competitive coding platform designed for university students. Represent your college, challenge rivals to 1v1 live programming battles, and solve AI-generated or curated algorithms faster than your opponent to climb the global leaderboard.

## ✨ Features

- **1v1 Live Battles**: Compete in real-time. Both players get the same problem and a shared timer.
- **Hidden Judge**: Submit your code and wait for the results. The first correct solution wins.
- **College Leaderboards**: Every victory earns points for your college, pushing them up the global rankings.
- **AI-Powered Practice**: Generate custom algorithms using AI to sharpen your skills before entering the arena.
- **Real-Time Presence**: See exactly who is online and ready to duel via WebSocket-powered lobbies.
- **Multi-Language Support**: Write solutions in Python, JavaScript, Java, or C++.

## 🏗️ Architecture & Tech Stack

ClashCode is built as a modern full-stack monorepo:

- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (via Supabase)
- **Real-time**: Socket.io
- **Testing**: Vitest (Unit) & Playwright (E2E)
- **Package Manager**: npm workspaces

### Project Structure

```text
clashcode/
├── frontend/      # React SPA and UI components
├── backend/       # Express API and WebSocket server
│   └── supabase/  # Database migrations and types
├── shared/        # Shared TypeScript interfaces and types
├── tests/         # Playwright end-to-end tests
└── package.json   # Workspace configuration
```

## 🚀 Getting Started

Follow these steps to run ClashCode locally.

### 1. Install Dependencies

From the root directory, install the workspace dependencies:

```bash
npm install
```

### 2. Environment Variables

Set up your `.env` files.

**Backend (`backend/.env`)**:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

**Frontend (`frontend/.env`)**:
```bash
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

### 3. Database Migration & Seeding

Ensure you have Supabase CLI installed, or use your hosted Supabase dashboard to run the migrations.

```bash
# Push the schema to your database
supabase db push

# Seed the database with mock colleges, users, and problems
npm run seed
```

### 4. Start the Application

Start both the backend and frontend development servers.

**Terminal 1 (Backend)**:
```bash
npm run dev:backend
```

**Terminal 2 (Frontend)**:
```bash
npm run dev:frontend
```

Open `http://localhost:5173` to view the application!

## 🧪 Testing

We use Vitest for unit testing and Playwright for End-to-End (E2E) testing.
Please see the [TESTING.md](TESTING.md) guide for comprehensive details on how to write and run tests.

## 🤝 Contributing

We welcome contributions from the community! Whether it's a bug fix, new feature, or documentation improvement, please read our [Contributing Guide](CONTRIBUTING.md) to get started. 

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
