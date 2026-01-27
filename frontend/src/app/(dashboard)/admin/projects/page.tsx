"use client";

import { useState } from "react";
import { useProjects } from "@/hooks/useProjects";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { Plus, FolderIcon } from "lucide-react";

export default function ProjectsPage() {
  const { projects, loading, createProject, uploadProjectImage } = useProjects();
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateProject = async (data: any, imageFile?: File) => {
    setIsSubmitting(true);
    try {
      const project = await createProject(data);

      // Se tiver imagem, fazer upload
      if (imageFile) {
        try {
          await uploadProjectImage(project.id, imageFile);
        } catch (imgError) {
          console.error("Erro ao fazer upload da imagem:", imgError);
          // Projeto foi criado, apenas a imagem falhou
          alert("Projeto criado, mas houve um erro ao fazer upload da imagem.");
        }
      }

      setShowForm(false);
    } catch (error) {
      console.error("Erro ao criar projeto:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Projetos</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderIcon className="w-12 h-12" />}
          title="Nenhum projeto encontrado"
          description="Crie seu primeiro projeto para comecar"
          action={
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Projeto
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} basePath="/admin" />
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Projeto</DialogTitle>
          </DialogHeader>
          <ProjectForm
            onSubmit={handleCreateProject}
            onCancel={() => setShowForm(false)}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
