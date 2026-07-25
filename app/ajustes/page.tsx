'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';
import { useTheme } from '@/components/ThemeProvider';
import { useConfirm } from '@/components/ConfirmModal';
import { clearSession } from '@/lib/auth';
import type { AppSettings, Theme, WishlistItem } from '@/lib/types';
import { Check, Download, Trash2, Plus, X, ShoppingBag, ExternalLink, LogOut } from 'lucide-react';

const THEMES: { key: Theme; label: string; desc: string; colors: [string, string, string] }[] = [
  { key: 'dark', label: 'Noite', desc: 'Fundo escuro com âmbar — padrão noturno', colors: ['#0D0C08', '#F5A623', '#2E2C22'] },
  { key: 'light', label: 'Dia', desc: 'Fundo claro — ideal para luz do dia', colors: ['#F2F0EB', '#C47D12', '#DDDAD2'] },
  { key: 'azul', label: 'Noite Azul', desc: 'Fundo escuro azulado — visual alternativo', colors: ['#070B14', '#4F8EF7', '#1E3056'] },
];

const PRIORITY_COLORS: Record<string, string> = {
  alta: 'var(--danger)', media: 'var(--warn)', baixa: 'var(--muted)',
};
const PRIORITY_BG: Record<string, string> = {
  alta: 'var(--danger-dim)', media: 'var(--warn-dim)', baixa: 'var(--surface2)',
};

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

export default function Ajustes() {
  const { theme, setTheme } = useTheme();
  const confirm = useConfirm();
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [saved, setSaved] = useState(false);

  const [showAddWish, setShowAddWish] = useState(false);
  const [newWishDesc, setNewWishDesc] = useState('');
  const [newWishPriority, setNewWishPriority] = useState<WishlistItem['priority']>('media');
  const [newWishPrice, setNewWishPrice] = useState('');
  const [newWishUrl, setNewWishUrl] = useState('');

  useEffect(() => {
    setSettings(storage.getSettings());
    setWishlist(storage.getWishlist());
  }, []);

  function patch(p: Partial<AppSettings>) {
    if (!settings) return;
    setSettings({ ...settings, ...p });
  }

  function saveSettings() {
    if (!settings) return;
    storage.setSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addWish() {
    if (!newWishDesc) return;
    const item: WishlistItem = {
      id: uid(), description: newWishDesc, priority: newWishPriority,
      estimatedPrice: parseFloat(newWishPrice) || 0,
      url: newWishUrl.trim() || undefined, done: false,
    };
    const updated = [...wishlist, item];
    storage.setWishlist(updated);
    setWishlist(updated);
    setShowAddWish(false);
    setNewWishDesc(''); setNewWishPrice(''); setNewWishUrl('');
  }

  function toggleWishDone(id: string) {
    const updated = wishlist.map(w => w.id === id ? { ...w, done: !w.done } : w);
    storage.setWishlist(updated);
    setWishlist(updated);
  }

  async function removeWish(id: string) {
    const ok = await confirm({ title: 'Remover item', message: 'Remover este item da lista de desejo?', confirmLabel: 'Remover', danger: true });
    if (!ok) return;
    const updated = wishlist.filter(w => w.id !== id);
    storage.setWishlist(updated);
    setWishlist(updated);
  }

  function exportData() {
    const data = {
      settings: storage.getSettings(), maintenance: storage.getMaintenance(),
      fuel: storage.getFuel(), documents: storage.getDocuments(), wishlist: storage.getWishlist(),
      trips: storage.getTrips(), checklists: storage.getChecklists(),
      gallery: storage.getGallery().map(p => ({ ...p, dataUrl: '[omitida]' })),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `xtz-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }

  async function clearAll() {
    const ok = await confirm({ title: 'Apagar tudo', message: 'Isso vai apagar TODOS os seus dados permanentemente. Não há como desfazer.', confirmLabel: 'Apagar tudo', danger: true });
    if (!ok) return;
    const ok2 = await confirm({ title: 'Confirmar apagamento', message: 'Última confirmação — apagar todos os dados?', confirmLabel: 'Sim, apagar', danger: true });
    if (!ok2) return;
    storage.clearAll();
    window.location.reload();
  }

  async function handleLogout() {
    const ok = await confirm({ title: 'Encerrar sessão', message: 'Deseja sair da sua conta?', confirmLabel: 'Sair', danger: false });
    if (!ok) return;
    clearSession();
    router.push('/login');
  }

  if (!settings) return null;

  const pendingWish = wishlist.filter(w => !w.done);
  const pendingTotal = pendingWish.reduce((s, w) => s + (w.estimatedPrice || 0), 0);

  return (
    <>
      <div className="page-header" style={{ paddingTop: 24, paddingBottom: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Ajustes</h1>
      </div>

      <div className="page" style={{ paddingTop: 16 }}>

        {/* Tema */}
        <div className="section-title">Tema visual</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {THEMES.map(t => (
            <button key={t.key} onClick={() => { setTheme(t.key); patch({ theme: t.key }); }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface)', border: `2px solid ${theme === t.key ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', transition: 'border-color .15s', width: '100%' }}>
              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                {t.colors.map((c, i) => <div key={i} style={{ width: 20, height: 20, borderRadius: 6, background: c, border: '1px solid rgba(255,255,255,.1)' }} />)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{t.label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{t.desc}</div>
              </div>
              {theme === t.key && <Check size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
            </button>
          ))}
        </div>

        {/* Moto */}
        <div className="section-title">Configurações da moto</div>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-pad">
            <div className="form-group">
              <label className="form-label">KM atual</label>
              <input className="form-input" type="number" value={settings.currentMileage} onChange={e => patch({ currentMileage: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="form-row form-group">
              <div>
                <label className="form-label">Última troca de óleo (KM)</label>
                <input className="form-input" type="number" value={settings.lastOilChangeMileage} onChange={e => patch({ lastOilChangeMileage: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="form-label">Intervalo óleo (KM)</label>
                <input className="form-input" type="number" value={settings.oilChangeInterval} onChange={e => patch({ oilChangeInterval: parseInt(e.target.value) || 1500 })} />
              </div>
            </div>
            <div className="form-row form-group">
              <div>
                <label className="form-label">Último filtro (KM)</label>
                <input className="form-input" type="number" value={settings.lastFilterChangeMileage} onChange={e => patch({ lastFilterChangeMileage: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="form-label">Intervalo filtro (KM)</label>
                <input className="form-input" type="number" value={settings.filterChangeInterval} onChange={e => patch({ filterChangeInterval: parseInt(e.target.value) || 3000 })} />
              </div>
            </div>
            <div className="form-row form-group">
              <div>
                <label className="form-label">Última verif. corrente (KM)</label>
                <input className="form-input" type="number" value={settings.lastChainCheckMileage ?? settings.lastOilChangeMileage} onChange={e => patch({ lastChainCheckMileage: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="form-label">Intervalo corrente (KM)</label>
                <input className="form-input" type="number" value={settings.chainInterval} onChange={e => patch({ chainInterval: parseInt(e.target.value) || 500 })} />
              </div>
            </div>
            <button className={`btn btn-full ${saved ? 'btn-ghost' : 'btn-primary'}`} onClick={saveSettings}>
              {saved ? <><Check size={16} /> Salvo!</> : 'Salvar configurações'}
            </button>
          </div>
        </div>

        {/* Wishlist */}
        <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Lista de Desejo</span>
          {pendingWish.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
              {pendingWish.length} pendentes · R${pendingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-pad">
            {wishlist.length === 0 && !showAddWish && (
              <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '12px 0 4px' }}>Nenhum item</div>
            )}
            {wishlist.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)', opacity: item.done ? 0.55 : 1 }}>
                <button onClick={() => toggleWishDone(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  <ShoppingBag size={18} style={{ color: item.done ? 'var(--success)' : 'var(--muted)' }} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, textDecoration: item.done ? 'line-through' : 'none' }}>{item.description}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                    {item.estimatedPrice > 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>~R${item.estimatedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                    {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}><ExternalLink size={11} /> Ver produto</a>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '.04em', background: PRIORITY_BG[item.priority], color: PRIORITY_COLORS[item.priority] }}>{item.priority}</span>
                  <button onClick={() => removeWish(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={14} /></button>
                </div>
              </div>
            ))}
            {showAddWish ? (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: wishlist.length > 0 ? '1px solid var(--border)' : 'none' }}>
                <div className="form-group"><label className="form-label">Peça / Item</label><input className="form-input" placeholder="Ex: Par de amortecedores" value={newWishDesc} onChange={e => setNewWishDesc(e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Link do produto (opcional)</label><input className="form-input" type="url" placeholder="https://..." value={newWishUrl} onChange={e => setNewWishUrl(e.target.value)} /></div>
                <div className="form-row form-group">
                  <div><label className="form-label">Prioridade</label><select className="form-input" value={newWishPriority} onChange={e => setNewWishPriority(e.target.value as WishlistItem['priority'])}><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></select></div>
                  <div><label className="form-label">Preço estimado (R$)</label><input className="form-input" type="number" placeholder="0" value={newWishPrice} onChange={e => setNewWishPrice(e.target.value)} /></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={addWish}>Adicionar</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowAddWish(false)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-ghost btn-full" style={{ marginTop: wishlist.length > 0 ? 12 : 0 }} onClick={() => setShowAddWish(true)}><Plus size={16} /> Adicionar item</button>
            )}
          </div>
        </div>

        {/* Dados */}
        <div className="section-title">Dados</div>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Exportar dados</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Baixa um JSON com todo o histórico</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={exportData}><Download size={14} /> Exportar</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Apagar todos os dados</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Remove todos os registros permanentemente</div>
              </div>
              <button className="btn btn-danger-soft btn-sm" onClick={clearAll}><Trash2 size={14} /> Limpar</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Encerrar sessão</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Sair e voltar para a tela de login</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ color: 'var(--muted)', gap: 6 }}>
                <LogOut size={14} /> Sair
              </button>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', paddingBottom: 8 }}>
          XTZ 250X · Painel v3.1<br />
          <span style={{ fontSize: 11 }}>Dados salvos localmente neste navegador</span>
        </div>
      </div>
    </>
  );
}
