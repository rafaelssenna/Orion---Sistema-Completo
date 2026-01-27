"use client";

import { useState, useRef } from "react";
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
import { Project } from "@/types";
import { Upload, X, Image as ImageIcon } from "lucide-react";

const projectSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  status: z.enum(["em_andamento", "finalizado"]).optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  project?: Project;
  onSubmit: (data: ProjectFormData, imageFile?: File) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ProjectForm({
  project,
  onSubmit,
  onCancel,
  isLoading,
}: ProjectFormProps) {
  const [status, setStatus] = useState(project?.status || "em_andamento");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    project?.image_url || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name || "",
      description: project?.description || "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith("image/")) {
        alert("Por favor, selecione apenas arquivos de imagem.");
        return;
      }
      // Validar tamanho (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("A imagem deve ter no maximo 5MB.");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(project?.image_url || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFormSubmit = (data: ProjectFormData) => {
    onSubmit({ ...data, status }, imageFile || undefined);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">
          Nome do Projeto *
        </label>
        <Input {...register("name")} placeholder="Ex: Sistema de Vendas" />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Descricao</label>
        <Textarea
          {...register("description")}
          placeholder="Descreva o projeto..."
          rows={4}
        />
      </div>

      {/* Upload de Imagem */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Imagem do Projeto
        </label>

        {imagePreview ? (
          <div className="relative w-full h-48 rounded-lg overflow-hidden border border-white/10 bg-orion-dark/50">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-32 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-orion-accent/50 hover:bg-orion-accent/5 transition-colors"
          >
            <ImageIcon className="w-8 h-8 text-orion-silver" />
            <span className="text-sm text-orion-silver">
              Clique para adicionar uma imagem
            </span>
            <span className="text-xs text-orion-silver/60">
              JPEG, PNG, GIF ou WebP (max 5MB)
            </span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        {imageFile && (
          <p className="text-xs text-orion-silver mt-2">
            Novo arquivo: {imageFile.name}
          </p>
        )}
      </div>

      {project && (
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <Select value={status} onValueChange={(v: "em_andamento" | "finalizado") => setStatus(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? "Salvando..."
            : project
            ? "Salvar Alteracoes"
            : "Criar Projeto"}
        </Button>
      </div>
    </form>
  );
}
