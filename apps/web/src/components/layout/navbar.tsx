'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';

export function Navbar() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/doctors', label: t('nav.doctors') },
    { href: '/clinics', label: t('nav.clinics') },
    { href: '/specialties', label: t('nav.specialties') },
  ];

  const otherLocale = locale === 'fa' ? 'en' : 'fa';

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="container-narrow section-pad flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-display text-h3 text-primary tracking-tight">
            {t('common.appName')}
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'rounded px-3 py-2 text-body-sm transition-colors',
                  pathname.startsWith(l.href)
                    ? 'text-primary font-medium'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Link
            href={pathname}
            locale={otherLocale}
            className="btn-ghost text-caption uppercase tracking-wide"
            aria-label={t('common.switchLanguage')}
            title={t('common.switchLanguage')}
          >
            {otherLocale.toUpperCase()}
          </Link>
          <ThemeToggle />
          {user ? (
            <>
              <Link href="/appointments" className="btn-ghost">
                {t('nav.appointments')}
              </Link>
              {(user.isSuperAdmin || user.roles.some((r) => ['CLINIC_ADMIN', 'SECRETARY', 'DOCTOR', 'FINANCE'].includes(r))) && (
                <Link href="/admin/dashboard" className="btn-ghost">
                  {t('nav.admin')}
                </Link>
              )}
              <button type="button" onClick={logout} className="btn-secondary">
                {t('common.logout')}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                {t('common.login')}
              </Link>
              <Link href="/register" className="btn-primary">
                {t('common.register')}
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="md:hidden btn-ghost p-2"
          onClick={() => setOpen(!open)}
          aria-label={t('common.menu')}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-surface section-pad py-4 space-y-2">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="block py-2 text-body" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <Link
            href={pathname}
            locale={otherLocale}
            className="block py-2 text-body uppercase"
            aria-label={t('common.switchLanguage')}
          >
            {otherLocale.toUpperCase()}
          </Link>
          <ThemeToggle compact />
          {user ? (
            <>
              <Link href="/appointments" className="block py-2" onClick={() => setOpen(false)}>
                {t('nav.appointments')}
              </Link>
              {(user.isSuperAdmin || user.roles.some((r) => ['CLINIC_ADMIN', 'SECRETARY', 'DOCTOR', 'FINANCE'].includes(r))) && (
                <Link href="/admin/dashboard" className="block py-2" onClick={() => setOpen(false)}>
                  {t('nav.admin')}
                </Link>
              )}
              <button type="button" onClick={() => { logout(); setOpen(false); }} className="btn-secondary w-full">
                {t('common.logout')}
              </button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link href="/login" className="btn-secondary flex-1" onClick={() => setOpen(false)}>
                {t('common.login')}
              </Link>
              <Link href="/register" className="btn-primary flex-1" onClick={() => setOpen(false)}>
                {t('common.register')}
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
