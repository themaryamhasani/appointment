# پلتفرم چنددرمانگاهی نوبت‌دهی و مدیریت ویزیت پزشک

## هدف پروژه

برای اینکه این پروژه واقعاً در حد یک محصول قابل استفاده و یک پروژه قوی رزومه‌ای باشد، بهتر است از اول آن را به‌عنوان یک **پلتفرم چنددرمانگاهی و چندپزشکی** طراحی کنی، نه صرفاً یک سیستم نوبت‌دهی.

هدف نهایی چیزی شبیه یک **Clinic & Doctor Appointment Platform** خواهد بود که بتواند چند درمانگاه، چند پزشک، چند تخصص، چند شعبه، چند منشی و تعداد زیادی بیمار را مدیریت کند.

---

## معماری کلی محصول

مدل دامنه بهتر است تقریباً این‌طور باشد:

```text
Platform
│
├── Clinics
│   ├── Branches
│   ├── Doctors
│   ├── Secretaries
│   ├── Services
│   └── Schedules
│
├── Doctors
│   ├── Specialties
│   ├── Working Hours
│   ├── Visit Types
│   └── Appointments
│
├── Patients
│   ├── Profiles
│   ├── Appointments
│   ├── Payments
│   └── Medical Records
│
└── Admin
    ├── Users
    ├── Roles
    ├── Permissions
    └── Reports
```

---

# مسیر پیشنهادی پیاده‌سازی

## 1. ابتدا Scope پروژه را دقیق مشخص کن

نسخه اول باید این سناریو را کامل پوشش دهد:

```text
بیمار
↓
انتخاب درمانگاه
↓
انتخاب تخصص
↓
انتخاب پزشک
↓
انتخاب نوع ویزیت
↓
انتخاب تاریخ
↓
انتخاب ساعت
↓
ثبت نوبت
↓
پرداخت
↓
دریافت تاییدیه
↓
ویزیت
```

اما از همان اول دیتامدل را طوری طراحی کن که بعدها محدود نشوی.

### کاربران سیستم

| Role | کاربرد |
|---|---|
| Super Admin | مدیریت کل سیستم |
| Clinic Admin | مدیریت درمانگاه |
| Branch Admin | مدیریت شعبه |
| Doctor | پزشک |
| Secretary | منشی |
| Patient | بیمار |
| Finance | امور مالی |

---

## 2. ساختار Multi-Tenant را از اول درست طراحی کن

چون چند درمانگاه داری، تقریباً همه داده‌ها باید به Clinic وابسته باشند.

```text
Clinic
 ├── Branch
 ├── Doctor
 ├── Appointment
 ├── Service
 ├── User
 └── Payment
```

در بیشتر جدول‌ها چیزی شبیه این خواهی داشت:

```text
clinic_id
```

اگر بعدها سیستم SaaS شود، این تصمیم بسیار مهم خواهد بود.

پیشنهاد:

```text
Shared Database
+
Shared Schema
+
clinic_id
```

یعنی همه درمانگاه‌ها در یک دیتابیس باشند ولی داده‌ها با `clinic_id` ایزوله شوند.

---

## 3. مدل دیتابیس را قبل از Backend طراحی کن

### Entityهای اصلی

```text
User
Patient
Doctor
Clinic
Branch
Specialty
DoctorSpecialty
DoctorClinic
Service
Schedule
ScheduleException
Appointment
AppointmentStatus
Payment
Visit
MedicalRecord
Prescription
Notification
AuditLog
```

### رابطه مهم

```text
Clinic
   ↓
Branch
   ↓
Doctor

Doctor
   ↓
Specialty

Doctor
   ↓
Schedule

Patient
   ↓
Appointment
   ↓
Doctor
```

مهم است Doctor مستقیماً وابسته به یک Clinic نباشد.

چون یک پزشک ممکن است:

```text
دوشنبه → درمانگاه A
سه‌شنبه → درمانگاه B
چهارشنبه → مطب شخصی
```

پس باید جدول واسط داشته باشی:

```text
DoctorClinic
```

یا:

```text
DoctorBranch
```

---

## 4. سیستم زمان‌بندی را جدی طراحی کن

مهم‌ترین قسمت پروژه همین است.

مثلاً دکتر می‌گوید:

```text
شنبه
09:00 → 13:00

دوشنبه
15:00 → 20:00
```

مدت هر ویزیت:

```text
20 minutes
```

سیستم باید خودکار Slot بسازد:

```text
09:00
09:20
09:40
10:00
...
```

ولی باید موارد زیر را هم مدیریت کند:

```text
تعطیلی پزشک
مرخصی
تعطیلی درمانگاه
جلسه پزشک
نوبت رزروشده
نوبت اضطراری
```

پس نیاز داری:

```text
DoctorSchedule
DoctorScheduleException
```

مثلاً:

```text
2026-10-20
Doctor unavailable
10:00 → 12:00
```

---

## 5. Appointment را به‌صورت State Machine طراحی کن

نوبت صرفاً این نباشد:

```text
is_active = true
```

State داشته باش:

```text
Pending
↓
Confirmed
↓
CheckedIn
↓
InProgress
↓
Completed
```

و حالت‌های جانبی:

```text
Cancelled
NoShow
Rejected
Expired
```

این باعث می‌شود Business Logic تمیز بماند.

مثلاً:

```text
Pending
→ Payment Failed
→ Expired
```

یا:

```text
Confirmed
→ Patient Cancel
→ Cancelled
```

---

## 6. جلوی Double Booking را بگیر

این قسمت برای رزومه Backend خیلی مهم است.

فرض کن دو بیمار همزمان روی:

```text
10:30
```

کلیک کنند.

نباید هر دو نوبت ثبت کنند.

از Database Transaction + Unique Constraint استفاده کن.

مثلاً:

```text
UNIQUE(
 doctor_id,
 branch_id,
 appointment_date,
 start_time
)
```

و فرآیند:

```text
BEGIN TRANSACTION

check slot

create appointment

COMMIT
```

این یکی از مهم‌ترین قسمت‌های پروژه است.

---

## 7. Backend را Modular Monolith بساز

برای شروع Microservice نساز.

ساختار پیشنهادی:

```text
backend/

modules/

auth
users
clinics
branches
doctors
patients
specialties
schedules
appointments
payments
visits
prescriptions
notifications
reports
audit
```

### اگر Node.js کار می‌کنی

```text
NestJS
PostgreSQL
Redis
BullMQ
```

### Stack پیشنهادی

```text
Backend
NestJS

Database
PostgreSQL

ORM
Prisma

Cache
Redis

Queue
BullMQ

API
REST

Documentation
Swagger

Authentication
JWT + Refresh Token
```

### اگر .NET بلدی

```text
ASP.NET Core
EF Core
PostgreSQL
Redis
Hangfire
```

هم انتخاب فوق‌العاده‌ای است.

---

## 8. Authentication و Authorization حرفه‌ای بساز

Login:

```text
Email / Phone
+
Password
```

بعد:

```text
Access Token
Refresh Token
```

ولی Authorization باید RBAC باشد.

مثلاً:

```text
clinic.read
clinic.manage
doctor.manage
appointment.create
appointment.cancel
payment.read
reports.view
```

Role فقط مجموعه‌ای از Permission باشد.

مثلاً:

```text
Secretary

appointment.create
appointment.update
patient.create
patient.read
```

---

## 9. Frontend را دو بخش طراحی کن

بهتر است دو UI مستقل داشته باشی:

```text
Patient Portal
Admin Panel
```

### Patient Portal

```text
Home
Doctors
Clinics
Specialties
Doctor Details
Available Times
Booking
Payments
Appointments
Profile
```

### Admin Panel

```text
Dashboard
Doctors
Patients
Appointments
Calendar
Branches
Services
Payments
Reports
Staff
Settings
```

---

## 10. Frontend Stack

پیشنهاد:

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
React Query
Zustand
React Hook Form
Zod
```

ساختار:

```text
frontend/

app/
components/
features/
hooks/
services/
store/
types/
lib/
i18n/
```

---

# دوزبانه فارسی / انگلیسی

این بخش را از روز اول پیاده کن.

برای Next.js می‌توانی:

```text
next-intl
```

استفاده کنی.

URL:

```text
/en/doctors
/fa/doctors
```

فایل ترجمه:

```text
messages/

en.json
fa.json
```

مثلاً:

```json
{
  "appointment": {
    "book": "Book Appointment",
    "cancel": "Cancel Appointment"
  }
}
```

و فارسی:

```json
{
  "appointment": {
    "book": "دریافت نوبت",
    "cancel": "لغو نوبت"
  }
}
```

RTL را هم باید درست مدیریت کنی.

```text
fa → dir="rtl"
en → dir="ltr"
```

---

# Design System پیشنهادی

ظاهر باید حس پزشکی + اعتماد + مدرن بودن بدهد.

سبک:

```text
Minimal
Clean
Soft
Professional
Calm
```

صفحه را شلوغ نکن.

### Design Token

```text
Primary
Secondary
Success
Warning
Danger
Background
Surface
Border
Text Primary
Text Secondary
```

### Typography فارسی

```text
Vazirmatn
```

### Typography انگلیسی

```text
Inter
```

### کامپوننت‌های پایه

```text
Button
Input
Select
Modal
Drawer
Card
Badge
Table
Tabs
Calendar
DatePicker
TimeSlot
DoctorCard
ClinicCard
AppointmentCard
```

---

# صفحه Home

می‌تواند چنین ساختاری داشته باشد:

```text
Navbar

Hero
"پزشک مناسب خود را پیدا کنید"

Search

[ تخصص ]
[ پزشک ]
[ شهر ]
[ تاریخ ]

Featured Specialties

Popular Doctors

Clinics

How it Works

Testimonials

FAQ

Footer
```

---

# صفحه پزشک

مثلاً:

```text
Dr. John Smith

Cardiologist

★★★★★ 4.8

12 Years Experience

---------------------

About

Education

Experience

Clinics

---------------------

Available Dates

Oct 10
Oct 11
Oct 12

---------------------

Available Time

09:00
09:30
10:00
10:30
```

---

# تقویم Admin

این صفحه یکی از جذاب‌ترین بخش‌های پروژه می‌شود.

نمایش:

```text
Day
Week
Month
```

با:

```text
Doctor Filter
Branch Filter
Status Filter
```

مثلاً:

```text
09:00 Ali Ahmadi
09:30 Sara Karimi
10:00 Reserved
10:30 Empty
```

Drag & Drop برای جابه‌جایی نوبت هم بعداً می‌توانی اضافه کنی.

---

# سیستم ویزیت

بعد از Appointment می‌توانی Visit بسازی.

```text
Appointment
↓
Visit
```

Visit:

```text
Symptoms
Diagnosis
Notes
Prescription
Requested Tests
Follow-up Date
```

یعنی سیستم کم‌کم تبدیل می‌شود به:

```text
Clinic Management System
```

نه فقط Appointment System.

---

# نسخه پیشرفته

بعد از MVP این قابلیت‌ها را اضافه کن:

```text
SMS Reminder
Email Notification
Online Payment
Prescription
Medical Record
Lab Request
Video Consultation
Doctor Rating
Waiting List
Emergency Appointment
Recurring Appointment
Insurance
Invoice
Refund
Audit Log
Activity Log
Reports
```

---

# Redis را کجا استفاده کنی؟

مثلاً:

```text
Available Slots Cache
OTP
Rate Limit
Session
Temporary Booking Lock
```

مثلاً کاربر Slot را انتخاب کرد:

```text
10:30
```

برای ۵ دقیقه:

```text
booking_lock:
doctor:10
date:2026-10-12
time:10:30
```

در Redis قفلش کن.

---

# Queue را کجا استفاده کنی؟

کارهای Async:

```text
Send SMS
Send Email
Appointment Reminder
Generate Invoice
Payment Callback
Report Generation
```

با:

```text
BullMQ
```

مثلاً:

```text
Appointment Created

↓ event

notification queue

↓

SMS Worker
Email Worker
```

---

# Notification System

Notification Channel:

```text
SMS
Email
Push
In-App
```

Event:

```text
AppointmentCreated
AppointmentCancelled
AppointmentReminder
PaymentCompleted
DoctorUnavailable
```

---

# گزارش‌ها

Clinic Admin باید بتواند ببیند:

```text
Appointments Today
Completed Visits
Cancelled Appointments
No-show Rate
Revenue
Top Doctors
Top Services
Patients Count
```

بعد نمودار:

```text
Appointments / Day
Revenue / Month
Doctor Utilization
Cancellation Rate
```

---

# امنیت

حتماً این موارد را رعایت کن:

```text
Password Hashing
Rate Limiting
Input Validation
SQL Injection Protection
XSS Protection
CSRF Protection
JWT Rotation
Refresh Token Revocation
Audit Log
Permission Check
Tenant Isolation
```

و مخصوصاً:

```text
Clinic A
```

نباید تحت هیچ شرایطی بتواند اطلاعات:

```text
Clinic B
```

را ببیند.

---

# تست

حداقل سه سطح تست داشته باش.

```text
Unit Test
Integration Test
E2E Test
```

مخصوصاً سناریوهای:

```text
Double Booking
Concurrent Booking
Cancellation
Schedule Exception
Payment Failure
Role Permission
Tenant Isolation
```

---

# Docker

همه پروژه را Dockerize کن.

```text
docker-compose

frontend
backend
postgres
redis
```

برای Development:

```bash
docker compose up
```

کل سیستم اجرا شود.

---

# CI/CD

GitHub Actions:

```text
Push
↓
Lint
↓
Unit Tests
↓
Build
↓
Docker Build
↓
Deploy
```

---

# Observability

برای Backend:

```text
Structured Logging
Request ID
Error Logging
Health Check
Metrics
```

هر Request یک:

```text
traceId
```

داشته باشد.

مثلاً:

```text
REQ-7AF29D
```

و بتوانی کل جریان یک درخواست را پیدا کنی.

---

# ترتیب واقعی ساخت

پیشنهاد من این است که دقیقاً با این ترتیب جلو بروی:

1. **فاز ۱:** Requirement + Use Case + ERD  
2. **فاز ۲:** UI Design System  
3. **فاز ۳:** Auth + User + RBAC  
4. **فاز ۴:** Clinic + Branch  
5. **فاز ۵:** Doctor + Specialty  
6. **فاز ۶:** Schedule Engine  
7. **فاز ۷:** Patient  
8. **فاز ۸:** Appointment Engine  
9. **فاز ۹:** Calendar Admin  
10. **فاز ۱۰:** Patient Booking UI  
11. **فاز ۱۱:** Payment  
12. **فاز ۱۲:** Notification  
13. **فاز ۱۳:** Visit + Medical Record  
14. **فاز ۱۴:** Reports  
15. **فاز ۱۵:** i18n فارسی/انگلیسی  
16. **فاز ۱۶:** Tests  
17. **فاز ۱۷:** Docker + CI/CD  
18. **فاز ۱۸:** Deploy  
19. **فاز ۱۹:** Performance Optimization  
20. **فاز ۲۰:** Observability + Security Hardening  

---

# معماری نهایی پیشنهادی

```text
                  ┌──────────────────┐
                  │     Next.js      │
                  │ Patient + Admin  │
                  └────────┬─────────┘
                           │
                         HTTPS
                           │
                  ┌────────▼─────────┐
                  │      NestJS      │
                  │       API        │
                  └────────┬─────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
     PostgreSQL          Redis          BullMQ
          │                                 │
          │                              Workers
          │                                 │
          │                          ┌──────┴──────┐
          │                          ▼             ▼
          │                         SMS           Email
          │
          ▼
     File Storage
```

---

# عنوان مناسب برای رزومه

اگر این پروژه را درست اجرا کنی، در رزومه دیگر نمی‌نویسی:

> سیستم نوبت‌دهی پزشک

بلکه می‌توانی بنویسی:

> **Multi-Tenant Healthcare Appointment & Clinic Management Platform**

با قابلیت‌هایی مثل:

- Multi-clinic tenancy
- Doctor scheduling
- Conflict-safe appointment booking
- RBAC
- Payments
- Asynchronous notifications
- Bilingual RTL/LTR UI
- Medical records
- Reporting
- Dockerized deployment

این دیگر پروژه دانشجویی نیست؛ می‌تواند یک پروژه بسیار قوی برای **Backend / Full Stack / System Design Portfolio** باشد.
