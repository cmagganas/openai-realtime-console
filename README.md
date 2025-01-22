# OpenAI Realtime Console with Arcade Integration

This is an example application showing how to use the [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime) with [WebRTC](https://platform.openai.com/docs/guides/realtime-webrtc) and [Arcade AI](https://arcade.software/).

## Installation and Usage

### Prerequisites

- Node.js
- Python 3.12+
- OpenAI API key
- Arcade API key and registered email

### Environment Setup

1. Create and configure your environment:

   ```bash
   cp .env.example .env
   python -m venv arcade_env
   source arcade_env/bin/activate # or arcade_env\Scripts\activate on Windows
   ```

2. Add the following to your `.env`:

   ```bash
   OPENAI_API_KEY=your_openai_key
   ARCADE_API_KEY=your_arcade_key
   ARCADE_EMAIL=your_email
   ```

3. Install dependencies:

   ```bash
   npm install
   pip install -r requirements.txt
   ```

### Starting the Application

Use the provided start script:

```bash
chmod +x start-servers.sh # Make script executable (Unix only)
./start-servers.sh
```

Or start servers manually:

Terminal 1: Start FastAPI server

```bash
python -m uvicorn arcade_bridge:app --reload --port 8000
```

Terminal 2: Start Node.js server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Features

- Real-time voice conversations with GPT-4
- Arcade AI integration for:
  - Spotify search and music discovery
  - Image generation
  - Additional AI tools

## Usage

1. Click "Start Session" to begin
2. Use voice or text to interact
3. When music-related queries are made, Arcade tools will automatically:
   - Search Spotify
   - Display results in the right panel
   - Provide clickable links to songs/artists

## Architecture

- Frontend: React + Vite
- Backend: Fastify + FastAPI
- Real-time: WebRTC
- AI Tools: Arcade API

_Note:_ The `server.js` file uses [@fastify/vite](https://fastify-vite.dev/) to build and serve the frontend.
