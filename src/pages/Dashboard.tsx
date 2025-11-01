import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, UserCog, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPsicologos: 0,
    totalPacientes: 0,
    totalAgendamentos: 0,
    agendamentosHoje: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      // A busca de stats continua a mesma
      const [psicologos, pacientes, agendamentos, hoje] = await Promise.all([
        supabase.from('psicologos').select('*', { count: 'exact', head: true }),
        supabase.from('pacientes').select('*', { count: 'exact', head: true }),
        supabase.from('agendamentos').select('*', { count: 'exact', head: true }),
        supabase
          .from('agendamentos')
          .select('*', { count: 'exact', head: true })
          .gte('data_hora', new Date().toISOString().split('T')[0])
          .lt('data_hora', new Date(Date.now() + 86400000).toISOString().split('T')[0]),
      ]);

      setStats({
        totalPsicologos: psicologos.count || 0,
        totalPacientes: pacientes.count || 0,
        totalAgendamentos: agendamentos.count || 0,
        agendamentosHoje: hoje.count || 0,
      });

      // *** INÍCIO DA CORREÇÃO ***
      // Busca pelos 5 pacientes mais recentes (com a consulta corrigida)
      const { data: recentPatientsData, error: recentPatientsError } = await supabase
        .from('pacientes')
        .select(`
          id,
          created_at,
          profiles:profiles!inner (
            nome_completo,
            cpf
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      // *** FIM DA CORREÇÃO ***

      if (!recentPatientsError && recentPatientsData) {
        setRecentPacientes(recentPatientsData as any[]); // 'any' para simplificar
      } else if (recentPatientsError) {
        // Log de erro caso a busca de pacientes recentes falhe
        console.error("Erro ao buscar pacientes recentes:", recentPatientsError.message);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

  const cards = [
    {
      title: "Psicólogos",
      value: stats.totalPsicologos,
      icon: UserCog,
      gradient: "from-primary to-primary-glow",
    },
    {
      title: "Pacientes",
      value: stats.totalPacientes,
      icon: Users,
      gradient: "from-secondary to-accent",
    },
    {
      title: "Agendamentos Geral",
      value: stats.totalAgendamentos,
      icon: Calendar,
      gradient: "from-accent to-primary",
    },
    {
      title: "Hoje",
      value: stats.agendamentosHoje,
      icon: Clock,
      gradient: "from-primary-glow to-accent",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema de agendamentos de pacientes 
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.title} className="relative overflow-hidden">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-5`}
              />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
function setRecentPacientes(arg0: any[]) {
  throw new Error("Function not implemented.");
}

