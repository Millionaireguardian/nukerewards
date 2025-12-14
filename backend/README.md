# Backend API Server

A TypeScript + Express backend API server.

## Features

- Express.js web framework
- TypeScript for type safety
- Environment variable configuration
- Health check endpoint
- Graceful shutdown handling
- Structured logging

## Prerequisites

- Node.js (LTS version recommended)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables template:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
```env
PORT=3000
NODE_ENV=development
```

## Development

Run the development server with hot reload:
```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

## Building

Build the TypeScript project:
```bash
npm run build
```

This compiles TypeScript files from `src/` to JavaScript in `dist/`.

## Production

Start the production server:
```bash
npm start
```

This runs the compiled JavaScript from `dist/index.js`.

## Project Structure

```
backend/
├── src/
│   ├── index.ts            # Application entry point
│   ├── server.ts           # Express server setup
│   ├── config/
│   │   ├── env.ts          # Environment variable loader
│   │   └── constants.ts    # Application constants
│   ├── routes/
│   │   └── health.ts       # GET /health endpoint
│   ├── services/           # Service logic
│   └── utils/              # Utility functions (e.g., logger)
├── dist/                   # Compiled JavaScript output
├── package.json            # Dependencies, scripts
├── tsconfig.json           # TypeScript configuration
├── .env.example            # Template for environment variables
└── README.md               # Project documentation
```

## API Endpoints

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development, production)

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server

## License

MIT
