# Unpaid Rewards Persistent Storage Implementation

## Overview

This implementation provides persistent storage for unpaid rewards that persists between epochs. The service stores accumulated reward amounts for each wallet address and provides functions to manage these rewards.

## Files Created

1. **`backend/src/services/unpaidRewardsService.ts`** - Main service file with all functions
2. **`backend/test-unpaid-rewards-persistence.ts`** - Test script to verify functionality and persistence

## Data Structure

The service uses a `Record<string, number>` (walletAddress → accumulatedAmount) structure stored in `unpaid-rewards.json`. This is equivalent to a `Map<walletAddress, accumulatedAmount>` but uses a plain object for JSON serialization compatibility.

## Storage Location

- **File**: `unpaid-rewards.json` (in the backend directory, same location as `reward-state.json`)
- **Format**: JSON file with structure:
  ```json
  {
    "unpaidRewards": {
      "walletAddress1": 1.5,
      "walletAddress2": 2.75,
      "walletAddress3": 0.1
    }
  }
  ```

## Exported Functions

### 1. `getAccumulatedReward(wallet: string): number`
- Retrieves the stored accumulated reward amount for a wallet
- Returns `0` if wallet has no accumulated rewards or if wallet address is invalid
- Safe to call with invalid inputs (returns 0)

### 2. `addToAccumulatedReward(wallet: string, amount: number): void`
- Adds an amount to a wallet's existing accumulated reward balance
- Validates that amount is a positive number
- Throws error if wallet address is invalid or amount is invalid
- Automatically saves state after updating

### 3. `clearAccumulatedReward(wallet: string): void`
- Resets a wallet's accumulated reward to 0 (removes from storage)
- Used after successful payout
- Safe to call even if wallet has no accumulated rewards (no-op)

### 4. `getAllWalletsWithAccumulatedRewards(): string[]`
- Returns an array of all wallet addresses that have accumulated rewards > 0
- Returns empty array if no wallets have accumulated rewards
- Filters out wallets with zero or invalid amounts

### Bonus Functions (for convenience)

- `getAllUnpaidRewards(): Record<string, number>` - Returns the full unpaid rewards map
- `getTotalUnpaidRewards(): number` - Returns the sum of all unpaid rewards across all wallets

## Error Handling

- **Read operations**: Return safe defaults (0 or empty array) on error to prevent disruption
- **Write operations**: Throw errors to ensure data integrity
- All errors are logged with context
- File operations use atomic writes (write to temp file, then rename) to prevent corruption

## Usage Example

```typescript
import {
  getAccumulatedReward,
  addToAccumulatedReward,
  clearAccumulatedReward,
  getAllWalletsWithAccumulatedRewards,
} from './services/unpaidRewardsService';

// Get current accumulated reward
const amount = getAccumulatedReward('WalletAddressHere');
console.log(`Wallet has ${amount} SOL accumulated`);

// Add to accumulated reward
addToAccumulatedReward('WalletAddressHere', 1.5);
const newAmount = getAccumulatedReward('WalletAddressHere');
console.log(`Wallet now has ${newAmount} SOL accumulated`);

// Get all wallets with accumulated rewards
const wallets = getAllWalletsWithAccumulatedRewards();
console.log(`${wallets.length} wallets have accumulated rewards`);

// Clear after successful payout
clearAccumulatedReward('WalletAddressHere');
```

## Testing

Run the test script to verify functionality and persistence:

```bash
cd backend
npx tsx test-unpaid-rewards-persistence.ts
```

The test script will:
1. Test all four main functions
2. Verify error handling
3. Check that data persists correctly
4. Validate file structure

**To test persistence:**
1. Run the script once - it will add test data
2. Run the script again - it should detect the existing data and verify persistence

## Integration Notes

⚠️ **Important**: This service is standalone and does NOT modify existing reward calculation or payout logic. It's ready to be integrated when needed.

### Future Integration Points

1. **Reward Calculation**: After computing rewards, call `addToAccumulatedReward()` to accumulate unpaid amounts
2. **Payout Logic**: After successful payout, call `clearAccumulatedReward()` to reset the balance
3. **Epoch Transitions**: The data automatically persists between epochs (stored in file)

## Implementation Details

- Uses `fs` module for file operations (same pattern as `rewardService.ts`)
- Includes legacy format migration support (if file format changes in future)
- Atomic file writes to prevent corruption
- Comprehensive logging for debugging
- Type-safe with TypeScript interfaces

## Notes

- Storage persists between script runs (file-based)
- Storage persists between server restarts (file-based)
- Storage persists between epochs (file-based)
- Data structure can be easily extended in the future
- No database required - simple file-based storage is sufficient for this use case
