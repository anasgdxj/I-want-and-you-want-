import type { MouseEvent } from 'react';
import { Heart, Images, MapPin, Package, Repeat } from 'lucide-react';
import { getPublicImageUrl } from '../lib/supabase';
import {
  formatRelativeTime,
  getCategoryLabel,
  getListingPriceText,
  OFFER_BADGES,
} from '../lib/utils';
import type { Listing } from '../types';

interface ListingCardProps {
  listing: Listing;
  isFavorite?: boolean;
  onToggleFavorite?: (listingId: string) => void;
  onOpen: (listingId: string) => void;
}

export default function ListingCard({
  listing,
  isFavorite = false,
  onToggleFavorite,
  onOpen,
}: ListingCardProps) {
  const badge = OFFER_BADGES[listing.offer_type];
  const firstImage = listing.images?.[0]?.storage_path
    ? getPublicImageUrl(listing.images[0].storage_path)
    : null;
  const imageCount = listing.images?.length ?? 0;
  const priceText = getListingPriceText(listing.offer_type, listing.price_syp);
  const canSwap = listing.offer_type === 'swap' || listing.offer_type === 'both';

  const handleFavoriteClick = (e: MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(listing.id);
  };

  return (
    <article
      onClick={() => onOpen(listing.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(listing.id);
        }
      }}
      role="button"
      tabIndex={0}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-white text-start transition-transform duration-200 hover:-translate-y-0.5 hover:border-olive-300 dark:border-stone-800 dark:bg-[#1c1a17] dark:hover:border-olive-700"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100 dark:bg-stone-800/70">
        {firstImage ? (
          <img
            src={firstImage}
            alt={listing.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-stone-100 to-stone-200/70 text-stone-400 dark:from-stone-800 dark:to-stone-900 dark:text-stone-600">
            <Package size={40} strokeWidth={1.6} />
            <span className="text-xs font-semibold">{getCategoryLabel(listing.category)}</span>
          </div>
        )}

        {/* Single offer type badge */}
        <span
          className={`absolute right-3 top-3 rounded-lg px-2.5 py-1 text-xs font-bold ${badge.className}`}
        >
          {badge.label}
        </span>

        {/* Favorite button */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={handleFavoriteClick}
            aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
            className={`absolute left-2.5 top-2.5 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-colors ${
              isFavorite
                ? 'bg-rose-600 text-white'
                : 'bg-white/85 text-stone-700 hover:bg-white dark:bg-stone-900/80 dark:text-stone-200'
            }`}
          >
            <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        )}

        {/* Multiple images indicator */}
        {imageCount > 1 && (
          <span className="tabular-nums absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-lg bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
            <Images size={12} />
            {imageCount}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Clean unboxed metadata */}
        <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
          <span className="truncate">{getCategoryLabel(listing.category)}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{formatRelativeTime(listing.created_at)}</span>
        </div>

        <h3 className="line-clamp-2 text-base font-bold leading-snug text-stone-900 transition-colors group-hover:text-olive-700 dark:text-stone-100 dark:group-hover:text-olive-400">
          {listing.title}
        </h3>

        <div className="tabular-nums text-base font-extrabold text-olive-700 dark:text-olive-400">
          {priceText}
        </div>

        {canSwap && listing.swap_preference && (
          <p className="line-clamp-1 flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
            <Repeat size={13} className="shrink-0" />
            <span>بدّي: {listing.swap_preference}</span>
          </p>
        )}

        <div className="mt-auto flex items-center gap-1 pt-2 text-xs text-stone-500 dark:text-stone-400">
          <MapPin size={13} className="shrink-0" />
          <span className="truncate">
            {listing.city}
            {listing.neighborhood ? ` · ${listing.neighborhood}` : ''}
          </span>
        </div>
      </div>
    </article>
  );
}
