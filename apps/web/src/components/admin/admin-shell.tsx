'use client';

import { useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { useClinicStore } from '@/stores/clinic';
import { useQuery } from '@tanstack/react-query';
import { fetchClinics } from '@/lib/api';

const NAV = [
  { href: '/admin/dashboard', key: 'dashboard' },
  { href: '/admin/calendar', key: 'calendar' },
  { href: '/admin/appointments', key: 'appointments' },
  { href: '/admin/doctors', key: 'doctors' },
  { href: '/admin/patients', key: 'patients' },
  { href: '/admin/branches', key: 'branches' },
  { href: '/admin/schedules', key: 'schedules' },
  { href: '/admin/services', key: 'services' },
  { href: '/admin/payments', key: 'payments' },
  { href: '/admin/refunds', key: 'refunds' },
  { href: '/admin/reports', key: 'reports' },
  { href: '/admin/staff', key: 'staff' },
  { href: '/admin/roles', key: 'roles' },
  { href: '/admin/waiting-list', key: 'waitingList' },
  { href: '/admin/lab-requests', key: 'labRequests' },
  { href: '/admin/insurance', key: 'insurance' },
  { href: '/admin/settings', key: 'settings' },
  { href: '/admin/audit-logs', key: 'auditLogs' },
] as const;

export function AdminShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active: string;
}) {
  const t = useTranslations('admin');
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const clinicId = useClinicStore((s) => s.clinicId);
  const setClinicId = useClinicStore((s) => s.setClinicId);

  const { data: clinicsRes } = useQuery({
    queryKey: ['clinics-admin'],
    queryFn: () => fetchClinics({ limit: '50' }),
  });

  const clinics = (clinicsRes?.data || []).filter((c: any) =>
    user?.isSuperAdmin ? true : user?.clinicIds?.includes(c.id),
  );

  useEffect(() => {
    if (!clinicId && clinics.length) setClinicId(clinics[0].id);
    if (clinicId && clinics.length && !clinics.some((c: any) => c.id === clinicId)) {
      setClinicId(clinics[0]?.id || null);
    }
  }, [clinics, clinicId, setClinicId]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="container-narrow section-pad flex flex-col gap-8 py-8 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-56 space-y-4">
          <div>
            <label className="label">{t('clinicContext')}</label>
            <select
              className="input text-body-sm"
              value={clinicId || ''}
              onChange={(e) => setClinicId(e.target.value || null)}
            >
              {clinics.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {locale === 'fa' ? c.nameFa || c.nameEn : c.nameEn || c.nameFa}
                </option>
              ))}
            </select>
          </div>
          <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'whitespace-nowrap rounded px-3 py-2 text-body-sm transition-colors',
                  active === item.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-text-secondary hover:bg-surface-muted',
                )}
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

export function useAdminClinicId() {
  return useClinicStore((s) => s.clinicId);
}
