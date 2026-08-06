import { useTranslation } from '@/lib/messages';

export function SuccessCard() {
  const { t } = useTranslation();
  return (
    <div className="bg-panel rounded-2xl border border-line p-8 text-center">
      <span className="text-4xl">🎉</span>
      <h2 className="text-lg font-bold text-ink mt-3">
        {t('successCardThanksTitle')}
      </h2>
      <p className="text-ink2 text-sm mt-2 leading-relaxed">
        {t('successCardBody')}
      </p>
      <p className="text-ink3 text-xs mt-6 leading-relaxed">
        {t('successCardFooterPrefix')}{' '}
        <a
          href="https://apalchi.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent font-semibold hover:underline whitespace-nowrap"
        >
          {t('successCardLearnMore')}
        </a>
      </p>
    </div>
  );
}
