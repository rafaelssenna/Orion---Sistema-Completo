import { Badge } from "@/components/ui/badge";

interface TaskStatusBadgeProps {
  status: "pendente" | "em_andamento" | "concluida";
}

const statusConfig = {
  pendente: { label: "Pendente", variant: "warning" as const },
  em_andamento: { label: "Em Andamento", variant: "default" as const },
  concluida: { label: "Concluida", variant: "success" as const },
};

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
