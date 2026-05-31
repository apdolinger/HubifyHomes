/**
 * useEmbedResize — auto-resize hook for iframe-embedded forms.
 *
 * When a page is loaded inside an iframe with `?embed=true`, this hook:
 *   1. Sends an initial `hubify:resize` message as soon as it mounts.
 *   2. Watches the document root with ResizeObserver and sends a fresh
 *      message whenever the height changes (intent switch, validation
 *      errors appearing, success state, etc.).
 *
 * Non-embed pages are completely unaffected — the hook returns early.
 *
 * ── Parent-page integration ──────────────────────────────────────────────
 *
 *   const iframe = document.getElementById('hubify-form');
 *   window.addEventListener('message', (event) => {
 *     // Optionally check event.origin against your Hubify domain
 *     if (event.data?.type === 'hubify:resize') {
 *       iframe.style.height = event.data.height + 'px';
 *     }
 *   });
 *
 * ────────────────────────────────────────────────────────────────────────
 */
import { useEffect } from "react";

function isEmbedMode(): boolean {
  return new URLSearchParams(window.location.search).get("embed") === "true";
}

function sendResizeMessage(): void {
  window.parent.postMessage(
    { type: "hubify:resize", height: document.documentElement.scrollHeight },
    "*"
  );
}

export function useEmbedResize(): void {
  useEffect(() => {
    if (!isEmbedMode()) return;

    sendResizeMessage();

    const observer = new ResizeObserver(() => {
      sendResizeMessage();
    });

    observer.observe(document.documentElement);

    return () => observer.disconnect();
  }, []);
}
