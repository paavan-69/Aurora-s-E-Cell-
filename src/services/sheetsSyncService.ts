import * as XLSX from 'xlsx';
import {
  SHEET1_HEADERS,
  SHEET2_HEADERS,
  formatUserRegistrationSheetRows,
  formatLoginActivitySheetRows,
  type UserProfileRecord,
  type LoginActivityRecord,
} from '../utils/ecellLogic';
import { getAccessToken } from '../lib/firebase';

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

const MASTER_SPREADSHEET_TITLE = 'AURORA E-CELL — USER DATABASE';

/**
 * Direct client-side Google Drive + Sheets API sync fallback for static deployments (e.g. GitHub Pages)
 * where the Express /api/sheets/sync route is not running.
 */
async function syncDirectlyViaClientOAuth(params: {
  token: string;
  existingSpreadsheetId?: string;
  users: UserProfileRecord[];
  loginLogs: LoginActivityRecord[];
}): Promise<SyncStatusResult> {
  const { token, users, loginLogs } = params;
  let spreadsheetId = (params.existingSpreadsheetId || '').trim();
  let spreadsheetUrl = '';

  if (!spreadsheetId) {
    const query = `name = '${MASTER_SPREADSHEET_TITLE}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)&pageSize=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
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

  if (!spreadsheetId) {
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { title: MASTER_SPREADSHEET_TITLE },
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
      const errText = await createRes.text();
      return { success: false, error: `Failed to create spreadsheet: ${errText}` };
    }
    const created = (await createRes.json()) as {
      spreadsheetId: string;
      spreadsheetUrl?: string;
    };
    spreadsheetId = created.spreadsheetId;
    spreadsheetUrl =
      created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  } else if (!spreadsheetUrl) {
    spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  }

  const sheet1Values = [Array.from(SHEET1_HEADERS), ...formatUserRegistrationSheetRows(users)];
  const sheet2Values = [Array.from(SHEET2_HEADERS), ...formatLoginActivitySheetRows(loginLogs)];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchClear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ranges: ["'User Registrations'!A1:Z10000", "'Login Activity'!A1:Z50000"],
      }),
    }
  );

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
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
    return { success: false, error: `Failed to update spreadsheet: ${errText}` };
  }

  return {
    success: true,
    spreadsheetId,
    spreadsheetUrl,
    spreadsheetTitle: MASTER_SPREADSHEET_TITLE,
    syncedUsersCount: sheet1Values.length - 1,
    syncedLogsCount: sheet2Values.length - 1,
    syncedAt: new Date().toISOString(),
  };
}

/**
 * Synchronises the Firestore User Registrations and Login Activity records
 * with the master Google Sheet "AURORA E-CELL — USER DATABASE" in Google Drive.
 */
export async function syncWithGoogleSheets(params: {
  existingSpreadsheetId?: string;
  users: UserProfileRecord[];
  loginLogs: LoginActivityRecord[];
  accessTokenOverride?: string | null;
}): Promise<SyncStatusResult> {
  const token = params.accessTokenOverride || getAccessToken();
  if (!token) {
    return {
      success: false,
      error: 'Google Workspace token not active. Sign in or connect with Google to sync to Google Drive.',
    };
  }

  try {
    const res = await fetch('/api/sheets/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        existingSpreadsheetId: params.existingSpreadsheetId || '',
        users: params.users,
        loginLogs: params.loginLogs,
      }),
    });

    if (res.status === 404 || res.status === 405) {
      return await syncDirectlyViaClientOAuth({
        token,
        existingSpreadsheetId: params.existingSpreadsheetId,
        users: params.users,
        loginLogs: params.loginLogs,
      });
    }

    const data = (await res.json()) as SyncStatusResult;
    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'Failed to synchronise with Google Sheets.',
      };
    }

    return data;
  } catch {
    // Fallback to direct client OAuth call if static host has no backend server
    try {
      return await syncDirectlyViaClientOAuth({
        token,
        existingSpreadsheetId: params.existingSpreadsheetId,
        users: params.users,
        loginLogs: params.loginLogs,
      });
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error during Google Sheets sync.',
      };
    }
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
