import { describe, expect, it } from 'vitest';
import { normalizeDiscordUser, normalizeParticipants } from './context';

describe('Discord context normalization', () => {
  it('normalizes Discord users and avatar URLs', () => {
    const user = normalizeDiscordUser({ id: '123', username: 'cdawg', global_name: 'C Dawg', avatar: 'abc' });

    expect(user.displayName).toBe('C Dawg');
    expect(user.avatarUrl).toContain('/avatars/123/abc.png');
  });

  it('normalizes participants', () => {
    expect(normalizeParticipants([{ id: '1', username: 'one' }, { id: '2', global_name: 'Two' }]).map((user) => user.displayName)).toEqual(['one', 'Two']);
  });
});
