import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { NursesModule } from './nurses/nurses.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { DoctorsModule } from './doctors/doctors.module';
import { SectorsModule } from './sectors/sectors.module';
import { CommunicationsModule } from './communications/communications.module';
import { ProceduresModule } from './procedures/procedures.module';
import { ExamOrdersModule } from './exam-orders/exam-orders.module';
import { PricingModule } from './pricing/pricing.module';
import { CbhpmModule } from './cbhpm/cbhpm.module';
import { AgreementsModule } from './agreements/agreements.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AuditModule } from './audit/audit.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    PatientsModule,
    NursesModule,
    AppointmentsModule,
    DoctorsModule,
    SectorsModule,
    CommunicationsModule,
    ProceduresModule,
    ExamOrdersModule,
    PricingModule,
    CbhpmModule,
    AgreementsModule,
    AuditModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    Reflector,
  ],
})
export class AppModule {}
