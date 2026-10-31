/** Existing authored-board scoring; shared with the daily card. */
export const CARD_GUILD='1323324192627888339';
export const authoredScoreSql="500+greatest(0,500-floor(elapsed_ms/1000.0)::integer-50*(state->>'hints')::integer)";
