import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DollarSign, Landmark, QrCode, Ship, UserPlus, Users } from "lucide-react";
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
    totalPayments: number;
  } | null>(null);

  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  useEffect(() => {
    const loadStatsAndEntries = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [membersResult, vehiclesResult, pendingPenaltiesResult, todayEntriesResult, paymentsResult] = await Promise.all([
        supabase.from("members").select("id", { count: "exact", head: true }),
        supabase.from("vehicles").select("id", { count: "exact", head: true }),
        supabase.from("penalties").select("id", { count: "exact", head: true }).eq("payment_status", "pending"),
        supabase.from("entries").select("id", { count: "exact", head: true }).gte("entry_time", today),
        supabase.from("payments").select("amount").eq("payment_status", "completed"),
      ]);

      const totalPayments = paymentsResult.data?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;

      setStats({
        totalMembers: membersResult.count || 0,
        totalBoats: vehiclesResult.count || 0,
        pendingPenalties: pendingPenaltiesResult.count || 0,
        todayMovements: todayEntriesResult.count || 0,
        totalPayments,
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-AO", {
      style: "currency",
      currency: "AOA",
      minimumFractionDigits: 0,
    }).format(value);

  const fleetCoverage = stats?.totalMembers ? Math.min(100, Math.round((stats.totalBoats / stats.totalMembers) * 100)) : 0;

  return (
    <DashboardShell
      roleLabel="Admin"
      onSignOut={signOut}
      menuItems={[
        { label: "Painel", to: "/dashboard", icon: Landmark },
        { label: "Novo", to: "/members/new", icon: UserPlus },
        { label: "Sócios", to: "/members", icon: Users },
        { label: "QR", to: "/security/qr/scan", icon: QrCode },
        { label: "Caixa", to: "/dashboard", icon: DollarSign },
      ]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card className="xl:col-span-6">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Arrecadação total confirmada</CardDescription>
              <CardTitle className="text-3xl tracking-tight">{formatCurrency(stats?.totalPayments || 0)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Total de pagamentos concluídos no sistema.</p>
              <div className="flex flex-wrap gap-2">
                <Button className="rounded-xl">Registrar pagamento</Button>
                <Button variant="secondary" className="rounded-xl">
                  Validar QR
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-3">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Movimentos hoje</CardDescription>
              <CardTitle className="text-3xl">{stats?.todayMovements || 0}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Saídas e chegadas do dia</p>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Ship className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>

          <Card className="xl:col-span-3">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Cobertura da frota</CardDescription>
              <CardTitle className="text-2xl">{fleetCoverage}%</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress value={fleetCoverage} className="h-2" />
              <p className="text-xs text-muted-foreground">Relação embarcações x sócios</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="bg-success/10 border-success/15">
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Sócios ativos</p>
              <p className="mt-1 text-2xl font-semibold">{stats?.totalMembers || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-accent border-border/80">
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Embarcações</p>
              <p className="mt-1 text-2xl font-semibold">{stats?.totalBoats || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Multas pendentes</p>
              <p className="mt-1 text-2xl font-semibold">{stats?.pendingPenalties || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Entradas hoje</p>
              <p className="mt-1 text-2xl font-semibold">{stats?.todayMovements || 0}</p>
            </CardContent>
          </Card>
        </div>

        <DashboardCharts />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <RecentActivity entries={recentEntries} />
          </div>
          <NotificationsList />
        </div>
      </div>
    </DashboardShell>
  );
};

export default AdminDashboard;
