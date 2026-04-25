/**
 * Vitest global setup. Runs once before each test file.
 *
 * jsdom already provides localStorage and the DOM, so we mostly use
 * this file to stub out the Firebase imports the store reaches for —
 * we don't want tests to hit the network or Firestore. Tests that
 * need different mocks can override per-file with vi.mock().
 */
import { vi, afterEach } from 'vitest';

// Stub the firebase init module so flizowStore can import it without
// trying to connect. The store only uses `db` for `doc(...)` /
// `setDoc(...)` calls, which we no-op in the firestore mock below.
vi.mock('../lib/firebase', () => ({
  db: {},
  auth: {},
  googleProvider: {},
}));

// Stub firebase/firestore. Every method the store touches gets a
// safe no-op or a minimal stand-in. setDoc/getDoc resolve so the
// store's await chains complete; onSnapshot returns an unsubscribe.
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  setDoc: vi.fn(async () => {}),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => undefined })),
  onSnapshot: vi.fn(() => () => {}),
  serverTimestamp: vi.fn(() => null),
}));

// Reset localStorage between tests so a state mutation in one test
// doesn't leak into the next (the store reads from localStorage on
// construct, but `flizowStore.replaceAll(emptyData())` covers most
// cases; this is a belt-and-suspenders).
afterEach(() => {
  localStorage.clear();
});
