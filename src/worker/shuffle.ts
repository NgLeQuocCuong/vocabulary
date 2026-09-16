export function shuffleIds(ids: Int32Array): Int32Array {
  const arr = new Int32Array(ids);
  const len = arr.length;
  const randomBytes = new Uint32Array(len);
  crypto.getRandomValues(randomBytes);

  for (let i = len - 1; i > 0; i--) {
    const j = randomBytes[i]! % (i + 1);
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }

  return arr;
}
