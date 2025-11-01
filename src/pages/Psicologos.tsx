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

interface Psicologo {
  id: string;
  crp: string;
  especializacao: string | null;
  valor_consulta: number | null;
  ativo: boolean;
  user_id: string;
}

export default function Psicologos() {
  const [psicologos, setPsicologos] = useState<Psicologo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPsicologos = async () => {
      const { data, error } = await supabase
        .from('psicologos')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPsicologos(data);
      }
      setLoading(false);
    };

    fetchPsicologos();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Psicólogos</h1>
          <p className="text-muted-foreground">
            Gerencie os psicólogos cadastrados na clínica
          </p>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CRP</TableHead>
                <TableHead>Especialização</TableHead>
                <TableHead>Valor Consulta</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : psicologos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Nenhum psicólogo cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                psicologos.map((psicologo) => (
                  <TableRow key={psicologo.id}>
                    <TableCell className="font-medium">{psicologo.crp}</TableCell>
                    <TableCell>{psicologo.especializacao || "N/A"}</TableCell>
                    <TableCell>
                      {psicologo.valor_consulta
                        ? `R$ ${psicologo.valor_consulta.toFixed(2)}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={psicologo.ativo ? "default" : "secondary"}
                        className={
                          psicologo.ativo
                            ? "bg-green-500/20 text-green-500 border-green-500/30"
                            : ""
                        }
                      >
                        {psicologo.ativo ? "Ativo" : "Inativo"}
                      </Badge>
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
