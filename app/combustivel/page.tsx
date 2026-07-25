'use client';
import { useEffect, useRef, useState } from 'react';
import { storage, compressImage } from '@/lib/storage';
import type { FuelEntry } from '@/lib/types';
import { Plus, Droplets, X, Trash2, TrendingUp, Camera, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

function fmtR(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function fmtFull(s: string) { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function calcKmL(entries: FuelEntry[]): FuelEntry[] {
  const sorted = [...entries].sort((a, b) => a.mileage - b.mileage);
  return sorted.map((e, i) => {
    if (i === 0 || !e.isFull) return { ...e, kmL: null };
    const prev = sorted.slice(0, i).reverse().find(p => p.isFull);
    if (!prev) return { ...e, kmL: null };
    const distancia = e.mileage - prev.mileage;
    if (distancia <= 0 || e.liters <= 0) return { ...e, kmL: null };
    return { ...e, kmL: Math.round((distancia / e.liters) * 10) / 10 };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

function Modal({ onClose, onSave, lastMileage }: { onClose: () => void; onSave: (e: FuelEntry) => void; lastMileage: number }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mileage, setMileage] = useState('');
  const [liters, setLiters] = useState('');
  const [total, setTotal] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [isFull, setIsFull] = useState(true);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (liters && total) {
      const ppl = parseFloat(total) / parseFloat(liters);
      if (!isNaN(ppl)) setPricePerLiter(ppl.toFixed(2));
    }
  }, [liters, total]);

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
    if (!mileage || !liters || !total) return;
    const entry: FuelEntry = {
      id: uid(), date, mileage: parseInt(mileage),
      liters: parseFloat(liters), totalCost: parseFloat(total),
      pricePerLiter: parseFloat(pricePerLiter) || parseFloat(total) / parseFloat(liters),
      isFull, notes, kmL: null, photos,
    };
    storage.patchSettings({ currentMileage: parseInt(mileage) });
    onSave(entry);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div className="modal-title" style={{ margin: 0 }}>Novo Abastecimento</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="form-row form-group">
          <div>
            <label className="form-label">Data</label>
            <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="form-label">KM atual</label>
            <input className="form-input" type="number" placeholder={String(lastMileage)} value={mileage} onChange={e => setMileage(e.target.value)} />
          </div>
        </div>

        <div className="form-row form-group">
          <div>
            <label className="form-label">Litros</label>
            <input className="form-input" type="number" step="0.001" placeholder="Ex: 8.796" value={liters} onChange={e => setLiters(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Total (R$)</label>
            <input className="form-input" type="number" step="0.01" placeholder="Ex: 60.16" value={total} onChange={e => setTotal(e.target.value)} />
          </div>
        </div>

        {pricePerLiter && (
          <div className="card-inner" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Preço por litro (calculado)</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>R$ {pricePerLiter}/L</span>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Tanque cheio?</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn btn-sm ${isFull ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setIsFull(true)}>Sim (cheio)</button>
            <button className={`btn btn-sm ${!isFull ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setIsFull(false)}>Não (parcial)</button>
          </div>
          {!isFull && <div style={{ fontSize: 12, color: 'var(--warn)', marginTop: 6 }}>Parcial não calcula km/L</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Posto / Observações</label>
          <input className="form-input" placeholder="Ex: Posto Shell, Gasolina aditivada..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Foto do bomba / recibo</label>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => handlePhotos(e.target.files)} style={{ display: 'none' }} />
          <button className="btn btn-ghost btn-full" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Camera size={16} /> {uploading ? 'Comprimindo...' : 'Adicionar foto'}
          </button>
          {photos.length > 0 && (
            <div className="photo-grid" style={{ marginTop: 8 }}>
              {photos.map((p, i) => (
                <div key={i} className="photo-cell"><img src={p} alt="" /></div>
              ))}
            </div>
          )}
        </div>

        <button className="btn btn-primary btn-full" onClick={save} disabled={!mileage || !liters || !total}>
          Salvar abastecimento
        </button>
        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}

function KmLTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
      <div style={{ color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: 16 }}>{payload[0].value} km/L</div>
    </div>
  );
}

function PriceTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
      <div style={{ color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 16 }}>R$ {payload[0].value}/L</div>
    </div>
  );
}

function FuelCard({ entry, onDelete }: { entry: FuelEntry; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const hasPhotos = (entry.photos?.length ?? 0) > 0;

  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <button
        onClick={() => (hasPhotos ? setOpen(o => !o) : undefined)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'none', border: 'none', cursor: hasPhotos ? 'pointer' : 'default', padding: '12px 14px', textAlign: 'left' }}
      >
        <div className="entry-icon" style={{ background: 'rgba(82,160,96,.15)', color: 'var(--success)' }}>
          <Droplets size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {entry.liters.toFixed(3)} L
            {entry.kmL ? <span style={{ color: 'var(--success)', marginLeft: 8, fontSize: 13 }}>· {entry.kmL} km/L</span> : ''}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            {fmtFull(entry.date)} · {entry.mileage.toLocaleString('pt-BR')} km · R${entry.pricePerLiter.toFixed(2)}/L
          </div>
          {entry.notes && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontStyle: 'italic' }}>{entry.notes}</div>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{fmtR(entry.totalCost)}</div>
          {!entry.isFull && <div className="badge badge-warn" style={{ marginTop: 4 }}>Parcial</div>}
          {hasPhotos && (
            <div style={{ color: 'var(--muted)', marginTop: 4 }}>
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          )}
          <button onClick={e => { e.stopPropagation(); if (confirm('Excluir?')) onDelete(entry.id); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', marginTop: 4, display: 'block', marginLeft: 'auto' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </button>

      {open && hasPhotos && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
          <div className="photo-grid" style={{ marginTop: 8 }}>
            {entry.photos!.map((p, i) => (
              <div key={i} className="photo-cell" onClick={() => window.open(p, '_blank')}>
                <img src={p} alt="" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Combustivel() {
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setEntries(calcKmL(storage.getFuel()));
  }, []);

  function handleSave(e: FuelEntry) {
    const updated = calcKmL([e, ...storage.getFuel()]);
    storage.setFuel(updated);
    setEntries(updated);
    setShowModal(false);
  }

  function handleDelete(id: string) {
    const updated = calcKmL(storage.getFuel().filter(e => e.id !== id));
    storage.setFuel(updated);
    setEntries(updated);
  }

  const validKmL = entries.filter(e => e.kmL !== null && e.kmL! > 0).sort((a, b) => a.mileage - b.mileage);
  const avgKmL = validKmL.length ? (validKmL.reduce((s, e) => s + e.kmL!, 0) / validKmL.length).toFixed(1) : null;
  const bestKmL = validKmL.length ? Math.max(...validKmL.map(e => e.kmL!)).toFixed(1) : null;
  const totalLiters = entries.reduce((s, e) => s + e.liters, 0);
  const totalCost = entries.reduce((s, e) => s + e.totalCost, 0);
  const avgPriceL = totalLiters > 0 ? totalCost / totalLiters : 0;

  const kmLChartData = validKmL.map(e => ({ km: `${e.mileage}km`, kmL: e.kmL }));

  const priceChartData = [...entries]
    .filter(e => e.pricePerLiter > 0)
    .sort((a, b) => a.mileage - b.mileage)
    .map(e => ({ km: `${e.mileage}km`, price: Math.round(e.pricePerLiter * 100) / 100 }));

  const lastMileage = entries.length > 0 ? Math.max(...entries.map(e => e.mileage)) : 1381;

  return (
    <>
      <div className="page-header" style={{ paddingTop: 24, paddingBottom: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Combustível</h1>
        <div className="stat-grid" style={{ marginTop: 12 }}>
          <div className="stat-tile">
            <div className="stat-label">Consumo médio</div>
            <div className="stat-value">{avgKmL ?? '—'}</div>
            <div className="stat-sub">km/L</div>
          </div>
          <div className="stat-tile">
            <div className="stat-label">Melhor tanque</div>
            <div className="stat-value">{bestKmL ?? '—'}</div>
            <div className="stat-sub">km/L</div>
          </div>
          <div className="stat-tile">
            <div className="stat-label">Total abastecido</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{totalLiters.toFixed(1)}<span style={{ fontSize: 14 }}>L</span></div>
          </div>
          <div className="stat-tile">
            <div className="stat-label">Preço médio/L</div>
            <div className="stat-value" style={{ fontSize: 20 }}>R${avgPriceL.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 16 }}>

        {/* km/L chart */}
        {kmLChartData.length >= 2 && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-pad">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <TrendingUp size={16} style={{ color: 'var(--success)' }} />
                <div className="card-title" style={{ margin: 0 }}>Consumo ao longo do tempo</div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={kmLChartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="km" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip content={<KmLTooltip />} />
                  <Line type="monotone" dataKey="kmL" stroke="var(--success)" strokeWidth={2} dot={{ fill: 'var(--success)', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Preço/L chart */}
        {priceChartData.length >= 2 && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-pad">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <DollarSign size={16} style={{ color: 'var(--accent)' }} />
                <div className="card-title" style={{ margin: 0 }}>Preço da gasolina (R$/L)</div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={priceChartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="km" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} domain={['dataMin - 0.2', 'dataMax + 0.2']} />
                  <Tooltip content={<PriceTooltip />} />
                  <Line type="monotone" dataKey="price" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {validKmL.length < 2 && (
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
            ⛽ O gráfico de consumo aparece a partir do 2º abastecimento cheio. Zere o Trip2 no painel da moto e registre km + litros em cada abastecimento completo.
          </div>
        )}

        {entries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
            <Droplets size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <div>Nenhum abastecimento registrado</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Toque no + para adicionar</div>
          </div>
        )}

        {entries.map(e => (
          <FuelCard key={e.id} entry={e} onDelete={handleDelete} />
        ))}
      </div>

      <button className="fab" onClick={() => setShowModal(true)}>
        <Plus size={24} />
      </button>

      {showModal && <Modal onClose={() => setShowModal(false)} onSave={handleSave} lastMileage={lastMileage} />}
    </>
  );
}
