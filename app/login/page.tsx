'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, getSession, initAdminIfNeeded } from '@/lib/auth';
import { ensureSeeded } from '@/lib/storage';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      await initAdminIfNeeded();
      const s = getSession();
      if (s) { router.replace('/'); return; }
      setReady(true);
    }
    init();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const session = await login(username.trim(), password);
      if (!session) {
        setError('Usuário ou senha incorretos.');
        setLoading(false);
        return;
      }
      ensureSeeded();
      router.replace('/');
    } catch {
      setError('Erro ao autenticar. Tente novamente.');
      setLoading(false);
    }
  }

  if (!ready) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
    }}>
      {/* Brand */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'var(--accent-dim)',
          border: '2px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          fontSize: 36,
        }}>🏍️</div>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.02em' }}>XTZ Painel</div>
        <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>Yamaha XTZ 250X · Área restrita</div>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '28px 24px',
        width: '100%',
        maxWidth: 380,
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Entrar</div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Usuário</label>
            <input
              className="form-input"
              type="text"
              placeholder="seu_usuario"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'var(--danger-dim)', color: 'var(--danger)',
              border: '1px solid var(--danger)', borderRadius: 10,
              padding: '10px 14px', fontSize: 14, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading || !username.trim() || !password}
            style={{ opacity: loading || !username.trim() || !password ? .6 : 1 }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>

      <div style={{ marginTop: 24, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
        Acesso restrito · Apenas usuários autorizados
      </div>
    </div>
  );
}
