# NUKE Token Reward Dashboard

A React + TypeScript frontend dashboard for monitoring the Solana Token-2022 reward system.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The frontend will start on **http://localhost:5173** (or next available port).

### 3. Access Dashboard

Open your browser to: **http://localhost:5173**

**Important**: Make sure the backend is running on `http://localhost:3000` first!

## Prerequisites

- Backend must be running on `http://localhost:3000`
- Node.js 18+ installed

## Configuration

### API URL (Optional)

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_BASE_URL=http://localhost:3000
```

If not set, defaults to `http://localhost:3000`.

## Features

- **Real-time Data**: Auto-refreshes every 60 seconds
- **Holders Table**: View all token holders with eligibility status, USD values, and reward history
- **Reward Summary**: Monitor scheduler status, statistics, and token pricing
- **Payouts Table**: Track pending and failed SOL payouts
- **Responsive Design**: Works on desktop and mobile devices

## Troubleshooting

### "This site can't be reached" (localhost:5173)

1. **Check if frontend is running:**
   ```bash
   npm run dev
   ```
   You should see output like:
   ```
   VITE v7.x.x  ready in xxx ms
   ➜  Local:   http://localhost:5173/
   ```

2. **Check if port 5173 is in use:**
   ```bash
   lsof -ti:5173
   ```
   If a process is found, kill it or use a different port.

3. **Check backend is running:**
   ```bash
   curl http://localhost:3000/health
   ```
   Should return: `{"status":"ok"}`

### Frontend can't connect to backend

1. **Verify backend is running:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check API URL:**
   - Verify `VITE_API_BASE_URL` in `.env` file
   - Or check browser console for API errors

3. **Check CORS:**
   - Backend has CORS enabled by default
   - If issues persist, check backend logs

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── HoldersTable.tsx/css
│   ├── RewardSummary.tsx/css
│   └── PayoutsTable.tsx/css
├── pages/               # Page components
│   └── Dashboard.tsx/css
├── services/            # API service layer
│   └── api.ts
├── types/               # TypeScript type definitions
│   └── api.ts
├── App.tsx              # Root component
└── main.tsx             # Entry point
```

## API Endpoints

The dashboard consumes the following backend endpoints:

- `GET /dashboard/holders` - Token holders list
- `GET /dashboard/rewards` - Reward cycle summary
- `GET /dashboard/payouts` - Pending payouts

## Development

### Start Development Server

```bash
npm run dev
```

The dashboard automatically refreshes data every 60 seconds. All API calls are logged to the browser console for debugging.

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Technologies

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Axios** - HTTP client

## Common Commands

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```
