'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth';
import { fetchStaff } from '@/lib/api';
import { AdminShell, useAdminClinicId } from '@/components/admin/admin-shell';
import { useRouter } from '@/i18n/routing';
import { useEffect } from 'react';

export default function AdminStaffPage() {
  const t = useTranslations();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clinicId = useAdminClinicId();

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-staff', clinicId],
    queryFn: () => fetchStaff(clinicId!, user?.accessToken),
    enabled: !!user && !!clinicId,
  });

  return (
    <AdminShell active="staff">
      <h1 className="text-h1">{t('admin.staff')}</h1>
      {isLoading && <div className="mt-6 skeleton h-32" />}
      <ul className="mt-6 divide-y divide-border rounded border border-border bg-surface">
        {(data?.data || []).map((s: any) => (
          <li key={s.id} className="flex justify-between px-4 py-3 text-body-sm">
            <span>
              {s.user?.firstName} {s.user?.lastName}
              <span className="text-text-muted"> · {s.title || t('admin.staffFallback')}</span>
            </span>
            <span className="text-text-muted">
              {s.user?.roles?.map((r: any) => t(`roles.${r.role?.name}` as any)).join('، ')}
            </span>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
