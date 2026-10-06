'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { useAuthStore } from '@/stores/auth';
import { fetchServices, createService } from '@/lib/api';
import { AdminShell, useAdminClinicId } from '@/components/admin/admin-shell';
import { useRouter } from '@/i18n/routing';
import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';

export default function AdminServicesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clinicId = useAdminClinicId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nameFa: '',
    nameEn: '',
    slug: '',
    price: '250000',
    durationMinutes: '20',
  });

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-services', clinicId],
    queryFn: () => fetchServices(clinicId!, user?.accessToken),
    enabled: !!user && !!clinicId,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createService(
        {
          ...form,
          clinicId,
          price: Number(form.price),
          durationMinutes: Number(form.durationMinutes),
        },
        user?.accessToken,
      ),
    onSuccess: () => {
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['admin-services'] });
    },
  });

  return (
    <AdminShell active="services">
      <div className="flex justify-between gap-3">
        <h1 className="text-h1">{t('admin.services')}</h1>
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
          {t('admin.create')}
        </button>
      </div>
      {open && (
        <div className="mt-4 card-surface grid gap-3 p-4 sm:grid-cols-2">
          <input className="input" placeholder={t('fields.nameFa')} value={form.nameFa} onChange={(e) => setForm({ ...form, nameFa: e.target.value })} />
          <input className="input" placeholder={t('fields.nameEn')} value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
          <input className="input" placeholder={t('fields.slug')} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <input className="input" placeholder={t('fields.price')} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <input className="input" type="number" placeholder={t('fields.durationMinutes')} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
          <button type="button" className="btn-primary" aria-busy={createMut.isPending} disabled={createMut.isPending} onClick={() => createMut.mutate()}>
            {t('common.save')}
          </button>
        </div>
      )}
      {isLoading && <div className="mt-6 skeleton h-32" />}
      <ul className="mt-6 space-y-2">
        {(data?.data || []).map((s: any) => (
          <li key={s.id} className="card-surface p-4 flex justify-between gap-3">
            <div>
              <p className="font-medium">{locale === 'fa' ? s.nameFa : s.nameEn}</p>
              <p className="text-body-sm text-text-muted">{s.slug}</p>
            </div>
            <p className="tabular-nums">{formatCurrency(Number(s.price), locale)}</p>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
