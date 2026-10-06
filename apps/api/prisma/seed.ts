import { PrismaClient, DayOfWeek, AppointmentStatus, PaymentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const PERMISSIONS = {
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

const DefaultRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CLINIC_ADMIN: 'CLINIC_ADMIN',
  BRANCH_ADMIN: 'BRANCH_ADMIN',
  DOCTOR: 'DOCTOR',
  SECRETARY: 'SECRETARY',
  FINANCE: 'FINANCE',
  PATIENT: 'PATIENT',
} as const;

const prisma = new PrismaClient();

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const ROLE_PERMISSIONS: Record<string, string[]> = {
  [DefaultRole.SUPER_ADMIN]: ALL_PERMISSIONS,
  [DefaultRole.CLINIC_ADMIN]: ALL_PERMISSIONS.filter((p) => p !== 'clinic.manage' || true),
  [DefaultRole.BRANCH_ADMIN]: [
    PERMISSIONS.BRANCH_READ,
    PERMISSIONS.DOCTOR_READ,
    PERMISSIONS.PATIENT_READ,
    PERMISSIONS.PATIENT_MANAGE,
    PERMISSIONS.SCHEDULE_READ,
    PERMISSIONS.SCHEDULE_MANAGE,
    PERMISSIONS.APPOINTMENT_READ,
    PERMISSIONS.APPOINTMENT_CREATE,
    PERMISSIONS.APPOINTMENT_UPDATE,
    PERMISSIONS.APPOINTMENT_CANCEL,
    PERMISSIONS.VISIT_READ,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.SERVICE_READ,
    PERMISSIONS.WAITING_LIST_READ,
    PERMISSIONS.WAITING_LIST_MANAGE,
    PERMISSIONS.LAB_READ,
    PERMISSIONS.INSURANCE_READ,
  ],
  [DefaultRole.DOCTOR]: [
    PERMISSIONS.APPOINTMENT_READ,
    PERMISSIONS.APPOINTMENT_UPDATE,
    PERMISSIONS.PATIENT_READ,
    PERMISSIONS.VISIT_READ,
    PERMISSIONS.VISIT_CREATE,
    PERMISSIONS.VISIT_COMPLETE,
    PERMISSIONS.SCHEDULE_READ,
    PERMISSIONS.LAB_READ,
    PERMISSIONS.LAB_MANAGE,
    PERMISSIONS.SERVICE_READ,
    PERMISSIONS.FILE_READ,
    PERMISSIONS.FILE_MANAGE,
  ],
  [DefaultRole.SECRETARY]: [
    PERMISSIONS.APPOINTMENT_READ,
    PERMISSIONS.APPOINTMENT_CREATE,
    PERMISSIONS.APPOINTMENT_UPDATE,
    PERMISSIONS.APPOINTMENT_CANCEL,
    PERMISSIONS.PATIENT_READ,
    PERMISSIONS.PATIENT_MANAGE,
    PERMISSIONS.DOCTOR_READ,
    PERMISSIONS.SCHEDULE_READ,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.WAITING_LIST_READ,
    PERMISSIONS.WAITING_LIST_MANAGE,
    PERMISSIONS.SERVICE_READ,
    PERMISSIONS.LAB_READ,
    PERMISSIONS.INSURANCE_READ,
  ],
  [DefaultRole.FINANCE]: [
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.PAYMENT_MANAGE,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.APPOINTMENT_READ,
    PERMISSIONS.INSURANCE_READ,
    PERMISSIONS.INSURANCE_MANAGE,
  ],
  [DefaultRole.PATIENT]: [
    PERMISSIONS.APPOINTMENT_READ,
    PERMISSIONS.APPOINTMENT_CREATE,
    PERMISSIONS.APPOINTMENT_CANCEL,
    PERMISSIONS.PAYMENT_MANAGE,
    PERMISSIONS.VISIT_READ,
    PERMISSIONS.DOCTOR_READ,
    PERMISSIONS.CLINIC_READ,
    PERMISSIONS.BRANCH_READ,
    PERMISSIONS.SPECIALTY_READ,
    PERMISSIONS.SERVICE_READ,
    PERMISSIONS.WAITING_LIST_READ,
    PERMISSIONS.WAITING_LIST_MANAGE,
    PERMISSIONS.REVIEW_READ,
    PERMISSIONS.REVIEW_CREATE,
    PERMISSIONS.INSURANCE_READ,
    PERMISSIONS.INSURANCE_MANAGE,
    PERMISSIONS.FILE_READ,
  ],
};

const SPECIALTIES = [
  { nameFa: 'قلب و عروق', nameEn: 'Cardiology', slug: 'cardiology' },
  { nameFa: 'پوست و مو', nameEn: 'Dermatology', slug: 'dermatology' },
  { nameFa: 'اطفال', nameEn: 'Pediatrics', slug: 'pediatrics' },
  { nameFa: 'ارتوپدی', nameEn: 'Orthopedics', slug: 'orthopedics' },
  { nameFa: 'زنان و زایمان', nameEn: 'Gynecology', slug: 'gynecology' },
  { nameFa: 'مغز و اعصاب', nameEn: 'Neurology', slug: 'neurology' },
  { nameFa: 'چشم‌پزشکی', nameEn: 'Ophthalmology', slug: 'ophthalmology' },
  { nameFa: 'عمومی', nameEn: 'General Practice', slug: 'general-practice' },
];

const DAYS: DayOfWeek[] = [
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
];

async function main() {
  const password = process.env.SEED_PASSWORD || 'Demo@123456';
  const passwordHash = await bcrypt.hash(password, 12);

  console.log('Seeding permissions...');
  for (const code of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code },
      create: { code, displayName: code },
      update: {},
    });
  }

  console.log('Seeding roles...');
  const roles: Record<string, string> = {};
  for (const [name, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name },
      create: {
        name,
        displayName: name.replace(/_/g, ' '),
        isSystem: true,
      },
      update: {},
    });
    roles[name] = role.id;

    for (const code of perms) {
      const perm = await prisma.permission.findUnique({ where: { code } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        create: { roleId: role.id, permissionId: perm.id },
        update: {},
      });
    }
  }

  console.log('Seeding specialties...');
  const specialtyIds: string[] = [];
  for (const s of SPECIALTIES) {
    const sp = await prisma.specialty.upsert({
      where: { slug: s.slug },
      create: { ...s, descriptionFa: `تخصص ${s.nameFa}`, descriptionEn: `${s.nameEn} specialty` },
      update: {},
    });
    specialtyIds.push(sp.id);
  }

  console.log('Seeding clinics...');
  const clinicData = [
    {
      nameFa: 'کلینیک آریا',
      nameEn: 'Aria Clinic',
      slug: 'aria-clinic',
      city: 'Tehran',
      addressFa: 'تهران، خیابان ولیعصر',
      addressEn: 'Tehran, Valiasr St.',
      phone: '+982112345678',
    },
    {
      nameFa: 'مرکز درمانی سپهر',
      nameEn: 'Sepehr Medical Center',
      slug: 'sepehr-medical',
      city: 'Isfahan',
      addressFa: 'اصفهان، خیابان چهارباغ',
      addressEn: 'Isfahan, Chahar Bagh St.',
      phone: '+983112345678',
    },
    {
      nameFa: 'بیمارستان نور',
      nameEn: 'Noor Hospital',
      slug: 'noor-hospital',
      city: 'Shiraz',
      addressFa: 'شیراز، بلوار زند',
      addressEn: 'Shiraz, Zand Blvd.',
      phone: '+987112345678',
    },
  ];

  const clinics = [];
  for (const c of clinicData) {
    const clinic = await prisma.clinic.upsert({
      where: { slug: c.slug },
      create: {
        ...c,
        descriptionFa: `${c.nameFa} ارائه‌دهنده خدمات تخصصی پزشکی`,
        descriptionEn: `${c.nameEn} providing specialized medical services`,
        timezone: 'Asia/Tehran',
        email: `info@${c.slug}.ir`,
      },
      update: {},
    });
    clinics.push(clinic);
  }

  console.log('Seeding branches...');
  const branches = [];
  const branchDefs = [
    { clinic: 0, nameFa: 'شعبه مرکزی', nameEn: 'Main Branch', slug: 'main', city: 'Tehran' },
    { clinic: 0, nameFa: 'شعبه سعادت‌آباد', nameEn: 'Saadat Abad', slug: 'saadat-abad', city: 'Tehran' },
    { clinic: 1, nameFa: 'شعبه مرکزی', nameEn: 'Main Branch', slug: 'main', city: 'Isfahan' },
    { clinic: 1, nameFa: 'شعبه جلفا', nameEn: 'Jolfa Branch', slug: 'jolfa', city: 'Isfahan' },
    { clinic: 2, nameFa: 'شعبه مرکزی', nameEn: 'Main Branch', slug: 'main', city: 'Shiraz' },
  ];

  for (const b of branchDefs) {
    const clinic = clinics[b.clinic];
    const branch = await prisma.branch.upsert({
      where: { clinicId_slug: { clinicId: clinic.id, slug: b.slug } },
      create: {
        clinicId: clinic.id,
        nameFa: b.nameFa,
        nameEn: b.nameEn,
        slug: b.slug,
        city: b.city,
        addressFa: clinic.addressFa,
        addressEn: clinic.addressEn,
        phone: clinic.phone,
      },
      update: {},
    });
    branches.push(branch);
  }

  async function createUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: string;
    clinicId?: string;
  }) {
    const user = await prisma.user.upsert({
      where: { email: data.email },
      create: {
        email: data.email,
        phone: data.phone,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        locale: 'fa',
        emailVerifiedAt: new Date(),
      },
      update: { passwordHash },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId_clinicId: {
          userId: user.id,
          roleId: roles[data.role],
          clinicId: data.clinicId ?? null as any,
        },
      },
      create: {
        userId: user.id,
        roleId: roles[data.role],
        clinicId: data.clinicId,
      },
      update: {},
    }).catch(async () => {
      // unique with null clinicId can be tricky — fallback
      const existing = await prisma.userRole.findFirst({
        where: { userId: user.id, roleId: roles[data.role], clinicId: data.clinicId ?? null },
      });
      if (!existing) {
        await prisma.userRole.create({
          data: { userId: user.id, roleId: roles[data.role], clinicId: data.clinicId },
        });
      }
    });

    return user;
  }

  console.log('Seeding demo users...');
  const superAdmin = await createUser({
    email: 'superadmin@example.com',
    firstName: 'Super',
    lastName: 'Admin',
    role: DefaultRole.SUPER_ADMIN,
  });

  const clinicAdmin = await createUser({
    email: 'clinicadmin@example.com',
    firstName: 'مریم',
    lastName: 'احمدی',
    phone: '09121111111',
    role: DefaultRole.CLINIC_ADMIN,
    clinicId: clinics[0].id,
  });

  await prisma.clinicStaff.upsert({
    where: { clinicId_userId: { clinicId: clinics[0].id, userId: clinicAdmin.id } },
    create: { clinicId: clinics[0].id, userId: clinicAdmin.id, title: 'Clinic Admin' },
    update: {},
  });

  const secretary = await createUser({
    email: 'secretary@example.com',
    firstName: 'سارا',
    lastName: 'محمدی',
    phone: '09122222222',
    role: DefaultRole.SECRETARY,
    clinicId: clinics[0].id,
  });

  await prisma.clinicStaff.upsert({
    where: { clinicId_userId: { clinicId: clinics[0].id, userId: secretary.id } },
    create: { clinicId: clinics[0].id, userId: secretary.id, title: 'Secretary' },
    update: {},
  });

  const patientUser = await createUser({
    email: 'patient@example.com',
    firstName: 'علی',
    lastName: 'رضایی',
    phone: '09123333333',
    role: DefaultRole.PATIENT,
  });

  const patient = await prisma.patient.upsert({
    where: { userId: patientUser.id },
    create: {
      userId: patientUser.id,
      nationalId: '0012345678',
      gender: 'MALE',
      city: 'Tehran',
    },
    update: {},
  });

  console.log('Seeding doctors...');
  const doctorNames = [
    { fa: ['رضا', 'کریمی'], en: ['Reza', 'Karimi'], slug: 'dr-reza-karimi', spec: 0, exp: 15 },
    { fa: ['نازنین', 'حسینی'], en: ['Nazanin', 'Hosseini'], slug: 'dr-nazanin-hosseini', spec: 1, exp: 10 },
    { fa: ['امیر', 'نجفی'], en: ['Amir', 'Najafi'], slug: 'dr-amir-najafi', spec: 2, exp: 12 },
    { fa: ['لیلا', 'صادقی'], en: ['Leila', 'Sadeghi'], slug: 'dr-leila-sadeghi', spec: 3, exp: 8 },
    { fa: ['حسین', 'موسوی'], en: ['Hossein', 'Mousavi'], slug: 'dr-hossein-mousavi', spec: 4, exp: 20 },
    { fa: ['فاطمه', 'اکبری'], en: ['Fatemeh', 'Akbari'], slug: 'dr-fatemeh-akbari', spec: 5, exp: 14 },
    { fa: ['مهدی', 'جعفری'], en: ['Mehdi', 'Jafari'], slug: 'dr-mehdi-jafari', spec: 6, exp: 9 },
    { fa: ['زهرا', 'کاظمی'], en: ['Zahra', 'Kazemi'], slug: 'dr-zahra-kazemi', spec: 7, exp: 7 },
    { fa: ['پارسا', 'نوری'], en: ['Parsa', 'Nouri'], slug: 'dr-parsa-nouri', spec: 0, exp: 11 },
    { fa: ['نیلوفر', 'شریفی'], en: ['Niloofar', 'Sharifi'], slug: 'dr-niloofar-sharifi', spec: 1, exp: 6 },
    { fa: ['کیان', 'رحیمی'], en: ['Kian', 'Rahimi'], slug: 'dr-kian-rahimi', spec: 3, exp: 13 },
    { fa: ['مریم', 'باقری'], en: ['Maryam', 'Bagheri'], slug: 'dr-maryam-bagheri', spec: 7, exp: 5 },
  ];

  const doctors = [];
  for (let i = 0; i < doctorNames.length; i++) {
    const d = doctorNames[i];
    const email = i === 0 ? 'doctor@example.com' : `${d.slug}@example.com`;
    const user = await createUser({
      email,
      firstName: d.fa[0],
      lastName: d.fa[1],
      phone: `0912${String(3000000 + i).padStart(7, '0')}`,
      role: DefaultRole.DOCTOR,
      clinicId: clinics[i % 3].id,
    });

    const doctor = await prisma.doctor.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        slug: d.slug,
        titleFa: 'دکتر',
        titleEn: 'Dr.',
        bioFa: `دکتر ${d.fa[0]} ${d.fa[1]} با ${d.exp} سال سابقه در زمینه ${SPECIALTIES[d.spec].nameFa}`,
        bioEn: `Dr. ${d.en[0]} ${d.en[1]} with ${d.exp} years of experience in ${SPECIALTIES[d.spec].nameEn}`,
        educationFa: 'دکترای پزشکی، دانشگاه تهران',
        educationEn: 'MD, University of Tehran',
        experienceYears: d.exp,
        consultationFee: 500000 + i * 50000,
        rating: 4 + (i % 10) / 10,
        reviewCount: 20 + i * 5,
        isVerified: true,
        isActive: true,
      },
      update: {},
    });

    await prisma.doctorSpecialty.upsert({
      where: { doctorId_specialtyId: { doctorId: doctor.id, specialtyId: specialtyIds[d.spec] } },
      create: { doctorId: doctor.id, specialtyId: specialtyIds[d.spec], isPrimary: true },
      update: {},
    });

    // Secondary specialty for some
    if (i % 3 === 0) {
      const secondary = specialtyIds[(d.spec + 1) % specialtyIds.length];
      await prisma.doctorSpecialty.upsert({
        where: { doctorId_specialtyId: { doctorId: doctor.id, specialtyId: secondary } },
        create: { doctorId: doctor.id, specialtyId: secondary, isPrimary: false },
        update: {},
      });
    }

    // Assign to branches (multi-clinic for some)
    const branchA = branches[i % branches.length];
    const branchB = branches[(i + 1) % branches.length];
    await prisma.doctorBranch.upsert({
      where: { doctorId_branchId: { doctorId: doctor.id, branchId: branchA.id } },
      create: { doctorId: doctor.id, branchId: branchA.id },
      update: {},
    });
    if (i % 2 === 0) {
      await prisma.doctorBranch.upsert({
        where: { doctorId_branchId: { doctorId: doctor.id, branchId: branchB.id } },
        create: { doctorId: doctor.id, branchId: branchB.id },
        update: {},
      });
    }

    // Schedules
    for (const day of DAYS) {
      const startTime = i % 2 === 0 ? '09:00' : '15:00';
      const endTime = i % 2 === 0 ? '13:00' : '20:00';
      const existingSchedule = await prisma.doctorSchedule.findFirst({
        where: {
          doctorId: doctor.id,
          branchId: branchA.id,
          dayOfWeek: day,
          startTime,
          endTime,
        },
      });
      if (!existingSchedule) {
        await prisma.doctorSchedule.create({
          data: {
            doctorId: doctor.id,
            branchId: branchA.id,
            dayOfWeek: day,
            startTime,
            endTime,
            slotDurationMinutes: 20,
            breakDurationMinutes: 0,
            bufferMinutes: 0,
          },
        });
      }
    }

    doctors.push(doctor);
  }

  console.log('Seeding patients...');
  const patientNames = [
    ['محمد', 'علوی'], ['سارا', 'نیکو'], ['رضا', 'پناهی'], ['مینا', 'فرهادی'],
    ['امیر', 'سلطانی'], ['نازنین', 'ایرانی'], ['حسین', 'طاهری'], ['الهام', 'راد'],
    ['کامران', 'یوسفی'], ['شیرین', 'ملکی'],
  ];
  const patients = [patient];
  for (let i = 0; i < 49; i++) {
    const [fn, ln] = patientNames[i % patientNames.length];
    const u = await prisma.user.upsert({
      where: { email: `patient${i + 1}@example.com` },
      create: {
        email: `patient${i + 1}@example.com`,
        phone: `0914${String(1000000 + i).padStart(7, '0')}`,
        passwordHash,
        firstName: fn,
        lastName: `${ln}${i}`,
        locale: 'fa',
      },
      update: {},
    });
    await prisma.userRole.create({
      data: { userId: u.id, roleId: roles[DefaultRole.PATIENT] },
    }).catch(() => undefined);
    const p = await prisma.patient.upsert({
      where: { userId: u.id },
      create: { userId: u.id, city: i % 2 === 0 ? 'Tehran' : 'Isfahan', gender: i % 2 === 0 ? 'MALE' : 'FEMALE' },
      update: {},
    });
    patients.push(p);
  }

  console.log('Seeding appointments...');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let i = 0; i < 30; i++) {
    const doctor = doctors[i % doctors.length];
    const branchLink = await prisma.doctorBranch.findFirst({ where: { doctorId: doctor.id } });
    if (!branchLink) continue;
    const branch = await prisma.branch.findUnique({ where: { id: branchLink.branchId } });
    if (!branch) continue;

    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + (i % 14) - 3);
    const startHour = 9 + (i % 4);
    const startTime = `${String(startHour).padStart(2, '0')}:${i % 2 === 0 ? '00' : '20'}`;
    const endTime = `${String(startHour).padStart(2, '0')}:${i % 2 === 0 ? '20' : '40'}`;
    const statuses = [
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.COMPLETED,
      AppointmentStatus.PENDING,
      AppointmentStatus.CANCELLED,
    ];
    const status = statuses[i % statuses.length];

    try {
      const appt = await prisma.appointment.create({
        data: {
          clinicId: branch.clinicId,
          branchId: branch.id,
          doctorId: doctor.id,
          patientId: patients[i % patients.length].id,
          appointmentDate: date,
          startTime,
          endTime,
          status,
          fee: doctor.consultationFee,
          specialtyId: specialtyIds[i % specialtyIds.length],
        },
      });

      if (status === AppointmentStatus.CONFIRMED || status === AppointmentStatus.COMPLETED) {
        await prisma.payment.create({
          data: {
            clinicId: branch.clinicId,
            appointmentId: appt.id,
            amount: doctor.consultationFee,
            status: PaymentStatus.PAID,
            provider: 'mock',
            providerRef: `seed_${appt.id}`,
            idempotencyKey: `seed_pay_${appt.id}`,
            paidAt: new Date(),
          },
        });
      }

      if (status === AppointmentStatus.COMPLETED) {
        const visit = await prisma.visit.create({
          data: {
            appointmentId: appt.id,
            doctorId: doctor.id,
            patientId: patients[i % patients.length].id,
            chiefComplaint: 'سردرد و خستگی',
            diagnosis: 'میگرن خفیف',
            doctorNotes: 'استراحت و مصرف مایعات توصیه شد',
            startedAt: new Date(),
            completedAt: new Date(),
          },
        });
        await prisma.prescription.create({
          data: {
            visitId: visit.id,
            notes: 'پس از غذا مصرف شود',
            items: {
              create: [
                {
                  medicineName: 'استامینوفن',
                  dosage: '500mg',
                  frequency: 'هر ۸ ساعت',
                  duration: '۳ روز',
                  instructions: 'با آب فراوان',
                },
              ],
            },
          },
        });
      }
    } catch {
      // unique constraint — skip
    }
  }

  console.log('Seeding services & insurance...');
  for (const clinic of clinics) {
    const svc = await prisma.service.upsert({
      where: { clinicId_slug: { clinicId: clinic.id, slug: 'general-consult' } },
      create: {
        clinicId: clinic.id,
        nameFa: 'ویزیت عمومی',
        nameEn: 'General Consultation',
        slug: 'general-consult',
        price: 250000,
        durationMinutes: 20,
      },
      update: {},
    });
    if (doctors[0]) {
      await prisma.doctorService.upsert({
        where: {
          doctorId_serviceId: { doctorId: doctors[0].id, serviceId: svc.id },
        },
        create: { doctorId: doctors[0].id, serviceId: svc.id },
        update: {},
      });
    }
    const existingIns = await prisma.insuranceProvider.findFirst({
      where: { clinicId: clinic.id, nameEn: 'Social Security' },
    });
    if (!existingIns) {
      await prisma.insuranceProvider.create({
        data: {
          clinicId: clinic.id,
          nameFa: 'تامین اجتماعی',
          nameEn: 'Social Security',
        },
      });
    }
  }

  console.log('Seed complete!');
  console.log('Demo accounts (password: Demo@123456):');
  console.log('  superadmin@example.com');
  console.log('  clinicadmin@example.com');
  console.log('  doctor@example.com');
  console.log('  secretary@example.com');
  console.log('  patient@example.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
