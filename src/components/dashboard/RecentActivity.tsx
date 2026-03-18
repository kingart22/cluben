import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ArrowRight, ArrowLeft } from "lucide-react";

interface Entry {
  id: string;
  entry_time: string;
  exit_time: string | null;
  status: string;
  member: { full_name: string; member_number: string } | null;
  vehicle: { registration_number: string; vehicle_type: string } | null;
}

const RecentActivity = ({ entries }: { entries: Entry[] }) => {
  return (
    <Card className="rounded-2xl border-border/70 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Navegação recente
        </CardTitle>
        <CardDescription>Movimentos de saída e chegada</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border/80 text-left text-muted-foreground">
                <th className="px-3 py-3 font-medium">Sócio</th>
                <th className="px-3 py-3 font-medium">Embarcação</th>
                <th className="px-3 py-3 font-medium">Movimento</th>
                <th className="px-3 py-3 font-medium">Hora</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-center text-muted-foreground" colSpan={4}>
                    Sem atividade recente
                  </td>
                </tr>
              )}
              {entries.map((entry) => {
                const isDeparture = entry.status === "inside";
                return (
                  <tr key={entry.id} className="border-b border-border/50 transition-colors hover:bg-accent">
                    <td className="px-3 py-3 font-medium text-foreground">{entry.member?.full_name || "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {entry.vehicle?.vehicle_type === "jet_ski" ? "Jet Ski" : "Barco"} • {entry.vehicle?.registration_number || "—"}
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={isDeparture ? "default" : "outline"} className="gap-1">
                        {isDeparture ? <ArrowRight className="h-3 w-3" /> : <ArrowLeft className="h-3 w-3" />}
                        {isDeparture ? "Saída" : "Chegada"}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {new Date(entry.entry_time).toLocaleTimeString("pt-AO", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
