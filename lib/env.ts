function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (typeof raw !== 'string') return undefined;
  const value = raw.trim();
  return value.length > 0 ? value : undefined;
}

function readFirstEnv(names: string[]): string | undefined {
  for (const name of names) {
    const value = readEnv(name);
    if (value) return value;
  }
  return undefined;
}

const DEFAULT_FIREBASE_PROJECT_ID = 'water-pong';
const DEFAULT_FIREBASE_DATABASE_URL = `https://${DEFAULT_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`;

function warnEnv(message: string): void {
  console.warn(
    [
      '[env] Configuration warning',
      message,
      'Recommended: use EXPO_PUBLIC_* variables in .env for Expo runtime.',
    ].join('\n'),
  );
}

function readHttpUrl(names: string[]): string | undefined {
  const value = readFirstEnv(names);
  if (!value) return undefined;
  if (!/^https?:\/\//i.test(value)) {
    warnEnv(`Ignored invalid URL in ${names.join(' / ')}: ${value}`);
    return undefined;
  }
  return value.replace(/\/+$/, '');
}

function parseNumberEnv(names: string[], fallback: number): number {
  const value = readFirstEnv(names);
  if (!value) return fallback;

  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;

  console.warn(`[env] ${names[0]} is not a valid number. Using fallback: ${fallback}`);
  return fallback;
}

function deriveProjectIdFromFirestoreBaseUrl(baseUrl: string): string | undefined {
  const match = baseUrl.match(/\/projects\/([^/]+)\/databases\/\(default\)\/documents$/);
  return match?.[1];
}

function deriveProjectIdFromRealtimeDatabaseUrl(baseUrl: string): string | undefined {
  const host = baseUrl.replace(/^https?:\/\//i, '').split('/')[0];
  const name = host.split('.')[0];
  if (!name) return undefined;
  return name.endsWith('-default-rtdb') ? name.replace(/-default-rtdb$/, '') : name;
}

const firestoreBaseUrlFromEnv = readHttpUrl(['EXPO_PUBLIC_FIRESTORE_BASE_URL', 'FIRESTORE_BASE_URL']);
const realtimeDbUrlFromEnv = readHttpUrl(['EXPO_PUBLIC_FIREBASE_DATABASE_URL', 'FIREBASE_DATABASE_URL']);

export const FIREBASE_PROJECT_ID =
  readFirstEnv(['EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID']) ??
  (firestoreBaseUrlFromEnv ? deriveProjectIdFromFirestoreBaseUrl(firestoreBaseUrlFromEnv) : undefined) ??
  (realtimeDbUrlFromEnv ? deriveProjectIdFromRealtimeDatabaseUrl(realtimeDbUrlFromEnv) : undefined) ??
  DEFAULT_FIREBASE_PROJECT_ID;

export const FIRESTORE_BASE_URL =
  firestoreBaseUrlFromEnv ??
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

export const FIREBASE_DATABASE_URL = realtimeDbUrlFromEnv ?? DEFAULT_FIREBASE_DATABASE_URL;

if (!firestoreBaseUrlFromEnv) {
  warnEnv('FIRESTORE_BASE_URL not found. Using derived Firestore URL from project id.');
}
if (!realtimeDbUrlFromEnv) {
  warnEnv('FIREBASE_DATABASE_URL not found. Using default Realtime Database URL.');
}

export const WEATHER_API_BASE_URL =
  readFirstEnv(['EXPO_PUBLIC_WEATHER_API_BASE_URL', 'WEATHER_API_BASE_URL']) ??
  'https://api.open-meteo.com/v1/forecast';
export const WEATHER_CITY = readFirstEnv(['EXPO_PUBLIC_WEATHER_CITY', 'WEATHER_CITY']) ?? 'Bangkok';
export const WEATHER_LAT = parseNumberEnv(['EXPO_PUBLIC_WEATHER_LAT', 'WEATHER_LAT'], 13.7563);
export const WEATHER_LON = parseNumberEnv(['EXPO_PUBLIC_WEATHER_LON', 'WEATHER_LON'], 100.5018);
