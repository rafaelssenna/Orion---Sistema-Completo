'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, GripVertical } from 'lucide-react';

const COLUMNS = [
  { id: 'TODO', label: 'A Fazer', color: 'border-orion-text-muted' },
  { id: 'IN_PROGRESS', label: 'Em Progresso', color: 'border-orion-primary' },
  { id: 'IN_REVIEW', label: 'Em Revisão', color: 'border-orion-warning' },
  { id: 'DONE', label: 'Concluído', color: 'border-orion-success' },
];

export default function KanbanPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  useEffect(() => {
    api.getProjects().then(setProjects).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadTasks();
    } else {
      setLoading(false);
    }
  }, [selectedProject]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await api.getTasks({ projectId: selectedProject });
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;

    // Optimistic update
    setTasks(prev =>
      prev.map(t => t.id === draggableId ? { ...t, status: newStatus, order: destination.index } : t)
    );

    try {
      await api.updateTask(draggableId, { status: newStatus, order: destination.index });
    } catch {
      loadTasks(); // Rollback
    }
  };

  const addTask = async (status: string) => {
    if (!newTaskTitle.trim() || !selectedProject) return;

    try {
      await api.createTask({
        projectId: selectedProject,
        title: newTaskTitle,
        status,
        assigneeId: user?.role === 'DEV' ? user?.id : undefined,
      });
      setNewTaskTitle('');
      setShowAddTask(null);
      loadTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const getColumnTasks = (status: string) => tasks.filter(t => t.status === status);

  const priorityColors: Record<string, string> = {
    LOW: 'bg-orion-text-muted/20 text-orion-text-muted',
    MEDIUM: 'bg-orion-primary/20 text-orion-primary-light',
    HIGH: 'bg-orion-warning/20 text-orion-warning',
    URGENT: 'bg-orion-danger/20 text-orion-danger',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kanban</h1>
          <p className="text-orion-text-muted">Gerencie tarefas visualmente</p>
        </div>
        <select
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
          className="bg-orion-surface-light border border-orion-border rounded-lg px-4 py-2 text-orion-text focus:outline-none focus:border-orion-primary"
        >
          <option value="">Selecione um projeto</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {!selectedProject ? (
        <div className="text-center py-20 text-orion-text-muted">
          Selecione um projeto para ver o Kanban
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-orion-primary">Carregando tarefas...</div>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-4 gap-4 min-h-[calc(100vh-16rem)]">
            {COLUMNS.map(column => (
              <div key={column.id} className={`bg-orion-surface rounded-2xl border-t-2 ${column.color} border border-orion-border p-4`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm">{column.label}</h3>
                  <span className="text-xs text-orion-text-muted bg-orion-surface-light px-2 py-1 rounded-full">
                    {getColumnTasks(column.id).length}
                  </span>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 min-h-[200px] transition-colors rounded-xl p-1 ${
                        snapshot.isDraggingOver ? 'bg-orion-primary/5' : ''
                      }`}
                    >
                      {getColumnTasks(column.id).map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`bg-orion-surface-light rounded-xl p-3 border border-orion-border ${
                                snapshot.isDragging ? 'shadow-lg shadow-orion-primary/20 border-orion-primary/50' : ''
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div {...provided.dragHandleProps} className="pt-0.5 text-orion-text-muted">
                                  <GripVertical size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">{task.title}</p>
                                  {task.assignee && (
                                    <p className="text-xs text-orion-text-muted mt-1">{task.assignee.name}</p>
                                  )}
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[task.priority]}`}>
                                      {task.priority}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* Add task button */}
                {showAddTask === column.id ? (
                  <div className="mt-3">
                    <input
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addTask(column.id)}
                      placeholder="Título da tarefa..."
                      className="w-full bg-orion-surface-light border border-orion-border rounded-lg px-3 py-2 text-sm text-orion-text focus:outline-none focus:border-orion-primary"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => addTask(column.id)}
                        className="flex-1 bg-orion-primary text-white text-xs py-1.5 rounded-lg"
                      >
                        Adicionar
                      </button>
                      <button
                        onClick={() => { setShowAddTask(null); setNewTaskTitle(''); }}
                        className="text-xs text-orion-text-muted py-1.5 px-3"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddTask(column.id)}
                    className="w-full mt-3 flex items-center justify-center gap-1 text-sm text-orion-text-muted hover:text-orion-primary py-2 rounded-lg border border-dashed border-orion-border hover:border-orion-primary transition-colors"
                  >
                    <Plus size={16} /> Adicionar
                  </button>
                )}
              </div>
            ))}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}
