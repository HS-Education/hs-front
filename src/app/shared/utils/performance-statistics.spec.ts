import { thirdGap, weightedAverage } from './performance-statistics';

describe('performance statistics', () => {
  it('weights classroom averages by evaluated students', () => {
    expect(weightedAverage([{ score: 90, weight: 1 }, { score: 50, weight: 3 }], 5)).toBe(12);
    expect(weightedAverage([{ score: null, weight: 4 }], 5)).toBe(0);
  });

  it('compares upper and lower thirds without mutating input', () => {
    const scores = [1, 20, 5, 17, 10, 8];
    expect(thirdGap(scores)).toBe(15.5);
    expect(scores).toEqual([1, 20, 5, 17, 10, 8]);
    expect(thirdGap([19])).toBe(0);
  });
});
