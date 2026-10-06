'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Suspense } from 'react';

function PaymentResultContent() {
  const t = useTranslations();
  const params = useSearchParams();
  const status = params.get('status');
  const ok = status === 'success';

  return (
    <div className="container-narrow section-pad py-20 text-center max-w-lg">
      <h1 className="text-h1">{ok ? t('booking.success') : t('common.error')}</h1>
      <p className="mt-4 text-body text-text-secondary">
        {ok ? t('payment.confirmed') : t('payment.failed')}
      </p>
      <Link href="/appointments" className="btn-primary mt-8 inline-flex">
        {t('nav.appointments')}
      </Link>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<div className="container-narrow section-pad py-20"><div className="skeleton h-40" /></div>}>
      <PaymentResultContent />
    </Suspense>
  );
}
