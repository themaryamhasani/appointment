import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details: Record<string, unknown> = {},
  ) {
    super({ code, message, details }, status);
  }
}

export class SlotUnavailableException extends AppException {
  constructor(details: Record<string, unknown> = {}) {
    super(
      'APPOINTMENT_SLOT_UNAVAILABLE',
      'The selected appointment slot is no longer available.',
      HttpStatus.CONFLICT,
      details,
    );
  }
}

export class InvalidTransitionException extends AppException {
  constructor(from: string, to: string) {
    super(
      'INVALID_APPOINTMENT_TRANSITION',
      `Cannot transition appointment from ${from} to ${to}.`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { from, to },
    );
  }
}

export class TenantAccessException extends AppException {
  constructor() {
    super(
      'TENANT_ACCESS_DENIED',
      'You do not have access to this clinic resource.',
      HttpStatus.FORBIDDEN,
    );
  }
}

export class ReservationExpiredException extends AppException {
  constructor() {
    super(
      'RESERVATION_EXPIRED',
      'Your temporary slot reservation has expired. Please select a slot again.',
      HttpStatus.CONFLICT,
    );
  }
}
