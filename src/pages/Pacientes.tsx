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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";

// Schema de validação Zod (senha removida do formulário)
const pacienteFormSchema = z.object({
  nome_completo: z.string().min(3, "Nome é obrigatório (mínimo 3 caracteres)"),
  email: z.string().email("Email inválido"),
  // password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"), // Removido
  cpf: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  data_nascimento: z.string().optional().nullable(), // HTML input date
  endereco: z.string().optional().nullable(),
  convenio: z.string().optional().nullable(),
  contato_emergencia: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

type PacienteFormData = z.infer<typeof pacienteFormSchema>;

/// Interface para os dados do Paciente vindo da listagem
interface PacienteProfile {
  nome_completo: string;
  cpf: string | null;
  telefone: string | null;
}
interface Paciente {
  id: string;
  user_id: string;
  endereco: string | null;
  contato_emergencia: string | null;
  convenio: string | null;
  created_at: string; // Adicionado para ordenação
  profiles: PacienteProfile; // Não é mais nulo por causa do !inner
}

export default function Pacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<PacienteFormData>({
    resolver: zodResolver(pacienteFormSchema),
    defaultValues: {
      nome_completo: "",
      email: "",
      // password: "", // Removido
      cpf: "",
      telefone: "",
      data_nascimento: "",
      endereco: "",
      convenio: "",
      contato_emergencia: "",
      observacoes: "",
    },
  });
  const { isSubmitting } = form.formState;
// Função para buscar pacientes (COM A CONSULTA CORRIGIDA)
  const fetchPacientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pacientes')
      .select(`
        id,
        user_id,
        endereco,
        contato_emergencia,
        convenio,
        created_at,
        profiles:profiles!inner (
          nome_completo,
          cpf,
          telefone
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // O tipo de 'data' agora está correto, pois 'profiles' está aninhado
      setPacientes(data as any[]); // Usamos 'any' para simplificar a tipagem do join
    } else if (error) {
      toast({
        title: "Erro ao buscar pacientes",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  // Buscar pacientes ao carregar a página
  useEffect(() => {
    fetchPacientes();
  }, []);

  // Handler para submeter o formulário de novo paciente
  async function onSubmit(data: PacienteFormData) {
    try {
      // 1. Gerar senha aleatória segura
      const generatedPassword = crypto.randomUUID();

      // 2. Criar o usuário de autenticação (necessário para o schema)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: generatedPassword, // Usamos a senha gerada
        options: {
          data: {
            nome_completo: data.nome_completo,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Criação do usuário falhou.");

      const user = authData.user;

      // 3. Atualizar o perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          cpf: data.cpf || null,
          telefone: data.telefone || null,
          data_nascimento: data.data_nascimento || null,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 4. Criar o registro do paciente
      const { error: pacienteError } = await supabase
        .from('pacientes')
        .insert({
          user_id: user.id,
          endereco: data.endereco || null,
          convenio: data.convenio || null,
          contato_emergencia: data.contato_emergencia || null,
          observacoes: data.observacoes || null,
        });

      if (pacienteError) throw pacienteError;

      // 5. Atribuir o papel 'paciente' (conforme schema do DB)
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role: 'paciente' });

      if (roleError) throw roleError;

      toast({
        title: "Paciente Cadastrado!",
        description: `${data.nome_completo} foi adicionado(a) com sucesso.`,
      });

      form.reset();
      setIsDialogOpen(false);
      fetchPacientes(); // Atualiza a lista

    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar paciente",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
            <p className="text-muted-foreground">
              Gerencie os pacientes cadastrados na clínica
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
                <DialogDescription>
                  Preencha os dados para criar um novo paciente.
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <ScrollArea className="h-[60vh] px-6 py-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Dados de Acesso e Perfil */}
                      <FormField
                        control={form.control}
                        name="nome_completo"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome completo do paciente" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Email (para contato)</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="email@dominio.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Campo Senha Removido */}
                      <FormField
                        control={form.control}
                        name="cpf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF</FormLabel>
                            <FormControl>
                              <Input placeholder="000.000.000-00" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="telefone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input placeholder="(00) 00000-0000" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="data_nascimento"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data de Nascimento</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Dados Específicos de Paciente */}
                      <FormField
                        control={form.control}
                        name="convenio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Convênio</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Unimed, SulAmérica ou Particular" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endereco"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Endereço</FormLabel>
                            <FormControl>
                              <Input placeholder="Rua, Número, Bairro, Cidade - UF" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contato_emergencia"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Contato de Emergência</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome e Telefone (Ex: Maria - (11) 98765-4321)" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="observacoes"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Observações</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Alguma observação inicial sobre o paciente..."
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </ScrollArea>
                  
                  <DialogFooter className="pt-6">
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancelar
                      </Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Salvando..." : "Salvar Paciente"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

        </div>

        {/* Tabela de Pacientes */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Convênio</TableHead>
                <TableHead>Contato Emergência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : pacientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Nenhum paciente cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                pacientes.map((paciente) => (
                  <TableRow key={paciente.id}>
                    <TableCell className="font-medium">
                      {paciente.profiles?.nome_completo || "Usuário sem perfil"}
                    </TableCell>
                    <TableCell>{paciente.profiles?.cpf || "N/A"}</TableCell>
                    <TableCell>{paciente.profiles?.telefone || "N/A"}</TableCell>
                    <TableCell>{paciente.convenio || "Particular"}</TableCell>
                    <TableCell>
                      {paciente.contato_emergencia || "N/A"}
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