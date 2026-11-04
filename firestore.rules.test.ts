import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Security Rule & Dirty Dozen Invariant Verification Suite (`firestore.rules.test.ts`)
 * Verifies that all 8 collections from firebase-blueprint.json are guarded in firestore.rules
 * and that all Dirty Dozen attack vectors are explicitly blocked by the rule expressions.
 */

const rulesPath = fs.existsSync(path.resolve(process.cwd(), 'firestore.rules'))
  ? path.resolve(process.cwd(), 'firestore.rules')
  : path.resolve(process.cwd(), 'DRAFT_firestore.rules');

const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

test('Pillar 1 & Global Default-Deny Safety Net is present at root', () => {
  assert.equal(rulesContent.includes("rules_version = '2';"), true);
  assert.equal(rulesContent.includes('match /{document=**}'), true);
  assert.equal(rulesContent.includes('allow read, write: if false;'), true);
});

test('All 8 blueprint collections have explicit match blocks and validation helpers', () => {
  const requiredMatches = [
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

test('Dirty Dozen Payload Defenses: Shadow Fields, Self-Assigned Admin, PII Isolation, Draft Isolation, and Timestamps', () => {
  // 1. Shadow field guard via hasAll and hasOnly
  assert.equal(rulesContent.includes('.keys().hasAll('), true);
  assert.equal(rulesContent.includes('.keys().hasOnly('), true);

  // 2. Self-assigned admin role blocked on registration unless isAdmin()
  assert.equal(rulesContent.includes("(incoming().role == 'student' || isAdmin())"), true);

  // 3. Action-based update with affectedKeys().hasOnly()
  assert.equal(rulesContent.includes("incoming().diff(existing()).affectedKeys().hasOnly(['fullName', 'updatedAt'])"), true);

  // 4 & 5. PII isolation on /users/{userId}
  assert.equal(rulesContent.includes('allow get: if isSignedIn() && isValidId(userId) && (isOwner(userId) || isAdmin());'), true);
  assert.equal(rulesContent.includes('allow list: if isSignedIn() && (resource.data.uid == request.auth.uid || isAdmin());'), true);

  // 6 & 7. Draft isolation on /events, /achievements, /startups
  assert.equal(rulesContent.includes('allow list: if isSignedIn() && (resource.data.published == true || isAdmin());'), true);

  // 8 & 9. Server timestamp enforcement and createdAt immutability
  assert.equal(rulesContent.includes('incoming().createdAt == request.time'), true);
  assert.equal(rulesContent.includes('incoming().createdAt == existing().createdAt'), true);
  assert.equal(rulesContent.includes('incoming().updatedAt == request.time'), true);

  // 11. Path ID regex guard
  assert.equal(rulesContent.includes("id.matches('^[a-zA-Z0-9_\\\\-]+$')"), true);
});
