export function weightedAverage(
  groups: readonly { score: number | null; weight: number }[],
  scale = 1,
): number {
  const valid = groups.filter(group => group.score !== null && group.weight > 0);
  const totalWeight = valid.reduce((sum, group) => sum + group.weight, 0);
  if (!totalWeight) return 0;
  return valid.reduce((sum, group) => sum + (group.score ?? 0) * group.weight, 0) / totalWeight / scale;
}

export function thirdGap(scores: readonly number[]): number {
  if (scores.length < 2) return 0;
  const ordered = [...scores].sort((a, b) => b - a);
  const size = Math.ceil(ordered.length / 3);
  const mean = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.max(0, mean(ordered.slice(0, size)) - mean(ordered.slice(-size)));
}
