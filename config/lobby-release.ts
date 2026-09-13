/** Public source gate. Ordinary production remains direct-to-Balance. */
export const lobbyReleased = false;
export const lobbyEnabled = (mode: string) => lobbyReleased || mode === 'lobby-integration';
