import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Agendamento {
  id: string;
  data_hora: string;
  status: string;
  duracao_minutos: number;
  psicologos: { user_id: string } | null;
  pacientes: { user_id: string } | null;
}

const statusColors: Record<string, string> = {
  agendado: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  confirmado: "bg-green-500/20 text-green-500 border-green-500/30",
  em_atendimento: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  concluido: "bg-purple-500/20 text-purple-500 border-purple-500/30",
  cancelado: "bg-red-500/20 text-red-500 border-red-500/30",
};

const statusLabels: Record<string, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_atendimento: "Em Atendimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export default function Agendamentos() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgendamentos = async () => {
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          psicologos(user_id),
          pacientes(user_id)
        `)
        .order('data_hora', { ascending: false });

      if (!error && data) {
        setAgendamentos(data);
      }
      setLoading(false);
    };

    fetchAgendamentos();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agendamentos</h1>
          <p className="text-muted-foreground">
            Gerencie todos os agendamentos da clínica
          </p>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Psicólogo</TableHead>
                <TableHead>Paciente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : agendamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Nenhum agendamento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                agendamentos.map((agendamento) => (
                  <TableRow key={agendamento.id}>
                    <TableCell>
                      {format(new Date(agendamento.data_hora), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>{agendamento.duracao_minutos} min</TableCell>
                    <TableCell>
                      <Badge className={statusColors[agendamento.status]}>
                        {statusLabels[agendamento.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {agendamento.psicologos?.user_id || "N/A"}
                    </TableCell>
                    <TableCell>
                      {agendamento.pacientes?.user_id || "N/A"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
