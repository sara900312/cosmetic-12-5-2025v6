import React, { createContext, useState, useEffect, useContext } from 'react';
import { useSupabase } from './SupabaseContext';
import { toast } from '@/components/ui/use-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const { supabase } = useSupabase();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);

    const fetchUserRole = async (currentUser) => {
        if (!currentUser) {
            setUserRole(null);
            return null;
        }

        const maxRetries = 2;
        let lastError = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // Add a timeout to prevent hanging
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                const { data, error } = await supabase
                    .from('user_profiles')
                    .select('role')
                    .eq('id', currentUser.id)
                    .single();

                clearTimeout(timeoutId);

                if (error) {
                    if (error.code !== 'PGRST116') { // Ignore 'exact one row' error if profile doesn't exist yet
                        lastError = error;
                        throw error;
                    }
                }

                const role = data ? data.role : null;
                setUserRole(role);
                return role;
            } catch (error) {
                lastError = error;
                console.warn(`Attempt ${attempt + 1}/${maxRetries} failed:`, error?.message || error);

                if (attempt < maxRetries - 1) {
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                }
            }
        }

        // After all retries failed
        console.error('Error fetching user role after retries:', lastError?.message || lastError);
        setUserRole(null);
        return null;
    };

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error('Error getting session:', sessionError?.message || sessionError);
                }

                const currentUser = session ? session.user : null;
                setUser(currentUser);
                if (currentUser) {
                    await fetchUserRole(currentUser);
                }
            } catch (error) {
                console.error('Auth initialization error:', error?.message || error);
                // Continue loading even if auth fails
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                try {
                    const currentUser = session ? session.user : null;
                    setUser(currentUser);
                    if (currentUser) {
                        await fetchUserRole(currentUser);
                    } else {
                        setUserRole(null);
                    }
                } catch (error) {
                    console.error('Auth state change error:', error?.message || error);
                } finally {
                    setLoading(false);
                }
            }
        );

        return () => {
            if (authListener?.subscription) {
                authListener.subscription.unsubscribe();
            }
        };
    }, [supabase]);

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { user: null, role: null, error };

        const role = await fetchUserRole(data.user);
        return { user: data.user, role, error: null };
    };

    const value = {
        user,
        loading,
        userRole,
        signIn,
        signOut: () => supabase.auth.signOut(),
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
