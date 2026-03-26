#!/usr/bin/env bash
# Run from inside the backend/ directory
set -e

# Load .env if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

echo "🚀 Starting GitLearn API on http://localhost:8000"
uvicorn main:app --reload --host 0.0.0.0 --port 8000
