"use client";

import { useProjects } from "@/hooks/useProjects";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { FolderIcon } from "lucide-react";

export default function ProgrammerProjectsPage() {
  const { projects, loading } = useProjects();

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Meus Projetos</h1>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderIcon className="w-12 h-12" />}
          title="Nenhum projeto atribuido"
          description="Voce sera notificado quando tiver tarefas em algum projeto"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} basePath="/programmer" />
          ))}
        </div>
      )}
    </div>
  );
}
