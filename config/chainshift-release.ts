/** Source-controlled containment: only an explicit local integration build exposes the game. */
export const chainshiftReleased = false;
export const chainshiftEnabled = (mode: string) => chainshiftReleased || mode === 'chainshift-integration' || mode === 'chainshift-authored-integration';
/** Ranked service and Arcade release are separate from independently gated Discord daily delivery. */
export const chainshiftServerEnabled = (env: Record<string, string | undefined>) =>
  env.CHAINSHIFT_ARCADE_ENABLED === 'true' && env.CHAINSHIFT_RANKED_ENABLED === 'true';

/** Fixed-chain mechanics are separate from legacy ranked/delivery flags. */
export const authoredServerEnabled=(env:Record<string,string|undefined>)=>env.CHAINSHIFT_ARCADE_ENABLED==='true'&&env.CHAINSHIFT_AUTHORED_ENABLED==='true'&&env.CHAINSHIFT_RANKED_ENABLED!=='true'&&env.CHAINSHIFT_DAILY_DELIVERY_ENABLED!=='true';
