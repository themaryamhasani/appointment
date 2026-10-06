import { useLocale, useTranslations } from 'next-intl';
import { cn, formatNumber } from '@/lib/utils';

const STEPS = [
  'stepLocation',
  'stepVisitType',
  'stepDate',
  'stepTime',
  'stepPayment',
  'stepConfirm',
] as const;

export function BookingProgress({ current }: { current: number }) {
  const t = useTranslations('booking');
  const locale = useLocale();
  return (
    <ol className="flex flex-wrap gap-2" aria-label={t('progress')}>
      {STEPS.map((step, i) => (
        <li
          key={step}
          className={cn(
            'rounded px-3 py-1.5 text-caption',
            i === current && 'bg-primary text-primary-foreground',
            i < current && 'bg-surface-muted text-text-secondary',
            i > current && 'text-text-muted',
          )}
        >
          {formatNumber(i + 1, locale)}. {t(step)}
        </li>
      ))}
    </ol>
  );
}
