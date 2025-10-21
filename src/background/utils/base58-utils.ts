export function encodeBase58(bytes: number[]): string {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

  let num = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    num = num * BigInt(256) + BigInt(bytes[i]);
  }

  let encoded = '';
  while (num > 0) {
    encoded = alphabet[Number(num % BigInt(58))] + encoded;
    num /= BigInt(58);
  }

  // Add '1' for leading zero bytes
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    encoded = alphabet[0] + encoded;
  }

  return encoded;
}
