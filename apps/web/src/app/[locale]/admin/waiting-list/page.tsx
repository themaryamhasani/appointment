'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth';
import { fetchWaitingList, promoteWaitingList, cancelWaitingList } from '@/lib/api';
import { AdminShell, useAdminClinicId } from '@/components/admin/admin-shell';
import { useRouter } from '@/i18n/routing';
import { useEffect } from 'react';
import { doctorDisplayName, formatDate } from '@/lib/utils';

export default function AdminWaitingListPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clinicId = useAdminClinicId();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-waiting', clinicId],
    queryFn: () =>
      fetchWaitingList({ clinicId: clinicId!, status: 'WAITING' }, user?.accessToken),
    enabled: !!user && !!clinicId,
  });

  const promoteMut = useMutation({
    mutationFn: (id: string) => promoteWaitingList(id, user?.accessToken),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-waiting'] }),
  });
  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelWaitingList(id, user?.accessToken),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-waiting'] }),
  });

  return (
    <AdminShell active="waitingList">
      <h1 className="text-h1">{t('admin.waitingList')}</h1>
      {isLoading && <div className="mt-6 skeleton h-40" />}
      <ul className="mt-6 space-y-2">
        {(data?.data || []).map((e: any) => (
          <li key={e.id} className="card-surface flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">
                {e.patient?.user?.firstName} {e.patient?.user?.lastName}
              </p>
              <p className="text-body-sm text-text-muted">
                {e.doctor ? doctorDisplayName(e.doctor, locale) : '—'}
                {e.preferredDate ? ` · ${formatDate(e.preferredDate, locale)}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-primary" aria-busy={promoteMut.isPending && promoteMut.variables === e.id} disabled={promoteMut.isPending || cancelMut.isPending} onClick={() => promoteMut.mutate(e.id)}>
                {t('waiting.promote')}
              </button>
              <button type="button" className="btn-secondary" aria-busy={cancelMut.isPending && cancelMut.variables === e.id} disabled={promoteMut.isPending || cancelMut.isPending} onClick={() => cancelMut.mutate(e.id)}>
                {t('common.cancel')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
