'use client';

import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth';
import { useRouter, Link } from '@/i18n/routing';
import { useEffect } from 'react';

export default function ProfilePage() {
  const t = useTranslations();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="container-narrow section-pad py-10 max-w-xl">
      <h1 className="text-h1">{t('common.profile')}</h1>
      <div className="mt-8 card-surface p-6 space-y-3">
        <p className="text-h3">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-body-sm text-text-secondary">{user.email}</p>
        <p className="text-caption text-text-muted">
          {user.roles.map((role) => t(`roles.${role}` as any)).join('، ')}
        </p>
      </div>
      <div className="mt-6 flex gap-3">
        <Link href="/appointments" className="btn-secondary">
          {t('nav.appointments')}
        </Link>
        <Link href="/prescriptions" className="btn-secondary">
          {t('nav.prescriptions')}
        </Link>
      </div>
    </div>
  );
}
