import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole, UserRole } from "@/hooks/useUserRole";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

const roleHome: Record<UserRole, string> = {
  admin: "/dashboard",
  cashier: "/dashboard",
  security: "/dashboard",
  member: "/members/profile",
};

const RoleGuard = ({ allowedRoles, children }: RoleGuardProps) => {
  const { user, loading: authLoading } = useAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!role) {
    return <Navigate to="/auth" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={roleHome[role]} replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
