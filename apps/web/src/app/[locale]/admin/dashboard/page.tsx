'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth';
import { fetchReportOverview, fetchAppointments } from '@/lib/api';
import { useRouter } from '@/i18n/routing';
import { useEffect } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { formatNumber } from '@/lib/utils';

export default function AdminDashboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clinicId = user?.clinicIds?.[0];

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data: reportRes, isLoading } = useQuery({
    queryKey: ['report', clinicId],
    queryFn: () => fetchReportOverview(clinicId!, user?.accessToken),
    enabled: !!clinicId && !!user,
  });

  const { data: apptsRes } = useQuery({
    queryKey: ['admin-appts-today', clinicId],
    queryFn: () =>
      fetchAppointments(
        {
          clinicId: clinicId!,
          from: new Date().toISOString().slice(0, 10),
          to: new Date().toISOString().slice(0, 10),
          limit: '10',
        },
        user?.accessToken,
      ),
    enabled: !!clinicId && !!user,
  });

  const report = reportRes?.data;
  const today = report?.today;

  const stats = [
    { label: t('admin.todayAppointments'), value: today?.appointments ?? '—' },
    { label: t('admin.waitingPatients'), value: today?.waiting ?? '—' },
    { label: t('admin.doctorsOnDuty'), value: today?.doctorsOnDuty ?? '—' },
    {
      label: t('admin.revenueToday'),
      value: today?.revenue != null ? formatNumber(Number(today.revenue), locale) : '—',
    },
    { label: t('admin.noShows'), value: today?.noShows ?? '—' },
  ];

  return (
    <AdminShell active="dashboard">
      <h1 className="text-h1">{t('admin.dashboard')}</h1>

      {!clinicId && (
        <p className="mt-4 text-body-sm text-text-muted">
          {t('admin.superAdminHint')}
        </p>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="card-surface p-4">
            <p className="text-caption text-text-muted">{s.label}</p>
            <p className="mt-2 text-h2 tabular-nums">{isLoading ? '…' : s.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-h2">{t('admin.appointments')}</h2>
        {!apptsRes?.data?.length && !isLoading && (
          <p className="mt-6 text-body-sm text-text-muted">{t('appointments.emptyToday')}</p>
        )}
        <ul className="mt-4 divide-y divide-border rounded border border-border bg-surface">
          {(apptsRes?.data || []).map((a: any) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-4 px-4 py-3 text-body-sm"
            >
              <span>
                {a.startTime} — {a.patient?.user?.firstName} {a.patient?.user?.lastName}
              </span>
              <span className="text-text-muted">
                {t(`appointments.status.${a.status}` as any)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {report?.topDoctors && (
        <section className="mt-10">
          <h2 className="text-h2">{t('admin.topDoctors')}</h2>
          <ul className="mt-4 space-y-2">
            {report.topDoctors.map((d: any) => (
              <li key={d.doctorId} className="flex justify-between text-body-sm">
                <span>{d.name}</span>
                <span className="tabular-nums text-text-muted">{d.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AdminShell>
  );
}
