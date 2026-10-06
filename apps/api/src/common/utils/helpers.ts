import { TenantAccessException } from '../exceptions/app.exception';
import { AuthUser } from '../decorators/current-user.decorator';

export function assertClinicAccess(user: AuthUser, clinicId: string): void {
  if (user.isSuperAdmin) return;
  if (!user.clinicIds.includes(clinicId)) {
    throw new TenantAccessException();
  }
}

export function assertAnyClinicAccess(user: AuthUser, clinicIds: string[]): void {
  if (user.isSuperAdmin) return;
  const allowed = clinicIds.some((id) => user.clinicIds.includes(id));
  if (!allowed) {
    throw new TenantAccessException();
  }
}

export function paginate(page = 1, limit = 20) {
  const take = Math.min(Math.max(limit, 1), 100);
  const skip = (Math.max(page, 1) - 1) * take;
  return { skip, take, page: Math.max(page, 1), limit: take };
}

export function paginationMeta(total: number, page: number, limit: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function generateTimeSlots(
  startTime: string,
  endTime: string,
  slotDuration: number,
  breakDuration = 0,
  bufferMinutes = 0,
): Array<{ startTime: string; endTime: string; available: boolean }> {
  const slots: Array<{ startTime: string; endTime: string; available: boolean }> = [];
  let current = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const step = slotDuration + breakDuration + bufferMinutes;

  while (current + slotDuration <= end) {
    slots.push({
      startTime: minutesToTime(current),
      endTime: minutesToTime(current + slotDuration),
      available: true,
    });
    current += step;
  }
  return slots;
}

const DAY_MAP: Record<number, string> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

export function dateToDayOfWeek(date: Date): string {
  return DAY_MAP[date.getUTCDay()];
}

export function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
