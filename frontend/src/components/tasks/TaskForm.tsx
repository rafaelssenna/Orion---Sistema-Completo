"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Task, User, Project } from "@/types";
import { useState } from "react";

const taskSchema = z.object({
  title: z.string().min(3, "Titulo deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskSubmitData extends TaskFormData {
  project_id: number;
  assignee_id?: number;
}

interface TaskFormProps {
  task?: Task;
  projects: Project[];
  programmers: User[];
  onSubmit: (data: TaskSubmitData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TaskForm({
  task,
  projects,
  programmers,
  onSubmit,
  onCancel,
  isLoading,
}: TaskFormProps) {
  // Auto-select project if there's only one (e.g., creating task from project detail)
  const getInitialProjectId = () => {
    if (task?.project_id) return task.project_id;
    if (projects.length === 1) return projects[0].id;
    return 0;
  };
  const [projectId, setProjectId] = useState<number>(getInitialProjectId());
  const [assigneeId, setAssigneeId] = useState<number | undefined>(
    task?.assignee_id || undefined
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
    },
  });

  const [projectError, setProjectError] = useState<string | null>(null);

  const handleFormSubmit = (data: TaskFormData) => {
    if (projectId === 0) {
      setProjectError("Selecione um projeto");
      return;
    }
    setProjectError(null);
    onSubmit({
      ...data,
      project_id: projectId,
      assignee_id: assigneeId,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">Titulo *</label>
        <Input {...register("title")} placeholder="Ex: Implementar login" />
        {errors.title && (
          <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Descricao</label>
        <Textarea
          {...register("description")}
          placeholder="Descreva a tarefa..."
          rows={4}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Projeto *</label>
        <Select
          value={projectId.toString()}
          onValueChange={(v) => {
            setProjectId(parseInt(v));
            setProjectError(null);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um projeto" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id.toString()}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {projectError && (
          <p className="text-red-500 text-sm mt-1">{projectError}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Responsavel</label>
        <Select
          value={assigneeId?.toString() || "none"}
          onValueChange={(v) =>
            setAssigneeId(v === "none" ? undefined : parseInt(v))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um programador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nao atribuido</SelectItem>
            {programmers.map((programmer) => (
              <SelectItem key={programmer.id} value={programmer.id.toString()}>
                {programmer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Salvando..." : task ? "Salvar Alteracoes" : "Criar Tarefa"}
        </Button>
      </div>
    </form>
  );
}
