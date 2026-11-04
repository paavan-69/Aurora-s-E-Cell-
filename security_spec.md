# Security Specification: Aurora E-Cell Portal (`security_spec.md`)

## 1. Data Invariants

1. **Default-Deny Catch-All**: All unmatched paths in Firestore are strictly denied (`allow read, write: if false;`).
2. **PII Isolation (`/users/{userId}`)**:
   - A user document contains PII (`email`, `fullName`).
   - Only the authenticated document owner (`request.auth.uid == userId`) or a verified administrator (`isAdmin()`) may read (`get`) a user profile.
   - Only a verified administrator (`isAdmin()`) may `list` across `/users` (or a user querying their own `uid == request.auth.uid`).
   - Self-registration (`create`) must set `uid == request.auth.uid`, `createdAt == request.time`, `updatedAt == request.time`, `accountStatus == 'active'`, and cannot self-assign `role == 'admin'` unless the user is already a bootstrapped/verified admin (`isAdmin()`).
   - Immutable fields (`uid`, `email`, `registrationDate`, `registrationTime`, `createdAt`) cannot be altered on `update`. Regular users cannot escalate `role` or `accountStatus`.
3. **Trusted Admin Registry (`/admins/{adminUid}`)**:
   - Read access restricted to the owner (`request.auth.uid == adminUid`) or `isAdmin()`.
   - Creation allowed only if `adminUid == request.auth.uid` and the user has a verified bootstrapped admin email (`adminecell@gmail.com` or `paavanjampa@gmail.com` with `email_verified == true`).
4. **Public Content Isolation (`/events/{eventId}`, `/achievements/{achievementId}`, `/startups/{startupId}`)**:
   - Authenticated users can read (`get`, `list`) ONLY documents where `resource.data.published == true`, OR if the requester is `isAdmin()`.
   - Draft documents (`published == false`) are strictly invisible to non-admin users.
   - Only `isAdmin()` can `create`, `update`, or `delete` events, achievements, and startups, and all payloads must pass strict schema, size, key allowlist (`hasAll` & `hasOnly`), and server timestamp (`request.time`) validation.
5. **Audit Logs (`/login_activity/{logId}`, `/admin_logs/{logId}`)**:
   - `login_activity`: Authenticated users can `create` their own login log (`incoming().userId == request.auth.uid && incoming().createdAt == request.time`). Logs are immutable (no updates/deletes by regular users). Only the owner (`resource.data.userId == request.auth.uid`) or `isAdmin()` can read/list.
   - `admin_logs` & `settings`: Strictly accessible and writable only by `isAdmin()`.

---

## 2. The "Dirty Dozen" Payloads

1. **Shadow Field Injection on User Registration**:
   `{ uid: "user1", fullName: "Asha", email: "asha@example.com", role: "student", accountStatus: "active", registrationDate: "2026-11-03", registrationTime: "10:00:00", createdAt: SERVER_TIME, updatedAt: SERVER_TIME, isSuperAdmin: true }` -> `PERMISSION_DENIED` (`hasOnly` check fails).
2. **Self-Assigned Admin Role Escalation on Registration**:
   `{ uid: "user1", fullName: "Hacker", email: "hacker@example.com", role: "admin", accountStatus: "active", registrationDate: "2026-11-03", registrationTime: "10:00:00", createdAt: SERVER_TIME, updatedAt: SERVER_TIME }` -> `PERMISSION_DENIED` (`role == 'student' || isAdmin()` fails).
3. **Privilege Escalation via Profile Update**:
   User `user1` updates `/users/user1` with `{ role: "admin", updatedAt: SERVER_TIME }` -> `PERMISSION_DENIED` (non-admin update only allows `['fullName', 'updatedAt']` and enforces `incoming().role == existing().role`).
4. **Cross-User PII Read**:
   Authenticated user `user2` performs `get` on `/users/user1` -> `PERMISSION_DENIED` (`isOwner(userId) || isAdmin()` fails).
5. **Unfiltered User Collection Scraping**:
   Non-admin user `user2` performs `list` on `/users` without `where('uid', '==', 'user2')` -> `PERMISSION_DENIED` (`resource.data.uid == request.auth.uid || isAdmin()` fails).
6. **Unauthorized Event Creation by Regular Student**:
   Student `user1` creates `/events/evt1` -> `PERMISSION_DENIED` (`isAdmin()` fails).
7. **Reading Unpublished Draft Event as Student**:
   Student `user1` performs `get` or `list` on `/events/draft1` where `published == false` -> `PERMISSION_DENIED` (`resource.data.published == true || isAdmin()` fails).
8. **Client Timestamp Forgery on Event Creation**:
   Admin creates `/events/evt1` with `createdAt` set to a past timestamp instead of `request.time` -> `PERMISSION_DENIED` (`incoming().createdAt == request.time` fails).
9. **Immutable `createdAt` Tampering on Event Update**:
   Admin updates `/events/evt1` changing `createdAt` -> `PERMISSION_DENIED` (`incoming().createdAt == existing().createdAt` fails).
10. **Value Poisoning on Startup Status**:
    Admin updates `/startups/st1` with `currentStatus: "invalid_status"` -> `PERMISSION_DENIED` (`isValidStartup` enum check fails).
11. **Path ID Poisoning**:
    Creating `/events/invalid$id!@#` -> `PERMISSION_DENIED` (`isValidId` regex fails).
12. **Forged Login Activity for Another User**:
    User `user1` creates `/login_activity/log1` with `userId: "user2"` -> `PERMISSION_DENIED` (`incoming().userId == request.auth.uid` fails).
