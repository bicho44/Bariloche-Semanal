import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';

let app: App | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: Storage | null = null;

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'bariloche-semanal';
const STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || `${PROJECT_ID}.appspot.com`;

let hasValidServiceAccount = false;
let isFirestoreRemoteAvailable = false;
let isStorageRemoteAvailable: boolean | null = null;
let isStorageChecked = false;
let detectedServiceAccountEmail: string | null = null;
let statusMessage = 'Iniciando sistema de base de datos...';

export function checkServiceAccountConfig(): void {
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();

  if (!serviceAccountEnv) {
    hasValidServiceAccount = false;
    isFirestoreRemoteAvailable = false;
    statusMessage = 'Sin credenciales FIREBASE_SERVICE_ACCOUNT. Operando con almacenamiento local persistente sincronizado.';
    console.info(`[Database Config] Modo almacenamiento local activo (.firestore_local) para el proyecto '${PROJECT_ID}'.`);
    return;
  }

  // Detectar si el usuario colocó únicamente la dirección de correo de la service account
  if (serviceAccountEnv.includes('@') && !serviceAccountEnv.includes('{') && !fs.existsSync(serviceAccountEnv)) {
    detectedServiceAccountEmail = serviceAccountEnv;
    hasValidServiceAccount = false;
    isFirestoreRemoteAvailable = false;
    statusMessage = `Email de Service Account detectado ('${detectedServiceAccountEmail}'), pero se requiere la clave privada JSON descargada de la consola de Firebase/GCP para autenticación en la nube. Operando en almacenamiento local persistente.`;
    console.warn(`[Firebase Admin] ${statusMessage}`);
    return;
  }

  try {
    let parsedAccount: any;
    if (serviceAccountEnv.startsWith('{')) {
      parsedAccount = JSON.parse(serviceAccountEnv);
    } else if (fs.existsSync(serviceAccountEnv)) {
      parsedAccount = JSON.parse(fs.readFileSync(serviceAccountEnv, 'utf-8'));
    } else {
      parsedAccount = JSON.parse(Buffer.from(serviceAccountEnv, 'base64').toString('utf-8'));
    }

    if (parsedAccount && (parsedAccount.private_key || parsedAccount.client_email)) {
      hasValidServiceAccount = true;
      isFirestoreRemoteAvailable = true;
      detectedServiceAccountEmail = parsedAccount.client_email || null;
      statusMessage = `Conectado a Firebase Firestore en Google Cloud (${parsedAccount.project_id || PROJECT_ID})`;
      console.info(`[Firebase Admin] Service Account válida detectada para: ${detectedServiceAccountEmail || PROJECT_ID}`);
    }
  } catch (err: unknown) {
    const error = err as Error;
    hasValidServiceAccount = false;
    isFirestoreRemoteAvailable = false;
    statusMessage = `Error al parsear FIREBASE_SERVICE_ACCOUNT: ${error.message}. Operando en almacenamiento local persistente.`;
    console.warn(`[Firebase Admin] ${statusMessage}`);
  }
}

// Ejecutar verificación inicial
checkServiceAccountConfig();

export function getFirebaseApp(): App | null {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();

  if (hasValidServiceAccount && serviceAccountEnv) {
    try {
      let parsedAccount: any;
      if (serviceAccountEnv.startsWith('{')) {
        parsedAccount = JSON.parse(serviceAccountEnv);
      } else if (fs.existsSync(serviceAccountEnv)) {
        parsedAccount = JSON.parse(fs.readFileSync(serviceAccountEnv, 'utf-8'));
      } else {
        parsedAccount = JSON.parse(Buffer.from(serviceAccountEnv, 'base64').toString('utf-8'));
      }

      app = initializeApp({
        credential: cert(parsedAccount),
        projectId: parsedAccount.project_id || PROJECT_ID,
        storageBucket: STORAGE_BUCKET,
      });
      console.info(`[Firebase Admin] Inicializado exitosamente con Service Account para: ${PROJECT_ID}`);
      return app;
    } catch (err) {
      console.warn('[Firebase Admin] Error al inicializar con Service Account:', err);
    }
  }

  // Si estamos en producción con Cloud Run del mismo proyecto o emulador
  if (process.env.K_SERVICE || process.env.FIRESTORE_EMULATOR_HOST) {
    app = initializeApp({
      projectId: PROJECT_ID,
      storageBucket: STORAGE_BUCKET,
    });
    return app;
  }

  return null;
}

export function getDb(): Firestore | null {
  if (!isFirestoreRemoteAvailable) {
    return null;
  }

  if (!dbInstance) {
    const adminApp = getFirebaseApp();
    if (!adminApp) {
      return null;
    }
    dbInstance = getFirestore(adminApp);
    dbInstance.settings({ ignoreUndefinedProperties: true });
  }
  return dbInstance;
}

export async function checkStorageAvailability(): Promise<boolean> {
  if (isStorageChecked) {
    return isStorageRemoteAvailable === true;
  }

  if (!isFirestoreRemoteAvailable) {
    isStorageChecked = true;
    isStorageRemoteAvailable = false;
    return false;
  }

  try {
    const adminApp = getFirebaseApp();
    if (!adminApp) {
      isStorageChecked = true;
      isStorageRemoteAvailable = false;
      return false;
    }

    if (!storageInstance) {
      storageInstance = getStorage(adminApp);
    }

    const bucket = storageInstance.bucket(STORAGE_BUCKET);
    const [exists] = await bucket.exists();
    if (exists) {
      isStorageRemoteAvailable = true;
      console.info(`[Firebase Storage] Bucket '${STORAGE_BUCKET}' verificado y disponible.`);
    } else {
      isStorageRemoteAvailable = false;
      console.info(`[Firebase Storage] Bucket '${STORAGE_BUCKET}' no existe en Firebase. Operando en almacenamiento local seguro (/uploads).`);
    }
  } catch (err: unknown) {
    isStorageRemoteAvailable = false;
    const msg = (err as Error)?.message || 'No disponible';
    console.info(`[Firebase Storage] Firebase Storage no activo en el proyecto (${msg}). Operando en almacenamiento local (/uploads).`);
  }

  isStorageChecked = true;
  return isStorageRemoteAvailable === true;
}

export function getFirebaseStorage(): Storage | null {
  if (!isFirestoreRemoteAvailable || isStorageRemoteAvailable === false) {
    return null;
  }

  if (!storageInstance) {
    const adminApp = getFirebaseApp();
    if (!adminApp) {
      return null;
    }
    storageInstance = getStorage(adminApp);
  }
  return storageInstance;
}

export function isFirestoreAvailable(): boolean {
  return isFirestoreRemoteAvailable;
}

export function isFirebaseStorageAvailable(): boolean {
  return isStorageRemoteAvailable === true;
}

export function markFirestoreUnavailable(reason: string): void {
  isFirestoreRemoteAvailable = false;
  statusMessage = reason;
}

export function getDatabaseStatus() {
  return {
    mode: isFirestoreRemoteAvailable ? 'cloud_firestore' : 'local_persistence',
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
    storageAvailable: isStorageRemoteAvailable === true,
    hasValidServiceAccount,
    detectedEmail: detectedServiceAccountEmail,
    message: statusMessage,
  };
}

export { PROJECT_ID, STORAGE_BUCKET };

