import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Ghost } from "lucide-react";
import pingLogo from "@/assets/ping-logo-white.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <img src={pingLogo} alt="Ping" className="h-9 opacity-70" />
      <Ghost className="h-16 w-16 text-muted-foreground/40" />
      <div className="space-y-2">
        <h1 className="text-5xl font-bold text-foreground">404</h1>
        <p className="text-lg text-muted-foreground">
          Nothing here — Ping blinked and missed it.
        </p>
        <p className="text-sm text-muted-foreground/60 font-mono">
          {location.pathname}
        </p>
      </div>
      <div className="flex gap-3 mt-2">
        <Link
          to="/"
          className="px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Home
        </Link>
        <Link
          to="/app"
          className="px-5 py-2.5 rounded-md bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
        >
          Launch App
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
