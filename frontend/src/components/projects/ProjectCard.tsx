import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Project } from "@/types";
import { FolderIcon, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
  basePath?: string;
}

export function ProjectCard({ project, basePath = "/admin" }: ProjectCardProps) {
  const statusVariant = project.status === "em_andamento" ? "default" : "success";
  const statusLabel = project.status === "em_andamento" ? "Em Andamento" : "Finalizado";

  const completedTasks = project.task_stats?.completed || 0;
  const totalTasks =
    (project.task_stats?.pending || 0) +
    (project.task_stats?.in_progress || 0) +
    completedTasks;

  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <Link href={`${basePath}/projects/${project.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <FolderIcon className="w-5 h-5 text-primary-500" />
              <CardTitle className="text-lg">{project.name}</CardTitle>
            </div>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {project.description || "Sem descricao"}
          </p>

          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progresso</span>
              <span>
                {completedTasks}/{totalTasks} tarefas
              </span>
            </div>
            <Progress value={progress} />
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            <span>Criado em {formatDate(project.created_at)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
