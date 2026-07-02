/**
 * ensureFirebaseAuth()
 *
 * Guarantees that Firebase has an authenticated user (anonymous at minimum)
 * before any Firestore write is attempted. Call this at the top of any
 * function that writes to Firestore.
 *
 * Returns the Firebase Auth user once ready.
 */
export async function ensureFirebaseAuth() {
  const { auth } = await import('./firebase');
  const { signInAnonymously, onAuthStateChanged } = await import('firebase/auth');

  // If already authenticated, return immediately
  if (auth.currentUser) {
    return auth.currentUser;
  }

  // If offline, return immediately to avoid 8s timeout wait
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.warn('[ensureFirebaseAuth] Browser is offline. Skipping auth wait.');
    return auth.currentUser;
  }

  // Sign in anonymously
  try {
    await signInAnonymously(auth);
  } catch (e) {
    console.warn('[ensureFirebaseAuth] signInAnonymously failed:', e?.message);
  }

  // Wait until onAuthStateChanged confirms a user (up to 8 seconds)
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      unsub();
      console.warn('[ensureFirebaseAuth] Timed out waiting for auth state.');
      resolve(auth.currentUser); // resolve with whatever we have
    }, 8000);

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        clearTimeout(timeout);
        unsub();
        resolve(user);
      }
    });
  });
}
