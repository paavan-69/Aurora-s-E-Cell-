import * as XLSX from 'xlsx';
import {
  SHEET1_HEADERS,
  SHEET2_HEADERS,
  formatUserRegistrationSheetRows,
  formatLoginActivitySheetRows,
  type UserProfileRecord,
  type LoginActivityRecord,
} from '../utils/ecellLogic';
import { auth, getAccessToken } from '../lib/firebase';

export interface SyncStatusResult {
  success: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  spreadsheetTitle?: string;
  syncedUsersCount?: number;
  syncedLogsCount?: number;
  syncedAt?: string;
  error?: string;
}

/**
 * Synchronises the Firestore User Registrations and Login Activity records
 * with the master Google Sheet "AURORA E-CELL — USER DATABASE" in Google Drive
 * via the server-side admin-protected endpoint POST /api/sheets/sync.
 *
 * Security:
 * - Sends the caller's Firebase ID token or signed server session token in Authorization: Bearer <token>
 *   so the server verifies both authentication and Administrator role authorization.
 * - Sends the Google OAuth access token in x-google-access-token.
 * - Never sends or stores passwords, password hashes, or authentication tokens in spreadsheets.
 */
export async function syncWithGoogleSheets(params: {
  existingSpreadsheetId?: string;
  users: UserProfileRecord[];
  loginLogs: LoginActivityRecord[];
  accessTokenOverride?: string | null;
  sessionToken?: string | null;
}): Promise<SyncStatusResult> {
  const googleAccessToken = params.accessTokenOverride || getAccessToken();
  if (!googleAccessToken) {
    return {
      success: false,
      error:
        'Google Workspace token not active. Click "Connect Google Drive & Sheets" first to authorise spreadsheet sync.',
    };
  }

  let bearerToken = params.sessionToken || '';
  if (!bearerToken && auth.currentUser) {
    try {
      bearerToken = await auth.currentUser.getIdToken();
    } catch {
      bearerToken = '';
    }
  }

  if (!bearerToken) {
    return {
      success: false,
      error: 'Authentication required: Please sign in as an administrator before syncing.',
    };
  }

  try {
    const res = await fetch('/api/sheets/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearerToken}`,
        'x-google-access-token': googleAccessToken,
      },
      body: JSON.stringify({
        existingSpreadsheetId: params.existingSpreadsheetId || '',
        users: params.users,
        loginLogs: params.loginLogs,
      }),
    });

    const data = (await res.json()) as SyncStatusResult;
    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'Failed to synchronise with Google Sheets.',
      };
    }

    return data;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error during Google Sheets sync.',
    };
  }
}

/**
 * Generates and downloads a multi-sheet Excel (.xlsx) file named
 * "AURORA_E-CELL_USER_DATABASE.xlsx" containing:
 * - Sheet 1: User Registrations
 * - Sheet 2: Login Activity
 * Never includes passwords, hashes, or tokens.
 */
export function exportMasterDatabaseToExcel(params: {
  users: UserProfileRecord[];
  loginLogs: LoginActivityRecord[];
}): void {
  const workbook = XLSX.utils.book_new();

  const sheet1Data = [
    Array.from(SHEET1_HEADERS),
    ...formatUserRegistrationSheetRows(params.users),
  ];
  const worksheet1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  worksheet1['!cols'] = [
    { wch: 28 },
    { wch: 24 },
    { wch: 30 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet1, 'User Registrations');

  const sheet2Data = [
    Array.from(SHEET2_HEADERS),
    ...formatLoginActivitySheetRows(params.loginLogs),
  ];
  const worksheet2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  worksheet2['!cols'] = [
    { wch: 28 },
    { wch: 30 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet2, 'Login Activity');

  XLSX.writeFile(workbook, 'AURORA_E-CELL_USER_DATABASE.xlsx');
}
