import { useState } from 'react';
import { MapPin, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { CATEGORIES, SYRIAN_CITIES, type ListingFilters, type OfferType } from '../types';

interface FilterBarProps {
  filters: ListingFilters;
  onChange: (next: ListingFilters) => void;
  onReset: () => void;
}

const OFFER_CHIPS: { value: '' | OfferType; label: string }[] = [
  { value: '', label: 'الكل' },
  { value: 'swap', label: 'مقايضة' },
  { value: 'sell', label: 'بيع' },
  { value: 'both', label: 'بيع أو مقايضة' },
  { value: 'gift', label: 'إهداء' },
];

export default function FilterBar({ filters, onChange, onReset }: FilterBarProps) {
  const [showPriceFilter, setShowPriceFilter] = useState(
    filters.minPrice != null || filters.maxPrice != null,
  );

  const hasActiveFilters = Boolean(
    filters.query.trim() ||
      filters.city ||
      filters.category ||
      filters.offerType ||
      filters.minPrice != null ||
      filters.maxPrice != null,
  );

  return (
    <section
      className="space-y-3 rounded-2xl border border-stone-200/90 bg-white p-4 dark:border-stone-800 dark:bg-[#1c1a17]"
      aria-label="البحث والتصفية"
    >
      {/* Top row: Search + Governorate + Price toggle */}
      <div className="grid gap-2.5 sm:grid-cols-12">
        <div className="relative sm:col-span-6">
          <Search
            size={18}
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder="ابحث عن غرض، وصف، أو حي..."
            className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-stone-50/70 py-2 pe-3 ps-10 text-sm text-stone-900 transition-colors placeholder:text-stone-400 focus:border-olive-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-olive-600/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:bg-stone-900"
          />
        </div>

        <div className="relative sm:col-span-4">
          <MapPin
            size={16}
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <select
            value={filters.city}
            onChange={(e) => onChange({ ...filters, city: e.target.value })}
            aria-label="المحافظة"
            className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-stone-50/70 py-2 pe-3 ps-9 text-sm text-stone-900 transition-colors focus:border-olive-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-olive-600/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          >
            <option value="">كل المحافظات</option>
            {SYRIAN_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowPriceFilter((v) => !v)}
          className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition-colors sm:col-span-2 ${
            showPriceFilter || filters.minPrice != null || filters.maxPrice != null
              ? 'border-olive-600 bg-olive-50 text-olive-800 dark:border-olive-500 dark:bg-olive-950/60 dark:text-olive-300'
              : 'border-stone-300 bg-stone-50/70 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800'
          }`}
        >
          <SlidersHorizontal size={16} />
          <span>السعر</span>
        </button>
      </div>

      {/* Collapsible Price Range Filter */}
      {showPriceFilter && (
        <div className="grid gap-2.5 border-t border-stone-100 pt-3 dark:border-stone-800 sm:grid-cols-2">
          <div>
            <label htmlFor="filter-min-price" className="mb-1 block text-xs font-semibold text-stone-500 dark:text-stone-400">
              الحد الأدنى للسعر (ل.س)
            </label>
            <input
              id="filter-min-price"
              type="number"
              min={0}
              dir="ltr"
              placeholder="مثال: 50000"
              value={filters.minPrice ?? ''}
              onChange={(e) =>
                onChange({
                  ...filters,
                  minPrice: e.target.value ? Math.max(0, Number(e.target.value)) : null,
                })
              }
              className="tabular-nums min-h-[44px] w-full rounded-xl border border-stone-300 bg-stone-50/70 px-3 py-2 text-sm focus:border-olive-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            />
          </div>
          <div>
            <label htmlFor="filter-max-price" className="mb-1 block text-xs font-semibold text-stone-500 dark:text-stone-400">
              الحد الأقصى للسعر (ل.س)
            </label>
            <input
              id="filter-max-price"
              type="number"
              min={0}
              dir="ltr"
              placeholder="مثال: 500000"
              value={filters.maxPrice ?? ''}
              onChange={(e) =>
                onChange({
                  ...filters,
                  maxPrice: e.target.value ? Math.max(0, Number(e.target.value)) : null,
                })
              }
              className="tabular-nums min-h-[44px] w-full rounded-xl border border-stone-300 bg-stone-50/70 px-3 py-2 text-sm focus:border-olive-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            />
          </div>
        </div>
      )}

      {/* Offer Type Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3 dark:border-stone-800">
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
          {OFFER_CHIPS.map((chip) => {
            const active = filters.offerType === chip.value;
            return (
              <button
                key={chip.value || 'all'}
                type="button"
                onClick={() => onChange({ ...filters, offerType: chip.value })}
                className={`min-h-[40px] shrink-0 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  active
                    ? 'bg-olive-600 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            <RotateCcw size={13} />
            <span>إعادة ضبط</span>
          </button>
        )}
      </div>

      {/* Category Filter Tabs */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => onChange({ ...filters, category: '' })}
          className={`min-h-[40px] shrink-0 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
            filters.category === ''
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
              : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800'
          }`}
        >
          كل التصنيفات
        </button>
        {CATEGORIES.map((c) => {
          const active = filters.category === c.value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => onChange({ ...filters, category: active ? '' : c.value })}
              className={`min-h-[40px] shrink-0 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                  : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
