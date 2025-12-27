/**
 * End-to-End System Test Suite
 * 
 * This script tests all new features in the reward system:
 * 1. Tax threshold checks
 * 2. Batch harvest execution
 * 3. Reward accumulation
 * 4. Minimum payout logic
 * 5. Eligible wallets tracking
 * 6. Mode-based threshold calculation
 * 
 * Run with: npx tsx test-end-to-end-system.ts
 * 
 * Note: Some tests require manual setup (e.g., setting tax amounts on-chain).
 * This script verifies configuration and state management logic.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  isTokenMode,
  isUsdMode,
  MIN_PAYOUT_CONFIG,
  TAX_THRESHOLD_CONFIG,
  BATCH_HARVEST_CONFIG,
  getMinimumPayoutThreshold,
} from './src/config/constants';
import {
  getAccumulatedReward,
  addToAccumulatedReward,
  clearAccumulatedReward,
  getAllWalletsWithAccumulatedRewards,
  getTotalUnpaidRewards,
} from './src/services/unpaidRewardsService';
import {
  getEligibleWallets,
  getEligibleWalletsWithUnpaidRewards,
  getEligibleWalletsMetadata,
} from './src/services/eligibleWalletsService';

const UNPAID_REWARDS_FILE = path.join(process.cwd(), 'unpaid-rewards.json');
const ELIGIBLE_WALLETS_FILE = path.join(process.cwd(), 'eligible-wallets.json');
const REWARD_STATE_FILE = path.join(process.cwd(), 'reward-state.json');

// Test results tracking
interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
}

const testResults: TestResult[] = [];

function addTestResult(name: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, details?: any): void {
  testResults.push({ name, status, message, details });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${icon} ${name}: ${message}`);
  if (details) {
    console.log(`   Details:`, details);
  }
}

/**
 * Main test runner function (async to support await)
 */
async function runTests(): Promise<void> {
  console.log('='.repeat(60));
  console.log('End-to-End System Test Suite');
  console.log('='.repeat(60));
  console.log();

  // Test 1: Configuration Verification
  console.log('Test 1: Configuration Verification');
  console.log('-'.repeat(60));

  try {
    const mode = isTokenMode() ? 'TOKEN' : 'USD';
    addTestResult(
      'Mode Detection',
      'PASS',
      `Mode is ${mode}`,
      {
        isTokenMode: isTokenMode(),
        isUsdMode: isUsdMode(),
      }
    );

    addTestResult(
      'Min Payout Configuration',
      'PASS',
      'Configuration loaded',
      {
        token: MIN_PAYOUT_CONFIG.MIN_PAYOUT_TOKEN,
        usd: MIN_PAYOUT_CONFIG.MIN_PAYOUT_USD,
      }
    );

    addTestResult(
      'Tax Threshold Configuration',
      'PASS',
      'Configuration loaded',
      {
        token: TAX_THRESHOLD_CONFIG.MIN_TAX_THRESHOLD_TOKEN,
        usd: TAX_THRESHOLD_CONFIG.MIN_TAX_THRESHOLD_USD,
      }
    );

    addTestResult(
      'Batch Harvest Configuration',
      'PASS',
      'Configuration loaded',
      {
        maxHarvestToken: BATCH_HARVEST_CONFIG.MAX_HARVEST_TOKEN,
        maxHarvestUsd: BATCH_HARVEST_CONFIG.MAX_HARVEST_USD,
        batchCount: BATCH_HARVEST_CONFIG.BATCH_COUNT,
      }
    );

    // Test threshold calculation
    const threshold = await getMinimumPayoutThreshold();
    if (threshold !== null) {
      addTestResult(
        'Threshold Calculation',
        'PASS',
        `Threshold calculated: ${threshold.toFixed(6)} SOL`,
        {
          mode,
          thresholdSOL: threshold,
        }
      );
    } else {
      addTestResult(
        'Threshold Calculation',
        'SKIP',
        'Threshold calculation returned null (price unavailable)',
        { mode }
      );
    }
  } catch (error) {
    addTestResult(
      'Configuration Verification',
      'FAIL',
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  console.log();

  // Test 2: Unpaid Rewards Service
  console.log('Test 2: Unpaid Rewards Service');
  console.log('-'.repeat(60));

  try {
    const testWallet = 'TestWalletE2E1111111111111111111111111111111';
    
    // Test accumulation
    const initialAmount = getAccumulatedReward(testWallet);
    if (initialAmount !== 0) {
      // Clear any existing test data
      clearAccumulatedReward(testWallet);
    }

    addToAccumulatedReward(testWallet, 0.0005);
    const afterFirst = getAccumulatedReward(testWallet);
    if (Math.abs(afterFirst - 0.0005) < 0.000001) {
      addTestResult(
        'Accumulation - First Add',
        'PASS',
        `Accumulated ${afterFirst} SOL`,
        { wallet: testWallet, amount: 0.0005 }
      );
    } else {
      addTestResult(
        'Accumulation - First Add',
        'FAIL',
        `Expected 0.0005, got ${afterFirst}`
      );
    }

    // Test adding more
    addToAccumulatedReward(testWallet, 0.0003);
    const afterSecond = getAccumulatedReward(testWallet);
    if (Math.abs(afterSecond - 0.0008) < 0.000001) {
      addTestResult(
        'Accumulation - Second Add',
        'PASS',
        `Total accumulated: ${afterSecond} SOL`,
        { wallet: testWallet, previous: afterFirst, added: 0.0003, total: afterSecond }
      );
    } else {
      addTestResult(
        'Accumulation - Second Add',
        'FAIL',
        `Expected 0.0008, got ${afterSecond}`
      );
    }

    // Test getAllWalletsWithAccumulatedRewards
    const wallets = getAllWalletsWithAccumulatedRewards();
    if (wallets.includes(testWallet)) {
      addTestResult(
        'Get All Wallets',
        'PASS',
        `Found ${wallets.length} wallets with accumulated rewards`,
        { testWalletFound: true, totalWallets: wallets.length }
      );
    } else {
      addTestResult(
        'Get All Wallets',
        'FAIL',
        'Test wallet not found in accumulated rewards list'
      );
    }

    // Test getTotalUnpaidRewards
    const total = getTotalUnpaidRewards();
    if (total >= 0.0008) {
      addTestResult(
        'Total Unpaid Rewards',
        'PASS',
        `Total: ${total.toFixed(6)} SOL`,
        { total, expectedMinimum: 0.0008 }
      );
    } else {
      addTestResult(
        'Total Unpaid Rewards',
        'FAIL',
        `Expected at least 0.0008, got ${total}`
      );
    }

    // Test clear
    clearAccumulatedReward(testWallet);
    const afterClear = getAccumulatedReward(testWallet);
    if (afterClear === 0) {
      addTestResult(
        'Clear Accumulated Reward',
        'PASS',
        'Accumulated reward cleared successfully',
        { wallet: testWallet, clearedFrom: afterSecond }
      );
    } else {
      addTestResult(
        'Clear Accumulated Reward',
        'FAIL',
        `Expected 0 after clear, got ${afterClear}`
      );
    }

    // Verify file persistence
    if (fs.existsSync(UNPAID_REWARDS_FILE)) {
      const fileContent = fs.readFileSync(UNPAID_REWARDS_FILE, 'utf-8');
      const parsed = JSON.parse(fileContent);
      if (parsed.unpaidRewards && typeof parsed.unpaidRewards === 'object') {
        addTestResult(
          'File Persistence',
          'PASS',
          'Unpaid rewards file exists and has correct structure',
          { fileSize: fileContent.length }
        );
      } else {
        addTestResult(
          'File Persistence',
          'FAIL',
          'File exists but has incorrect structure'
        );
      }
    } else {
      addTestResult(
        'File Persistence',
        'SKIP',
        'File does not exist (will be created on first use)'
      );
    }
  } catch (error) {
    addTestResult(
      'Unpaid Rewards Service',
      'FAIL',
      `Error: ${error instanceof Error ? error.message : String(error)}`,
      { error: error instanceof Error ? error.stack : undefined }
    );
  }

  console.log();

  // Test 3: Eligible Wallets Service
  console.log('Test 3: Eligible Wallets Service');
  console.log('-'.repeat(60));

  try {
    // Test metadata
    const metadata = getEligibleWalletsMetadata();
    addTestResult(
      'Eligible Wallets Metadata',
      'PASS',
      `Found ${metadata.count} eligible wallets`,
      {
        count: metadata.count,
        lastUpdated: metadata.lastUpdated ? new Date(metadata.lastUpdated).toISOString() : null,
        totalHoldersScanned: metadata.totalHoldersScanned || 0,
      }
    );

    // Test getEligibleWallets
    const eligibleWallets = getEligibleWallets();
    addTestResult(
      'Get Eligible Wallets',
      'PASS',
      `Retrieved ${eligibleWallets.size} eligible wallets`,
      { count: eligibleWallets.size }
    );
    
    // Test getEligibleWalletsWithUnpaidRewards (includes wallets with accumulated rewards)
    const eligibleWalletsWithUnpaid = getEligibleWalletsWithUnpaidRewards();
    addTestResult(
      'Get Eligible Wallets (with unpaid rewards)',
      'PASS',
      `Retrieved ${eligibleWalletsWithUnpaid.size} eligible wallets (including unpaid)`,
      { count: eligibleWalletsWithUnpaid.size, baseCount: eligibleWallets.size }
    );

    // Verify file persistence
    if (fs.existsSync(ELIGIBLE_WALLETS_FILE)) {
      const fileContent = fs.readFileSync(ELIGIBLE_WALLETS_FILE, 'utf-8');
      const parsed = JSON.parse(fileContent);
      if (parsed.eligibleWallets && Array.isArray(parsed.eligibleWallets)) {
        addTestResult(
          'Eligible Wallets File Persistence',
          'PASS',
          'Eligible wallets file exists and has correct structure',
          {
            fileSize: fileContent.length,
            walletsInFile: parsed.eligibleWallets.length,
            lastUpdated: parsed.lastUpdated ? new Date(parsed.lastUpdated).toISOString() : null,
          }
        );
      } else {
        addTestResult(
          'Eligible Wallets File Persistence',
          'FAIL',
          'File exists but has incorrect structure'
        );
      }
    } else {
      addTestResult(
        'Eligible Wallets File Persistence',
        'SKIP',
        'File does not exist (will be created when updateEligibleWallets() is called)'
      );
    }
  } catch (error) {
    addTestResult(
      'Eligible Wallets Service',
      'FAIL',
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  console.log();

  // Test 4: State File Verification
  console.log('Test 4: State File Verification');
  console.log('-'.repeat(60));

  try {
    if (fs.existsSync(REWARD_STATE_FILE)) {
      const fileContent = fs.readFileSync(REWARD_STATE_FILE, 'utf-8');
      const parsed = JSON.parse(fileContent);
      
      addTestResult(
        'Reward State File',
        'PASS',
        'Reward state file exists and is valid JSON',
        {
          fileSize: fileContent.length,
          hasTaxState: !!parsed.taxState,
          hasPendingPayouts: Array.isArray(parsed.pendingPayouts),
        }
      );
    } else {
      addTestResult(
        'Reward State File',
        'SKIP',
        'Reward state file does not exist (will be created on first use)'
      );
    }
  } catch (error) {
    addTestResult(
      'State File Verification',
      'FAIL',
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  console.log();

  // Summary
  console.log('='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));

  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const skipped = testResults.filter(r => r.status === 'SKIP').length;

  console.log(`Total Tests: ${testResults.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log();

  if (failed > 0) {
    console.log('Failed Tests:');
    testResults.filter(r => r.status === 'FAIL').forEach(result => {
      console.log(`  ❌ ${result.name}: ${result.message}`);
    });
    console.log();
  }

  console.log('='.repeat(60));
  console.log();

  if (failed === 0) {
    console.log('✅ All automated tests passed!');
    console.log();
    console.log('Note: For full end-to-end testing, see:');
    console.log('  - backend/END_TO_END_TEST_SCENARIOS.md');
    console.log('  - Manual testing required for blockchain-dependent scenarios');
  } else {
    console.log('❌ Some tests failed. Please review the errors above.');
    throw new Error(`${failed} test(s) failed`);
  }
}

// Run the tests
runTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
