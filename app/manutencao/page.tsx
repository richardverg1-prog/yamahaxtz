'use client';
import { useEffect, useState, useRef } from 'react';
import { storage, compressImage } from '@/lib/storage';
import type { MaintenanceEntry, MaintenanceItem, AppSettings } from '@/lib/types';
import { Plus, Wrench, ChevronDown, ChevronUp, X, Camera, Trash2 } from 'lucide-react';

function fmt(n: number) { return n.toLocaleString('pt-BR'); }
function fmtR(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function fmtDate(s: string) { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

const TAG_LABELS: Record<string, string> = {
  oleo: 'Óleo', freio: 'Freio', filtro: 'Filtro', corrente: 'Corrente',
  pneu: 'Pneu', eletrica: 'Elétrica', vedacoes: 'Vedações', geral: 'Geral',
};

function TagBadge({ tag }: { tag: string }) {
  return <span className="badge badge-accent" style={{ fontSize: 10 }}>{TAG_LABELS[tag] ?? tag}</span>;
}

function getEntryInsights(entry: MaintenanceEntry, settings: AppSettings): { icon: string; text: string }[] {
  const insights: { icon: string; text: string }[] = [];
  const km = entry.mileage;

  if (entry.tags.includes('oleo')) {
    insights.push({ icon: '🛢️', text: `Próxima troca de óleo em ${fmt(km + settings.oilChangeInterval)} km` });
  }
  if (entry.tags.includes('filtro')) {
    insights.push({ icon: '🔵', text: `Próximo filtro de óleo em ${fmt(km + settings.filterChangeInterval)} km` });
  }
  if (entry.tags.includes('vedacoes')) {
    insights.push({ icon: '👁️', text: 'Retentor trocado — verificar vazamentos nas primeiras 500 km de uso' });
  }
  if (entry.tags.includes('freio')) {
    insights.push({ icon: '🔴', text: 'Freio revisado — verificar nível do fluido DOT4 quinzenalmente' });
  }
  if ((entry.notes || '').toLowerCase().includes('carter')) {
    insights.push({ icon: '🔩', text: 'Rosca do carter reparada — na próxima troca usar torque de 2,0 kgf·m (20 Nm) e verificar se não vaza' });
  }
  if (entry.tags.includes('corrente')) {
    insights.push({ icon: '⛓️', text: `Próxima verificação da corrente em ${fmt(km + 500)} km` });
  }
  if (entry.tags.includes('pneu')) {
    insights.push({ icon: '⚪', text: 'Pneu trocado — calibrar após 50–100 km (borracha nova acomoda)' });
  }
  if (entry.tags.includes('eletrica')) {
    insights.push({ icon: '⚡', text: 'Verificar conexões elétricas e terminais da bateria na próxima semana' });
  }
  return insights;
}

function EntryCard({ entry, settings, onDelete }: { entry: MaintenanceEntry; settings: AppSettings; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const insights = getEntryInsights(entry, settings);

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 14px', textAlign: 'left' }}
      >
        <div className="entry-icon"><Wrench size={18} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{entry.shop || 'Manutenção'}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            {fmtDate(entry.date)} · {fmt(entry.mileage)} km
          </div>
          <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {entry.tags.map(t => <TagBadge key={t} tag={t} />)}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent)' }}>{fmtR(entry.totalCost)}</div>
          <div style={{ color: 'var(--muted)', marginTop: 4 }}>
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </button>

      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
          {entry.shopPhone && (
            <div style={{ fontSize: 13, color: 'var(--muted)', paddingTop: 10, marginBottom: 10 }}>
              📞 {entry.shopPhone}
            </div>
          )}

          <table className="spec-table">
            <tbody>
              {entry.items.map((item, i) => (
                <tr key={i}>
                  <td style={{ width: '55%', color: 'var(--text)', fontSize: 13 }}>
                    {item.quantity !== 1 ? `${item.quantity}× ` : ''}{item.description}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtR(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', fontWeight: 800 }}>
            <span style={{ fontSize: 14 }}>TOTAL</span>
            <span style={{ fontSize: 18, color: 'var(--accent)' }}>{fmtR(entry.totalCost)}</span>
          </div>

          {entry.notes && (
            <div style={{ marginTop: 10, padding: '10px', background: 'var(--surface2)', borderRadius: 8, fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
              {entry.notes}
            </div>
          )}

          {entry.photos.length > 0 && (
            <div className="photo-grid" style={{ marginTop: 12 }}>
              {entry.photos.map((p, i) => (
                <div key={i} className="photo-cell" onClick={() => window.open(p, '_blank')}>
                  <img src={p} alt="" />
                </div>
              ))}
            </div>
          )}

          {insights.length > 0 && (
            <div style={{ marginTop: 14, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                Dicas desta manutenção
              </div>
              {insights.map((ins, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: 'var(--text)', lineHeight: 1.5, paddingTop: i > 0 ? 6 : 0 }}>
                  <span style={{ flexShrink: 0 }}>{ins.icon}</span>
                  <span>{ins.text}</span>
                </div>
              ))}
            </div>
          )}

          <button
            className="btn btn-danger-soft btn-sm"
            style={{ marginTop: 12 }}
            onClick={() => { if (confirm('Excluir esta entrada?')) onDelete(entry.id); }}
          >
            <Trash2 size={14} /> Excluir
          </button>
        </div>
      )}
    </div>
  );
}

function Modal({ onClose, onSave }: { onClose: () => void; onSave: (e: MaintenanceEntry) => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mileage, setMileage] = useState('');
  const [shop, setShop] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [items, setItems] = useState<MaintenanceItem[]>([{ description: '', quantity: 1, unit: 'un', total: 0 }]);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const total = items.reduce((s, i) => s + (Number(i.total) || 0), 0);

  function addItem() { setItems([...items, { description: '', quantity: 1, unit: 'un', total: 0 }]); }
  function removeItem(idx: number) { setItems(items.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, key: keyof MaintenanceItem, val: string | number) {
    setItems(items.map((item, i) => i === idx ? { ...item, [key]: val } : item));
  }
  function toggleTag(t: string) { setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]); }

  async function handlePhotos(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    for (const f of Array.from(files)) {
      const url = await compressImage(f);
      setPhotos(prev => [...prev, url]);
    }
    setUploading(false);
  }

  function save() {
    if (!mileage || !items.some(i => i.description)) return;
    const entry: MaintenanceEntry = {
      id: uid(), date, mileage: parseInt(mileage),
      shop, shopPhone, items: items.filter(i => i.description),
      totalCost: total, notes, photos, tags,
    };
    if (tags.includes('oleo')) storage.patchSettings({ lastOilChangeMileage: parseInt(mileage), currentMileage: parseInt(mileage) });
    if (tags.includes('filtro')) storage.patchSettings({ lastFilterChangeMileage: parseInt(mileage) });
    onSave(entry);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="modal-title" style={{ margin: 0 }}>Nova Manutenção</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
          💡 Tire foto da nota fiscal, preencha os dados e anexe como comprovante. Pode me mandar a foto no chat e eu formato tudo pra você.
        </div>

        <div className="form-row form-group">
          <div>
            <label className="form-label">Data</label>
            <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="form-label">KM da moto</label>
            <input className="form-input" type="number" placeholder="Ex: 1500" value={mileage} onChange={e => setMileage(e.target.value)} />
          </div>
        </div>

        <div className="form-row form-group">
          <div>
            <label className="form-label">Oficina / Local</label>
            <input className="form-input" placeholder="Premier Moto Peças" value={shop} onChange={e => setShop(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Telefone</label>
            <input className="form-input" placeholder="(00) 00000-0000" value={shopPhone} onChange={e => setShopPhone(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Categoria</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(TAG_LABELS).map(([k, v]) => (
              <button key={k} onClick={() => toggleTag(k)}
                className={`btn btn-sm ${tags.includes(k) ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 12px', fontSize: 12 }}
              >{v}</button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Itens / Peças</label>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 56px 72px 24px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
              <input className="form-input" placeholder="Descrição" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} style={{ fontSize: 13 }} />
              <input className="form-input" type="number" min="0.1" step="0.1" placeholder="Qtd" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value))} style={{ fontSize: 13, textAlign: 'center' }} />
              <input className="form-input" type="number" placeholder="R$" value={item.total || ''} onChange={e => updateItem(i, 'total', parseFloat(e.target.value))} style={{ fontSize: 13, textAlign: 'right' }} />
              <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
                <X size={16} />
              </button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={addItem} style={{ width: '100%', marginTop: 4 }}>
            <Plus size={14} /> Adicionar item
          </button>
          <div style={{ textAlign: 'right', marginTop: 10, fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>
            Total: {fmtR(total)}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Observações</label>
          <textarea className="form-input" rows={2} placeholder="Observações sobre o serviço..." value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'none' }} />
        </div>

        <div className="form-group">
          <label className="form-label">Fotos da nota / serviço</label>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => handlePhotos(e.target.files)} style={{ display: 'none' }} />
          <button className="btn btn-ghost btn-full" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Camera size={16} /> {uploading ? 'Comprimindo...' : 'Adicionar fotos'}
          </button>
          {photos.length > 0 && (
            <div className="photo-grid" style={{ marginTop: 8 }}>
              {photos.map((p, i) => (
                <div key={i} className="photo-cell"><img src={p} alt="" /></div>
              ))}
            </div>
          )}
        </div>

        <button className="btn btn-primary btn-full" onClick={save} disabled={!mileage}>
          Salvar manutenção
        </button>
        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}

export default function Manutencao() {
  const [entries, setEntries] = useState<MaintenanceEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setEntries(storage.getMaintenance().sort((a, b) => b.date.localeCompare(a.date)));
    setSettings(storage.getSettings());
  }, []);

  function handleSave(e: MaintenanceEntry) {
    const updated = [e, ...entries];
    storage.setMaintenance(updated);
    setEntries(updated);
    setSettings(storage.getSettings());
    setShowModal(false);
  }

  function handleDelete(id: string) {
    const updated = entries.filter(e => e.id !== id);
    storage.setMaintenance(updated);
    setEntries(updated);
  }

  const total = entries.reduce((s, e) => s + e.totalCost, 0);

  return (
    <>
      <div className="page-header" style={{ paddingTop: 24, paddingBottom: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Manutenção</h1>
        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
          <div className="stat-tile" style={{ flex: 1 }}>
            <div className="stat-label">Total gasto</div>
            <div className="stat-value" style={{ fontSize: 20 }}>
              {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>
          <div className="stat-tile" style={{ flex: 1 }}>
            <div className="stat-label">Registros</div>
            <div className="stat-value">{entries.length}</div>
          </div>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 16 }}>
        {entries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
            <Wrench size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <div>Nenhuma manutenção registrada ainda</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Toque no + para adicionar</div>
          </div>
        )}
        {settings && entries.map(e => (
          <EntryCard key={e.id} entry={e} settings={settings} onDelete={handleDelete} />
        ))}
      </div>

      <button className="fab" onClick={() => setShowModal(true)}>
        <Plus size={24} />
      </button>

      {showModal && <Modal onClose={() => setShowModal(false)} onSave={handleSave} />}
    </>
  );
}
