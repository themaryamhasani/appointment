import { canTransition, AppointmentStatus, APPOINTMENT_TRANSITIONS } from '@healthcare/types';
import { timeToMinutes, minutesToTime, generateTimeSlots } from '../../common/utils/helpers';

describe('Appointment State Machine', () => {
  it('allows PENDING → CONFIRMED', () => {
    expect(canTransition(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED)).toBe(true);
  });

  it('allows CONFIRMED → CHECKED_IN', () => {
    expect(canTransition(AppointmentStatus.CONFIRMED, AppointmentStatus.CHECKED_IN)).toBe(true);
  });

  it('allows CHECKED_IN → IN_PROGRESS → COMPLETED', () => {
    expect(canTransition(AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_PROGRESS)).toBe(true);
    expect(canTransition(AppointmentStatus.IN_PROGRESS, AppointmentStatus.COMPLETED)).toBe(true);
  });

  it('rejects COMPLETED → CONFIRMED', () => {
    expect(canTransition(AppointmentStatus.COMPLETED, AppointmentStatus.CONFIRMED)).toBe(false);
  });

  it('rejects CANCELLED → any', () => {
    for (const to of Object.values(AppointmentStatus)) {
      expect(canTransition(AppointmentStatus.CANCELLED, to)).toBe(false);
    }
  });

  it('allows CONFIRMED → CANCELLED and NO_SHOW', () => {
    expect(canTransition(AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED)).toBe(true);
    expect(canTransition(AppointmentStatus.CONFIRMED, AppointmentStatus.NO_SHOW)).toBe(true);
  });

  it('defines transitions for every status', () => {
    for (const status of Object.values(AppointmentStatus)) {
      expect(APPOINTMENT_TRANSITIONS[status]).toBeDefined();
    }
  });
});

describe('Slot generation helpers', () => {
  it('converts time to minutes', () => {
    expect(timeToMinutes('09:00')).toBe(540);
    expect(timeToMinutes('09:20')).toBe(560);
    expect(timeToMinutes('13:00')).toBe(780);
  });

  it('converts minutes to time', () => {
    expect(minutesToTime(540)).toBe('09:00');
    expect(minutesToTime(560)).toBe('09:20');
  });

  it('generates 20-minute slots correctly', () => {
    const slots = generateTimeSlots('09:00', '13:00', 20);
    expect(slots[0].startTime).toBe('09:00');
    expect(slots[1].startTime).toBe('09:20');
    expect(slots[2].startTime).toBe('09:40');
    expect(slots.map((s) => s.startTime)).toContain('12:40');
    expect(slots.map((s) => s.startTime)).not.toContain('13:00');
  });
});
