export type OfferType = 'sell' | 'swap' | 'both' | 'gift';
export type Condition = 'new' | 'like_new' | 'good' | 'fair';
export type ListingStatus = 'active' | 'reserved' | 'closed' | 'hidden';
export type SwapStatus = 'pending' | 'accepted' | 'rejected' | 'completed';
export type UserRole = 'user' | 'admin';
export type ReportStatus = 'open' | 'reviewed' | 'dismissed';

export interface Profile {
  id: string;
  full_name: string;
  city: string;
  avatar_url: string | null;
  role: UserRole;
  is_banned: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
}

export interface UserRating {
  id: string;
  rater_id: string;
  rated_user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  rater?: Pick<Profile, 'id' | 'full_name' | 'city' | 'avatar_url'> | null;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  storage_path: string;
  sort_order: number;
}

export interface Listing {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  category: string;
  city: string;
  neighborhood: string | null;
  offer_type: OfferType;
  price_syp: number | null;
  swap_preference: string | null;
  accepts_cash_diff: boolean;
  condition: Condition;
  contact_name: string;
  status: ListingStatus;
  images?: ListingImage[];
  owner?: Pick<
    Profile,
    'id' | 'full_name' | 'city' | 'avatar_url' | 'rating_avg' | 'rating_count' | 'created_at'
  > | null;
}

export interface ListingFilters {
  query: string;
  city: string;
  category: string;
  offerType: '' | OfferType;
  minPrice?: number | null;
  maxPrice?: number | null;
}

export interface SwapOffer {
  id: string;
  created_at: string;
  updated_at: string;
  listing_id: string;
  proposer_id: string;
  offered_item_title: string;
  cash_diff_syp: number | null;
  notes: string | null;
  status: SwapStatus;
  listing?: Pick<Listing, 'id' | 'title' | 'city' | 'owner_id' | 'offer_type' | 'images'> | null;
  proposer?: Pick<Profile, 'id' | 'full_name' | 'city' | 'avatar_url'> | null;
}

export interface Favorite {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
  listing?: Listing | null;
}

export interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  last_message_at: string;
  listing?: Pick<Listing, 'id' | 'title' | 'city' | 'price_syp' | 'offer_type' | 'status' | 'images'> | null;
  buyer?: Pick<Profile, 'id' | 'full_name' | 'city' | 'avatar_url'> | null;
  seller?: Pick<Profile, 'id' | 'full_name' | 'city' | 'avatar_url'> | null;
  last_message?: Message | null;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  listing_id: string;
  reporter_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
  listing?: Listing | null;
  reporter?: Pick<Profile, 'id' | 'full_name' | 'city'> | null;
}

export const SYRIAN_CITIES: string[] = [
  'دمشق',
  'ريف دمشق',
  'حلب',
  'حمص',
  'حماة',
  'اللاذقية',
  'طرطوس',
  'إدلب',
  'دير الزور',
  'الرقة',
  'الحسكة',
  'درعا',
  'السويداء',
  'القنيطرة',
];

export const CATEGORIES: { value: string; label: string }[] = [
  { value: 'books', label: 'كتب ومستلزمات دراسية' },
  { value: 'electronics', label: 'إلكترونيات' },
  { value: 'home', label: 'منزل وأثاث' },
  { value: 'kids', label: 'أطفال وملابس' },
  { value: 'cars_tools', label: 'سيارات وأدوات' },
  { value: 'other', label: 'أخرى' },
];

export const OFFER_TYPES: { value: OfferType; label: string }[] = [
  { value: 'sell', label: 'بيع' },
  { value: 'swap', label: 'مقايضة' },
  { value: 'both', label: 'بيع أو مقايضة' },
  { value: 'gift', label: 'إهداء' },
];

export const CONDITIONS: { value: Condition; label: string }[] = [
  { value: 'new', label: 'جديد' },
  { value: 'like_new', label: 'شبه جديد' },
  { value: 'good', label: 'مستعمل بحالة جيدة' },
  { value: 'fair', label: 'مستعمل بحالة مقبولة' },
];

export const LISTING_STATUSES: { value: ListingStatus; label: string }[] = [
  { value: 'active', label: 'متاح' },
  { value: 'reserved', label: 'محجوز' },
  { value: 'closed', label: 'مغلق' },
];
