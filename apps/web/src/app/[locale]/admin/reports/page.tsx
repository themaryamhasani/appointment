'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth';
import { fetchReportOverview } from '@/lib/api';
import { AdminShell, useAdminClinicId } from '@/components/admin/admin-shell';
import { useRouter } from '@/i18n/routing';
import { useEffect } from 'react';

export default function AdminReportsPage() {
  const t = useTranslations();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clinicId = useAdminClinicId();

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', clinicId],
    queryFn: () => fetchReportOverview(clinicId!, user?.accessToken),
    enabled: !!user && !!clinicId,
  });

  const report = data?.data;

  return (
    <AdminShell active="reports">
      <h1 className="text-h1">{t('admin.reports')}</h1>
      {isLoading && <div className="mt-6 skeleton h-40" />}
      {report && (
        <div className="mt-6 space-y-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [t('admin.appointmentsThisWeek'), report.period?.appointmentsThisWeek],
              [t('admin.appointmentsThisMonth'), report.period?.appointmentsThisMonth],
              [t('admin.completedVisits'), report.period?.completedVisits],
              [t('admin.noShowRate'), report.period?.noShowRate],
              [t('admin.revenue'), report.period?.revenue],
              [t('admin.outstandingPayments'), report.period?.outstandingPayments],
              [t('admin.totalPatients'), report.patients?.total],
              [t('admin.newPatients'), report.patients?.newPatients],
            ].map(([label, value]) => (
              <div key={String(label)} className="card-surface p-4">
                <p className="text-caption text-text-muted">{label}</p>
                <p className="mt-2 text-h3 tabular-nums">{value ?? '—'}</p>
              </div>
            ))}
          </div>
          <section>
            <h2 className="text-h2">{t('admin.topDoctors')}</h2>
            <ul className="mt-3 space-y-2">
              {(report.topDoctors || []).map((d: any) => (
                <li key={d.doctorId} className="flex justify-between text-body-sm">
                  <span>{d.name}</span>
                  <span className="tabular-nums text-text-muted">{d.count}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
