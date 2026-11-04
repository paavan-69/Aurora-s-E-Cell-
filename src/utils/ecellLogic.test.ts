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
