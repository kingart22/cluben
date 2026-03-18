import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const revenueData = [
  { day: "Seg", value: 120000 },
  { day: "Ter", value: 145000 },
  { day: "Qua", value: 132000 },
  { day: "Qui", value: 165000 },
  { day: "Sex", value: 178000 },
  { day: "Sáb", value: 151000 },
  { day: "Dom", value: 139000 },
];

const movementData = [
  { name: "Saídas", total: 86 },
  { name: "Chegadas", total: 74 },
  { name: "Atrasos", total: 9 },
];

const statusData = [
  { name: "Em navegação", value: 22 },
  { name: "Atracado", value: 51 },
  { name: "Atrasado", value: 6 },
];

const DashboardCharts = () => {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2 rounded-2xl border-border/70 bg-card shadow-ocean">
        <CardHeader>
          <CardTitle className="text-xl">Receita semanal</CardTitle>
          <CardDescription>Linha de arrecadação com leitura rápida</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis dataKey="day" className="fill-muted-foreground" tickLine={false} axisLine={false} />
              <YAxis className="fill-muted-foreground" tickLine={false} axisLine={false} width={54} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--background))",
                }}
              />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70 bg-card shadow-ocean">
        <CardHeader>
          <CardTitle className="text-xl">Status atual</CardTitle>
          <CardDescription>Distribuição das embarcações</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={4}>
                <Cell fill="hsl(var(--primary))" />
                <Cell fill="hsl(var(--muted-foreground))" />
                <Cell fill="hsl(var(--warning))" />
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--background))",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="xl:col-span-3 rounded-2xl border-border/70 bg-card shadow-ocean">
        <CardHeader>
          <CardTitle className="text-xl">Movimentação do dia</CardTitle>
          <CardDescription>Barras limpas para leitura operacional</CardDescription>
        </CardHeader>
        <CardContent className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={movementData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} className="fill-muted-foreground" />
              <YAxis tickLine={false} axisLine={false} className="fill-muted-foreground" width={54} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--background))",
                }}
              />
              <Bar dataKey="total" radius={[10, 10, 0, 0]} fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardCharts;
