import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './infra/prisma/prisma.module';
import { AgreementsModule } from './modules/agreements/agreements.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { AuditInterceptor } from './modules/audit/audit.interceptor';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { BillingGuidesModule } from './modules/billing-guides/billing-guides.module';
import { BudgetEstimatesModule } from './modules/budget-estimates/budget-estimates.module';
import { CbhpmModule } from './modules/cbhpm/cbhpm.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { ExamOrdersModule } from './modules/exam-orders/exam-orders.module';
import { NursesModule } from './modules/nurses/nurses.module';
import { PatientsModule } from './modules/patients/patients.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { ProceduresModule } from './modules/procedures/procedures.module';
import { SectorsModule } from './modules/sectors/sectors.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('throttle.ttl') ?? 60000,
          limit: configService.get<number>('throttle.limit') ?? 120,
        },
      ],
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
    BillingGuidesModule,
    BudgetEstimatesModule,
    AuditModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
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
