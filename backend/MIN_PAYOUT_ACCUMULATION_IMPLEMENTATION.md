# Minimum Payout with Reward Accumulation Implementation

## Overview

This implementation adds minimum payout logic with reward accumulation. Small rewards are accumulated until they reach a configurable threshold, at which point they are paid out. This prevents small, cost-ineffective payouts while ensuring holders eventually receive their rewards.

## Configuration Variables

Added to `backend/src/config/constants.ts`:

- **`MIN_PAYOUT_TOKEN`** (default: 60)
  - Minimum payout in NUKE tokens (for TOKEN mode)
  - Environment variable: `MIN_PAYOUT_TOKEN`
  
- **`MIN_PAYOUT_USD`** (default: 0.001)
  - Minimum payout in USD (for USD mode)
  - Environment variable: `MIN_PAYOUT_USD`

## New Function

### `getMinimumPayoutThreshold()`

Located in `backend/src/config/constants.ts`

Returns the minimum payout threshold in SOL, converted based on `REWARD_VALUE_MODE`:
- **TOKEN mode**: Converts `MIN_PAYOUT_TOKEN` (NUKE tokens) to SOL using NUKE price
- **USD mode**: Converts `MIN_PAYOUT_USD` (USD) to SOL using fixed devnet rate (100 SOL = 1 USD)

Returns `null` if price data is unavailable (falls back to legacy `MIN_SOL_PAYOUT`).

## Modified Distribution Logic

The `distributeSolToHolders()` function in `backend/src/services/solDistributionService.ts` has been updated:

### Process Flow

1. **Get minimum payout threshold** based on `REWARD_VALUE_MODE`
2. **For each eligible holder**:
   - Calculate current epoch reward (SOL)
   - Get accumulated reward from `unpaidRewardsService`
   - Calculate total: `currentReward + accumulatedReward`
   - **If total >= threshold**:
     - Add to payout list with total amount
     - After successful payout: clear accumulated reward
   - **If total < threshold**:
     - Accumulate current reward using `addToAccumulatedReward()`
     - Log "Reward accumulated for wallet"
     - Skip payout for this epoch

### Key Features

- **Never erases rewards**: Rewards are only accumulated, never deleted
- **Automatic accumulation**: Small rewards automatically accumulate
- **Threshold-based payout**: Payouts occur when threshold is reached
- **Persistent storage**: Accumulated rewards persist between epochs
- **Mode-aware**: Threshold calculation adapts to TOKEN/USD mode

### Logging

The implementation includes comprehensive logging:
- When rewards are accumulated (with amounts and thresholds)
- When payouts include accumulated amounts
- When accumulated rewards are cleared after payout
- Distribution summary with accumulation statistics

## Integration Points

### Imports Added

```typescript
import { getMinimumPayoutThreshold } from '../config/constants';
import {
  getAccumulatedReward,
  addToAccumulatedReward,
  clearAccumulatedReward,
} from './unpaidRewardsService';
```

### Dependencies

- `unpaidRewardsService` - Provides persistent storage for accumulated rewards
- `constants.ts` - Provides threshold configuration and mode detection
- `priceService` - Used by threshold calculation (TOKEN mode)

## Example Flow

1. **Epoch 1**: Holder receives 0.01 SOL reward
   - Threshold: 0.1 SOL
   - 0.01 < 0.1 → Accumulate
   - Stored: 0.01 SOL

2. **Epoch 2**: Holder receives 0.02 SOL reward
   - Accumulated: 0.01 SOL
   - Total: 0.03 SOL
   - 0.03 < 0.1 → Accumulate
   - Stored: 0.03 SOL

3. **Epoch 3**: Holder receives 0.05 SOL reward
   - Accumulated: 0.03 SOL
   - Total: 0.08 SOL
   - 0.08 < 0.1 → Accumulate
   - Stored: 0.08 SOL

4. **Epoch 4**: Holder receives 0.03 SOL reward
   - Accumulated: 0.08 SOL
   - Total: 0.11 SOL
   - 0.11 >= 0.1 → Pay out 0.11 SOL
   - Clear accumulated reward

## Configuration Example

```bash
# .env file
REWARD_VALUE_MODE=TOKEN
MIN_PAYOUT_TOKEN=60        # 60 NUKE tokens minimum
# or
REWARD_VALUE_MODE=USD
MIN_PAYOUT_USD=0.001       # 0.001 USD minimum
```

## Notes

- **Reward calculation formulas are unchanged**: The core reward calculation logic remains the same
- **Only distribution logic modified**: Accumulation happens after reward calculation
- **Backward compatible**: Falls back to legacy `MIN_SOL_PAYOUT` if threshold calculation fails
- **Error handling**: Accumulation failures don't block payouts for other holders

## Testing

To test the implementation:

1. Set thresholds to small values (for testing)
2. Run distribution with small reward amounts
3. Verify rewards accumulate in `unpaid-rewards.json`
4. Run distribution again until threshold is reached
5. Verify payout occurs and accumulated reward is cleared

## Files Modified

1. `backend/src/config/constants.ts`
   - Added `MIN_PAYOUT_CONFIG`
   - Added `getMinimumPayoutThreshold()` function

2. `backend/src/services/solDistributionService.ts`
   - Integrated accumulation logic into distribution flow
   - Added threshold checking and accumulation/payout decision logic

## Related Files

- `backend/src/services/unpaidRewardsService.ts` - Provides accumulation storage (created previously)
- `backend/src/config/env.ts` - Defines `REWARD_VALUE_MODE` configuration
