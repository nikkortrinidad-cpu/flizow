import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Cross-device sign-out reactor. The "Sign out everywhere" button
  // in Account Settings writes `revokedAt: <ISO>` to the current
  // user's lookup doc (users/{uid}). Every signed-in device
  // subscribes here. When the timestamp is newer than this device's
  // own lastSignInTime, it means the user clicked the button on
  // another device after this one signed in — so we sign out.
  //
  // Latency note: other devices sign out on next Firestore snapshot.
  // For an active tab that's typically <1s; for a backgrounded tab
  // it's whenever the OS lets the snapshot fire. Not as instant as
  // a real `revokeRefreshTokens` (admin-only), but good enough for
  // the "kick a stolen laptop" use case.
  useEffect(() => {
    if (!user?.uid) return;
    const userDocRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(userDocRef, (snap) => {
      const data = snap.data() as { revokedAt?: string } | undefined;
      if (!data?.revokedAt) return;
      const lastSignIn = user.metadata.lastSignInTime;
      if (!lastSignIn) return;
      const revokedMs = new Date(data.revokedAt).getTime();
      const signedInMs = new Date(lastSignIn).getTime();
      if (Number.isFinite(revokedMs) && Number.isFinite(signedInMs) && revokedMs > signedInMs) {
        // Sessions revoked after my sign-in. Force sign out — the
        // onAuthStateChanged listener above will then flip user to
        // null and App.tsx will route to LoginPage.
        signOut(auth).catch(() => { /* network hiccup; next snapshot retries */ });
      }
    });
    return unsub;
  }, [user]);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
