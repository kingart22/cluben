import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "security" | "cashier" | "member";

export const useUserRole = () => {
  return useQuery({
    queryKey: ["userRole"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const { data, error } = await supabase.rpc("get_user_role", { user_id: user.id });

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }

      return (data as UserRole | null) ?? null;
    },
    enabled: true,
  });
};
