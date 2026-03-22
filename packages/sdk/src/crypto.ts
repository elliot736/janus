/**
 * Compute SHA-256 hex digest of a string using SubtleCrypto.
 */
export async function sha256(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Compute a simple Merkle root from an array of hex-encoded leaf hashes.
 * If the array is empty, returns the SHA-256 of an empty string.
 * Odd layers duplicate the last element before pairing.
 */
export async function merkleRoot(leaves: string[]): Promise<string> {
  if (leaves.length === 0) {
    return sha256("");
  }

  let layer = [...leaves];

  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : layer[i];
      next.push(await sha256(left + right));
    }
    layer = next;
  }

  return layer[0];
}

/**
 * Placeholder for future end-to-end encryption support.
 * Generates an ECDH P-256 key pair using SubtleCrypto.
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"],
  );
}
