"""
GitLearn AI Backend — FastAPI
Serves GitHub data and AI-generated learning content via Anthropic Claude.
"""
import os, base64, json, asyncio
from typing import Optional
from fastapi import FastAPI, HTTPException, Query, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
from pydantic import BaseModel
import anthropic

app = FastAPI(title="GitLearn API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Config ────────────────────────────────────────────────
GITHUB_TOKEN  = os.getenv("GITHUB_TOKEN", "")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GH_HEADERS    = {"Authorization": f"token {GITHUB_TOKEN}", "Accept": "application/vnd.github.v3+json"} if GITHUB_TOKEN else {"Accept": "application/vnd.github.v3+json"}

_ai_cache: dict = {}          # simple in-process cache


# ─── Models ────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    owner:       str
    repo:        str
    readme:      str
    description: Optional[str] = ""
    language:    Optional[str] = ""
    topics:      Optional[list] = []


# ─── GitHub helpers ────────────────────────────────────────
async def gh_get(url: str) -> dict | list:
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.get(url, headers=GH_HEADERS)
        if resp.status_code == 403:
            raise HTTPException(429, "GitHub rate-limit exceeded. Set GITHUB_TOKEN env var.")
        if resp.status_code == 404:
            raise HTTPException(404, f"GitHub resource not found: {url}")
        resp.raise_for_status()
        return resp.json()


# ─── GitHub Endpoints ──────────────────────────────────────
@app.get("/api/search")
async def search_repos(
    q:        str = Query(..., min_length=1),
    lang:     str = Query("", alias="lang"),
    page:     int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=30),
):
    query = q
    if lang:
        query += f" language:{lang}"
    query += " stars:>50 is:public"
    url = (
        f"https://api.github.com/search/repositories"
        f"?q={query}&sort=stars&order=desc&page={page}&per_page={per_page}"
    )
    data = await gh_get(url)
    items = data.get("items", [])
    return {
        "total_count": data.get("total_count", 0),
        "items": [
            {
                "id":          r["id"],
                "full_name":   r["full_name"],
                "owner":       r["owner"]["login"],
                "repo":        r["name"],
                "description": r.get("description") or "",
                "stars":       r["stargazers_count"],
                "forks":       r["forks_count"],
                "language":    r.get("language") or "Unknown",
                "topics":      r.get("topics", []),
                "html_url":    r["html_url"],
                "pushed_at":   r.get("pushed_at", ""),
            }
            for r in items
        ],
    }

_recommended_cache = {}
_RECOMMENDED_CACHE_TTL = 3600  # 1 hour

async def fetch_recommended_repos(page: int) -> list[dict]:
    url = f"https://api.github.com/search/repositories?q=stars:>1000+is:public&sort=stars&order=desc&page={page}&per_page=20"
    data = await gh_get(url)
    items = data.get("items", [])
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "owner": r["owner"]["login"],
            "description": r.get("description") or "",
            "stars": r["stargazers_count"],
            "forks": r["forks_count"],
            "language": r.get("language") or "Unknown",
            "url": r["html_url"],
        }
        for r in items
    ]

async def _prefetch_next_page(next_page: int):
    import time
    now = time.time()
    if next_page not in _recommended_cache:
        try:
            repos = await fetch_recommended_repos(next_page)
            _recommended_cache[next_page] = (repos, now)
        except Exception:
            pass

@app.get("/api/repos/recommended")
async def get_recommended_repos(background_tasks: BackgroundTasks, page: int = Query(1, ge=1)):
    import time
    now = time.time()
    
    # Fire off background prefetch for the next page
    background_tasks.add_task(_prefetch_next_page, page + 1)
    
    if page in _recommended_cache:
        cached_data, timestamp = _recommended_cache[page]
        if now - timestamp < _RECOMMENDED_CACHE_TTL:
            return {"page": page, "items": cached_data}
            
    repos = await fetch_recommended_repos(page)
    _recommended_cache[page] = (repos, now)
    return {"page": page, "items": repos}



@app.get("/api/repo/{owner}/{repo}/readme")
async def get_readme(owner: str, repo: str):
    try:
        data = await gh_get(f"https://api.github.com/repos/{owner}/{repo}/readme")
        content = base64.b64decode(data["content"]).decode("utf-8", errors="replace")
        return {"content": content, "path": data.get("path", "README.md")}
    except HTTPException:
        return {"content": "", "path": "README.md"}


@app.get("/api/repo/{owner}/{repo}/tree")
async def get_file_tree(owner: str, repo: str):
    """Return recursive file tree (top 200 files, filtered to useful extensions)."""
    SHOW_EXTS = {
        ".py", ".js", ".ts", ".jsx", ".tsx", ".go", ".rs", ".java",
        ".cpp", ".c", ".h", ".cs", ".rb", ".php", ".swift", ".kt",
        ".md", ".json", ".yaml", ".yml", ".toml", ".env.example",
        ".sh", ".dockerfile", "dockerfile", ".html", ".css", ".scss",
        ".vue", ".svelte", ".sql", ".graphql",
    }
    try:
        data = await gh_get(
            f"https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1"
        )
        tree = data.get("tree", [])
        filtered = [
            {"path": item["path"], "type": item["type"], "size": item.get("size", 0)}
            for item in tree
            if item["type"] == "tree" or any(
                item["path"].lower().endswith(ext) for ext in SHOW_EXTS
            )
        ][:200]
        return {"tree": filtered, "truncated": data.get("truncated", False)}
    except HTTPException:
        return {"tree": [], "truncated": False}


@app.get("/api/repo/{owner}/{repo}/file")
async def get_file_content(owner: str, repo: str, path: str = Query(...)):
    MAX_BYTES = 200_000   # 200 KB cap
    try:
        data = await gh_get(
            f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
        )
        if isinstance(data, list):
            raise HTTPException(400, "Path is a directory, not a file")
        size = data.get("size", 0)
        if size > MAX_BYTES:
            return {
                "content": f"// File too large ({size/1024:.0f} KB). Open on GitHub.\n// {data.get('html_url', '')}",
                "language": _ext_to_lang(path),
                "truncated": True,
            }
        raw = data.get("content", "")
        content = base64.b64decode(raw).decode("utf-8", errors="replace")
        return {"content": content, "language": _ext_to_lang(path), "truncated": False}
    except HTTPException as e:
        if e.status_code == 404:
            return {"content": "// File not found", "language": "plaintext", "truncated": False}
        raise


def _ext_to_lang(path: str) -> str:
    ext = "." + path.rsplit(".", 1)[-1].lower() if "." in path else ""
    MAP = {
        ".py": "python", ".js": "javascript", ".ts": "typescript",
        ".jsx": "jsx", ".tsx": "tsx", ".go": "go", ".rs": "rust",
        ".java": "java", ".cpp": "cpp", ".c": "c", ".h": "cpp",
        ".cs": "csharp", ".rb": "ruby", ".php": "php", ".swift": "swift",
        ".kt": "kotlin", ".md": "markdown", ".json": "json",
        ".yaml": "yaml", ".yml": "yaml", ".toml": "toml",
        ".sh": "bash", ".html": "html", ".css": "css", ".scss": "scss",
        ".sql": "sql", ".graphql": "graphql", ".vue": "html",
    }
    return MAP.get(ext, "plaintext")


# ─── AI Generation Endpoints ───────────────────────────────
def _make_client():
    """Return Anthropic client, or None if key is not set (triggers mock path)."""
    if not ANTHROPIC_KEY:
        return None
    return anthropic.Anthropic(api_key=ANTHROPIC_KEY)


def _cache_key(kind: str, owner: str, repo: str) -> str:
    return f"{kind}:{owner}/{repo}"


# ─── Mock Generators (used when ANTHROPIC_API_KEY is absent) ───

def _mock_learn(req) -> dict:
    lang = req.language or "code"
    repo_slug = req.repo.replace("-", "_")
    return {
        "_mock": True,
        "title": f"Learning {req.repo}",
        "subtitle": (req.description or f"A deep dive into {req.repo}")[:80],
        "estimated_time": "30 min",
        "difficulty": "Intermediate",
        "sections": [
            {
                "id": 1, "title": "Introduction", "icon": "🚀",
                "content": [
                    {"type": "paragraph", "text": f"{req.repo} is an open source project written in {lang}. {req.description or 'It is a well-maintained repository worth studying for its architecture and patterns.'}"},
                    {"type": "callout", "variant": "info", "text": f"Repository: {req.owner}/{req.repo} — browse the full source on GitHub at github.com/{req.owner}/{req.repo}"},
                    {"type": "list", "heading": "What you will learn", "items": [
                        f"Core architecture of {req.repo}",
                        f"How {lang} patterns are applied in practice",
                        "Key design decisions and trade-offs",
                        "How to extend and contribute to the project",
                    ]},
                ]
            },
            {
                "id": 2, "title": "Core Concepts", "icon": "🧠",
                "content": [
                    {"type": "paragraph", "text": f"To understand {req.repo}, you need a solid grasp of its building blocks. The project uses {lang} to achieve its goals through a combination of clean abstractions and pragmatic patterns that have been refined over many releases."},
                    {"type": "paragraph", "text": "Open source projects at this scale typically follow well-established conventions: a clear module boundary, explicit public APIs, and thorough test coverage. Understanding these patterns will help you read and contribute to the codebase."},
                    {"type": "list", "heading": "Key technical areas", "items": [
                        "Module and package organisation",
                        "Data flow and state management",
                        "Error handling strategies",
                        "Testing philosophy and coverage",
                    ]},
                ]
            },
            {
                "id": 3, "title": "Code Breakdown", "icon": "🔍",
                "content": [
                    {"type": "paragraph", "text": f"Let's walk through the most important parts of {req.repo}. Each piece of the code tells a story about the engineering decisions made by the maintainers — from naming conventions to how dependencies are injected."},
                    {"type": "code", "language": lang.lower() if lang.lower() in ["python","javascript","typescript","go","rust","java"] else "python",
                     "caption": f"Typical entry point pattern in {req.repo}",
                     "code": f"# {req.repo} — entry point example\n# See: github.com/{req.owner}/{req.repo}\n\ndef main():\n    # 1. Load configuration from environment\n    config = load_config()\n\n    # 2. Initialise core dependencies\n    app = create_app(config)\n\n    # 3. Start serving\n    app.run()\n\nif __name__ == \"__main__\":\n    main()"},
                    {"type": "callout", "variant": "tip", "text": "Clone the repo and run the tests first — it confirms your environment is correct and shows you what behaviour is expected."},
                ]
            },
            {
                "id": 4, "title": "Advanced Concepts", "icon": "⚡",
                "content": [
                    {"type": "paragraph", "text": f"Beyond the basics, {req.repo} implements several advanced techniques worth studying. Look for performance-sensitive paths, concurrency handling, and the strategies used to handle edge cases gracefully under production load."},
                    {"type": "paragraph", "text": "Reading the issue tracker and recent pull requests gives you insight into what problems the team considers important — and why certain architectural decisions were made the way they were."},
                    {"type": "callout", "variant": "warning", "text": "Before profiling or optimising, always measure first. The bottleneck is rarely where you expect it to be."},
                ]
            },
            {
                "id": 5, "title": "Real-world Applications", "icon": "🌍",
                "content": [
                    {"type": "paragraph", "text": f"{req.repo} is used by engineering teams worldwide in production systems. Understanding how it fits into real stacks — alongside other libraries, CI pipelines, and deployment targets — will help you apply its lessons to your own projects."},
                    {"type": "list", "heading": "Common production use cases", "items": [
                        "Service integration and SDK usage",
                        "Internal tooling and developer experience improvements",
                        "Building on top of the public API",
                        "Contributing bug fixes and feature enhancements upstream",
                    ]},
                ]
            },
        ],
        "key_takeaways": [
            f"{req.repo} is a well-structured {lang} project with real engineering lessons.",
            "Reading production open source code is one of the fastest ways to grow as an engineer.",
            "Add your ANTHROPIC_API_KEY to .env for an AI-generated course tailored to this exact repo.",
        ],
    }


def _mock_quiz(req) -> dict:
    lang = req.language or "Python"
    return {
        "_mock": True,
        "title": f"Quiz: {req.repo}",
        "questions": [
            {"id":1,"difficulty":"easy",
             "question": f"What language is {req.repo} primarily written in?",
             "options":[f"A) {lang}","B) Java","C) C++","D) Ruby"],
             "correct":0,
             "explanation":f"{req.repo} uses {lang} as its primary language, as shown by the repository metadata and file extensions."},
            {"id":2,"difficulty":"easy",
             "question":"Which command clones a GitHub repository to your local machine?",
             "options":["A) git pull","B) git clone <url>","C) git fetch","D) git checkout"],
             "correct":1,
             "explanation":"git clone copies the full repository including its complete history to your local machine."},
            {"id":3,"difficulty":"easy",
             "question":"Where do you typically find installation and setup instructions for an open source project?",
             "options":["A) LICENCE file","B) .gitignore","C) README.md","D) CHANGELOG.md"],
             "correct":2,
             "explanation":"README.md is the conventional home for project overview, installation steps, and usage examples."},
            {"id":4,"difficulty":"medium",
             "question":"What does a Pull Request (PR) represent in the GitHub workflow?",
             "options":["A) Downloading the latest code","B) A proposed change submitted for review and merge","C) Deleting a remote branch","D) Creating a new issue"],
             "correct":1,
             "explanation":"A PR packages one or more commits and invites maintainers to review, comment, and merge your changes into the target branch."},
            {"id":5,"difficulty":"medium",
             "question":f"Which file lists Python package dependencies for projects like {req.repo}?",
             "options":["A) setup.cfg","B) Makefile","C) requirements.txt","D) .env"],
             "correct":2,
             "explanation":"requirements.txt is the standard file pip uses to install Python dependencies. Many projects also use pyproject.toml."},
            {"id":6,"difficulty":"medium",
             "question":"What is the purpose of a GitHub Issue?",
             "options":["A) Storing API secrets","B) Reporting bugs, requesting features, or asking questions","C) Tagging releases","D) Running CI pipelines"],
             "correct":1,
             "explanation":"Issues are the project's public task tracker — the primary channel for bugs, feature requests, and community discussions."},
            {"id":7,"difficulty":"hard",
             "question":"What does 'forking' a repository on GitHub mean?",
             "options":["A) Creating an unlinked local copy","B) Archiving the repository","C) Creating your own remote copy you can modify and PR back from","D) Merging two branches together"],
             "correct":2,
             "explanation":"Forking creates a server-side copy under your own account. It lets you propose changes without needing write access to the original repo."},
            {"id":8,"difficulty":"hard",
             "question":"In semantic versioning (SemVer), what does bumping the MAJOR version (e.g. 1.x → 2.0.0) signal?",
             "options":["A) A bug fix with no API change","B) A new backward-compatible feature","C) A breaking API change","D) A security-only patch"],
             "correct":2,
             "explanation":"MAJOR version bumps signal breaking changes that require consumers to update their integration code. Minor = new feature, Patch = bug fix."},
        ]
    }


def _mock_practice(req) -> dict:
    lang = req.language or "Python"
    owner_repo = f"{req.owner}/{req.repo}"
    return {
        "_mock": True,
        "title": f"Practice: {req.repo}",
        "exercises": [
            {"id":1,"title":"Clone & Explore","difficulty":"easy","estimated_time":"5 min",
             "description":f"Clone {owner_repo} and explore the top-level directory structure.",
             "task":f"Run:\n  git clone https://github.com/{owner_repo}.git\n  cd {req.repo}\n  ls -la",
             "expected_output":"A local copy of the repo with README, source folders, and config files visible.",
             "hints":["Use git log --oneline to see recent commits","Look for a src/, lib/, or app/ directory"],
             "solution":f"git clone https://github.com/{owner_repo}.git\ncd {req.repo}\nls -la\ngit log --oneline -10",
             "explanation":"Cloning and exploring gives you the lay of the land before diving into code."},
            {"id":2,"title":"Read the README","difficulty":"easy","estimated_time":"5 min",
             "description":"Find and summarise the installation steps from the project README.",
             "task":"Open README.md and write down the three most important setup commands you find.",
             "expected_output":"A short list of install/setup commands (e.g. pip install, npm install, make build).",
             "hints":["Look for a 'Getting Started' or 'Installation' heading","Note any prerequisites mentioned at the top"],
             "solution":"cat README.md\n# Or on Windows: type README.md\n# Summarise the key install steps in your own words",
             "explanation":"READMEs are the front door. Always read them in full before touching any code."},
            {"id":3,"title":"Create a Feature Branch","difficulty":"easy","estimated_time":"5 min",
             "description":"Practice the standard open source contribution workflow by creating a branch.",
             "task":"Create a new branch called feature/my-exploration and make an empty commit on it.",
             "expected_output":"git log shows your new commit on the feature branch.",
             "hints":["git checkout -b <branch-name>","git commit --allow-empty -m 'your message'"],
             "solution":"git checkout -b feature/my-exploration\ngit commit --allow-empty -m 'chore: exploration branch'",
             "explanation":"Working on a named branch keeps main clean and is required for opening a Pull Request."},
            {"id":4,"title":"Find a Good First Issue","difficulty":"medium","estimated_time":"10 min",
             "description":f"Browse open issues on {owner_repo} and identify a 'good first issue' you could attempt.",
             "task":f"Visit: https://github.com/{owner_repo}/issues?q=label%3A%22good+first+issue%22\nRead 3 open issues and pick one.",
             "expected_output":"A short description of the issue you chose and why it's approachable.",
             "hints":["Filter by 'good first issue' label","Read existing comments to see if someone is already working on it"],
             "solution":"# This is a research exercise — no code required.\n# Document: issue title, issue number, your approach.",
             "explanation":"Good first issues are curated by maintainers for new contributors. They're the fastest path to your first merged PR."},
            {"id":5,"title":"Run the Test Suite","difficulty":"medium","estimated_time":"10 min",
             "description":"Find and run the project's existing tests to verify your environment is set up correctly.",
             "task":f"Identify the test runner for {lang} and run all tests.",
             "expected_output":"Test results showing a pass/fail count with no environment errors.",
             "hints":[f"For Python: look for pytest in requirements.txt","Check the README for a 'Testing' or 'Development' section","Try: pytest, npm test, go test ./..., cargo test"],
             "solution":"# Python:\npip install -e '.[dev]' && pytest\n\n# Node:\nnpm install && npm test\n\n# Go:\ngo test ./...\n\n# Rust:\ncargo test",
             "explanation":"Running tests first confirms your environment is correct before you make any changes."},
            {"id":6,"title":"Fix a Small Issue","difficulty":"medium","estimated_time":"15 min",
             "description":"Find a typo, outdated comment, or missing docstring and fix it.",
             "task":"Edit one file — fix a typo, improve a comment, or add a missing docstring. Commit the change.",
             "expected_output":"git diff shows your change. git log shows your new commit.",
             "hints":["grep -r 'TODO' . finds improvement opportunities","Keep it small — one file, one clear improvement"],
             "solution":"# Example — fix a typo:\n# 1. Find the file\ngrep -rn 'teh ' src/\n# 2. Fix it\n# 3. Commit\ngit add <file>\ngit commit -m 'fix: correct typo in <file>'",
             "explanation":"Small, focused changes are the ideal first contribution. Maintainers can review them in minutes."},
            {"id":7,"title":"Write a New Unit Test","difficulty":"hard","estimated_time":"20 min",
             "description":f"Add one new unit test to {req.repo} that tests a real function.",
             "task":"Pick an untested or under-tested function, write a test, run the suite, confirm everything passes.",
             "expected_output":"Your new test is visible in git status. All existing and new tests pass.",
             "hints":["Look for functions with no corresponding test file","Keep it simple: one function, one clear assertion","Name it: test_<function>_<expected_behaviour>"],
             "solution":f"# Python example:\n# tests/test_utils.py\n\ndef test_example_function_returns_expected_type():\n    from {req.repo.replace('-','_')} import example_function\n    result = example_function('input')\n    assert result is not None\n    assert isinstance(result, str)",
             "explanation":"Writing tests forces you to understand code deeply and is one of the highest-value open source contributions you can make."},
        ]
    }


@app.post("/api/generate/learn")
async def generate_learn(req: GenerateRequest):
    key = _cache_key("learn", req.owner, req.repo)
    if key in _ai_cache:
        return _ai_cache[key]

    client = _make_client()
    if client is None:
        result = _mock_learn(req)
        _ai_cache[key] = result
        return result

    readme_snippet = req.readme[:6000] if req.readme else "No README available."

    prompt = f"""You are a senior software engineering educator creating a FreeCodeCamp-style course.

Repository: {req.owner}/{req.repo}
Language: {req.language}
Description: {req.description}
Topics: {", ".join(req.topics) if req.topics else "N/A"}

README (first 6000 chars):
---
{readme_snippet}
---

Generate a comprehensive, in-depth learning module as a JSON object.
Use REAL details from the README/repo — no generic placeholders.
Minimum 5 sections; expand to 7 if content warrants it.
Each section must have substantial content (3-6 paragraphs per section).

Return ONLY valid JSON in this exact shape (no markdown fences):
{{
  "title": "Course title based on the actual repo",
  "subtitle": "One-line tagline",
  "estimated_time": "e.g. 45 min",
  "difficulty": "Beginner | Intermediate | Advanced",
  "sections": [
    {{
      "id": 1,
      "title": "Section title",
      "icon": "emoji",
      "content": [
        {{
          "type": "paragraph",
          "text": "Detailed explanation paragraph (3-5 sentences minimum)"
        }},
        {{
          "type": "code",
          "language": "python",
          "caption": "What this code demonstrates",
          "code": "actual code example from or inspired by the repo"
        }},
        {{
          "type": "list",
          "heading": "Key points",
          "items": ["item 1", "item 2", "item 3"]
        }},
        {{
          "type": "callout",
          "variant": "info | warning | tip",
          "text": "Important note or tip"
        }}
      ]
    }}
  ],
  "key_takeaways": ["takeaway 1", "takeaway 2", "takeaway 3"]
}}

Section structure (MUST follow this order):
1. Introduction — What is this? Why does it exist? Core problem it solves.
2. Core Concepts — Fundamental ideas, architecture, data structures used.
3. Code Breakdown — Walk through the main code. Explain each piece.
4. Advanced Concepts — Deeper topics, edge cases, performance considerations.
5. Real-world Applications — How teams actually use this in production.
(Optional 6+: Configuration / Best Practices / Testing)
"""

    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()
    # Strip possible markdown fences
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    result = json.loads(raw)
    _ai_cache[key] = result
    return result


@app.post("/api/generate/quiz")
async def generate_quiz(req: GenerateRequest):
    key = _cache_key("quiz", req.owner, req.repo)
    if key in _ai_cache:
        return _ai_cache[key]

    client = _make_client()
    if client is None:
        result = _mock_quiz(req)
        _ai_cache[key] = result
        return result

    readme_snippet = req.readme[:4000] if req.readme else "No README available."

    prompt = f"""You are a senior educator creating a technical quiz.

Repository: {req.owner}/{req.repo}
Language: {req.language}
Description: {req.description}

README snippet:
---
{readme_snippet}
---

Generate 8 high-quality multiple-choice quiz questions based on this specific repository.
Questions must test REAL knowledge from the repo — installation, APIs, concepts, patterns.
Mix difficulty: 3 easy, 3 medium, 2 hard.

Return ONLY valid JSON (no markdown fences):
{{
  "title": "Quiz: {req.repo}",
  "questions": [
    {{
      "id": 1,
      "difficulty": "easy | medium | hard",
      "question": "Specific question about the repo",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": 0,
      "explanation": "Detailed explanation of why this is correct, referencing the repo specifics"
    }}
  ]
}}
"""

    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    result = json.loads(raw)
    _ai_cache[key] = result
    return result


@app.post("/api/generate/practice")
async def generate_practice(req: GenerateRequest):
    key = _cache_key("practice", req.owner, req.repo)
    if key in _ai_cache:
        return _ai_cache[key]

    client = _make_client()
    if client is None:
        result = _mock_practice(req)
        _ai_cache[key] = result
        return result

    readme_snippet = req.readme[:4000] if req.readme else "No README available."

    prompt = f"""You are a senior software engineering mentor creating coding exercises.

Repository: {req.owner}/{req.repo}
Language: {req.language}
Description: {req.description}

README snippet:
---
{readme_snippet}
---

Generate 7 hands-on practice exercises for this specific repository.
Exercises must be actionable tasks using this library/project.
Order: 3 easy, 3 medium, 1 hard challenge.

Return ONLY valid JSON (no markdown fences):
{{
  "title": "Practice: {req.repo}",
  "exercises": [
    {{
      "id": 1,
      "title": "Short exercise title",
      "difficulty": "easy | medium | hard",
      "estimated_time": "e.g. 10 min",
      "description": "Clear problem description (2-3 sentences)",
      "task": "Exact coding task the learner should complete",
      "expected_output": "What the code should produce/do",
      "hints": ["hint 1", "hint 2"],
      "solution": "Complete working solution code",
      "explanation": "Why this solution works, what it teaches"
    }}
  ]
}}
"""

    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    result = json.loads(raw)
    _ai_cache[key] = result
    return result


@app.get("/api/health")
async def health():
    return {"status": "ok", "cache_size": len(_ai_cache)}


# ─── Suggest Endpoint ──────────────────────────────────────
@app.get("/api/suggest")
async def suggest(q: str = Query(..., min_length=1)):
    """Return autocomplete suggestions for repositories."""
    data = await search_repos(q=q, lang='', page=1, per_page=10)
    items = data.get("items", [])
    
    suggestions = []
    for r in items[:10]:
        suggestions.append({
            "type":     "repo",
            "label":    r["full_name"],
            "sublabel": r["description"][:60] if r["description"] else "",
            "language": r["language"],
            "stars":    r["stars"],
            "url":      r["html_url"],
            "owner":    r["owner"],
            "repo":     r["repo"],
        })
    return {"suggestions": suggestions}



# ─── Competitions ──────────────────────────────────────────
import datetime as _dt

# ── Codeforces phase → our status ──────────────────────────
_CF_PHASE_MAP = {
    "BEFORE":   "upcoming",
    "CODING":   "live",
    "PENDING_SYSTEM_TEST": "ongoing",
    "SYSTEM_TEST": "ongoing",
    "FINISHED": "finished",
}

# Gradient pairs cycled for Codeforces contests (no icon provided by API)
_CF_GRADIENTS = [
    ("#6366f1","#7c3aed"), ("#3b82f6","#4338ca"), ("#34d399","#06b6d4"),
    ("#fb923c","#dc2626"), ("#ec4899","#e11d48"), ("#fde68a","#eab308"),
    ("#7c3aed","#a21caf"), ("#2dd4bf","#059669"), ("#60a5fa","#2563eb"),
]

# ── Fetch live/upcoming contests from Codeforces ───────────
_cf_cache: dict = {}   # {"data": [...], "fetched_at": float}
_CF_CACHE_TTL = 900    # 15 minutes

async def _fetch_codeforces_contests() -> list[dict]:
    """Fetch upcoming and live Codeforces contests. Caches for 15 min."""
    import time
    now = time.time()
    if _cf_cache.get("fetched_at", 0) + _CF_CACHE_TTL > now:
        return _cf_cache.get("data", [])

    try:
        async with httpx.AsyncClient(timeout=8.0) as c:
            r = await c.get("https://codeforces.com/api/contest.list",
                            headers={"User-Agent": "GitLearn/2.0"})
            r.raise_for_status()
            payload = r.json()
    except Exception:
        return _cf_cache.get("data", [])   # return stale on error

    contests = payload.get("result", [])
    # Keep only upcoming (BEFORE) and live (CODING) contests
    active = [c for c in contests if c.get("phase") in ("BEFORE", "CODING")]
    # Sort: live first, then by startTimeSeconds ascending
    active.sort(key=lambda c: (0 if c["phase"]=="CODING" else 1, c.get("startTimeSeconds", 999999999)))
    # Limit to 20 most relevant
    active = active[:20]

    results = []
    for i, c in enumerate(active):
        phase  = c.get("phase", "BEFORE")
        status = _CF_PHASE_MAP.get(phase, "upcoming")
        start  = c.get("startTimeSeconds")
        dur_s  = c.get("durationSeconds", 0)
        gfrom, gto = _CF_GRADIENTS[i % len(_CF_GRADIENTS)]

        # Human-readable start_in
        starts_in = None
        if start and phase == "BEFORE":
            delta = start - int(_dt.datetime.now(_dt.timezone.utc).timestamp())
            if delta > 0:
                days  = delta // 86400
                hours = (delta % 86400) // 3600
                mins  = (delta % 3600)  // 60
                if days > 0:
                    starts_in = f"{days}d {hours}h"
                elif hours > 0:
                    starts_in = f"{hours}h {mins}m"
                else:
                    starts_in = f"{mins} min"

        # Duration label
        dur_label = None
        if dur_s:
            dh = dur_s // 3600
            dm = (dur_s % 3600) // 60
            dur_label = f"{dh}h" if dm == 0 else f"{dh}h {dm}m"

        # Deadline
        deadline = None
        if start:
            deadline = _dt.datetime.fromtimestamp(start, tz=_dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

        results.append({
            "id":            f"cf-{c['id']}",
            "title":         c.get("name", "Codeforces Round"),
            "description":   f"Official Codeforces round. Duration: {dur_label or 'varies'}. "
                             f"Rated for participants with rating up to {c.get('maxRating') or 'all'} "
                             f"(type: {c.get('type','CF')}).",
            "status":        status,
            "starts_in":     starts_in,
            "participants":  c.get("relativeTimeSeconds", 0) and 0 or 0,  # CF doesn't expose this ahead of time
            "gradient_from": gfrom,
            "gradient_to":   gto,
            "tags":          ["Competitive Programming", "Codeforces",
                              f"{'Div. 1' if c.get('maxRating',9999)>1899 else 'Div. 2' if c.get('maxRating',9999)>1399 else 'Div. 3+'}"],
            "prize":         None,
            "deadline":      deadline,
            "duration":      dur_label,
            "url":           f"https://codeforces.com/contest/{c['id']}",
            "source":        "codeforces",
            "cf_id":         c["id"],
            "leaderboard":   [],   # not available before contest ends
        })

    _cf_cache["data"] = results
    _cf_cache["fetched_at"] = now
    return results


# ── Local & Regional competitions (Stara Zagora + Bulgaria) ─
# No public API exists for Bulgarian regional competitions.
# These are real recurring events curated and kept up to date here.
_LOCAL_COMPETITIONS: list[dict] = [
    {
        "id": "hack-tues-sofia",
        "title": "Hack TUES EX",
        "description": "Annual student hackathon organised by TUES (Technical School of Electronic Systems), Sofia. 24-hour challenge for high school students. One of the most prestigious student hackathons in Bulgaria.",
        "status": "open",
        "starts_in": "Registration Open",
        "participants": 320,
        "gradient_from": "#6366f1", "gradient_to": "#7c3aed",
        "tags": ["Hackathon", "Students", "Bulgaria"],
        "prize": "Prizes + Internship Offers",
        "deadline": "2026-05-10",
        "url": "https://hacktues.com",
        "source": "local",
        "region": "Bulgaria",
        "leaderboard": [],
        "city": "Sofia",
    },
    {
        "id": "national-olympiad-informatics-bg",
        "title": "National Olympiad in Informatics",
        "description": "The Bulgarian National Olympiad in Informatics — the top competitive programming contest for high school students across Bulgaria. Winners represent Bulgaria at IOI (International Olympiad in Informatics).",
        "status": "upcoming",
        "starts_in": "April 2026",
        "participants": 1200,
        "gradient_from": "#16a34a", "gradient_to": "#15803d",
        "tags": ["Olympiad", "Algorithms", "Students", "Bulgaria"],
        "prize": "National Title + IOI Qualification",
        "deadline": "2026-04-20",
        "url": "https://math.bas.bg/omi/",
        "source": "local",
        "region": "Bulgaria",
        "leaderboard": [],
        "city": "National",
    },
    {
        "id": "regional-olympiad-sz",
        "title": "Regional Olympiad — Informatics (Stara Zagora)",
        "description": "The Stara Zagora regional qualifying round of the Bulgarian Olympiad in Informatics. Open to all high school students from the Stara Zagora region. Top performers advance to the national round.",
        "status": "open",
        "starts_in": "Registration Open",
        "participants": 180,
        "gradient_from": "#dc2626", "gradient_to": "#b91c1c",
        "tags": ["Olympiad", "Stara Zagora", "Algorithms"],
        "prize": "National Round Qualification",
        "deadline": "2026-04-05",
        "url": "https://math.bas.bg/omi/",
        "source": "local",
        "region": "Stara Zagora",
        "leaderboard": [],
        "city": "Stara Zagora",
    },
    {
        "id": "trakia-uni-hackathon",
        "title": "Trakia University IT Hackathon",
        "description": "Annual hackathon organised by the Faculty of Technics and Technologies at Trakia University, Stara Zagora. Teams of students build tech solutions over 48 hours, judged by local tech industry professionals.",
        "status": "upcoming",
        "starts_in": "May 2026",
        "participants": 95,
        "gradient_from": "#0369a1", "gradient_to": "#0284c7",
        "tags": ["Hackathon", "Stara Zagora", "University"],
        "prize": "Trophy + Industry Mentorship",
        "deadline": "2026-05-01",
        "url": "https://www.trakia-uni.bg",
        "source": "local",
        "region": "Stara Zagora",
        "leaderboard": [],
        "city": "Stara Zagora",
    },
    {
        "id": "codeit-bg",
        "title": "CodeIT Bulgaria",
        "description": "Annual national programming competition for university students across Bulgaria, organised by industry partners. Covers algorithms, web development and system design tracks. Teams from all major Bulgarian universities participate.",
        "status": "upcoming",
        "starts_in": "Summer 2026",
        "participants": 640,
        "gradient_from": "#ea580c", "gradient_to": "#c2410c",
        "tags": ["University", "Bulgaria", "Programming"],
        "prize": "Cash prizes + Job Offers",
        "deadline": "2026-06-01",
        "url": "https://codeit.bg",
        "source": "local",
        "region": "Bulgaria",
        "leaderboard": [],
        "city": "National",
    },
    {
        "id": "startup-weekend-sz",
        "title": "Startup Weekend Stara Zagora",
        "description": "54-hour startup competition in Stara Zagora organised by Techstars. Participants form teams, build products, and pitch to a panel of investors and mentors. IT and tech tracks are the most popular.",
        "status": "upcoming",
        "starts_in": "Autumn 2026",
        "participants": 70,
        "gradient_from": "#7c3aed", "gradient_to": "#6d28d9",
        "tags": ["Startup", "Stara Zagora", "Pitch"],
        "prize": "Mentorship + Seed Funding Intro",
        "deadline": "2026-09-01",
        "url": "https://startupweekend.org",
        "source": "local",
        "region": "Stara Zagora",
        "leaderboard": [],
        "city": "Stara Zagora",
    },
    {
        "id": "ista-conference-bg",
        "title": "ISTA — Innovation, Science and Technology Association",
        "description": "Annual tech conference and competition organised by leading Bulgarian IT companies (Experian, Infragistics, Accenture). Includes a student challenge track with real-world engineering problems.",
        "status": "upcoming",
        "starts_in": "October 2026",
        "participants": 500,
        "gradient_from": "#0e7490", "gradient_to": "#0891b2",
        "tags": ["Conference", "Bulgaria", "Innovation"],
        "prize": "Industry Recognition + Internships",
        "deadline": "2026-09-15",
        "url": "https://istacon.org",
        "source": "local",
        "region": "Bulgaria",
        "leaderboard": [],
        "city": "Sofia",
    },
    {
        "id": "digital-stars-bg",
        "title": "Digital Stars Bulgaria",
        "description": "Annual competition recognising Bulgaria's top young digital tech talents. Organised by Digital4Bulgaria. Covers software development, AI/ML, cybersecurity, and digital marketing tracks.",
        "status": "open",
        "starts_in": "Registration Open",
        "participants": 410,
        "gradient_from": "#a21caf", "gradient_to": "#86198f",
        "tags": ["Digital", "Bulgaria", "Innovation"],
        "prize": "National Recognition + Prizes",
        "deadline": "2026-04-30",
        "url": "https://digital4bulgaria.com",
        "source": "local",
        "region": "Bulgaria",
        "leaderboard": [],
        "city": "Multiple Cities",
    },
]


@app.get("/api/competitions/local")
async def get_local_competitions():
    """Return curated local/regional competitions for Stara Zagora and Bulgaria."""
    STATUS_ORDER = {"live": 0, "ongoing": 1, "open": 2, "upcoming": 3}
    sorted_local = sorted(
        _LOCAL_COMPETITIONS,
        key=lambda c: (STATUS_ORDER.get(c["status"], 9), c.get("city","") != "Stara Zagora")
    )
    return {"total": len(sorted_local), "items": sorted_local}


@app.get("/api/competitions/global")
async def get_global_competitions():
    """Fetch live upcoming contests from Codeforces."""
    items = await _fetch_codeforces_contests()
    return {"total": len(items), "items": items, "source": "codeforces"}


@app.get("/api/competitions/stats")
async def competition_stats():
    """Aggregate stats for the home page widget — uses local list (fast, no external call)."""
    STATUS_ORDER = {"live": 0, "ongoing": 1, "open": 2, "upcoming": 3}
    local = _LOCAL_COMPETITIONS
    total_participants = sum(c["participants"] for c in local)
    live_count  = sum(1 for c in local if c["status"] in ("live", "ongoing"))
    open_count  = sum(1 for c in local if c["status"] == "open")
    # Preview: Stara Zagora first, then by participant count
    preview = sorted(local, key=lambda c: (c.get("city","") != "Stara Zagora", -c["participants"]))[:3]
    return {
        "total_participants": total_participants,
        "live_count": live_count,
        "open_count": open_count,
        "preview": [
            {
                "id":            c["id"],
                "title":         c["title"],
                "status":        c["status"],
                "participants":  c["participants"],
                "gradient_from": c["gradient_from"],
                "gradient_to":   c["gradient_to"],
                "tags":          c["tags"][:2],
                "leaderboard":   c.get("leaderboard", [])[:3],
                "prize":         c.get("prize", ""),
                "region":        c.get("region",""),
                "city":          c.get("city",""),
            }
            for c in preview
        ],
    }


# Legacy endpoint — keep working for any old callers
@app.get("/api/competitions")
async def get_competitions_legacy(limit: int = Query(8, ge=1, le=20)):
    """Backwards-compatible endpoint: returns local competitions."""
    STATUS_ORDER = {"live": 0, "ongoing": 1, "open": 2, "upcoming": 3}
    sorted_comps = sorted(_LOCAL_COMPETITIONS, key=lambda c: STATUS_ORDER.get(c["status"], 9))
    return {"total": len(sorted_comps), "items": sorted_comps[:limit]}


