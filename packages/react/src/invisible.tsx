import { useEffect } from "react";
import { useJanus } from "./use-janus";

export interface JanusInvisibleProps {
  /** Callback with the token when verification completes */
  onVerify: (token: string, riskScore: number) => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Whether to auto-execute on mount (default: true) */
  autoExecute?: boolean;
}

/**
 * Invisible-mode component that auto-verifies on mount.
 * No UI rendered — runs the full verification flow in the background.
 *
 * ```tsx
 * <JanusInvisible
 *   onVerify={(token) => {
 *     document.querySelector('[name=janus-token]').value = token;
 *   }}
 * />
 * ```
 */
export function JanusInvisible({
  onVerify,
  onError,
  autoExecute = true,
}: JanusInvisibleProps) {
  const { execute } = useJanus();

  useEffect(() => {
    if (!autoExecute) return;

    execute().then((result) => {
      if (result.success) {
        onVerify(result.token, result.riskScore);
      } else if (onError) {
        onError(result.error ?? "Verification failed");
      }
    });
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoExecute]);

  return null;
}
