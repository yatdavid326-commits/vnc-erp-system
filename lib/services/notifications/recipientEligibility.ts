export interface NotificationRecipientProfile {
  auth_id: string | null;
  is_active: boolean | null;
  role: string | null;
}

export function isEligibleNotificationRecipient(
  profile: NotificationRecipientProfile | undefined,
  hasInventoryViewPermission: boolean
): boolean {
  return (
    profile?.is_active === true &&
    typeof profile.auth_id === 'string' &&
    (profile.role === 'admin' || hasInventoryViewPermission)
  );
}
