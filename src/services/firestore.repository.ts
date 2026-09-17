import fs from 'fs';
import path from 'path';
import { getDb, isFirestoreAvailable, markFirestoreUnavailable } from '../config/firebase.js';

const LOCAL_STORAGE_DIR = path.join(process.cwd(), '.firestore_local');

function ensureLocalStorageDir(collectionName: string): string {
  const dir = path.join(LOCAL_STORAGE_DIR, collectionName);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function handleFirestoreError(err: unknown, operation: string, target: string): void {
  const error = err as (Error & { code?: number | string });
  const msg = error?.message || String(err);
  const code = error?.code;

  const isAuthOrPermission =
    code === 7 ||
    code === '7' ||
    code === 16 ||
    code === '16' ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('Missing or insufficient permissions') ||
    msg.includes('credentials') ||
    msg.includes('default credentials') ||
    msg.includes('UNAUTHENTICATED') ||
    error?.name === 'GoogleAuthError';

  if (isAuthOrPermission) {
    markFirestoreUnavailable('Permisos IAM o credenciales ausentes para Google Cloud Firestore. Operando en almacenamiento local persistente.');
    console.warn(`[Firestore Fallback] ${operation}(${target}): Acceso denegado o credenciales incompletas en GCP. Sincronización local activa (.firestore_local).`);
  } else {
    console.warn(`[Firestore Fallback] ${operation}(${target}): ${msg}. Operando con almacenamiento local.`);
  }
}

export class FirestoreRepository<T extends { id?: string }> {
  constructor(private collectionName: string) {}

  private getLocalFilePath(id: string): string {
    const dir = ensureLocalStorageDir(this.collectionName);
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(dir, `${safeId}.json`);
  }

  private readAllLocal(): T[] {
    const dir = ensureLocalStorageDir(this.collectionName);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    const items: T[] = [];
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(dir, file), 'utf-8');
        items.push(JSON.parse(content));
      } catch (err) {
        console.warn(`[Local Storage] Error al leer archivo local ${file}:`, err);
      }
    }
    return items;
  }

  private writeLocal(id: string, data: T): void {
    const filePath = this.getLocalFilePath(id);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  private deleteLocal(id: string): boolean {
    const filePath = this.getLocalFilePath(id);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  async getAll(): Promise<T[]> {
    if (!isFirestoreAvailable()) {
      return this.readAllLocal();
    }

    try {
      const db = getDb();
      if (!db) {
        return this.readAllLocal();
      }
      const snapshot = await db.collection(this.collectionName).get();
      const results: T[] = [];
      snapshot.forEach(doc => {
        results.push({ id: doc.id, ...(doc.data() as object) } as T);
      });

      // Mantener sincronizada la copia local
      for (const item of results) {
        if (item.id) {
          this.writeLocal(item.id, item);
        }
      }
      return results;
    } catch (err: unknown) {
      handleFirestoreError(err, 'getAll', this.collectionName);
      return this.readAllLocal();
    }
  }

  async getById(id: string): Promise<T | null> {
    if (!isFirestoreAvailable()) {
      return this.getLocalById(id);
    }

    try {
      const db = getDb();
      if (!db) {
        return this.getLocalById(id);
      }
      const doc = await db.collection(this.collectionName).doc(id).get();
      if (!doc.exists) {
        return this.getLocalById(id);
      }
      const data = { id: doc.id, ...(doc.data() as object) } as T;
      this.writeLocal(id, data);
      return data;
    } catch (err: unknown) {
      handleFirestoreError(err, 'getById', `${this.collectionName}/${id}`);
      return this.getLocalById(id);
    }
  }

  private getLocalById(id: string): T | null {
    const filePath = this.getLocalFilePath(id);
    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch {
        return null;
      }
    }
    return null;
  }

  async set(id: string, data: T): Promise<T> {
    const itemWithId = { ...data, id };
    if (isFirestoreAvailable()) {
      try {
        const db = getDb();
        if (db) {
          await db.collection(this.collectionName).doc(id).set(itemWithId, { merge: true });
        }
      } catch (err: unknown) {
        handleFirestoreError(err, 'set', `${this.collectionName}/${id}`);
      }
    }
    this.writeLocal(id, itemWithId);
    return itemWithId;
  }

  async update(id: string, partial: Partial<T>): Promise<T | null> {
    const current = await this.getById(id);
    if (!current) {
      return null;
    }
    const updated = { ...current, ...partial, id };
    if (isFirestoreAvailable()) {
      try {
        const db = getDb();
        if (db) {
          // Limpiar valores undefined para evitar errores de Firestore
          const cleanPartial: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(partial as Record<string, unknown>)) {
            if (value !== undefined) {
              cleanPartial[key] = value;
            }
          }
          // set con merge: true garantiza actualización sin fallar si el doc aún no existe
          await db.collection(this.collectionName).doc(id).set(cleanPartial, { merge: true });
        }
      } catch (err: unknown) {
        handleFirestoreError(err, 'update', `${this.collectionName}/${id}`);
      }
    }
    this.writeLocal(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    let deleted = false;
    if (isFirestoreAvailable()) {
      try {
        const db = getDb();
        if (db) {
          await db.collection(this.collectionName).doc(id).delete();
          deleted = true;
        }
      } catch (err: unknown) {
        handleFirestoreError(err, 'delete', `${this.collectionName}/${id}`);
      }
    }
    const localDeleted = this.deleteLocal(id);
    return deleted || localDeleted;
  }
}

