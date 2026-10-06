/** Discord's documented Activity deep link. The marker is navigation, never authority. */
export const CHAINSHIFT_ACTIVITY_CUSTOM_ID = 'chainshift-today-v1';
export type ActivityLaunchHint = 'chainshift-today';
export function activityLaunchHint(customId: unknown): ActivityLaunchHint | undefined {
  return customId === CHAINSHIFT_ACTIVITY_CUSTOM_ID ? 'chainshift-today' : undefined;
}
export function chainshiftActivityUrl(applicationId: string): string {
  if (!/^[1-9][0-9]{16,19}$/.test(applicationId)) throw new Error('Invalid Activity application');
  return `https://discord.com/activities/${applicationId}?custom_id=${CHAINSHIFT_ACTIVITY_CUSTOM_ID}`;
}
