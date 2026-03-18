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
          className="fixed inset-0 z-40 bg-foreground/10 md:hidden"
          onClick={closeSidebar}
          aria-label="Fechar menu"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-24 border-r border-border/80 bg-background transition-transform duration-300 md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border/80 px-3 md:justify-center">
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">my sustema</p>
            <p className="text-[10px] text-muted-foreground">Gestão Náutica</p>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={closeSidebar}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="space-y-2 px-2 py-4">
          {menuItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end
              onClick={closeSidebar}
              className="group flex flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
              activeClassName="bg-primary text-primary-foreground shadow-ocean [&>span:first-child]:border-primary/20 [&>span:first-child]:bg-primary [&>span:first-child_svg]:text-primary-foreground"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-background/80 transition-colors group-hover:border-border/90 group-hover:bg-background/90">
                <item.icon className="h-4 w-4" />
              </span>
              <span className="text-center leading-tight">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="md:pl-24">
        <header className="sticky top-0 z-30 h-16 border-b border-border/80 bg-background/90 backdrop-blur-xl">
          <div className="flex h-full items-center gap-2 px-4 md:px-6">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>

            <div className="min-w-fit">
              <h1 className="text-base font-semibold text-foreground">Dashboard</h1>
              <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
            </div>

            <div className="hidden items-center gap-1 lg:flex">
              <Button variant="ghost" size="sm" className="rounded-lg px-2 text-muted-foreground hover:text-foreground">
                Operações
              </Button>
              <Button variant="ghost" size="sm" className="rounded-lg px-2 text-muted-foreground hover:text-foreground">
                Embarcações
              </Button>
              <Button variant="ghost" size="sm" className="rounded-lg px-2 text-muted-foreground hover:text-foreground">
                Pagamentos
              </Button>
            </div>

            <div className="relative ml-auto w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar"
                className="h-10 rounded-xl border-border/80 bg-card pl-9 text-sm shadow-ocean focus-visible:ring-primary/30"
              />
            </div>

            <Button variant="secondary" size="icon" className="shrink-0 rounded-xl">
              <Bell className="h-4 w-4" />
            </Button>

            <Badge variant="outline" className="hidden rounded-lg px-2.5 py-1 md:inline-flex">
              {roleLabel}
            </Badge>

            <Button variant="ghost" size="icon" className="hidden rounded-full md:inline-flex">
              <UserCircle2 className="h-5 w-5" />
            </Button>

            <Button variant="default" className="shrink-0 rounded-xl" onClick={onSignOut}>
              Sair
            </Button>
          </div>
        </header>

        <main className="space-y-6 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardShell;
