"use client";

import Script from "next/script";

export interface JanusScriptProps {
  /** URL to the Janus SDK script (e.g., https://janus.example.com/sdk.js) */
  src: string;
  /** Loading strategy (default: afterInteractive) */
  strategy?: "beforeInteractive" | "afterInteractive" | "lazyOnload";
  /** Called when the script loads successfully */
  onLoad?: () => void;
}

/**
 * Loads the Janus SDK via Next.js Script component with optimal loading strategy.
 * Use this when you want to load the SDK from your Janus CDN instead of bundling it.
 *
 * ```tsx
 * // app/layout.tsx
 * import { JanusScript } from '@janus/nextjs';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <JanusScript src="https://janus.example.com/sdk/v1/janus.js" />
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function JanusScript({
  src,
  strategy = "afterInteractive",
  onLoad,
}: JanusScriptProps) {
  return <Script src={src} strategy={strategy} onLoad={onLoad} />;
}
