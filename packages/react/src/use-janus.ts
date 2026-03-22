import { useState, useCallback } from "react";
import type { VerifyResult } from "@janus/sdk";
import { useJanusContext } from "./context";

interface UseJanusReturn {
  /** Run the full verification flow */
  execute: () => Promise<VerifyResult>;
  /** The most recent verification result */
  result: VerifyResult | null;
  /** Whether a verification is currently in progress */
  loading: boolean;
  /** Error message if the last verification failed */
  error: string | null;
  /** Reset state to initial values */
  reset: () => void;
}

/**
 * Hook for executing Janus verification in any component.
 *
 * ```tsx
 * function LoginForm() {
 *   const { execute, loading, result, error } = useJanus();
 *
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     const verification = await execute();
 *     if (verification.success) {
 *       // Submit form with verification.token
 *     }
 *   };
 * }
 * ```
 */
export function useJanus(): UseJanusReturn {
  const { instance } = useJanusContext();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (): Promise<VerifyResult> => {
    setLoading(true);
    setError(null);
    try {
      const res = await instance.execute();
      setResult(res);
      if (!res.success) {
        setError(res.error ?? "Verification failed");
      }
      return res;
    } catch (err) {
      const message = (err as Error).message || "Verification error";
      setError(message);
      const failResult: VerifyResult = {
        success: false,
        token: "",
        riskScore: -1,
        action: "block",
      };
      setResult(failResult);
      return failResult;
    } finally {
      setLoading(false);
    }
  }, [instance]);

  const reset = useCallback(() => {
    setResult(null);
    setLoading(false);
    setError(null);
  }, []);

  return { execute, result, loading, error, reset };
}
