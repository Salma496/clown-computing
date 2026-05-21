import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'employee', teamId: '' });
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Try to fetch teams; if backend not ready, show empty
    api.get('/teams').then(r => setTeams(r.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form.email, form.password, form.name, form.role, form.teamId);
      setSuccess('Account created! Please check your email for a verification code, then sign in.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 80% 50%, #6366f1 0%, transparent 50%),
                            radial-gradient(circle at 20% 80%, #f97316 0%, transparent 40%)`,
        }}
      />
      <div className="w-full max-w-md relative z-10">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-8">
            <span className="text-3xl font-black tracking-tighter text-white font-['Syne',sans-serif]">
              CLOWN<span className="text-[#f97316]">.</span>COMPUTING
            </span>
          </div>
          <h1 className="text-4xl font-black text-white mb-2 font-['Syne',sans-serif]">Create account</h1>
          <p className="text-zinc-400">Join your team's workspace</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}
            <div>
              <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Full Name</label>
              <input
                type="text"
                placeholder="Your name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#f97316]/60 transition-all"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Email</label>
              <input
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#f97316]/60 transition-all"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Password</label>
              <input
                type="password"
                placeholder="Min 8 chars, upper, number, symbol"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#f97316]/60 transition-all"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Role</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#f97316]/60 transition-all"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            {form.role === 'employee' && (
              <div>
                <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Team</label>
                {teams.length > 0 ? (
                  <select
                    value={form.teamId}
                    onChange={e => setForm({ ...form, teamId: e.target.value })}
                    className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#f97316]/60 transition-all"
                  >
                    <option value="">Select a team</option>
                    {teams.map(t => (
                      <option key={t.teamId} value={t.teamId}>{t.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Team ID (ask your manager)"
                    value={form.teamId}
                    onChange={e => setForm({ ...form, teamId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#f97316]/60 transition-all"
                  />
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#f97316] hover:bg-[#ea6c0e] text-white font-black py-3.5 rounded-xl transition-all text-sm tracking-widest uppercase disabled:opacity-50 mt-2"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-zinc-500 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-[#f97316] hover:text-[#fb923c] transition-colors font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
