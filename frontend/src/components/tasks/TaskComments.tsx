"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TaskComment } from "@/types";
import { MessageSquare, Send, Trash2, Edit2, X, Check } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface TaskCommentsProps {
  comments: TaskComment[];
  currentUserId: number;
  isAdmin?: boolean;
  onAddComment: (content: string) => Promise<void>;
  onEditComment: (commentId: number, content: string) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
  isLoading?: boolean;
}

export function TaskComments({
  comments,
  currentUserId,
  isAdmin = false,
  onAddComment,
  onEditComment,
  onDeleteComment,
  isLoading,
}: TaskCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId: number) => {
    if (!editContent.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onEditComment(commentId, editContent.trim());
      setEditingId(null);
      setEditContent("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (submitting) return;
    if (!confirm("Tem certeza que deseja excluir este comentario?")) return;
    setSubmitting(true);
    try {
      await onDeleteComment(commentId);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (comment: TaskComment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-orion-silver">
        <MessageSquare className="w-4 h-4" />
        <span>Comentarios ({comments.length})</span>
      </div>

      {/* Comment list */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-orion-silver/60 text-sm text-center py-4">
            Nenhum comentario ainda. Seja o primeiro a comentar!
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-orion-dark/30 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-orion-accent/20 flex items-center justify-center">
                    <span className="text-xs text-orion-accent font-medium">
                      {comment.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-orion-star-white">
                    {comment.user.name}
                  </span>
                  <span className="text-xs text-orion-silver/50">
                    {formatDate(comment.created_at)}
                  </span>
                </div>

                {(comment.user_id === currentUserId || isAdmin) && (
                  <div className="flex items-center gap-1">
                    {editingId !== comment.id && (
                      <>
                        {comment.user_id === currentUserId && (
                          <button
                            onClick={() => startEdit(comment)}
                            className="p-1 text-orion-silver/60 hover:text-orion-accent transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="p-1 text-orion-silver/60 hover:text-red-400 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {editingId === comment.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={2}
                    className="text-sm"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelEdit}
                      disabled={submitting}
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleEdit(comment.id)}
                      disabled={submitting || !editContent.trim()}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-orion-silver whitespace-pre-wrap">
                  {comment.content}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* New comment form */}
      <div className="flex gap-2 pt-3 border-t border-white/5">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Escreva um comentario..."
          rows={2}
          className="flex-1 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) {
              handleSubmit();
            }
          }}
        />
        <Button
          onClick={handleSubmit}
          disabled={!newComment.trim() || submitting || isLoading}
          className="self-end"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-orion-silver/40 text-right">
        Ctrl + Enter para enviar
      </p>
    </div>
  );
}
