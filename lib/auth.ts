import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_USER_STORAGE_KEY = 'pong_auth_user_v1';

export type AuthUser = {
  uid: string;
  displayName: string;
  isAnonymous: boolean;
};

let currentUser: AuthUser | null = null;
const listeners = new Set<(user: AuthUser | null) => void>();
let initPromise: Promise<void> | null = null;

function emitAuthChanged(): void {
  for (const listener of listeners) {
    listener(currentUser);
  }
}

function generateGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateGuestName(): string {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `Guest${suffix}`;
}

async function persistUser(user: AuthUser | null): Promise<void> {
  if (!user) {
    await AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
}

export async function initAuth(): Promise<void> {
  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(AUTH_USER_STORAGE_KEY);
      if (!raw) {
        currentUser = null;
        return;
      }

      const parsed = JSON.parse(raw) as Partial<AuthUser>;
      if (typeof parsed?.uid === 'string') {
        currentUser = {
          uid: parsed.uid,
          displayName: typeof parsed.displayName === 'string' && parsed.displayName.trim().length > 0
            ? parsed.displayName.trim()
            : 'Guest',
          isAnonymous: parsed.isAnonymous !== false,
        };
      } else {
        currentUser = null;
      }
    } catch (error) {
      console.warn('initAuth failed:', error);
      currentUser = null;
    } finally {
      emitAuthChanged();
      initPromise = null;
    }
  })();

  await initPromise;
}

export function subscribeToAuth(listener: (user: AuthUser | null) => void): () => void {
  listeners.add(listener);
  listener(currentUser);
  return () => listeners.delete(listener);
}

export function getCurrentUser(): AuthUser | null {
  return currentUser;
}

export function getUserId(): string | null {
  return currentUser?.uid ?? null;
}

export async function signInAnonymously(displayName?: string): Promise<AuthUser> {
  const user: AuthUser = {
    uid: generateGuestId(),
    displayName: displayName?.trim() || generateGuestName(),
    isAnonymous: true,
  };

  currentUser = user;
  await persistUser(user);
  emitAuthChanged();
  return user;
}

export async function signOut(): Promise<void> {
  currentUser = null;
  await persistUser(null);
  emitAuthChanged();
}
