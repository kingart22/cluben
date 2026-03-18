import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const NotificationsList = () => {
  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card className="rounded-2xl border-border/70 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações
        </CardTitle>
        <CardDescription>Alertas e eventos importantes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {notifications?.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Sem notificações</p>}
          {notifications?.map((notif) => (
            <div key={notif.id} className="rounded-xl border border-border/70 bg-background p-3.5 transition-colors hover:bg-accent">
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{notif.title}</p>
                <Badge variant={notif.read ? "outline" : "default"}>{notif.read ? "Lida" : "Nova"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{notif.message}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationsList;
