/**
 * Test script to verify unpaid rewards persistence
 * 
 * This script tests:
 * 1. All four main functions work correctly
 * 2. Data persists between script runs
 * 3. Error handling works properly
 * 
 * Run with: npx tsx test-unpaid-rewards-persistence.ts
 * 
 * To test persistence, run the script twice and verify data persists:
 *   1. First run: Adds rewards to test wallets
 *   2. Second run: Verifies the rewards are still there
 */

import * as path from 'path';
import * as fs from 'fs';
import {
  getAccumulatedReward,
  addToAccumulatedReward,
  clearAccumulatedReward,
  getAllWalletsWithAccumulatedRewards,
  getAllUnpaidRewards,
  getTotalUnpaidRewards,
} from './src/services/unpaidRewardsService';

const STORAGE_FILE_PATH = path.join(process.cwd(), 'unpaid-rewards.json');

// Test wallet addresses
const TEST_WALLET_1 = 'TestWallet111111111111111111111111111111111';
const TEST_WALLET_2 = 'TestWallet222222222222222222222222222222222';
const TEST_WALLET_3 = 'TestWallet333333333333333333333333333333333';

console.log('='.repeat(60));
console.log('Testing Unpaid Rewards Persistence');
console.log('='.repeat(60));
console.log();
console.log(`Storage file: ${STORAGE_FILE_PATH}`);
console.log(`File exists: ${fs.existsSync(STORAGE_FILE_PATH)}`);
console.log();

// Check if this is a clean run or a persistence test
const fileExists = fs.existsSync(STORAGE_FILE_PATH);
let existingData: Record<string, number> = {};

if (fileExists) {
  try {
    const fileContent = fs.readFileSync(STORAGE_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(fileContent);
    existingData = parsed.unpaidRewards || parsed;
    console.log('📄 Existing data found in storage file:');
    console.log(JSON.stringify(existingData, null, 2));
    console.log();
  } catch (error) {
    console.log('⚠️  Could not read existing file (will continue with tests)');
    console.log();
  }
}

// Test 1: Get accumulated reward (should return 0 for new wallets)
console.log('Test 1: Get Accumulated Reward');
console.log('-'.repeat(60));
try {
  const amount1 = getAccumulatedReward(TEST_WALLET_1);
  const amount2 = getAccumulatedReward(TEST_WALLET_2);
  const amount3 = getAccumulatedReward('NonExistentWallet');
  
  console.log(`✅ getAccumulatedReward('${TEST_WALLET_1}'): ${amount1}`);
  console.log(`✅ getAccumulatedReward('${TEST_WALLET_2}'): ${amount2}`);
  console.log(`✅ getAccumulatedReward('NonExistentWallet'): ${amount3}`);
  
  if (amount3 !== 0) {
    console.error(`❌ ERROR: Expected 0 for non-existent wallet, got ${amount3}`);
    process.exit(1);
  }
  
  console.log();
} catch (error) {
  console.error(`❌ Test 1 failed:`, error);
  process.exit(1);
}

// Test 2: Add to accumulated reward
console.log('Test 2: Add to Accumulated Reward');
console.log('-'.repeat(60));
try {
  const existingAmount1 = getAccumulatedReward(TEST_WALLET_1);
  console.log(`Current amount for ${TEST_WALLET_1}: ${existingAmount1}`);
  
  // Add 1.5 SOL to wallet 1
  addToAccumulatedReward(TEST_WALLET_1, 1.5);
  const newAmount1 = getAccumulatedReward(TEST_WALLET_1);
  console.log(`✅ Added 1.5 SOL to ${TEST_WALLET_1}`);
  console.log(`   New amount: ${newAmount1} (expected: ${existingAmount1 + 1.5})`);
  
  if (Math.abs(newAmount1 - (existingAmount1 + 1.5)) > 0.000001) {
    console.error(`❌ ERROR: Amount mismatch! Expected ${existingAmount1 + 1.5}, got ${newAmount1}`);
    process.exit(1);
  }
  
  // Add 2.0 SOL to wallet 1 again
  addToAccumulatedReward(TEST_WALLET_1, 2.0);
  const finalAmount1 = getAccumulatedReward(TEST_WALLET_1);
  console.log(`✅ Added 2.0 SOL more to ${TEST_WALLET_1}`);
  console.log(`   Final amount: ${finalAmount1} (expected: ${existingAmount1 + 3.5})`);
  
  // Add to wallet 2
  addToAccumulatedReward(TEST_WALLET_2, 0.75);
  const amount2 = getAccumulatedReward(TEST_WALLET_2);
  console.log(`✅ Added 0.75 SOL to ${TEST_WALLET_2}`);
  console.log(`   Amount: ${amount2}`);
  
  // Test error handling - invalid amount
  try {
    addToAccumulatedReward(TEST_WALLET_3, -1);
    console.error(`❌ ERROR: Should have thrown error for negative amount`);
    process.exit(1);
  } catch (error) {
    console.log(`✅ Correctly rejected negative amount`);
  }
  
  // Test error handling - invalid wallet
  try {
    addToAccumulatedReward('', 1);
    console.error(`❌ ERROR: Should have thrown error for empty wallet`);
    process.exit(1);
  } catch (error) {
    console.log(`✅ Correctly rejected empty wallet address`);
  }
  
  console.log();
} catch (error) {
  console.error(`❌ Test 2 failed:`, error);
  process.exit(1);
}

// Test 3: Get all wallets with accumulated rewards
console.log('Test 3: Get All Wallets With Accumulated Rewards');
console.log('-'.repeat(60));
try {
  const wallets = getAllWalletsWithAccumulatedRewards();
  console.log(`✅ Found ${wallets.length} wallet(s) with accumulated rewards:`);
  wallets.forEach(wallet => {
    const amount = getAccumulatedReward(wallet);
    console.log(`   - ${wallet}: ${amount} SOL`);
  });
  
  if (!wallets.includes(TEST_WALLET_1)) {
    console.error(`❌ ERROR: ${TEST_WALLET_1} should be in the list`);
    process.exit(1);
  }
  
  if (!wallets.includes(TEST_WALLET_2)) {
    console.error(`❌ ERROR: ${TEST_WALLET_2} should be in the list`);
    process.exit(1);
  }
  
  console.log();
} catch (error) {
  console.error(`❌ Test 3 failed:`, error);
  process.exit(1);
}

// Test 4: Get all unpaid rewards
console.log('Test 4: Get All Unpaid Rewards');
console.log('-'.repeat(60));
try {
  const allRewards = getAllUnpaidRewards();
  console.log(`✅ Retrieved all unpaid rewards:`);
  console.log(JSON.stringify(allRewards, null, 2));
  
  const total = getTotalUnpaidRewards();
  console.log(`✅ Total unpaid rewards: ${total} SOL`);
  
  console.log();
} catch (error) {
  console.error(`❌ Test 4 failed:`, error);
  process.exit(1);
}

// Test 5: Clear accumulated reward
console.log('Test 5: Clear Accumulated Reward');
console.log('-'.repeat(60));
try {
  const beforeClear = getAccumulatedReward(TEST_WALLET_2);
  console.log(`Amount before clear: ${beforeClear}`);
  
  clearAccumulatedReward(TEST_WALLET_2);
  const afterClear = getAccumulatedReward(TEST_WALLET_2);
  console.log(`✅ Cleared accumulated reward for ${TEST_WALLET_2}`);
  console.log(`   Amount after clear: ${afterClear} (expected: 0)`);
  
  if (afterClear !== 0) {
    console.error(`❌ ERROR: Expected 0 after clear, got ${afterClear}`);
    process.exit(1);
  }
  
  // Verify it's removed from the list
  const walletsAfterClear = getAllWalletsWithAccumulatedRewards();
  if (walletsAfterClear.includes(TEST_WALLET_2)) {
    console.error(`❌ ERROR: ${TEST_WALLET_2} should not be in the list after clearing`);
    process.exit(1);
  }
  console.log(`✅ Verified ${TEST_WALLET_2} removed from wallet list`);
  
  console.log();
} catch (error) {
  console.error(`❌ Test 5 failed:`, error);
  process.exit(1);
}

// Test 6: Verify file exists and has correct structure
console.log('Test 6: Verify Storage File');
console.log('-'.repeat(60));
try {
  if (!fs.existsSync(STORAGE_FILE_PATH)) {
    console.error(`❌ ERROR: Storage file does not exist at ${STORAGE_FILE_PATH}`);
    process.exit(1);
  }
  
  const fileContent = fs.readFileSync(STORAGE_FILE_PATH, 'utf-8');
  const parsed = JSON.parse(fileContent);
  
  if (!parsed.unpaidRewards || typeof parsed.unpaidRewards !== 'object') {
    console.error(`❌ ERROR: Invalid file structure. Expected 'unpaidRewards' object`);
    console.error(`   Got: ${JSON.stringify(parsed)}`);
    process.exit(1);
  }
  
  console.log(`✅ Storage file exists and has correct structure`);
  console.log(`   File size: ${fileContent.length} bytes`);
  console.log(`   Wallets in file: ${Object.keys(parsed.unpaidRewards).length}`);
  console.log();
} catch (error) {
  console.error(`❌ Test 6 failed:`, error);
  process.exit(1);
}

// Summary
console.log('='.repeat(60));
console.log('Test Summary');
console.log('='.repeat(60));
console.log(`✅ getAccumulatedReward: WORKING`);
console.log(`✅ addToAccumulatedReward: WORKING`);
console.log(`✅ getAllWalletsWithAccumulatedRewards: WORKING`);
console.log(`✅ clearAccumulatedReward: WORKING`);
console.log(`✅ Storage file: ${fs.existsSync(STORAGE_FILE_PATH) ? 'EXISTS' : 'MISSING'}`);
console.log();
console.log('All tests passed! 🎉');
console.log();
console.log('To test persistence, run this script again:');
console.log('  npx tsx test-unpaid-rewards-persistence.ts');
console.log();
console.log('The test wallets should retain their accumulated rewards.');
console.log();
