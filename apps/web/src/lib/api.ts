const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
    public status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
  clinicId?: string;
  headers?: Record<string, string>;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.clinicId) headers['x-clinic-id'] = options.clinicId;

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    credentials: 'include',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = json.error || {};
    throw new ApiError(
      err.code || 'ERROR',
      err.message || 'Request failed',
      err.details,
      res.status,
    );
  }

  return (json.data !== undefined ? json : { data: json }) as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<{ success: boolean; data: T; meta?: unknown }>(path, opts).then((r) => {
      if (r && typeof r === 'object' && 'data' in r) return r as { success: boolean; data: T; meta?: unknown };
      return { success: true, data: r as T };
    }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<{ success: boolean; data: T }>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<{ success: boolean; data: T }>(path, { ...opts, method: 'PATCH', body }),
};

function qs(params?: Record<string, string | undefined | null>) {
  if (!params) return '';
  const clean: Record<string, string> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') clean[k] = String(v);
  });
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : '';
}

export async function fetchDoctors(params?: Record<string, string>, token?: string) {
  return api.get<any[]>(`/doctors${qs(params)}`, { token });
}

export async function fetchDoctor(slug: string) {
  return api.get<any>(`/doctors/slug/${slug}`);
}

export async function fetchDoctorById(id: string, token?: string) {
  return api.get<any>(`/doctors/${id}`, { token });
}

export async function fetchSpecialties() {
  return api.get<any[]>(`/specialties`);
}

export async function fetchClinics(params?: Record<string, string>) {
  return api.get<any[]>(`/clinics${qs(params)}`);
}

export async function fetchClinic(id: string, token?: string) {
  return api.get<any>(`/clinics/${id}`, { token });
}

export async function updateClinic(id: string, body: Record<string, unknown>, token?: string) {
  return api.patch<any>(`/clinics/${id}`, body, { token });
}

export async function fetchBranches(clinicId: string, token?: string) {
  return api.get<any[]>(`/clinics/${clinicId}/branches`, { token });
}

export async function createBranch(body: Record<string, unknown>, token?: string) {
  return api.post<any>('/branches', body, { token });
}

export async function updateBranch(id: string, body: Record<string, unknown>, token?: string) {
  return api.patch<any>(`/branches/${id}`, body, { token });
}

export async function fetchAvailability(
  doctorId: string,
  branchId: string,
  from: string,
  to: string,
) {
  return api.get<any[]>(`/doctors/${doctorId}/availability${qs({ branchId, from, to })}`);
}

export async function fetchSchedules(doctorId: string, branchId?: string, token?: string) {
  return api.get<any[]>(`/doctors/${doctorId}/schedules${qs({ branchId })}`, { token });
}

export async function createSchedule(body: Record<string, unknown>, token?: string) {
  return api.post<any>('/schedules', body, { token });
}

export async function login(body: { email?: string; phone?: string; password: string }) {
  return api.post<{ user: any; accessToken: string }>('/auth/login', body);
}

export async function register(body: Record<string, unknown>) {
  return api.post('/auth/register', body);
}

export async function fetchMe(token?: string) {
  return api.get<any>('/auth/me', { token });
}

export async function createAppointment(
  body: Record<string, unknown>,
  token?: string,
  clinicId?: string,
) {
  return api.post<any>('/appointments', body, { token, clinicId });
}

export async function fetchAppointments(
  params?: Record<string, string>,
  token?: string,
  clinicId?: string,
) {
  return api.get<any[]>(`/appointments${qs(params)}`, { token, clinicId });
}

export async function fetchAppointment(id: string, token?: string) {
  return api.get<any>(`/appointments/${id}`, { token });
}

export async function cancelAppointment(id: string, reason: string, token?: string) {
  return api.post(`/appointments/${id}/cancel`, { reason }, { token });
}

export async function checkInAppointment(id: string, token?: string) {
  return api.post(`/appointments/${id}/check-in`, {}, { token });
}

export async function confirmAppointment(id: string, token?: string) {
  return api.post(`/appointments/${id}/confirm`, {}, { token });
}

export async function rescheduleAppointment(
  id: string,
  body: { appointmentDate: string; startTime: string; branchId?: string },
  token?: string,
) {
  return api.post(`/appointments/${id}/reschedule`, body, { token });
}

export async function createPayment(appointmentId: string, token?: string) {
  return api.post<any>('/payments', { appointmentId }, { token });
}

export async function fetchPayments(params?: Record<string, string>, token?: string) {
  return api.get<any[]>(`/payments${qs(params)}`, { token });
}

export async function fetchReportOverview(clinicId: string, token?: string) {
  return api.get<any>(`/admin/reports/overview${qs({ clinicId })}`, { token });
}

export async function fetchPatients(params?: Record<string, string>, token?: string) {
  return api.get<any[]>(`/patients${qs(params)}`, { token });
}

export async function fetchPatient(id: string, token?: string) {
  return api.get<any>(`/patients/${id}`, { token });
}

export async function fetchStaff(clinicId: string, token?: string) {
  return api.get<any[]>(`/clinics/${clinicId}/staff`, { token });
}

export async function fetchRoles(clinicId?: string, token?: string) {
  return api.get<any[]>(`/roles${qs({ clinicId })}`, { token });
}

export async function fetchPermissions(token?: string) {
  return api.get<any[]>('/permissions', { token });
}

export async function fetchAuditLogs(params?: Record<string, string>, token?: string) {
  return api.get<any[]>(`/audit-logs${qs(params)}`, { token });
}

export async function fetchMedicalRecords(params?: Record<string, string>, token?: string) {
  return api.get<any[]>(`/medical-records${qs(params)}`, { token });
}

export async function startVisit(appointmentId: string, token?: string) {
  return api.post<any>('/visits/start', { appointmentId }, { token });
}

export async function updateVisit(id: string, body: Record<string, unknown>, token?: string) {
  return api.patch<any>(`/visits/${id}`, body, { token });
}

export async function completeVisit(id: string, token?: string) {
  return api.post<any>(`/visits/${id}/complete`, {}, { token });
}

export async function createPrescription(body: Record<string, unknown>, token?: string) {
  return api.post<any>('/prescriptions', body, { token });
}

export async function fetchPrescriptions(params?: Record<string, string>, token?: string) {
  return api.get<any[]>(`/prescriptions${qs(params)}`, { token });
}

export async function reserveSlot(
  body: { doctorId: string; branchId: string; date: string; time: string },
  token?: string,
) {
  return api.post<any>('/slots/reserve', body, { token });
}

export async function requestOtp(body: { phone: string; purpose: string }) {
  return api.post('/auth/otp/request', body);
}

export async function verifyOtp(body: { phone: string; code: string; purpose: string }) {
  return api.post('/auth/otp/verify', body);
}

export async function resetPassword(body: { phone: string; code: string; password: string }) {
  return api.post('/auth/password/reset', body);
}

export async function fetchServices(clinicId: string, token?: string) {
  return api.get<any[]>(`/services${qs({ clinicId })}`, { token });
}

export async function createService(body: Record<string, unknown>, token?: string) {
  return api.post<any>('/services', body, { token });
}

export async function updateService(id: string, body: Record<string, unknown>, token?: string) {
  return api.patch<any>(`/services/${id}`, body, { token });
}

export async function fetchLabRequests(params?: Record<string, string>, token?: string) {
  return api.get<any[]>(`/lab-requests${qs(params)}`, { token });
}

export async function createLabRequest(body: Record<string, unknown>, token?: string) {
  return api.post<any>('/lab-requests', body, { token });
}

export async function updateLabRequestStatus(id: string, status: string, token?: string) {
  return api.patch<any>(`/lab-requests/${id}/status`, { status }, { token });
}

export async function fetchWaitingList(params?: Record<string, string>, token?: string) {
  return api.get<any[]>(`/waiting-list${qs(params)}`, { token });
}

export async function joinWaitingList(body: Record<string, unknown>, token?: string) {
  return api.post<any>('/waiting-list', body, { token });
}

export async function promoteWaitingList(id: string, token?: string) {
  return api.patch<any>(`/waiting-list/${id}/promote`, {}, { token });
}

export async function cancelWaitingList(id: string, token?: string) {
  return api.patch<any>(`/waiting-list/${id}/cancel`, {}, { token });
}

export async function fetchDoctorReviews(doctorId: string) {
  return api.get<any[]>(`/reviews/doctors/${doctorId}`);
}

export async function createReview(body: Record<string, unknown>, token?: string) {
  return api.post<any>('/reviews', body, { token });
}

export async function fetchInsuranceProviders(clinicId: string) {
  return api.get<any[]>(`/insurance/providers${qs({ clinicId })}`);
}

export async function createInsuranceProvider(body: Record<string, unknown>, token?: string) {
  return api.post<any>('/insurance/providers', body, { token });
}

export async function fetchPatientInsurance(patientId: string, token?: string) {
  return api.get<any[]>(`/insurance/patients/${patientId}`, { token });
}

export async function linkPatientInsurance(body: Record<string, unknown>, token?: string) {
  return api.post<any>('/insurance/patients', body, { token });
}

export async function refundPayment(
  id: string,
  body: { amount?: number; reason?: string },
  token?: string,
) {
  return api.post<any>(`/payments/${id}/refund`, body, { token });
}

export async function createInvoice(appointmentId: string, token?: string) {
  return api.post<any>('/payments/invoices', { appointmentId }, { token });
}

export async function uploadFile(body: Record<string, unknown>, token?: string) {
  return api.post<any>('/files', body, { token });
}

export { API_URL };
