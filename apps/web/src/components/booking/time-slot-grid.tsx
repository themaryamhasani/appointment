'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type Props = {
  slots: Array<{ startTime: string; endTime: string; available: boolean; reserved?: boolean }>;
  selected?: string | null;
  onSelect: (time: string) => void;
};

export function TimeSlotGrid({ slots, selected, onSelect }: Props) {
  const t = useTranslations();
  // A doctor can have overlapping schedule records. The booking contract uses
  // startTime as the slot identity, so render each start time only once.
  const uniqueSlots = Array.from(
    new Map(slots.map((slot) => [slot.startTime, slot])).values(),
  );

  if (!uniqueSlots.length) {
    return (
      <p className="py-8 text-center text-body-sm text-text-muted">{t('doctor.noSlots')}</p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
      {uniqueSlots.map((slot) => {
        const disabled = !slot.available || !!slot.reserved;
        const isSelected = selected === slot.startTime;
        return (
          <button
            key={slot.startTime}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(slot.startTime)}
            className={cn(
              'rounded border px-2 py-2.5 text-body-sm transition-colors',
              disabled && 'cursor-not-allowed border-border bg-surface-muted text-text-muted opacity-60',
              !disabled && !isSelected && 'border-border bg-surface text-text-primary hover:border-primary hover:text-primary',
              isSelected && 'border-primary bg-primary text-primary-foreground',
            )}
            aria-pressed={isSelected}
          >
            {slot.startTime}
          </button>
        );
      })}
    </div>
  );
}
