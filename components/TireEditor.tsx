'use client';
import { useState } from 'react';
import type { TireEntry } from '@/lib/types';

function fmtDate(s: string) { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; }

export function dotAge(code: string): string {
  if (!code || code.replace(/\s/g, '').length < 4) return '';
  const last4 = code.replace(/\s/g, '').slice(-4);
  const week = parseInt(last4.slice(0, 2));
  const year = 2000 + parseInt(last4.slice(2));
  if (isNaN(week) || isNaN(year) || week < 1 || week > 53 || year < 2000 || year > 2099)
    return 'Formato inválido — use SSSAA (ex: 2322)';
  const mfgDate = new Date(year, 0, 1);
  mfgDate.setDate(mfgDate.getDate() + (week - 1) * 7);
  const ageYears = (Date.now() - mfgDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return `${ageYears.toFixed(1)} anos — semana ${week}/${year}${ageYears > 5 ? ' ⚠️ ATENÇÃO: >5 anos' : ''}`;
}

export function TireEditor({ position, tire, currentMileage, onSave }: {
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
    onSave({
      position, brand, model,
      size: size || defaultSize,
      installDate,
      installMileage: parseInt(installMileage) || 0,
      expectedLifeKm: parseInt(expectedLifeKm) || 10000,
      dotCode, notes,
    });
    setOpen(false);
  }

  return (
    <div className="card-inner" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            Pneu {label} {tire ? `— ${tire.brand} ${tire.model}` : '— não cadastrado'}
          </div>
          {tire && (
            <>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {tire.size} · instalado {fmtDate(tire.installDate)} em {tire.installMileage.toLocaleString('pt-BR')} km
              </div>
              {tire.dotCode && (
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  DOT {tire.dotCode} · {dotAge(tire.dotCode)}
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                  <span>{kmUsed.toLocaleString('pt-BR')} km usados</span>
                  <span style={{ color: pctColor, fontWeight: 700 }}>{Math.round(pct * 100)}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct * 100}%`, background: pctColor }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                  ~{Math.max(0, lifeKm - kmUsed).toLocaleString('pt-BR')} km restantes de {lifeKm.toLocaleString('pt-BR')} km
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
            <div><label className="form-label">Marca</label><input className="form-input" placeholder="Pirelli" value={brand} onChange={e => setBrand(e.target.value)} /></div>
            <div><label className="form-label">Modelo</label><input className="form-input" placeholder="Sport Demon" value={model} onChange={e => setModel(e.target.value)} /></div>
          </div>
          <div className="form-row form-group">
            <div><label className="form-label">Medida</label><input className="form-input" placeholder={defaultSize} value={size} onChange={e => setSize(e.target.value)} /></div>
            <div><label className="form-label">Vida esperada (km)</label><input className="form-input" type="number" value={expectedLifeKm} onChange={e => setExpectedLifeKm(e.target.value)} /></div>
          </div>
          <div className="form-row form-group">
            <div><label className="form-label">Data instalação</label><input className="form-input" type="date" value={installDate} onChange={e => setInstallDate(e.target.value)} /></div>
            <div><label className="form-label">KM na instalação</label><input className="form-input" type="number" value={installMileage} onChange={e => setInstallMileage(e.target.value)} /></div>
          </div>
          <div className="form-group">
            <label className="form-label">Código DOT (últimos 4 = SSAA, ex: 2322)</label>
            <input className="form-input" placeholder="Ex: 2322" value={dotCode} onChange={e => setDotCode(e.target.value)} />
            {dotCode && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{dotAge(dotCode)}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <input className="form-input" placeholder="Estado geral, notas..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-full" onClick={save}>Salvar pneu</button>
        </div>
      )}
    </div>
  );
}
