'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth';
import { fetchClinic, updateClinic } from '@/lib/api';
import { AdminShell, useAdminClinicId } from '@/components/admin/admin-shell';
import { useRouter } from '@/i18n/routing';
import { useEffect, useState } from 'react';

export default function AdminSettingsPage() {
  const t = useTranslations();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clinicId = useAdminClinicId();
  const [timezone, setTimezone] = useState('Asia/Tehran');
  const [reminderHours, setReminderHours] = useState('24,2');

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data } = useQuery({
    queryKey: ['clinic-settings', clinicId],
    queryFn: () => fetchClinic(clinicId!, user?.accessToken),
    enabled: !!clinicId,
  });

  useEffect(() => {
    if (data?.data) {
      setTimezone(data.data.timezone || 'Asia/Tehran');
      const settings = data.data.settings || {};
      if (settings.reminderHours) setReminderHours(String(settings.reminderHours));
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () =>
      updateClinic(
        clinicId!,
        {
          timezone,
          settings: {
            ...(typeof data?.data?.settings === 'object' ? data.data.settings : {}),
            reminderHours: reminderHours.split(',').map((h) => Number(h.trim())),
          },
        },
        user?.accessToken,
      ),
  });

  return (
    <AdminShell active="settings">
      <h1 className="text-h1">{t('admin.settings')}</h1>
      <div className="mt-6 max-w-md space-y-4 card-surface p-5">
        <div>
          <label className="label">{t('fields.timezone')}</label>
          <input className="input" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
        </div>
        <div>
          <label className="label">{t('fields.reminderHours')}</label>
          <input className="input" value={reminderHours} onChange={(e) => setReminderHours(e.target.value)} />
        </div>
        <button type="button" className="btn-primary" aria-busy={saveMut.isPending} onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {t('common.save')}
        </button>
        {saveMut.isSuccess && <p className="text-body-sm text-success">{t('common.saved')}</p>}
      </div>
    </AdminShell>
  );
}
