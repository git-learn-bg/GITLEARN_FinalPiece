# GitLearn — AI-Powered Learning Platform

Learn from real GitHub repositories. AI generates structured courses, quizzes, and coding exercises from actual source code.

## Architecture

```
gitlearn-app/
├── backend/              ← FastAPI (Python)
│   ├── main.py           ← All API routes
│   ├── requirements.txt
│   ├── .env.example
│   └── start.sh
└── frontend/             ← React + Vite
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   ├── pages/
    │   │   ├── Home.jsx          ← Search + repo grid
    │   │   ├── LearnPage.jsx     ← FreeCodeCamp-style course
    │   │   ├── QuizPage.jsx      ← Interactive quiz
    │   │   └── PracticePage.jsx  ← Coding exercises
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── RepoCard.jsx
    │   │   ├── PreviewModal.jsx  ← VS Code-style preview
    │   │   ├── FileTree.jsx      ← Explorer sidebar
    │   │   └── CodeViewer.jsx    ← Syntax-highlighted code
    │   ├── services/api.js
    │   └── styles/globals.css
    ├── package.json
    ├── vite.config.js
    └── index.html
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- Anthropic API key → https://console.anthropic.com/
- GitHub Personal Access Token (optional, but removes rate limits) → https://github.com/settings/tokens

## Setup

### 1. Backend

```bash
cd gitlearn-app/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your keys:
#   ANTHROPIC_API_KEY=sk-ant-api03-...
#   GITHUB_TOKEN=ghp_...        (optional but recommended)

# Start the server
bash start.sh
# → API running at http://localhost:8000
# → Docs at http://localhost:8000/docs
```

### 2. Frontend

```bash
cd gitlearn-app/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# → App running at http://localhost:3000
```

Open **http://localhost:3000** in your browser.

## Features

| Feature | Description |
|---------|-------------|
| 🔍 **GitHub Search** | Search any public repository by name or keyword |
| 🗂 **File Explorer** | VS Code-style tree with syntax-highlighted code preview |
| 📚 **Learn** | AI-generated 5-section course from the repo's README + code |
| 📝 **Quiz** | 8 context-aware multiple-choice questions with explanations |
| 💻 **Practice** | 7 coding exercises (Easy → Medium → Hard) with hints & solutions |

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/search?q=...&lang=...` | Search GitHub repositories |
| GET | `/api/repo/{owner}/{repo}/readme` | Fetch README content |
| GET | `/api/repo/{owner}/{repo}/tree` | Get file tree |
| GET | `/api/repo/{owner}/{repo}/file?path=...` | Get file content |
| POST | `/api/generate/learn` | Generate learning course (AI) |
| POST | `/api/generate/quiz` | Generate quiz questions (AI) |
| POST | `/api/generate/practice` | Generate coding exercises (AI) |

## Routes

| Path | Description |
|------|-------------|
| `/` | Home — search and repo cards |
| `/learn/:owner/:repo` | Full course page |
| `/quiz/:owner/:repo` | Quiz page |
| `/practice/:owner/:repo` | Practice exercises |

## Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-api03-...   # Required for AI generation
GITHUB_TOKEN=ghp_...                  # Optional — increases rate limit from 60 to 5000 req/hr
```

## Production Build

```bash
# Build frontend
cd frontend && npm run build

# Serve static files from FastAPI
# Copy the contents of dist/ to a static hosting service
# or configure FastAPI to serve them
```

## Notes

- AI responses are cached in-process (per server restart) to avoid redundant API calls
- GitHub rate limit: 60 req/hr unauthenticated, 5000/hr with a token
- The AI analysis uses `claude-sonnet-4-5` for the best balance of quality and speed
- All three AI endpoints (learn/quiz/practice) accept the same `GenerateRequest` payload
