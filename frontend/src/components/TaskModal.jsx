import { useState, useEffect, useRef } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const PRIORITY_COLORS = {
  High: 'text-red-400 bg-red-400/10 border-red-400/30',
  Medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  Low: 'text-green-400 bg-green-400/10 border-green-400/30',
};

const STATUS_COLORS = {
  'To Do': 'text-zinc-400 bg-zinc-400/10',
  'In Progress': 'text-blue-400 bg-blue-400/10',
  'In Review': 'text-purple-400 bg-purple-400/10',
  'Done': 'text-green-400 bg-green-400/10',
};

export default function TaskModal({ task, onClose, onUpdated, onDeleted, users }) {
  const { user } = useAuth();
  const toast = useToast();
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    deadline: task.deadline ? task.deadline.split('T')[0] : '',
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef();

  useEffect(() => { fetchComments(); }, [task.taskId]);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const res = await api.get(`/tasks/${task.taskId}/comments`);
      setComments(res.data);
    } catch { setComments([]); }
    finally { setLoadingComments(false); }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await api.put(`/tasks/${task.taskId}`, editForm);
      toast.success('Task updated successfully');
      setIsEditing(false);
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update task');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await api.delete(`/tasks/${task.taskId}`);
      toast.success('Task deleted');
      onDeleted();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete task');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/tasks/${task.taskId}/comments`, { text: commentText });
      setComments(prev => [...prev, res.data]);
      setCommentText('');
    } catch { toast.error('Failed to post comment'); }
    finally { setSubmitting(false); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      await api.put(`/tasks/${task.taskId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Image uploaded');
      onUpdated();
    } catch { toast.error('Image upload failed'); }
    finally { setUploading(false); }
  };

  const getUserName = (userId) => {
    const u = users?.find(u => u.userId === userId);
    return u ? (u.name || u.email) : userId?.slice(0, 8) + '...';
  };

  const isManager = user?.role === 'manager';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#13131a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10">
        <div className="sticky top-0 bg-[#13131a] border-b border-white/10 px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input type="text" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full bg-white/5 border border-[#f97316]/40 rounded-lg px-3 py-1.5 text-white text-lg font-bold focus:outline-none" />
            ) : (
              <h2 className="text-xl font-bold text-white truncate font-['Syne',sans-serif]">{task.title}</h2>
            )}
            {!isEditing && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${PRIORITY_COLORS[task.priority] || 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30'}`}>{task.priority}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[task.status] || ''}`}>{task.status}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isManager && !isEditing && (
              <>
                <button onClick={() => setIsEditing(true)} className="text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg p-1.5 transition-all" title="Edit task">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className={`rounded-lg p-1.5 transition-all text-sm ${confirmDelete ? 'bg-red-500 text-white hover:bg-red-600 px-3 font-semibold' : 'text-zinc-400 hover:text-red-400 bg-white/5 hover:bg-red-400/10'}`}>
                  {deleting ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  ) : confirmDelete ? 'Confirm delete?' : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  )}
                </button>
              </>
            )}
            {isEditing && (
              <>
                <button onClick={handleSaveEdit} disabled={saving} className="bg-[#f97316] hover:bg-[#ea6c0e] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                <button onClick={() => { setIsEditing(false); setEditForm({ title: task.title, description: task.description || '', priority: task.priority, deadline: task.deadline ? task.deadline.split('T')[0] : '' }); }} className="text-zinc-400 hover:text-white text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all">Cancel</button>
              </>
            )}
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors ml-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Description</label>
                <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f97316]/60 transition-all resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Priority</label>
                  <select value={editForm.priority} onChange={e => setEditForm({ ...editForm, priority: e.target.value })}
                    className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f97316]/60 transition-all">
                    <option>High</option><option>Medium</option><option>Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Deadline</label>
                  <input type="date" value={editForm.deadline} onChange={e => setEditForm({ ...editForm, deadline: e.target.value })}
                    className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f97316]/60 transition-all" />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Assignee</p>
                  <p className="text-white font-medium">{getUserName(task.assigneeId)}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Deadline</p>
                  <p className="text-white font-medium">{task.deadline ? new Date(task.deadline).toLocaleDateString() : '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Description</p>
                <p className="text-zinc-300 leading-relaxed">{task.description || 'No description provided.'}</p>
              </div>
              {task.imageUrl && (
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Attachment</p>
                  <img src={task.imageUrl} alt="Task attachment" className="rounded-xl max-h-48 object-cover border border-white/10" />
                </div>
              )}
            </>
          )}

          {isManager && !isEditing && (
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">{task.imageUrl ? 'Replace Image' : 'Attach Image'}</p>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-sm px-4 py-2.5 rounded-xl transition-all disabled:opacity-50">
                {uploading ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                {uploading ? 'Uploading...' : 'Upload Image'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>
          )}

          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-4">Comments {comments.length > 0 && `(${comments.length})`}</p>
            {loadingComments ? (
              <div className="flex justify-center py-4"><svg className="animate-spin w-5 h-5 text-zinc-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg></div>
            ) : comments.length === 0 ? (
              <p className="text-zinc-600 text-sm italic">No comments yet. Be the first!</p>
            ) : (
              <div className="space-y-3 mb-4">
                {comments.map(c => (
                  <div key={c.commentId} className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#f97316] text-xs font-semibold">{getUserName(c.userId)}</span>
                      <span className="text-zinc-600 text-xs">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-zinc-300 text-sm">{c.text}</p>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleAddComment} className="flex gap-2 mt-3">
              <input type="text" placeholder="Add a comment..." value={commentText} onChange={e => setCommentText(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-[#f97316]/60 transition-all" />
              <button type="submit" disabled={submitting || !commentText.trim()}
                className="bg-[#f97316] hover:bg-[#ea6c0e] text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
                {submitting ? '...' : 'Post'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
