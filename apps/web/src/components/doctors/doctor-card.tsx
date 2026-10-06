'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { doctorDisplayName, formatCurrency } from '@/lib/utils';
import { Star } from 'lucide-react';

type DoctorCardProps = {
  doctor: {
    id: string;
    slug: string;
    titleFa?: string | null;
    titleEn?: string | null;
    experienceYears: number;
    rating: number | string;
    consultationFee?: number | string;
    user: { firstName: string; lastName: string; avatarUrl?: string | null };
    specialties?: Array<{ specialty: { nameFa: string; nameEn: string }; isPrimary?: boolean }>;
    branches?: Array<{ branch: { nameFa: string; nameEn: string; clinic: { nameFa: string; nameEn: string } } }>;
  };
};

export function DoctorCard({ doctor }: DoctorCardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const specialty = doctor.specialties?.find((s) => s.isPrimary)?.specialty || doctor.specialties?.[0]?.specialty;
  const clinic = doctor.branches?.[0]?.branch?.clinic;
  const name = doctorDisplayName(doctor, locale);
  const specialtyName = specialty ? (locale === 'fa' ? specialty.nameFa : specialty.nameEn) : '';
  const clinicName = clinic ? (locale === 'fa' ? clinic.nameFa : clinic.nameEn) : '';
  const initials = `${doctor.user.firstName[0]}${doctor.user.lastName[0]}`;

  return (
    <article className="card-surface flex flex-col p-5 transition-shadow hover:shadow-soft">
      <div className="flex gap-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-surface-muted text-h3 text-primary"
          aria-hidden
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-h3 text-text-primary">{name}</h3>
          <p className="mt-0.5 text-body-sm text-text-secondary">{specialtyName}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-caption text-text-muted">
            <span>{doctor.experienceYears} {t('doctor.experience')}</span>
            <span className="inline-flex items-center gap-1">
              <Star size={12} className="fill-warning text-warning" />
              {Number(doctor.rating).toFixed(1)}
            </span>
          </div>
          {clinicName && (
            <p className="mt-1 truncate text-caption text-text-muted">{clinicName}</p>
          )}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
        <span className="text-body-sm font-medium text-text-secondary">
          {doctor.consultationFee != null && formatCurrency(Number(doctor.consultationFee), locale)}
        </span>
        <Link href={`/doctors/${doctor.slug}`} className="btn-primary text-body-sm">
          {t('common.bookAppointment')}
        </Link>
      </div>
    </article>
  );
}

export function DoctorCardSkeleton() {
  return (
    <div className="card-surface p-5 space-y-4">
      <div className="flex gap-4">
        <div className="skeleton h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-5 w-2/3" />
          <div className="skeleton h-4 w-1/3" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      </div>
      <div className="skeleton h-10 w-full" />
    </div>
  );
}
