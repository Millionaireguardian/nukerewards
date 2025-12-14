# Telegram Bot for Reward System Dashboard

A TypeScript Telegram bot that provides real-time access to the Solana reward system dashboard data.

## Features

- 📊 **Commands**: `/rewards`, `/payouts`, `/holders`, `/export`, `/help`
- 🔔 **Auto-notifications**: Automatically sends notifications when new rewards or payouts are detected
- 📁 **Excel Export**: Download complete dashboard data as Excel file
- 🔄 **Error Handling**: Automatic retries with exponential backoff
- ⚡ **Real-time Data**: Fetches live data from backend API

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token (get from @BotFather)
- `BACKEND_URL` - Backend API URL (default: http://localhost:3000)
- `TELEGRAM_CHAT_ID` - Optional: Chat ID for auto-notifications
- `POLLING_INTERVAL_MS` - Optional: Polling interval in milliseconds (default: 60000)
- `RETRY_ATTEMPTS` - Optional: Number of retry attempts (default: 3)
- `RETRY_DELAY_MS` - Optional: Base retry delay in milliseconds (default: 1000)

### 3. Build TypeScript

```bash
npm run build
```

### 4. Run the Bot

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

## Usage

### Commands

- `/start` or `/help` - Show help message with available commands
- `/rewards` - Get latest reward system status and statistics
- `/payouts` - Get pending payouts information
- `/holders` - Get top token holders by USD value
- `/export` - Download complete dashboard data as Excel file

### Auto-Notifications

If `TELEGRAM_CHAT_ID` is configured, the bot will automatically:
- Send notifications when new reward runs are detected
- Send notifications when new payouts are added
- Poll the backend API at the configured interval

## Project Structure

```
telegram-bot/
├── src/
│   └── bot.ts          # Main bot implementation
├── dist/               # Compiled JavaScript
├── temp/               # Temporary files (Excel exports)
├── .env                # Environment variables (not in git)
├── .env.example        # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

## Error Handling

The bot includes robust error handling:
- Automatic retries with exponential backoff for API failures
- User-friendly error messages
- Graceful shutdown on SIGINT/SIGTERM
- Network error detection and reporting

## Excel Export

The `/export` command generates a multi-sheet Excel file containing:
1. **Summary Sheet**: Overall statistics and system status
2. **Payouts Sheet**: All pending and failed payouts
3. **Top Holders Sheet**: Top 100 holders by USD value

## Development

### Running in Development Mode

```bash
npm run dev
```

This uses `ts-node-dev` for auto-reload on file changes.

### Building for Production

```bash
npm run build
npm start
```

## Troubleshooting

### Bot not responding

1. Check that `TELEGRAM_BOT_TOKEN` is correct
2. Verify the bot is running: `npm run dev` or `npm start`
3. Check console logs for errors

### Backend connection errors

1. Ensure backend is running at `BACKEND_URL`
2. Test backend manually: `curl http://localhost:3000/health`
3. Check CORS settings if accessing from different origin

### Auto-notifications not working

1. Verify `TELEGRAM_CHAT_ID` is set correctly
2. Ensure the bot has permission to send messages to the chat
3. Check polling interval is not too short (minimum 30 seconds recommended)

## License

MIT
