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

### Setup

## 1. AUTOMATIC

- run start.bat (or start.sh on Linux)

## 2. Manual

# Backend

```bash
cd gitlearn-app/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8888
# → API running at http://localhost:8888
# → Docs at http://localhost:8888/docs
```

# Frontend

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


## Notes

- AI responses are cached in-process (per server restart) to avoid redundant API calls
- GitHub rate limit: 60 req/hr unauthenticated, 5000/hr with a token
- The AI analysis uses `claude-sonnet-4-5` for the best balance of quality and speed
- All three AI endpoints (learn/quiz/practice) accept the same `GenerateRequest` payload
