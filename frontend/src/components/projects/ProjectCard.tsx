import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Project } from "@/types";
import { FolderIcon, Calendar, Download, Image as ImageIcon } from "lucide-react";
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

  const handleDownloadImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (project.image_url) {
      window.open(project.image_url, "_blank");
    }
  };

  return (
    <Link href={`${basePath}/projects/${project.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full overflow-hidden">
        {/* Imagem do Projeto */}
        {project.image_url ? (
          <div className="relative w-full h-40 bg-orion-dark/50">
            <img
              src={project.image_url}
              alt={project.name}
              className="w-full h-full object-cover"
            />
            <button
              onClick={handleDownloadImage}
              className="absolute bottom-2 right-2 p-2 bg-black/60 rounded-lg hover:bg-black/80 transition-colors"
              title="Baixar imagem"
            >
              <Download className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <div className="w-full h-24 bg-gradient-to-br from-orion-accent/20 to-orion-accent-dark/20 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-orion-silver/40" />
          </div>
        )}

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <FolderIcon className="w-5 h-5 text-orion-accent" />
              <CardTitle className="text-lg line-clamp-1">{project.name}</CardTitle>
            </div>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-orion-silver text-sm mb-4 line-clamp-2">
            {project.description || "Sem descricao"}
          </p>

          <div className="mb-3">
            <div className="flex justify-between text-xs text-orion-silver mb-1">
              <span>Progresso</span>
              <span>
                {completedTasks}/{totalTasks} tarefas
              </span>
            </div>
            <Progress value={progress} />
          </div>

          <div className="flex items-center gap-1 text-xs text-orion-silver">
            <Calendar className="w-3 h-3" />
            <span>Criado em {formatDate(project.created_at)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
