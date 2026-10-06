'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useRouter, Link } from '@/i18n/routing';
import { useEffect } from 'react';
import { formatDate } from '@/lib/utils';

export default function PrescriptionsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: () => api.get<any[]>('/prescriptions', { token: user?.accessToken }),
    enabled: !!user,
  });

  return (
    <div className="container-narrow section-pad py-10">
      <h1 className="text-h1">{t('nav.prescriptions')}</h1>
      {isLoading && <div className="mt-8 skeleton h-32" />}
      {!isLoading && !(data?.data || []).length && (
        <p className="mt-12 text-center text-text-muted">{t('common.noResults')}</p>
      )}
      <ul className="mt-8 space-y-4">
        {(data?.data || []).map((p: any) => (
          <li key={p.id} className="card-surface p-5">
            <p className="text-body-sm text-text-muted">
              {formatDate(p.createdAt, locale)}
            </p>
            <ul className="mt-3 space-y-2">
              {(p.items || []).map((item: any) => (
                <li key={item.id} className="text-body">
                  <span className="font-medium">{item.medicineName}</span>
                  <span className="text-text-secondary">
                    {' '}
                    — {item.dosage}, {item.frequency}, {item.duration}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <Link href="/appointments" className="btn-ghost mt-6 inline-flex">
        {t('common.back')}
      </Link>
    </div>
  );
}
