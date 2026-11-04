import { useEffect, useRef } from "react";

/**
 * Live status badge from Tools by Socialocca: the same UptimeRobot monitoring as
 * https://tools.socialocca.io/status. Loads https://tools.socialocca.io/badge.js
 * in the browser; it shows nothing if this site isn't monitored.
 */
export function SocialoccaStatus({ theme = "dark" }: { theme?: "dark" | "light" | "auto" }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const slot = ref.current;
    if (!slot) return;
    const script = document.createElement("script");
    script.src = "https://tools.socialocca.io/badge.js";
    script.async = true;
    if (theme !== "light") script.dataset.theme = theme;
    slot.appendChild(script);
    return () => slot.replaceChildren();
  }, [theme]);
  return <span ref={ref} className="inline-flex align-middle" />;
}
