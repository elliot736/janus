import { useRef, useEffect, type CSSProperties } from "react";
import { useJanusContext } from "./context";

export interface JanusWidgetProps {
  /** Callback when verification succeeds */
  onVerify?: (token: string, riskScore: number) => void;
  /** Callback when verification fails */
  onError?: (error: string) => void;
  /** Additional CSS class name */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
}

/**
 * Managed-mode checkbox widget.
 * Renders the "I'm not a robot" challenge UI.
 *
 * ```tsx
 * <JanusWidget
 *   onVerify={(token) => setToken(token)}
 *   onError={(err) => console.error(err)}
 * />
 * ```
 */
export function JanusWidget({
  onVerify,
  onError,
  className,
  style,
}: JanusWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { instance } = useJanusContext();
  const renderedRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || renderedRef.current) return;
    renderedRef.current = true;

    // Generate a unique ID for the container
    const id = `janus-widget-${Math.random().toString(36).slice(2, 8)}`;
    el.id = id;

    // Render the SDK's built-in widget
    instance.render(id);

    // Listen for custom events dispatched by the widget
    const handleResult = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.success && onVerify) {
        onVerify(detail.token, detail.riskScore);
      } else if (!detail?.success && onError) {
        onError(detail?.error || "Verification failed");
      }
    };

    el.addEventListener("janus:verify", handleResult);
    return () => {
      el.removeEventListener("janus:verify", handleResult);
    };
  }, [instance, onVerify, onError]);

  return <div ref={containerRef} className={className} style={style} />;
}
