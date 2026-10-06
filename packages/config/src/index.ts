export const APP_CONFIG = {
  name: 'Healthcare Platform',
  locales: ['fa', 'en'] as const,
  defaultLocale: 'fa' as const,
  slotReservationTtlSeconds: 300,
  defaultSlotDurationMinutes: 20,
  reminderHoursBefore: [24, 2] as const,
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
} as const;

export type Locale = (typeof APP_CONFIG.locales)[number];
