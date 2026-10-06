import { Injectable, UnauthorizedException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { OtpService } from '../notifications/otp.service';
import { AppException } from '../../common/exceptions/app.exception';
import { DefaultRole } from '@healthcare/types';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly otp: OtpService,
  ) {}

  async register(dto: {
    email?: string;
    phone?: string;
    password: string;
    firstName: string;
    lastName: string;
    locale?: 'fa' | 'en';
  }) {
    if (!dto.email && !dto.phone) {
      throw new AppException('VALIDATION_ERROR', 'Email or phone is required');
    }

    if (dto.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) throw new AppException('EMAIL_EXISTS', 'Email already registered', HttpStatus.CONFLICT);
    }
    if (dto.phone) {
      const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (existing) throw new AppException('PHONE_EXISTS', 'Phone already registered', HttpStatus.CONFLICT);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const patientRole = await this.prisma.role.findUnique({
      where: { name: DefaultRole.PATIENT },
    });

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          locale: dto.locale ?? 'fa',
        },
      });

      await tx.patient.create({ data: { userId: created.id } });

      if (patientRole) {
        await tx.userRole.create({
          data: { userId: created.id, roleId: patientRole.id },
        });
      }

      return created;
    });

    await this.audit.log({
      actorId: user.id,
      action: 'USER_REGISTERED',
      entity: 'User',
      entityId: user.id,
    });

    return this.sanitizeUser(user);
  }

  async login(
    dto: { email?: string; phone?: string; password: string },
    meta: { ip?: string; userAgent?: string },
    res: Response,
  ) {
    const user = await this.findByCredentials(dto.email, dto.phone);
    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email/phone or password',
      });
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email/phone or password',
      });
    }

    const tokens = await this.issueTokens(user.id, meta);
    this.setAuthCookies(res, tokens);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.log({
      actorId: user.id,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });

    const profile = await this.getAuthProfile(user.id);
    return { user: profile, accessToken: tokens.accessToken };
  }

  async refresh(refreshToken: string, meta: { ip?: string; userAgent?: string }, res: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException({ code: 'NO_REFRESH_TOKEN', message: 'Refresh token missing' });
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'INVALID_REFRESH', message: 'Invalid refresh token' });
    }

    // Rotate: revoke old, issue new in same family
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(stored.userId, meta, stored.family);
    this.setAuthCookies(res, tokens);

    return { accessToken: tokens.accessToken };
  }

  async logout(refreshToken: string | undefined, res: Response, userId?: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    this.clearAuthCookies(res);
    if (userId) {
      await this.audit.log({
        actorId: userId,
        action: 'USER_LOGOUT',
        entity: 'User',
        entityId: userId,
      });
    }
    return { success: true };
  }

  async logoutAll(userId: string, res: Response) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    this.clearAuthCookies(res);
    await this.audit.log({
      actorId: userId,
      action: 'USER_LOGOUT_ALL',
      entity: 'User',
      entityId: userId,
    });
    return { success: true };
  }

  async getAuthProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
        patient: true,
        doctor: true,
        staffMemberships: true,
      },
    });
    if (!user) throw new UnauthorizedException();

    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.code)),
      ),
    ];
    const clinicIds = [
      ...new Set([
        ...user.roles.map((ur) => ur.clinicId).filter(Boolean),
        ...user.staffMemberships.map((s) => s.clinicId),
      ]),
    ] as string[];

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      locale: user.locale,
      avatarUrl: user.avatarUrl,
      roles,
      permissions,
      clinicIds,
      isSuperAdmin: roles.includes(DefaultRole.SUPER_ADMIN),
      patientId: user.patient?.id ?? null,
      doctorId: user.doctor?.id ?? null,
    };
  }

  private async findByCredentials(email?: string, phone?: string) {
    if (email) return this.prisma.user.findUnique({ where: { email } });
    if (phone) return this.prisma.user.findUnique({ where: { phone } });
    return null;
  }

  private async issueTokens(
    userId: string,
    meta: { ip?: string; userAgent?: string },
    family?: string,
  ) {
    const profile = await this.getAuthProfile(userId);
    const accessToken = this.jwt.sign({
      sub: userId,
      permissions: profile.permissions,
      roles: profile.roles,
      clinicIds: profile.clinicIds,
      isSuperAdmin: profile.isSuperAdmin,
    });

    const refreshToken = randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(refreshToken);
    const expiresIn = this.config.get('JWT_REFRESH_EXPIRES_IN', '7d');
    const days = parseInt(expiresIn) || 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        family: family || randomBytes(16).toString('hex'),
        expiresAt,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    const secure = this.config.get('COOKIE_SECURE') === 'true';
    const domain = this.config.get('COOKIE_DOMAIN');

    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
      ...(domain ? { domain } : {}),
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
      ...(domain ? { domain } : {}),
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
  }

  private sanitizeUser(user: { id: string; email: string | null; phone: string | null; firstName: string; lastName: string; locale: string }) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      locale: user.locale,
    };
  }

  async requestOtp(phone: string, purpose: 'login' | 'verify' | 'reset') {
    return this.otp.request(phone, purpose);
  }

  async verifyPhone(phone: string, code: string) {
    await this.otp.verify(phone, 'verify', code);
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) throw new AppException('USER_NOT_FOUND', 'User not found', HttpStatus.NOT_FOUND);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { phoneVerifiedAt: new Date() },
    });
    return { verified: true };
  }

  async verifyOtpOnly(phone: string, purpose: string, code: string) {
    return this.otp.verify(phone, purpose, code);
  }

  async resetPassword(phone: string, code: string, password: string) {
    await this.otp.verify(phone, 'reset', code);
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) throw new AppException('USER_NOT_FOUND', 'User not found', HttpStatus.NOT_FOUND);
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      actorId: user.id,
      action: 'PASSWORD_RESET',
      entity: 'User',
      entityId: user.id,
    });
    return { reset: true };
  }
}
