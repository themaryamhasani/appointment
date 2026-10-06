# Authorization

Permission-based RBAC.

Roles are collections of permissions. Controllers use `@RequirePermissions(...)`.

Default roles: `SUPER_ADMIN`, `CLINIC_ADMIN`, `BRANCH_ADMIN`, `DOCTOR`, `SECRETARY`, `FINANCE`, `PATIENT`.

Super admins bypass permission and tenant checks.

Staff roles are scoped via `UserRole.clinicId` and `ClinicStaff`.
