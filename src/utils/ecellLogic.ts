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


