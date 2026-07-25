'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, getUsers, createUser, deleteUser } from '@/lib/auth';
import type { User } from '@/lib/types';
import { UserPlus, Trash2, ShieldCheck, X } from 'lucide-react';

function Modal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bikeName, setBikeName] = useState('XTZ 250X');
  const [bikeYear, setBikeYear] = useState('2008');
  const [bikeColor, setBikeColor] = useState('Preta');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) { setErr('Preencha usuário e senha.'); return; }
    setSaving(true);
    try {
      await createUser(username.trim(), password, role, displayName, bikeName, bikeYear, bikeColor);
      onSave();
    } catch (ex: any) {
      setErr(ex.message || 'Erro ao criar usuário.');
    }
    setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="modal-title">Novo usuário</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', marginBottom: 20 }}>
            <X size={22} />
          </button>
        </div>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Usuário (login)</label>
            <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="usuario_login" autoCapitalize="none" />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="form-group">
            <label className="form-label">Nome de exibição</label>
            <input className="form-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Nome" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Moto</label>
              <input className="form-input" value={bikeName} onChange={e => setBikeName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Ano</label>
              <input className="form-input" value={bikeYear} onChange={e => setBikeYear(e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Cor</label>
              <input className="form-input" value={bikeColor} onChange={e => setBikeColor(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Perfil</label>
              <select className="form-input" value={role} onChange={e => setRole(e.target.value as 'admin' | 'user')}>
                <option value="user">Usuário</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          {err && (
            <div style={{ background: 'var(--danger-dim)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 10, padding: '10px 14px', fontSize: 14, marginBottom: 16 }}>
              {err}
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-full" disabled={saving} style={{ marginBottom: 8 }}>
            {saving ? 'Criando…' : 'Criar usuário'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ userId: string; role: string } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);

  function loadUsers() { setUsers(getUsers()); }

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== 'admin') { router.replace('/'); return; }
    setSession(s);
    loadUsers();
  }, []);

  if (!session) return null;

  function handleDelete(u: User) {
    if (u.id === session?.userId) { alert('Não é possível excluir sua própria conta.'); return; }
    if (!confirm(`Excluir usuário "${u.username}" e todos os seus dados?`)) return;
    deleteUser(u.id);
    loadUsers();
  }

  return (
    <>
      <div className="page-header" style={{ paddingTop: 24, paddingBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={14} style={{ color: 'var(--accent)' }} /> Painel de Administração
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>Usuários</h1>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)} style={{ gap: 6 }}>
            <UserPlus size={16} /> Novo
          </button>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 16 }}>
        {users.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
            Nenhum usuário cadastrado
          </div>
        )}

        {users.map(u => (
          <div key={u.id} className="card" style={{ marginBottom: 10 }}>
            <div className="card-pad" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: u.role === 'admin' ? 'var(--accent-dim)' : 'var(--surface2)',
                border: `1px solid ${u.role === 'admin' ? 'var(--accent)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>
                {u.role === 'admin' ? '👑' : '👤'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {u.displayName || u.username}
                  {u.id === session.userId && (
                    <span style={{ fontSize: 11, color: 'var(--accent)', marginLeft: 8, fontWeight: 600 }}>você</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                  @{u.username} · {u.role === 'admin' ? 'Admin' : 'Usuário'} · {u.bikeName} {u.bikeYear}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  Criado em {u.createdAt.split('-').reverse().join('/')}
                </div>
              </div>
              {u.id !== session.userId && (
                <button
                  onClick={() => handleDelete(u)}
                  className="btn btn-danger-soft btn-sm btn-icon"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-pad">
            <div className="card-title">Informações de acesso</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
              <p style={{ marginBottom: 8 }}>Sessões expiram após <strong style={{ color: 'var(--text)' }}>5 dias</strong> de inatividade.</p>
              <p style={{ marginBottom: 8 }}>Usuários comuns têm acesso completo ao app, mas <strong style={{ color: 'var(--text)' }}>não veem este painel</strong>.</p>
              <p>Cada usuário tem seus próprios dados isolados.</p>
            </div>
          </div>
        </div>
      </div>

      {showModal && <Modal onClose={() => setShowModal(false)} onSave={() => { loadUsers(); setShowModal(false); }} />}
    </>
  );
}
