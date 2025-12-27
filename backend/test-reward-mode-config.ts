/**
 * Test script to verify REWARD_VALUE_MODE configuration
 * 
 * This script tests:
 * 1. Configuration loads correctly
 * 2. Helper functions work as expected
 * 3. Default behavior (TOKEN mode) when not specified
 * 
 * Run with: npx tsx test-reward-mode-config.ts
 */

import { env } from './src/config/env';
import { isTokenMode, isUsdMode } from './src/config/constants';

console.log('='.repeat(60));
console.log('Testing REWARD_VALUE_MODE Configuration');
console.log('='.repeat(60));
console.log();

// Test 1: Configuration loads
console.log('Test 1: Configuration Loading');
console.log('-'.repeat(60));
try {
  const mode = env.REWARD_VALUE_MODE;
  console.log(`✅ Configuration loaded successfully`);
  console.log(`   REWARD_VALUE_MODE: ${mode}`);
  console.log(`   Type: ${typeof mode}`);
  console.log();
} catch (error) {
  console.error(`❌ Configuration failed to load:`, error);
  process.exit(1);
}

// Test 2: Helper functions
console.log('Test 2: Helper Functions');
console.log('-'.repeat(60));
const tokenMode = isTokenMode();
const usdMode = isUsdMode();

console.log(`isTokenMode(): ${tokenMode}`);
console.log(`isUsdMode(): ${usdMode}`);

if (tokenMode === usdMode) {
  console.error(`❌ ERROR: Both functions returned the same value!`);
  console.error(`   This should never happen - one must be true, one must be false`);
  process.exit(1);
}

if (tokenMode) {
  console.log(`✅ TOKEN mode is active`);
  console.log(`   Expected: isTokenMode() = true, isUsdMode() = false`);
} else if (usdMode) {
  console.log(`✅ USD mode is active`);
  console.log(`   Expected: isTokenMode() = false, isUsdMode() = true`);
} else {
  console.error(`❌ ERROR: Neither mode is active!`);
  process.exit(1);
}
console.log();

// Test 3: Mode validation
console.log('Test 3: Mode Validation');
console.log('-'.repeat(60));
const currentMode = env.REWARD_VALUE_MODE;
if (currentMode === 'TOKEN' || currentMode === 'USD') {
  console.log(`✅ Mode is valid: ${currentMode}`);
} else {
  console.error(`❌ ERROR: Invalid mode detected: ${currentMode}`);
  console.error(`   Expected: "TOKEN" or "USD"`);
  process.exit(1);
}
console.log();

// Summary
console.log('='.repeat(60));
console.log('Test Summary');
console.log('='.repeat(60));
console.log(`✅ Configuration: LOADED`);
console.log(`✅ Helper Functions: WORKING`);
console.log(`✅ Current Mode: ${currentMode}`);
console.log();
console.log('All tests passed! 🎉');
console.log();
console.log('Usage:');
console.log(`  - Set REWARD_VALUE_MODE=TOKEN in .env for devnet (raw token amounts)`);
console.log(`  - Set REWARD_VALUE_MODE=USD in .env for mainnet (USD values)`);
console.log(`  - Default: TOKEN (if not specified)`);
console.log();

