import Image from 'next/image';
import { useTranslation } from '@/lib/messages';

export function Header() {
  const { t } = useTranslation();
  return (
    <header className="text-center mb-6">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-panel border border-line mb-3">
        <Image src="/mochi-base-transparent.png" alt={t('appName')} width={32} height={32} className="object-contain" />
      </div>
      <h1 className="text-xl font-bold text-ink">{t('appName')}</h1>
      <p className="text-ink2 text-sm mt-2 leading-relaxed">
        {t('reviewHeaderBody')}
      </p>
    </header>
  );
}
