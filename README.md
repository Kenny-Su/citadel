# Citadel Chat Room

A small guest chat app with named rooms, SQLite-backed message history, returning guest names, and typing indicators.

## Local Development

```bash
npm install
npm run dev
```

The Vite client runs at `http://localhost:5173` and the Socket.IO/Express backend runs at `http://localhost:3001`.

## Test And Build

```bash
npm test
npm run build
npm run test:production
```

`npm run test:production` builds the client and checks that the production server serves both `/health` and room routes such as `/rooms/general`.

## Production Run

```bash
npm run build
npm start
```

The server reads:

- `PORT`: HTTP port, default `3001`.
- `HOST`: bind host, default `0.0.0.0`.
- `CLIENT_ORIGIN`: allowed Socket.IO browser origin, default `http://localhost:5173`.
- `CHAT_DB_PATH`: SQLite database path, default `data/chat.sqlite`.

## Render Deployment

Create a Render Web Service connected to this repo.

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Health check path: `/health`
- Node version: `24.14.1`
- Persistent disk mount path: `/var/data`

Set environment variables:

```text
NODE_VERSION=24.14.1
CHAT_DB_PATH=/var/data/chat.sqlite
CLIENT_ORIGIN=https://<service>.onrender.com
```

Keep the service at one instance while using SQLite on a persistent disk. Move to Postgres before horizontal scaling.
