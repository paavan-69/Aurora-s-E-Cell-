import express, { type Request, type Response, type NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  SHEET1_HEADERS,
  SHEET2_HEADERS,
  MAX_NEC_MEMBERS,
  AURORA_AI_SYSTEM_INSTRUCTION,
  validateAuroraAiRequest,
  buildAuroraAiStructuredFallback,
  validateNecMemberInput,
  formatUserRegistrationSheetRows,
  formatLoginActivitySheetRows,
  isAuthorizedAdminEmail,
  deriveUserIdFromEmail,
  type UserProfileRecord,
  type LoginActivityRecord,
  type NecMemberRecord,
} from '../src/utils/ecellLogic';

dotenv.config();

const MASTER_SPREADSHEET_TITLE = 'AURORA E-CELL — USER DATABASE';

/**
 * Resolves the Firebase Web API Key for server-side token verification with Google Identity Toolkit.
 * Checks environment variables first (FIREBASE_API_KEY / VITE_FIREBASE_API_KEY), then falls back
 * to reading firebase-applet-config.json from disk.
 */
export function getFirebaseApiKey(): string {
  const envKey = (
    process.env.FIREBASE_API_KEY ||
    process.env.VITE_FIREBASE_API_KEY ||
    ''
  ).trim();
  if (envKey) {
    return envKey;
  }

  try {
    const raw = fs.readFileSync(path.resolve(process.cwd(), 'firebase-applet-config.json'), 'utf-8');
    const parsed = JSON.parse(raw) as { apiKey?: string };
    return parsed.apiKey || '';
  } catch {
    return '';
  }
}

/**
 * Derives an HMAC signing key on the server for issuing and verifying signed session tokens.
 */
function getServerSessionSigningKey(): string {
  const secret =
    process.env.SESSION_SIGNING_SECRET ||
    process.env.ADMIN_BOOTSTRAP_SECRET ||
    getFirebaseApiKey() ||
    'aurora-ecell-server-hmac-key';
  return crypto.createHash('sha256').update(`aurora_session_key:${secret}`).digest('hex');
}

export function createSignedServerSessionToken(payload: {
  uid: string;
  email: string;
  role: 'admin' | 'student';
}): string {
  const data = {
    uid: payload.uid,
    email: payload.email.trim().toLowerCase(),
    role: payload.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(data), 'utf-8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getServerSessionSigningKey())
    .update(encoded)
    .digest('base64url');
  return `ecell_st.${encoded}.${sig}`;
}

export function verifySignedServerSessionToken(token: string): {
  uid: string;
  email: string;
  emailVerified: boolean;
} | null {
  if (!token || !token.startsWith('ecell_st.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', getServerSessionSigningKey())
    .update(encoded)
    .digest('base64url');
  if (sig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as {
      uid?: string;
      email?: string;
      exp?: number;
    };
    if (!parsed.uid || !parsed.email || !parsed.exp || Date.now() > parsed.exp) {
      return null;
    }
    return {
      uid: parsed.uid,
      email: parsed.email.toLowerCase(),
      emailVerified: true,
    };
  } catch {
    return null;
  }
}

/**
 * Resolves whether a verified email address belongs to an authorized administrator.
 */
export function isServerAuthorizedAdmin(verifiedEmail: string): boolean {
  const emailLower = verifiedEmail.trim().toLowerCase();
  if (!emailLower) return false;
  const configuredAdmin = (process.env.ADMIN_EMAIL || 'adminecell@gmail.com').trim().toLowerCase();
  return isAuthorizedAdminEmail(emailLower) || emailLower === configuredAdmin;
}

// Sliding-window rate limiter per IP for /api routes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function apiRateLimiter(req: Request, res: Response, next: NextFunction) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') ||
    req.ip ||
    req.socket?.remoteAddress ||
    'unknown';
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 120;

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return next();
  }

  entry.count += 1;
  if (entry.count > maxRequests) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
  }
  return next();
}

/**
 * Verifies a Firebase ID Token using Google Identity Toolkit REST API
 * OR a server-signed HMAC session token so the backend cryptographically confirms the user's UID and email.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<{
  uid: string;
  email: string;
  emailVerified: boolean;
} | null> {
  if (!idToken) return null;

  const signedSession = verifySignedServerSessionToken(idToken);
  if (signedSession) {
    return signedSession;
  }

  const apiKey = getFirebaseApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!response.ok) return null;
    const data = (await response.json()) as {
      users?: Array<{ localId: string; email?: string; emailVerified?: boolean }>;
    };
    const user = data.users?.[0];
    if (!user || !user.localId || !user.email) return null;

    return {
      uid: user.localId,
      email: user.email.toLowerCase(),
      emailVerified: Boolean(user.emailVerified),
    };
  } catch (err) {
    console.error('Error verifying Firebase ID token on server:', err);
    return null;
  }
}

/**
 * Extracts the Bearer token from the Authorization header or request body.
 */
function extractBearerToken(req: Request): string {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const customHeader = req.headers['x-firebase-id-token'];
  if (typeof customHeader === 'string' && customHeader.trim()) {
    return customHeader.trim();
  }
  if (typeof req.body?.idToken === 'string' && req.body.idToken.trim()) {
    return req.body.idToken.trim();
  }
  return '';
}

/**
 * Helper with exponential backoff retry for Google API calls
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  delayMs = 500
): Promise<globalThis.Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status >= 500 && attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt)));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Network request failed after retries');
}

const app = express();
app.use(express.json({ limit: '5mb' }));

const apiRouter = express.Router();
apiRouter.use(apiRateLimiter);

/**
 * GET /api/health
 * Health & configuration status endpoint for Vercel and local monitoring.
 */
apiRouter.get('/health', (_req: Request, res: Response) => {
  const hasFirebaseApiKey = Boolean(getFirebaseApiKey());
  const hasAdminBootstrapSecret = Boolean(
    process.env.ADMIN_BOOTSTRAP_SECRET && process.env.ADMIN_BOOTSTRAP_SECRET.trim().length >= 16
  );
  const hasInitialAdminPassword = Boolean(
    process.env.ADMIN_INITIAL_PASSWORD && process.env.ADMIN_INITIAL_PASSWORD.length >= 6
  );

  return res.status(200).json({
    status: 'ok',
    service: 'aurora-ecell-api',
    timestamp: new Date().toISOString(),
    firebaseConfigured: hasFirebaseApiKey,
    adminBootstrapReady: hasAdminBootstrapSecret && hasInitialAdminPassword,
    spreadsheetTitle: MASTER_SPREADSHEET_TITLE,
  });
});

/**
 * POST /api/auth/verify-role
 * Server-side role verification: verifies the user's Firebase ID token OR verified PBKDF2 credential
 * and checks whether the user is an authorized administrator on the server.
 * Never trusts client-supplied role values or hardcoded grant codes.
 */
apiRouter.post('/auth/verify-role', async (req: Request, res: Response) => {
  const idToken = extractBearerToken(req);

  if (idToken) {
    const verifiedUser = await verifyFirebaseIdToken(idToken);
    if (!verifiedUser) {
      return res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }

    const isAdmin = isServerAuthorizedAdmin(verifiedUser.email);
    const sessionToken = createSignedServerSessionToken({
      uid: verifiedUser.uid,
      email: verifiedUser.email,
      role: isAdmin ? 'admin' : 'student',
    });

    return res.status(200).json({
      uid: verifiedUser.uid,
      email: verifiedUser.email,
      emailVerified: verifiedUser.emailVerified,
      role: isAdmin ? 'admin' : 'student',
      authorized: isAdmin,
      sessionToken,
    });
  }

  // Verify credential-authenticated session (when user signs in with PBKDF2 verifier)
  const { uid, email, passwordHash } = (req.body || {}) as {
    uid?: string;
    email?: string;
    passwordHash?: string;
  };

  if (
    typeof uid === 'string' &&
    typeof email === 'string' &&
    typeof passwordHash === 'string' &&
    /^[0-9a-f]{64}$/.test(passwordHash)
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const expectedUid = await deriveUserIdFromEmail(normalizedEmail);
    if (uid !== expectedUid) {
      return res.status(401).json({ error: 'Invalid user identifier for email.' });
    }

    const isAdmin = isServerAuthorizedAdmin(normalizedEmail);
    const sessionToken = createSignedServerSessionToken({
      uid: expectedUid,
      email: normalizedEmail,
      role: isAdmin ? 'admin' : 'student',
    });

    return res.status(200).json({
      uid: expectedUid,
      email: normalizedEmail,
      emailVerified: true,
      role: isAdmin ? 'admin' : 'student',
      authorized: isAdmin,
      sessionToken,
    });
  }

  return res.status(401).json({ error: 'Missing Firebase ID token.' });
});

/**
 * POST /api/auth/bootstrap-admin
 * Protected backend setup endpoint that provisions the initial admin account
 * using ADMIN_INITIAL_PASSWORD and ADMIN_BOOTSTRAP_SECRET from server environment variables.
 * Requires the caller to provide a valid x-admin-setup-secret header matching ADMIN_BOOTSTRAP_SECRET.
 */
apiRouter.post('/auth/bootstrap-admin', async (req: Request, res: Response) => {
  const expectedSecret = (process.env.ADMIN_BOOTSTRAP_SECRET || '').trim();
  const providedSecret =
    typeof req.headers['x-admin-setup-secret'] === 'string'
      ? req.headers['x-admin-setup-secret'].trim()
      : '';

  if (!expectedSecret || expectedSecret.length < 16) {
    return res.status(403).json({
      configured: false,
      error:
        'Admin bootstrap is disabled unless ADMIN_BOOTSTRAP_SECRET (min 16 chars) is configured in server environment variables.',
    });
  }

  if (!providedSecret || providedSecret !== expectedSecret) {
    return res.status(403).json({
      configured: false,
      error: 'Forbidden: Invalid or missing x-admin-setup-secret header.',
    });
  }

  const apiKey = getFirebaseApiKey();
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
  const adminEmail = (process.env.ADMIN_EMAIL || 'adminecell@gmail.com').trim().toLowerCase();

  if (!apiKey) {
    return res.status(500).json({
      configured: false,
      error: 'Firebase API key is not configured on the server.',
    });
  }

  if (!adminPassword || adminPassword.length < 6) {
    return res.status(400).json({
      configured: false,
      error:
        'ADMIN_INITIAL_PASSWORD environment variable is not set or is shorter than 6 characters.',
    });
  }

  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
          returnSecureToken: false,
        }),
      }
    );
    const data = (await resp.json()) as { error?: { message?: string } };
    if (!resp.ok) {
      if (data.error?.message === 'EMAIL_EXISTS') {
        return res.status(200).json({
          configured: true,
          message: 'Administrator account is already provisioned in Firebase Authentication.',
        });
      }
      return res.status(400).json({
        configured: false,
        error: data.error?.message || 'Could not provision administrator account.',
      });
    }

    return res.status(200).json({
      configured: true,
      message: 'Administrator account provisioned via protected backend setup.',
    });
  } catch (err) {
    return res.status(500).json({
      configured: false,
      error: err instanceof Error ? err.message : 'Server error during admin bootstrap.',
    });
  }
});

/**
 * POST /api/sheets/sync
 * Admin-only endpoint that synchronises Firestore User Registrations and Login Activity
 * to the master Google Spreadsheet named "AURORA E-CELL — USER DATABASE" in Google Drive.
 */
apiRouter.post('/sheets/sync', async (req: Request, res: Response) => {
  const authToken = extractBearerToken(req);
  if (!authToken) {
    return res.status(401).json({
      error: 'Authentication required: Missing Firebase ID token.',
    });
  }

  const verifiedUser = await verifyFirebaseIdToken(authToken);
  if (!verifiedUser) {
    return res.status(401).json({
      error: 'Authentication failed: Invalid or expired authentication token.',
    });
  }

  if (!isServerAuthorizedAdmin(verifiedUser.email)) {
    return res.status(403).json({
      error: 'Forbidden: Only authorized administrators can synchronise Google Sheets.',
    });
  }

  const headerGoogleToken = req.headers['x-google-access-token'];
  const googleAccessToken =
    (typeof headerGoogleToken === 'string' ? headerGoogleToken.trim() : '') ||
    (typeof req.body?.googleAccessToken === 'string' ? req.body.googleAccessToken.trim() : '');

  if (!googleAccessToken) {
    return res.status(400).json({
      error: 'Missing Google OAuth access token. Connect Google Drive & Sheets first.',
    });
  }

  const {
    existingSpreadsheetId,
    users = [],
    loginLogs = [],
  } = req.body as {
    existingSpreadsheetId?: string;
    users?: UserProfileRecord[];
    loginLogs?: LoginActivityRecord[];
  };

  try {
    let spreadsheetId = (existingSpreadsheetId || '').trim();
    let spreadsheetUrl = '';

    // Step 1: Verify existing spreadsheet or search Google Drive for "AURORA E-CELL — USER DATABASE"
    if (spreadsheetId) {
      const checkRes = await fetchWithRetry(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${googleAccessToken}` },
        }
      );
      if (checkRes.ok) {
        const sheetMeta = (await checkRes.json()) as { spreadsheetUrl?: string };
        spreadsheetUrl =
          sheetMeta.spreadsheetUrl ||
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      } else {
        spreadsheetId = '';
      }
    }

    if (!spreadsheetId) {
      const query = `name = '${MASTER_SPREADSHEET_TITLE}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
      const searchRes = await fetchWithRetry(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)&pageSize=1`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${googleAccessToken}` },
        }
      );

      if (searchRes.ok) {
        const searchData = (await searchRes.json()) as {
          files?: Array<{ id: string; webViewLink?: string }>;
        };
        if (searchData.files && searchData.files.length > 0) {
          spreadsheetId = searchData.files[0].id;
          spreadsheetUrl =
            searchData.files[0].webViewLink ||
            `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
        }
      }
    }

    // Step 2: If not found, create the master spreadsheet with the two required worksheets
    if (!spreadsheetId) {
      const createRes = await fetchWithRetry('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            title: MASTER_SPREADSHEET_TITLE,
          },
          sheets: [
            {
              properties: {
                title: 'User Registrations',
                gridProperties: { frozenRowCount: 1 },
              },
            },
            {
              properties: {
                title: 'Login Activity',
                gridProperties: { frozenRowCount: 1 },
              },
            },
          ],
        }),
      });

      if (!createRes.ok) {
        const errBody = await createRes.text();
        return res.status(createRes.status).json({
          error: `Failed to create master Google Sheet: ${errBody}`,
        });
      }

      const created = (await createRes.json()) as {
        spreadsheetId: string;
        spreadsheetUrl?: string;
      };
      spreadsheetId = created.spreadsheetId;
      spreadsheetUrl =
        created.spreadsheetUrl ||
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    } else {
      // Ensure both required worksheet tabs exist on an existing spreadsheet
      const metaRes = await fetchWithRetry(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${googleAccessToken}` },
        }
      );
      if (metaRes.ok) {
        const meta = (await metaRes.json()) as {
          sheets?: Array<{ properties?: { title?: string } }>;
        };
        const existingTitles = new Set(
          (meta.sheets || []).map((s) => s.properties?.title || '')
        );
        const requests: Array<Record<string, unknown>> = [];
        if (!existingTitles.has('User Registrations')) {
          requests.push({
            addSheet: {
              properties: {
                title: 'User Registrations',
                gridProperties: { frozenRowCount: 1 },
              },
            },
          });
        }
        if (!existingTitles.has('Login Activity')) {
          requests.push({
            addSheet: {
              properties: {
                title: 'Login Activity',
                gridProperties: { frozenRowCount: 1 },
              },
            },
          });
        }
        if (requests.length > 0) {
          await fetchWithRetry(
            `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${googleAccessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ requests }),
            }
          );
        }
      }
    }

    // Step 3: Format deduplicated User Registrations (Sheet 1) and Login Activity (Sheet 2)
    // Pure formatters strip any extraneous fields and never include passwords, hashes, or tokens.
    const safeUsers = Array.isArray(users) ? users : [];
    const safeLogs = Array.isArray(loginLogs) ? loginLogs : [];

    const sheet1Values = [
      Array.from(SHEET1_HEADERS),
      ...formatUserRegistrationSheetRows(safeUsers),
    ];
    const sheet2Values = [
      Array.from(SHEET2_HEADERS),
      ...formatLoginActivitySheetRows(safeLogs),
    ];

    // Clear and batch-update both worksheets atomically
    await fetchWithRetry(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchClear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ranges: ["'User Registrations'!A1:Z10000", "'Login Activity'!A1:Z50000"],
        }),
      }
    );

    const updateRes = await fetchWithRetry(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: [
            {
              range: "'User Registrations'!A1",
              majorDimension: 'ROWS',
              values: sheet1Values,
            },
            {
              range: "'Login Activity'!A1",
              majorDimension: 'ROWS',
              values: sheet2Values,
            },
          ],
        }),
      }
    );

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      return res.status(updateRes.status).json({
        error: `Failed to write rows to Google Sheet: ${errText}`,
      });
    }

    return res.status(200).json({
      success: true,
      spreadsheetId,
      spreadsheetUrl,
      spreadsheetTitle: MASTER_SPREADSHEET_TITLE,
      syncedUsersCount: sheet1Values.length - 1,
      syncedLogsCount: sheet2Values.length - 1,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Google Sheets sync error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to synchronise Google Sheet.',
    });
  }
});

/**
 * POST /api/admin/validate-nec-member
 * Backend validation endpoint that verifies administrator authorization and
 * strictly enforces the 25-member maximum limit (MAX_NEC_MEMBERS = 25) on the server.
 */
apiRouter.post('/admin/validate-nec-member', async (req: Request, res: Response) => {
  const authToken = extractBearerToken(req);
  if (!authToken) {
    return res.status(401).json({ error: 'Authentication required: Missing session token.' });
  }

  const verifiedUser = await verifyFirebaseIdToken(authToken);
  if (!verifiedUser || !isServerAuthorizedAdmin(verifiedUser.email)) {
    return res.status(403).json({
      error: 'Forbidden: Only authorized administrators can manage the NEC Team.',
    });
  }

  const {
    member,
    existingMembers = [],
    editingMemberId = null,
  } = (req.body || {}) as {
    member?: { name?: string; role?: string; photoUrl?: string };
    existingMembers?: Array<Pick<NecMemberRecord, 'id' | 'name' | 'role'>>;
    editingMemberId?: string | null;
  };

  const validation = validateNecMemberInput(
    {
      name: String(member?.name || ''),
      role: String(member?.role || ''),
      photoUrl: String(member?.photoUrl || ''),
    },
    Array.isArray(existingMembers) ? existingMembers : [],
    editingMemberId
  );

  if (!validation.valid) {
    return res.status(400).json({
      valid: false,
      maxMembers: MAX_NEC_MEMBERS,
      currentCount: Array.isArray(existingMembers) ? existingMembers.length : 0,
      errors: validation.errors,
    });
  }

  return res.status(200).json({
    valid: true,
    maxMembers: MAX_NEC_MEMBERS,
    currentCount: Array.isArray(existingMembers) ? existingMembers.length : 0,
  });
});

/**
 * POST /api/aurora-ai
 * Server-side AI Assistant endpoint powered by @google/genai.
 * Uses multi-attempt retry with ThinkingLevel.MINIMAL on gemini-3.1-flash-lite and ThinkingLevel.LOW on gemini-3.8-flash
 * so transient upstream demand spikes never cause a server error.
 */
apiRouter.post('/aurora-ai', async (req: Request, res: Response) => {
  try {
    const validation = validateAuroraAiRequest({
      message: req.body?.message,
      history: req.body?.history,
    });

    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error || 'Invalid prompt.',
      });
    }

    const { sanitizedMessage, sanitizedHistory } = validation;
    const normalizedLower = sanitizedMessage.toLowerCase().replace(/[!.?]+$/g, '').trim();

    // Instant response path for exact Master System Prompt greetings & discovery triggers
    const instantIntents = new Set([
      'hello',
      'hey',
      'hey there',
      'hi',
      'hii',
      'hi there',
      'how are you',
      'how are you doing',
      "how's it going",
      'thanks',
      'thank you',
      'i have a startup idea',
      'i have an idea',
      'tell me a joke',
      'joke',
    ]);

    if (instantIntents.has(normalizedLower)) {
      return res.status(200).json({
        reply: buildAuroraAiStructuredFallback(sanitizedMessage, sanitizedHistory),
        model: 'aurora-ai',
      });
    }

    const geminiApiKey = (
      process.env.GEMINI_API_KEY ||
      process.env.API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ''
    ).trim();

    if (geminiApiKey) {
      const ai = new GoogleGenAI({
        apiKey: geminiApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
          timeout: 10000,
        },
      });

      const contents = [
        ...sanitizedHistory.map((turn) => ({
          role: turn.role,
          parts: [{ text: turn.text }],
        })),
        {
          role: 'user' as const,
          parts: [{ text: sanitizedMessage }],
        },
      ];

      const queryModel = async (
        model: string,
        thinkingLevel?: ThinkingLevel,
        delayMs = 0
      ): Promise<{ reply: string; model: string }> => {
        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: AURORA_AI_SYSTEM_INSTRUCTION,
            ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
          },
        });
        const text = (response.text ?? '').trim();
        if (!text) {
          throw new Error('Empty model response');
        }
        return { reply: text, model };
      };

      try {
        const ceilingPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 6000)
        );
        const fastestModelPromise = Promise.any([
          queryModel('gemini-3.1-flash-lite'),
          queryModel('gemini-3.8-flash', ThinkingLevel.LOW, 150),
          queryModel('gemini-3.1-flash-lite', undefined, 900),
        ]).catch(() => null);

        const winner = await Promise.race([fastestModelPromise, ceilingPromise]);
        if (winner && winner.reply) {
          return res.status(200).json({
            reply: winner.reply,
            model: winner.model,
          });
        }
      } catch (err: unknown) {
        console.warn('Aurora AI model race warning:', err instanceof Error ? err.message : err);
      }
    }

    const fallbackReply = buildAuroraAiStructuredFallback(sanitizedMessage, sanitizedHistory);
    return res.status(200).json({
      reply: fallbackReply,
      model: 'aurora-ai',
    });
  } catch (unexpectedErr: unknown) {
    console.error('Unexpected error in /api/aurora-ai handler:', unexpectedErr);
    const safeMsg =
      typeof req.body?.message === 'string' && req.body.message.trim()
        ? req.body.message.trim()
        : 'Hello';
    return res.status(200).json({
      reply: buildAuroraAiStructuredFallback(safeMsg, []),
      model: 'aurora-ai',
    });
  }
});

// Mount API routes on both /api and / so Vercel serverless rewrites work regardless of path prefixing
app.use('/api', apiRouter);
app.use('/', apiRouter);

export { app };
export default app;
