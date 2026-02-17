import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Create or update user document in Firestore
      const userDocRef = doc(db, 'users', user.email!);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Create new user document
        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        });
      } else {
        // Update last login time
        await setDoc(
          userDocRef,
          {
            lastLogin: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      toast({
        title: "Welcome!",
        description: `Signed in as ${user.displayName || user.email}`,
      });
    } catch (error: any) {
      // Handle popup blocked or cancelled
      if (error?.code === "auth/popup-blocked") {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site and try again",
          variant: "destructive",
        });
      } else if (error?.code === "auth/cancelled-popup-request") {
        // User closed the popup - silently ignore
        return;
      } else {
        console.error('Error signing in with Google:', error);
        toast({
          title: "Sign In Failed",
          description: error.message || "An error occurred during sign in",
          variant: "destructive",
        });
      }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out",
      });
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast({
        title: "Sign Out Failed",
        description: error.message || "An error occurred during sign out",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
