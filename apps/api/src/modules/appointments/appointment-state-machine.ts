import { Injectable } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { canTransition } from '@healthcare/types';
import { InvalidTransitionException } from '../../common/exceptions/app.exception';

@Injectable()
export class AppointmentStateMachine {
  assertTransition(from: AppointmentStatus, to: AppointmentStatus): void {
    if (!canTransition(from as any, to as any)) {
      throw new InvalidTransitionException(from, to);
    }
  }

  canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
    return canTransition(from as any, to as any);
  }
}
