import * as React from "react";

export function useLandscape() {
  const [isLandscape, setIsLandscape] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia("(orientation: landscape) and (max-height: 500px)");
    const onChange = () => setIsLandscape(mql.matches);
    mql.addEventListener("change", onChange);
    setIsLandscape(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isLandscape;
}
