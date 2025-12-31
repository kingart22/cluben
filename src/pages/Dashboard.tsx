import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import SecurityDashboard from "@/components/dashboard/SecurityDashboard";
import CashierDashboard from "@/components/dashboard/CashierDashboard";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Se for uma conta de sócio (login via número de sócio -> email interno @clube.local),
  // redireciona diretamente para o perfil do sócio em vez do dashboard de staff.
  useEffect(() => {
    if (!authLoading && user?.email && user.email.endsWith("@clube.local")) {
      navigate("/members/profile");
    }
  }, [authLoading, user, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-ocean">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-foreground mx-auto mb-4" />
          <p className="text-primary-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !role) {
    return null;
  }

  switch (role) {
    case "admin":
      return <AdminDashboard />;
    case "security":
      return <SecurityDashboard />;
    case "cashier":
      return <CashierDashboard />;
    default:
      return <SecurityDashboard />;
  }
};

export default Dashboard;
