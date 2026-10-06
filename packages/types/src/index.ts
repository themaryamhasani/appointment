export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum NotificationChannel {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

export enum DayOfWeek {
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
}

export enum DefaultRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CLINIC_ADMIN = 'CLINIC_ADMIN',
  BRANCH_ADMIN = 'BRANCH_ADMIN',
  DOCTOR = 'DOCTOR',
  SECRETARY = 'SECRETARY',
  FINANCE = 'FINANCE',
  PATIENT = 'PATIENT',
}

export const PERMISSIONS = {
  CLINIC_READ: 'clinic.read',
  CLINIC_MANAGE: 'clinic.manage',
  BRANCH_READ: 'branch.read',
  BRANCH_MANAGE: 'branch.manage',
  DOCTOR_READ: 'doctor.read',
  DOCTOR_MANAGE: 'doctor.manage',
  PATIENT_READ: 'patient.read',
  PATIENT_MANAGE: 'patient.manage',
  SCHEDULE_READ: 'schedule.read',
  SCHEDULE_MANAGE: 'schedule.manage',
  APPOINTMENT_READ: 'appointment.read',
  APPOINTMENT_CREATE: 'appointment.create',
  APPOINTMENT_UPDATE: 'appointment.update',
  APPOINTMENT_CANCEL: 'appointment.cancel',
  VISIT_READ: 'visit.read',
  VISIT_CREATE: 'visit.create',
  VISIT_COMPLETE: 'visit.complete',
  PAYMENT_READ: 'payment.read',
  PAYMENT_MANAGE: 'payment.manage',
  REPORT_READ: 'report.read',
  STAFF_MANAGE: 'staff.manage',
  AUDIT_READ: 'audit.read',
  SPECIALTY_READ: 'specialty.read',
  SPECIALTY_MANAGE: 'specialty.manage',
  ROLE_MANAGE: 'role.manage',
  SETTINGS_MANAGE: 'settings.manage',
  SERVICE_READ: 'service.read',
  SERVICE_MANAGE: 'service.manage',
  LAB_READ: 'lab.read',
  LAB_MANAGE: 'lab.manage',
  WAITING_LIST_READ: 'waiting_list.read',
  WAITING_LIST_MANAGE: 'waiting_list.manage',
  REVIEW_READ: 'review.read',
  REVIEW_CREATE: 'review.create',
  INSURANCE_READ: 'insurance.read',
  INSURANCE_MANAGE: 'insurance.manage',
  FILE_READ: 'file.read',
  FILE_MANAGE: 'file.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  reserved?: boolean;
}

export interface AvailabilityDay {
  date: string;
  slots: TimeSlot[];
}

export const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.PENDING]: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.REJECTED,
    AppointmentStatus.EXPIRED,
  ],
  [AppointmentStatus.CONFIRMED]: [
    AppointmentStatus.CHECKED_IN,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
    AppointmentStatus.EXPIRED,
  ],
  [AppointmentStatus.CHECKED_IN]: [
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ],
  [AppointmentStatus.IN_PROGRESS]: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.CANCELLED]: [],
  [AppointmentStatus.NO_SHOW]: [],
  [AppointmentStatus.REJECTED]: [],
  [AppointmentStatus.EXPIRED]: [],
};

export function canTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean {
  return APPOINTMENT_TRANSITIONS[from]?.includes(to) ?? false;
}
