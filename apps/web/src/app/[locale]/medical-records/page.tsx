'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth';
import { fetchMedicalRecords } from '@/lib/api';
import { useRouter, Link } from '@/i18n/routing';
import { useEffect } from 'react';
import { formatDate } from '@/lib/utils';

export default function MedicalRecordsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['medical-records-me'],
    queryFn: () => fetchMedicalRecords({}, user?.accessToken),
    enabled: !!user,
  });

  // Prefer /medical-records/me via query without patientId - API returns for staff or me
  const { data: meData } = useQuery({
    queryKey: ['medical-records-me-endpoint'],
    queryFn: async () => {
      const { api } = await import('@/lib/api');
      return api.get<any[]>('/medical-records/me', { token: user?.accessToken });
    },
    enabled: !!user,
  });

  const items = meData?.data || data?.data || [];

  return (
    <div className="container-narrow section-pad py-10">
      <h1 className="text-h1">{t('nav.medicalRecords')}</h1>
      {isLoading && <div className="mt-8 skeleton h-32" />}
      {!isLoading && !items.length && (
        <p className="mt-12 text-center text-text-muted">{t('common.noResults')}</p>
      )}
      <ul className="mt-8 space-y-4">
        {items.map((r: any) => (
          <li key={r.id} className="card-surface p-5">
            <p className="font-medium">{r.title}</p>
            <p className="mt-2 text-body-sm text-text-secondary whitespace-pre-wrap">{r.content}</p>
            <p className="mt-2 text-caption text-text-muted">{formatDate(r.createdAt, locale)}</p>
          </li>
        ))}
      </ul>
      <Link href="/appointments" className="btn-ghost mt-6 inline-flex">
        {t('common.back')}
      </Link>
    </div>
  );
}
