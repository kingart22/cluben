import { ComponentType, ReactNode, useState } from "react";
import { Bell, ChevronDown, Globe2, Menu, Search, UserCircle2, X } from "lucide-react";
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
        className={`fixed left-0 top-0 z-50 h-screen w-[110px] border-r border-border/80 bg-background transition-transform duration-300 md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-border/80 px-4 md:justify-center">
          <div className="text-center">
            <p className="text-base font-semibold text-foreground">Nautic</p>
            <p className="text-[11px] text-muted-foreground">Fintech ERP</p>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={closeSidebar}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="space-y-3 px-3 py-5">
          {menuItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end
              onClick={closeSidebar}
              className="group flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[11px] font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
              activeClassName="bg-primary text-primary-foreground shadow-ocean [&>span:first-child]:border-primary/20 [&>span:first-child]:bg-primary [&>span:first-child_svg]:text-primary-foreground"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-background/80 transition-colors group-hover:border-border/90 group-hover:bg-background/90">
                <item.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="text-center leading-tight">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="md:pl-[110px]">
        <header className="sticky top-0 z-30 h-20 border-b border-border/80 bg-background/90 backdrop-blur-xl">
          <div className="flex h-full items-center gap-3 px-5 md:px-8">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>

            <div className="min-w-fit">
              <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>

            <div className="hidden items-center gap-1.5 lg:flex">
              <Button variant="ghost" size="sm" className="rounded-xl px-3 text-muted-foreground hover:text-foreground">
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" className="rounded-xl px-3 text-muted-foreground hover:text-foreground">
                Compras
              </Button>
              <Button variant="ghost" size="sm" className="rounded-xl px-3 text-muted-foreground hover:text-foreground">
                Notícias
              </Button>
            </div>

            <div className="relative ml-auto w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar"
                className="h-11 rounded-2xl border-border/80 bg-card pl-9 text-sm shadow-ocean focus-visible:ring-primary/30"
              />
            </div>

            <Button variant="secondary" size="sm" className="hidden rounded-2xl px-3 md:inline-flex">
              <Globe2 className="h-4 w-4" />
              PT
              <ChevronDown className="h-4 w-4 opacity-70" />
            </Button>

            <Button variant="secondary" size="icon" className="shrink-0 rounded-2xl">
              <Bell className="h-4 w-4" />
            </Button>

            <Badge variant="outline" className="hidden rounded-xl px-3 py-1.5 md:inline-flex">
              {roleLabel}
            </Badge>

            <Button variant="ghost" size="icon" className="hidden rounded-full md:inline-flex">
              <UserCircle2 className="h-6 w-6" />
            </Button>

            <Button variant="default" className="shrink-0 rounded-2xl" onClick={onSignOut}>
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
