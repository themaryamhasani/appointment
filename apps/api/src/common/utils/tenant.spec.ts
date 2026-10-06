import { TenantAccessException } from '../exceptions/app.exception';
import { assertClinicAccess } from './helpers';
import { AuthUser } from '../decorators/current-user.decorator';

describe('Tenant isolation', () => {
  const clinicA = '11111111-1111-1111-1111-111111111111';
  const clinicB = '22222222-2222-2222-2222-222222222222';

  const staffA: AuthUser = {
    id: 'user-a',
    permissions: [],
    roles: ['CLINIC_ADMIN'],
    clinicIds: [clinicA],
    isSuperAdmin: false,
  };

  const superAdmin: AuthUser = {
    id: 'super',
    permissions: [],
    roles: ['SUPER_ADMIN'],
    clinicIds: [],
    isSuperAdmin: true,
  };

  it('allows access to own clinic', () => {
    expect(() => assertClinicAccess(staffA, clinicA)).not.toThrow();
  });

  it('denies access to other clinic', () => {
    expect(() => assertClinicAccess(staffA, clinicB)).toThrow(TenantAccessException);
  });

  it('allows super admin to any clinic', () => {
    expect(() => assertClinicAccess(superAdmin, clinicB)).not.toThrow();
  });
});
