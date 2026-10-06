import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { ClinicsModule } from './modules/clinics/clinics.module';
import { BranchesModule } from './modules/branches/branches.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { SpecialtiesModule } from './modules/specialties/specialties.module';
import { PatientsModule } from './modules/patients/patients.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { VisitsModule } from './modules/visits/visits.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditModule } from './modules/audit/audit.module';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { ServicesModule } from './modules/services/services.module';
import { LabRequestsModule } from './modules/lab-requests/lab-requests.module';
import { WaitingListModule } from './modules/waiting-list/waiting-list.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { InsuranceModule } from './modules/insurance/insurance.module';
import { FilesModule } from './modules/files/files.module';
import { HealthModule } from './modules/health/health.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

const logger = new Logger('AppModule');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie', 'password', 'passwordHash'],
        customProps: (req) => ({
          requestId: req.id,
        }),
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get('REDIS_HOST', 'localhost');
        const port = config.get<number>('REDIS_PORT', 6379);
        logger.log(`BullMQ connection target ${host}:${port} (queues degrade if Redis is down)`);
        return {
          connection: {
            host,
            port,
            maxRetriesPerRequest: null,
            enableOfflineQueue: false,
            retryStrategy: (times: number) => (times > 3 ? null : 500),
            lazyConnect: true,
          },
        };
      },
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    RolesModule,
    ClinicsModule,
    BranchesModule,
    DoctorsModule,
    SpecialtiesModule,
    PatientsModule,
    SchedulesModule,
    AppointmentsModule,
    VisitsModule,
    PrescriptionsModule,
    PaymentsModule,
    NotificationsModule,
    ReportsModule,
    AuditModule,
    HealthModule,
    MedicalRecordsModule,
    ServicesModule,
    LabRequestsModule,
    WaitingListModule,
    ReviewsModule,
    InsuranceModule,
    FilesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
