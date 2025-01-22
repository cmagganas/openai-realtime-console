#!/bin/bash

# Export environment variables from .env
set -a
source .env
set +a

# Kill any existing processes on ports 3000 and 8000
kill $(lsof -t -i:3000) 2>/dev/null
kill $(lsof -t -i:8000) 2>/dev/null

# Start FastAPI server
echo "Starting FastAPI server..."
python -m uvicorn arcade_bridge:app --reload --port 8000 &
FASTAPI_PID=$!

# Wait for FastAPI server to be ready
while ! nc -z localhost 8000; do
  sleep 0.1
done
echo "FastAPI server is ready"

# Start Node.js server
echo "Starting Node.js server..."
npm run dev &
NODE_PID=$!

# Handle script termination
trap "kill $FASTAPI_PID $NODE_PID" EXIT

# Wait for both processes
wait 