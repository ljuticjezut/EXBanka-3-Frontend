import { useAuthStore } from '../stores/auth'

export function usePermissions() {
  const auth = useAuthStore()
  return {
    isAdmin:              () => auth.isAdmin(),
    canCreate:            () => auth.hasPermission('employee.create'),
    canRead:              () => auth.hasPermission('employee.read'),
    canUpdate:            () => auth.hasPermission('employee.update'),
    canActivate:          () => auth.hasPermission('employee.activate'),
    canManagePermissions: () => auth.hasPermission('employee.permissions'),
  }
}
