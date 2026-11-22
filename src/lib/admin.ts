import { supabase } from './supabase';
import { getDemoState, setDemoState } from './demoStore';
import { getErrorMessage } from './utils';
import type { Report, ReportStatus } from '../types';

export async function fetchAdminReports(): Promise<Report[]> {
  if (!supabase) {
    const state = getDemoState();
    return state.reports
      .map((r) => {
        const listing = state.listings.find((l) => l.id === r.listing_id) ?? null;
        const owner = listing ? state.profiles.find((p) => p.id === listing.owner_id) ?? null : null;
        const reporter = state.profiles.find((p) => p.id === r.reporter_id) ?? null;
        return {
          ...r,
          listing: listing ? { ...listing, owner } : null,
          reporter,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const { data, error } = await supabase
    .from('reports')
    .select(
      `*,
      listing:listings(*, images:listing_images(*), owner:profiles!listings_owner_id_fkey(id, full_name, city, avatar_url)),
      reporter:profiles!reports_reporter_id_fkey(id, full_name, city)`,
    )
    .order('created_at', { ascending: false });

  if (error) throw new Error(getErrorMessage(error));
  return (data ?? []) as Report[];
}

export async function adminSetListingHidden(listingId: string, hide: boolean): Promise<void> {
  const nextStatus = hide ? 'hidden' : 'active';
  if (!supabase) {
    setDemoState((prev) => ({
      ...prev,
      listings: prev.listings.map((l) =>
        l.id === listingId ? { ...l, status: nextStatus, updated_at: new Date().toISOString() } : l,
      ),
    }));
    return;
  }

  const { error } = await supabase.from('listings').update({ status: nextStatus }).eq('id', listingId);
  if (error) throw new Error(getErrorMessage(error));
}

export async function adminSetUserBanned(userId: string, banned: boolean): Promise<void> {
  if (!supabase) {
    setDemoState((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) => (p.id === userId ? { ...p, is_banned: banned } : p)),
      listings: banned
        ? prev.listings.map((l) => (l.owner_id === userId ? { ...l, status: 'hidden' } : l))
        : prev.listings,
    }));
    return;
  }

  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ is_banned: banned })
    .eq('id', userId);
  if (profileErr) throw new Error(getErrorMessage(profileErr));

  if (banned) {
    const { error: listingsErr } = await supabase
      .from('listings')
      .update({ status: 'hidden' })
      .eq('owner_id', userId);
    if (listingsErr) throw new Error(getErrorMessage(listingsErr));
  }
}

export async function adminUpdateReportStatus(reportId: string, status: ReportStatus): Promise<void> {
  if (!supabase) {
    setDemoState((prev) => ({
      ...prev,
      reports: prev.reports.map((r) => (r.id === reportId ? { ...r, status } : r)),
    }));
    return;
  }

  const { error } = await supabase.from('reports').update({ status }).eq('id', reportId);
  if (error) throw new Error(getErrorMessage(error));
}
