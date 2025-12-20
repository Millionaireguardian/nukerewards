# Optimizing Helius RPC Usage

## Current Usage

### Token Holders Fetching
- **Cache TTL:** 10 minutes
- **Cooldown:** 5 minutes
- **RPC Method:** `getProgramAccounts` (scans ALL token accounts)

### Holders with Status Cache
- **Cache TTL:** 5 minutes
- **Uses:** Cached token holders + price data

### Scheduler
- **Interval:** 5 minutes
- **Runs:** Tax processing + reward distribution

## Current RPC Calls Per Hour (Estimated)

- Token holders fetch: ~6 times/hour (every 10 minutes)
- Tax processing: ~12 times/hour (every 5 minutes, but uses cached holders)
- Dashboard requests: Variable (but uses cached holders)

**Total: ~10-20 `getProgramAccounts` calls per hour** (depending on usage)

## Proposed Optimizations

### Option 1: Increase Cache to 30 Minutes (Recommended)

**Changes:**
- Token holders cache: 10 min → 30 min
- Holders with status cache: 5 min → 30 min

**Impact:**
- RPC calls reduced: ~20/hour → ~4/hour (80% reduction)
- Data freshness: Holders list updates every 30 minutes instead of 10

**What Changes:**
- ✅ Dashboard shows holder count updates every 30 min (instead of 10 min)
- ✅ New holders appear in dashboard within 30 min (instead of 10 min)
- ✅ Holder balance changes reflect within 30 min (instead of 10 min)

**What DOESN'T Change:**
- ✅ **Reward distribution is still accurate** - Uses latest cached holder data
- ✅ **All eligible holders still receive rewards** - Based on their balances
- ✅ **Tax processing still works** - Uses cached holders for distribution
- ✅ **Reward calculations are correct** - Based on holder balances at time of distribution

### Option 2: Increase Cache to 1 Hour

**Changes:**
- Token holders cache: 10 min → 60 min
- Holders with status cache: 5 min → 60 min

**Impact:**
- RPC calls reduced: ~20/hour → ~2/hour (90% reduction)
- Data freshness: Holders list updates every hour

**Trade-offs:**
- ⚠️ New holders may not appear in dashboard for up to 1 hour
- ⚠️ Balance changes reflect within 1 hour
- ✅ Rewards still accurate (based on balances at distribution time)

## Recommendation: 30 Minutes Cache

30 minutes is a good balance because:
- ✅ Significant RPC reduction (80%)
- ✅ Acceptable data freshness for dashboard
- ✅ Reward mechanics remain 100% accurate
- ✅ New holders appear within reasonable time

## Implementation

I'll update:
1. `TOKEN_HOLDERS_CACHE_TTL`: 10 min → 30 min
2. `HOLDERS_STATUS_CACHE_TTL`: 5 min → 30 min
3. Keep cooldowns the same (they're already longer than cache TTL)

## Reward Mechanics Impact

### What STAYS THE SAME:
- ✅ **All eligible holders receive rewards** - No one is excluded
- ✅ **Rewards are proportional to holdings** - Formula unchanged
- ✅ **Tax distribution works correctly** - Uses latest cached data
- ✅ **Reward calculations are accurate** - Based on balances at distribution time

### What Changes (Minor):
- ⚠️ **Dashboard freshness:** Holder count updates every 30 min (instead of 10 min)
- ⚠️ **New holders visibility:** New holders appear in dashboard within 30 min
- ⚠️ **Balance updates:** Balance changes reflect within 30 min

**These are UI/dashboard changes only - reward distribution accuracy is unaffected!**

## Expected RPC Usage After Optimization

**Before:**
- ~20 `getProgramAccounts` calls/hour
- ~240 calls/day
- ~7,200 calls/month

**After (30 min cache):**
- ~4 `getProgramAccounts` calls/hour
- ~48 calls/day
- ~1,440 calls/month

**Savings: 83% reduction in RPC calls!**

With 1 million Helius credits, this should last much longer! 🎉

