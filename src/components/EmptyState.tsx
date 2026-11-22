import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center dark:border-stone-700 dark:bg-[#1c1a17]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-extrabold text-stone-900 dark:text-stone-100">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-stone-500 dark:text-stone-400">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-olive-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-olive-700"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
