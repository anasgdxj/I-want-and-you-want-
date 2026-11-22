import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, PackageSearch, ShieldAlert } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import FilterBar from '../components/FilterBar';
import ListingCard from '../components/ListingCard';
import { ListingGridSkeleton } from '../components/ListingSkeleton';
import { useAuth } from '../hooks/useAuth';
import { useDebounce } from '../hooks/useDebounce';
import { useRouter } from '../hooks/useRouter';
import { fetchListingsPage, PAGE_SIZE } from '../lib/listings';
import { isSupabaseConfigured } from '../lib/supabase';
import { getErrorMessage } from '../lib/utils';
import type { Listing, ListingFilters } from '../types';

const INITIAL_FILTERS: ListingFilters = {
  query: '',
  city: '',
  category: '',
  offerType: '',
  minPrice: null,
  maxPrice: null,
};

export default function HomePage() {
  const { navigate } = useRouter();
  const { user, favoriteIds, toggleFavorite } = useAuth();

  const [filters, setFilters] = useState<ListingFilters>(INITIAL_FILTERS);
  const debouncedQuery = useDebounce(filters.query, 280);

  const [listings, setListings] = useState<Listing[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const activeFilters: ListingFilters = {
    ...filters,
    query: debouncedQuery,
  };

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchListingsPage(activeFilters, 0, PAGE_SIZE);
      setListings(res.items);
      setHasMore(res.hasMore);
      setPage(0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedQuery,
    filters.city,
    filters.category,
    filters.offerType,
    filters.minPrice,
    filters.maxPrice,
  ]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetchListingsPage(activeFilters, nextPage, PAGE_SIZE);
      setListings((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        const unique = res.items.filter((i) => !seen.has(i.id));
        return [...prev, ...unique];
      });
      setHasMore(res.hasMore);
      setPage(nextPage);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loadingMore,
    hasMore,
    page,
    debouncedQuery,
    filters.city,
    filters.category,
    filters.offerType,
    filters.minPrice,
    filters.maxPrice,
  ]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: '240px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const handleToggleFav = async (listingId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const added = await toggleFavorite(listingId);
      setToast(added ? 'تمت الإضافة إلى المفضلة' : 'تمت الإزالة من المفضلة');
      window.setTimeout(() => setToast(null), 2200);
    } catch (err) {
      setToast(getErrorMessage(err));
      window.setTimeout(() => setToast(null), 2600);
    }
  };

  return (
    <div className="space-y-6">
      {/* Focused Hero */}
      <section className="rounded-3xl bg-gradient-to-l from-olive-700 to-olive-900 p-6 text-white sm:p-8">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">
            بدّك شي ومعك شي؟ قايض أو بيع أو أهدِ في كل سوريا
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-olive-100 sm:text-base">
            منصة سورية محلية لتبادل الأغراض المستعملة بسهولة وأمان، بدون وسطاء وبالتواصل المباشر.
          </p>
        </div>
      </section>

      {!isSupabaseConfigured && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          وضع المعاينة المحلي نشط: يمكنك تجربة كل الميزات والصفحات محلياً. لتوصيل قاعدة البيانات الحقيقية أضف متغيرات{' '}
          <span dir="ltr" className="font-mono">VITE_SUPABASE_URL</span> و{' '}
          <span dir="ltr" className="font-mono">VITE_SUPABASE_ANON_KEY</span>.
        </div>
      )}

      <FilterBar
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(INITIAL_FILTERS)}
      />

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white shadow-lg dark:bg-stone-100 dark:text-stone-900 md:bottom-6">
          {toast}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <ListingGridSkeleton count={6} />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={<PackageSearch size={28} />}
          title="ما في إعلانات تطابق بحثك حالياً"
          description="جرّب تخفيف الفلاتر أو البحث بكلمة أخرى، أو كن أول من يضيف هذا الغرض."
          actionLabel="إعادة ضبط الفلاتر"
          onAction={() => setFilters(INITIAL_FILTERS)}
        />
      ) : (
        <>
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 dark:text-stone-400">
            <span className="tabular-nums">عرض {listings.length} إعلان</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isFavorite={favoriteIds.has(listing.id)}
                onToggleFavorite={handleToggleFav}
                onOpen={(id) => navigate(`/listing/${id}`)}
              />
            ))}
          </div>

          {/* Infinite Scroll Sentinel */}
          <div ref={sentinelRef} className="flex justify-center py-4">
            {loadingMore && (
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-stone-500">
                <Loader2 size={18} className="animate-spin text-olive-600" />
                <span>جاري تحميل المزيد...</span>
              </div>
            )}
            {!loadingMore && hasMore && (
              <button
                type="button"
                onClick={() => void loadMore()}
                className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-5 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
              >
                تحميل المزيد
              </button>
            )}
          </div>
        </>
      )}

      {/* Safety Note */}
      <footer className="flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 text-xs leading-relaxed text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
        <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400" />
        <p>
          نصيحة أمان: قابل الطرف الآخر في مكان عام، عاين الغرض جيداً قبل التبادل، ولا تُرسل أي دفعة مالية مسبقة قبل الاستلام.
        </p>
      </footer>
    </div>
  );
}
