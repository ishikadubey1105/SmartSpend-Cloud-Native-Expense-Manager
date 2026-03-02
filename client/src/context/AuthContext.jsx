import { createContext, useContext, useState, useEffect } from 'react';
import {
    auth,
    googleProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    updateProfile as firebaseUpdateProfile,
    onAuthStateChanged,
} from '../config/firebase';
import { userAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [dbUser, setDbUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                try {
                    const res = await userAPI.sync();
                    setDbUser(res.data);
                } catch (err) {
                    console.error('User sync error:', err);
                }
            } else {
                setUser(null);
                setDbUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const signInWithGoogle = async () => {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    };

    const signInWithEmail = async (email, password) => {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    };

    const signUpWithEmail = async (email, password, displayName) => {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await firebaseUpdateProfile(result.user, { displayName });
        return result.user;
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
    };

    const refreshDbUser = async () => {
        try {
            const res = await userAPI.getProfile();
            setDbUser(res.data);
        } catch (err) {
            console.error('Refresh user error:', err);
        }
    };

    const value = {
        user,
        dbUser,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        refreshDbUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
