import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Anchor,
  LogOut,
  Users,
  Ship,
  DollarSign,
  AlertTriangle,
  Settings,
  Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import NotificationsList from "./NotificationsList";
import RecentActivity from "./RecentActivity";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<{
    totalMembers: number;
    totalVehicles: number;
    pendingPenalties: number;
    todayEntries: number;
  } | null>(null);

  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  useEffect(() => {
    const loadStatsAndEntries = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [membersResult, vehiclesResult, pendingPenaltiesResult, todayEntriesResult] =
        await Promise.all([
          supabase.from("members").select("id", { count: "exact", head: true }),
          supabase.from("vehicles").select("id", { count: "exact", head: true }),
          supabase
            .from("penalties")
            .select("id", { count: "exact", head: true })
            .eq("payment_status", "pending"),
          supabase
            .from("entries")
            .select("id", { count: "exact", head: true })
            .gte("entry_time", today),
        ]);

      setStats({
        totalMembers: membersResult.count || 0,
        totalVehicles: vehiclesResult.count || 0,
        pendingPenalties: pendingPenaltiesResult.count || 0,
        todayEntries: todayEntriesResult.count || 0,
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-ocean shadow-ocean sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gradient-sunset flex items-center justify-center shadow-glow">
                <Anchor className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary-foreground">
                  Clube Náutico 1º de Agosto
                </h1>
                <Badge variant="secondary" className="text-xs">
                  Administrador
                </Badge>
              </div>
            </div>
            <Button
              onClick={signOut}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-ocean hover:shadow-float transition-all duration-300 border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total de Membros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {stats?.totalMembers || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-ocean hover:shadow-float transition-all duration-300 border-l-4 border-l-secondary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Ship className="w-4 h-4" />
                Veículos Registrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">
                {stats?.totalVehicles || 0}
              </div>
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
              <div className="text-3xl font-bold text-warning">
                {stats?.pendingPenalties || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-ocean hover:shadow-float transition-all duration-300 border-l-4 border-l-success">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Entradas Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                {stats?.todayEntries || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity - Takes 2 columns */}
          <div className="lg:col-span-2">
            <RecentActivity entries={recentEntries || []} />
          </div>

          {/* Notifications - Takes 1 column */}
          <div className="lg:col-span-1">
            <NotificationsList />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card className="shadow-ocean">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Ações Rápidas
              </CardTitle>
              <CardDescription>Gerenciar sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="ocean"
                  className="w-full"
                  onClick={() => navigate("/members/profile")}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Perfil de Sócios
                </Button>
                <Button variant="ocean" className="w-full">
                  <Ship className="w-4 h-4 mr-2" />
                  Gerenciar Veículos
                </Button>
                <Button variant="sunset" className="w-full">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Relatórios Financeiros
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
