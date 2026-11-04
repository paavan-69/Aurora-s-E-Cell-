import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Persist authenticated sessions across browser restarts
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Auth persistence setup notice:', err);
});

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
];

const googleProvider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  googleProvider.addScope(scope);
}

// In-memory cache for Google Workspace OAuth access token (never stored in localStorage/sessionStorage)
let isSigningInWithGoogle = false;
let cachedAccessToken: string | null = null;

export function getAccessToken(): string | null {
  return cachedAccessToken;
}

export function clearAccessToken(): void {
  cachedAccessToken = null;
}

export const initWorkspaceAuthListener = (
  onTokenReady?: (user: User, token: string) => void,
  onTokenMissing?: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onTokenReady) onTokenReady(user, cachedAccessToken);
      } else if (!isSigningInWithGoogle) {
        if (onTokenMissing) onTokenMissing();
      }
    } else {
      cachedAccessToken = null;
      if (onTokenMissing) onTokenMissing();
    }
  });
};

export async function signInWithGoogleWorkspace(): Promise<{
  user: User;
  accessToken: string | null;
}> {
  try {
    isSigningInWithGoogle = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningInWithGoogle = false;
  }
}

export async function signOutUser(): Promise<void> {
  cachedAccessToken = null;
  await auth.signOut();
}

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  type User,
};

// Validate connection to Firestore on boot as required by firebase-integration-rpc
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Compresses an uploaded image file via HTML5 canvas into an optimized JPEG data URL
 * so posters, achievement images, and startup logos stay well within Firestore size limits.
 */
export async function compressImageFileToDataUrl(
  file: File,
  maxWidth = 1000,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format.'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / Math.max(img.width, 1));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Processes an uploaded brand logo file (PNG, SVG, or WebP) while preserving 100% alpha transparency
 * and original aspect ratio. Outputs an optimized transparent PNG or SVG data URL that fits safely
 * inside Firestore's document limit.
 */
export async function processLogoFileToDataUrl(
  file: File,
  maxDimension = 600
): Promise<string> {
  const fileName = (file.name || '').trim().toLowerCase();
  const mimeType = (file.type || '').trim().toLowerCase();
  const isSvg = mimeType === 'image/svg+xml' || fileName.endsWith('.svg');
  const isPngOrWebp =
    mimeType === 'image/png' ||
    mimeType === 'image/webp' ||
    fileName.endsWith('.png') ||
    fileName.endsWith('.webp');

  if (!isSvg && !isPngOrWebp) {
    throw new Error('Unsupported logo format. Please upload a transparent PNG, SVG, or WebP file.');
  }

  if (!file.size || file.size <= 0) {
    throw new Error('Selected logo file is empty.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Logo file size must not exceed 5 MB.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read logo file.'));
    reader.onload = () => {
      const rawDataUrl = String(reader.result || '');
      if (isSvg) {
        if (rawDataUrl.length > 440_000) {
          reject(new Error('SVG file is too large. Please upload an SVG under 300 KB.'));
          return;
        }
        resolve(rawDataUrl);
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Invalid logo image file.'));
      img.onload = () => {
        const renderAtMaxDim = (limitDim: number): string => {
          const naturalW = Math.max(img.naturalWidth || img.width, 1);
          const naturalH = Math.max(img.naturalHeight || img.height, 1);
          const scale = Math.min(1, limitDim / Math.max(naturalW, naturalH));
          const width = Math.max(1, Math.round(naturalW * scale));
          const height = Math.max(1, Math.round(naturalH * scale));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return rawDataUrl;
          }
          // Explicitly clear canvas to preserve full alpha channel transparency
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          return canvas.toDataURL('image/png');
        };

        let pngDataUrl = renderAtMaxDim(maxDimension);
        if (pngDataUrl.length > 440_000) {
          pngDataUrl = renderAtMaxDim(400);
        }
        if (pngDataUrl.length > 440_000) {
          pngDataUrl = renderAtMaxDim(280);
        }
        resolve(pngDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

