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

  useEffect(() => {
    if (!authLoading && !roleLoading && role === "member") {
      navigate("/members/profile", { replace: true });
    }
  }, [authLoading, roleLoading, role, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
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
      return null;
  }
};

export default Dashboard;
