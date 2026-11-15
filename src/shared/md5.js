/**
 * MD5 of a string (as UTF-8), as lowercase hex.
 *
 * Only used to name an image for GBIF's image cache: its URLs identify a media
 * item by the MD5 of its source URL. This is an identifier, not security, and
 * the browser's Web Crypto does not offer MD5.
 */
// 4 rounds of 16 steps, each round repeating its four shifts four times.
const ROUND_SHIFTS = [
  [7, 12, 17, 22],
  [5, 9, 14, 20],
  [4, 11, 16, 23],
  [6, 10, 15, 21]
];
const S = ROUND_SHIFTS.flatMap((round) => Array.from({ length: 16 }, (_, i) => round[i % 4]));
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

const rotateLeft = (x, n) => ((x << n) | (x >>> (32 - n))) >>> 0;

export function md5(input) {
  const bytes = new TextEncoder().encode(String(input));
  const length = bytes.length;
  const blockCount = ((length + 8) >> 6) + 1;
  const words = new Uint32Array(blockCount * 16);
  for (let i = 0; i < length; i += 1) words[i >> 2] |= bytes[i] << ((i % 4) * 8);
  words[length >> 2] |= 0x80 << ((length % 4) * 8);
  words[blockCount * 16 - 2] = (length * 8) >>> 0;
  words[blockCount * 16 - 1] = Math.floor((length * 8) / 2 ** 32);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let block = 0; block < blockCount; block += 1) {
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    for (let i = 0; i < 64; i += 1) {
      let f;
      let g;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      const sum = (f + a + K[i] + words[block * 16 + g]) >>> 0;
      a = d;
      d = c;
      c = b;
      b = (b + rotateLeft(sum, S[i])) >>> 0;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  return [a0, b0, c0, d0]
    .map((word) =>
      Array.from({ length: 4 }, (_, i) => ((word >>> (i * 8)) & 0xff).toString(16).padStart(2, '0')).join('')
    )
    .join('');
}
