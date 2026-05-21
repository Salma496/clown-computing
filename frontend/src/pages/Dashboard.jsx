import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import TaskModal from '../components/TaskModal';
import CreateTaskModal from '../components/CreateTaskModal';

const COLUMNS = ['To Do', 'In Progress', 'In Review', 'Done'];

const ALLOWED_NEXT = {
  'To Do': 'In Progress',
  'In Progress': 'In Review',
  'In Review': 'Done',
};

const PRIORITY_DOT = {
  High: 'bg-red-400',
  Medium: 'bg-yellow-400',
  Low: 'bg-green-400',
};

const COLUMN_ACCENT = {
  'To Do': 'border-zinc-600',
  'In Progress': 'border-blue-500',
  'In Review': 'border-purple-500',
  'Done': 'border-green-500',
};

const COLUMN_HEADER_COLOR = {
  'To Do': 'text-zinc-400',
  'In Progress': 'text-blue-400',
  'In Review': 'text-purple-400',
  'Done': 'text-green-400',
};

function TaskCard({ task, onClick, users }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.taskId,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const assignee = users?.find(u => u.userId === task.assigneeId);
  const assigneeName = assignee ? (assignee.name || assignee.email) : '—';
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'Done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-[#1a1a26] hover:bg-[#1e1e2e] border border-white/8 hover:border-white/15 rounded-xl p-4 cursor-grab active:cursor-grabbing transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-white text-sm font-semibold leading-snug group-hover:text-[#f97316] transition-colors line-clamp-2">
          {task.title}
        </h3>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${PRIORITY_DOT[task.priority] || 'bg-zinc-500'}`} title={task.priority} />
      </div>
      {task.description && (
        <p className="text-zinc-500 text-xs line-clamp-2 mb-3">{task.description}</p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-zinc-600 text-xs truncate max-w-[120px]">{assigneeName}</span>
        {task.deadline && (
          <span className={`text-xs ${isOverdue ? 'text-red-400' : 'text-zinc-600'}`}>
            {new Date(task.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
      {task.imageUrl && (
        <div className="mt-2">
          <span className="text-zinc-600 text-xs flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Attachment
          </span>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [teamFilter, setTeamFilter] = useState('');
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [tasksRes, teamsRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/teams'),
      ]);
      setTasks(tasksRes.data);
      setTeams(teamsRes.data);

      if (user?.role === 'manager') {
        const usersRes = await api.get('/users');
        setUsers(usersRes.data);
      }
    } catch (err) {
      setError('Failed to load data. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (user?.role === 'manager' && teamFilter) return t.teamId === teamFilter;
    return true;
  });

  const getColumnTasks = (status) => filteredTasks.filter(t => t.status === status);

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const draggedTask = tasks.find(t => t.taskId === active.id);
    if (!draggedTask) return;

    // Find target column from over id (could be column id or another task id)
    const overTask = tasks.find(t => t.taskId === over.id);
    const targetStatus = overTask ? overTask.status : over.id;

    if (!COLUMNS.includes(targetStatus)) return;
    if (draggedTask.status === targetStatus) return;

    // Only allow forward transitions
    if (ALLOWED_NEXT[draggedTask.status] !== targetStatus) return;

    // Optimistic update
    setTasks(prev => prev.map(t => t.taskId === draggedTask.taskId ? { ...t, status: targetStatus } : t));

    try {
      await api.put(`/tasks/${draggedTask.taskId}/status`, { newStatus: targetStatus });
    } catch {
      // Revert
      setTasks(prev => prev.map(t => t.taskId === draggedTask.taskId ? { ...t, status: draggedTask.status } : t));
      setError('Failed to update status');
    }
  };

  const activeTask = activeId ? tasks.find(t => t.taskId === activeId) : null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Navbar */}
      <header className="border-b border-white/10 bg-[#0d0d14] sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
          <span className="text-xl font-black tracking-tighter font-['Syne',sans-serif]">
            CLOWN<span className="text-[#f97316]">.</span>
          </span>
          <div className="flex items-center gap-4">
            {user?.role === 'manager' && teams.length > 0 && (
              <select
                value={teamFilter}
                onChange={e => setTeamFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#f97316]/60 transition-all"
              >
                <option value="">All Teams</option>
                {teams.map(t => (
                  <option key={t.teamId} value={t.teamId}>{t.name}</option>
                ))}
              </select>
            )}
            {user?.role === 'manager' && (
              <button
                onClick={() => setShowCreate(true)}
                className="bg-[#f97316] hover:bg-[#ea6c0e] text-white text-sm font-bold px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Task
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-white">{user?.name || user?.email}</p>
                <p className="text-xs text-zinc-500 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={logout}
                className="text-zinc-500 hover:text-white text-sm transition-colors"
                title="Sign out"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm mb-6 flex items-center justify-between">
            {error}
            <button onClick={() => setError('')} className="ml-4 hover:text-red-300">✕</button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <svg className="animate-spin w-8 h-8 text-[#f97316]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <p className="text-zinc-500 text-sm">Loading your workspace...</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active }) => setActiveId(active.id)}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {COLUMNS.map(col => {
                const colTasks = getColumnTasks(col);
                return (
                  <div key={col} className={`bg-[#111118] border-t-2 ${COLUMN_ACCENT[col]} rounded-xl flex flex-col min-h-[500px]`}>
                    <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                      <h2 className={`text-xs font-black uppercase tracking-widest font-['Syne',sans-serif] ${COLUMN_HEADER_COLOR[col]}`}>
                        {col}
                      </h2>
                      <span className="text-zinc-600 text-xs bg-white/5 px-2 py-0.5 rounded-full">
                        {colTasks.length}
                      </span>
                    </div>
                    <div className="flex-1 p-3">
                      <SortableContext
                        items={colTasks.map(t => t.taskId)}
                        strategy={verticalListSortingStrategy}
                        id={col}
                      >
                        <div className="space-y-2">
                          {colTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-zinc-700">
                              <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              <p className="text-xs">No tasks</p>
                            </div>
                          ) : (
                            colTasks.map(task => (
                              <TaskCard
                                key={task.taskId}
                                task={task}
                                users={users}
                                onClick={() => setSelectedTask(task)}
                              />
                            ))
                          )}
                        </div>
                      </SortableContext>
                    </div>
                  </div>
                );
              })}
            </div>

            <DragOverlay>
              {activeTask && (
                <div className="bg-[#1a1a26] border border-[#f97316]/40 rounded-xl p-4 shadow-2xl shadow-black/50 w-64 rotate-2">
                  <p className="text-white text-sm font-semibold">{activeTask.title}</p>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          users={users}
          onClose={() => setSelectedTask(null)}
          onUpdated={() => { fetchAll(); setSelectedTask(null); }}
        />
      )}

      {showCreate && (
        <CreateTaskModal
          users={users}
          teams={teams}
          onClose={() => setShowCreate(false)}
          onCreated={fetchAll}
        />
      )}
    </div>
  );
}
