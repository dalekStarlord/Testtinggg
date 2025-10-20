import { Link, NavLink } from "react-router-dom";
import { buttonVariants } from "./ui/button";
import { cn } from "../lib/utils";

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-md px-3 py-2 text-sm font-medium transition",
    isActive
      ? "bg-primary text-primary-foreground shadow"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );

const TopBar = () => {
  return (
    <header className="border-b bg-card/60 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          OTP Trip Planner
        </Link>
        <nav className="flex items-center gap-2">
          <NavLink to="/" className={navLinkClasses} end>
            Trip Planner
          </NavLink>
          <NavLink to="/routes" className={navLinkClasses}>
            Routes Browser
          </NavLink>
          <a
            href="https://91e22e78a863.ngrok-free.app/otp/gtfs/v1"
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline" })}
          >
            GraphQL Endpoint
          </a>
        </nav>
      </div>
    </header>
  );
};

export default TopBar;
