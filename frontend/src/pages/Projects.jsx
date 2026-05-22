import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Projects({ onBack }) {
  const { user } = useAuth();
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const isManager = user?.role === 'manager';

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/projects', form);
      setProjects(prev => [...prev, res.data]);
      setForm({ name: '', description: '' });
      setShowCreate(false);
      toast.success('Project created');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (projectId) => {
    setSaving(true);
    try {
      await api.put(`/projects/${projectId}`, form);
      setProjects(prev => prev.map(p => p.projectId === projectId ? { ...p, ...form } : p));
      setEditingId(null);
      setForm({ name: '', description: '' });
      toast.success('Project updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (projectId) => {
    if (confirmDeleteId !== projectId) {
      setConfirmDeleteId(projectId);
      return;
    }
    setDeletingId(projectId);
    try {
      await api.delete(`/projects/${projectId}`);
      setProjects(prev => prev.filter(p => p.projectId !== projectId));
      toast.success('Project deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete project');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const startEdit = (project) => {
    setEditingId(project.projectId);
    setForm({ name: project.name, description: project.description || '' });
    setShowCreate(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 bg-[#0d0d14] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-zinc-500 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xl font-black tracking-tighter font-['Syne',sans-serif]">
              CLOWN<span className="text-[#f97316]">.</span>
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300 font-semibold">Projects</span>
          </div>
          {isManager && (
            <button
              onClick={() => { setShowCreate(true); setEditingId(null); setForm({ name: '', description: '' }); }}
              className="bg-[#f97316] hover:bg-[#ea6c0e] text-white text-sm font-bold px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Create form */}
        {showCreate && isManager && (
          <div className="bg-[#13131a] border border-[#f97316]/30 rounded-2xl p-6 mb-6">
            <h3 className="text-white font-bold mb-4 font-['Syne',sans-serif]">New Project</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                placeholder="Project name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-[#f97316]/60 transition-all"
              />
              <textarea
                placeholder="Description (optional)"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-[#f97316]/60 transition-all resize-none"
              />
              <div className="flex gap-3">
                <button type="submit" disabled={saving}
                  className="bg-[#f97316] hover:bg-[#ea6c0e] text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50">
                  {saving ? 'Creating...' : 'Create Project'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)}
                  className="bg-white/5 hover:bg-white/10 text-zinc-300 px-6 py-2.5 rounded-xl text-sm transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Projects list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <svg className="animate-spin w-8 h-8 text-[#f97316]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <p className="text-zinc-500 text-sm">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-zinc-700">
            <svg className="w-12 h-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-sm">No projects yet{isManager ? ' — create one above' : ''}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map(project => (
              <div key={project.projectId} className="bg-[#13131a] border border-white/8 hover:border-white/15 rounded-2xl p-5 transition-all">
                {editingId === project.projectId ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-white/5 border border-[#f97316]/40 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
                    />
                    <textarea
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdate(project.projectId)} disabled={saving}
                        className="bg-[#f97316] hover:bg-[#ea6c0e] text-white font-bold px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => { setEditingId(null); setForm({ name: '', description: '' }); }}
                        className="bg-white/5 hover:bg-white/10 text-zinc-300 px-4 py-2 rounded-lg text-sm transition-all">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold font-['Syne',sans-serif] mb-1">{project.name}</h3>
                      {project.description && <p className="text-zinc-500 text-sm">{project.description}</p>}
                      <p className="text-zinc-700 text-xs mt-2">
                        Created {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {isManager && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => startEdit(project)}
                          className="text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg p-2 transition-all">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(project.projectId)}
                          disabled={deletingId === project.projectId}
                          className={`rounded-lg p-2 transition-all text-sm ${
                            confirmDeleteId === project.projectId
                              ? 'bg-red-500 text-white hover:bg-red-600 px-3 font-semibold text-xs'
                              : 'text-zinc-400 hover:text-red-400 bg-white/5 hover:bg-red-400/10'
                          }`}
                        >
                          {deletingId === project.projectId ? (
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                            </svg>
                          ) : confirmDeleteId === project.projectId ? 'Confirm?' : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
