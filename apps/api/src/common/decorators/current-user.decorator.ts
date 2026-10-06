import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  permissions: string[];
  roles: string[];
  clinicIds: string[];
  isSuperAdmin: boolean;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export const ClinicId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string | undefined => {
  const request = ctx.switchToHttp().getRequest();
  return (
    request.headers['x-clinic-id'] ||
    request.query.clinicId ||
    request.body?.clinicId
  );
});
