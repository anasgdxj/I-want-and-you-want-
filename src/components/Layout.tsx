import type { ReactNode } from 'react';
import {
  Heart,
  Home,
  MessageCircle,
  Moon,
  PlusCircle,
  Repeat,
  ShieldCheck,
  Sun,
  User,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { useTheme } from '../hooks/useTheme';

interface LayoutProps {
  children: ReactNode;
  hideBottomNav?: boolean;
}

export default function Layout({ children, hideBottomNav = false }: LayoutProps) {
  const { path, navigate } = useRouter();
  const { user, isAdmin, unreadMessages } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isActive = (target: string) => {
    if (target === '/') return path === '/';
    return path === target || path.startsWith(`${target}/`);
  };

  const desktopNavItems = [
    { to: '/', label: 'الرئيسية', icon: Home },
    { to: '/favorites', label: 'المفضلة', icon: Heart },
    { to: '/messages', label: 'رسائلي', icon: MessageCircle, badge: unreadMessages },
    { to: '/swaps', label: 'المقايضات', icon: Repeat },
    { to: '/account', label: user ? 'حسابي' : 'دخول', icon: User },
  ];

  const mobileNavItems = [
    { to: '/', label: 'الرئيسية', icon: Home },
    { to: '/add', label: 'أضف غرضاً', icon: PlusCircle, highlight: true },
    { to: '/favorites', label: 'المفضلة', icon: Heart },
    { to: '/messages', label: 'رسائلي', icon: MessageCircle, badge: unreadMessages },
    { to: '/account', label: 'حسابي', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#faf6ee] text-stone-900 dark:bg-[#151310] dark:text-stone-100">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[#e7e0d3] bg-[#faf6ee]/95 backdrop-blur-md dark:border-[#2f2a24] dark:bg-[#151310]/95">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 md:h-16 md:gap-8 md:px-6">
          {/* Zone 1: Brand wordmark */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-600"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-olive-600 text-white">
              <Repeat size={18} />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
              بدّي وبدّك
            </span>
          </button>

          {/* Zone 2: Desktop Navigation Links */}
          <nav className="hidden items-center gap-6 md:flex" aria-label="التنقل الرئيسي">
            {desktopNavItems.map((item) => {
              const active = isActive(item.to);
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => navigate(item.to)}
                  className={`relative inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold transition-colors ${
                    active
                      ? 'text-olive-700 underline decoration-olive-600 decoration-2 underline-offset-8 dark:text-olive-400 dark:decoration-olive-400'
                      : 'text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="tabular-nums rounded-full bg-olive-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className={`inline-flex min-h-[44px] shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold transition-colors ${
                  isActive('/admin')
                    ? 'text-olive-700 underline decoration-olive-600 decoration-2 underline-offset-8 dark:text-olive-400'
                    : 'text-amber-700 hover:text-amber-900 dark:text-amber-400'
                }`}
              >
                <ShieldCheck size={16} />
                <span>الإدارة</span>
              </button>
            )}
          </nav>

          {/* Zone 3: Actions */}
          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                aria-label="لوحة الإدارة"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-stone-800 md:hidden"
              >
                <ShieldCheck size={20} />
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/swaps')}
              aria-label="المقايضات"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-stone-700 hover:bg-stone-200/60 dark:text-stone-300 dark:hover:bg-stone-800 md:hidden"
            >
              <Repeat size={20} />
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-stone-700 transition-colors hover:bg-stone-200/60 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>

            <button
              type="button"
              onClick={() => navigate('/add')}
              className="hidden min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-olive-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-olive-700 md:inline-flex"
            >
              <PlusCircle size={17} />
              <span>أضف غرضاً</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`mx-auto max-w-7xl px-4 pt-5 md:px-6 md:pt-7 ${hideBottomNav ? 'pb-6' : 'pb-24 md:pb-12'}`}>
        {children}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      {!hideBottomNav && (
        <nav
          aria-label="شريط التنقل السفلي"
          className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur-md dark:border-stone-800 dark:bg-[#1a1815]/95 md:hidden"
        >
          <div className="grid h-16 grid-cols-5 items-center">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => navigate(item.to)}
                  className={`relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-1 transition-colors ${
                    item.highlight
                      ? 'text-olive-700 dark:text-olive-400'
                      : active
                        ? 'text-olive-700 dark:text-olive-400'
                        : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
                  }`}
                >
                  <div
                    className={`relative flex items-center justify-center ${
                      item.highlight
                        ? 'h-9 w-9 rounded-xl bg-olive-600 text-white shadow-sm'
                        : ''
                    }`}
                  >
                    <Icon size={item.highlight ? 20 : 21} strokeWidth={active || item.highlight ? 2.4 : 1.9} />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="tabular-nums absolute -left-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="whitespace-nowrap text-[11px] font-bold leading-tight">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
