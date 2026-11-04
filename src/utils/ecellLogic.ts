/**
 * Pure domain logic, validation, statistics calculation, mailto builder,
 * and Google Sheets / Excel row formatting for Aurora E-Cell.
 */

export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type StartupStatus = 'ideation' | 'incubating' | 'mvp' | 'funded' | 'graduated';
export type UserRole = 'student' | 'admin';
export type AccountStatus = 'active' | 'suspended';
export type LoginMethod = 'email_password' | 'google_oauth';

export interface UserProfileRecord {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  registrationDate: string;
  registrationTime: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface EventRecord {
  id: string;
  title: string;
  description: string;
  posterUrl: string;
  date: string;
  time: string;
  venue: string;
  eventStatus: EventStatus;
  additionalInfo: string;
  registrationUrl: string;
  published: boolean;
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AchievementRecord {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  date: string;
  additionalDetails: string;
  published: boolean;
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StartupRecord {
  id: string;
  name: string;
  logoUrl: string;
  description: string;
  category: string;
  founderInfo: string;
  imageUrl: string;
  currentStatus: StartupStatus;
  additionalDetails: string;
  published: boolean;
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface LoginActivityRecord {
  id: string;
  userId: string;
  email: string;
  loginDate: string;
  loginTime: string;
  loginMethod: LoginMethod;
  createdAt?: unknown;
}

export interface AdminActivityRecord {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: 'event' | 'achievement' | 'startup' | 'user' | 'sheets_sync';
  targetTitle: string;
  createdAt?: unknown;
}

// Blueprint constants matching firebase-blueprint.json
export const BLUEPRINT_LIMITS = {
  ID_REGEX: /^[a-zA-Z0-9_\-]+$/,
  MAX_ID_LEN: 128,
  MAX_TITLE_LEN: 160,
  MAX_DESC_LEN: 4000,
  MAX_INFO_LEN: 2000,
  MAX_VENUE_LEN: 200,
  MAX_URL_LEN: 500,
  MAX_IMAGE_DATA_LEN: 800000,
  MAX_NAME_LEN: 120,
  MAX_EMAIL_LEN: 180,
  MAX_FOUNDER_LEN: 1000,
};

export const ADMIN_EMAILS = ['adminecell@gmail.com', 'paavanjampa@gmail.com'];

export function isAuthorizedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function sanitizeText(value: string, maxLength: number): string {
  return value.replace(/[<>]/g, '').trim().slice(0, maxLength);
}

export function generateSafeId(prefix: string): string {
  const randomPart = Math.random().toString(36).substring(2, 10);
  const timePart = Date.now().toString(36);
  return `${prefix}_${timePart}_${randomPart}`.replace(/[^a-zA-Z0-9_\-]/g, '');
}

export function formatCurrentDateTime(now: Date = new Date()): { date: string; time: string } {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}:${seconds}`,
  };
}

/**
 * Builds the exact URL-encoded mailto link for Join E-Cell
 */
export function buildJoinEcellMailto(): string {
  const recipient = 'edcellaurora@gmail.com';
  const subject = 'Interested in Joining Aurora E-Cell';
  const body = [
    'Hi,',
    '',
    'I am interested in joining Aurora E-Cell. I would love to be a part of the Entrepreneurship Cell and participate in its activities, events and initiatives.',
    '',
    'Please let me know the process to join.',
    '',
    'Thank you!',
  ].join('\n');

  return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Builds a direct Gmail web compose URL as a convenient companion option
 */
export function buildJoinEcellGmailWebUrl(): string {
  const recipient = 'edcellaurora@gmail.com';
  const subject = 'Interested in Joining Aurora E-Cell';
  const body = [
    'Hi,',
    '',
    'I am interested in joining Aurora E-Cell. I would love to be a part of the Entrepreneurship Cell and participate in its activities, events and initiatives.',
    '',
    'Please let me know the process to join.',
    '',
    'Thank you!',
  ].join('\n');

  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateAuthInput(
  mode: 'login' | 'register' | 'reset',
  input: { fullName?: string; email: string; password?: string }
): ValidationResult {
  const errors: Record<string, string> = {};
  const email = (input.email || '').trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    errors.email = 'Email address is required.';
  } else if (!emailRegex.test(email) || email.length > BLUEPRINT_LIMITS.MAX_EMAIL_LEN) {
    errors.email = 'Enter a valid email address.';
  }

  if (mode === 'register') {
    const fullName = (input.fullName || '').trim();
    if (!fullName) {
      errors.fullName = 'Full name is required.';
    } else if (fullName.length > BLUEPRINT_LIMITS.MAX_NAME_LEN) {
      errors.fullName = `Full name must be under ${BLUEPRINT_LIMITS.MAX_NAME_LEN} characters.`;
    }
  }

  if (mode === 'login' || mode === 'register') {
    const password = input.password || '';
    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateEventInput(input: {
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  eventStatus: string;
  registrationUrl?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  if (!input.title || !input.title.trim()) {
    errors.title = 'Event title is required.';
  } else if (input.title.trim().length > BLUEPRINT_LIMITS.MAX_TITLE_LEN) {
    errors.title = `Title cannot exceed ${BLUEPRINT_LIMITS.MAX_TITLE_LEN} characters.`;
  }

  if (!input.description || !input.description.trim()) {
    errors.description = 'Event description is required.';
  } else if (input.description.trim().length > BLUEPRINT_LIMITS.MAX_DESC_LEN) {
    errors.description = `Description cannot exceed ${BLUEPRINT_LIMITS.MAX_DESC_LEN} characters.`;
  }

  if (!input.date || !input.date.trim()) {
    errors.date = 'Event date is required.';
  }

  if (!input.time || !input.time.trim()) {
    errors.time = 'Event time is required.';
  }

  if (!input.venue || !input.venue.trim()) {
    errors.venue = 'Event venue is required.';
  } else if (input.venue.trim().length > BLUEPRINT_LIMITS.MAX_VENUE_LEN) {
    errors.venue = `Venue cannot exceed ${BLUEPRINT_LIMITS.MAX_VENUE_LEN} characters.`;
  }

  const allowedStatuses: EventStatus[] = ['upcoming', 'ongoing', 'completed', 'cancelled'];
  if (!allowedStatuses.includes(input.eventStatus as EventStatus)) {
    errors.eventStatus = 'Select a valid event status.';
  }

  if (input.registrationUrl && input.registrationUrl.trim()) {
    const url = input.registrationUrl.trim();
    if (!/^https?:\/\/.+/i.test(url)) {
      errors.registrationUrl = 'Registration link must start with http:// or https://';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateAchievementInput(input: {
  title: string;
  description: string;
  date: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  if (!input.title || !input.title.trim()) {
    errors.title = 'Achievement title is required.';
  } else if (input.title.trim().length > BLUEPRINT_LIMITS.MAX_TITLE_LEN) {
    errors.title = `Title cannot exceed ${BLUEPRINT_LIMITS.MAX_TITLE_LEN} characters.`;
  }

  if (!input.description || !input.description.trim()) {
    errors.description = 'Achievement description is required.';
  } else if (input.description.trim().length > BLUEPRINT_LIMITS.MAX_DESC_LEN) {
    errors.description = `Description cannot exceed ${BLUEPRINT_LIMITS.MAX_DESC_LEN} characters.`;
  }

  if (!input.date || !input.date.trim()) {
    errors.date = 'Achievement date is required.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateStartupInput(input: {
  name: string;
  description: string;
  category: string;
  currentStatus: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  if (!input.name || !input.name.trim()) {
    errors.name = 'Startup name is required.';
  } else if (input.name.trim().length > BLUEPRINT_LIMITS.MAX_TITLE_LEN) {
    errors.name = `Startup name cannot exceed ${BLUEPRINT_LIMITS.MAX_TITLE_LEN} characters.`;
  }

  if (!input.description || !input.description.trim()) {
    errors.description = 'Startup description is required.';
  } else if (input.description.trim().length > BLUEPRINT_LIMITS.MAX_DESC_LEN) {
    errors.description = `Description cannot exceed ${BLUEPRINT_LIMITS.MAX_DESC_LEN} characters.`;
  }

  if (!input.category || !input.category.trim()) {
    errors.category = 'Industry/Category is required.';
  } else if (input.category.trim().length > BLUEPRINT_LIMITS.MAX_NAME_LEN) {
    errors.category = `Category cannot exceed ${BLUEPRINT_LIMITS.MAX_NAME_LEN} characters.`;
  }

  const allowedStatuses: StartupStatus[] = ['ideation', 'incubating', 'mvp', 'funded', 'graduated'];
  if (!allowedStatuses.includes(input.currentStatus as StartupStatus)) {
    errors.currentStatus = 'Select a valid startup status.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface DashboardStats {
  totalRegisteredUsers: number;
  totalPublishedEvents: number;
  totalDraftEvents: number;
  totalAchievements: number;
  totalActiveStartups: number;
}

export function calculateDashboardStats(data: {
  users: UserProfileRecord[];
  events: EventRecord[];
  achievements: AchievementRecord[];
  startups: StartupRecord[];
}): DashboardStats {
  const uniqueUsers = deduplicateUserRegistrations(data.users);
  return {
    totalRegisteredUsers: uniqueUsers.length,
    totalPublishedEvents: data.events.filter((e) => e.published).length,
    totalDraftEvents: data.events.filter((e) => !e.published).length,
    totalAchievements: data.achievements.filter((a) => a.published).length,
    totalActiveStartups: data.startups.filter((s) => s.published).length,
  };
}

/**
 * Deduplicates user registration records by UID and lowercase email
 * so Google Sheets and Excel exports never contain duplicate user registrations.
 */
export function deduplicateUserRegistrations(users: UserProfileRecord[]): UserProfileRecord[] {
  const seenUids = new Set<string>();
  const seenEmails = new Set<string>();
  const result: UserProfileRecord[] = [];

  for (const user of users) {
    const uidKey = (user.uid || '').trim();
    const emailKey = (user.email || '').trim().toLowerCase();
    if (!uidKey || !emailKey) continue;
    if (seenUids.has(uidKey) || seenEmails.has(emailKey)) continue;
    seenUids.add(uidKey);
    seenEmails.add(emailKey);
    result.push(user);
  }

  return result;
}

export const SHEET1_HEADERS = [
  'User ID',
  'Full Name',
  'Email Address',
  'Registration Date',
  'Registration Time',
  'Account Status',
] as const;

export const SHEET2_HEADERS = [
  'User ID',
  'Email Address',
  'Login Date',
  'Login Time',
  'Login Method',
] as const;

/**
 * Formats deduplicated User Registrations for Sheet 1 of AURORA E-CELL — USER DATABASE.
 * Strictly strips any extraneous properties so passwords/tokens can never leak.
 */
export function formatUserRegistrationSheetRows(users: UserProfileRecord[]): string[][] {
  const unique = deduplicateUserRegistrations(users);
  return unique.map((u) => [
    String(u.uid ?? ''),
    String(u.fullName ?? ''),
    String(u.email ?? ''),
    String(u.registrationDate ?? ''),
    String(u.registrationTime ?? ''),
    String(u.accountStatus ?? 'active'),
  ]);
}

/**
 * Formats Login Activity records for Sheet 2 of AURORA E-CELL — USER DATABASE.
 */
export function formatLoginActivitySheetRows(logs: LoginActivityRecord[]): string[][] {
  return logs.map((log) => [
    String(log.userId ?? ''),
    String(log.email ?? ''),
    String(log.loginDate ?? ''),
    String(log.loginTime ?? ''),
    String(log.loginMethod ?? 'email_password'),
  ]);
}

export function filterUsers(
  users: UserProfileRecord[],
  searchQuery: string,
  roleFilter: 'all' | UserRole = 'all',
  statusFilter: 'all' | AccountStatus = 'all'
): UserProfileRecord[] {
  const q = searchQuery.trim().toLowerCase();
  return deduplicateUserRegistrations(users).filter((user) => {
    if (roleFilter !== 'all' && user.role !== roleFilter) return false;
    if (statusFilter !== 'all' && user.accountStatus !== statusFilter) return false;
    if (!q) return true;
    return (
      user.fullName.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.uid.toLowerCase().includes(q)
    );
  });
}
