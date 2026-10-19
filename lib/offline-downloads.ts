'use client';

/**
 * Mode hors ligne — Phase 5 §5/§6.
 *
 * RÈGLE ABSOLUE : jamais de localStorage pour les fichiers.
 * - Cache Storage : contient les octets réels du fichier (une Response
 *   complète, réutilisable directement par le navigateur/service worker).
 * - IndexedDB : contient uniquement les métadonnées (titre, taille RÉELLE,
 *   date RÉELLE, statut) — c'est ce que "Mes téléchargements" affiche.
 *
 * La progression est calculée à partir d'un vrai flux réseau
 * (ReadableStream + en-tête Content-Length), jamais simulée.
 * "Supprimer localement" ne touche jamais Cloudinary/Supabase — uniquement
 * le cache et les métadonnées de CET appareil.
 */

const DB_NAME = 'ujlog-offline';
const DB_VERSION = 1;
const STORE_NAME = 'downloads';
const CACHE_NAME = 'ujlog-course-files-v1';

export type DownloadStatus =
  | 'not-downloaded'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'removed-locally';

export interface DownloadRecord {
  courseId: string;
  fileId: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number; // taille réelle, connue seulement une fois le téléchargement terminé
  status: DownloadStatus;
  downloadedAt: string | null; // date réelle ISO, jamais approximative
  cacheUrl: string; // clé utilisée dans Cache Storage
  error?: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponible dans cet environnement.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'fileId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putRecord(record: DownloadRecord): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDownloadRecord(fileId: string): Promise<DownloadRecord | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(fileId);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function listDownloadRecords(): Promise<DownloadRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function deleteRecord(fileId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(fileId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const activeDownloads = new Map<string, AbortController>();

export function isDownloadInProgress(fileId: string): boolean {
  return activeDownloads.has(fileId);
}

export function cancelDownload(fileId: string): void {
  activeDownloads.get(fileId)?.abort();
  activeDownloads.delete(fileId);
}

/**
 * Télécharge réellement le fichier en flux, avec progression réelle
 * (received / total, à partir de Content-Length quand disponible — sinon
 * on ne prétend pas connaître le pourcentage exact et on remonte
 * uniquement les octets reçus). Stocke le résultat dans Cache Storage,
 * les métadonnées réelles dans IndexedDB.
 */
export async function downloadCourseFile(
  params: {
    courseId: string;
    fileId: string;
    fileUrl: string;
    fileName: string;
    mimeType: string;
    title: string;
  },
  onProgress?: (receivedBytes: number, totalBytes: number | null) => void
): Promise<DownloadRecord> {
  const { courseId, fileId, fileUrl, fileName, mimeType, title } = params;

  if (typeof caches === 'undefined' || typeof indexedDB === 'undefined') {
    throw new Error('Le stockage hors ligne n’est pas disponible sur cet appareil/navigateur.');
  }

  const controller = new AbortController();
  activeDownloads.set(fileId, controller);

  await putRecord({
    courseId,
    fileId,
    title,
    fileName,
    mimeType,
    sizeBytes: 0,
    status: 'downloading',
    downloadedAt: null,
    cacheUrl: fileUrl,
  });

  try {
    const response = await fetch(fileUrl, { signal: controller.signal });
    if (!response.ok || !response.body) {
      throw new Error(`Téléchargement impossible (${response.status}).`);
    }

    const totalHeader = response.headers.get('Content-Length');
    const total = totalHeader ? parseInt(totalHeader, 10) : null;

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.byteLength;
        onProgress?.(received, total);
      }
    }

    const blob = new Blob(chunks as BlobPart[], { type: mimeType });
    const cachedResponse = new Response(blob, {
      headers: { 'Content-Type': mimeType, 'Content-Length': String(blob.size) },
    });

    const cache = await caches.open(CACHE_NAME);
    await cache.put(fileUrl, cachedResponse);

    const record: DownloadRecord = {
      courseId,
      fileId,
      title,
      fileName,
      mimeType,
      sizeBytes: blob.size, // taille réelle mesurée, pas déclarée
      status: 'downloaded',
      downloadedAt: new Date().toISOString(), // date réelle du téléchargement effectif
      cacheUrl: fileUrl,
    };
    await putRecord(record);
    return record;
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    const record: DownloadRecord = {
      courseId,
      fileId,
      title,
      fileName,
      mimeType,
      sizeBytes: 0,
      status: isAbort ? 'not-downloaded' : 'error',
      downloadedAt: null,
      cacheUrl: fileUrl,
      error: isAbort ? undefined : (err instanceof Error ? err.message : 'Erreur inconnue.'),
    };
    if (isAbort) {
      await deleteRecord(fileId);
    } else {
      await putRecord(record);
    }
    throw err;
  } finally {
    activeDownloads.delete(fileId);
  }
}

/** Ouvre un fichier déjà téléchargé, sans réseau. */
export async function openOfflineFile(fileId: string): Promise<void> {
  const record = await getDownloadRecord(fileId);
  if (!record || record.status !== 'downloaded') {
    throw new Error('Ce fichier n’est pas disponible hors ligne.');
  }
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(record.cacheUrl);
  if (!cached) throw new Error('Fichier local introuvable (peut-être libéré par le navigateur).');

  const blob = await cached.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = record.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}

/**
 * Suppression LOCALE uniquement — libère l'espace sur cet appareil.
 * Ne supprime jamais rien côté Cloudinary/Supabase (voir Phase 5 §5).
 */
export async function removeLocalDownload(fileId: string): Promise<void> {
  const record = await getDownloadRecord(fileId);
  if (record) {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(record.cacheUrl);
  }
  await deleteRecord(fileId);
}

/** Espace total actuellement occupé par les téléchargements hors ligne (octets réels). */
export async function getTotalOfflineStorageBytes(): Promise<number> {
  const records = await listDownloadRecords();
  return records
    .filter((r) => r.status === 'downloaded')
    .reduce((sum, r) => sum + r.sizeBytes, 0);
}
