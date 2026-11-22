import { supabase } from './supabase';
import { getDemoState, setDemoState } from './demoStore';
import { getErrorMessage, isValidSyrianPhone, toE164SyrianPhone } from './utils';
import type { Profile } from '../types';

export interface AuthUser {
  id: string;
  phone?: string;
}

export async function sendPhoneOtp(phoneInput: string): Promise<{ e164: string; demoHint?: string }> {
  if (!isValidSyrianPhone(phoneInput)) {
    throw new Error('يرجى إدخال رقم جوال سوري صحيح يبدأ بـ 09 ويتكوّن من 10 أرقام');
  }
  const e164 = toE164SyrianPhone(phoneInput);

  if (!supabase) {
    return {
      e164,
      demoHint: 'وضع المعاينة: أدخل الرمز 123456 لتسجيل الدخول كمستخدم، أو 000000 للدخول كمشرف (Admin)',
    };
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone: e164,
    options: {
      shouldCreateUser: true,
    },
  });
  if (error) throw new Error(getErrorMessage(error));
  return { e164 };
}

export async function verifyPhoneOtp(
  phoneInput: string,
  token: string,
): Promise<{ user: AuthUser; profile: Profile | null }> {
  const cleanedToken = token.trim();
  if (!/^\d{6}$/.test(cleanedToken)) {
    throw new Error('رمز التحقق يجب أن يتكون من 6 أرقام');
  }
  const e164 = toE164SyrianPhone(phoneInput);

  if (!supabase) {
    if (cleanedToken !== '123456' && cleanedToken !== '000000') {
      throw new Error('في وضع المعاينة استخدم الرمز 123456 (أو 000000 للمشرف)');
    }
    const targetId = cleanedToken === '000000' ? 'demo-admin-1' : 'demo-user-1';
    const next = setDemoState((prev) => ({
      ...prev,
      currentUserId: targetId,
    }));
    const profile = next.profiles.find((p) => p.id === targetId) ?? null;
    return { user: { id: targetId, phone: e164 }, profile };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone: e164,
    token: cleanedToken,
    type: 'sms',
  });
  if (error) throw new Error(getErrorMessage(error));
  if (!data.user) throw new Error('تعذر إتمام تسجيل الدخول');

  const profile = await fetchProfile(data.user.id);
  return {
    user: { id: data.user.id, phone: data.user.phone ?? e164 },
    profile,
  };
}

export async function fetchCurrentSession(): Promise<{
  user: AuthUser | null;
  profile: Profile | null;
}> {
  if (!supabase) {
    const state = getDemoState();
    if (!state.currentUserId) return { user: null, profile: null };
    const profile = state.profiles.find((p) => p.id === state.currentUserId) ?? null;
    return { user: { id: state.currentUserId }, profile };
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) {
    return { user: null, profile: null };
  }
  const user = data.session.user;
  const profile = await fetchProfile(user.id);
  return { user: { id: user.id, phone: user.phone }, profile };
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) {
    return getDemoState().profiles.find((p) => p.id === userId) ?? null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(getErrorMessage(error));
  return (data as Profile | null) ?? null;
}

export async function updateProfile(
  userId: string,
  updates: { full_name: string; city: string; avatar_url?: string | null },
): Promise<Profile> {
  const fullName = updates.full_name.trim();
  if (fullName.length < 2) {
    throw new Error('الرجاء كتابة الاسم الكامل (حرفان على الأقل)');
  }

  if (!supabase) {
    let updatedProfile: Profile | null = null;
    setDemoState((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) => {
        if (p.id !== userId) return p;
        updatedProfile = {
          ...p,
          full_name: fullName,
          city: updates.city,
          avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : p.avatar_url,
        };
        return updatedProfile;
      }),
    }));
    if (!updatedProfile) throw new Error('لم يتم العثور على الملف الشخصي');
    return updatedProfile;
  }

  const payload: Record<string, unknown> = {
    full_name: fullName,
    city: updates.city,
  };
  if (updates.avatar_url !== undefined) {
    payload.avatar_url = updates.avatar_url;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(getErrorMessage(error));
  return data as Profile;
}

export async function signOutUser(): Promise<void> {
  if (!supabase) {
    setDemoState((prev) => ({ ...prev, currentUserId: null }));
    return;
  }
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(getErrorMessage(error));
}
