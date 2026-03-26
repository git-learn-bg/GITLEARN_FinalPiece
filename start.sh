#!/bin/bash
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║         GitLearn AI Platform             ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Create .env if missing
if [ ! -f "backend/.env" ]; then
    echo "[INFO] Creating backend/.env from example..."
    cp backend/.env.example backend/.env
    echo "[INFO] Edit backend/.env to add your GITHUB_TOKEN"
fi

# Python venv setup
if [ ! -d "backend/venv" ]; then
    echo "[INFO] Creating Python virtual environment..."
    python3 -m venv backend/venv
    echo "[INFO] Installing Python dependencies..."
    source backend/venv/bin/activate
    pip install -r backend/requirements.txt -q
else
    source backend/venv/bin/activate
fi

# Node deps
if [ ! -d "frontend/node_modules" ]; then
    echo "[INFO] Installing Node dependencies..."
    (cd frontend && npm install --silent)
fi

# Start backend
echo "[OK] Starting backend on http://localhost:8000"
(cd backend && python -m uvicorn main:app --reload --port 8000) &
BACKEND_PID=$!

sleep 2

# Start frontend
echo "[OK] Starting frontend on http://localhost:3000"
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "════════════════════════════════════════════"
echo " Frontend:  http://localhost:3000"
echo " Backend:   http://localhost:8000"
echo " API Docs:  http://localhost:8000/docs"
echo "════════════════════════════════════════════"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
