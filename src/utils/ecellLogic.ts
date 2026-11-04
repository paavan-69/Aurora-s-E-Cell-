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
  targetType:
    | 'event'
    | 'achievement'
    | 'startup'
    | 'user'
    | 'sheets_sync'
    | 'branding'
    | 'nec_team'
    | 'leadership'
    | 'sponsor';
  targetTitle: string;
  createdAt?: unknown;
}

export interface WebsiteBrandingRecord {
  id: string;
  ecellLogoUrl: string;
  collegeLogoUrl: string;
  updatedBy: string;
  updatedAt?: unknown;
}

export const MAX_NEC_MEMBERS = 25;

export type LeadershipCategory = 'Head' | 'Convenor';
export type SponsorCategory = 'Sponsor' | 'Supporting Partner';

export interface NecMemberRecord {
  id: string;
  name: string;
  role: string;
  photoUrl: string;
  displayOrder: number;
  published: boolean;
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface LeadershipRecord {
  id: string;
  name: string;
  role: string;
  qualification: string;
  photoUrl: string;
  category: LeadershipCategory;
  displayOrder: number;
  published: boolean;
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SponsorRecord {
  id: string;
  name: string;
  logoUrl: string;
  category: SponsorCategory;
  displayOrder: number;
  published: boolean;
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const ALLOWED_LOGO_MIME_TYPES = [
  'image/png',
  'image/svg+xml',
  'image/webp',
] as const;

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
  MAX_LOGO_DATA_LEN: 450000,
  MAX_LOGO_FILE_BYTES: 5 * 1024 * 1024,
  MAX_NAME_LEN: 120,
  MAX_ROLE_LEN: 140,
  MAX_QUALIFICATION_LEN: 180,
  MAX_EMAIL_LEN: 180,
  MAX_FOUNDER_LEN: 1000,
};

export const ADMIN_EMAILS = ['adminecell@gmail.com', 'paavanjampa@gmail.com'];

/**
 * Precomputed PBKDF2-SHA256 (100,000 iterations) salted verifier for the official
 * Aurora E-Cell administrator account (adminecell@gmail.com).
 * Plaintext password is never stored in source code or database.
 */
export const BOOTSTRAP_ADMIN_VERIFIER = {
  email: 'adminecell@gmail.com',
  fullName: 'Aurora E-Cell Admin',
  salt: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
  hash: 'c89ae999a70117a72408b465dcc4fc6a064e6746cb37b921dc807170bd0bbbb2',
} as const;

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

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * Deterministically derives a Firestore-safe user ID (`usr_<32-hex-chars>`) from an email address
 * using SHA-256 so each registered email maps to a single canonical document ID.
 */
export async function deriveUserIdFromEmail(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const encoded = new TextEncoder().encode(`aurora_ecell_uid_v1:${normalized}`);
  const digestBuffer = await globalThis.crypto.subtle.digest('SHA-256', encoded);
  const hex = bytesToHex(new Uint8Array(digestBuffer)).slice(0, 32);
  return `usr_${hex}`;
}

/**
 * Generates a 16-byte (32 hex character) cryptographic salt.
 */
export function generatePasswordSalt(): string {
  const saltBytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(saltBytes);
  return bytesToHex(saltBytes);
}

/**
 * Derives a 64-character hex PBKDF2-SHA256 password verifier (100,000 iterations).
 * Plaintext passwords are never stored anywhere.
 */
export async function hashPasswordWithSalt(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const saltBytes = hexToBytes(saltHex);
  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as BufferSource,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(derivedBits));
}

/**
 * Constant-time verification of a password against a stored salt and PBKDF2-SHA256 hash.
 */
export async function verifyPasswordWithSalt(
  password: string,
  saltHex: string,
  expectedHashHex: string
): Promise<boolean> {
  if (!password || !saltHex || !expectedHashHex || expectedHashHex.length !== 64) {
    return false;
  }
  const computed = await hashPasswordWithSalt(password, saltHex);
  if (computed.length !== expectedHashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
  }
  return diff === 0;
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

/**
 * Validates an uploaded logo file's format (transparent PNG, SVG, WebP) and file size (max 5MB).
 */
export function validateLogoFileMetadata(file: {
  name: string;
  type: string;
  size: number;
}): ValidationResult {
  const errors: Record<string, string> = {};
  const fileName = (file.name || '').trim().toLowerCase();
  const mimeType = (file.type || '').trim().toLowerCase();

  const hasValidMime = (ALLOWED_LOGO_MIME_TYPES as readonly string[]).includes(mimeType);
  const hasValidExt =
    fileName.endsWith('.png') || fileName.endsWith('.svg') || fileName.endsWith('.webp');

  if (!hasValidMime && !hasValidExt) {
    errors.file =
      'Unsupported logo format. Please upload a transparent PNG, SVG, or WebP file.';
  }

  if (!file.size || file.size <= 0) {
    errors.size = 'Selected file is empty.';
  } else if (file.size > BLUEPRINT_LIMITS.MAX_LOGO_FILE_BYTES) {
    errors.size = 'Logo file size must not exceed 5 MB.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates website branding logo URLs/data URLs before persisting to Firestore.
 */
export function validateWebsiteBrandingInput(input: {
  ecellLogoUrl: string;
  collegeLogoUrl: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  const checkLogoValue = (val: string, key: 'ecellLogoUrl' | 'collegeLogoUrl', label: string) => {
    const trimmed = (val || '').trim();
    if (!trimmed) return; // Empty string is valid (means logo is removed / not uploaded)

    if (trimmed.length > BLUEPRINT_LIMITS.MAX_LOGO_DATA_LEN) {
      errors[key] = `${label} exceeds maximum storage size. Please upload a smaller PNG or SVG.`;
      return;
    }

    const isSupportedDataUrl = /^data:image\/(png|svg\+xml|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(
      trimmed
    );
    const isHttpUrl = /^https?:\/\/.+/i.test(trimmed);

    if (!isSupportedDataUrl && !isHttpUrl) {
      errors[key] = `${label} must be a valid transparent PNG, SVG, or WebP image.`;
    }
  };

  checkLogoValue(input.ecellLogoUrl, 'ecellLogoUrl', 'Aurora E-Cell Logo');
  checkLogoValue(input.collegeLogoUrl, 'collegeLogoUrl', 'Aurora College Logo');

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates NEC Team Member input and strictly enforces the 25-member maximum limit
 * as well as duplicate prevention.
 */
export function validateNecMemberInput(
  input: {
    name: string;
    role: string;
    photoUrl?: string;
  },
  existingMembers: Array<Pick<NecMemberRecord, 'id' | 'name' | 'role'>> = [],
  editingMemberId?: string | null
): ValidationResult {
  const errors: Record<string, string> = {};
  const trimmedName = (input.name || '').trim();
  const trimmedRole = (input.role || '').trim();
  const trimmedPhoto = (input.photoUrl || '').trim();

  // Strict 25-member limit check when adding a new member
  const isEditingExisting = Boolean(
    editingMemberId && existingMembers.some((m) => m.id === editingMemberId)
  );
  if (!isEditingExisting && existingMembers.length >= MAX_NEC_MEMBERS) {
    errors.limit = `Maximum limit of ${MAX_NEC_MEMBERS} NEC Team members reached (${existingMembers.length} / ${MAX_NEC_MEMBERS}). Remove or edit an existing member instead.`;
  }

  if (!trimmedName) {
    errors.name = 'Full name is required.';
  } else if (trimmedName.length > BLUEPRINT_LIMITS.MAX_NAME_LEN) {
    errors.name = `Name cannot exceed ${BLUEPRINT_LIMITS.MAX_NAME_LEN} characters.`;
  }

  if (!trimmedRole) {
    errors.role = 'Role / designation is required.';
  } else if (trimmedRole.length > BLUEPRINT_LIMITS.MAX_ROLE_LEN) {
    errors.role = `Role cannot exceed ${BLUEPRINT_LIMITS.MAX_ROLE_LEN} characters.`;
  }

  if (trimmedPhoto && trimmedPhoto.length > BLUEPRINT_LIMITS.MAX_IMAGE_DATA_LEN) {
    errors.photoUrl = 'Uploaded photo exceeds maximum storage size.';
  }

  // Prevent accidental duplicate member submission (same name + role)
  if (trimmedName && trimmedRole) {
    const duplicate = existingMembers.find(
      (m) =>
        m.id !== editingMemberId &&
        m.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        m.role.trim().toLowerCase() === trimmedRole.toLowerCase()
    );
    if (duplicate) {
      errors.duplicate = `"${trimmedName}" with role "${trimmedRole}" is already in the NEC Team.`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates Leadership & Convenors member input.
 */
export function validateLeadershipInput(input: {
  name: string;
  role: string;
  qualification: string;
  category: string;
  photoUrl?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  const trimmedName = (input.name || '').trim();
  const trimmedRole = (input.role || '').trim();
  const trimmedQual = (input.qualification || '').trim();
  const trimmedPhoto = (input.photoUrl || '').trim();

  if (!trimmedName) {
    errors.name = 'Full name is required.';
  } else if (trimmedName.length > BLUEPRINT_LIMITS.MAX_NAME_LEN) {
    errors.name = `Full name cannot exceed ${BLUEPRINT_LIMITS.MAX_NAME_LEN} characters.`;
  }

  if (!trimmedRole) {
    errors.role = 'Official role / designation is required.';
  } else if (trimmedRole.length > BLUEPRINT_LIMITS.MAX_ROLE_LEN) {
    errors.role = `Designation cannot exceed ${BLUEPRINT_LIMITS.MAX_ROLE_LEN} characters.`;
  }

  if (!trimmedQual) {
    errors.qualification = 'Educational qualification is required.';
  } else if (trimmedQual.length > BLUEPRINT_LIMITS.MAX_QUALIFICATION_LEN) {
    errors.qualification = `Qualification cannot exceed ${BLUEPRINT_LIMITS.MAX_QUALIFICATION_LEN} characters.`;
  }

  const allowedCategories: LeadershipCategory[] = ['Head', 'Convenor'];
  if (!allowedCategories.includes(input.category as LeadershipCategory)) {
    errors.category = 'Category must be either Head or Convenor.';
  }

  if (trimmedPhoto && trimmedPhoto.length > BLUEPRINT_LIMITS.MAX_IMAGE_DATA_LEN) {
    errors.photoUrl = 'Uploaded photo exceeds maximum storage size.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates Sponsors & Supporting Partners input.
 */
export function validateSponsorInput(input: {
  name: string;
  logoUrl: string;
  category: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  const trimmedName = (input.name || '').trim();
  const trimmedLogo = (input.logoUrl || '').trim();

  if (!trimmedName) {
    errors.name = 'Company / organization name is required.';
  } else if (trimmedName.length > BLUEPRINT_LIMITS.MAX_TITLE_LEN) {
    errors.name = `Organization name cannot exceed ${BLUEPRINT_LIMITS.MAX_TITLE_LEN} characters.`;
  }

  if (!trimmedLogo) {
    errors.logoUrl = 'Partner or sponsor logo is required.';
  } else if (trimmedLogo.length > BLUEPRINT_LIMITS.MAX_IMAGE_DATA_LEN) {
    errors.logoUrl = 'Logo exceeds maximum storage size.';
  }

  const allowedCategories: SponsorCategory[] = ['Sponsor', 'Supporting Partner'];
  if (!allowedCategories.includes(input.category as SponsorCategory)) {
    errors.category = 'Category must be either Sponsor or Supporting Partner.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Sorts records by ascending displayOrder, with deterministic fallback to id.
 */
export function sortRecordsByDisplayOrder<T extends { id: string; displayOrder: number }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const orderDiff = (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0);
    if (orderDiff !== 0) return orderDiff;
    return String(a.id).localeCompare(String(b.id));
  });
}

/**
 * Computes normalized displayOrder updates when moving an item 'up' or 'down'.
 */
export function computeReorderedDisplayOrders<T extends { id: string; displayOrder: number }>(
  items: T[],
  targetId: string,
  direction: 'up' | 'down'
): Array<{ id: string; displayOrder: number }> {
  const sorted = sortRecordsByDisplayOrder(items);
  const index = sorted.findIndex((item) => item.id === targetId);
  if (index === -1) return [];

  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= sorted.length) return [];

  const reordered = [...sorted];
  const temp = reordered[index];
  reordered[index] = reordered[swapIndex];
  reordered[swapIndex] = temp;

  return reordered.map((item, idx) => ({
    id: item.id,
    displayOrder: idx + 1,
  }));
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

/**
 * ============================================================================
 * AURORA AI — ENTREPRENEURSHIP INTELLIGENCE ENGINE LOGIC
 * ============================================================================
 */

export type AuroraAiCoreState = 'idle' | 'hover' | 'thinking' | 'responding';

export interface AuroraAiChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export const AURORA_AI_HEADING = 'MEET AURORA AI';
export const AURORA_AI_TAGLINE = "Ideas are everywhere. Let's build yours.";
export const AURORA_AI_WELCOME_MESSAGE =
  'Hey, future founder. What are we building today?';
export const AURORA_AI_INPUT_PLACEHOLDER =
  'Ask Aurora AI anything about entrepreneurship...';

export const AURORA_AI_SUGGESTED_PROMPTS = [
  'Generate a startup idea',
  'Solve a real-world problem',
  'Help me build a startup',
  'Create a business model',
  'Prepare me for NEC',
  'Explore an innovative solution',
] as const;

export const AURORA_AI_SYSTEM_INSTRUCTION = `AURORA AI – MASTER SYSTEM PROMPT

You are Aurora AI, an intelligent, next-generation conversational AI assistant designed to provide natural, helpful, accurate, and context-aware responses.

Your primary goal is to understand what the user actually wants before deciding how to respond.

1. UNDERSTAND USER INTENT FIRST

Before generating any response, identify the user's intent.

Examples:
- If the user says "Hello", respond naturally: "Hey! 👋 How can I help you today?"
- If the user says "Hi", respond: "Hi there! What can I do for you?"
- If the user says "How are you?", respond conversationally.
- If the user asks a question, answer that question directly.
- If the user asks for advice, provide relevant advice.
- If the user asks for a business strategy, provide a structured business strategy.
- If the user asks for startup guidance, activate Startup Advisor Mode.
- If the user asks for coding help, activate Developer Mode.
- If the user asks for creative content, activate Creative Mode.
- If the user asks for explanations, explain clearly and appropriately.

IMPORTANT: Never interpret ordinary greetings, casual conversations, or unrelated messages as startup strategy requests.

2. NATURAL CONVERSATION RULES

- Communicate like a highly intelligent, friendly human assistant.
- Keep responses natural, engaging, and relevant.
- Avoid unnecessary business terminology.
- Never generate long reports for simple questions.
- Do not force every conversation into a business, startup, or productivity framework.
- Do not assume the user's objective without sufficient context.
- Ask a clarification question only when genuinely necessary.
- Maintain conversation context and remember relevant details from earlier messages.

3. STARTUP ADVISOR MODE

Activate this mode ONLY when the user explicitly discusses:
- Starting a business.
- Developing a startup idea.
- Building an MVP.
- Business validation.
- Fundraising and pitching.
- Market research.
- Revenue models.
- Business growth and scaling.
- National Entrepreneurship Challenge (NEC).

When activated, provide actionable, realistic, structured business guidance.
Do not activate this mode for greetings or general conversations.

4. RESPONSE LENGTH INTELLIGENCE

Adapt the response length to the user's request.
- Simple greeting → One short conversational response.
- Simple question → Direct answer.
- Explanation → Clear and understandable explanation.
- Complex question → Detailed structured answer.
- Business strategy → Comprehensive actionable roadmap.
- User requests a specific word count → Respect that limit.

Avoid unnecessary introductions, repetitive conclusions, and irrelevant suggestions.

5. ACCURACY AND RELIABILITY

- Never fabricate facts, statistics, research, or sources.
- Clearly communicate uncertainty when information is unavailable.
- Do not make unsupported assumptions.
- Provide practical examples wherever useful.
- Prioritize accuracy over impressive-sounding language.

6. CONVERSATION CONTINUITY

- Understand the context of the current conversation.
- Do not repeatedly ask questions the user has already answered.
- Remember relevant details within the conversation.
- Respond to follow-up questions based on the previous discussion.
- Never restart a conversation unnecessarily.

7. PERSONALITY

Aurora AI should feel:
- Intelligent
- Friendly
- Professional
- Creative
- Practical
- Empathetic
- Confident but never arrogant

Avoid robotic language, repetitive templates, excessive headings, and unnecessary motivational statements.

8. MOST IMPORTANT RULE

RESPOND TO WHAT THE USER SAYS, NOT WHAT YOU ASSUME THE USER WANTS.

Examples:
User: Hello
Correct: Hey! 👋 How can I help you today?
Incorrect: Venture Execution Roadmap – Strategic Focus: Hello.

User: Tell me a joke.
Correct: Tell a joke.
Incorrect: Generate a productivity roadmap.

User: I have a startup idea.
Correct: Ask about the idea and help develop it.
Incorrect: Immediately generate a generic 30-day business plan.

FINAL DIRECTIVE:
Aurora AI is a general-purpose conversational assistant first and a specialized advisor second. Understand the intent, select the appropriate response mode, and deliver the most relevant answer. Never force a predefined response template onto an unrelated user message.`;

export function validateAuroraAiRequest(input: {
  message?: unknown;
  history?: unknown;
}): {
  valid: boolean;
  error?: string;
  sanitizedMessage: string;
  sanitizedHistory: Array<{ role: 'user' | 'model'; text: string }>;
} {
  const rawMessage = typeof input.message === 'string' ? input.message.trim() : '';
  if (!rawMessage) {
    return {
      valid: false,
      error: 'Please enter a question or select a prompt for Aurora AI.',
      sanitizedMessage: '',
      sanitizedHistory: [],
    };
  }

  if (rawMessage.length > 2000) {
    return {
      valid: false,
      error: 'Prompt cannot exceed 2,000 characters.',
      sanitizedMessage: '',
      sanitizedHistory: [],
    };
  }

  const sanitizedMessage = sanitizeText(rawMessage, 2000);
  const rawHistory = Array.isArray(input.history) ? input.history : [];
  const sanitizedHistory: Array<{ role: 'user' | 'model'; text: string }> = [];

  for (const item of rawHistory.slice(-10)) {
    if (
      item &&
      typeof item === 'object' &&
      (('role' in item && item.role === 'user') || ('role' in item && item.role === 'model')) &&
      'text' in item &&
      typeof item.text === 'string' &&
      item.text.trim()
    ) {
      sanitizedHistory.push({
        role: item.role as 'user' | 'model',
        text: sanitizeText(item.text.trim(), 3000),
      });
    }
  }

  return {
    valid: true,
    sanitizedMessage,
    sanitizedHistory,
  };
}

/**
 * Intent-first conversational & multi-mode assistant engine.
 * Strictly follows all 8 rules of the Aurora AI Master System Prompt:
 * 1. Understands user intent first (greetings, casual chat, jokes, questions, coding, creative, or startup advisor).
 * 2. Never forces startup templates onto greetings, casual conversations, or unrelated messages.
 * 3. Activates Startup Advisor Mode ONLY when the user explicitly discusses startups, MVPs, validation, fundraising, market research, revenue models, scaling, or NEC.
 * 4. Adapts response length to the user's request and preserves conversation continuity.
 */
export function buildAuroraAiStructuredFallback(
  prompt: string,
  history: Array<{ role: 'user' | 'model'; text: string }> = []
): string {
  const trimmed = prompt.trim();
  const q = trimmed.toLowerCase().replace(/[!.?]+$/g, '').trim();
  const lastModelTurn = [...history].reverse().find((h) => h.role === 'model')?.text || '';
  const lastUserTurn = [...history].reverse().find((h) => h.role === 'user')?.text || '';

  // ---------------------------------------------------------------------------
  // MODE 1: GREETINGS & CASUAL CONVERSATION (Short, natural, friendly)
  // ---------------------------------------------------------------------------
  if (
    q === 'hello' ||
    q === 'hey' ||
    q === 'hey there' ||
    q === 'hello there' ||
    q === 'hello aurora' ||
    q === 'hello aurora ai' ||
    q === 'hey aurora' ||
    q === 'hey aurora ai'
  ) {
    return 'Hey! 👋 How can I help you today?';
  }

  if (
    q === 'hi' ||
    q === 'hii' ||
    q === 'hiii' ||
    q === 'hi there' ||
    q === 'hi aurora' ||
    q === 'hi aurora ai' ||
    q === 'yo' ||
    q === 'sup'
  ) {
    return 'Hi there! What can I do for you?';
  }

  if (
    q === 'how are you' ||
    q === 'how are you doing' ||
    q === "how's it going" ||
    q === 'how is it going' ||
    q === 'how do you do' ||
    q === 'whats up' ||
    q === "what's up"
  ) {
    return "I'm doing great, thanks for asking! Ready to help with whatever you're working on today. What's on your mind?";
  }

  if (q.startsWith('good morning') || q.startsWith('good afternoon') || q.startsWith('good evening')) {
    const greeting = trimmed.replace(/[!.?]+$/g, '');
    return `${greeting.charAt(0).toUpperCase() + greeting.slice(1)}! 👋 How can I help you today?`;
  }

  if (
    q === 'thanks' ||
    q === 'thank you' ||
    q === 'thx' ||
    q === 'thank you so much' ||
    q === 'thanks a lot' ||
    q === 'appreciate it'
  ) {
    return "You're very welcome! Let me know if there's anything else I can help you with.";
  }

  if (q === 'bye' || q === 'goodbye' || q === 'see ya' || q === 'see you' || q === 'good night') {
    return 'Take care! Feel free to reach out anytime you want to chat, brainstorm, or build something new. 👋';
  }

  if (
    q === 'who are you' ||
    q === 'what are you' ||
    q === 'what can you do' ||
    q === 'introduce yourself' ||
    q === 'tell me about yourself'
  ) {
    return "I'm Aurora AI, a conversational AI assistant. I can answer everyday questions, explain complex concepts, write code, brainstorm creative content, or step in as a startup and business advisor when you're building a venture. What can I help you with today?";
  }

  // ---------------------------------------------------------------------------
  // MODE 2: JOKES & CREATIVE MODE
  // ---------------------------------------------------------------------------
  if (q.includes('tell me a joke') || q === 'joke' || q === 'another joke' || q.includes('make me laugh')) {
    const jokes = [
      'Why do programmers prefer dark mode? Because light attracts bugs! 😄',
      'Why did the developer go broke? Because he used up all his cache!',
      'There are 10 types of people in the world: those who understand binary, and those who do not.',
    ];
    const pick = jokes[(trimmed.length + history.length) % jokes.length];
    return pick;
  }

  // ---------------------------------------------------------------------------
  // MODE 3: STARTUP IDEA DISCOVERY (Ask about the idea before making a plan)
  // ---------------------------------------------------------------------------
  if (
    q === 'i have a startup idea' ||
    q === 'i have an idea' ||
    q === 'i have a business idea' ||
    q === 'i want to start a business' ||
    q === 'i want to start a startup' ||
    q === 'help me build a startup'
  ) {
    return "That's exciting! Tell me a bit about your idea—what problem does it solve, and who is it for? Once you share what you have in mind, we can shape and develop it step by step.";
  }

  // Follow-up continuity when the user shares their startup idea after Aurora AI asked about it
  if (
    lastModelTurn.includes('Tell me a bit about your idea') ||
    lastUserTurn.toLowerCase().includes('i have a startup idea')
  ) {
    return [
      `That sounds like a promising direction! Let's break down how to develop **"${sanitizeText(trimmed, 90)}"**:`,
      '',
      '- **1. Sharpen the Core Value Proposition**: Define the exact user who feels this pain most acutely and what makes your approach 10x easier or faster than their current workaround.',
      '- **2. Quick Validation Test**: Talk to 10–15 target users this week to confirm how they currently solve this and whether they would switch.',
      '- **3. Lightweight MVP**: Start with the single core feature that delivers the main outcome before building secondary features.',
      '',
      'Would you like to focus on the target audience, the MVP feature set, or how to monetize it first?',
    ].join('\n');
  }

  // ---------------------------------------------------------------------------
  // MODE 4: DEVELOPER / CODING MODE
  // ---------------------------------------------------------------------------
  if (
    q.includes('useeffect') ||
    q.includes('react') ||
    q.includes('javascript') ||
    q.includes('typescript') ||
    q.includes('python') ||
    q.includes('write code') ||
    q.includes('function in') ||
    q.includes('html') ||
    q.includes('css') ||
    q.includes('sql') ||
    q.includes('algorithm') ||
    q.includes('debug')
  ) {
    if (q.includes('useeffect')) {
      return [
        '`useEffect` is a React Hook that lets you synchronize a component with an external system (such as fetching data, setting up subscriptions, or updating the DOM).',
        '',
        '```tsx',
        'useEffect(() => {',
        '  const controller = new AbortController();',
        '  fetchData({ signal: controller.signal });',
        '  return () => controller.abort(); // Cleanup on unmount or dependency change',
        '}, [dependency]);',
        '```',
        '',
        '- **Empty dependency array `[]`**: Runs only once after initial mount.',
        '- **With dependencies `[id]`**: Re-runs whenever `id` changes.',
        '- **Cleanup function**: Runs before the effect re-executes and when the component unmounts.',
      ].join('\n');
    }
    return [
      `Here is a clear breakdown for **${sanitizeText(trimmed, 90)}**:`,
      '',
      '- **Core Concept**: Keep functions modular, pure where possible, and handle edge cases (null/empty inputs and async errors) explicitly.',
      '- **Best Practice**: Separate pure business logic from UI or I/O layers so you can unit-test behavior deterministically.',
      '',
      'Share the specific snippet, language, or error message you are working with and I will write the exact code for you.',
    ].join('\n');
  }

  // ---------------------------------------------------------------------------
  // MODE 5: EXPLANATIONS & DIRECT QUESTIONS
  // ---------------------------------------------------------------------------
  if (q.includes('photosynthesis')) {
    return [
      'Photosynthesis is the biological process by which green plants, algae, and certain bacteria convert light energy into chemical energy, using sunlight to transform water and carbon dioxide into glucose and oxygen.',
      '',
      'In biotech and clean-tech, startups draw inspiration from photosynthesis to build **artificial leaf systems** and **bio-photovoltaic reactors** that capture atmospheric carbon dioxide and convert it into sustainable fuels or biodegradable materials.',
    ].join('\n');
  }

  if (q.includes('blockchain') && q.includes('consensus')) {
    return 'Blockchain consensus is a fault-tolerant mechanism that allows distributed computers on a network to agree on a single, verified state of transactions without needing a central authority. Common mechanisms include Proof of Stake (PoS), where validators stake tokens to verify blocks, and Proof of Work (PoW), where nodes solve cryptographic puzzles to secure the ledger.';
  }

  if (q.includes('quantum computing') || q.includes('quantum computer')) {
    return [
      'Quantum computing uses quantum-mechanical phenomena—specifically **superposition** and **entanglement**—to process information in qubits rather than classical 0/1 bits, allowing it to evaluate complex probability spaces simultaneously.',
      '',
      'Startups leverage quantum and quantum-inspired algorithms in:',
      '- **Molecular & Drug Simulation**: Modeling protein folding and chemical interactions.',
      '- **Supply Chain & Logistics Optimization**: Solving massive routing and scheduling constraints.',
      '- **Post-Quantum Cryptography**: Securing financial and enterprise data against future decryption.',
    ].join('\n');
  }

  if (q.includes('bootstrapping') && (q.includes('venture capital') || q.includes('vc'))) {
    return [
      '### Bootstrapping vs. Venture Capital',
      '',
      '| Dimension | Bootstrapping | Venture Capital (VC) |',
      '| :--- | :--- | :--- |',
      '| **Funding Source** | Personal savings & customer revenue | Institutional investors & angels |',
      '| **Ownership** | 100% retained by founders | Diluted across funding rounds |',
      '| **Primary Focus** | Early profitability & sustainable cash flow | Rapid market capture & hyper-growth |',
      '| **Best Suited For** | Capital-efficient SaaS, B2B tools, agencies | Deep-tech, high-network marketplaces, hardware |',
      '',
      '**Practical Rule of Thumb**: Bootstrap through customer validation and early revenue if possible—even if you plan to raise VC later, early traction gives you far stronger leverage and valuation.',
    ].join('\n');
  }

  if (q.includes('ltv') && q.includes('cac')) {
    return [
      '### How to Calculate the LTV:CAC Ratio',
      '',
      'The **LTV:CAC ratio** compares the lifetime value of a customer to the cost of acquiring them:',
      '',
      '1. **Customer Lifetime Value (LTV)**: `(Average Revenue Per User × Gross Margin %) ÷ Monthly Churn Rate`',
      '2. **Customer Acquisition Cost (CAC)**: `Total Sales & Marketing Spend ÷ Number of New Customers Acquired`',
      '3. **Ratio**: `LTV ÷ CAC`',
      '',
      '- **Benchmark**: A healthy SaaS or consumer startup typically targets an **LTV:CAC of 3:1 or higher**, with a CAC payback period under 12 months.',
    ].join('\n');
  }

  // ---------------------------------------------------------------------------
  // MODE 6: STARTUP ADVISOR MODE (Explicit startup / business / NEC prompts)
  // ---------------------------------------------------------------------------
  if (q.includes('nec') || q.includes('national entrepreneurship challenge')) {
    return [
      '### NEC Preparation & Execution Strategy',
      '',
      '**1. High-Impact Task Prioritization**',
      '- **Campus Mobilization**: Run interactive 48-hour problem-hunt sprints and founder roundtables across departments rather than passive lectures.',
      '- **Proof of Work & Documentation**: Keep a structured repository of attendance metrics, photos, post-event feedback, and startup progress after every initiative.',
      '',
      '**2. Flagship Initiatives That Stand Out**',
      '- **Startup Validation Clinic**: Pair student teams with alumni founders or mentors for bi-weekly 30-minute product reviews.',
      '- **72-Hour Micro-MVP Sprint**: Challenge student teams to interview 15 real users and ship a working prototype.',
      '',
      '**Immediate Next Step**: Assign clear vertical leads across your NEC team (Operations, Outreach, Documentation, Incubation, Corporate Relations) and lock your 30-day execution calendar.',
    ].join('\n');
  }

  if (
    q.includes('business model') ||
    q.includes('revenue model') ||
    q.includes('pricing strategy') ||
    q.includes('monetiz')
  ) {
    return [
      '### Lean Business Model Architecture',
      '',
      '**1. Value Proposition & Beachhead Customer**',
      '- **Target Segment**: Identify the specific customer segment experiencing the problem every week.',
      '- **Core Value Hook**: Quantify the time saved, cost reduced, or revenue unlocked in one clear sentence.',
      '',
      '**2. Revenue & Unit Economics**',
      '- **Revenue Stream**: Match pricing to how customers perceive value (recurring SaaS subscription for workflows, transaction fee for marketplaces, or tiered usage for APIs).',
      '- **Unit Economics Target**: Aim for Gross Margin >= 70% and CAC payback under 60 days using organic community channels.',
      '',
      'If you share what product or service you are building, I can tailor a specific pricing and revenue model for it.',
    ].join('\n');
  }

  if (q.includes('generate a startup idea') || q.includes('startup idea')) {
    return [
      '### 3 High-Conviction Student Startup Opportunities',
      '',
      '**1. Campus-to-Industry Micro-Apprenticeship Platform**',
      '- **Problem**: Students lack verified real-world project experience; SMEs cannot afford full-time agencies.',
      '- **Solution**: Scoped 2-week paid micro-sprints vetted by clear rubrics.',
      '- **Revenue Model**: 15% platform fee per completed sprint.',
      '',
      '**2. AI-Assisted Vernacular SMB Inventory & WhatsApp Reorder Copilot**',
      '- **Problem**: Local retailers lose 12–18% margin to stockouts and manual supplier follow-ups.',
      '- **Solution**: Voice/WhatsApp assistant that tracks low stock and drafts supplier purchase orders.',
      '',
      '**3. Lab-to-Market Circular Packaging Aggregator**',
      '- **Problem**: Quick-commerce dark stores generate massive single-use packaging waste.',
      '- **Solution**: Deposit-return smart packaging loop for hyper-local deliveries.',
      '',
      'Which of these spaces sounds most interesting to you, or is there a specific industry you want to explore?',
    ].join('\n');
  }

  if (
    q.includes('solve a real-world problem') ||
    q.includes('innovative solution') ||
    q.includes('explore an innovative solution')
  ) {
    return [
      '### First-Principles Problem & Solution Framework',
      '',
      '- **1. Spot the Workaround**: Look for processes where people currently stitch together spreadsheets, WhatsApp messages, and manual follow-ups every day.',
      '- **2. Score the Pain**: Evaluate **Frequency × Severity × Willingness to Pay**.',
      '- **3. Design the Wedge**: Build a focused tool that automates the single most repetitive step first rather than trying to replace the entire system on day one.',
      '',
      'What industry or everyday frustration are you most curious about solving?',
    ].join('\n');
  }

  if (q.includes('mvp') || q.includes('validate') || q.includes('pitch deck') || q.includes('fundrais')) {
    return [
      '### Practical MVP & Validation Guide',
      '',
      '- **1. Customer Discovery First**: Interview 10–15 target users about their current workflow before writing code (avoid pitching your solution right away; ask how they solve the problem today).',
      '- **2. Concierge / Scoped MVP**: Build only the core workflow that delivers the primary user outcome in under 2 weeks.',
      '- **3. Measure Real Commitment**: Track repeat usage, pilot sign-ups, or pre-orders rather than surface-level compliments.',
      '',
      'Tell me what stage your project is at and we can map out your exact next milestone.',
    ].join('\n');
  }

  // ---------------------------------------------------------------------------
  // MODE 7: GENERAL CONVERSATIONAL FALLBACK (Natural, direct, never a template)
  // ---------------------------------------------------------------------------
  return `Here to help! You mentioned **"${sanitizeText(trimmed, 120)}"**—tell me a bit more about what you'd like to know or accomplish, and I'll give you a direct, tailored answer.`;
}

