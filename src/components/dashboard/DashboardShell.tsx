import { ComponentType, ReactNode, useState } from "react";
import { Bell, Menu, Search, UserCircle2, X } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/15 md:hidden"
          onClick={closeSidebar}
          aria-label="Fechar menu"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-72 border-r border-border/80 bg-background transition-transform duration-300 md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-border/80 px-6">
          <div>
            <p className="text-lg font-semibold text-foreground">my sustema</p>
            <p className="text-xs text-muted-foreground">Gestão Náutica Premium</p>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={closeSidebar}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="space-y-1 px-3 py-5">
          {menuItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end
              onClick={closeSidebar}
              className="flex items-center gap-3 rounded-xl border-l-2 border-l-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
              activeClassName="border-l-primary bg-accent text-foreground"
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="md:pl-72">
        <header className="sticky top-0 z-30 h-20 border-b border-border/80 bg-background/95 backdrop-blur">
          <div className="flex h-full items-center gap-3 px-5 md:px-8">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>

            <div>
              <h1 className="text-xl font-semibold text-foreground">Painel de Gestão</h1>
              <p className="text-xs text-muted-foreground">Operação clara, rápida e em tempo real</p>
            </div>

            <div className="relative ml-auto w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar sócio, embarcação ou pagamento" className="h-11 rounded-xl border-border/80 bg-background pl-9" />
            </div>

            <Button variant="secondary" size="icon" className="shrink-0">
              <Bell className="h-4 w-4" />
            </Button>

            <Badge variant="outline" className="hidden rounded-lg px-3 py-1.5 md:inline-flex">
              {roleLabel}
            </Badge>

            <Button variant="ghost" size="icon" className="hidden rounded-full md:inline-flex">
              <UserCircle2 className="h-6 w-6" />
            </Button>

            <Button className="shrink-0" onClick={onSignOut}>
              Sair
            </Button>
          </div>
        </header>

        <main className="space-y-8 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
};

export default DashboardShell;
