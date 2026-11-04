import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Security Rule & Dirty Dozen Invariant Verification Suite (`firestore.rules.test.ts`)
 * Verifies that all collections from firebase-blueprint.json are guarded in firestore.rules,
 * that no hardcoded grant codes exist, and that all Dirty Dozen attack vectors are blocked.
 */

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

test('Pillar 1 & Global Default-Deny Safety Net is present at root', () => {
  assert.equal(rulesContent.includes("rules_version = '2';"), true);
  assert.equal(rulesContent.includes('match /{document=**}'), true);
  assert.equal(rulesContent.includes('allow read, write: if false;'), true);
});

test('No hardcoded security grant codes exist in firestore.rules', () => {
  assert.equal(rulesContent.includes('serverGrantCode'), false);
  assert.equal(rulesContent.includes('AURORA_ECELL_SERVER_VERIFIED'), false);
});

test('All blueprint collections have explicit match blocks and validation helpers', () => {
  const requiredMatches = [
    'match /auth_credentials/{userId}',
    'match /users/{userId}',
    'match /admins/{adminUid}',
    'match /events/{eventId}',
    'match /achievements/{achievementId}',
    'match /startups/{startupId}',
    'match /login_activity/{logId}',
    'match /admin_logs/{logId}',
    'match /settings/{settingId}',
  ];

  for (const m of requiredMatches) {
    assert.equal(rulesContent.includes(m), true, `Missing match block: ${m}`);
  }

  const requiredValidators = [
    'isValidAuthCredential',
    'isValidUserProfile',
    'isValidAdminRole',
    'isValidEventItem',
    'isValidAchievementItem',
    'isValidStartupItem',
    'isValidLoginActivity',
    'isValidAdminActivityLog',
    'isValidSyncSettings',
  ];

  for (const v of requiredValidators) {
    assert.equal(rulesContent.includes(`function ${v}(data)`), true, `Missing validator: ${v}`);
  }
});

test('Dirty Dozen Payload Defenses: Shadow Fields, Self-Assigned Admin, Credential Enumeration Block, and Timestamps', () => {
  assert.equal(rulesContent.includes('.keys().hasAll('), true);
  assert.equal(rulesContent.includes('.keys().hasOnly('), true);
  assert.equal(
    rulesContent.includes(
      "(incoming().role == 'student' || isAuthorizedAdminEmailString(incoming().email) || isAdmin())"
    ),
    true
  );
  assert.equal(
    rulesContent.includes("incoming().diff(existing()).affectedKeys().hasOnly(['fullName', 'updatedAt'])"),
    true
  );
  assert.equal(rulesContent.includes('incoming().createdAt == request.time'), true);
  assert.equal(rulesContent.includes('incoming().createdAt == existing().createdAt'), true);
  assert.equal(rulesContent.includes('incoming().updatedAt == request.time'), true);
  assert.equal(rulesContent.includes("id.matches('^[a-zA-Z0-9_\\\\-]+$')"), true);
});
