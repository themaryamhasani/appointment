import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import {
  timeToMinutes,
  dateToDayOfWeek,
  parseDateOnly,
  formatDateOnly,
  generateTimeSlots,
} from '../../common/utils/helpers';
import { AppointmentStatus, DayOfWeek } from '@prisma/client';
import { TimeSlot, AvailabilityDay } from '@healthcare/types';

const ACTIVE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.IN_PROGRESS,
];

export function deduplicateTimeSlots(slots: TimeSlot[]): TimeSlot[] {
  const byStartTime = new Map<string, TimeSlot>();
  for (const slot of slots) {
    if (!byStartTime.has(slot.startTime)) {
      byStartTime.set(slot.startTime, slot);
    }
  }
  return Array.from(byStartTime.values());
}

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getAvailability(params: {
    doctorId: string;
    branchId: string;
    from: string;
    to: string;
  }): Promise<AvailabilityDay[]> {
    const cacheKey = `availability:${params.doctorId}:${params.branchId}:${params.from}:${params.to}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const fromDate = parseDateOnly(params.from);
    const toDate = parseDateOnly(params.to);
    const branch = await this.prisma.branch.findUnique({
      where: { id: params.branchId },
      include: { clinic: true },
    });
    if (!branch) return [];

    const schedules = await this.prisma.doctorSchedule.findMany({
      where: {
        doctorId: params.doctorId,
        branchId: params.branchId,
        isActive: true,
      },
    });

    const exceptions = await this.prisma.scheduleException.findMany({
      where: {
        OR: [
          { doctorId: params.doctorId },
          { branchId: params.branchId },
        ],
        date: { gte: fromDate, lte: toDate },
      },
    });

    const holidays = await this.prisma.clinicHoliday.findMany({
      where: {
        clinicId: branch.clinicId,
        date: { gte: fromDate, lte: toDate },
      },
    });

    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctorId: params.doctorId,
        branchId: params.branchId,
        appointmentDate: { gte: fromDate, lte: toDate },
        status: { in: ACTIVE_STATUSES },
      },
      select: { appointmentDate: true, startTime: true, endTime: true },
    });

    const days: AvailabilityDay[] = [];
    const cursor = new Date(fromDate);

    while (cursor <= toDate) {
      const dateStr = formatDateOnly(cursor);
      const dayOfWeek = dateToDayOfWeek(cursor) as DayOfWeek;

      const isHoliday = holidays.some(
        (h) => formatDateOnly(h.date) === dateStr,
      );
      const allDayBlock = exceptions.some(
        (e) =>
          formatDateOnly(e.date) === dateStr &&
          e.isAllDay &&
          (e.type === 'LEAVE' || e.type === 'HOLIDAY' || e.type === 'BLOCKED'),
      );

      if (isHoliday || allDayBlock) {
        days.push({ date: dateStr, slots: [] });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
        continue;
      }

      const daySchedules = schedules.filter((s) => s.dayOfWeek === dayOfWeek);
      const dayAppointments = appointments.filter(
        (a) => formatDateOnly(a.appointmentDate) === dateStr,
      );
      const dayExceptions = exceptions.filter(
        (e) => formatDateOnly(e.date) === dateStr && !e.isAllDay,
      );

      const slots: TimeSlot[] = [];

      for (const schedule of daySchedules) {
        const generated = this.generateSlots(
          schedule.startTime,
          schedule.endTime,
          schedule.slotDurationMinutes,
          schedule.breakDurationMinutes,
          schedule.bufferMinutes,
        );

        for (const slot of generated) {
          const booked = dayAppointments.some((a) => a.startTime === slot.startTime);
          const blocked = dayExceptions.some((e) => {
            if (e.type === 'OVERRIDE') return false;
            if (!e.startTime || !e.endTime) return false;
            return (
              timeToMinutes(slot.startTime) >= timeToMinutes(e.startTime) &&
              timeToMinutes(slot.startTime) < timeToMinutes(e.endTime)
            );
          });

          const emergency = dayExceptions.filter(
            (e) => e.type === 'EMERGENCY' && e.startTime && e.endTime,
          );
          const isEmergencySlot = emergency.some(
            (e) =>
              timeToMinutes(slot.startTime) >= timeToMinutes(e.startTime!) &&
              timeToMinutes(slot.startTime) < timeToMinutes(e.endTime!),
          );

          const reserved = await this.isReserved(
            params.doctorId,
            params.branchId,
            dateStr,
            slot.startTime,
          );

          slots.push({
            ...slot,
            available: (!booked && !blocked) || isEmergencySlot,
            reserved: reserved && !booked,
          });
        }

        // Override windows add extra slots
        for (const ex of dayExceptions.filter((e) => e.type === 'OVERRIDE' && e.startTime && e.endTime)) {
          const overrideSlots = this.generateSlots(
            ex.startTime!,
            ex.endTime!,
            schedule.slotDurationMinutes,
            0,
            0,
          );
          for (const slot of overrideSlots) {
            if (!slots.some((s) => s.startTime === slot.startTime)) {
              const booked = dayAppointments.some((a) => a.startTime === slot.startTime);
              slots.push({ ...slot, available: !booked });
            }
          }
        }
      }

      const uniqueSlots = deduplicateTimeSlots(slots);
      uniqueSlots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
      days.push({ date: dateStr, slots: uniqueSlots });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    await this.redis.set(cacheKey, JSON.stringify(days), 60);
    return days;
  }

  generateSlots(
    startTime: string,
    endTime: string,
    slotDuration: number,
    breakDuration: number,
    bufferMinutes: number,
  ): TimeSlot[] {
    return generateTimeSlots(startTime, endTime, slotDuration, breakDuration, bufferMinutes);
  }

  bookingLockKey(doctorId: string, branchId: string, date: string, time: string) {
    return `booking_lock:${doctorId}:${branchId}:${date}:${time}`;
  }

  async reserveSlot(
    doctorId: string,
    branchId: string,
    date: string,
    time: string,
    userId: string,
    ttlSeconds = 300,
  ): Promise<boolean> {
    const key = this.bookingLockKey(doctorId, branchId, date, time);
    return this.redis.setNx(key, userId, ttlSeconds);
  }

  async releaseSlot(
    doctorId: string,
    branchId: string,
    date: string,
    time: string,
    userId?: string,
  ): Promise<void> {
    const key = this.bookingLockKey(doctorId, branchId, date, time);
    if (userId) {
      const owner = await this.redis.get(key);
      if (owner && owner !== userId) return;
    }
    await this.redis.del(key);
  }

  async isReserved(
    doctorId: string,
    branchId: string,
    date: string,
    time: string,
  ): Promise<boolean> {
    const key = this.bookingLockKey(doctorId, branchId, date, time);
    const val = await this.redis.get(key);
    return !!val;
  }

  async getReservationOwner(
    doctorId: string,
    branchId: string,
    date: string,
    time: string,
  ): Promise<string | null> {
    return this.redis.get(this.bookingLockKey(doctorId, branchId, date, time));
  }

  async invalidateCache(doctorId: string, branchId: string) {
    const pattern = `availability:${doctorId}:${branchId}:`;
    await this.redis.deleteByPrefix(pattern);
  }
}
