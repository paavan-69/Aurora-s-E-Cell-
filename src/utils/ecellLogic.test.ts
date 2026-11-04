import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildJoinEcellMailto,
  calculateDashboardStats,
  deduplicateUserRegistrations,
  filterUsers,
  formatLoginActivitySheetRows,
  formatUserRegistrationSheetRows,
  isAuthorizedAdminEmail,
  validateAchievementInput,
  validateAuthInput,
  validateEventInput,
  validateStartupInput,
  type UserProfileRecord,
  type EventRecord,
  type AchievementRecord,
  type StartupRecord,
  type LoginActivityRecord,
} from './ecellLogic';

test('buildJoinEcellMailto encodes recipient, subject, and exact preset message', () => {
  const mailto = buildJoinEcellMailto();
  assert.equal(mailto.startsWith('mailto:edcellaurora@gmail.com?'), true);
  assert.equal(mailto.includes('subject=Interested%20in%20Joining%20Aurora%20E-Cell'), true);
  assert.equal(
    mailto.includes(
      encodeURIComponent(
        'I am interested in joining Aurora E-Cell. I would love to be a part of the Entrepreneurship Cell and participate in its activities, events and initiatives.'
      )
    ),
    true
  );
  assert.equal(mailto.includes(encodeURIComponent('Please let me know the process to join.')), true);
});

test('isAuthorizedAdminEmail recognizes adminecell@gmail.com and rejects regular students', () => {
  assert.equal(isAuthorizedAdminEmail('adminecell@gmail.com'), true);
  assert.equal(isAuthorizedAdminEmail('ADMINecell@gmail.com '), true);
  assert.equal(isAuthorizedAdminEmail('student@aurora.edu.in'), false);
  assert.equal(isAuthorizedAdminEmail(''), false);
});

test('validateAuthInput enforces email, password, and registration fullName', () => {
  const badLogin = validateAuthInput('login', { email: 'not-an-email', password: '123' });
  assert.equal(badLogin.valid, false);
  assert.ok(badLogin.errors.email);
  assert.ok(badLogin.errors.password);

  const goodRegister = validateAuthInput('register', {
    fullName: 'Rohan Sharma',
    email: 'rohan@aurora.edu.in',
    password: 'securePassword123',
  });
  assert.equal(goodRegister.valid, true);
});

test('validateEventInput, validateAchievementInput, and validateStartupInput reject empty fields', () => {
  const invalidEvent = validateEventInput({
    title: '',
    description: '',
    date: '',
    time: '',
    venue: '',
    eventStatus: 'invalid',
    registrationUrl: 'ftp://bad-link',
  });
  assert.equal(invalidEvent.valid, false);
  assert.ok(invalidEvent.errors.title);
  assert.ok(invalidEvent.errors.registrationUrl);

  const validEvent = validateEventInput({
    title: 'Pitch Tank 2026',
    description: 'Annual campus startup pitch competition.',
    date: '2026-12-01',
    time: '10:00 AM',
    venue: 'Main Auditorium',
    eventStatus: 'upcoming',
    registrationUrl: 'https://aurora.edu.in/register',
  });
  assert.equal(validEvent.valid, true);

  const validAchievement = validateAchievementInput({
    title: 'National E-Summit Finalists',
    description: 'Top 5 college E-Cell cohort.',
    date: '2026-10-15',
  });
  assert.equal(validAchievement.valid, true);

  const validStartup = validateStartupInput({
    name: 'KalaCraft',
    description: 'Artisan marketplace built by students.',
    category: 'D2C & CraftTech',
    currentStatus: 'incubating',
  });
  assert.equal(validStartup.valid, true);
});

test('calculateDashboardStats computes accurate counts from actual records and starts at zero when empty', () => {
  const emptyStats = calculateDashboardStats({
    users: [],
    events: [],
    achievements: [],
    startups: [],
  });
  assert.deepEqual(emptyStats, {
    totalRegisteredUsers: 0,
    totalPublishedEvents: 0,
    totalDraftEvents: 0,
    totalAchievements: 0,
    totalActiveStartups: 0,
  });

  const users: UserProfileRecord[] = [
    {
      uid: 'u1',
      fullName: 'Ananya',
      email: 'ananya@aurora.edu.in',
      role: 'student',
      accountStatus: 'active',
      registrationDate: '2026-11-03',
      registrationTime: '09:00:00',
    },
  ];
  const events: EventRecord[] = [
    {
      id: 'e1',
      title: 'Published Event',
      description: 'Desc',
      posterUrl: '',
      date: '2026-11-10',
      time: '11:00',
      venue: 'Hall A',
      eventStatus: 'upcoming',
      additionalInfo: '',
      registrationUrl: '',
      published: true,
      authorId: 'admin1',
    },
    {
      id: 'e2',
      title: 'Draft Event',
      description: 'Desc',
      posterUrl: '',
      date: '2026-11-12',
      time: '14:00',
      venue: 'Hall B',
      eventStatus: 'upcoming',
      additionalInfo: '',
      registrationUrl: '',
      published: false,
      authorId: 'admin1',
    },
  ];
  const achievements: AchievementRecord[] = [
    {
      id: 'a1',
      title: 'Award 1',
      description: 'Desc',
      imageUrl: '',
      date: '2026-10-01',
      additionalDetails: '',
      published: true,
      authorId: 'admin1',
    },
  ];
  const startups: StartupRecord[] = [
    {
      id: 's1',
      name: 'Startup 1',
      logoUrl: '',
      description: 'Desc',
      category: 'EdTech',
      founderInfo: '',
      imageUrl: '',
      currentStatus: 'incubating',
      additionalDetails: '',
      published: true,
      authorId: 'admin1',
    },
  ];

  const populatedStats = calculateDashboardStats({ users, events, achievements, startups });
  assert.deepEqual(populatedStats, {
    totalRegisteredUsers: 1,
    totalPublishedEvents: 1,
    totalDraftEvents: 1,
    totalAchievements: 1,
    totalActiveStartups: 1,
  });
});

test('deduplicateUserRegistrations and Google Sheets row formatters prevent duplicates and strip sensitive fields', () => {
  const duplicateUsers: UserProfileRecord[] = [
    {
      uid: 'u101',
      fullName: 'Vikram Rao',
      email: 'vikram@aurora.edu.in',
      role: 'student',
      accountStatus: 'active',
      registrationDate: '2026-11-03',
      registrationTime: '10:15:00',
    },
    {
      uid: 'u101',
      fullName: 'Vikram Rao Duplicate UID',
      email: 'vikram2@aurora.edu.in',
      role: 'student',
      accountStatus: 'active',
      registrationDate: '2026-11-03',
      registrationTime: '10:16:00',
    },
    {
      uid: 'u102',
      fullName: 'Vikram Rao Duplicate Email',
      email: 'VIKRAM@aurora.edu.in',
      role: 'student',
      accountStatus: 'active',
      registrationDate: '2026-11-03',
      registrationTime: '10:17:00',
    },
  ];

  const deduped = deduplicateUserRegistrations(duplicateUsers);
  assert.equal(deduped.length, 1);

  const sheet1Rows = formatUserRegistrationSheetRows(duplicateUsers);
  assert.equal(sheet1Rows.length, 1);
  assert.deepEqual(sheet1Rows[0], [
    'u101',
    'Vikram Rao',
    'vikram@aurora.edu.in',
    '2026-11-03',
    '10:15:00',
    'active',
  ]);

  const logs: LoginActivityRecord[] = [
    {
      id: 'log_1',
      userId: 'u101',
      email: 'vikram@aurora.edu.in',
      loginDate: '2026-11-03',
      loginTime: '10:20:00',
      loginMethod: 'email_password',
    },
  ];
  const sheet2Rows = formatLoginActivitySheetRows(logs);
  assert.deepEqual(sheet2Rows, [
    ['u101', 'vikram@aurora.edu.in', '2026-11-03', '10:20:00', 'email_password'],
  ]);

  const filtered = filterUsers(duplicateUsers, 'vikram', 'student', 'active');
  assert.equal(filtered.length, 1);
});

test('api/index.ts exports serverless Express handler, server admin role helper, and PBKDF2 password verifiers', async () => {
  const apiModule = await import('../../api/index');
  const logicModule = await import('./ecellLogic');
  assert.equal(typeof apiModule.default, 'function');
  assert.equal(typeof apiModule.app, 'function');
  assert.equal(apiModule.isServerAuthorizedAdmin('adminecell@gmail.com'), true);
  assert.equal(apiModule.isServerAuthorizedAdmin('student@aurora.edu.in'), false);
  assert.equal(Boolean(apiModule.getFirebaseApiKey()), true);

  const uid1 = await logicModule.deriveUserIdFromEmail('Student@Aurora.edu.in ');
  const uid2 = await logicModule.deriveUserIdFromEmail('student@aurora.edu.in');
  assert.equal(uid1, uid2);
  assert.equal(/^usr_[0-9a-f]{32}$/.test(uid1), true);

  const salt = logicModule.generatePasswordSalt();
  assert.equal(/^[0-9a-f]{32}$/.test(salt), true);
  const hash = await logicModule.hashPasswordWithSalt('MySecretPass123!', salt);
  assert.equal(/^[0-9a-f]{64}$/.test(hash), true);
  assert.equal(await logicModule.verifyPasswordWithSalt('MySecretPass123!', salt, hash), true);
  assert.equal(await logicModule.verifyPasswordWithSalt('WrongPass123!', salt, hash), false);

  const token = apiModule.createSignedServerSessionToken({
    uid: uid1,
    email: 'student@aurora.edu.in',
    role: 'student',
  });
  const verified = apiModule.verifySignedServerSessionToken(token);
  assert.ok(verified);
  assert.equal(verified.uid, uid1);
  assert.equal(verified.email, 'student@aurora.edu.in');
});

test('validateLogoFileMetadata and validateWebsiteBrandingInput enforce transparent formats, size limits, and allow empty removal', async () => {
  const logicModule = await import('./ecellLogic');

  const validPngFile = logicModule.validateLogoFileMetadata({
    name: 'aurora-ecell-logo.png',
    type: 'image/png',
    size: 120_000,
  });
  assert.equal(validPngFile.valid, true);

  const validSvgFile = logicModule.validateLogoFileMetadata({
    name: 'aurora-college-logo.svg',
    type: 'image/svg+xml',
    size: 42_000,
  });
  assert.equal(validSvgFile.valid, true);

  const invalidJpgFile = logicModule.validateLogoFileMetadata({
    name: 'photo.jpg',
    type: 'image/jpeg',
    size: 50_000,
  });
  assert.equal(invalidJpgFile.valid, false);
  assert.ok(invalidJpgFile.errors.file);

  const oversizedFile = logicModule.validateLogoFileMetadata({
    name: 'huge.png',
    type: 'image/png',
    size: 6 * 1024 * 1024,
  });
  assert.equal(oversizedFile.valid, false);
  assert.ok(oversizedFile.errors.size);

  const validEmptyBranding = logicModule.validateWebsiteBrandingInput({
    ecellLogoUrl: '',
    collegeLogoUrl: '',
  });
  assert.equal(validEmptyBranding.valid, true);

  const validDataUrlBranding = logicModule.validateWebsiteBrandingInput({
    ecellLogoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    collegeLogoUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==',
  });
  assert.equal(validDataUrlBranding.valid, true);

  const invalidBranding = logicModule.validateWebsiteBrandingInput({
    ecellLogoUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    collegeLogoUrl: 'javascript:alert(1)',
  });
  assert.equal(invalidBranding.valid, false);
  assert.ok(invalidBranding.errors.ecellLogoUrl);
  assert.ok(invalidBranding.errors.collegeLogoUrl);

  const adminPassValid = await logicModule.verifyPasswordWithSalt(
    'EcellAdmin',
    logicModule.BOOTSTRAP_ADMIN_VERIFIER.salt,
    logicModule.BOOTSTRAP_ADMIN_VERIFIER.hash
  );
  assert.equal(adminPassValid, true);
});

test('validateNecMemberInput strictly enforces MAX_NEC_MEMBERS (25) limit, allows editing existing at 25, and prevents duplicates', async () => {
  const logicModule = await import('./ecellLogic');
  assert.equal(logicModule.MAX_NEC_MEMBERS, 25);

  const twentyFourMembers = Array.from({ length: 24 }, (_, idx) => ({
    id: `nec_${idx + 1}`,
    name: `Member ${idx + 1}`,
    role: 'Executive',
  }));

  // 25th member should be allowed
  const valid25th = logicModule.validateNecMemberInput(
    {
      name: 'Member 25',
      role: 'NEC Lead',
      photoUrl: '',
    },
    twentyFourMembers
  );
  assert.equal(valid25th.valid, true);

  const twentyFiveMembers = [
    ...twentyFourMembers,
    { id: 'nec_25', name: 'Member 25', role: 'NEC Lead' },
  ];

  // 26th member must be rejected by the 25-member limit
  const rejected26th = logicModule.validateNecMemberInput(
    {
      name: 'Member 26',
      role: 'Operations Coordinator',
      photoUrl: '',
    },
    twentyFiveMembers
  );
  assert.equal(rejected26th.valid, false);
  assert.ok(rejected26th.errors.limit);
  assert.equal(rejected26th.errors.limit.includes('25'), true);

  // Editing an existing member when already at 25/25 must still be allowed
  const editAt25 = logicModule.validateNecMemberInput(
    {
      name: 'Member 25 Updated',
      role: 'National Challenge Head',
      photoUrl: '',
    },
    twentyFiveMembers,
    'nec_25'
  );
  assert.equal(editAt25.valid, true);

  // Duplicate name + role must be rejected
  const duplicateMember = logicModule.validateNecMemberInput(
    {
      name: 'member 1',
      role: 'EXECUTIVE',
    },
    twentyFourMembers
  );
  assert.equal(duplicateMember.valid, false);
  assert.ok(duplicateMember.errors.duplicate);
});

test('validateLeadershipInput, validateSponsorInput, and computeReorderedDisplayOrders work accurately', async () => {
  const logicModule = await import('./ecellLogic');

  const validLeader = logicModule.validateLeadershipInput({
    name: 'Dr. S. Ramesh',
    role: 'Faculty Convenor, E-Cell',
    qualification: 'Ph.D. in Management Studies, MBA',
    category: 'Convenor',
    photoUrl: '',
  });
  assert.equal(validLeader.valid, true);

  const invalidLeader = logicModule.validateLeadershipInput({
    name: '',
    role: '',
    qualification: '',
    category: 'InvalidRole',
  });
  assert.equal(invalidLeader.valid, false);
  assert.ok(invalidLeader.errors.name);
  assert.ok(invalidLeader.errors.role);
  assert.ok(invalidLeader.errors.qualification);
  assert.ok(invalidLeader.errors.category);

  const validSponsor = logicModule.validateSponsorInput({
    name: 'T-Hub Ecosystem',
    logoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    category: 'Supporting Partner',
  });
  assert.equal(validSponsor.valid, true);

  const invalidSponsor = logicModule.validateSponsorInput({
    name: '',
    logoUrl: '',
    category: 'Unknown',
  });
  assert.equal(invalidSponsor.valid, false);
  assert.ok(invalidSponsor.errors.name);
  assert.ok(invalidSponsor.errors.logoUrl);
  assert.ok(invalidSponsor.errors.category);

  const items = [
    { id: 'item_b', displayOrder: 2 },
    { id: 'item_a', displayOrder: 1 },
    { id: 'item_c', displayOrder: 3 },
  ];
  const movedUp = logicModule.computeReorderedDisplayOrders(items, 'item_b', 'up');
  assert.deepEqual(movedUp, [
    { id: 'item_b', displayOrder: 1 },
    { id: 'item_a', displayOrder: 2 },
    { id: 'item_c', displayOrder: 3 },
  ]);
});

test('Aurora AI constants, request validation, and structured entrepreneurship fallback work accurately', async () => {
  const logicModule = await import('./ecellLogic');

  assert.equal(logicModule.AURORA_AI_HEADING, 'MEET AURORA AI');
  assert.equal(logicModule.AURORA_AI_TAGLINE, "Ideas are everywhere. Let's build yours.");
  assert.equal(
    logicModule.AURORA_AI_WELCOME_MESSAGE,
    'Hey, future founder. What are we building today?'
  );
  assert.equal(
    logicModule.AURORA_AI_INPUT_PLACEHOLDER,
    'Ask Aurora AI anything about entrepreneurship...'
  );
  assert.deepEqual(Array.from(logicModule.AURORA_AI_SUGGESTED_PROMPTS), [
    'Generate a startup idea',
    'Solve a real-world problem',
    'Help me build a startup',
    'Create a business model',
    'Prepare me for NEC',
    'Explore an innovative solution',
  ]);

  const emptyReq = logicModule.validateAuroraAiRequest({ message: '   ' });
  assert.equal(emptyReq.valid, false);
  assert.ok(emptyReq.error);

  const validReq = logicModule.validateAuroraAiRequest({
    message: 'Generate a startup idea',
    history: [
      { role: 'user', text: 'Hi Aurora AI' },
      { role: 'model', text: 'Hey, future founder. What are we building today?' },
    ],
  });
  assert.equal(validReq.valid, true);
  assert.equal(validReq.sanitizedMessage, 'Generate a startup idea');
  assert.equal(validReq.sanitizedHistory.length, 2);

  const necResponse = logicModule.buildAuroraAiStructuredFallback('Prepare me for NEC');
  assert.equal(necResponse.includes('NEC Championship Execution Blueprint'), true);
  assert.equal(necResponse.includes('Next 48-Hour Action Step'), true);

  const ideaResponse = logicModule.buildAuroraAiStructuredFallback('Generate a startup idea');
  assert.equal(ideaResponse.includes('3 High-Conviction Student Startup Opportunities'), true);
});


