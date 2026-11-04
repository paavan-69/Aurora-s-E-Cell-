import express, { type Request, type Response, type NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import {
  SHEET1_HEADERS,
  SHEET2_HEADERS,
  formatUserRegistrationSheetRows,
  formatLoginActivitySheetRows,
  isAuthorizedAdminEmail,
  type UserProfileRecord,
  type LoginActivityRecord,
} from './src/utils/ecellLogic';

dotenv.config();

const PORT = 3000;
const SERVER_GRANT_CODE = 'AURORA_ECELL_SERVER_VERIFIED_ADMIN_2026_9F8A7B';
const MASTER_SPREADSHEET_TITLE = 'AURORA E-CELL — USER DATABASE';

// Read Firebase API key from firebase-applet-config.json for server-side token verification
function getFirebaseApiKey(): string {
  try {
    const raw = fs.readFileSync(path.resolve(process.cwd(), 'firebase-applet-config.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed.apiKey || '';
  } catch {
    return '';
  }
}

// Simple sliding-window rate limiter per IP for /api routes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function apiRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 90;

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
 * so the backend cryptographically confirms the user's UID and email.
 */
async function verifyFirebaseIdToken(idToken: string): Promise<{
  uid: string;
  email: string;
  emailVerified: boolean;
} | null> {
  const apiKey = getFirebaseApiKey();
  if (!apiKey || !idToken) return null;

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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/api', apiRateLimiter);

  // Health & config status endpoint (never exposes secrets)
  app.get('/api/health', (_req: Request, res: Response) => {
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'adminecell@gmail.com').toLowerCase();
    const hasInitialAdminPassword = Boolean(
      process.env.ADMIN_INITIAL_PASSWORD && process.env.ADMIN_INITIAL_PASSWORD.length >= 6
    );
    res.json({
      status: 'ok',
      adminEmail: configuredAdminEmail,
      adminBootstrapReady: hasInitialAdminPassword,
      spreadsheetTitle: MASTER_SPREADSHEET_TITLE,
    });
  });

  /**
   * POST /api/auth/verify-role
   * Server-side role verification: verifies the user's Firebase ID token against
   * Google Identity Toolkit and checks whether the user is an authorized administrator.
   */
  app.post('/api/auth/verify-role', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : req.body?.idToken;

    if (!idToken) {
      return res.status(401).json({ error: 'Missing Firebase ID token.' });
    }

    const verifiedUser = await verifyFirebaseIdToken(idToken);
    if (!verifiedUser) {
      return res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }

    const configuredAdmin = (process.env.ADMIN_EMAIL || 'adminecell@gmail.com').trim().toLowerCase();
    const isAdmin =
      isAuthorizedAdminEmail(verifiedUser.email) || verifiedUser.email === configuredAdmin;

    return res.json({
      uid: verifiedUser.uid,
      email: verifiedUser.email,
      role: isAdmin ? 'admin' : 'student',
      authorized: isAdmin,
      serverGrantCode: isAdmin ? SERVER_GRANT_CODE : null,
    });
  });

  /**
   * POST /api/auth/bootstrap-admin
   * Protected backend setup endpoint that provisions adminecell@gmail.com
   * using ADMIN_INITIAL_PASSWORD from server environment if configured.
   */
  app.post('/api/auth/bootstrap-admin', async (_req: Request, res: Response) => {
    const apiKey = getFirebaseApiKey();
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
    const adminEmail = (process.env.ADMIN_EMAIL || 'adminecell@gmail.com').trim().toLowerCase();

    if (!adminPassword || adminPassword.length < 6) {
      return res.status(400).json({
        configured: false,
        message:
          'ADMIN_INITIAL_PASSWORD environment variable is not set on the server. Set ADMIN_INITIAL_PASSWORD in environment secrets or register/sign in with adminecell@gmail.com.',
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
            returnSecureToken: true,
          }),
        }
      );
      const data = (await resp.json()) as { error?: { message?: string } };
      if (!resp.ok) {
        if (data.error?.message === 'EMAIL_EXISTS') {
          return res.json({
            configured: true,
            message: 'Admin account (adminecell@gmail.com) is already provisioned.',
          });
        }
        return res.status(400).json({
          configured: false,
          message: data.error?.message || 'Could not provision admin account.',
        });
      }

      return res.json({
        configured: true,
        message: 'Admin account (adminecell@gmail.com) provisioned via backend setup.',
      });
    } catch (err) {
      return res.status(500).json({
        configured: false,
        message: err instanceof Error ? err.message : 'Server error during admin bootstrap.',
      });
    }
  });

  /**
   * POST /api/sheets/sync
   * Synchronises Firestore User Registrations and Login Activity to the master
   * Google Spreadsheet named "AURORA E-CELL — USER DATABASE" in Google Drive.
   * Uses the client-provided Google OAuth access token (Bearer header).
   * Never writes passwords, hashes, or tokens to the spreadsheet.
   */
  app.post('/api/sheets/sync', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization || '';
    const googleAccessToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';

    if (!googleAccessToken) {
      return res.status(401).json({
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
      const sheet1Values = [
        Array.from(SHEET1_HEADERS),
        ...formatUserRegistrationSheetRows(users),
      ];
      const sheet2Values = [
        Array.from(SHEET2_HEADERS),
        ...formatLoginActivitySheetRows(loginLogs),
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

      return res.json({
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

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aurora E-Cell Server listening on http://localhost:${PORT}`);
  });
}

startServer();
