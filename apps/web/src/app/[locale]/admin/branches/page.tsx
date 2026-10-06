'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { useAuthStore } from '@/stores/auth';
import { fetchBranches, createBranch } from '@/lib/api';
import { AdminShell, useAdminClinicId } from '@/components/admin/admin-shell';
import { useRouter } from '@/i18n/routing';
import { useEffect, useState } from 'react';

export default function AdminBranchesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clinicId = useAdminClinicId();
  const qc = useQueryClient();
  const [form, setForm] = useState({ nameFa: '', nameEn: '', slug: '', city: '' });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-branches-list', clinicId],
    queryFn: () => fetchBranches(clinicId!, user?.accessToken),
    enabled: !!user && !!clinicId,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createBranch({ ...form, clinicId }, user?.accessToken),
    onSuccess: () => {
      setOpen(false);
      setForm({ nameFa: '', nameEn: '', slug: '', city: '' });
      qc.invalidateQueries({ queryKey: ['admin-branches-list'] });
    },
  });

  return (
    <AdminShell active="branches">
      <div className="flex justify-between gap-3">
        <h1 className="text-h1">{t('admin.branches')}</h1>
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
          {t('admin.create')}
        </button>
      </div>
      {open && (
        <div className="mt-4 card-surface p-4 grid gap-3 sm:grid-cols-2">
          <input className="input" placeholder={t('fields.nameFa')} value={form.nameFa} onChange={(e) => setForm({ ...form, nameFa: e.target.value })} />
          <input className="input" placeholder={t('fields.nameEn')} value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
          <input className="input" placeholder={t('fields.slug')} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <input className="input" placeholder={t('fields.city')} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <button type="button" className="btn-primary" aria-busy={createMut.isPending} disabled={createMut.isPending} onClick={() => createMut.mutate()}>{t('common.save')}</button>
        </div>
      )}
      {isLoading && <div className="mt-6 skeleton h-32" />}
      <ul className="mt-6 space-y-2">
        {(data?.data || []).map((b: any) => (
          <li key={b.id} className="card-surface p-4">
            <p className="font-medium">{locale === 'fa' ? b.nameFa : b.nameEn}</p>
            <p className="text-body-sm text-text-muted">{b.city} · {b.slug}</p>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
