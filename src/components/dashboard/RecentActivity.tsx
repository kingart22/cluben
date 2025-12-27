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
    <Card className="shadow-ocean">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Atividade Recente
        </CardTitle>
        <CardDescription>Últimas movimentações registradas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Sem atividade recente</p>
          )}
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:shadow-ocean transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  entry.status === 'inside' ? 'bg-success/10' : 'bg-warning/10'
                }`}>
                  {entry.status === 'inside' ? (
                    <ArrowRight className="w-5 h-5 text-success" />
                  ) : (
                    <ArrowLeft className="w-5 h-5 text-warning" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">{entry.member?.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {entry.vehicle?.vehicle_type === 'jet_ski' ? 'Jet Ski' : 'Barco'} • {entry.vehicle?.registration_number}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant={entry.status === 'inside' ? 'success' : 'outline'}>
                  {entry.status === 'inside' ? 'Entrada' : 'Saída'}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(entry.entry_time).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
