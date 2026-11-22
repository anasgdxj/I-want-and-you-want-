import type {
  Conversation,
  Favorite,
  Listing,
  Message,
  Profile,
  Report,
  SwapOffer,
  UserRating,
} from '../types';
import { storage } from './storage';

const DEMO_STATE_KEY = 'bw-bd-demo-state-v3';

export interface DemoState {
  currentUserId: string | null;
  profiles: Profile[];
  listings: Listing[];
  phonesByListing: Record<string, string>;
  favorites: Favorite[];
  swapOffers: SwapOffer[];
  conversations: Conversation[];
  messages: Message[];
  userRatings: UserRating[];
  reports: Report[];
}

const SEED_PROFILES: Profile[] = [
  {
    id: 'demo-user-1',
    full_name: 'سامر الحلبي',
    city: 'دمشق',
    avatar_url: null,
    role: 'user',
    is_banned: false,
    rating_avg: 4.8,
    rating_count: 2,
    created_at: '2026-09-10T08:00:00Z',
  },
  {
    id: 'demo-user-2',
    full_name: 'ريم الشامي',
    city: 'حلب',
    avatar_url: null,
    role: 'user',
    is_banned: false,
    rating_avg: 5.0,
    rating_count: 1,
    created_at: '2026-08-11T09:00:00Z',
  },
  {
    id: 'demo-user-3',
    full_name: 'يوسف اللاذقاني',
    city: 'اللاذقية',
    avatar_url: null,
    role: 'user',
    is_banned: false,
    rating_avg: 4.5,
    rating_count: 1,
    created_at: '2026-10-02T10:00:00Z',
  },
  {
    id: 'demo-admin-1',
    full_name: 'مشرف بدّي وبدّك',
    city: 'دمشق',
    avatar_url: null,
    role: 'admin',
    is_banned: false,
    rating_avg: 5.0,
    rating_count: 0,
    created_at: '2026-07-01T08:00:00Z',
  },
];

const SEED_LISTINGS: Listing[] = [
  {
    id: 'demo-listing-1',
    owner_id: 'demo-user-1',
    created_at: '2026-11-20T10:00:00Z',
    updated_at: '2026-11-20T10:00:00Z',
    title: 'كتب طب سنة أولى - كاملة ونظيفة',
    description: 'مجموعة كتب تشريح وفيزيولوجيا وكيمياء حيوية بحالة ممتازة جداً، بدون أي تظهير أو كتابة داخل الصفحات.',
    category: 'books',
    city: 'دمشق',
    neighborhood: 'المزرعة',
    offer_type: 'both',
    price_syp: 150000,
    swap_preference: 'كتب طب سنة ثانية أو آلة حاسبة علمية كاسيو',
    accepts_cash_diff: true,
    condition: 'like_new',
    contact_name: 'سامر الحلبي',
    status: 'active',
    images: [],
  },
  {
    id: 'demo-listing-2',
    owner_id: 'demo-user-2',
    created_at: '2026-11-19T12:00:00Z',
    updated_at: '2026-11-19T12:00:00Z',
    title: 'طاولة خشب زان مع أربعة كراسي',
    description: 'طاولة سفرة متينة مستعملة بحالة مقبولة وتحتاج دهاناً بسيطاً. الإهداء لعائلة محتاجة أو طالب سكن.',
    category: 'home',
    city: 'حلب',
    neighborhood: 'الجميلية',
    offer_type: 'gift',
    price_syp: null,
    swap_preference: null,
    accepts_cash_diff: false,
    condition: 'fair',
    contact_name: 'ريم الشامي',
    status: 'active',
    images: [],
  },
  {
    id: 'demo-listing-3',
    owner_id: 'demo-user-3',
    created_at: '2026-11-18T09:00:00Z',
    updated_at: '2026-11-18T09:00:00Z',
    title: 'لابتوب Lenovo للدراسة والبرمجة',
    description: 'معالج i5 الجيل الثامن، رام 8 غيغا، SSD 256. يعمل بسلاسة وبطاريته تكفي قرابة الساعتين.',
    category: 'electronics',
    city: 'اللاذقية',
    neighborhood: 'المشروع السابع',
    offer_type: 'swap',
    price_syp: null,
    swap_preference: 'تابلت للرسم أو ساعة ذكية أو دراجة هوائية',
    accepts_cash_diff: true,
    condition: 'good',
    contact_name: 'يوسف اللاذقاني',
    status: 'active',
    images: [],
  },
  {
    id: 'demo-listing-4',
    owner_id: 'demo-user-2',
    created_at: '2026-11-17T15:00:00Z',
    updated_at: '2026-11-17T15:00:00Z',
    title: 'عربة أطفال قابلة للطي مع بدلات شتوية',
    description: 'عربة نظيفة وخفيفة الوزن مع 3 بدلات شتوية مبطنة لعمر سنتين إلى ثلاث سنوات.',
    category: 'kids',
    city: 'حمص',
    neighborhood: 'الإنشاءات',
    offer_type: 'sell',
    price_syp: 400000,
    swap_preference: null,
    accepts_cash_diff: false,
    condition: 'good',
    contact_name: 'ريم الشامي',
    status: 'active',
    images: [],
  },
  {
    id: 'demo-listing-5',
    owner_id: 'demo-user-1',
    created_at: '2026-11-16T11:30:00Z',
    updated_at: '2026-11-16T11:30:00Z',
    title: 'عدة صيانة منزلية ومثقاب كهربائي Bosch',
    description: 'مثقاب بحالة شبه جديدة مع حقيبة ريش ومفكات أصلية، استعمال منزلي خفيف.',
    category: 'cars_tools',
    city: 'دمشق',
    neighborhood: 'الميدان',
    offer_type: 'both',
    price_syp: 650000,
    swap_preference: 'منفاخ هواء للسيارة أو بطارية ليثيوم 12 فولت',
    accepts_cash_diff: true,
    condition: 'like_new',
    contact_name: 'سامر الحلبي',
    status: 'active',
    images: [],
  },
  {
    id: 'demo-listing-6',
    owner_id: 'demo-user-3',
    created_at: '2026-11-15T14:20:00Z',
    updated_at: '2026-11-15T14:20:00Z',
    title: 'راوتر TP-Link ثنائي الحزمة مع محوّل UPS صغير',
    description: 'يعمل على كهرباء البطارية مباشرة أثناء التقنين، مناسب جداً للعمل عن بعد.',
    category: 'electronics',
    city: 'طرطوس',
    neighborhood: 'الحمرات',
    offer_type: 'sell',
    price_syp: 320000,
    swap_preference: null,
    accepts_cash_diff: false,
    condition: 'like_new',
    contact_name: 'يوسف اللاذقاني',
    status: 'active',
    images: [],
  },
];

const INITIAL_DEMO_STATE: DemoState = {
  currentUserId: null,
  profiles: SEED_PROFILES,
  listings: SEED_LISTINGS,
  phonesByListing: {
    'demo-listing-1': '0944000001',
    'demo-listing-2': '0933000002',
    'demo-listing-3': '0988000003',
    'demo-listing-4': '0933000002',
    'demo-listing-5': '0944000001',
    'demo-listing-6': '0988000003',
  },
  favorites: [],
  swapOffers: [
    {
      id: 'demo-offer-1',
      created_at: '2026-11-21T09:00:00Z',
      updated_at: '2026-11-21T09:00:00Z',
      listing_id: 'demo-listing-1',
      proposer_id: 'demo-user-3',
      offered_item_title: 'آلة حاسبة علمية Casio fx-991EX أصلية',
      cash_diff_syp: 25000,
      notes: 'الآلة نظيفة مع غطائها الأصلي والتسليم في المزرعة.',
      status: 'pending',
    },
  ],
  conversations: [
    {
      id: 'demo-conv-1',
      listing_id: 'demo-listing-1',
      buyer_id: 'demo-user-3',
      seller_id: 'demo-user-1',
      created_at: '2026-11-21T08:30:00Z',
      last_message_at: '2026-11-21T08:35:00Z',
    },
  ],
  messages: [
    {
      id: 'demo-msg-1',
      conversation_id: 'demo-conv-1',
      sender_id: 'demo-user-3',
      body: 'مرحباً أخي سامر، هل كتب السنة الأولى ما زالت متوفرة؟',
      is_read: false,
      created_at: '2026-11-21T08:32:00Z',
    },
    {
      id: 'demo-msg-2',
      conversation_id: 'demo-conv-1',
      sender_id: 'demo-user-1',
      body: 'أهلاً يوسف، نعم متوفرة كاملة وبحالة ممتازة.',
      is_read: true,
      created_at: '2026-11-21T08:35:00Z',
    },
  ],
  userRatings: [
    {
      id: 'demo-rating-1',
      rater_id: 'demo-user-3',
      rated_user_id: 'demo-user-1',
      rating: 5,
      comment: 'تعامل راقٍ ومصداقية عالية في وصف الغرض والالتزام بالموعد.',
      created_at: '2026-11-20T18:00:00Z',
      updated_at: '2026-11-20T18:00:00Z',
    },
    {
      id: 'demo-rating-2',
      rater_id: 'demo-user-2',
      rated_user_id: 'demo-user-1',
      rating: 5,
      comment: 'أخ محترم جداً، تمت المقايضة بسلاسة.',
      created_at: '2026-11-18T14:00:00Z',
      updated_at: '2026-11-18T14:00:00Z',
    },
    {
      id: 'demo-rating-3',
      rater_id: 'demo-user-1',
      rated_user_id: 'demo-user-2',
      rating: 5,
      comment: 'كرم وذوق في التعامل، شكراً جزيلاً.',
      created_at: '2026-11-19T16:00:00Z',
      updated_at: '2026-11-19T16:00:00Z',
    },
  ],
  reports: [
    {
      id: 'demo-report-1',
      listing_id: 'demo-listing-4',
      reporter_id: 'demo-user-3',
      reason: 'السعر غير واضح في الصور ويحتاج توضيحاً أكثر',
      status: 'open',
      created_at: '2026-11-21T10:00:00Z',
    },
  ],
};

export function getDemoState(): DemoState {
  return storage.get<DemoState>(DEMO_STATE_KEY, INITIAL_DEMO_STATE);
}

export function setDemoState(updater: (prev: DemoState) => DemoState): DemoState {
  const next = updater(getDemoState());
  storage.set(DEMO_STATE_KEY, next);
  return next;
}
