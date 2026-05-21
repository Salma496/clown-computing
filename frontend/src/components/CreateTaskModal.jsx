import { useState } from 'react';
import api from '../api/client';

export default function CreateTaskModal({ onClose, onCreated, users, teams }) {
  const [form, setForm] = useState({
    title: '', description: '', priority: 'Medium',
    deadline: '', assigneeId: '', teamId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAssigneeChange = (e) => {
    const assigneeId = e.target.value;
    const u = users.find(u => u.userId === assigneeId);
    setForm(f => ({ ...f, assigneeId, teamId: u?.teamId || f.teamId }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/tasks', form);
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#13131a] border border-white/10 rounded-2xl w-full max-w-lg z-10">
        <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white font-['Syne',sans-serif]">Create New Task</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Title *</label>
            <input
              type="text"
              placeholder="Task title"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-[#f97316]/60 transition-all"
            />
          </div>

          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Description *</label>
            <textarea
              placeholder="Describe the task..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              required
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-[#f97316]/60 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Priority *</label>
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
                className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f97316]/60 transition-all"
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            <div>
              <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Deadline *</label>
              <input
                type="date"
                value={form.deadline}
                onChange={e => setForm({ ...form, deadline: e.target.value })}
                required
                className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f97316]/60 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Assignee *</label>
            <select
              value={form.assigneeId}
              onChange={handleAssigneeChange}
              required
              className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f97316]/60 transition-all"
            >
              <option value="">Select assignee</option>
              {users.filter(u => u.role === 'employee').map(u => (
                <option key={u.userId} value={u.userId}>
                  {u.name || u.email} ({teams.find(t => t.teamId === u.teamId)?.name || u.teamId || 'No team'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold py-3 rounded-xl transition-all text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#f97316] hover:bg-[#ea6c0e] text-white font-bold py-3 rounded-xl transition-all text-sm disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
