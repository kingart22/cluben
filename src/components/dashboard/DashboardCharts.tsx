import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const activityData = [
  { day: "Seg", value: 120000 },
  { day: "Ter", value: 145000 },
  { day: "Qua", value: 132000 },
  { day: "Qui", value: 165000 },
  { day: "Sex", value: 178000 },
  { day: "Sáb", value: 151000 },
  { day: "Dom", value: 139000 },
];

const statusData = [
  { name: "Positivo", value: 68 },
  { name: "Estável", value: 24 },
  { name: "Alerta", value: 8 },
];

const DashboardCharts = () => {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <Card className="xl:col-span-8">
        <CardHeader>
          <CardTitle className="text-xl">Atividade financeira</CardTitle>
          <CardDescription>Linha suave com leitura premium</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis dataKey="day" className="fill-muted-foreground" tickLine={false} axisLine={false} />
              <YAxis className="fill-muted-foreground" tickLine={false} axisLine={false} width={54} />
              <Tooltip
                contentStyle={{
                  borderRadius: 16,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--background))",
                  boxShadow: "var(--shadow-ocean)",
                }}
              />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.4} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="xl:col-span-4">
        <CardHeader>
          <CardTitle className="text-xl">Progresso</CardTitle>
          <CardDescription>Indicador circular de desempenho</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                innerRadius={62}
                outerRadius={92}
                paddingAngle={4}
                isAnimationActive
              >
                <Cell fill="hsl(var(--primary))" />
                <Cell fill="hsl(var(--accent))" />
                <Cell fill="hsl(var(--destructive))" />
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 16,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--background))",
                  boxShadow: "var(--shadow-ocean)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardCharts;
