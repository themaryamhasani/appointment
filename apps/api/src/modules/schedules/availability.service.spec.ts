import { generateTimeSlots } from '../../common/utils/helpers';
import { deduplicateTimeSlots } from './availability.service';

describe('generateTimeSlots', () => {
  it('generates slots with duration and break', () => {
    const slots = generateTimeSlots('09:00', '11:00', 20, 10, 0);
    expect(slots.map((s) => s.startTime)).toEqual(['09:00', '09:30', '10:00', '10:30']);
  });

  it('respects end time boundary', () => {
    const slots = generateTimeSlots('09:00', '09:40', 20, 0, 0);
    expect(slots).toHaveLength(2);
    expect(slots[1].endTime).toBe('09:40');
  });

  it('applies buffer minutes', () => {
    const slots = generateTimeSlots('09:00', '10:00', 20, 0, 5);
    expect(slots.map((s) => s.startTime)).toEqual(['09:00', '09:25']);
  });

  it('removes duplicate start times from overlapping schedules', () => {
    const slots = deduplicateTimeSlots([
      { startTime: '09:00', endTime: '09:20', available: true },
      { startTime: '09:00', endTime: '09:20', available: true },
      { startTime: '09:20', endTime: '09:40', available: true },
    ]);

    expect(slots.map((slot) => slot.startTime)).toEqual(['09:00', '09:20']);
  });
});
