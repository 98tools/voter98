#!/usr/bin/env tsx

/**
 * Test script for the cron system
 * This script helps verify that the cron functions work correctly
 */

import { sendEmailsToParticipants, resetDailyEmailCounts } from '../src/utils/cron';

// Mock environment for testing
const mockEnv = {
  DB: null, // Will be set by the actual database connection
  VOTER_KV: null,
  JWT_SECRET: 'test-secret',
  FRONTEND_URL: 'http://localhost:5173'
};

async function testCronFunctions() {
  console.log('🧪 Testing Cron System Functions...\n');

  try {
    // Test 1: Daily Reset Function
    console.log('1️⃣ Testing Daily Reset Function...');
    const resetResult = await resetDailyEmailCounts(mockEnv);
    console.log('Reset Result:', JSON.stringify(resetResult, null, 2));
    console.log('✅ Daily reset test completed\n');

    // Test 2: Email Sending Function
    console.log('2️⃣ Testing Email Sending Function...');
    const emailResult = await sendEmailsToParticipants(mockEnv);
    console.log('Email Result:', JSON.stringify(emailResult, null, 2));
    console.log('✅ Email sending test completed\n');

    console.log('🎉 All cron function tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testCronFunctions();
}

export { testCronFunctions };
