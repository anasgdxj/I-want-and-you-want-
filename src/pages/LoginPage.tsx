import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, KeyRound, Loader2, Phone } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { sendPhoneOtp, verifyPhoneOtp } from '../lib/auth';
import { getErrorMessage, isValidSyrianPhone } from '../lib/utils';

export default function LoginPage() {
  const { user, refreshAuth } = useAuth();
  const { navigate } = useRouter();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [demoHint, setDemoHint] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate('/account', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidSyrianPhone(phone)) {
      setError('يجب إدخال رقم جوال سوري صحيح يبدأ بـ 09 متبوعة بثمانية أرقام (مثال: 0944123456)');
      return;
    }

    setLoading(true);
    try {
      const res = await sendPhoneOtp(phone);
      setDemoHint(res.demoHint ?? null);
      setStep('otp');
      setCooldown(60);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyPhoneOtp(phone, otp);
      await refreshAuth();
      navigate('/account', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-[#1c1a17]">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-olive-100 text-olive-700 dark:bg-olive-950 dark:text-olive-300">
            {step === 'phone' ? <Phone size={22} /> : <KeyRound size={22} />}
          </div>
          <h1 className="mt-3 text-xl font-extrabold text-stone-900 dark:text-stone-100">
            {step === 'phone' ? 'تسجيل الدخول برقم الجوال' : 'أدخل رمز التحقق'}
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {step === 'phone'
              ? 'سنرسل رسالة نصية تحتوي على رمز تحقق مكوّن من 6 أرقام.'
              : `تم إرسال الرمز إلى الرقم ${phone}`}
          </p>
        </div>

        {demoHint && (
          <div className="mb-4 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
            {demoHint}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label htmlFor="login-phone" className="mb-1.5 block text-sm font-bold">
                رقم الجوال السوري
              </label>
              <input
                id="login-phone"
                dir="ltr"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09XXXXXXXX"
                className="tabular-nums min-h-[48px] w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-base font-semibold tracking-wider text-stone-900 focus:border-olive-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              />
              <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
                الصيغة المطلوبة: 09 متبوعة بـ 8 أرقام (10 أرقام إجمالاً)
              </p>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-olive-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-olive-700 disabled:opacity-60"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              <span>إرسال رمز التحقق</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label htmlFor="login-otp" className="mb-1.5 block text-sm font-bold">
                رمز التحقق (6 أرقام)
              </label>
              <input
                id="login-otp"
                dir="ltr"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="------"
                className="tabular-nums min-h-[52px] w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-center text-xl font-extrabold tracking-[0.5em] text-stone-900 focus:border-olive-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-olive-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-olive-700 disabled:opacity-60"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              <span>تأكيد والدخول</span>
            </button>

            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setError(null);
                }}
                className="inline-flex min-h-[40px] items-center gap-1 font-bold text-stone-600 hover:text-stone-900 dark:text-stone-400"
              >
                <ArrowRight size={14} />
                <span>تغيير الرقم</span>
              </button>

              <button
                type="button"
                disabled={cooldown > 0 || loading}
                onClick={(e) => void handleSendOtp(e)}
                className="tabular-nums min-h-[40px] font-bold text-olive-700 disabled:opacity-50 dark:text-olive-400"
              >
                {cooldown > 0 ? `إعادة الإرسال بعد ${cooldown} ث` : 'إعادة إرسال الرمز'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
