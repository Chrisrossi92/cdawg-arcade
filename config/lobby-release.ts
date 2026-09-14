/** Public source gate. Release B makes the Arcade lobby the production entry. */
export const lobbyReleased = true;
export const lobbyEnabled = (mode: string) => lobbyReleased || mode === 'lobby-integration';
