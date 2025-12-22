# Build and Push Commands

## Build Commands

### Backend Build
```bash
cd backend
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### Frontend Build
```bash
cd frontend
npm run build
```

This compiles TypeScript and builds the production bundle using Vite in the `dist/` directory.

## Build Both (Sequential)

```bash
# From project root
cd backend && npm run build && cd ../frontend && npm run build
```

Or step by step:
```bash
# Build Backend
cd ~/reward-project/backend
npm run build

# Build Frontend
cd ~/reward-project/frontend
npm run build
```

## GitHub Push Commands

### Step-by-Step

```bash
# Navigate to project root
cd ~/reward-project

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Fix Raydium SDK swap - Remove numeric metadata from pool keys

- Remove openTime (numeric timestamp) from pool keys data
- Add validation to prevent numeric fields from being passed to jsonInfo2PoolKeys()
- Only include base58 address strings (id, programId, authority, mintA, mintB, vaultA, vaultB, lpMint)
- Follow Chainstack article pattern for proper SDK usage
- Fix 'invalid public key' error caused by numeric metadata

Fixes:
- invalid public key error (value like '1765892692')
- Swaps failing before distributions
- Numeric metadata being parsed as PublicKeys"

# Push to GitHub
git push origin main
```

### One-Line Command (Build Both + Push)

```bash
cd ~/reward-project && \
cd backend && npm run build && \
cd ../frontend && npm run build && \
cd .. && \
git add . && \
git commit -m "Fix Raydium SDK swap - Remove numeric metadata from pool keys" && \
git push origin main
```

## Alternative: Build and Push Separately

If you want to build first, then push later:

```bash
# Build both
cd ~/reward-project/backend && npm run build && \
cd ../frontend && npm run build && cd ..

# Later, when ready to push:
cd ~/reward-project
git add .
git commit -m "Fix Raydium SDK swap - Remove numeric metadata from pool keys"
git push origin main
```

## Verification Commands

After pushing, verify with:

```bash
# Check git status
git status

# Check recent commits
git log --oneline -5

# Check if remote is up to date
git fetch origin
git status

# View what will be pushed
git log origin/main..HEAD
```

## Quick Reference

| Action | Command |
|--------|---------|
| Build Backend | `cd backend && npm run build` |
| Build Frontend | `cd frontend && npm run build` |
| Build Both | `cd backend && npm run build && cd ../frontend && npm run build` |
| Stage Changes | `git add .` |
| Commit | `git commit -m "Your message"` |
| Push | `git push origin main` |
| Build + Push | See one-line command above |

## Notes

- **Backend build output**: `backend/dist/`
- **Frontend build output**: `frontend/dist/`
- **Default branch**: `main` (adjust if using `master` or another branch)
- Make sure you're in the project root (`~/reward-project`) before running git commands
