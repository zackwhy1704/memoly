import Image from 'next/image';
import { useTranslation } from '@/lib/messages';

export function LoadingCard() {
  const { t } = useTranslation();
  return (
    <div className="bg-panel rounded-2xl border border-line p-8 flex flex-col items-center gap-3">
      <Image src="/mochi-base-transparent.png" alt={t('reviewLoadingCardAlt')} width={36} height={36} className="object-contain animate-bounce" />
      <p className="text-ink3 text-sm">{t('reviewLoadingCardBody')}</p>
    </div>
  );
}
