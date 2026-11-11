import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Category, VideoItem } from '../types';
import { INITIAL_CATEGORIES, INITIAL_VIDEOS } from './initialData';

const PATH_CATEGORIES = 'categories';
const PATH_VIDEOS = 'videos';

/**
 * Subscribes to real-time category updates from Firestore.
 * Automatically seeds default categories if the collection is empty.
 */
export function subscribeCategories(
  onUpdate: (categories: Category[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const colRef = collection(db, PATH_CATEGORIES);

  return onSnapshot(
    colRef,
    async (snapshot) => {
      try {
        if (snapshot.empty) {
          // Seed with initial categories
          console.log('Seeding initial categories to Firestore...');
          const batch = writeBatch(db);
          INITIAL_CATEGORIES.forEach((cat) => {
            const docRef = doc(db, PATH_CATEGORIES, cat.id);
            batch.set(docRef, cat);
          });
          await batch.commit();
          onUpdate(INITIAL_CATEGORIES);
          return;
        }

        const items: Category[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as Category);
        });

        // Sort by order ascending
        items.sort((a, b) => (a.order || 0) - (b.order || 0));
        onUpdate(items);
      } catch (err) {
        console.error('Error processing categories snapshot', err);
        onError?.(err);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, PATH_CATEGORIES);
      onError?.(error);
    }
  );
}

/**
 * Subscribes to real-time video updates from Firestore.
 * Automatically seeds default videos if the collection is empty.
 */
export function subscribeVideos(
  onUpdate: (videos: VideoItem[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const colRef = collection(db, PATH_VIDEOS);

  return onSnapshot(
    colRef,
    async (snapshot) => {
      try {
        if (snapshot.empty) {
          // Seed with initial videos
          console.log('Seeding initial videos to Firestore...');
          const batch = writeBatch(db);
          INITIAL_VIDEOS.forEach((vid) => {
            const docRef = doc(db, PATH_VIDEOS, vid.id);
            batch.set(docRef, vid);
          });
          await batch.commit();
          onUpdate(INITIAL_VIDEOS);
          return;
        }

        const items: VideoItem[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as VideoItem);
        });

        onUpdate(items);
      } catch (err) {
        console.error('Error processing videos snapshot', err);
        onError?.(err);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, PATH_VIDEOS);
      onError?.(error);
    }
  );
}

/**
 * Saves or updates a category in Firestore (broadcasts to all devices).
 */
export async function saveCategoryToFirestore(category: Category): Promise<void> {
  const path = `${PATH_CATEGORIES}/${category.id}`;
  try {
    await setDoc(doc(db, PATH_CATEGORIES, category.id), category);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a category from Firestore.
 */
export async function deleteCategoryFromFirestore(categoryId: string): Promise<void> {
  const path = `${PATH_CATEGORIES}/${categoryId}`;
  try {
    await deleteDoc(doc(db, PATH_CATEGORIES, categoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Saves or updates a video in Firestore (broadcasts to all devices).
 */
export async function saveVideoToFirestore(video: VideoItem): Promise<void> {
  const path = `${PATH_VIDEOS}/${video.id}`;
  try {
    await setDoc(doc(db, PATH_VIDEOS, video.id), video);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a video from Firestore.
 */
export async function deleteVideoFromFirestore(videoId: string): Promise<void> {
  const path = `${PATH_VIDEOS}/${videoId}`;
  try {
    await deleteDoc(doc(db, PATH_VIDEOS, videoId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Imports and replaces all data in Firestore (e.g. from a backup file).
 */
export async function importAllToFirestore(
  categories: Category[],
  videos: VideoItem[]
): Promise<void> {
  try {
    // 1. Fetch and clean existing
    const existingCats = await getDocs(collection(db, PATH_CATEGORIES));
    const existingVids = await getDocs(collection(db, PATH_VIDEOS));

    const cleanBatch = writeBatch(db);
    existingCats.forEach((d) => cleanBatch.delete(d.ref));
    existingVids.forEach((d) => cleanBatch.delete(d.ref));
    await cleanBatch.commit();

    // 2. Write new items
    const writeBatchGroup = writeBatch(db);
    categories.forEach((cat) => {
      writeBatchGroup.set(doc(db, PATH_CATEGORIES, cat.id), cat);
    });
    videos.forEach((vid) => {
      writeBatchGroup.set(doc(db, PATH_VIDEOS, vid.id), vid);
    });
    await writeBatchGroup.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'batch/import');
  }
}
