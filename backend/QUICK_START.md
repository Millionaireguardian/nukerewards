# Quick Start - Terminal Commands

## Copy-Paste Ready Setup

### Step 1: Navigate and Install

```bash
cd backend
npm install express dotenv
npm install --save-dev typescript ts-node-dev @types/node @types/express
npx tsc --init
cp .env.example .env
```

### Step 2: Start Development Server

```bash
npm run dev
```

### Step 3: Test Health Endpoint

In a new terminal:

```bash
curl http://localhost:3000/health
```

Expected: `{"status":"ok"}`

---

## Production Build & Start

```bash
npm run build
npm start
```

---

## One-Line Setup (Alternative)

```bash
cd backend && npm install express dotenv && npm install --save-dev typescript ts-node-dev @types/node @types/express && npx tsc --init && cp .env.example .env && echo "✅ Setup complete! Edit .env then run: npm run dev"
```

---

## Automated Setup Script

Or use the provided script:

```bash
cd backend
chmod +x TERMINAL_SETUP.sh
./TERMINAL_SETUP.sh
```

