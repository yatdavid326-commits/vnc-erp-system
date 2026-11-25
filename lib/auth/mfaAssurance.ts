export function requiresAal2(
  claimAal: unknown,
  currentLevel: unknown,
  nextLevel: unknown
): boolean {
  return (
    (claimAal === 'aal1' || claimAal == null) &&
    (currentLevel === 'aal1' || currentLevel == null) &&
    nextLevel === 'aal2'
  );
}
