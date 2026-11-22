import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { fetchCurrentSession, fetchProfile, signOutUser, type AuthUser } from '../lib/auth';
import { fetchFavoriteIds, toggleFavorite as toggleFavoriteApi } from '../lib/listings';
import { fetchConversations } from '../lib/messages';
import type { Profile } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  favoriteIds: Set<string>;
  unreadMessages: number;
  refreshAuth: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshUnread: () => Promise<void>;
  toggleFavorite: (listingId: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [unreadMessages, setUnreadMessages] = useState(0);

  const loadUserExtras = useCallback(async (userId: string) => {
    try {
      const [favIds, convs] = await Promise.all([
        fetchFavoriteIds(userId),
        fetchConversations(userId),
      ]);
      setFavoriteIds(new Set(favIds));
      setUnreadMessages(convs.reduce((acc, c) => acc + (c.unread_count ?? 0), 0));
    } catch {
      // ignore non-fatal extras errors
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    try {
      const session = await fetchCurrentSession();
      setUser(session.user);
      setProfile(session.profile);
      if (session.user) {
        await loadUserExtras(session.user.id);
      } else {
        setFavoriteIds(new Set());
        setUnreadMessages(0);
      }
    } finally {
      setLoading(false);
    }
  }, [loadUserExtras]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    setProfile(p);
  }, [user]);

  const refreshUnread = useCallback(async () => {
    if (!user) {
      setUnreadMessages(0);
      return;
    }
    try {
      const convs = await fetchConversations(user.id);
      setUnreadMessages(convs.reduce((acc, c) => acc + (c.unread_count ?? 0), 0));
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    void refreshAuth();

    if (!supabase) return;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const authUser: AuthUser = { id: session.user.id, phone: session.user.phone };
        setUser(authUser);
        void fetchProfile(session.user.id).then(setProfile).catch(() => setProfile(null));
        void loadUserExtras(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setFavoriteIds(new Set());
        setUnreadMessages(0);
      }
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [refreshAuth, loadUserExtras]);

  const toggleFavorite = useCallback(
    async (listingId: string) => {
      if (!user) throw new Error('يجب تسجيل الدخول لحفظ المفضلة');
      const currentlyFav = favoriteIds.has(listingId);
      const nextFav = await toggleFavoriteApi(user.id, listingId, currentlyFav);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (nextFav) next.add(listingId);
        else next.delete(listingId);
        return next;
      });
      return nextFav;
    },
    [user, favoriteIds],
  );

  const signOut = useCallback(async () => {
    await signOutUser();
    setUser(null);
    setProfile(null);
    setFavoriteIds(new Set());
    setUnreadMessages(0);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin: profile?.role === 'admin',
        favoriteIds,
        unreadMessages,
        refreshAuth,
        refreshProfile,
        refreshUnread,
        toggleFavorite,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
