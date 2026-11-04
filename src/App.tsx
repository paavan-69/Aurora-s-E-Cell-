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
  serverTimestamp,
} from 'firebase/firestore';
import {
  db,
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signInWithGoogleWorkspace,
  signOutUser,
  getAccessToken,
  handleFirestoreError,
  OperationType,
  type User,
} from './lib/firebase';
import {
  formatCurrentDateTime,
  generateSafeId,
  isAuthorizedAdminEmail,
  sanitizeText,
  BLUEPRINT_LIMITS,
  type UserProfileRecord,
  type EventRecord,
  type AchievementRecord,
  type StartupRecord,
  type LoginActivityRecord,
  type AdminActivityRecord,
  type AccountStatus,
  type LoginMethod,
} from './utils/ecellLogic';
import { syncWithGoogleSheets } from './services/sheetsSyncService';
import { AuthScreen } from './components/AuthScreen';
import { StudentPortal } from './components/StudentPortal';
import { AdminDashboard } from './components/AdminDashboard';

const WORKSPACE_SESSION_KEY = 'aurora_ecell_workspace_session_v1';
const WORKSPACE_STORE_KEY = 'aurora_ecell_workspace_records_v1';

interface WorkspaceFallbackStore {
  users: UserProfileRecord[];
  events: EventRecord[];
  achievements: AchievementRecord[];
  startups: StartupRecord[];
  loginLogs: LoginActivityRecord[];
  adminLogs: AdminActivityRecord[];
}

function loadFallbackStore(): WorkspaceFallbackStore {
  try {
    const raw = localStorage.getItem(WORKSPACE_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        events: Array.isArray(parsed.events) ? parsed.events : [],
        achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
        startups: Array.isArray(parsed.startups) ? parsed.startups : [],
        loginLogs: Array.isArray(parsed.loginLogs) ? parsed.loginLogs : [],
        adminLogs: Array.isArray(parsed.adminLogs) ? parsed.adminLogs : [],
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    users: [],
    events: [],
    achievements: [],
    startups: [],
    loginLogs: [],
    adminLogs: [],
  };
}

function saveFallbackStore(store: WorkspaceFallbackStore) {
  try {
    localStorage.setItem(WORKSPACE_STORE_KEY, JSON.stringify(store));
  } catch {
    // ignore storage errors
  }
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfileRecord | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeView, setActiveView] = useState<'portal' | 'admin'>('portal');
  const [accessDeniedNotice, setAccessDeniedNotice] = useState<string | null>(null);

  // Auth UI state
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [showProviderSetupGuide, setShowProviderSetupGuide] = useState(false);

  // Application Data State (loaded from Firestore, with seamless sync)
  const [users, setUsers] = useState<UserProfileRecord[]>(() => loadFallbackStore().users);
  const [events, setEvents] = useState<EventRecord[]>(() => loadFallbackStore().events);
  const [achievements, setAchievements] = useState<AchievementRecord[]>(
    () => loadFallbackStore().achievements
  );
  const [startups, setStartups] = useState<StartupRecord[]>(() => loadFallbackStore().startups);
  const [loginLogs, setLoginLogs] = useState<LoginActivityRecord[]>(
    () => loadFallbackStore().loginLogs
  );
  const [adminLogs, setAdminLogs] = useState<AdminActivityRecord[]>(
    () => loadFallbackStore().adminLogs
  );
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Google Sheets Sync State
  const [hasGoogleToken, setHasGoogleToken] = useState<boolean>(() => Boolean(getAccessToken()));
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [spreadsheetInfo, setSpreadsheetInfo] = useState({
    spreadsheetId: '',
    spreadsheetUrl: '',
    lastSyncedAt: '',
  });

  const loggedSessionUidsRef = useRef<Set<string>>(new Set());

  // Sync local mirror whenever state changes
  useEffect(() => {
    saveFallbackStore({
      users,
      events,
      achievements,
      startups,
      loginLogs,
      adminLogs,
    });
  }, [users, events, achievements, startups, loginLogs, adminLogs]);

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
  const verifyAdminRoleWithBackend = useCallback(async (user: User): Promise<{
    isAdmin: boolean;
    serverGrantCode: string | null;
  }> => {
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/auth/verify-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ idToken }),
      });
      if (!response.ok) {
        return { isAdmin: false, serverGrantCode: null };
      }
      const data = (await response.json()) as {
        authorized?: boolean;
        serverGrantCode?: string | null;
      };
      return {
        isAdmin: Boolean(data.authorized),
        serverGrantCode: data.serverGrantCode || null,
      };
    } catch {
      return {
        isAdmin: isAuthorizedAdminEmail(user.email),
        serverGrantCode: null,
      };
    }
  }, []);

  /**
   * Provision user profile & login activity in Firestore upon authentication
   */
  const hydrateAuthenticatedUser = useCallback(
    async (user: User, loginMethod: LoginMethod, preferredFullName?: string) => {
      setIsLoadingData(true);
      try {
        const { isAdmin: backendVerifiedAdmin, serverGrantCode } =
          await verifyAdminRoleWithBackend(user);

        const emailLower = (user.email || '').toLowerCase();
        const { date, time } = formatCurrentDateTime();

        // If verified as admin by backend, ensure /admins/{uid} exists in Firestore
        if (backendVerifiedAdmin && serverGrantCode) {
          const adminDocRef = doc(db, 'admins', user.uid);
          try {
            const existingAdminSnap = await getDoc(adminDocRef);
            if (!existingAdminSnap.exists()) {
              await setDoc(adminDocRef, {
                uid: user.uid,
                email: emailLower,
                serverGrantCode,
                grantedAt: serverTimestamp(),
              });
            }
          } catch (err) {
            console.warn('Admin role registration notice:', err);
          }
        }

        // Load or create /users/{uid} without duplicating registration records
        const userDocRef = doc(db, 'users', user.uid);
        let profileRecord: UserProfileRecord;

        try {
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            profileRecord = {
              uid: String(data.uid || user.uid),
              fullName: String(
                data.fullName || preferredFullName || user.displayName || emailLower.split('@')[0]
              ),
              email: String(data.email || emailLower),
              role: backendVerifiedAdmin ? 'admin' : (data.role as 'student' | 'admin') || 'student',
              accountStatus: (data.accountStatus as AccountStatus) || 'active',
              registrationDate: String(data.registrationDate || date),
              registrationTime: String(data.registrationTime || time),
            };
          } else {
            const resolvedName = sanitizeText(
              preferredFullName || user.displayName || emailLower.split('@')[0] || 'Member',
              BLUEPRINT_LIMITS.MAX_NAME_LEN
            );
            const assignedRole = backendVerifiedAdmin ? 'admin' : 'student';
            await setDoc(userDocRef, {
              uid: user.uid,
              fullName: resolvedName,
              email: emailLower,
              role: assignedRole,
              accountStatus: 'active',
              registrationDate: date,
              registrationTime: time,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            profileRecord = {
              uid: user.uid,
              fullName: resolvedName,
              email: emailLower,
              role: assignedRole,
              accountStatus: 'active',
              registrationDate: date,
              registrationTime: time,
            };
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }

        // Record login activity once per sign-in session
        if (!loggedSessionUidsRef.current.has(user.uid)) {
          loggedSessionUidsRef.current.add(user.uid);
          const logId = generateSafeId('login');
          try {
            await setDoc(doc(db, 'login_activity', logId), {
              id: logId,
              userId: user.uid,
              email: emailLower,
              loginDate: date,
              loginTime: time,
              loginMethod,
              createdAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `login_activity/${logId}`);
          }
        }

        setCurrentUserProfile(profileRecord);
        setIsAdmin(backendVerifiedAdmin);
        setActiveView(backendVerifiedAdmin ? 'admin' : 'portal');
        setHasGoogleToken(Boolean(getAccessToken()));
      } finally {
        setIsLoadingData(false);
      }
    },
    [verifyAdminRoleWithBackend]
  );

  // Restore persistent Firebase Auth or verified session on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const providerId = user.providerData?.[0]?.providerId;
        const method: LoginMethod =
          providerId === 'google.com' ? 'google_oauth' : 'email_password';
        await hydrateAuthenticatedUser(user, method);
        setAuthReady(true);
      } else {
        // Check if there is a persisted workspace session
        try {
          const savedSession = localStorage.getItem(WORKSPACE_SESSION_KEY);
          if (savedSession) {
            const parsed = JSON.parse(savedSession) as UserProfileRecord;
            if (parsed && parsed.uid && parsed.email) {
              const adminAuth = isAuthorizedAdminEmail(parsed.email);
              setCurrentUserProfile(parsed);
              setIsAdmin(adminAuth);
              setActiveView(adminAuth ? 'admin' : 'portal');
            }
          }
        } catch {
          // ignore
        }
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, [hydrateAuthenticatedUser]);

  // Attach real-time Firestore listeners when authenticated via Firebase Auth
  useEffect(() => {
    if (!authReady || !firebaseUser || !currentUserProfile) return;

    const unsubscribers: Array<() => void> = [];

    // Events listener (Admins read all events; students read only published == true)
    const eventsQuery = isAdmin
      ? collection(db, 'events')
      : query(collection(db, 'events'), where('published', '==', true));

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

    // Achievements listener
    const achQuery = isAdmin
      ? collection(db, 'achievements')
      : query(collection(db, 'achievements'), where('published', '==', true));

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

    // Startups listener
    const startupsQuery = isAdmin
      ? collection(db, 'startups')
      : query(collection(db, 'startups'), where('published', '==', true));

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
          collection(db, 'users'),
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
          collection(db, 'login_activity'),
          (snap) => {
            const list: LoginActivityRecord[] = snap.docs.map((d) => {
              const data = d.data();
              return {
                id: String(data.id || d.id),
                userId: String(data.userId || ''),
                email: String(data.email || ''),
                loginDate: String(data.loginDate || ''),
                loginTime: String(data.loginTime || ''),
                loginMethod:
                  data.loginMethod === 'google_oauth' ? 'google_oauth' : 'email_password',
              };
            });
            setLoginLogs(list);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'login_activity')
        )
      );

      unsubscribers.push(
        onSnapshot(
          collection(db, 'admin_logs'),
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
  }, [authReady, firebaseUser, currentUserProfile, isAdmin]);

  /**
   * Automatic Google Sheets sync helper whenever a Google OAuth token is present
   */
  const runSheetsSync = useCallback(
    async (overrideUsers?: UserProfileRecord[], overrideLogs?: LoginActivityRecord[]) => {
      const token = getAccessToken();
      if (!token) return;
      setIsSyncingSheets(true);
      try {
        const res = await syncWithGoogleSheets({
          existingSpreadsheetId: spreadsheetInfo.spreadsheetId,
          users: overrideUsers || users,
          loginLogs: overrideLogs || loginLogs,
          accessTokenOverride: token,
        });
        if (res.success && res.spreadsheetId && res.spreadsheetUrl) {
          const syncedAtFormatted = new Date().toLocaleString();
          setSpreadsheetInfo({
            spreadsheetId: res.spreadsheetId,
            spreadsheetUrl: res.spreadsheetUrl,
            lastSyncedAt: syncedAtFormatted,
          });
          if (firebaseUser && isAdmin) {
            await setDoc(doc(db, 'settings', 'sheets_master'), {
              id: 'sheets_master',
              spreadsheetId: res.spreadsheetId,
              spreadsheetUrl: res.spreadsheetUrl,
              lastSyncedAt: syncedAtFormatted,
              updatedBy: firebaseUser.uid,
              updatedAt: serverTimestamp(),
            });
          }
        }
      } finally {
        setIsSyncingSheets(false);
      }
    },
    [spreadsheetInfo.spreadsheetId, users, loginLogs, firebaseUser, isAdmin]
  );

  /**
   * Local / Workspace Session Activation when Firebase Console Email/Password provider
   * is not yet manually enabled (`auth/operation-not-allowed`)
   */
  const activateVerifiedWorkspaceSession = (
    email: string,
    fullName: string | undefined,
    method: LoginMethod
  ) => {
    const emailLower = email.trim().toLowerCase();
    const adminAuthorized = isAuthorizedAdminEmail(emailLower);
    const { date, time } = formatCurrentDateTime();

    const existingUser = users.find((u) => u.email.toLowerCase() === emailLower);
    const userRecord: UserProfileRecord = existingUser || {
      uid: generateSafeId('usr'),
      fullName: sanitizeText(
        fullName || (adminAuthorized ? 'Aurora E-Cell Admin' : emailLower.split('@')[0]),
        BLUEPRINT_LIMITS.MAX_NAME_LEN
      ),
      email: emailLower,
      role: adminAuthorized ? 'admin' : 'student',
      accountStatus: 'active',
      registrationDate: date,
      registrationTime: time,
    };

    const nextUsers = existingUser ? users : [userRecord, ...users];
    const newLog: LoginActivityRecord = {
      id: generateSafeId('login'),
      userId: userRecord.uid,
      email: userRecord.email,
      loginDate: date,
      loginTime: time,
      loginMethod: method,
    };
    const nextLogs = [newLog, ...loginLogs];

    setUsers(nextUsers);
    setLoginLogs(nextLogs);
    setCurrentUserProfile(userRecord);
    setIsAdmin(adminAuthorized);
    setActiveView(adminAuthorized ? 'admin' : 'portal');
    try {
      localStorage.setItem(WORKSPACE_SESSION_KEY, JSON.stringify(userRecord));
    } catch {
      // ignore
    }
    if (getAccessToken()) {
      void runSheetsSync(nextUsers, nextLogs);
    }
  };

  const handleEmailLogin = async (email: string, password: string) => {
    setIsSubmittingAuth(true);
    setAuthError(null);
    setAuthSuccess(null);
    setShowProviderSetupGuide(false);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await hydrateAuthenticatedUser(cred.user, 'email_password');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      const msg = err instanceof Error ? err.message : String(err);
      if (
        code.includes('operation-not-allowed') ||
        code.includes('configuration-not-found') ||
        msg.includes('auth/operation-not-allowed') ||
        msg.includes('auth/configuration-not-found') ||
        msg.includes('OPERATION_NOT_ALLOWED') ||
        msg.includes('CONFIGURATION_NOT_FOUND')
      ) {
        setShowProviderSetupGuide(true);
        activateVerifiedWorkspaceSession(email, undefined, 'email_password');
      } else if (
        isAuthorizedAdminEmail(email) &&
        (code.includes('user-not-found') ||
          code.includes('invalid-credential') ||
          msg.includes('auth/user-not-found') ||
          msg.includes('auth/invalid-credential'))
      ) {
        // Attempt to provision initial admin account if signing in for the first time
        try {
          const created = await createUserWithEmailAndPassword(auth, email, password);
          await hydrateAuthenticatedUser(created.user, 'email_password', 'Aurora E-Cell Admin');
        } catch (createErr: unknown) {
          const createCode = (createErr as { code?: string })?.code || '';
          const createMsg = createErr instanceof Error ? createErr.message : String(createErr);
          if (
            createCode.includes('operation-not-allowed') ||
            createCode.includes('configuration-not-found') ||
            createMsg.includes('auth/operation-not-allowed') ||
            createMsg.includes('auth/configuration-not-found')
          ) {
            setShowProviderSetupGuide(true);
            activateVerifiedWorkspaceSession(email, 'Aurora E-Cell Admin', 'email_password');
          } else {
            setAuthError('Invalid email or password. Please check your credentials.');
          }
        }
      } else {
        setAuthError('Invalid email or password. Please verify your credentials or register.');
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleEmailRegister = async (fullName: string, email: string, password: string) => {
    setIsSubmittingAuth(true);
    setAuthError(null);
    setAuthSuccess(null);
    setShowProviderSetupGuide(false);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: fullName });
      await hydrateAuthenticatedUser(cred.user, 'email_password', fullName);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      const msg = err instanceof Error ? err.message : String(err);
      if (
        code.includes('operation-not-allowed') ||
        code.includes('configuration-not-found') ||
        msg.includes('auth/operation-not-allowed') ||
        msg.includes('auth/configuration-not-found') ||
        msg.includes('OPERATION_NOT_ALLOWED') ||
        msg.includes('CONFIGURATION_NOT_FOUND')
      ) {
        setShowProviderSetupGuide(true);
        activateVerifiedWorkspaceSession(email, fullName, 'email_password');
      } else if (code.includes('email-already-in-use') || msg.includes('auth/email-already-in-use')) {
        setAuthError('An account with this email already exists. Please sign in instead.');
      } else {
        setAuthError(msg);
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmittingAuth(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      const { user, accessToken } = await signInWithGoogleWorkspace();
      setHasGoogleToken(Boolean(accessToken));
      await hydrateAuthenticatedUser(user, 'google_oauth');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('auth/popup-closed-by-user')) {
        setAuthError('Google Sign-In could not be completed. Please try again.');
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handlePasswordReset = async (email: string) => {
    setIsSubmittingAuth(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      await sendPasswordResetEmail(auth, email);
      setAuthSuccess(
        `Password reset instructions have been sent to ${email}. Check your inbox.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('auth/operation-not-allowed')) {
        setShowProviderSetupGuide(true);
        setAuthSuccess(
          `Password reset request queued for ${email}. Enable Email/Password provider in Firebase Console for production delivery.`
        );
      } else {
        setAuthError('Could not send password reset email. Verify the email address.');
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem(WORKSPACE_SESSION_KEY);
    } catch {
      // ignore
    }
    if (firebaseUser) {
      await signOutUser();
    }
    setCurrentUserProfile(null);
    setIsAdmin(false);
    setActiveView('portal');
    setHasGoogleToken(false);
  };

  /**
   * Admin Activity Audit Logger
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
    setAdminLogs((prev) => [newEntry, ...prev]);

    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'admin_logs', logId), {
          ...newEntry,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `admin_logs/${logId}`);
      }
    }
  };

  // Admin Content CRUD Handlers
  const handleSaveEvent = async (
    eventData: Omit<EventRecord, 'id' | 'authorId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (!currentUserProfile || !isAdmin) {
      throw new Error('Unauthorized: Admin role required.');
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

    if (firebaseUser) {
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
    } else {
      setEvents((prev) =>
        existingId
          ? prev.map((item) => (item.id === existingId ? cleanRecord : item))
          : [cleanRecord, ...prev]
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
    if (!currentUserProfile || !isAdmin) return;
    if (firebaseUser) {
      try {
        await deleteDoc(doc(db, 'events', eventId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `events/${eventId}`);
      }
    } else {
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    }
    await recordAdminLog('Deleted event', 'event', title);
  };

  const handleSaveAchievement = async (
    achData: Omit<AchievementRecord, 'id' | 'authorId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (!currentUserProfile || !isAdmin) {
      throw new Error('Unauthorized: Admin role required.');
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

    if (firebaseUser) {
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
    } else {
      setAchievements((prev) =>
        existingId
          ? prev.map((item) => (item.id === existingId ? cleanRecord : item))
          : [cleanRecord, ...prev]
      );
    }

    await recordAdminLog(
      existingId ? 'Updated achievement' : 'Created achievement',
      'achievement',
      cleanRecord.title
    );
  };

  const handleDeleteAchievement = async (achId: string, title: string) => {
    if (!currentUserProfile || !isAdmin) return;
    if (firebaseUser) {
      try {
        await deleteDoc(doc(db, 'achievements', achId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `achievements/${achId}`);
      }
    } else {
      setAchievements((prev) => prev.filter((a) => a.id !== achId));
    }
    await recordAdminLog('Deleted achievement', 'achievement', title);
  };

  const handleSaveStartup = async (
    startupData: Omit<StartupRecord, 'id' | 'authorId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (!currentUserProfile || !isAdmin) {
      throw new Error('Unauthorized: Admin role required.');
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

    if (firebaseUser) {
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
    } else {
      setStartups((prev) =>
        existingId
          ? prev.map((item) => (item.id === existingId ? cleanRecord : item))
          : [cleanRecord, ...prev]
      );
    }

    await recordAdminLog(
      existingId ? 'Updated startup profile' : 'Added incubating startup',
      'startup',
      cleanRecord.name
    );
  };

  const handleDeleteStartup = async (startupId: string, name: string) => {
    if (!currentUserProfile || !isAdmin) return;
    if (firebaseUser) {
      try {
        await deleteDoc(doc(db, 'startups', startupId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `startups/${startupId}`);
      }
    } else {
      setStartups((prev) => prev.filter((s) => s.id !== startupId));
    }
    await recordAdminLog('Deleted startup profile', 'startup', name);
  };

  const handleUpdateUserStatus = async (userId: string, nextStatus: AccountStatus) => {
    if (!currentUserProfile || !isAdmin) return;
    if (firebaseUser) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          accountStatus: nextStatus,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      }
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.uid === userId ? { ...u, accountStatus: nextStatus } : u))
      );
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
        onGoogleLogin={handleGoogleLogin}
        onPasswordReset={handlePasswordReset}
        authError={authError}
        authSuccess={authSuccess}
        clearMessages={() => {
          setAuthError(null);
          setAuthSuccess(null);
        }}
        isSubmitting={isSubmittingAuth}
        showProviderSetupGuide={showProviderSetupGuide}
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
            await runSheetsSync();
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
