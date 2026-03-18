import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  DollarSign,
  Landmark,
  QrCode,
  Ship,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
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

  const completedRate = stats?.totalMembers ? Math.min(100, Math.round((stats.totalBoats / stats.totalMembers) * 100)) : 0;

  return (
    <DashboardShell
      roleLabel="Admin"
      onSignOut={signOut}
      menuItems={[
        { label: "Dashboard", to: "/dashboard", icon: Landmark },
        { label: "Sócios", to: "/members", icon: Users },
        { label: "QR", to: "/security/qr/scan", icon: QrCode },
        { label: "Financeiro", to: "/dashboard", icon: DollarSign },
      ]}
    >
      <div className="space-y-7">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <Card className="xl:col-span-6">
            <CardHeader className="pb-3">
              <CardDescription className="text-sm">Saldo atual</CardDescription>
              <CardTitle className="text-4xl tracking-tight">{formatCurrency(stats?.totalPayments || 0)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-success" />
                +8.1% comparado ao período anterior
              </div>
              <div className="flex flex-wrap gap-3">
                <Button className="rounded-2xl">
                  <ArrowUpRight className="h-4 w-4" />
                  Depositar
                </Button>
                <Button variant="secondary" className="rounded-2xl">
                  <ArrowDownLeft className="h-4 w-4" />
                  Retirar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-3">
            <CardHeader className="pb-3">
              <CardDescription>Transações hoje</CardDescription>
              <CardTitle className="text-4xl">{stats?.todayMovements || 0}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Movimentação ativa</p>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <CreditCard className="h-5 w-5" />
              </span>
            </CardContent>
          </Card>

          <Card className="xl:col-span-3">
            <CardHeader className="pb-2">
              <CardDescription>Resumo financeiro</CardDescription>
              <CardTitle className="text-2xl">{completedRate}%</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={completedRate} className="h-2.5" />
              <p className="text-xs text-muted-foreground">Cobertura de embarcações por base de sócios</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="bg-success/10 border-success/15">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Sócios ativos</p>
              <p className="mt-2 text-3xl font-semibold">{stats?.totalMembers || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-accent border-border/80">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Embarcações</p>
              <p className="mt-2 text-3xl font-semibold">{stats?.totalBoats || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Alertas pendentes</p>
              <p className="mt-2 text-3xl font-semibold">{stats?.pendingPenalties || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Fluxo operacional</p>
                  <p className="mt-2 text-3xl font-semibold">+12%</p>
                </div>
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        <DashboardCharts />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <RecentActivity entries={recentEntries} />
          </div>
          <NotificationsList />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Atalhos administrativos essenciais</CardTitle>
            <CardDescription>Use a barra lateral para navegar por sócios, QR e financeiro com um clique.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-border/80 bg-accent p-4 text-sm font-medium text-foreground">Cadastrar Sócio</div>
            <div className="rounded-2xl border border-border/80 bg-accent p-4 text-sm font-medium text-foreground">Ver Sócios</div>
            <div className="rounded-2xl border border-border/80 bg-accent p-4 text-sm font-medium text-foreground">Scanner QR</div>
            <div className="rounded-2xl border border-border/80 bg-accent p-4 text-sm font-medium text-foreground">Financeiro</div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
};

export default AdminDashboard;
