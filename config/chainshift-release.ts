/** Source-controlled containment: only an explicit local integration build exposes the game. */
export const chainshiftReleased = false;
export const chainshiftEnabled = (mode: string) => chainshiftReleased || mode === 'chainshift-integration';
/** Ranked service and Arcade release are separate from Discord delivery (which has no live adapter). */
export const chainshiftServerEnabled = (env: Record<string, string | undefined>) =>
  env.CHAINSHIFT_ARCADE_ENABLED === 'true' && env.CHAINSHIFT_RANKED_ENABLED === 'true';
