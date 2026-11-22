import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Package, X } from 'lucide-react';
import { getPublicImageUrl } from '../lib/supabase';
import type { ListingImage } from '../types';

interface ImageGalleryProps {
  images: ListingImage[];
  title: string;
}

export default function ImageGallery({ images, title }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const urls = images
    .map((img) => getPublicImageUrl(img.storage_path))
    .filter((u): u is string => Boolean(u));

  const scrollToIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(index, urls.length - 1));
    setActiveIndex(clamped);
    const el = scrollerRef.current;
    if (el) {
      const child = el.children[clamped] as HTMLElement | undefined;
      child?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  if (urls.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/70 text-stone-400 dark:border-stone-800 dark:from-stone-800 dark:to-stone-900 dark:text-stone-600">
        <Package size={56} strokeWidth={1.5} />
        <span className="text-sm font-semibold">لا توجد صور مرفقة لهذا الغرض</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main scrollable gallery */}
      <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 dark:border-stone-800 dark:bg-stone-900">
        <div
          ref={scrollerRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.clientWidth > 0) {
              const approx = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
              if (approx >= 0 && approx < urls.length) setActiveIndex(approx);
            }
          }}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        >
          {urls.map((url, idx) => (
            <div key={idx} className="relative aspect-[4/3] w-full shrink-0 snap-center">
              <img
                src={url}
                alt={`${title} - صورة ${idx + 1}`}
                referrerPolicy="no-referrer"
                onClick={() => setLightboxOpen(true)}
                className="h-full w-full cursor-zoom-in object-contain"
              />
            </div>
          ))}
        </div>

        {/* Fullscreen button */}
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label="تكبير الصورة"
          className="absolute left-3 top-3 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75"
        >
          <Maximize2 size={18} />
        </button>

        {/* Image counter */}
        {urls.length > 1 && (
          <span className="tabular-nums absolute bottom-3 left-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
            {activeIndex + 1} / {urls.length}
          </span>
        )}

        {/* Navigation arrows for desktop */}
        {urls.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => scrollToIndex(activeIndex - 1)}
              disabled={activeIndex === 0}
              aria-label="الصورة السابقة"
              className="absolute right-3 top-1/2 hidden min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-xl bg-black/50 text-white backdrop-blur-sm transition-opacity hover:bg-black/70 disabled:opacity-30 sm:flex"
            >
              <ChevronRight size={20} />
            </button>
            <button
              type="button"
              onClick={() => scrollToIndex(activeIndex + 1)}
              disabled={activeIndex === urls.length - 1}
              aria-label="الصورة التالية"
              className="absolute left-3 top-1/2 hidden min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-xl bg-black/50 text-white backdrop-blur-sm transition-opacity hover:bg-black/70 disabled:opacity-30 sm:flex"
            >
              <ChevronLeft size={20} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {urls.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {urls.map((url, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => scrollToIndex(idx)}
              className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                activeIndex === idx
                  ? 'border-olive-600 ring-2 ring-olive-600/20'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={url}
                alt={`مصغرة ${idx + 1}`}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="إغلاق العرض"
            className="absolute left-4 top-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25"
          >
            <X size={22} />
          </button>
          <img
            src={urls[activeIndex]}
            alt={title}
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-full rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
