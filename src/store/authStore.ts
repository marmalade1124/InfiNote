import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthStore {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    initialize: () => Promise<void>;
    signIn: (username: string, password: string) => Promise<{ error: any }>;
    signUp: (username: string, password: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    deleteUser: (id: string) => Promise<{ error: any }>;
    updateProfile: (id: string, updates: { username?: string; avatar_url?: string; password?: string }) => Promise<{ error: any }>;
    uploadAvatar: (file: File) => Promise<{ url: string | null; error: any }>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
    session: null,
    user: null,
    isLoading: true,
    
    initialize: async () => {
        set({ isLoading: true });
        
        const fetchProfile = async (uid: string) => {
            const { data } = await supabase.from('profiles').select('role, username, avatar_url').eq('id', uid).single();
            return data || { role: 'user' };
        };

        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        let userWithProfile = null;
        if (session?.user) {
            const profile = await fetchProfile(session.user.id);
            userWithProfile = { 
                ...session.user, 
                role: profile.role || 'user',
                // @ts-ignore
                username: profile.username, // Polyfill username from DB
                // @ts-ignore
                avatar_url: profile.avatar_url // Polyfill avatar from DB
            };
        }
        
        set({ session, user: userWithProfile, isLoading: false });
        
        // Listen for changes
        supabase.auth.onAuthStateChange(async (_event, session) => {
            let profile: any = { role: 'user' };
            if (session?.user) {
                 profile = await fetchProfile(session.user.id);
            }
            const user = session?.user ? { 
                ...session.user, 
                role: profile.role || 'user',
                // @ts-ignore
                username: profile.username,
                // @ts-ignore
                avatar_url: profile.avatar_url
            } : null;
            
            set({ session, user, isLoading: false });
        });
    },
    
    deleteUser: async (targetId: string) => {
        const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: targetId });
        return { error };
    },

    updateProfile: async (id: string, updates: { username?: string; avatar_url?: string; password?: string }) => {
        try {
            // Robust timeout wrapper that handles any Thenable safely
            const timeout = async <T>(promise: Promise<T> | PromiseLike<T>, ms: number = 10000): Promise<T> => {
                let timer: any;
                const timeoutPromise = new Promise<T>((_, reject) => {
                    timer = setTimeout(() => reject(new Error('Request timed out')), ms);
                });
                try {
                    return await Promise.race([
                        (async () => {
                            const result = await promise;
                            clearTimeout(timer);
                            return result;
                        })(),
                        timeoutPromise
                    ]);
                } catch (e) {
                    clearTimeout(timer);
                    throw e;
                }
            };

            // 1. CRITICAL: Update Profile Data in DB First (Source of Truth)
            if (updates.username || updates.avatar_url) {
                console.log('Updating Profile DB:', updates);
                const dbPromise = supabase
                    .from('profiles')
                    .update({
                        ...(updates.username && { username: updates.username }),
                        ...(updates.avatar_url && { avatar_url: updates.avatar_url }),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id);

                const response: any = await timeout(dbPromise);
                const { error: dbError } = response;
                    
                if (dbError) {
                    console.error('DB update failed:', dbError);
                    throw dbError;
                }
                console.log('DB update success');

                // Optimistically update local state ensuring UI reflects DB immediately
                set((state) => {
                    if (!state.user) return state;
                    return {
                        user: {
                            ...state.user,
                            // @ts-ignore
                            ...(updates.username && { username: updates.username }),
                            // @ts-ignore
                            ...(updates.avatar_url && { avatar_url: updates.avatar_url })
                        } as any
                    };
                });
            }

            // 2. SECONDARY: Sync Auth Metadata (Best Effort) & Password (Critical)
            const authUpdates: any = {};
            if (updates.password) authUpdates.password = updates.password;
            if (updates.username || updates.avatar_url) {
                authUpdates.data = {
                    ...(updates.username && { username: updates.username }),
                    ...(updates.avatar_url && { avatar_url: updates.avatar_url })
                };
            }

            if (Object.keys(authUpdates).length > 0) {
                console.log('Syncing Supabase Auth User:', authUpdates);
                
                // If checking password, we must wait. If just metadata, we can be lenient or wait but catch error.
                // We'll wait to ensure consistency, but catch timeout for metadata-only updates.
                try {
                     // @ts-ignore
                    const response: any = await timeout(supabase.auth.updateUser(authUpdates));
                    const { data: { user: updatedUser }, error: authError } = response;
                    
                    if (authError) throw authError;
                    
                    // Merge any auth-side changes (like new mapping)
                    if (updatedUser) {
                        set((state) => ({ 
                           user: { 
                               ...state.user, 
                               ...updatedUser, 
                               role: state.user?.role || 'user',
                               // @ts-ignore
                               username: updates.username || (state.user as any)?.username,
                               // @ts-ignore
                               avatar_url: updates.avatar_url || (state.user as any)?.avatar_url
                           } as any 
                       }));
                   }
                } catch (err) {
                    console.warn('Auth sync failed or timed out (non-critical if only metadata):', err);
                    // If it was a password update, this IS critical
                    if (updates.password) {
                        throw err;
                    }
                    // Otherwise, suppress error as DB update succeeded
                }
            }

            return { error: null };
        } catch (error: any) {
            console.error('updateProfile error:', error);
            return { error };
        }
    },

    uploadAvatar: async (file: File) => {
        try {
            // @ts-ignore
            const user = get().user;
            // Actually 'get' is not available in the single argument version of create... 
            // Wait, create((set, get) ..) is valid.
            // Let's check the create signature.
            // export const useAuthStore = create<AuthStore>((set) => ({
            // It only has 'set'. I need to add 'get'.

            if (!user) throw new Error('No user logged in');

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            return { url: data.publicUrl, error: null };
        } catch (error: any) {
            return { url: null, error };
        }
    },
    
    signIn: async (username: string, password: string) => {
        // Mock email using a fake domain since user requested username-only
        const email = `${username}@infinote.app`;
        
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        return { error };
    },

    signUp: async (username: string, password: string) => {
        const email = `${username}@infinote.app`;
        
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username
                }
            }
        });
        
        if (!error && data.user) {
            // Explicitly create profile to ensure "all users are saved"
            // Usually handled by trigger, but doing it manually guarantees it for this request.
            await supabase.from('profiles').insert({
                id: data.user.id,
                username: username,
                avatar_url: `https://ui-avatars.com/api/?name=${username}&background=random`
            });
        }
        
        return { error };
    },
    
    signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null });
    }
}));
