import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, locale: string, currency = 'IRR') {
  if (currency === 'IRR') {
    return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US').format(amount) + (locale === 'fa' ? ' تومان' : ' IRR');
  }
  return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

function localeCode(locale: string) {
  return locale === 'fa' ? 'fa-IR' : 'en-US';
}

export function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(localeCode(locale)).format(value);
}

function parseDate(value: Date | string) {
  if (value instanceof Date) return value;
  // Noon keeps date-only API values on the intended day in every common timezone.
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
}

export function formatDate(value: Date | string, locale: string) {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(localeCode(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatDateTime(value: Date | string, locale: string) {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(localeCode(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function doctorDisplayName(
  doctor: { titleFa?: string | null; titleEn?: string | null; user: { firstName: string; lastName: string } },
  locale: string,
) {
  const title = locale === 'fa' ? doctor.titleFa || 'دکتر' : doctor.titleEn || 'Dr.';
  return `${title} ${doctor.user.firstName} ${doctor.user.lastName}`;
}
