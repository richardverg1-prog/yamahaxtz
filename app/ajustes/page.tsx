'use client';
import { useEffect, useState } from 'react';
import { storage } from '@/lib/storage';
import { useTheme } from '@/components/ThemeProvider';
import type { AppSettings, Theme, TireEntry, MotoDocument, WishlistItem } from '@/lib/types';
import { Check, Download, Trash2, Plus, X, ShoppingBag } from 'lucide-react';

const THEMES: { key: Theme; label: string; desc: string; colors: [string, string, string] }[] = [
  { key: 'dark', label: 'Noite', desc: 'Fundo escuro com âmbar — ideal para uso noturno', colors: ['#0D0C08', '#F5A623', '#2E2C22'] },
  { key: 'light', label: 'Dia', desc: 'Fundo claro e limpo — ideal para luz do dia', colors: ['#F2F0EB', '#C47D12', '#DDDAD2'] },
  { key: 'sunset', label: 'Pôr do Sol', desc: 'Marrom quente com laranja — estilo café com leite', colors: ['#1E0E06', '#FF8C42', '#4A2810'] },
];

const DOC_TYPES = [
  { key: 'crlv', label: 'CRLV', emoji: '📋' },
  { key: 'seguro', label: 'Seguro', emoji: '🛡️' },
  { key: 'ipva', label: 'IPVA', emoji: '🏛️' },
  { key: 'outro', label: 'Outro', emoji: '📄' },
] as const;

const PRIORITY_COLORS: Record<string, string> = {
  alta: 'var(--danger)', media: 'var(--warn)', baixa: 'var(--muted)',
};
const PRIORITY_BG: Record<string, string> = {
  alta: 'var(--danger-dim)', media: 'var(--warn-dim)', baixa: 'var(--surface2)',
};

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function dotAge(code: string): string {
  if (!code || code.replace(/\s/g, '').length < 4) return '';
  const last4 = code.replace(/\s/g, '').slice(-4);
  const week = parseInt(last4.slice(0, 2));
  const year = 2000 + parseInt(last4.slice(2));
  if (isNaN(week) || isNaN(year) || week < 1 || week > 53 || year < 2000 || year > 2099) return 'Formato inválido — use SSSAA (ex: 2322)';
  const mfgDate = new Date(year, 0, 1);
  mfgDate.setDate(mfgDate.getDate() + (week - 1) * 7);
  const now = new Date();
  const ageMs = now.getTime() - mfgDate.getTime();
  const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
  const aged = ageYears > 5;
  return `${ageYears.toFixed(1)} anos — fabricado semana ${week}/${year}${aged ? ' ⚠️ ATENÇÃO: >5 anos' : ''}`;
}

function docExpiryInfo(expiry: string): { daysLeft: number; color: string; label: string } {
  if (!expiry) return { daysLeft: Infinity, color: 'var(--muted)', label: '' };
  const today = new Date().toISOString().slice(0, 10);
  const daysLeft = Math.round((new Date(expiry).getTime() - new Date(today).getTime()) / 86400000);
  if (daysLeft < 0) return { daysLeft, color: 'var(--danger)', label: `Vencido há ${Math.abs(daysLeft)}d` };
  if (daysLeft <= 30) return { daysLeft, color: 'var(--danger)', label: `Vence em ${daysLeft}d` };
  if (daysLeft <= 90) return { daysLeft, color: 'var(--warn)', label: `Vence em ${daysLeft}d` };
  return { daysLeft, color: 'var(--success)', label: `Válido (+${daysLeft}d)` };
}

function fmtDate(s: string) { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; }

function TireEditor({ position, tire, currentMileage, onSave }: {
  position: 'dianteiro' | 'traseiro';
  tire?: TireEntry;
  currentMileage: number;
  onSave: (t: TireEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState(tire?.brand ?? '');
  const [model, setModel] = useState(tire?.model ?? '');
  const [size, setSize] = useState(tire?.size ?? '');
  const [installDate, setInstallDate] = useState(tire?.installDate ?? '');
  const [installMileage, setInstallMileage] = useState(String(tire?.installMileage ?? ''));
  const [expectedLifeKm, setExpectedLifeKm] = useState(String(tire?.expectedLifeKm ?? 10000));
  const [dotCode, setDotCode] = useState(tire?.dotCode ?? '');
  const [notes, setNotes] = useState(tire?.notes ?? '');

  const label = position === 'dianteiro' ? 'Dianteiro' : 'Traseiro';
  const defaultSize = position === 'dianteiro' ? '80/100-21' : '110/90-18';

  const kmUsed = tire ? Math.max(0, currentMileage - (tire.installMileage || 0)) : 0;
  const lifeKm = tire?.expectedLifeKm || 10000;
  const pct = Math.min(1, kmUsed / lifeKm);
  const pctColor = pct > 0.85 ? 'var(--danger)' : pct > 0.6 ? 'var(--warn)' : 'var(--success)';

  function save() {
    const t: TireEntry = {
      position, brand, model, size: size || defaultSize,
      installDate, installMileage: parseInt(installMileage) || 0,
      expectedLifeKm: parseInt(expectedLifeKm) || 10000,
      dotCode, notes,
    };
    onSave(t);
    setOpen(false);
  }

  return (
    <div className="card-inner" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {label} {tire ? `— ${tire.brand} ${tire.model}` : '— não cadastrado'}
          </div>
          {tire && (
            <>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {tire.size} · instalado em {fmtDate(tire.installDate)} ({tire.installMileage.toLocaleString('pt-BR')} km)
              </div>
              {tire.dotCode && (
                <div style={{ fontSize: 11, color: tire.dotCode.length >= 4 && parseFloat(dotAge(tire.dotCode)) > 5 ? 'var(--warn)' : 'var(--muted)', marginTop: 2 }}>
                  DOT: {tire.dotCode} · {dotAge(tire.dotCode)}
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                  <span>Vida útil usada: {kmUsed.toLocaleString('pt-BR')} km</span>
                  <span style={{ color: pctColor, fontWeight: 700 }}>{Math.round(pct * 100)}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct * 100}%`, background: pctColor }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                  Restam ~{Math.max(0, lifeKm - kmUsed).toLocaleString('pt-BR')} km de {lifeKm.toLocaleString('pt-BR')} km esperados
                </div>
              </div>
            </>
          )}
        </div>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8, flexShrink: 0 }} onClick={() => setOpen(o => !o)}>
          {open ? 'Fechar' : tire ? 'Editar' : 'Cadastrar'}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div className="form-row form-group">
            <div>
              <label className="form-label">Marca</label>
              <input className="form-input" placeholder="Pirelli" value={brand} onChange={e => setBrand(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Modelo</label>
              <input className="form-input" placeholder="Sport Demon" value={model} onChange={e => setModel(e.target.value)} />
            </div>
          </div>
          <div className="form-row form-group">
            <div>
              <label className="form-label">Medida</label>
              <input className="form-input" placeholder={defaultSize} value={size} onChange={e => setSize(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Vida esperada (km)</label>
              <input className="form-input" type="number" value={expectedLifeKm} onChange={e => setExpectedLifeKm(e.target.value)} />
            </div>
          </div>
          <div className="form-row form-group">
            <div>
              <label className="form-label">Data de instalação</label>
              <input className="form-input" type="date" value={installDate} onChange={e => setInstallDate(e.target.value)} />
            </div>
            <div>
              <label className="form-label">KM na instalação</label>
              <input className="form-input" type="number" placeholder="0" value={installMileage} onChange={e => setInstallMileage(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Código DOT (últimos 4 dígitos = SSAA)</label>
            <input className="form-input" placeholder="Ex: 2322 (semana 23 de 2022)" value={dotCode} onChange={e => setDotCode(e.target.value)} />
            {dotCode && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{dotAge(dotCode)}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <input className="form-input" placeholder="Estado, notas..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-full" onClick={save}>Salvar pneu</button>
        </div>
      )}
    </div>
  );
}

export default function Ajustes() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [documents, setDocuments] = useState<MotoDocument[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [saved, setSaved] = useState(false);

  const [showAddDoc, setShowAddDoc] = useState(false);
  const [newDocType, setNewDocType] = useState<MotoDocument['type']>('crlv');
  const [newDocLabel, setNewDocLabel] = useState('');
  const [newDocNumber, setNewDocNumber] = useState('');
  const [newDocExpiry, setNewDocExpiry] = useState('');
  const [newDocNotes, setNewDocNotes] = useState('');

  const [showAddWish, setShowAddWish] = useState(false);
  const [newWishDesc, setNewWishDesc] = useState('');
  const [newWishPriority, setNewWishPriority] = useState<WishlistItem['priority']>('media');
  const [newWishPrice, setNewWishPrice] = useState('');

  useEffect(() => {
    setSettings(storage.getSettings());
    setDocuments(storage.getDocuments());
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

  function saveTire(position: 'dianteiro' | 'traseiro', tire: TireEntry) {
    if (!settings) return;
    const updated = { ...settings, tires: { ...(settings.tires ?? {}), [position]: tire } };
    setSettings(updated);
    storage.setSettings(updated);
  }

  function addDoc() {
    if (!newDocLabel) return;
    const doc: MotoDocument = {
      id: uid(),
      type: newDocType,
      label: newDocLabel || DOC_TYPES.find(d => d.key === newDocType)?.label || newDocType,
      expiry: newDocExpiry,
      number: newDocNumber,
      notes: newDocNotes,
    };
    const updated = [...documents, doc];
    storage.setDocuments(updated);
    setDocuments(updated);
    setShowAddDoc(false);
    setNewDocLabel(''); setNewDocNumber(''); setNewDocExpiry(''); setNewDocNotes('');
  }

  function removeDoc(id: string) {
    const updated = documents.filter(d => d.id !== id);
    storage.setDocuments(updated);
    setDocuments(updated);
  }

  function addWish() {
    if (!newWishDesc) return;
    const item: WishlistItem = {
      id: uid(),
      description: newWishDesc,
      priority: newWishPriority,
      estimatedPrice: parseFloat(newWishPrice) || 0,
      done: false,
    };
    const updated = [...wishlist, item];
    storage.setWishlist(updated);
    setWishlist(updated);
    setShowAddWish(false);
    setNewWishDesc(''); setNewWishPrice('');
  }

  function toggleWishDone(id: string) {
    const updated = wishlist.map(w => w.id === id ? { ...w, done: !w.done } : w);
    storage.setWishlist(updated);
    setWishlist(updated);
  }

  function removeWish(id: string) {
    const updated = wishlist.filter(w => w.id !== id);
    storage.setWishlist(updated);
    setWishlist(updated);
  }

  function exportData() {
    const data = {
      settings: storage.getSettings(),
      maintenance: storage.getMaintenance(),
      fuel: storage.getFuel(),
      documents: storage.getDocuments(),
      wishlist: storage.getWishlist(),
      trips: storage.getTrips(),
      checklists: storage.getChecklists(),
      gallery: storage.getGallery().map(p => ({ ...p, dataUrl: '[omitida]' })),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xtz-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }

  function clearAll() {
    if (!confirm('Isso vai apagar TODOS os dados. Tem certeza?')) return;
    if (!confirm('Segunda confirmação: apagar tudo mesmo?')) return;
    storage.clearAll();
    window.location.reload();
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
            <button
              key={t.key}
              onClick={() => { setTheme(t.key); patch({ theme: t.key }); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'var(--surface)', border: `2px solid ${theme === t.key ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                transition: 'border-color .15s', width: '100%',
              }}
            >
              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                {t.colors.map((c, i) => (
                  <div key={i} style={{ width: 20, height: 20, borderRadius: 6, background: c, border: '1px solid rgba(255,255,255,.1)' }} />
                ))}
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
        <div className="section-title">Informações da moto</div>
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
            <button className={`btn btn-full ${saved ? 'btn-ghost' : 'btn-primary'}`} onClick={saveSettings}>
              {saved ? <><Check size={16} /> Salvo!</> : 'Salvar configurações'}
            </button>
          </div>
        </div>

        {/* Pneus */}
        <div className="section-title">Pneus</div>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-pad">
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
              Registre marca, tamanho e DOT dos pneus. O DOT é o código de fabricação impresso na lateral do pneu (ex: DOT ...2322 = semana 23 de 2022).
            </div>
            <TireEditor
              position="dianteiro"
              tire={settings.tires?.dianteiro}
              currentMileage={settings.currentMileage}
              onSave={t => saveTire('dianteiro', t)}
            />
            <TireEditor
              position="traseiro"
              tire={settings.tires?.traseiro}
              currentMileage={settings.currentMileage}
              onSave={t => saveTire('traseiro', t)}
            />
          </div>
        </div>

        {/* Documentos */}
        <div className="section-title">Documentos</div>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-pad">
            {documents.length === 0 && !showAddDoc && (
              <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '12px 0 4px' }}>
                Nenhum documento cadastrado
              </div>
            )}

            {documents.map(doc => {
              const info = docExpiryInfo(doc.expiry);
              const typeEmoji = DOC_TYPES.find(d => d.key === doc.type)?.emoji ?? '📄';
              return (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{typeEmoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{doc.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {doc.number && `Nº ${doc.number} · `}
                      {doc.expiry ? `Vence: ${fmtDate(doc.expiry)}` : 'Sem vencimento'}
                    </div>
                    {doc.notes && <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', marginTop: 2 }}>{doc.notes}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {doc.expiry && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: info.color }}>{info.label}</div>
                    )}
                    <button onClick={() => removeDoc(doc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', marginTop: 4 }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}

            {showAddDoc ? (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: documents.length > 0 ? '1px solid var(--border)' : 'none' }}>
                <div className="form-row form-group">
                  <div>
                    <label className="form-label">Tipo</label>
                    <select className="form-input" value={newDocType} onChange={e => setNewDocType(e.target.value as any)}>
                      {DOC_TYPES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Nome / Descrição</label>
                    <input className="form-input" placeholder="Ex: CRLV 2026" value={newDocLabel} onChange={e => setNewDocLabel(e.target.value)} />
                  </div>
                </div>
                <div className="form-row form-group">
                  <div>
                    <label className="form-label">Número</label>
                    <input className="form-input" placeholder="Nº do documento" value={newDocNumber} onChange={e => setNewDocNumber(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Data de vencimento</label>
                    <input className="form-input" type="date" value={newDocExpiry} onChange={e => setNewDocExpiry(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Observações</label>
                  <input className="form-input" placeholder="Seguradora, valor pago..." value={newDocNotes} onChange={e => setNewDocNotes(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={addDoc}>Salvar</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowAddDoc(false)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-ghost btn-full" style={{ marginTop: documents.length > 0 ? 12 : 0 }} onClick={() => setShowAddDoc(true)}>
                <Plus size={16} /> Adicionar documento
              </button>
            )}
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
              <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '12px 0 4px' }}>
                Nenhum item na lista de desejo
              </div>
            )}

            {wishlist.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)', opacity: item.done ? 0.55 : 1 }}>
                <button onClick={() => toggleWishDone(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  <ShoppingBag size={18} style={{ color: item.done ? 'var(--success)' : 'var(--muted)' }} />
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, textDecoration: item.done ? 'line-through' : 'none' }}>{item.description}</div>
                  {item.estimatedPrice > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      ~R${item.estimatedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '.04em',
                    background: PRIORITY_BG[item.priority], color: PRIORITY_COLORS[item.priority],
                  }}>
                    {item.priority}
                  </span>
                  <button onClick={() => removeWish(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}

            {showAddWish ? (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: wishlist.length > 0 ? '1px solid var(--border)' : 'none' }}>
                <div className="form-group">
                  <label className="form-label">Peça / Item</label>
                  <input className="form-input" placeholder="Ex: Par de amortecedores Cofap" value={newWishDesc} onChange={e => setNewWishDesc(e.target.value)} />
                </div>
                <div className="form-row form-group">
                  <div>
                    <label className="form-label">Prioridade</label>
                    <select className="form-input" value={newWishPriority} onChange={e => setNewWishPriority(e.target.value as any)}>
                      <option value="alta">Alta</option>
                      <option value="media">Média</option>
                      <option value="baixa">Baixa</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Preço estimado (R$)</label>
                    <input className="form-input" type="number" placeholder="0" value={newWishPrice} onChange={e => setNewWishPrice(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={addWish}>Adicionar</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowAddWish(false)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-ghost btn-full" style={{ marginTop: wishlist.length > 0 ? 12 : 0 }} onClick={() => setShowAddWish(true)}>
                <Plus size={16} /> Adicionar item
              </button>
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
              <button className="btn btn-ghost btn-sm" onClick={exportData}>
                <Download size={14} /> Exportar
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Apagar tudo</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Remove todos os registros permanentemente</div>
              </div>
              <button className="btn btn-danger-soft btn-sm" onClick={clearAll}>
                <Trash2 size={14} /> Limpar
              </button>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', paddingBottom: 8 }}>
          XTZ 250X — Painel v2.0<br />
          Dados salvos localmente no dispositivo
        </div>
      </div>
    </>
  );
}
