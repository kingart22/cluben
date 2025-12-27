import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const NotificationsList = () => {
  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card className="shadow-ocean">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notificações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notifications?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Sem notificações</p>
          )}
          {notifications?.map((notif) => (
            <div key={notif.id} className="p-3 rounded-lg border border-border hover:shadow-ocean transition-all">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-medium text-sm">{notif.title}</p>
                <Badge variant={notif.read ? "outline" : "default"} className="text-xs">
                  {notif.read ? "Lida" : "Nova"}
                </Badge>
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
