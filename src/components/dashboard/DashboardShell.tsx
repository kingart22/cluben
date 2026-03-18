import { ComponentType, ReactNode, useState } from "react";
import { Bell, Menu, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NavLink } from "@/components/NavLink";

interface MenuItem {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
}

interface DashboardShellProps {
  roleLabel: string;
  menuItems: MenuItem[];
  onSignOut: () => Promise<void>;
  children: ReactNode;
}

const DashboardShell = ({ roleLabel, menuItems, onSignOut, children }: DashboardShellProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen bg-muted/70">
      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/20 md:hidden"
          onClick={closeSidebar}
          aria-label="Fechar menu"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-72 border-r border-border bg-card shadow-ocean transition-transform duration-300 md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <div>
            <p className="text-lg font-semibold text-foreground">my sustema</p>
            <p className="text-xs text-muted-foreground">Gestão Náutica</p>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={closeSidebar}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="space-y-1 p-3">
          {menuItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end
              onClick={closeSidebar}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeClassName="bg-primary text-primary-foreground shadow-ocean"
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="md:pl-72">
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex h-full items-center gap-3 px-4 md:px-6">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>

            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar sócio, embarcação ou pagamento" className="pl-9 bg-card" />
            </div>

            <Button variant="secondary" size="icon" className="shrink-0">
              <Bell className="h-4 w-4" />
            </Button>

            <Badge variant="secondary" className="hidden md:inline-flex">
              {roleLabel}
            </Badge>

            <Button variant="default" className="shrink-0" onClick={onSignOut}>
              Sair
            </Button>
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardShell;
