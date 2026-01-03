import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Anchor, LogOut, DollarSign, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const CashierDashboard = () => {
  const { signOut } = useAuth();

  const { data: financialStats } = useQuery({
    queryKey: ["cashierFinancialStats"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const [todayPaymentsResult, pendingPenaltiesResult, monthlyFeesResult] = await Promise.all([
        supabase.from("payments").select("amount")
          .gte("payment_date", today),
        supabase.from("penalties").select("total_amount")
          .eq("payment_status", "pending"),
        supabase.from("payments").select("amount")
          .eq("payment_type", "monthly_fee")
          .gte("payment_date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-ocean sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center shadow-glow">
              <Anchor className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Clube Náutico 1º de Agosto</h1>
              <Badge variant="secondary" className="text-xs uppercase tracking-wide">Caixa</Badge>
            </div>
          </div>
          <Button onClick={signOut} variant="secondary" size="sm" className="rounded-full px-4">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-ocean hover:shadow-float transition-all duration-300 border-l-4 border-l-success">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Arrecadação Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{formatCurrency(financialStats?.todayTotal || 0)}</div>
            </CardContent>
          </Card>

          <Card className="shadow-ocean hover:shadow-float transition-all duration-300 border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Quotas do Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(financialStats?.monthlyFeesTotal || 0)}</div>
            </CardContent>
          </Card>

          <Card className="shadow-ocean hover:shadow-float transition-all duration-300 border-l-4 border-l-warning">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Multas Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{financialStats?.pendingCount || 0}</div>
            </CardContent>
          </Card>

          <Card className="shadow-ocean hover:shadow-float transition-all duration-300 border-l-4 border-l-destructive">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Total a Receber
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(financialStats?.pendingPenaltiesTotal || 0)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Payments */}
        <Card className="shadow-ocean">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pagamentos Recentes
            </CardTitle>
            <CardDescription>Últimas transações registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPayments?.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:shadow-ocean transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      payment.payment_type === 'monthly_fee' ? 'bg-primary/10' : 'bg-warning/10'
                    }`}>
                      <DollarSign className={`w-5 h-5 ${
                        payment.payment_type === 'monthly_fee' ? 'text-primary' : 'text-warning'
                      }`} />
                    </div>
                    <div>
                      <p className="font-semibold">{payment.member?.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.payment_type === 'monthly_fee' ? 'Quota Mensal' : 'Multa'} • {payment.member?.member_number}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-success">{formatCurrency(Number(payment.amount))}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payment.payment_date).toLocaleDateString('pt-AO')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card className="shadow-ocean">
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
              <CardDescription>Gerenciar pagamentos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="ocean" className="w-full">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Registrar Pagamento
                </Button>
                <Button variant="sunset" className="w-full">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Fechar Caixa
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CashierDashboard;
