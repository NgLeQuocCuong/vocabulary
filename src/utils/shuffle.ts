export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  const len = arr.length;
  const randomBytes = new Uint32Array(len);
  crypto.getRandomValues(randomBytes);

  for (let i = len - 1; i > 0; i--) {
    const j = randomBytes[i]! % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}
