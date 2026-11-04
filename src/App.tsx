/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import {
  db,
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signInWithGoogleWorkspace,
  signOutUser,
  getAccessToken,
  handleFirestoreError,
  OperationType,
} from './lib/firebase';
import {
  formatCurrentDateTime,
  generateSafeId,
  deriveUserIdFromEmail,
  generatePasswordSalt,
  hashPasswordWithSalt,
  verifyPasswordWithSalt,
  isAuthorizedAdminEmail,
  BOOTSTRAP_ADMIN_VERIFIER,
  sanitizeText,
  BLUEPRINT_LIMITS,
  type UserProfileRecord,
  type EventRecord,
  type AchievementRecord,
  type StartupRecord,
  type LoginActivityRecord,
  type AdminActivityRecord,
  type AccountStatus,
} from './utils/ecellLogic';
import { syncWithGoogleSheets, type SyncStatusResult } from './services/sheetsSyncService';
import { AuthScreen } from './components/AuthScreen';
import { StudentPortal } from './components/StudentPortal';
import { AdminDashboard } from './components/AdminDashboard';

const PERSISTED_SESSION_KEY = 'aurora_ecell_session_v2';

interface PersistedAuthSession {
  uid: string;
  email: string;
  sessionToken: string;
}

function loadPersistedSession(): PersistedAuthSession | null {
  try {
    const raw = localStorage.getItem(PERSISTED_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedAuthSession;
    if (parsed && typeof parsed.uid === 'string' && typeof parsed.email === 'string' && typeof parsed.sessionToken === 'string') {
      return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function savePersistedSession(session: PersistedAuthSession | null): void {
  try {
    if (!session) {
      localStorage.removeItem(PERSISTED_SESSION_KEY);
    } else {
      localStorage.setItem(PERSISTED_SESSION_KEY, JSON.stringify(session));
    }
  } catch {
    // ignore storage errors
  }
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfileRecord | null>(null);
  const [serverSessionToken, setServerSessionToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeView, setActiveView] = useState<'portal' | 'admin'>('portal');
  const [accessDeniedNotice, setAccessDeniedNotice] = useState<string | null>(null);

  // Auth UI state
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Application Data State (persisted exclusively in shared Firestore database)
  const [users, setUsers] = useState<UserProfileRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [achievements, setAchievements] = useState<AchievementRecord[]>([]);
  const [startups, setStartups] = useState<StartupRecord[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginActivityRecord[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminActivityRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Google Sheets Sync State (Admin Dashboard spreadsheet export/sync)
  const [hasGoogleToken, setHasGoogleToken] = useState<boolean>(() => Boolean(getAccessToken()));
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [spreadsheetInfo, setSpreadsheetInfo] = useState({
    spreadsheetId: '',
    spreadsheetUrl: '',
    lastSyncedAt: '',
  });

  // Guard URL hash/path attempts to access #admin or /admin by non-admin users
  useEffect(() => {
    const checkRouteGuard = () => {
      const wantsAdminRoute =
        window.location.hash === '#admin' || window.location.pathname === '/admin';
      if (wantsAdminRoute && currentUserProfile) {
        if (isAdmin) {
          setActiveView('admin');
          setAccessDeniedNotice(null);
        } else {
          setActiveView('portal');
          setAccessDeniedNotice(
            'Administrator authorization required. Regular user accounts cannot access the Admin Dashboard.'
          );
          if (window.location.hash === '#admin') {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
      }
    };

    checkRouteGuard();
    window.addEventListener('hashchange', checkRouteGuard);
    return () => window.removeEventListener('hashchange', checkRouteGuard);
  }, [currentUserProfile, isAdmin]);

  /**
   * Verify role on the backend server (/api/auth/verify-role)
   */
  const verifyAdminRoleWithBackend = useCallback(
    async (params: {
      uid: string;
      email: string;
      passwordHash?: string;
      sessionToken?: string;
    }): Promise<{
      isAdmin: boolean;
      sessionToken: string | null;
    }> => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (params.sessionToken) {
          headers.Authorization = `Bearer ${params.sessionToken}`;
        }

        const response = await fetch('/api/auth/verify-role', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            uid: params.uid,
            email: params.email,
            passwordHash: params.passwordHash,
            idToken: params.sessionToken,
          }),
        });
        if (!response.ok) {
          return { isAdmin: false, sessionToken: null };
        }
        const data = (await response.json()) as {
          authorized?: boolean;
          role?: string;
          sessionToken?: string;
        };
        return {
          isAdmin: Boolean(data.authorized && data.role === 'admin'),
          sessionToken: data.sessionToken || params.sessionToken || null,
        };
      } catch (err) {
        console.error('Failed to verify role with /api/auth/verify-role:', err);
        return { isAdmin: false, sessionToken: null };
      }
    },
    []
  );

  // Restore persistent authenticated session on mount and verify against Firestore + backend
  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      const saved = loadPersistedSession();
      if (!saved) {
        if (!cancelled) setAuthReady(true);
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, 'users', saved.uid));
        if (!userSnap.exists()) {
          savePersistedSession(null);
          if (!cancelled) setAuthReady(true);
          return;
        }

        const data = userSnap.data();
        if (data.accountStatus === 'suspended') {
          savePersistedSession(null);
          if (!cancelled) setAuthReady(true);
          return;
        }

        const { isAdmin: verifiedAdmin, sessionToken: refreshedToken } =
          await verifyAdminRoleWithBackend({
            uid: saved.uid,
            email: saved.email,
            sessionToken: saved.sessionToken,
          });

        if (!refreshedToken) {
          savePersistedSession(null);
          if (!cancelled) setAuthReady(true);
          return;
        }

        const profileRecord: UserProfileRecord = {
          uid: String(data.uid || saved.uid),
          fullName: String(data.fullName || saved.email.split('@')[0]),
          email: String(data.email || saved.email),
          role: verifiedAdmin ? 'admin' : 'student',
          accountStatus: (data.accountStatus as AccountStatus) || 'active',
          registrationDate: String(data.registrationDate || ''),
          registrationTime: String(data.registrationTime || ''),
        };

        if (!cancelled) {
          setCurrentUserProfile(profileRecord);
          setServerSessionToken(refreshedToken);
          setIsAdmin(verifiedAdmin);
          setActiveView(verifiedAdmin ? 'admin' : 'portal');
          setAuthReady(true);
        }
      } catch {
        if (!cancelled) setAuthReady(true);
      }
    };

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, [verifyAdminRoleWithBackend]);

  // Attach real-time Firestore listeners when authenticated
  useEffect(() => {
    if (!authReady || !currentUserProfile) return;

    const unsubscribers: Array<() => void> = [];

    // Events listener (Admins read all events; students read only published == true)
    const eventsQuery = isAdmin
      ? query(collection(db, 'events'), limit(500))
      : query(collection(db, 'events'), where('published', '==', true), limit(500));

    unsubscribers.push(
      onSnapshot(
        eventsQuery,
        (snap) => {
          const items: EventRecord[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: String(data.id || d.id),
              title: String(data.title || ''),
              description: String(data.description || ''),
              posterUrl: String(data.posterUrl || ''),
              date: String(data.date || ''),
              time: String(data.time || ''),
              venue: String(data.venue || ''),
              eventStatus: data.eventStatus || 'upcoming',
              additionalInfo: String(data.additionalInfo || ''),
              registrationUrl: String(data.registrationUrl || ''),
              published: Boolean(data.published),
              authorId: String(data.authorId || ''),
            };
          });
          setEvents(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'events')
      )
    );

    // Achievements listener (Admins read all; students read only published == true)
    const achQuery = isAdmin
      ? query(collection(db, 'achievements'), limit(500))
      : query(collection(db, 'achievements'), where('published', '==', true), limit(500));

    unsubscribers.push(
      onSnapshot(
        achQuery,
        (snap) => {
          const items: AchievementRecord[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: String(data.id || d.id),
              title: String(data.title || ''),
              description: String(data.description || ''),
              imageUrl: String(data.imageUrl || ''),
              date: String(data.date || ''),
              additionalDetails: String(data.additionalDetails || ''),
              published: Boolean(data.published),
              authorId: String(data.authorId || ''),
            };
          });
          setAchievements(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'achievements')
      )
    );

    // Startups listener (Admins read all; students read only published == true)
    const startupsQuery = isAdmin
      ? query(collection(db, 'startups'), limit(500))
      : query(collection(db, 'startups'), where('published', '==', true), limit(500));

    unsubscribers.push(
      onSnapshot(
        startupsQuery,
        (snap) => {
          const items: StartupRecord[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: String(data.id || d.id),
              name: String(data.name || ''),
              logoUrl: String(data.logoUrl || ''),
              description: String(data.description || ''),
              category: String(data.category || ''),
              founderInfo: String(data.founderInfo || ''),
              imageUrl: String(data.imageUrl || ''),
              currentStatus: data.currentStatus || 'incubating',
              additionalDetails: String(data.additionalDetails || ''),
              published: Boolean(data.published),
              authorId: String(data.authorId || ''),
            };
          });
          setStartups(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'startups')
      )
    );

    // Admin-only collections: all users, all login_activity, admin_logs, settings
    if (isAdmin) {
      unsubscribers.push(
        onSnapshot(
          query(collection(db, 'users'), limit(500)),
          (snap) => {
            const list: UserProfileRecord[] = snap.docs.map((d) => {
              const data = d.data();
              return {
                uid: String(data.uid || d.id),
                fullName: String(data.fullName || ''),
                email: String(data.email || ''),
                role: data.role === 'admin' ? 'admin' : 'student',
                accountStatus: data.accountStatus === 'suspended' ? 'suspended' : 'active',
                registrationDate: String(data.registrationDate || ''),
                registrationTime: String(data.registrationTime || ''),
              };
            });
            setUsers(list);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'users')
        )
      );

      unsubscribers.push(
        onSnapshot(
          query(collection(db, 'login_activity'), limit(500)),
          (snap) => {
            const list: LoginActivityRecord[] = snap.docs.map((d) => {
              const data = d.data();
              return {
                id: String(data.id || d.id),
                userId: String(data.userId || ''),
                email: String(data.email || ''),
                loginDate: String(data.loginDate || ''),
                loginTime: String(data.loginTime || ''),
                loginMethod: 'email_password',
              };
            });
            setLoginLogs(list);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'login_activity')
        )
      );

      unsubscribers.push(
        onSnapshot(
          query(collection(db, 'admin_logs'), limit(500)),
          (snap) => {
            const list: AdminActivityRecord[] = snap.docs.map((d) => {
              const data = d.data();
              return {
                id: String(data.id || d.id),
                adminId: String(data.adminId || ''),
                adminEmail: String(data.adminEmail || ''),
                action: String(data.action || ''),
                targetType: data.targetType || 'event',
                targetTitle: String(data.targetTitle || ''),
              };
            });
            setAdminLogs(list);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'admin_logs')
        )
      );

      unsubscribers.push(
        onSnapshot(
          doc(db, 'settings', 'sheets_master'),
          (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              setSpreadsheetInfo({
                spreadsheetId: String(data.spreadsheetId || ''),
                spreadsheetUrl: String(data.spreadsheetUrl || ''),
                lastSyncedAt: String(data.lastSyncedAt || ''),
              });
            }
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'settings/sheets_master')
        )
      );
    }

    return () => {
      for (const unsub of unsubscribers) unsub();
    };
  }, [authReady, currentUserProfile, isAdmin]);

  /**
   * Server-protected Google Sheets sync helper
   */
  const runSheetsSync = useCallback(
    async (
      overrideUsers?: UserProfileRecord[],
      overrideLogs?: LoginActivityRecord[]
    ): Promise<SyncStatusResult> => {
      const token = getAccessToken();
      if (!token) {
        return {
          success: false,
          error: 'Google Workspace token not active. Connect Google Drive & Sheets first.',
        };
      }
      setIsSyncingSheets(true);
      try {
        const res = await syncWithGoogleSheets({
          existingSpreadsheetId: spreadsheetInfo.spreadsheetId,
          users: overrideUsers || users,
          loginLogs: overrideLogs || loginLogs,
          accessTokenOverride: token,
          sessionToken: serverSessionToken,
        });
        if (res.success && res.spreadsheetId && res.spreadsheetUrl) {
          const syncedAtFormatted = new Date().toLocaleString();
          setSpreadsheetInfo({
            spreadsheetId: res.spreadsheetId,
            spreadsheetUrl: res.spreadsheetUrl,
            lastSyncedAt: syncedAtFormatted,
          });
          if (currentUserProfile && isAdmin) {
            await setDoc(doc(db, 'settings', 'sheets_master'), {
              id: 'sheets_master',
              spreadsheetId: res.spreadsheetId,
              spreadsheetUrl: res.spreadsheetUrl,
              lastSyncedAt: syncedAtFormatted,
              updatedBy: currentUserProfile.uid,
              updatedAt: serverTimestamp(),
            });
          }
        }
        return res;
      } finally {
        setIsSyncingSheets(false);
      }
    },
    [spreadsheetInfo.spreadsheetId, users, loginLogs, serverSessionToken, currentUserProfile, isAdmin]
  );

  // Automatic background sync to Google Sheets when an admin has an active Google OAuth token and users/loginLogs update
  const lastAutoSyncSignatureRef = useRef<string>('');
  useEffect(() => {
    if (!isAdmin || !hasGoogleToken || !currentUserProfile) return;
    if (users.length === 0 && loginLogs.length === 0) return;

    const signature = `${users.length}:${loginLogs.length}:${users[0]?.uid || ''}:${loginLogs[0]?.id || ''}`;
    if (signature === lastAutoSyncSignatureRef.current) return;
    lastAutoSyncSignatureRef.current = signature;

    void runSheetsSync(users, loginLogs);
  }, [isAdmin, hasGoogleToken, currentUserProfile, users, loginLogs, runSheetsSync]);

  /**
   * STEP 1: REGISTER ACCOUNT FIRST
   * Saves salted PBKDF2-SHA256 credential verifier (/auth_credentials/{uid}) and
   * full user registration profile (/users/{uid}) in the shared Firestore database,
   * then transitions the user to the Sign In tab.
   */
  const handleEmailRegister = async (
    fullName: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    setIsSubmittingAuth(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      const emailLower = email.trim().toLowerCase();
      const resolvedName = sanitizeText(fullName.trim(), BLUEPRINT_LIMITS.MAX_NAME_LEN);
      const uid = await deriveUserIdFromEmail(emailLower);

      const credRef = doc(db, 'auth_credentials', uid);
      const userRef = doc(db, 'users', uid);

      const [existingCredSnap, existingUserSnap] = await Promise.all([
        getDoc(credRef),
        getDoc(userRef),
      ]);

      const isBootstrapAdmin = emailLower === BOOTSTRAP_ADMIN_VERIFIER.email;

      if ((existingCredSnap.exists() || existingUserSnap.exists()) && !isBootstrapAdmin) {
        setAuthError(
          'An account with this email is already registered. Please sign in with your password.'
        );
        return false;
      }

      // Compute salted PBKDF2-SHA256 password verifier (never store plaintext password)
      const matchesOfficialAdminPassword =
        isBootstrapAdmin &&
        (await verifyPasswordWithSalt(
          password,
          BOOTSTRAP_ADMIN_VERIFIER.salt,
          BOOTSTRAP_ADMIN_VERIFIER.hash
        ));

      const passwordSalt = matchesOfficialAdminPassword
        ? BOOTSTRAP_ADMIN_VERIFIER.salt
        : generatePasswordSalt();
      const passwordHash = matchesOfficialAdminPassword
        ? BOOTSTRAP_ADMIN_VERIFIER.hash
        : await hashPasswordWithSalt(password, passwordSalt);
      const { date, time } = formatCurrentDateTime();
      const assignedRole: 'admin' | 'student' = isAuthorizedAdminEmail(emailLower)
        ? 'admin'
        : 'student';

      // 1. Save or update salted credential verifier in Firestore (/auth_credentials/{uid})
      if (existingCredSnap.exists()) {
        await updateDoc(credRef, {
          passwordHash,
          passwordSalt,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(credRef, {
          uid,
          email: emailLower,
          passwordHash,
          passwordSalt,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // 2. Save or update user registration record in Firestore (/users/{uid})
      if (existingUserSnap.exists()) {
        await updateDoc(userRef, {
          fullName: resolvedName,
          role: assignedRole,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(userRef, {
          uid,
          fullName: resolvedName,
          email: emailLower,
          role: assignedRole,
          accountStatus: 'active',
          registrationDate: date,
          registrationTime: time,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // 3. If authorized admin email, also register /admins/{uid} in Firestore
      if (assignedRole === 'admin') {
        const adminRef = doc(db, 'admins', uid);
        const adminSnap = await getDoc(adminRef);
        if (!adminSnap.exists()) {
          await setDoc(adminRef, {
            uid,
            email: emailLower,
            grantedAt: serverTimestamp(),
          });
        }
      }

      setAuthSuccess(
        'Registration complete! All your account details have been saved. Please sign in below with your password.'
      );
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAuthError(`Could not complete registration: ${msg}`);
      return false;
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  /**
   * STEP 2: SIGN IN WITH REGISTERED ACCOUNT
   * Verifies that the account was registered first (or matches the preconfigured official
   * E-Cell admin credential verifier), checks the PBKDF2-SHA256 password verifier,
   * verifies role on the server (/api/auth/verify-role), records Login Activity (/login_activity/{logId})
   * in Firestore, and enters the Portal / Admin Console.
   */
  const handleEmailLogin = async (email: string, password: string) => {
    setIsSubmittingAuth(true);
    setAuthError(null);
    setAuthSuccess(null);
    setIsLoadingData(true);

    try {
      const emailLower = email.trim().toLowerCase();
      const uid = await deriveUserIdFromEmail(emailLower);

      const credRef = doc(db, 'auth_credentials', uid);
      const userRef = doc(db, 'users', uid);

      let [credSnap, userSnap] = await Promise.all([getDoc(credRef), getDoc(userRef)]);
      const { date, time } = formatCurrentDateTime();

      // Official E-Cell Admin account support (adminecell@gmail.com)
      const isBootstrapAdmin = emailLower === BOOTSTRAP_ADMIN_VERIFIER.email;
      const matchesBootstrapAdminVerifier =
        isBootstrapAdmin &&
        (await verifyPasswordWithSalt(
          password,
          BOOTSTRAP_ADMIN_VERIFIER.salt,
          BOOTSTRAP_ADMIN_VERIFIER.hash
        ));

      if (matchesBootstrapAdminVerifier) {
        if (!credSnap.exists()) {
          await setDoc(credRef, {
            uid,
            email: emailLower,
            passwordHash: BOOTSTRAP_ADMIN_VERIFIER.hash,
            passwordSalt: BOOTSTRAP_ADMIN_VERIFIER.salt,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else if (String(credSnap.data().passwordHash || '') !== BOOTSTRAP_ADMIN_VERIFIER.hash) {
          await updateDoc(credRef, {
            passwordHash: BOOTSTRAP_ADMIN_VERIFIER.hash,
            passwordSalt: BOOTSTRAP_ADMIN_VERIFIER.salt,
            updatedAt: serverTimestamp(),
          });
        }

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid,
            fullName: BOOTSTRAP_ADMIN_VERIFIER.fullName,
            email: emailLower,
            role: 'admin',
            accountStatus: 'active',
            registrationDate: date,
            registrationTime: time,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        [credSnap, userSnap] = await Promise.all([getDoc(credRef), getDoc(userRef)]);
      }

      if (!credSnap.exists() || !userSnap.exists()) {
        setAuthError(
          'No registered account found for this email. Please register your account first in "1. Register Account", then sign in.'
        );
        return;
      }

      const credData = credSnap.data();
      const passwordValid =
        matchesBootstrapAdminVerifier ||
        (await verifyPasswordWithSalt(
          password,
          String(credData.passwordSalt || ''),
          String(credData.passwordHash || '')
        ));

      if (!passwordValid) {
        setAuthError('Invalid email or password. Please check your password and try again.');
        return;
      }

      const userData = userSnap.data();
      if (userData.accountStatus === 'suspended') {
        setAuthError('Your account has been suspended by the administrator.');
        return;
      }

      // Server-side role verification via /api/auth/verify-role
      const { isAdmin: backendVerifiedAdmin, sessionToken } = await verifyAdminRoleWithBackend({
        uid,
        email: emailLower,
        passwordHash: String(credData.passwordHash || ''),
      });

      if (backendVerifiedAdmin) {
        const adminRef = doc(db, 'admins', uid);
        const adminSnap = await getDoc(adminRef);
        if (!adminSnap.exists()) {
          await setDoc(adminRef, {
            uid,
            email: emailLower,
            grantedAt: serverTimestamp(),
          });
        }
        if (userData.role !== 'admin') {
          await updateDoc(userRef, {
            role: 'admin',
            updatedAt: serverTimestamp(),
          });
        }
      }

      // Record Login Activity in shared Firestore database (/login_activity/{logId})
      const logId = generateSafeId('login');
      await setDoc(doc(db, 'login_activity', logId), {
        id: logId,
        userId: uid,
        email: emailLower,
        loginDate: date,
        loginTime: time,
        loginMethod: 'email_password',
        createdAt: serverTimestamp(),
      });

      const profileRecord: UserProfileRecord = {
        uid,
        fullName: String(userData.fullName || emailLower.split('@')[0]),
        email: emailLower,
        role: backendVerifiedAdmin ? 'admin' : 'student',
        accountStatus: (userData.accountStatus as AccountStatus) || 'active',
        registrationDate: String(userData.registrationDate || date),
        registrationTime: String(userData.registrationTime || time),
      };

      if (sessionToken) {
        savePersistedSession({
          uid,
          email: emailLower,
          sessionToken,
        });
      }

      setServerSessionToken(sessionToken);
      setCurrentUserProfile(profileRecord);
      setIsAdmin(backendVerifiedAdmin);
      setActiveView(backendVerifiedAdmin ? 'admin' : 'portal');
      setHasGoogleToken(Boolean(getAccessToken()));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAuthError(`Sign in failed: ${msg}`);
    } finally {
      setIsSubmittingAuth(false);
      setIsLoadingData(false);
    }
  };

  const handlePasswordReset = async (email: string) => {
    setIsSubmittingAuth(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      const emailLower = email.trim().toLowerCase();
      const uid = await deriveUserIdFromEmail(emailLower);
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (!userSnap.exists()) {
        setAuthError('No registered account found with that email address.');
        return;
      }

      setAuthSuccess(
        `Password reset request verified for ${emailLower}. Contact Aurora E-Cell administration if you need manual credential recovery.`
      );
    } catch {
      setAuthError('Could not process password reset request. Verify the email address.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleLogout = async () => {
    savePersistedSession(null);
    try {
      await signOutUser();
    } catch {
      // ignore
    }
    setServerSessionToken(null);
    setCurrentUserProfile(null);
    setIsAdmin(false);
    setActiveView('portal');
    setHasGoogleToken(false);
  };

  /**
   * Admin Activity Audit Logger (writes directly to shared Firestore database)
   */
  const recordAdminLog = async (
    action: string,
    targetType: AdminActivityRecord['targetType'],
    targetTitle: string
  ) => {
    if (!currentUserProfile || !isAdmin) return;
    const logId = generateSafeId('adm');
    const newEntry: AdminActivityRecord = {
      id: logId,
      adminId: currentUserProfile.uid,
      adminEmail: currentUserProfile.email,
      action,
      targetType,
      targetTitle: sanitizeText(targetTitle, 200),
    };

    try {
      await setDoc(doc(db, 'admin_logs', logId), {
        ...newEntry,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `admin_logs/${logId}`);
    }
  };

  // Admin Content CRUD Handlers (persisted in shared Firestore database)
  const handleSaveEvent = async (
    eventData: Omit<EventRecord, 'id' | 'authorId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (!currentUserProfile || !isAdmin) {
      throw new Error('Unauthorized: Authenticated Administrator session required.');
    }
    const id = existingId || generateSafeId('evt');
    const cleanRecord: EventRecord = {
      id,
      title: sanitizeText(eventData.title, BLUEPRINT_LIMITS.MAX_TITLE_LEN),
      description: sanitizeText(eventData.description, BLUEPRINT_LIMITS.MAX_DESC_LEN),
      posterUrl: eventData.posterUrl.slice(0, BLUEPRINT_LIMITS.MAX_IMAGE_DATA_LEN),
      date: sanitizeText(eventData.date, 40),
      time: sanitizeText(eventData.time, 40),
      venue: sanitizeText(eventData.venue, BLUEPRINT_LIMITS.MAX_VENUE_LEN),
      eventStatus: eventData.eventStatus,
      additionalInfo: sanitizeText(eventData.additionalInfo, BLUEPRINT_LIMITS.MAX_INFO_LEN),
      registrationUrl: sanitizeText(eventData.registrationUrl, BLUEPRINT_LIMITS.MAX_URL_LEN),
      published: Boolean(eventData.published),
      authorId: currentUserProfile.uid,
    };

    const ref = doc(db, 'events', id);
    try {
      if (existingId) {
        await updateDoc(ref, {
          title: cleanRecord.title,
          description: cleanRecord.description,
          posterUrl: cleanRecord.posterUrl,
          date: cleanRecord.date,
          time: cleanRecord.time,
          venue: cleanRecord.venue,
          eventStatus: cleanRecord.eventStatus,
          additionalInfo: cleanRecord.additionalInfo,
          registrationUrl: cleanRecord.registrationUrl,
          published: cleanRecord.published,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          ...cleanRecord,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(
        err,
        existingId ? OperationType.UPDATE : OperationType.CREATE,
        `events/${id}`
      );
    }

    await recordAdminLog(
      existingId
        ? `Updated event (${cleanRecord.published ? 'Published' : 'Draft'})`
        : `Created event (${cleanRecord.published ? 'Published' : 'Draft'})`,
      'event',
      cleanRecord.title
    );
  };

  const handleDeleteEvent = async (eventId: string, title: string) => {
    if (!currentUserProfile || !isAdmin) {
      throw new Error('Unauthorized: Authenticated Administrator session required.');
    }
    try {
      await deleteDoc(doc(db, 'events', eventId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `events/${eventId}`);
    }
    await recordAdminLog('Deleted event', 'event', title);
  };

  const handleSaveAchievement = async (
    achData: Omit<AchievementRecord, 'id' | 'authorId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (!currentUserProfile || !isAdmin) {
      throw new Error('Unauthorized: Authenticated Administrator session required.');
    }
    const id = existingId || generateSafeId('ach');
    const cleanRecord: AchievementRecord = {
      id,
      title: sanitizeText(achData.title, BLUEPRINT_LIMITS.MAX_TITLE_LEN),
      description: sanitizeText(achData.description, BLUEPRINT_LIMITS.MAX_DESC_LEN),
      imageUrl: achData.imageUrl.slice(0, BLUEPRINT_LIMITS.MAX_IMAGE_DATA_LEN),
      date: sanitizeText(achData.date, 40),
      additionalDetails: sanitizeText(achData.additionalDetails, BLUEPRINT_LIMITS.MAX_INFO_LEN),
      published: Boolean(achData.published),
      authorId: currentUserProfile.uid,
    };

    const ref = doc(db, 'achievements', id);
    try {
      if (existingId) {
        await updateDoc(ref, {
          title: cleanRecord.title,
          description: cleanRecord.description,
          imageUrl: cleanRecord.imageUrl,
          date: cleanRecord.date,
          additionalDetails: cleanRecord.additionalDetails,
          published: cleanRecord.published,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          ...cleanRecord,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(
        err,
        existingId ? OperationType.UPDATE : OperationType.CREATE,
        `achievements/${id}`
      );
    }

    await recordAdminLog(
      existingId ? 'Updated achievement' : 'Created achievement',
      'achievement',
      cleanRecord.title
    );
  };

  const handleDeleteAchievement = async (achId: string, title: string) => {
    if (!currentUserProfile || !isAdmin) {
      throw new Error('Unauthorized: Authenticated Administrator session required.');
    }
    try {
      await deleteDoc(doc(db, 'achievements', achId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `achievements/${achId}`);
    }
    await recordAdminLog('Deleted achievement', 'achievement', title);
  };

  const handleSaveStartup = async (
    startupData: Omit<StartupRecord, 'id' | 'authorId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (!currentUserProfile || !isAdmin) {
      throw new Error('Unauthorized: Authenticated Administrator session required.');
    }
    const id = existingId || generateSafeId('stp');
    const cleanRecord: StartupRecord = {
      id,
      name: sanitizeText(startupData.name, BLUEPRINT_LIMITS.MAX_TITLE_LEN),
      logoUrl: startupData.logoUrl.slice(0, BLUEPRINT_LIMITS.MAX_IMAGE_DATA_LEN),
      description: sanitizeText(startupData.description, BLUEPRINT_LIMITS.MAX_DESC_LEN),
      category: sanitizeText(startupData.category, BLUEPRINT_LIMITS.MAX_NAME_LEN),
      founderInfo: sanitizeText(startupData.founderInfo, BLUEPRINT_LIMITS.MAX_FOUNDER_LEN),
      imageUrl: startupData.imageUrl.slice(0, BLUEPRINT_LIMITS.MAX_IMAGE_DATA_LEN),
      currentStatus: startupData.currentStatus,
      additionalDetails: sanitizeText(startupData.additionalDetails, BLUEPRINT_LIMITS.MAX_INFO_LEN),
      published: Boolean(startupData.published),
      authorId: currentUserProfile.uid,
    };

    const ref = doc(db, 'startups', id);
    try {
      if (existingId) {
        await updateDoc(ref, {
          name: cleanRecord.name,
          logoUrl: cleanRecord.logoUrl,
          description: cleanRecord.description,
          category: cleanRecord.category,
          founderInfo: cleanRecord.founderInfo,
          imageUrl: cleanRecord.imageUrl,
          currentStatus: cleanRecord.currentStatus,
          additionalDetails: cleanRecord.additionalDetails,
          published: cleanRecord.published,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          ...cleanRecord,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(
        err,
        existingId ? OperationType.UPDATE : OperationType.CREATE,
        `startups/${id}`
      );
    }

    await recordAdminLog(
      existingId ? 'Updated startup profile' : 'Added incubating startup',
      'startup',
      cleanRecord.name
    );
  };

  const handleDeleteStartup = async (startupId: string, name: string) => {
    if (!currentUserProfile || !isAdmin) {
      throw new Error('Unauthorized: Authenticated Administrator session required.');
    }
    try {
      await deleteDoc(doc(db, 'startups', startupId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `startups/${startupId}`);
    }
    await recordAdminLog('Deleted startup profile', 'startup', name);
  };

  const handleUpdateUserStatus = async (userId: string, nextStatus: AccountStatus) => {
    if (!currentUserProfile || !isAdmin) {
      throw new Error('Unauthorized: Authenticated Administrator session required.');
    }
    try {
      await updateDoc(doc(db, 'users', userId), {
        accountStatus: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
    await recordAdminLog(`Changed user status to ${nextStatus}`, 'user', userId);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-halftone-light flex items-center justify-center p-6">
        <div className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-8 pop-shadow text-center space-y-3">
          <div className="font-display font-extrabold text-2xl text-[#0F0F0F]">
            AURORA E-CELL
          </div>
          <p className="text-xs font-mono text-neutral-600">
            Verifying session &amp; security credentials...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUserProfile) {
    return (
      <AuthScreen
        onEmailLogin={handleEmailLogin}
        onEmailRegister={handleEmailRegister}
        onPasswordReset={handlePasswordReset}
        authError={authError}
        authSuccess={authSuccess}
        clearMessages={() => {
          setAuthError(null);
          setAuthSuccess(null);
        }}
        isSubmitting={isSubmittingAuth}
      />
    );
  }

  const publishedEvents = events.filter((e) => e.published);
  const publishedAchievements = achievements.filter((a) => a.published);
  const publishedStartups = startups.filter((s) => s.published);

  return (
    <>
      {accessDeniedNotice && (
        <div
          role="alert"
          className="bg-[#E11D48] text-[#FFFDF7] px-6 py-3 border-b-2 border-[#0F0F0F] flex items-center justify-between text-xs font-bold"
        >
          <span>{accessDeniedNotice}</span>
          <button
            type="button"
            onClick={() => setAccessDeniedNotice(null)}
            className="underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {isAdmin && activeView === 'admin' ? (
        <AdminDashboard
          currentAdmin={currentUserProfile}
          users={users}
          events={events}
          achievements={achievements}
          startups={startups}
          loginLogs={loginLogs}
          adminLogs={adminLogs}
          spreadsheetInfo={spreadsheetInfo}
          hasGoogleToken={hasGoogleToken}
          isSyncingSheets={isSyncingSheets}
          onConnectGoogleWorkspace={async () => {
            const { accessToken } = await signInWithGoogleWorkspace();
            setHasGoogleToken(Boolean(accessToken));
          }}
          onTriggerSheetsSync={async () => {
            const result = await runSheetsSync();
            if (!result.success) {
              throw new Error(result.error || 'Failed to synchronise Google Sheet.');
            }
            await recordAdminLog(
              'Synchronised Google Drive spreadsheet',
              'sheets_sync',
              'AURORA E-CELL — USER DATABASE'
            );
          }}
          onSwitchToPortal={() => setActiveView('portal')}
          onLogout={handleLogout}
          onSaveEvent={handleSaveEvent}
          onDeleteEvent={handleDeleteEvent}
          onSaveAchievement={handleSaveAchievement}
          onDeleteAchievement={handleDeleteAchievement}
          onSaveStartup={handleSaveStartup}
          onDeleteStartup={handleDeleteStartup}
          onUpdateUserStatus={handleUpdateUserStatus}
        />
      ) : (
        <StudentPortal
          currentUser={currentUserProfile}
          isAdmin={isAdmin}
          onOpenAdminDashboard={() => {
            if (isAdmin) {
              setActiveView('admin');
            }
          }}
          onLogout={handleLogout}
          publishedEvents={publishedEvents}
          publishedAchievements={publishedAchievements}
          publishedStartups={publishedStartups}
          isLoadingData={isLoadingData}
        />
      )}
    </>
  );
}
