import { describe, expect, it } from 'vitest';
import { closeness } from './closeness';

describe('closeness bands', () => {
  it('match the legend: exact, up to 2, 3 to 5, beyond 5', () => {
    expect([0, 1, 2, 3, 5, 6, 24].map(closeness)).toEqual([
      'exact',
      'near',
      'near',
      'off',
      'off',
      'far',
      'far',
    ]);
  });
});
