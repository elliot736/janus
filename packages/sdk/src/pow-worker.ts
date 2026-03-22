/**
 * Proof-of-Work Web Worker.
 *
 * Receives a message with { challenge, difficulty, signalRoot } and finds a
 * nonce such that SHA-256(challenge + nonce + signalRoot) begins with the
 * required number of leading zero hex characters (difficulty).
 *
 * Responds with { nonce, hash, iterations, timeMs }.
 */

const ctx = self as unknown as Worker;

async function sha256Hex(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, "0");
  }
  return hex;
}

function hasLeadingZeros(hash: string, difficulty: number): boolean {
  for (let i = 0; i < difficulty; i++) {
    if (hash[i] !== "0") return false;
  }
  return true;
}

ctx.addEventListener("message", async (e: MessageEvent) => {
  const { challenge, difficulty, signalRoot } = e.data as {
    challenge: string;
    difficulty: number;
    signalRoot: string;
  };

  const start = performance.now();
  let nonce = 0;

  while (true) {
    const input = challenge + nonce.toString() + signalRoot;
    const hash = await sha256Hex(input);

    if (hasLeadingZeros(hash, difficulty)) {
      const timeMs = Math.round(performance.now() - start);
      ctx.postMessage({ nonce, hash, iterations: nonce + 1, timeMs });
      return;
    }

    nonce++;

    // Yield to the event loop every 1000 iterations to prevent hanging
    if (nonce % 1000 === 0) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
});
