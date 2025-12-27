# REWARD_VALUE_MODE Configuration

## Overview

The `REWARD_VALUE_MODE` configuration switch enables dual-mode operation for the reward system, allowing the application to work seamlessly in both devnet (TOKEN mode) and mainnet (USD mode) environments.

## Configuration Variable

**Environment Variable**: `REWARD_VALUE_MODE`

**Accepted Values**:
- `TOKEN` - For devnet environments (default)
- `USD` - For mainnet environments

**Default**: `TOKEN` (if not specified)

## Modes

### TOKEN Mode
- **Use Case**: Devnet testing and development
- **Behavior**: Uses raw NUKE token amounts without USD conversion
- **Example Display**: "1,000,000 NUKE"
- **When to Use**:
  - Testing on devnet
  - Token prices may not be accurate
  - USD conversion is not needed
  - Development and debugging

### USD Mode
- **Use Case**: Mainnet production
- **Behavior**: Uses USD values converted from token amounts
- **Example Display**: "$50.00"
- **When to Use**:
  - Production on mainnet
  - Accurate pricing is available
  - Users expect USD values
  - Real-world transactions

## Implementation

### Configuration Loading
The configuration is loaded in `backend/src/config/env.ts`:
- Validates that the value is either "TOKEN" or "USD"
- Defaults to "TOKEN" if not specified
- Case-insensitive (automatically converts to uppercase)

### Helper Functions
Located in `backend/src/config/constants.ts`:

```typescript
import { isTokenMode, isUsdMode } from './config/constants';

// Check if running in TOKEN mode
if (isTokenMode()) {
  // Use raw token amounts
}

// Check if running in USD mode
if (isUsdMode()) {
  // Use USD values
}
```

## Usage Examples

### Setting in .env file

```bash
# For devnet (default)
REWARD_VALUE_MODE=TOKEN

# For mainnet
REWARD_VALUE_MODE=USD
```

### Using in Code

```typescript
import { isTokenMode, isUsdMode } from './config/constants';

function formatRewardAmount(amount: bigint): string {
  if (isTokenMode()) {
    // Display raw token amount
    return `${formatTokenAmount(amount)} NUKE`;
  } else {
    // Convert to USD and display
    const usdValue = convertToUSD(amount);
    return `$${usdValue.toFixed(2)}`;
  }
}
```

## Testing

Run the test script to verify configuration:

```bash
cd backend
npx tsx test-reward-mode-config.ts
```

The test verifies:
1. Configuration loads correctly
2. Helper functions work as expected
3. Mode validation is correct

## Files Modified

1. **`backend/src/config/env.ts`**
   - Added `REWARD_VALUE_MODE` to `EnvConfig` interface
   - Added validation and default handling

2. **`backend/src/config/constants.ts`**
   - Added `isTokenMode()` helper function
   - Added `isUsdMode()` helper function
   - Added comprehensive documentation

3. **`backend/ENV_TEMPLATE.txt`**
   - Added `REWARD_VALUE_MODE` documentation

4. **`backend/test-reward-mode-config.ts`** (new)
   - Test script to verify configuration

## Important Notes

- **No existing logic modified**: This is infrastructure-only. No harvest or distribution logic was changed.
- **Backward compatible**: Defaults to TOKEN mode if not specified
- **Type-safe**: Uses TypeScript literal types for compile-time safety
- **Validated**: Throws error if invalid value is provided

## Next Steps

To use this configuration in your reward logic:
1. Import the helper functions where needed
2. Use `isTokenMode()` or `isUsdMode()` to branch logic
3. Implement TOKEN/USD display logic in your services
4. Test both modes before deploying

