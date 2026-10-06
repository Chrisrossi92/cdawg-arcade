import type { GameRegistryEntry } from '../types/game';

export const gameRegistry: GameRegistryEntry[] = [
  {
    id: 'cdawg-balance',
    title: 'Cdawg Balance',
    tagline: 'One attempt. Hold the line. Do not let Cdawg wipe out.',
    route: '/balance',
    accent: '#ff8a22',
    availability: 'released',
  },
  {
    id: 'chainshift',
    title: 'Chainshift',
    tagline: 'Connect the words. Find the shortest route.',
    route: '#arcade/chainshift',
    accent: '#b99b60',
    availability: 'candidate',
  },
];
/** Metadata alone cannot grant entry. The caller must supply the dedicated release gate. */
export const availableGames = (chainshift: boolean) => gameRegistry.filter(game => game.id !== 'chainshift' || chainshift);
