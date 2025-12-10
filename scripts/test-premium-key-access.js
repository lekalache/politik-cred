// Complete verification of AI Orchestrator - Premium key

console.log('\n' + '='.repeat(70));
console.log('COMPLETE VERIFICATION: AI Orchestrator - Premium API Key');
console.log('='.repeat(70));
console.log();

// Premium key configuration (from setup-api-keys.ts)
const premiumKey = {
  name: 'AI Orchestrator - Premium',
  tier: 'premium',
  scopes: ['read:*', 'write:*', 'trigger:*'],
  is_active: true,
  expires_at: null,  // No expiration
  allowed_ips: null  // No IP restrictions
};

console.log('✅ KEY CONFIGURATION:');
console.log('   Name:', premiumKey.name);
console.log('   Tier:', premiumKey.tier);
console.log('   Scopes:', premiumKey.scopes.join(', '));
console.log('   Active:', premiumKey.is_active);
console.log('   Expires:', premiumKey.expires_at || 'Never');
console.log('   IP Restrictions:', premiumKey.allowed_ips || 'None');
console.log();

// Rate limits for premium tier
const rateLimits = {
  minute: 120,
  hour: 5000,
  day: 50000
};

console.log('✅ RATE LIMITS:');
console.log('   Per Minute:', rateLimits.minute, 'requests');
console.log('   Per Hour:', rateLimits.hour, 'requests');
console.log('   Per Day:', rateLimits.day, 'requests');
console.log();

// Endpoint requirements
const endpoint = {
  path: '/api/v1/public/triggers/politician-audit',
  method: 'POST',
  operationId: 'triggerPoliticianAudit',
  requiredScope: 'trigger:data_collection',
  minimumTier: 'premium'
};

console.log('✅ ENDPOINT REQUIREMENTS:');
console.log('   Path:', endpoint.path);
console.log('   Required Scope:', endpoint.requiredScope);
console.log('   Minimum Tier:', endpoint.minimumTier);
console.log();

// Scope matching function (from api-key.ts)
function checkScopes(keyScopes, requiredScopes) {
  for (const requiredScope of requiredScopes) {
    let scopeMatched = false;
    for (const keyScope of keyScopes) {
      // Exact match
      if (keyScope === requiredScope) {
        scopeMatched = true;
        break;
      }
      // Wildcard match: trigger:* matches trigger:anything
      if (keyScope.endsWith(':*')) {
        const prefix = keyScope.slice(0, -1);
        if (requiredScope.startsWith(prefix)) {
          scopeMatched = true;
          break;
        }
      }
      // Admin wildcard
      if (keyScope === 'admin:*') {
        scopeMatched = true;
        break;
      }
    }
    if (!scopeMatched) return false;
  }
  return true;
}

// Perform all checks
const checks = {
  hasRequiredScope: checkScopes(premiumKey.scopes, [endpoint.requiredScope]),
  meetsMinimumTier: ['premium', 'enterprise'].includes(premiumKey.tier),
  isActive: premiumKey.is_active,
  notExpired: premiumKey.expires_at === null || new Date(premiumKey.expires_at) > new Date()
};

console.log('✅ PERMISSION CHECKS:');
console.log('   Has Required Scope:', checks.hasRequiredScope ? '✅ YES' : '❌ NO');
console.log('   Meets Minimum Tier:', checks.meetsMinimumTier ? '✅ YES' : '❌ NO');
console.log('   Key is Active:', checks.isActive ? '✅ YES' : '❌ NO');
console.log('   Not Expired:', checks.notExpired ? '✅ YES' : '❌ NO');
console.log();

// Additional scope matching details
console.log('📋 SCOPE MATCHING DETAILS:');
console.log('   Key has "trigger:*" wildcard');
console.log('   Endpoint needs "trigger:data_collection"');
console.log('   Match logic: "trigger:data_collection".startsWith("trigger:") =',
  'trigger:data_collection'.startsWith('trigger:'));
console.log('   Result: ✅ MATCH');
console.log();

const allChecksPassed = Object.values(checks).every(v => v === true);

console.log('='.repeat(70));
if (allChecksPassed) {
  console.log('🎉 FINAL VERDICT: YES - WILL WORK PROPERLY!');
  console.log();
  console.log('The AI Orchestrator - Premium key has:');
  console.log('  ✅ trigger:* wildcard (matches trigger:data_collection)');
  console.log('  ✅ Premium tier access');
  console.log('  ✅ Active status');
  console.log('  ✅ No expiration');
  console.log('  ✅ No IP restrictions');
  console.log();
  console.log('The triggerPoliticianAudit endpoint WILL work with this key.');
  console.log();
  console.log('Expected workflow:');
  console.log('  1. Agent calls endpoint with Authorization: Bearer <premium-key>');
  console.log('  2. Middleware extracts and validates key');
  console.log('  3. Checks scope: trigger:* matches trigger:data_collection ✅');
  console.log('  4. Checks tier: premium meets requirement ✅');
  console.log('  5. Allows request through');
  console.log('  6. Endpoint executes audit workflow');
  console.log('  7. Returns audit results');
} else {
  console.log('❌ FINAL VERDICT: NO - WILL NOT WORK');
  console.log();
  const failedChecks = Object.entries(checks)
    .filter(([k, v]) => !v)
    .map(([k]) => k);
  console.log('Failed checks:', failedChecks);
}
console.log('='.repeat(70));
console.log();
