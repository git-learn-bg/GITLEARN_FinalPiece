#!/bin/bash

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║         GitLearn AI Platform             ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Ensure script runs from its own directory
cd "$(dirname "$0")"

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
fi

echo "[INFO] Activating virtual environment..."
source backend/venv/bin/activate

echo "[INFO] Installing Python dependencies..."
pip install -r backend/requirements.txt

# Node deps
if [ ! -d "frontend/node_modules" ]; then
    echo "[INFO] Installing Node dependencies..."
    (cd frontend && npm install)
fi

# Start backend (in background)
echo "[OK] Starting backend on http://localhost:8888"
(
  cd backend
  source venv/bin/activate
  python -m uvicorn main:app --reload --port 8888 --host 127.0.0.1
) &
BACKEND_PID=$!

sleep 2

# Start frontend (in background)
echo "[OK] Starting frontend on http://localhost:3000"
(
  cd frontend
  npm run dev
) &
FRONTEND_PID=$!

echo ""
echo "════════════════════════════════════════════"
echo " Frontend:  http://localhost:3000"
echo " Backend:   http://localhost:8888"
echo " API Docs:  http://localhost:8888/docs"
echo "════════════════════════════════════════════"
echo ""
echo "Press Ctrl+C to stop both servers."

# Proper shutdown
trap "echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

wait