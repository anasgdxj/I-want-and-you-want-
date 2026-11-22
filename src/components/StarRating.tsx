import { Star } from 'lucide-react';

interface StarRatingDisplayProps {
  average: number;
  count: number;
  size?: number;
}

export function StarRatingDisplay({ average, count, size = 15 }: StarRatingDisplayProps) {
  return (
    <div className="inline-flex items-center gap-1.5 text-xs">
      <Star
        size={size}
        className={count > 0 ? 'fill-amber-400 text-amber-500' : 'text-stone-300 dark:text-stone-600'}
      />
      {count > 0 ? (
        <span className="tabular-nums font-bold text-stone-800 dark:text-stone-200">
          {Number(average).toFixed(1)}
          <span className="font-normal text-stone-500 dark:text-stone-400"> ({count})</span>
        </span>
      ) : (
        <span className="font-semibold text-stone-500 dark:text-stone-400">بدون تقييم بعد</span>
      )}
    </div>
  );
}

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
}

export function StarRatingInput({ value, onChange }: StarRatingInputProps) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="اختر التقييم من 1 إلى 5 نجوم">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} نجوم`}
            onClick={() => onChange(star)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-transform active:scale-95 hover:bg-amber-50 dark:hover:bg-stone-800"
          >
            <Star
              size={24}
              className={
                active
                  ? 'fill-amber-400 text-amber-500'
                  : 'text-stone-300 dark:text-stone-600'
              }
            />
          </button>
        );
      })}
    </div>
  );
}
