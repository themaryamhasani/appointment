'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { useAuthStore } from '@/stores/auth';
import { fetchDoctors } from '@/lib/api';
import { AdminShell, useAdminClinicId } from '@/components/admin/admin-shell';
import { useRouter, Link } from '@/i18n/routing';
import { useEffect } from 'react';
import { doctorDisplayName, formatCurrency } from '@/lib/utils';

export default function AdminDoctorsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clinicId = useAdminClinicId();

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-doctors-list', clinicId],
    queryFn: () =>
      fetchDoctors({ clinicId: clinicId!, limit: '100' }, user?.accessToken),
    enabled: !!user && !!clinicId,
  });

  return (
    <AdminShell active="doctors">
      <h1 className="text-h1">{t('admin.doctors')}</h1>
      {isLoading && <div className="mt-6 skeleton h-40" />}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {(data?.data || []).map((d: any) => (
          <div key={d.id} className="card-surface p-4 flex justify-between gap-3">
            <div>
              <p className="font-medium">{doctorDisplayName(d, locale)}</p>
              <p className="text-body-sm text-text-muted">
                {d.specialties
                  ?.map((s: any) => (locale === 'fa' ? s.specialty.nameFa : s.specialty.nameEn))
                  .join(' · ')}
              </p>
              <p className="mt-1 text-caption text-text-secondary">
                {formatCurrency(Number(d.consultationFee), locale)} · ★ {Number(d.rating).toFixed(1)}
              </p>
            </div>
            <Link href={`/doctors/${d.slug}`} className="btn-secondary self-start text-caption">
              {t('common.view')}
            </Link>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
