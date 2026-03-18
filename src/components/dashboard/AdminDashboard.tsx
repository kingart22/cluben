import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Ship, AlertTriangle, Activity, QrCode, TrendingDown, TrendingUp, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import NotificationsList from "./NotificationsList";
import RecentActivity from "./RecentActivity";
import DashboardShell from "./DashboardShell";
import DashboardCharts from "./DashboardCharts";

const AdminDashboard = () => {
  const { signOut } = useAuth();

  const [stats, setStats] = useState<{
    totalMembers: number;
    totalBoats: number;
    pendingPenalties: number;
    todayMovements: number;
  } | null>(null);

  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  useEffect(() => {
    const loadStatsAndEntries = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [membersResult, vehiclesResult, pendingPenaltiesResult, todayEntriesResult] = await Promise.all([
        supabase.from("members").select("id", { count: "exact", head: true }),
        supabase.from("vehicles").select("id", { count: "exact", head: true }),
        supabase.from("penalties").select("id", { count: "exact", head: true }).eq("payment_status", "pending"),
        supabase.from("entries").select("id", { count: "exact", head: true }).gte("entry_time", today),
      ]);

      setStats({
        totalMembers: membersResult.count || 0,
        totalBoats: vehiclesResult.count || 0,
        pendingPenalties: pendingPenaltiesResult.count || 0,
        todayMovements: todayEntriesResult.count || 0,
      });

      const { data, error } = await supabase
        .from("entries")
        .select(`
          *,
          member:members(full_name, member_number),
          vehicle:vehicles(registration_number, vehicle_type)
        `)
        .order("entry_time", { ascending: false })
        .limit(10);

      if (!error && data) {
        setRecentEntries(data);
      }
    };

    loadStatsAndEntries();
  }, []);

  const summaryCards = [
    {
      title: "Total de Sócios",
      value: stats?.totalMembers || 0,
      icon: Users,
      trend: "+4.2%",
      positive: true,
      className: "bg-primary/5 border-primary/20",
    },
    {
      title: "Embarcações",
      value: stats?.totalBoats || 0,
      icon: Ship,
      trend: "+1.6%",
      positive: true,
      className: "bg-success/10 border-success/20",
    },
    {
      title: "Multas Pendentes",
      value: stats?.pendingPenalties || 0,
      icon: AlertTriangle,
      trend: "-2.1%",
      positive: false,
      className: "bg-warning/10 border-warning/20",
    },
    {
      title: "Movimentos Hoje",
      value: stats?.todayMovements || 0,
      icon: Activity,
      trend: "+3.9%",
      positive: true,
      className: "bg-accent border-border",
    },
  ];

  return (
    <DashboardShell
      roleLabel="Admin"
      onSignOut={signOut}
      menuItems={[
        { label: "Dashboard", to: "/dashboard", icon: Activity },
        { label: "Cadastrar Sócio", to: "/members/new", icon: Users },
        { label: "Ver Sócios", to: "/members", icon: Users },
        { label: "Scanner QR", to: "/security/qr/scan", icon: QrCode },
        { label: "Financeiro", to: "/dashboard", icon: DollarSign },
      ]}
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <Card key={card.title} className={`rounded-2xl ${card.className}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                  <span>{card.title}</span>
                  <card.icon className="h-4 w-4" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-3xl font-semibold text-foreground">{card.value}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {card.positive ? <TrendingUp className="h-3.5 w-3.5 text-success" /> : <TrendingDown className="h-3.5 w-3.5 text-primary" />}
                  <span>{card.trend} vs. semana anterior</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <DashboardCharts />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <RecentActivity entries={recentEntries} />
          </div>
          <NotificationsList />
        </div>

        <Card className="rounded-2xl border-border/70 bg-background">
          <CardHeader>
            <CardTitle>Painel administrativo</CardTitle>
            <CardDescription>Os atalhos principais estão agora fixos na barra lateral</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </DashboardShell>
  );
};

export default AdminDashboard;
