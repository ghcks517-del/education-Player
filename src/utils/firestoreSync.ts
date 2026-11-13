import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDocsFromServer,
  writeBatch,
  DocumentReference,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Category, VideoItem, VideoNote } from '../types';
import { INITIAL_CATEGORIES, INITIAL_VIDEOS } from './initialData';

const PATH_CATEGORIES = 'categories';
const PATH_VIDEOS = 'videos';
const MAX_BATCH_OPS = 400;

export interface SnapshotMeta {
  fromCache: boolean;
}

function sanitizeId(rawId: string | undefined, fallbackPrefix: string, index = 0): string {
  const cleaned = (rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 128);
  if (cleaned.length > 0 && /^[a-zA-Z0-9_-]+$/.test(cleaned)) {
    return cleaned;
  }
  return `${fallbackPrefix}-${Date.now()}-${index}`;
}

function sanitizeString(val: unknown, maxLen: number, fallback = ''): string {
  const str = typeof val === 'string' ? val : fallback;
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

export function sanitizeCategoryForFirestore(cat: Category, index = 0): Category {
  const sanitized: Category = {
    id: sanitizeId(cat.id, 'cat', index),
    name: sanitizeString(cat.name, 100, '미분류').trim() || '미분류',
    order: typeof cat.order === 'number' && Number.isFinite(cat.order) ? cat.order : index + 1,
    createdAt: sanitizeString(cat.createdAt, 64, new Date().toISOString()),
  };
  if (typeof cat.description === 'string') {
    sanitized.description = sanitizeString(cat.description, 500);
  }
  if (typeof cat.color === 'string' && cat.color.trim()) {
    sanitized.color = sanitizeString(cat.color.trim(), 50);
  }
  return sanitized;
}

export function sanitizeVideoForFirestore(
  vid: VideoItem,
  categoryIdMap?: Map<string, string>,
  fallbackCategoryId = 'cat-default',
  index = 0
): VideoItem {
  const mappedCatId = categoryIdMap?.get(vid.categoryId) || sanitizeId(vid.categoryId || fallbackCategoryId, 'cat', 0);

  const sanitizedTags: string[] = Array.isArray(vid.tags)
    ? vid.tags
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .slice(0, 20)
        .map((t) => sanitizeString(t.trim(), 50))
    : [];

  const sanitizedNotes: VideoNote[] = Array.isArray(vid.notes)
    ? vid.notes.slice(0, 200).map((n, idx) => ({
        id: sanitizeId(n?.id, 'note', idx),
        timestamp: typeof n?.timestamp === 'number' && Number.isFinite(n.timestamp) ? n.timestamp : 0,
        formattedTime: sanitizeString(n?.formattedTime, 32, '00:00'),
        text: sanitizeString(n?.text, 1000),
        createdAt: sanitizeString(n?.createdAt, 64, new Date().toISOString()),
      }))
    : [];

  const sanitized: VideoItem = {
    id: sanitizeId(vid.id, 'vid', index),
    categoryId: mappedCatId,
    title: sanitizeString(vid.title, 200, '제목 없는 교안').trim() || '제목 없는 교안',
    description: sanitizeString(vid.description, 2000),
    youtubeUrl: sanitizeString(vid.youtubeUrl, 500),
    youtubeId: sanitizeString(vid.youtubeId, 100),
    tags: sanitizedTags,
    watched: Boolean(vid.watched),
    notes: sanitizedNotes,
    createdAt: sanitizeString(vid.createdAt, 64, new Date().toISOString()),
  };

  if (typeof vid.duration === 'string') {
    sanitized.duration = sanitizeString(vid.duration, 32);
  }
  if (typeof vid.speaker === 'string') {
    sanitized.speaker = sanitizeString(vid.speaker, 100);
  }
  if (typeof vid.updatedAt === 'string') {
    sanitized.updatedAt = sanitizeString(vid.updatedAt, 64);
  }

  return sanitized;
}

export function sanitizeDatasetForFirestore(
  categories: Category[],
  videos: VideoItem[]
): { categories: Category[]; videos: VideoItem[] } {
  const categoryIdMap = new Map<string, string>();
  const sanitizedCats = categories.map((cat, idx) => {
    const clean = sanitizeCategoryForFirestore(cat, idx);
    categoryIdMap.set(cat.id, clean.id);
    return clean;
  });

  const fallbackCatId = sanitizedCats[0]?.id || 'cat-default';
  const sanitizedVids = videos.map((vid, idx) =>
    sanitizeVideoForFirestore(vid, categoryIdMap, fallbackCatId, idx)
  );

  return {
    categories: sanitizedCats,
    videos: sanitizedVids,
  };
}

export function sortCategories(items: Category[]): Category[] {
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function sortVideos(items: VideoItem[]): VideoItem[] {
  return [...items].sort((a, b) => {
    const timeA = a.createdAt ? Date.parse(a.createdAt) || 0 : 0;
    const timeB = b.createdAt ? Date.parse(b.createdAt) || 0 : 0;
    if (timeB !== timeA) return timeB - timeA;
    return (b.id || '').localeCompare(a.id || '');
  });
}

async function commitBatchedOperations(
  ops: Array<{ type: 'set'; ref: DocumentReference; data: unknown } | { type: 'delete'; ref: DocumentReference }>
): Promise<void> {
  for (let i = 0; i < ops.length; i += MAX_BATCH_OPS) {
    const chunk = ops.slice(i, i + MAX_BATCH_OPS);
    const batch = writeBatch(db);
    chunk.forEach((op) => {
      if (op.type === 'set') {
        batch.set(op.ref, op.data as Record<string, unknown>);
      } else {
        batch.delete(op.ref);
      }
    });
    await batch.commit();
  }
}

/**
 * Subscribes to real-time category updates from Firestore.
 * Automatically seeds default categories only when the server confirms the collection is empty.
 */
export function subscribeCategories(
  onUpdate: (categories: Category[], meta: SnapshotMeta) => void,
  onError?: (error: unknown) => void
): () => void {
  const colRef = collection(db, PATH_CATEGORIES);

  return onSnapshot(
    colRef,
    async (snapshot) => {
      try {
        if (snapshot.empty) {
          if (snapshot.metadata.fromCache) {
            return;
          }
          const cleanSeed = INITIAL_CATEGORIES.map((cat, idx) =>
            sanitizeCategoryForFirestore(cat, idx)
          );
          await commitBatchedOperations(
            cleanSeed.map((cat) => ({
              type: 'set',
              ref: doc(db, PATH_CATEGORIES, cat.id),
              data: cat,
            }))
          );
          onUpdate(sortCategories(cleanSeed), { fromCache: false });
          return;
        }

        const items: Category[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as Category);
        });

        onUpdate(sortCategories(items), { fromCache: snapshot.metadata.fromCache });
      } catch (err) {
        console.error('Error processing categories snapshot', err);
        onError?.(err);
      }
    },
    (error) => {
      onError?.(error);
      try {
        handleFirestoreError(error, OperationType.LIST, PATH_CATEGORIES);
      } catch {
        // Error info already logged and propagated via onError
      }
    }
  );
}

/**
 * Subscribes to real-time video updates from Firestore.
 * Automatically seeds default videos only when the server confirms the collection is empty.
 */
export function subscribeVideos(
  onUpdate: (videos: VideoItem[], meta: SnapshotMeta) => void,
  onError?: (error: unknown) => void
): () => void {
  const colRef = collection(db, PATH_VIDEOS);

  return onSnapshot(
    colRef,
    async (snapshot) => {
      try {
        if (snapshot.empty) {
          if (snapshot.metadata.fromCache) {
            return;
          }
          const cleanSeed = INITIAL_VIDEOS.map((vid, idx) =>
            sanitizeVideoForFirestore(vid, undefined, 'cat-1', idx)
          );
          await commitBatchedOperations(
            cleanSeed.map((vid) => ({
              type: 'set',
              ref: doc(db, PATH_VIDEOS, vid.id),
              data: vid,
            }))
          );
          onUpdate(sortVideos(cleanSeed), { fromCache: false });
          return;
        }

        const items: VideoItem[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as VideoItem);
        });

        onUpdate(sortVideos(items), { fromCache: snapshot.metadata.fromCache });
      } catch (err) {
        console.error('Error processing videos snapshot', err);
        onError?.(err);
      }
    },
    (error) => {
      onError?.(error);
      try {
        handleFirestoreError(error, OperationType.LIST, PATH_VIDEOS);
      } catch {
        // Error info already logged and propagated via onError
      }
    }
  );
}

/**
 * Explicitly fetches the latest categories and videos directly from the Firestore server
 * (bypassing local IndexedDB/memory cache).
 */
export async function fetchAllFromFirestoreServer(): Promise<{
  categories: Category[];
  videos: VideoItem[];
}> {
  try {
    const [catSnap, vidSnap] = await Promise.all([
      getDocsFromServer(collection(db, PATH_CATEGORIES)),
      getDocsFromServer(collection(db, PATH_VIDEOS)),
    ]);

    const categories: Category[] = [];
    catSnap.forEach((docSnap) => categories.push(docSnap.data() as Category));

    const videos: VideoItem[] = [];
    vidSnap.forEach((docSnap) => videos.push(docSnap.data() as VideoItem));

    return {
      categories: sortCategories(categories),
      videos: sortVideos(videos),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `${PATH_CATEGORIES},${PATH_VIDEOS}`);
  }
}

/**
 * Saves or updates a category in Firestore (broadcasts to all devices).
 */
export async function saveCategoryToFirestore(category: Category): Promise<void> {
  const cleanCat = sanitizeCategoryForFirestore(category);
  const path = `${PATH_CATEGORIES}/${cleanCat.id}`;
  try {
    await setDoc(doc(db, PATH_CATEGORIES, cleanCat.id), cleanCat);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a category from Firestore.
 */
export async function deleteCategoryFromFirestore(categoryId: string): Promise<void> {
  const cleanId = sanitizeId(categoryId, 'cat');
  const path = `${PATH_CATEGORIES}/${cleanId}`;
  try {
    await deleteDoc(doc(db, PATH_CATEGORIES, cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Saves or updates a video in Firestore (broadcasts to all devices).
 */
export async function saveVideoToFirestore(video: VideoItem): Promise<void> {
  const cleanVid = sanitizeVideoForFirestore(video);
  const path = `${PATH_VIDEOS}/${cleanVid.id}`;
  try {
    await setDoc(doc(db, PATH_VIDEOS, cleanVid.id), cleanVid);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a video from Firestore.
 */
export async function deleteVideoFromFirestore(videoId: string): Promise<void> {
  const cleanId = sanitizeId(videoId, 'vid');
  const path = `${PATH_VIDEOS}/${cleanId}`;
  try {
    await deleteDoc(doc(db, PATH_VIDEOS, cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Safely uploads and synchronizes the full dataset to Firestore:
 * 1. Sanitizes all categories and videos so no undefined/invalid values fail Firestore rules.
 * 2. Upserts all new items first (in safe <=400 op chunks) so cloud data is never lost on partial failure.
 * 3. Deletes only obsolete documents no longer in the target dataset.
 */
export async function importAllToFirestore(
  categories: Category[],
  videos: VideoItem[]
): Promise<{ categories: Category[]; videos: VideoItem[] }> {
  const { categories: cleanCats, videos: cleanVids } = sanitizeDatasetForFirestore(
    categories,
    videos
  );

  try {
    // 1. Upsert all target categories & videos first
    const writeOps = [
      ...cleanCats.map((cat) => ({
        type: 'set' as const,
        ref: doc(db, PATH_CATEGORIES, cat.id),
        data: cat,
      })),
      ...cleanVids.map((vid) => ({
        type: 'set' as const,
        ref: doc(db, PATH_VIDEOS, vid.id),
        data: vid,
      })),
    ];
    await commitBatchedOperations(writeOps);

    // 2. Remove stale documents that are not in the target set
    const [existingCats, existingVids] = await Promise.all([
      getDocs(collection(db, PATH_CATEGORIES)),
      getDocs(collection(db, PATH_VIDEOS)),
    ]);

    const keepCatIds = new Set(cleanCats.map((c) => c.id));
    const keepVidIds = new Set(cleanVids.map((v) => v.id));

    const deleteOps: Array<{ type: 'delete'; ref: DocumentReference }> = [];
    existingCats.forEach((d) => {
      if (!keepCatIds.has(d.id)) {
        deleteOps.push({ type: 'delete', ref: d.ref });
      }
    });
    existingVids.forEach((d) => {
      if (!keepVidIds.has(d.id)) {
        deleteOps.push({ type: 'delete', ref: d.ref });
      }
    });

    if (deleteOps.length > 0) {
      await commitBatchedOperations(deleteOps);
    }

    return {
      categories: sortCategories(cleanCats),
      videos: sortVideos(cleanVids),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'batch/import');
  }
}
