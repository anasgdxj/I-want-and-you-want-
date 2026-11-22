import { Compass } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useRouter } from '../hooks/useRouter';

export default function NotFoundPage() {
  const { navigate } = useRouter();

  return (
    <div className="mx-auto max-w-lg py-10">
      <EmptyState
        icon={<Compass size={30} />}
        title="الصفحة غير موجودة (404)"
        description="الرابط الذي فتحته غير صحيح أو لم يعد متاحاً."
        actionLabel="العودة إلى الرئيسية"
        onAction={() => navigate('/')}
      />
    </div>
  );
}
