'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth';
import { fetchPatients } from '@/lib/api';
import { AdminShell, useAdminClinicId } from '@/components/admin/admin-shell';
import { useRouter } from '@/i18n/routing';
import { useEffect, useState } from 'react';

export default function AdminPatientsPage() {
  const t = useTranslations();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clinicId = useAdminClinicId();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-patients-list', clinicId, search],
    queryFn: () =>
      fetchPatients(
        { clinicId: clinicId!, limit: '100', ...(search ? { search } : {}) },
        user?.accessToken,
      ),
    enabled: !!user && !!clinicId,
  });

  return (
    <AdminShell active="patients">
      <h1 className="text-h1">{t('admin.patients')}</h1>
      <input
        className="input mt-4 max-w-md"
        placeholder={t('common.search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {isLoading && <div className="mt-6 skeleton h-40" />}
      <ul className="mt-6 divide-y divide-border rounded border border-border bg-surface">
        {(data?.data || []).map((p: any) => (
          <li key={p.id} className="flex justify-between px-4 py-3 text-body-sm">
            <span>
              {p.user?.firstName} {p.user?.lastName}
            </span>
            <span className="text-text-muted">{p.user?.phone || p.user?.email}</span>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
