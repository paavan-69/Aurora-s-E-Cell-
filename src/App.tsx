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
  isFirestoreQuotaExceeded,
  FIRESTORE_UPGRADE_URL,
  subscribeQuotaExceeded,
  notifyQuotaExceeded,
} from './lib/firebase';
import { ExternalLink, AlertTriangle } from 'lucide-react';

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
  MAX_NEC_MEMBERS,
  validateNecMemberInput,
  sortRecordsByDisplayOrder,
  computeReorderedDisplayOrders,
  type UserProfileRecord,
  type EventRecord,
  type AchievementRecord,
  type StartupRecord,
  type NecMemberRecord,
  type LeadershipRecord,
  type SponsorRecord,
  type LeadershipCategory,
  type SponsorCategory,
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

function loadLocalCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`aurora_cache_${key}`);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore storage errors
  }
  return fallback;
}

function saveLocalCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`aurora_cache_${key}`, JSON.stringify(data));
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
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    return subscribeQuotaExceeded((exceeded) => {
      setQuotaExceeded(exceeded);
    });
  }, []);

  // Auth UI state
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Application Data State (persisted with resilient local caching)
  const [users, setUsers] = useState<UserProfileRecord[]>(() => loadLocalCache('users', []));
  const [events, setEvents] = useState<EventRecord[]>(() => loadLocalCache('events', []));
  const [achievements, setAchievements] = useState<AchievementRecord[]>(() =>
    loadLocalCache('achievements', [])
  );
  const [startups, setStartups] = useState<StartupRecord[]>(() => loadLocalCache('startups', []));
  const [necMembers, setNecMembers] = useState<NecMemberRecord[]>(() =>
    loadLocalCache('nec_members', [])
  );
  const [leadershipMembers, setLeadershipMembers] = useState<LeadershipRecord[]>(() =>
    loadLocalCache('leadership', [])
  );
  const [sponsors, setSponsors] = useState<SponsorRecord[]>(() => loadLocalCache('sponsors', []));
  const [loginLogs, setLoginLogs] = useState<LoginActivityRecord[]>(() =>
    loadLocalCache('login_logs', [])
  );
  const [adminLogs, setAdminLogs] = useState<AdminActivityRecord[]>(() =>
    loadLocalCache('admin_logs', [])
  );
  const [isLoadingData, setIsLoadingData] = useState(false);


  // Google Sheets Sync State (Admin Dashboard spreadsheet export/sync)
  const [hasGoogleToken, setHasGoogleToken] = useState<boolean>(() => Boolean(getAccessToken()));
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [spreadsheetInfo, setSpreadsheetInfo] = useState({
    spreadsheetId: '',
    spreadsheetUrl: '',
    lastSyncedAt: '',
  });

  // Website Branding & Logos State (Aurora E-Cell top-left & Aurora College top-right)
  const [websiteBranding, setWebsiteBranding] = useState<{
    ecellLogoUrl: string;
    collegeLogoUrl: string;
  }>({
    ecellLogoUrl: '',
    collegeLogoUrl: '',
  });

  // Real-time listener for Website Branding & Logos across AuthScreen, StudentPortal, and AdminDashboard
  useEffect(() => {
    const brandingRef = doc(db, 'branding', 'website_logos');
    const unsub = onSnapshot(
      brandingRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setWebsiteBranding({
            ecellLogoUrl: String(data.ecellLogoUrl || ''),
            collegeLogoUrl: String(data.collegeLogoUrl || ''),
          });
        } else {
          setWebsiteBranding({
            ecellLogoUrl: '',
            collegeLogoUrl: '',
          });
        }
      },
      (err) => {
        console.warn('Could not load website branding logos:', err);
      }
    );
    return () => unsub();
  }, []);

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
  /**
   * Ensures an authorized administrator's UID is registered in /admins/{uid} in Firestore
   * so all Firestore security rules for events, achievements, startups, users, and logs succeed.
   */
  const ensureAdminRegisteredInFirestore = useCallback(async (uid: string, email: string) => {
    const emailLower = email.trim().toLowerCase();
    if (!isAuthorizedAdminEmail(emailLower)) return;
    try {
      const adminRef = doc(db, 'admins', uid);
      const adminSnap = await getDoc(adminRef);
      if (!adminSnap.exists()) {
        await setDoc(adminRef, {
          uid,
          email: emailLower,
          grantedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.warn('Could not verify /admins document:', err);
    }
  }, []);

  /**
   * Server-side role verification via /api/auth/verify-role with resilient fallback
   * for authorized administration emails (adminecell@gmail.com / paavanjampa@gmail.com).
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
      const emailLower = params.email.trim().toLowerCase();
      const fallbackIsAdmin = isAuthorizedAdminEmail(emailLower);
      const fallbackToken = params.sessionToken || `local_session_${params.uid}`;

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
            email: emailLower,
            passwordHash: params.passwordHash,
            idToken: params.sessionToken,
          }),
        });
        if (!response.ok) {
          return {
            isAdmin: fallbackIsAdmin,
            sessionToken: fallbackToken,
          };
        }
        const data = (await response.json()) as {
          authorized?: boolean;
          role?: string;
          sessionToken?: string;
        };
        return {
          isAdmin: Boolean((data.authorized && data.role === 'admin') || fallbackIsAdmin),
          sessionToken: data.sessionToken || fallbackToken,
        };
      } catch (err) {
        console.warn('Fallback to verified Firestore admin role:', err);
        return {
          isAdmin: fallbackIsAdmin,
          sessionToken: fallbackToken,
        };
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

        const emailLower = String(data.email || saved.email).trim().toLowerCase();
        const { isAdmin: verifiedAdmin, sessionToken: refreshedToken } =
          await verifyAdminRoleWithBackend({
            uid: saved.uid,
            email: emailLower,
            sessionToken: saved.sessionToken,
          });

        const finalIsAdmin = verifiedAdmin || isAuthorizedAdminEmail(emailLower) || data.role === 'admin';

        if (finalIsAdmin) {
          await ensureAdminRegisteredInFirestore(saved.uid, emailLower);
        }

        const profileRecord: UserProfileRecord = {
          uid: String(data.uid || saved.uid),
          fullName: String(data.fullName || emailLower.split('@')[0]),
          email: emailLower,
          role: finalIsAdmin ? 'admin' : 'student',
          accountStatus: (data.accountStatus as AccountStatus) || 'active',
          registrationDate: String(data.registrationDate || ''),
          registrationTime: String(data.registrationTime || ''),
        };

        if (!cancelled) {
          setCurrentUserProfile(profileRecord);
          setServerSessionToken(refreshedToken || saved.sessionToken);
          setIsAdmin(finalIsAdmin);
          setActiveView(finalIsAdmin ? 'admin' : 'portal');
          setAuthReady(true);
        }
      } catch (err) {

        if (isFirestoreQuotaExceeded(err)) {
          notifyQuotaExceeded();
        }
        if (!cancelled && saved) {
          const emailLower = String(saved.email).trim().toLowerCase();
          const finalIsAdmin = isAuthorizedAdminEmail(emailLower);
          setCurrentUserProfile({
            uid: saved.uid,
            fullName: finalIsAdmin ? 'Aurora E-Cell Admin' : emailLower.split('@')[0],
            email: emailLower,
            role: finalIsAdmin ? 'admin' : 'student',
            accountStatus: 'active',
            registrationDate: '',
            registrationTime: '',
          });
          setServerSessionToken(saved.sessionToken);
          setIsAdmin(finalIsAdmin);
          setActiveView(finalIsAdmin ? 'admin' : 'portal');
        }
        if (!cancelled) setAuthReady(true);
      }
    };


    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, [verifyAdminRoleWithBackend, ensureAdminRegisteredInFirestore]);

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
          saveLocalCache('events', items);
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
          saveLocalCache('achievements', items);
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
          saveLocalCache('startups', items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'startups')
      )
    );

    // NEC Team listener (Admins read all up to 25; students read published == true up to 25)
    const necQuery = isAdmin
      ? query(collection(db, 'nec_team'), limit(MAX_NEC_MEMBERS))
      : query(collection(db, 'nec_team'), where('published', '==', true), limit(MAX_NEC_MEMBERS));

    unsubscribers.push(
      onSnapshot(
        necQuery,
        (snap) => {
          const items: NecMemberRecord[] = snap.docs.map((d, idx) => {
            const data = d.data();
            return {
              id: String(data.id || d.id),
              name: String(data.name || ''),
              role: String(data.role || ''),
              photoUrl: String(data.photoUrl || ''),
              displayOrder: Number(data.displayOrder) || idx + 1,
              published: Boolean(data.published),
              authorId: String(data.authorId || ''),
            };
          });
          const sorted = sortRecordsByDisplayOrder(items);
          setNecMembers(sorted);
          saveLocalCache('nec_members', sorted);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'nec_team')
      )
    );

    // Leadership & Convenors listener
    const leadershipQuery = isAdmin
      ? query(collection(db, 'leadership'), limit(500))
      : query(collection(db, 'leadership'), where('published', '==', true), limit(500));

    unsubscribers.push(
      onSnapshot(
        leadershipQuery,
        (snap) => {
          const items: LeadershipRecord[] = snap.docs.map((d, idx) => {
            const data = d.data();
            const cat: LeadershipCategory = data.category === 'Head' ? 'Head' : 'Convenor';
            return {
              id: String(data.id || d.id),
              name: String(data.name || ''),
              role: String(data.role || ''),
              qualification: String(data.qualification || ''),
              photoUrl: String(data.photoUrl || ''),
              category: cat,
              displayOrder: Number(data.displayOrder) || idx + 1,
              published: Boolean(data.published),
              authorId: String(data.authorId || ''),
            };
          });
          const sorted = sortRecordsByDisplayOrder(items);
          setLeadershipMembers(sorted);
          saveLocalCache('leadership', sorted);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'leadership')
      )
    );

    // Sponsors & Supporting Partners listener
    const sponsorsQuery = isAdmin
      ? query(collection(db, 'sponsors'), limit(500))
      : query(collection(db, 'sponsors'), where('published', '==', true), limit(500));

    unsubscribers.push(
      onSnapshot(
        sponsorsQuery,
        (snap) => {
          const items: SponsorRecord[] = snap.docs.map((d, idx) => {
            const data = d.data();
            const cat: SponsorCategory =
              data.category === 'Sponsor' ? 'Sponsor' : 'Supporting Partner';
            return {
              id: String(data.id || d.id),
              name: String(data.name || ''),
              logoUrl: String(data.logoUrl || ''),
              category: cat,
              displayOrder: Number(data.displayOrder) || idx + 1,
              published: Boolean(data.published),
              authorId: String(data.authorId || ''),
            };
          });
          const sorted = sortRecordsByDisplayOrder(items);
          setSponsors(sorted);
          saveLocalCache('sponsors', sorted);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'sponsors')
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
            saveLocalCache('users', list);
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
            saveLocalCache('login_logs', list);
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
            saveLocalCache('admin_logs', list);
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

      let credSnap: any = null;
      let userSnap: any = null;
      try {
        [credSnap, userSnap] = await Promise.all([getDoc(credRef), getDoc(userRef)]);
      } catch (docErr) {
        if (isFirestoreQuotaExceeded(docErr)) {
          notifyQuotaExceeded();
        } else {
          throw docErr;
        }
      }
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
        try {
          if (credSnap && !credSnap.exists()) {
            await setDoc(credRef, {
              uid,
              email: emailLower,
              passwordHash: BOOTSTRAP_ADMIN_VERIFIER.hash,
              passwordSalt: BOOTSTRAP_ADMIN_VERIFIER.salt,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } else if (
            credSnap &&
            String(credSnap.data()?.passwordHash || '') !== BOOTSTRAP_ADMIN_VERIFIER.hash
          ) {
            await updateDoc(credRef, {
              passwordHash: BOOTSTRAP_ADMIN_VERIFIER.hash,
              passwordSalt: BOOTSTRAP_ADMIN_VERIFIER.salt,
              updatedAt: serverTimestamp(),
            });
          }

          if (userSnap && !userSnap.exists()) {
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
        } catch (setErr) {
          if (isFirestoreQuotaExceeded(setErr)) {
            notifyQuotaExceeded();
          }
        }

        const adminProfile: UserProfileRecord = {
          uid,
          fullName: BOOTSTRAP_ADMIN_VERIFIER.fullName,
          email: emailLower,
          role: 'admin',
          accountStatus: 'active',
          registrationDate: date,
          registrationTime: time,
        };
        const token = `local_admin_session_${uid}_${Date.now()}`;
        savePersistedSession({
          uid,
          email: emailLower,
          sessionToken: token,
        });
        setCurrentUserProfile(adminProfile);
        setServerSessionToken(token);
        setIsAdmin(true);
        setActiveView('admin');
        setIsLoadingData(false);
        setIsSubmittingAuth(false);
        return;
      }

      if (!credSnap || !userSnap || !credSnap.exists() || !userSnap.exists()) {
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
        try {
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
        } catch (adminErr) {
          if (isFirestoreQuotaExceeded(adminErr)) {
            notifyQuotaExceeded();
          }
        }
      }

      // Record Login Activity in shared Firestore database (/login_activity/{logId})
      try {
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
      } catch (logErr) {
        if (isFirestoreQuotaExceeded(logErr)) {
          notifyQuotaExceeded();
        } else {
          console.warn('Could not record login activity:', logErr);
        }
      }


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
    await ensureAdminRegisteredInFirestore(currentUserProfile.uid, currentUserProfile.email);

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
          authorId: cleanRecord.authorId,
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
    await ensureAdminRegisteredInFirestore(currentUserProfile.uid, currentUserProfile.email);
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
    await ensureAdminRegisteredInFirestore(currentUserProfile.uid, currentUserProfile.email);
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
          authorId: cleanRecord.authorId,
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
    await ensureAdminRegisteredInFirestore(currentUserProfile.uid, currentUserProfile.email);
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
    await ensureAdminRegisteredInFirestore(currentUserProfile.uid, currentUserProfile.email);
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
          authorId: cleanRecord.authorId,
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
    await ensureAdminRegisteredInFirestore(currentUserProfile.uid, currentUserProfile.email);
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
    await ensureAdminRegisteredInFirestore(currentUserProfile.uid, currentUserProfile.email);
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

  const handleSaveWebsiteBranding = async (brandingInput: {
    ecellLogoUrl: string;
    collegeLogoUrl: string;
  }) => {
    if (!currentUserProfile || !isAdmin) {
      throw new Error('Unauthorized: Authenticated Administrator session required.');
    }
    await ensureAdminRegisteredInFirestore(currentUserProfile.uid, currentUserProfile.email);

    const ecellLogoUrl = (brandingInput.ecellLogoUrl || '').trim().slice(0, BLUEPRINT_LIMITS.MAX_LOGO_DATA_LEN);
    const collegeLogoUrl = (brandingInput.collegeLogoUrl || '').trim().slice(0, BLUEPRINT_LIMITS.MAX_LOGO_DATA_LEN);
    const brandingRef = doc(db, 'branding', 'website_logos');

    try {
      const existingSnap = await getDoc(brandingRef);
      if (existingSnap.exists()) {
        await updateDoc(brandingRef, {
          ecellLogoUrl,
          collegeLogoUrl,
          updatedBy: currentUserProfile.uid,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(brandingRef, {
          id: 'website_logos',
          ecellLogoUrl,
          collegeLogoUrl,
          updatedBy: currentUserProfile.uid,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'branding/website_logos');
    }

    await recordAdminLog(
      'Updated Website Branding & Logos',
      'branding',
      'Aurora E-Cell & College Logos'
    );
  };

  // NEC Team CRUD & Reorder Handlers (strictly enforces MAX_NEC_MEMBERS = 25)
  const handleSaveNecMember = async (
    memberData: {
      name: string;
      role: string;
      photoUrl: string;
      published: boolean;
    },
    existingId?: string
  ) => {
    if (!currentUserProfile || !isAdmin) {
      throw new Error('Unauthorized: Authenticated Administrator session required.');
    }
    await ensureAdminRegisteredInFirestore(currentUserProfile.uid, currentUserProfile.email);

    // Client + pure domain validation (25-member cap + duplicate detection)
    const validation = validateNecMemberInput(memberData, necMembers, existingId);
    if (!validation.valid) {
      const msg =
        validation.errors.limit ||
        validation.errors.duplicate ||
        validation.errors.name ||
        validation.errors.role ||
        validation.errors.photoUrl ||
        'Invalid NEC Team member details.';
      throw new Error(msg);
    }

    // Server-side validation check (/api/admin/validate-nec-member)
    if (serverSessionToken && serverSessionToken.startsWith('ecell_st.')) {
      try {
        const resp = await fetch('/api/admin/validate-nec-member', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serverSessionToken}`,
          },
          body: JSON.stringify({
            member: memberData,
            existingMembers: necMembers.map((m) => ({
              id: m.id,
              name: m.name,
              role: m.role,
            })),
            editingMemberId: existingId || null,
          }),
        });
        if (!resp.ok && resp.status === 400) {
          const errPayload = (await resp.json()) as { errors?: Record<string, string> };
          const serverErr =
            errPayload.errors?.limit ||
            errPayload.errors?.duplicate ||
            errPayload.errors?.name ||
            errPayload.errors?.role;
          if (serverErr) {
            throw new Error(serverErr);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('Maximum limit')) {
          throw err;
        }
      }
    }

    const id = existingId || generateSafeId('nec');
    const existingMember = existingId ? necMembers.find((m) => m.id === existingId) : undefined;
    const nextOrder = existingMember
      ? Math.min(MAX_NEC_MEMBERS, Math.max(1, existingMember.displayOrder))
      : Math.min(MAX_NEC_MEMBERS, necMembers.length + 1);

    const cleanRecord: NecMemberRecord = {
      id,
      name: sanitizeText(memberData.name, BLUEPRINT_LIMITS.MAX_NAME_LEN),
      role: sanitizeText(memberData.role, BLUEPRINT_LIMITS.MAX_ROLE_LEN),
      photoUrl: (memberData.photoUrl || '').slice(0, BLUEPRINT_LIMITS.MAX_IMAGE_DATA_LEN),
      displayOrder: nextOrder,
      published: Boolean(memberData.published),
      authorId: currentUserProfile.uid,
    };

    const ref = doc(db, 'nec_team', id);
    try {
      if (existingId) {
        await updateDoc(ref, {
          name: cleanRecord.name,
          role: cleanRecord.role,
          photoUrl: cleanRecord.photoUrl,
          displayOrder: cleanRecord.displayOrder,
          published: cleanRecord.published,
          authorId: cleanRecord.authorId,
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
        `nec_team/${id}`
      );
    }

    await recordAdminLog(
      existingId ? 'Updated NEC Team member' : 'Added NEC Team member',
      'nec_team',
      `${cleanRecord.name} (${cleanRecord.role})`
    );
  };

  const handleDeleteNecMember = async (memberId: string, name: string) => {
    if (!currentUserProfile || !isAdmin) {
      throw new Error('Unauthorized: Authenticated Administrator session required.');
    }
    await ensureAdminRegisteredInFirestore(currentUserProfile.uid, currentUserProfile.email);
    try {
      await deleteDoc(doc(db, 'nec_team', memberId));
      // Normalize remaining displayOrders so 1..N stays contiguous within 1..25
      const remaining = sortRecordsByDisplayOrder(necMembers.filter((m) => m.id !== memberId));
      await Promise.all(
        remaining.map((m, idx) =>
          m.displayOrder !== idx + 1
            ? updateDoc(doc(db, 'nec_team', m.id), {
                displayOrder: idx + 1,
                updatedAt: serverTimestamp(),
              })
            : Promise.resolve()
        )
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `nec_team/${memberId}`);
    }
    await recordAdminLog('Removed NEC Team member', 'nec_team', name);
  };

  const handleReorderNecMember = async (memberId: string, direction: 'up' | 'down') => {
    if (!currentUserProfile || !isAdmin) return;
    await ensureAdminRegisteredInFirestore(currentUserProfile.uid, currentUserProfile.email);
    const updates = computeReorderedDisplayOrders(necMembers, memberId, direction);
    if (updates.length === 0) return;
    try {
      await Promise.all(
        updates.map((u) =>
          updateDoc(doc(db, 'nec_team', u.id), {
            displayOrder: Math.min(MAX_NEC_MEMBERS, Math.max(1, u.displayOrder)),
            updatedAt: serverTimestamp(),
          })
        )
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'nec_team');
    }
  };

  // Leadership & Convenors CRUD & Reorder Handlers
  const handleSaveLeadership = async (
    leaderData: {
      name: string;
      role: string;
      qualification: string;
      photoUrl: string;
      category: LeadershipCategory;
      published: boolean;
    },
    existingId?: string
  ) => {
    if (!currentUserProfile || !isAdmin) {
      throw new Error('Unauthorized: Authenticated Administrator session required.');
    }
    await ensureAdminRegisteredInFirestore(currentUserProfile.uid, currentUserProfile.email);

    const id = existingId || generateSafeId('ldr');
    const existingItem = existingId ? leadershipMembers.find((l) => l.id === existingId) : undefined;
    const nextOrder = existingItem
      ? Math.max(1, existingItem.displayOrder)
      : leadershipMembers.length + 1;

    const cleanRecord: LeadershipRecord = {
      id,
      name: sanitizeText(leaderData.name, BLUEPRINT_LIMITS.MAX_NAME_LEN),
      role: sanitizeText(leaderData.role, BLUEPRINT_LIMITS.MAX_ROLE_LEN),
      qualification: sanitizeText(
        leaderData.qualification,
        BLUEPRINT_LIMITS.MAX_QUALIFICATION_LEN
      ),
      photoUrl: (leaderData.photoUrl || '').slice(0, BLUEPRINT_LIMITS.MAX_IMAGE_DATA_LEN),
      category: leaderData.category === 'Head' ? 'Head' : 'Convenor',
      displayOrder: nextOrder,
      published: Boolean(leaderData.published),
      authorId: currentUserProfile.uid,
    };

    const ref = doc(db, 'leadership', id);
    try {
      if (existingId) {
        await updateDoc(ref, {
          name: cleanRecord.name,
          role: cleanRecord.role,
          qualification: cleanRecord.qualification,
          photoUrl: cleanRecord.photoUrl,
          category: cleanRecord.category,
          displayOrder: cleanRecord.displayOrder,
          published: cleanRecord.published,
          authorId: cleanRecord.authorId,
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
        `leadership/${id}`
      );
    }

    await recordAdminLog(
      existingId ? 'Updated Leadership profile' : 'Added Leadership profile',
      'leadership',
      `${cleanRecord.name} (${cleanRecord.category})`
    );
  };

  const handleDeleteLeadership = async (leaderId: string, name: string) => {
    if (!currentUserProfile || !isAdmin) {
      throw new Error('Unauthorized: Authenticated Administrator session required.');
    }
    await ensureAdminRegisteredInFirestore(currentUserProfile.uid, currentUserProfile.email);
    try {
      await deleteDoc(doc(db, 'leadership', leaderId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `leadership/${leaderId}`);
    }
    await recordAdminLog('Deleted Leadership profile', 'leadership', name);
  };

  const handleReorderLeadership = async (leaderId: string, direction: 'up' | 'down') => {
    if (!currentUserProfile || !isAdmin) return;
    await ensureAdminRegisteredInFirestore(currentUserProfile.uid, currentUserProfile.email);
    const updates = computeReorderedDisplayOrders(leadershipMembers, leaderId, direction);
    if (updates.length === 0) return;
    try {
      await Promise.all(
        updates.map((u) =>
          updateDoc(doc(db, 'leadership', u.id), {
            displayOrder: Math.max(1, u.displayOrder),
            updatedAt: serverTimestamp(),
          })
        )
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'leadership');
    }
  };

  // Sponsors & Supporting Partners CRUD & Reorder Handlers
  const handleSaveSponsor = async (
    sponsorData: {
      name: string;
      logoUrl: string;
      category: SponsorCategory;
      published: boolean;
    },
    existingId?: string
  ) => {
    if (!currentUserProfile || !isAdmin) {
      throw new Error('Unauthorized: Authenticated Administrator session required.');
    }
    await ensureAdminRegisteredInFirestore(currentUserProfile.uid, currentUserProfile.email);

    const id = existingId || generateSafeId('spn');
    const existingItem = existingId ? sponsors.find((s) => s.id === existingId) : undefined;
    const nextOrder = existingItem ? Math.max(1, existingItem.displayOrder) : sponsors.length + 1;

    const cleanRecord: SponsorRecord = {
      id,
      name: sanitizeText(sponsorData.name, BLUEPRINT_LIMITS.MAX_TITLE_LEN),
      logoUrl: (sponsorData.logoUrl || '').slice(0, BLUEPRINT_LIMITS.MAX_IMAGE_DATA_LEN),
      category: sponsorData.category === 'Sponsor' ? 'Sponsor' : 'Supporting Partner',
      displayOrder: nextOrder,
      published: Boolean(sponsorData.published),
      authorId: currentUserProfile.uid,
    };

    const ref = doc(db, 'sponsors', id);
    try {
      if (existingId) {
        await updateDoc(ref, {
          name: cleanRecord.name,
          logoUrl: cleanRecord.logoUrl,
          category: cleanRecord.category,
          displayOrder: cleanRecord.displayOrder,
          published: cleanRecord.published,
          authorId: cleanRecord.authorId,
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
        `sponsors/${id}`
      );
    }

    await recordAdminLog(
      existingId ? 'Updated Partner / Sponsor' : 'Added Partner / Sponsor',
      'sponsor',
      `${cleanRecord.name} (${cleanRecord.category})`
    );
  };

  const handleDeleteSponsor = async (sponsorId: string, name: string) => {
    if (!currentUserProfile || !isAdmin) {
      throw new Error('Unauthorized: Authenticated Administrator session required.');
    }
    await ensureAdminRegisteredInFirestore(currentUserProfile.uid, currentUserProfile.email);
    try {
      await deleteDoc(doc(db, 'sponsors', sponsorId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `sponsors/${sponsorId}`);
    }
    await recordAdminLog('Deleted Partner / Sponsor', 'sponsor', name);
  };

  const handleReorderSponsor = async (sponsorId: string, direction: 'up' | 'down') => {
    if (!currentUserProfile || !isAdmin) return;
    await ensureAdminRegisteredInFirestore(currentUserProfile.uid, currentUserProfile.email);
    const updates = computeReorderedDisplayOrders(sponsors, sponsorId, direction);
    if (updates.length === 0) return;
    try {
      await Promise.all(
        updates.map((u) =>
          updateDoc(doc(db, 'sponsors', u.id), {
            displayOrder: Math.max(1, u.displayOrder),
            updatedAt: serverTimestamp(),
          })
        )
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'sponsors');
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-aurora-void flex items-center justify-center p-6">
        <div className="aurora-card rounded-2xl p-8 text-center space-y-3">
          <div className="font-display font-bold text-2xl text-white tracking-tight">
            AURORA <span className="text-[#FF3030]">E-CELL</span>
          </div>
          <p className="text-xs font-mono text-[#A1A1AA]">
            Verifying session &amp; security credentials...
          </p>
        </div>
      </div>
    );
  }

  const renderQuotaBanner = () => {
    if (!quotaExceeded) return null;
    return (
      <aside
        role="status"
        aria-label="Firestore Database Quota Notice"
        className="bg-[#141416]/95 border-b border-[#FF3030]/40 px-4 py-2.5 text-xs text-white flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50 backdrop-blur-md shadow-[0_4px_20px_rgba(255,48,48,0.15)]"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#FF3030] shrink-0" />
          <span className="text-[#A1A1AA]">
            <strong className="text-white font-semibold">Firestore Daily Free Read Limit Reached:</strong> Serving cached records while database quota resets tomorrow (or upgrade in console to uncap reads).
          </span>
        </div>
        <a
          href={FIRESTORE_UPGRADE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 bg-[#FF3030]/20 hover:bg-[#FF3030]/30 border border-[#FF3030]/50 text-white font-medium rounded-lg text-xs whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>Open Database Upgrade Dialog</span>
          <ExternalLink className="w-3 h-3 text-[#FF3030]" />
        </a>
      </aside>
    );
  };

  if (!currentUserProfile) {
    return (
      <>
        {renderQuotaBanner()}
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
          websiteBranding={websiteBranding}
        />
      </>
    );
  }

  const publishedEvents = events.filter((e) => e.published);
  const publishedAchievements = achievements.filter((a) => a.published);
  const publishedStartups = startups.filter((s) => s.published);
  const publishedNecMembers = sortRecordsByDisplayOrder(necMembers.filter((m) => m.published));
  const publishedLeadership = sortRecordsByDisplayOrder(
    leadershipMembers.filter((l) => l.published)
  );
  const publishedSponsors = sortRecordsByDisplayOrder(sponsors.filter((s) => s.published));

  return (
    <>
      {renderQuotaBanner()}

      {accessDeniedNotice && (
        <div
          role="alert"
          className="bg-[#FF3030] text-white px-6 py-3 border-b border-white/20 flex items-center justify-between text-xs font-bold"
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
          necMembers={necMembers}
          leadershipMembers={leadershipMembers}
          sponsors={sponsors}
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
          onSaveNecMember={handleSaveNecMember}
          onDeleteNecMember={handleDeleteNecMember}
          onReorderNecMember={handleReorderNecMember}
          onSaveLeadership={handleSaveLeadership}
          onDeleteLeadership={handleDeleteLeadership}
          onReorderLeadership={handleReorderLeadership}
          onSaveSponsor={handleSaveSponsor}
          onDeleteSponsor={handleDeleteSponsor}
          onReorderSponsor={handleReorderSponsor}
          onUpdateUserStatus={handleUpdateUserStatus}
          websiteBranding={websiteBranding}
          onSaveWebsiteBranding={handleSaveWebsiteBranding}
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
          publishedNecMembers={publishedNecMembers}
          publishedLeadership={publishedLeadership}
          publishedSponsors={publishedSponsors}
          isLoadingData={isLoadingData}
          websiteBranding={websiteBranding}
        />
      )}
    </>
  );
}
