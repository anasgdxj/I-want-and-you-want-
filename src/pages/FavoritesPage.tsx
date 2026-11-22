import { useCallback, useEffect, useState } from 'react';
import { Heart, Lock } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import ListingCard from '../components/ListingCard';
import { ListingGridSkeleton } from '../components/ListingSkeleton';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { fetchFavoriteListings } from '../lib/listings';
import { getErrorMessage } from '../lib/utils';
import type { Listing } from '../types';

export default function FavoritesPage() {
  const { user, favoriteIds, toggleFavorite } = useAuth();
  const { navigate } = useRouter();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const items = await fetchFavoriteListings(user.id);
      setListings(items);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-6">
        <EmptyState
          icon={<Lock size={28} />}
          title="سجّل دخولك لعرض المفضلة"
          description="احفظ الأغراض التي تعجبك للرجوع إليها في أي وقت ومن أي جهاز."
          actionLabel="تسجيل الدخول"
          onAction={() => navigate('/login')}
        />
      </div>
    );
  }

  const handleToggle = async (listingId: string) => {
    try {
      const stillFav = await toggleFavorite(listingId);
      if (!stillFav) {
        setListings((prev) => prev.filter((l) => l.id !== listingId));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">المفضلة</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          الأغراض التي حفظتها للعودة إليها لاحقاً.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <ListingGridSkeleton count={3} />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={<Heart size={28} />}
          title="قائمة المفضلة فارغة"
          description="اضغط على أيقونة القلب في أي إعلان لحفظه هنا."
          actionLabel="استكشف الإعلانات"
          onAction={() => navigate('/')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isFavorite={favoriteIds.has(listing.id)}
              onToggleFavorite={(id) => void handleToggle(id)}
              onOpen={(id) => navigate(`/listing/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
