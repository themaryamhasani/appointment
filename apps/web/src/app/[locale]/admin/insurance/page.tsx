'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { useAuthStore } from '@/stores/auth';
import { fetchInsuranceProviders, createInsuranceProvider } from '@/lib/api';
import { AdminShell, useAdminClinicId } from '@/components/admin/admin-shell';
import { useRouter } from '@/i18n/routing';
import { useEffect, useState } from 'react';

export default function AdminInsurancePage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clinicId = useAdminClinicId();
  const qc = useQueryClient();
  const [form, setForm] = useState({ nameFa: '', nameEn: '' });

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-insurance', clinicId],
    queryFn: () => fetchInsuranceProviders(clinicId!),
    enabled: !!user && !!clinicId,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createInsuranceProvider({ ...form, clinicId }, user?.accessToken),
    onSuccess: () => {
      setForm({ nameFa: '', nameEn: '' });
      qc.invalidateQueries({ queryKey: ['admin-insurance'] });
    },
  });

  return (
    <AdminShell active="insurance">
      <h1 className="text-h1">{t('admin.insurance')}</h1>
      <div className="mt-4 card-surface grid gap-3 p-4 sm:grid-cols-3">
        <input className="input" placeholder={t('fields.nameFa')} value={form.nameFa} onChange={(e) => setForm({ ...form, nameFa: e.target.value })} />
        <input className="input" placeholder={t('fields.nameEn')} value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
        <button type="button" className="btn-primary" aria-busy={createMut.isPending} disabled={createMut.isPending} onClick={() => createMut.mutate()}>
          {t('admin.create')}
        </button>
      </div>
      {isLoading && <div className="mt-6 skeleton h-32" />}
      <ul className="mt-6 space-y-2">
        {(data?.data || []).map((p: any) => (
          <li key={p.id} className="card-surface p-4">
            {locale === 'fa' ? p.nameFa : p.nameEn}
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
