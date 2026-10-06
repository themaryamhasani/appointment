'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { AdminShell, useAdminClinicId } from '@/components/admin/admin-shell';
import { useRouter } from '@/i18n/routing';
import { fetchRoles } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

export default function AdminRolesPage() {
  const t = useTranslations();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clinicId = useAdminClinicId();

  const localizePermission = (code?: string) => {
    if (!code) return '';
    const key = `permissions.${code.replace('.', '_')}`;
    return t.has(key) ? t(key as any) : t('permissions.unknown');
  };

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-roles', clinicId],
    queryFn: () => fetchRoles(clinicId || undefined, user?.accessToken),
    enabled: !!user,
  });

  return (
    <AdminShell active="roles">
      <h1 className="text-h1">{t('admin.roles')}</h1>
      {isLoading && <div className="mt-6 skeleton h-32" />}
      <div className="mt-6 space-y-3">
        {(data?.data || []).map((role: any) => (
          <div key={role.id} className="card-surface p-4">
            <p className="font-medium">
              {t.has(`roles.${role.name}`) ? t(`roles.${role.name}` as any) : role.displayName}
            </p>
            <p className="mt-2 text-caption text-text-muted">
              {role.permissions
                ?.map((permission: any) => localizePermission(permission.permission?.code))
                .join(t('common.listSeparator'))}
            </p>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
