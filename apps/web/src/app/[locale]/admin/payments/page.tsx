'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth';
import { fetchPayments, refundPayment, createInvoice } from '@/lib/api';
import { AdminShell, useAdminClinicId } from '@/components/admin/admin-shell';
import { useRouter } from '@/i18n/routing';
import { useEffect } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AdminPaymentsPage() {
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
    queryKey: ['admin-payments', clinicId],
    queryFn: () =>
      fetchPayments({ clinicId: clinicId!, limit: '100' }, user?.accessToken),
    enabled: !!user && !!clinicId,
  });

  const refundMut = useMutation({
    mutationFn: (id: string) => refundPayment(id, { reason: t('payment.defaultRefundReason') }, user?.accessToken),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-payments'] }),
  });

  const invoiceMut = useMutation({
    mutationFn: (appointmentId: string) => createInvoice(appointmentId, user?.accessToken),
  });

  return (
    <AdminShell active="payments">
      <h1 className="text-h1">{t('admin.payments')}</h1>
      {isLoading && <div className="mt-6 skeleton h-40" />}
      <div className="mt-6 overflow-x-auto rounded border border-border bg-surface">
        <table className="w-full text-body-sm">
          <thead className="border-b border-border text-text-muted">
            <tr>
              <th className="px-3 py-2 text-start">{t('fields.amount')}</th>
              <th className="px-3 py-2 text-start">{t('fields.status')}</th>
              <th className="px-3 py-2 text-start">{t('fields.provider')}</th>
              <th className="px-3 py-2 text-start">{t('fields.date')}</th>
              <th className="px-3 py-2 text-start">{t('fields.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {(data?.data || []).map((p: any) => (
              <tr key={p.id} className="border-b border-border">
                <td className="px-3 py-2 tabular-nums">{formatCurrency(Number(p.amount), locale)}</td>
                <td className="px-3 py-2">{t(`payment.status.${p.status}` as any)}</td>
                <td className="px-3 py-2">
                  {t.has(`payment.providers.${String(p.provider).toLowerCase()}`)
                    ? t(`payment.providers.${String(p.provider).toLowerCase()}` as any)
                    : t('payment.providers.other')}
                </td>
                <td className="px-3 py-2">{formatDate(p.createdAt, locale)}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    {(p.status === 'PAID' || p.status === 'PARTIALLY_REFUNDED') && (
                      <button type="button" className="btn-secondary" aria-busy={refundMut.isPending && refundMut.variables === p.id} disabled={refundMut.isPending} onClick={() => refundMut.mutate(p.id)}>
                        {t('payment.refund')}
                      </button>
                    )}
                    {p.appointmentId && (
                      <button type="button" className="btn-primary" aria-busy={invoiceMut.isPending && invoiceMut.variables === p.appointmentId} disabled={invoiceMut.isPending} onClick={() => invoiceMut.mutate(p.appointmentId)}>
                        {t('payment.invoice')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
