import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border bg-gradient-to-b from-background to-primary/5">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-4 px-6 py-8 text-sm text-muted-foreground sm:grid-cols-3">
        <div className="text-center sm:text-left">
          <p className="font-display font-semibold text-foreground">One Higala Properties Inc.</p>
          <p className="italic">Bringing you home, the higala way</p>
        </div>
        <div className="text-center">
          <Link to="/about" className="font-medium text-primary hover:underline">About us</Link>
        </div>
        <p className="text-center sm:text-right">© {new Date().getFullYear()} One Higala Properties Inc.</p>
      </div>
    </footer>
  );
}
