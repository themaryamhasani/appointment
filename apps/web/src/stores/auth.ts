import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type User = {
  id: string;
  email?: string | null;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  clinicIds: string[];
  isSuperAdmin: boolean;
  patientId?: string | null;
  doctorId?: string | null;
  accessToken?: string;
};

type AuthState = {
  user: User | null;
  setUser: (user: User | null) => void;
  setToken: (token: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      setToken: (token) =>
        set((s) => (s.user ? { user: { ...s.user, accessToken: token } } : s)),
      logout: () => set({ user: null }),
    }),
    { name: 'healthcare-auth' },
  ),
);

type BookingState = {
  doctorId: string | null;
  branchId: string | null;
  specialtyId: string | null;
  date: string | null;
  time: string | null;
  visitType: 'IN_PERSON' | 'TELEHEALTH';
  step: number;
  setField: (field: Partial<BookingState>) => void;
  reset: () => void;
};

const initialBooking = {
  doctorId: null,
  branchId: null,
  specialtyId: null,
  date: null,
  time: null,
  visitType: 'IN_PERSON' as const,
  step: 0,
};

export const useBookingStore = create<BookingState>((set) => ({
  ...initialBooking,
  setField: (field) => set((s) => ({ ...s, ...field })),
  reset: () => set(initialBooking),
}));
