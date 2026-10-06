import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ClinicState = {
  clinicId: string | null;
  setClinicId: (id: string | null) => void;
};

export const useClinicStore = create<ClinicState>()(
  persist(
    (set) => ({
      clinicId: null,
      setClinicId: (clinicId) => set({ clinicId }),
    }),
    { name: 'healthcare-clinic' },
  ),
);
