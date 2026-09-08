export type LaunchDecision = 'browser' | 'discord' | 'invalid';

export function getLaunchDecision(search = typeof window === 'undefined' ? '' : window.location.search): LaunchDecision {
  const params = new URLSearchParams(search);
  const required = ['frame_id', 'instance_id', 'platform'];
  if (!required.some((key) => params.has(key))) return 'browser';
  if (required.some((key) => params.getAll(key).length !== 1 || !params.get(key)?.trim())) return 'invalid';
  if (!['desktop', 'mobile'].includes(params.get('platform')!)) return 'invalid';
  return 'discord';
}
