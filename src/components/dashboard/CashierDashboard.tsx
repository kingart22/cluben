import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CheckCircle, Activity, ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardShell from "./DashboardShell";

const CashierDashboard = () => {
  const { signOut } = useAuth();

  const { data: financialStats } = useQuery({
    queryKey: ["cashierFinancialStats"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];

      const [todayPaymentsResult, pendingPenaltiesResult, monthlyFeesResult] = await Promise.all([
        supabase.from("payments").select("amount").gte("payment_date", today),
        supabase.from("penalties").select("total_amount").eq("payment_status", "pending"),
        supabase
          .from("payments")
          .select("amount")
          .eq("payment_type", "monthly_fee")
          .gte("payment_date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);

      const todayTotal = todayPaymentsResult.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const pendingTotal = pendingPenaltiesResult.data?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0;
      const monthlyTotal = monthlyFeesResult.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      return {
        todayTotal,
        pendingPenaltiesTotal: pendingTotal,
        monthlyFeesTotal: monthlyTotal,
        pendingCount: pendingPenaltiesResult.data?.length || 0,
      };
    },
  });

  const { data: recentPayments } = useQuery({
    queryKey: ["recentPayments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          member:members(full_name, member_number)
        `)
        .order("payment_date", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-AO", {
      style: "currency",
      currency: "AOA",
      minimumFractionDigits: 0,
    }).format(value);

  return (
    <DashboardShell
      roleLabel="Caixa"
      onSignOut={signOut}
      menuItems={[
        { label: "Dashboard", to: "/dashboard", icon: Activity },
        { label: "Ver Sócios", to: "/members", icon: CheckCircle },
      ]}
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-2xl bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Arrecadação hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(financialStats?.todayTotal || 0)}</p>
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowUpRight className="h-3.5 w-3.5 text-success" />
                tendência positiva
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl bg-success/10 border-success/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Taxa mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(financialStats?.monthlyFeesTotal || 0)}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl bg-warning/10 border-warning/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Multas pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-foreground">{financialStats?.pendingCount || 0}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl bg-accent border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total a receber</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-foreground">
                {formatCurrency(financialStats?.pendingPenaltiesTotal || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border-border/70 bg-card">
          <CardHeader>
            <CardTitle>Pagamentos recentes</CardTitle>
            <CardDescription>Visual limpo para conferência rápida</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-border/80 text-left text-muted-foreground">
                    <th className="px-3 py-3 font-medium">Sócio</th>
                    <th className="px-3 py-3 font-medium">Tipo</th>
                    <th className="px-3 py-3 font-medium">Data</th>
                    <th className="px-3 py-3 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments?.map((payment) => (
                    <tr key={payment.id} className="border-b border-border/50 transition-colors hover:bg-accent">
                      <td className="px-3 py-3 font-medium text-foreground">{payment.member?.full_name}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {payment.payment_type === "monthly_fee" ? "Taxa Mensal" : "Multa"}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {new Date(payment.payment_date).toLocaleDateString("pt-AO")}
                      </td>
                      <td className="px-3 py-3 font-semibold text-foreground">{formatCurrency(Number(payment.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-card">
          <CardHeader>
            <CardTitle>Ações rápidas</CardTitle>
            <CardDescription>Operações do caixa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Button>
                <CheckCircle className="mr-2 h-4 w-4" />
                Registrar pagamento
              </Button>
              <Button variant="secondary">
                <DollarSign className="mr-2 h-4 w-4" />
                Fechar caixa
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
};

export default CashierDashboard;
