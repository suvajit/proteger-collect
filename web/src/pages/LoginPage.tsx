import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <div style={{ marginBottom: 8 }}>
          <img src="/logo_white.svg" alt="Proteger" style={{ width: 160, display: 'block', filter: 'brightness(0) saturate(100%) invert(26%) sepia(89%) saturate(1652%) hue-rotate(210deg) brightness(95%) contrast(102%)' }} />
        </div>
        <p style={{ color: '#6b7280', marginBottom: 32, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Admin Portal</p>
        {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <input style={inp} placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
          <input style={inp} placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit" disabled={loading} style={{ width: '100%', background: '#1a56db', color: '#fff', border: 'none', padding: '14px', borderRadius: 10, fontWeight: 700, fontSize: 15, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
const inp: React.CSSProperties = { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontSize: 14, outline: 'none', display: 'block' };
