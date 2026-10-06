import { z } from 'zod';

export const emailSchema = z.string().email().max(255);
export const phoneSchema = z
  .string()
  .regex(/^(\+98|0)?9\d{9}$/, 'Invalid Iranian phone number')
  .or(z.string().regex(/^\+[1-9]\d{7,14}$/, 'Invalid phone number'));

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Z]/, 'Must contain uppercase')
  .regex(/[a-z]/, 'Must contain lowercase')
  .regex(/[0-9]/, 'Must contain number');

export const loginSchema = z
  .object({
    email: emailSchema.optional(),
    phone: z.string().optional(),
    password: z.string().min(1),
  })
  .refine((d) => d.email || d.phone, { message: 'Email or phone required' });

export const registerSchema = z.object({
  email: emailSchema.optional(),
  phone: z.string().optional(),
  password: passwordSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  locale: z.enum(['fa', 'en']).default('fa'),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const createAppointmentSchema = z.object({
  doctorId: z.string().uuid(),
  branchId: z.string().uuid(),
  patientId: z.string().uuid().optional(),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  visitType: z.enum(['IN_PERSON', 'TELEHEALTH']).default('IN_PERSON'),
  notes: z.string().max(1000).optional(),
  specialtyId: z.string().uuid().optional(),
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const createDoctorScheduleSchema = z.object({
  doctorId: z.string().uuid(),
  branchId: z.string().uuid(),
  dayOfWeek: z.enum([
    'SATURDAY',
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
  ]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotDurationMinutes: z.number().int().min(5).max(120).default(20),
  breakDurationMinutes: z.number().int().min(0).max(60).default(0),
  bufferMinutes: z.number().int().min(0).max(60).default(0),
  isActive: z.boolean().default(true),
});

export const createClinicSchema = z.object({
  nameFa: z.string().min(1).max(200),
  nameEn: z.string().min(1).max(200),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  descriptionFa: z.string().max(2000).optional(),
  descriptionEn: z.string().max(2000).optional(),
  timezone: z.string().default('Asia/Tehran'),
  phone: z.string().optional(),
  email: emailSchema.optional(),
  website: z.string().url().optional(),
  city: z.string().max(100).optional(),
  addressFa: z.string().max(500).optional(),
  addressEn: z.string().max(500).optional(),
});

export const createBranchSchema = z.object({
  clinicId: z.string().uuid(),
  nameFa: z.string().min(1).max(200),
  nameEn: z.string().min(1).max(200),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  phone: z.string().optional(),
  email: emailSchema.optional(),
  city: z.string().max(100).optional(),
  addressFa: z.string().max(500).optional(),
  addressEn: z.string().max(500).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const createVisitSchema = z.object({
  appointmentId: z.string().uuid(),
  chiefComplaint: z.string().max(2000).optional(),
  symptoms: z.string().max(2000).optional(),
  doctorNotes: z.string().max(5000).optional(),
  diagnosis: z.string().max(2000).optional(),
  requestedTests: z.string().max(2000).optional(),
  followUpDate: z.string().datetime().optional(),
});

export const prescriptionItemSchema = z.object({
  medicineName: z.string().min(1).max(200),
  dosage: z.string().min(1).max(100),
  frequency: z.string().min(1).max(100),
  duration: z.string().min(1).max(100),
  instructions: z.string().max(500).optional(),
});

export const createPrescriptionSchema = z.object({
  visitId: z.string().uuid(),
  notes: z.string().max(1000).optional(),
  items: z.array(prescriptionItemSchema).min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type CreateDoctorScheduleInput = z.infer<typeof createDoctorScheduleSchema>;
export type CreateClinicInput = z.infer<typeof createClinicSchema>;
export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type CreateVisitInput = z.infer<typeof createVisitSchema>;
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
