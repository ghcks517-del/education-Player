import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: The app will break without firebaseConfig.firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function formatFirestoreErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes('permission-denied') || raw.includes('Missing or insufficient permissions')) {
    return '클라우드 데이터베이스 접근 권한 오류입니다. 잠시 후 다시 시도해주세요.';
  }
  if (raw.includes('the client is offline') || raw.includes('unavailable') || raw.includes('Failed to fetch')) {
    return '네트워크가 오프라인 상태이거나 클라우드 서버에 연결할 수 없습니다.';
  }
  if (raw.includes('Quota exceeded')) {
    return '클라우드 일일 무료 사용량 한도에 도달했습니다. 내일 다시 시도해주세요.';
  }
  return '클라우드 동기화 중 오류가 발생했습니다. 네트워크 상태를 확인 후 다시 시도해주세요.';
}

export async function testConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { connected: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('the client is offline')) {
      console.error('Firestore offline: Please check your Firebase configuration or network.');
    } else {
      console.error('Firestore connection test failed:', msg);
    }
    return { connected: false, error: msg };
  }
}
