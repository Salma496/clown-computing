import { useState, useEffect, useRef } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

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

export default function TaskModal({ task, onClose, onUpdated, users }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    fetchComments();
  }, [task.taskId]);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const res = await api.get(`/tasks/${task.taskId}/comments`);
      setComments(res.data);
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post(`/tasks/${task.taskId}/comments`, { text: commentText });
      setComments(prev => [...prev, res.data]);
      setCommentText('');
    } catch (err) {
      setError('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      await api.put(`/tasks/${task.taskId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUpdated();
    } catch {
      setError('Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getUserName = (userId) => {
    const u = users?.find(u => u.userId === userId);
    return u ? (u.name || u.email) : userId?.slice(0, 8) + '...';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#13131a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10">
        {/* Header */}
        <div className="sticky top-0 bg-[#13131a] border-b border-white/10 px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white truncate font-['Syne',sans-serif]">{task.title}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${PRIORITY_COLORS[task.priority] || 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30'}`}>
                {task.priority}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[task.status] || ''}`}>
                {task.status}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors mt-1 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Assignee</p>
              <p className="text-white font-medium">{getUserName(task.assigneeId)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Deadline</p>
              <p className="text-white font-medium">
                {task.deadline ? new Date(task.deadline).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Description</p>
            <p className="text-zinc-300 leading-relaxed">{task.description || 'No description provided.'}</p>
          </div>

          {/* Image */}
          {task.imageUrl && (
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Attachment</p>
              <img
                src={task.imageUrl}
                alt="Task attachment"
                className="rounded-xl max-h-48 object-cover border border-white/10"
              />
            </div>
          )}

          {/* Image upload (manager only) */}
          {user?.role === 'manager' && (
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">
                {task.imageUrl ? 'Replace Image' : 'Attach Image'}
              </p>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-sm px-4 py-2.5 rounded-xl transition-all disabled:opacity-50"
              >
                {uploading ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                {uploading ? 'Uploading...' : 'Upload Image'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Comments */}
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-4">
              Comments {comments.length > 0 && `(${comments.length})`}
            </p>

            {loadingComments ? (
              <div className="flex justify-center py-4">
                <svg className="animate-spin w-5 h-5 text-zinc-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              </div>
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
              <input
                type="text"
                placeholder="Add a comment..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-[#f97316]/60 transition-all"
              />
              <button
                type="submit"
                disabled={submitting || !commentText.trim()}
                className="bg-[#f97316] hover:bg-[#ea6c0e] text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '...' : 'Post'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
