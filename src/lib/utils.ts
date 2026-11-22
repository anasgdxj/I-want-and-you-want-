import {
  CATEGORIES,
  CONDITIONS,
  LISTING_STATUSES,
  type Condition,
  type ListingStatus,
  type OfferType,
  type SwapStatus,
} from '../types';

/**
 * تطبيع النص العربي لتسهيل البحث (توحيد الألف، التاء المربوطة، الألف المقصورة، وإزالة التشكيل والتطويل)
 */
export function normalizeArabic(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // إزالة التشكيل والتطويل
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ');
}

/**
 * تنظيف رقم الهاتف السوري وتحويله إلى الصيغة المحلية 09XXXXXXXX
 */
export function extractLocalSyrianPhone(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('963')) digits = `0${digits.slice(3)}`;
  if (!digits.startsWith('0') && digits.startsWith('9') && digits.length === 9) {
    digits = `0${digits}`;
  }
  return digits;
}

/**
 * التحقق من صحة رقم الجوال السوري: 09 متبوعة بثمانية أرقام (10 أرقام إجمالاً)
 */
export function isValidSyrianPhone(input: string): boolean {
  const local = extractLocalSyrianPhone(input);
  return /^09\d{8}$/.test(local);
}

/**
 * تحويل رقم الهاتف السوري إلى صيغة واتساب الدولية: 9639XXXXXXXX
 */
export function normalizeSyrianPhone(input: string): string {
  const local = extractLocalSyrianPhone(input);
  if (local.startsWith('0')) return `963${local.slice(1)}`;
  return `963${local}`;
}

/**
 * تحويل رقم الهاتف السوري إلى صيغة E.164 لـ Supabase Auth: +9639XXXXXXXX
 */
export function toE164SyrianPhone(input: string): string {
  return `+${normalizeSyrianPhone(input)}`;
}

export function formatSYP(amount: number): string {
  return `${new Intl.NumberFormat('en-US').format(amount)} ل.س`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} ب`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}

export function formatArabicDate(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat('ar-SY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(isoDate));
  } catch {
    return isoDate.slice(0, 10);
  }
}

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'الآن';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `منذ ${diffMin} د`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `منذ ${diffHours} س`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `منذ ${diffDays} ي`;
  return formatArabicDate(isoDate);
}

export const OFFER_BADGES: Record<OfferType, { label: string; className: string }> = {
  sell: {
    label: 'بيع',
    className:
      'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800',
  },
  swap: {
    label: 'مقايضة',
    className:
      'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800',
  },
  both: {
    label: 'بيع أو مقايضة',
    className:
      'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/70 dark:text-violet-300 dark:border-violet-800',
  },
  gift: {
    label: 'إهداء',
    className:
      'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800',
  },
};

export const SWAP_STATUS_LABELS: Record<SwapStatus, { label: string; className: string }> = {
  pending: {
    label: 'قيد الانتظار',
    className:
      'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  },
  accepted: {
    label: 'مقبول',
    className:
      'bg-olive-50 text-olive-700 border border-olive-200 dark:bg-olive-950/60 dark:text-olive-300 dark:border-olive-800',
  },
  rejected: {
    label: 'مرفوض',
    className:
      'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
  },
  completed: {
    label: 'مكتمل',
    className:
      'bg-stone-100 text-stone-700 border border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700',
  },
};

export function getCategoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function getConditionLabel(value: Condition): string {
  return CONDITIONS.find((c) => c.value === value)?.label ?? value;
}

export function getStatusLabel(value: ListingStatus): string {
  if (value === 'hidden') return 'مخفي من الإدارة';
  return LISTING_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function getListingPriceText(offerType: OfferType, priceSyp: number | null): string {
  if (offerType === 'gift') return 'إهداء مجاني';
  if ((offerType === 'sell' || offerType === 'both') && priceSyp !== null) {
    return formatSYP(priceSyp);
  }
  if (offerType === 'swap') return 'للمقايضة فقط';
  return 'السعر عند التواصل';
}

export function getErrorMessage(err: unknown): string {
  if (!err) return 'حدث خطأ غير متوقع، حاول مرة أخرى';
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err);

  const lower = raw.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('token has expired') || lower.includes('otp')) {
    return 'رمز التحقق غير صحيح أو انتهت صلاحيته، اطلب رمزاً جديداً';
  }
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'ليس لديك صلاحية لتنفيذ هذا الإجراء';
  }
  if (lower.includes('duplicate key') || lower.includes('already exists')) {
    return 'هذا السجل موجود مسبقاً';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'تعذر الاتصال بالخادم، تحقق من اتصال الإنترنت';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'تم إرسال طلبات كثيرة، يرجى الانتظار قليلاً والمحاولة مجدداً';
  }
  return raw;
}
