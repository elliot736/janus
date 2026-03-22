import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Janus, type JanusConfig } from "@janus/sdk";

interface JanusContextValue {
  instance: Janus;
  config: JanusConfig;
}

const JanusContext = createContext<JanusContextValue | null>(null);

export interface JanusProviderProps {
  config: JanusConfig;
  children: ReactNode;
}

/**
 * Provides a Janus SDK instance to all child components.
 *
 * ```tsx
 * <JanusProvider config={{ siteKey: "jns_site_live_xxx", apiUrl: "https://janus.example.com", mode: "invisible" }}>
 *   <App />
 * </JanusProvider>
 * ```
 */
export function JanusProvider({ config, children }: JanusProviderProps) {
  const value = useMemo<JanusContextValue>(
    () => ({
      instance: new Janus(config),
      config,
    }),
    [config.siteKey, config.apiUrl, config.mode],
  );

  return (
    <JanusContext.Provider value={value}>{children}</JanusContext.Provider>
  );
}

/**
 * Access the Janus SDK instance from context.
 * Must be used inside a `<JanusProvider>`.
 */
export function useJanusContext(): JanusContextValue {
  const ctx = useContext(JanusContext);
  if (!ctx) {
    throw new Error("useJanusContext must be used within a <JanusProvider>");
  }
  return ctx;
}
