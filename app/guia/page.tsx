'use client';
import { useEffect, useState } from 'react';
import { SPECS, DICAS } from '@/lib/specs';
import { storage } from '@/lib/storage';
import { useAlert, useConfirm } from '@/components/ConfirmModal';
import { TireEditor } from '@/components/TireEditor';
import type { AppSettings, ChecklistRun, TireEntry } from '@/lib/types';
import { ChevronDown, ChevronUp, CheckSquare, Square, History, Save, Trash2 } from 'lucide-react';

const TABS = ['Checklist', 'Dicas', 'Motor', 'Óleo', 'Ignição', 'Pneus', 'Torques', 'Elétrica', 'Periódica'] as const;
type Tab = typeof TABS[number];

const TCLOCS = [
  {
    id: 'T', label: 'Pneus & Rodas', emoji: '🔵',
    items: [
      { id: 'T1', label: 'Calibragem correta — diant. 29 psi / tras. 33 psi' },
      { id: 'T2', label: 'Desgaste uniforme, sem calombos ou manchas anormais' },
      { id: 'T3', label: 'Sem cortes, bolhas ou objetos embutidos no pneu' },
      { id: 'T4', label: 'Profundidade do sulco ≥ 2 mm (mínimo legal)' },
      { id: 'T5', label: 'Raios e aro sem folgas ou trincas visíveis' },
      { id: 'T6', label: 'Parafusos das rodas com torque correto' },
    ]
  },
  {
    id: 'C1', label: 'Controles', emoji: '🕹️',
    items: [
      { id: 'C1a', label: 'Alavanca de freio dianteiro firme e responsiva' },
      { id: 'C1b', label: 'Pedal de freio traseiro funcional' },
      { id: 'C1c', label: 'Cabo do acelerador livre — retorna sozinho ao soltar' },
      { id: 'C1d', label: 'Embreagem suave, sem folga excessiva (regulagem OK)' },
      { id: 'C1e', label: 'Guidão sem folgas — gira livremente de ponta a ponta' },
      { id: 'C1f', label: 'Espelhos retrovisores ajustados e firmes' },
    ]
  },
  {
    id: 'L', label: 'Luzes & Elétrica', emoji: '💡',
    items: [
      { id: 'L1', label: 'Farol dianteiro — alto e baixo funcionando' },
      { id: 'L2', label: 'Luz traseira e lanterna OK' },
      { id: 'L3', label: 'Piscas dianteiro e traseiro (ambos os lados)' },
      { id: 'L4', label: 'Luz de freio ao acionar alavanca E ao acionar pedal' },
      { id: 'L5', label: 'Buzina funcionando' },
      { id: 'L6', label: 'Painel, velocímetro e medidores iluminados' },
    ]
  },
  {
    id: 'O', label: 'Óleo & Fluidos', emoji: '🛢️',
    items: [
      { id: 'O1', label: 'Nível do óleo do motor entre as marcas min e max' },
      { id: 'O2', label: 'Fluido de freio — nível e cor adequados (DOT4 claro)' },
      { id: 'O3', label: 'Sem vazamentos visíveis (óleo, fluido, refrigerante)' },
      { id: 'O4', label: 'Nível de fluido do radiador OK (se aplicável)' },
    ]
  },
  {
    id: 'C2', label: 'Chassi & Suspensão', emoji: '⛓️',
    items: [
      { id: 'C2a', label: 'Corrente limpa, lubrificada e com folga 15–25 mm' },
      { id: 'C2b', label: 'Suspensão dianteira — sem folgas ou vazamentos de óleo' },
      { id: 'C2c', label: 'Suspensão traseira — funcional e sem ruídos anormais' },
      { id: 'C2d', label: 'Parafusos do motor e escapamento apertados' },
      { id: 'C2e', label: 'Freios sem rangidos anormais, pastilhas com material' },
    ]
  },
  {
    id: 'S', label: 'Descanso', emoji: '🅿️',
    items: [
      { id: 'S1', label: 'Descanso lateral — mola funcionando, trava segura' },
      { id: 'S2', label: 'Descanso central firme e funcional (se equipado)' },
    ]
  },
];

function allItemIds(): string[] {
  return TCLOCS.flatMap(s => s.items.map(i => `${s.id}_${i.id}`));
}

function urgenciaColor(u: string) {
  if (u === 'alta') return 'var(--danger)';
  if (u === 'media') return 'var(--warn)';
  return 'var(--muted)';
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ width: '42%', color: 'var(--muted)', fontWeight: 600, fontSize: 13, padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{label}</td>
      <td style={{ padding: '10px 12px', fontSize: 14, borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{value}</td>
    </tr>
  );
}

function DicaCard({ dica }: { dica: typeof DICAS[number] }) {
  const [open, setOpen] = useState(false);
  const borderColor = dica.urgencia === 'alta' ? 'var(--danger)' : dica.urgencia === 'media' ? 'var(--warn)' : 'var(--border)';
  return (
    <div className="card" style={{ marginBottom: 10, borderLeft: `3px solid ${borderColor}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 14px', textAlign: 'left' }}
      >
        <span style={{ fontSize: 24, flexShrink: 0 }}>{dica.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{dica.title}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {dica.items.length} {dica.items.length === 1 ? 'item' : 'itens'}
          </div>
        </div>
        <div style={{ color: 'var(--muted)', flexShrink: 0 }}>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
          {dica.items.map((item, i) => (
            <div key={i} style={{ padding: '12px 0', borderBottom: i < dica.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChecklistSection({ section, checks, onChange }: {
  section: typeof TCLOCS[number];
  checks: Record<string, boolean>;
  onChange: (key: string, val: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const keys = section.items.map(i => `${section.id}_${i.id}`);
  const checkedCount = keys.filter(k => checks[k]).length;
  const allOk = checkedCount === keys.length;

  return (
    <div className="card" style={{ marginBottom: 10, borderLeft: `3px solid ${allOk ? 'var(--success)' : 'var(--border)'}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '13px 14px', textAlign: 'left' }}
      >
        <span style={{ fontSize: 20, flexShrink: 0 }}>{section.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{section.label}</div>
          <div style={{ fontSize: 12, color: allOk ? 'var(--success)' : 'var(--muted)', marginTop: 2 }}>
            {checkedCount}/{keys.length} verificados
          </div>
        </div>
        <div style={{ color: 'var(--muted)' }}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
      </button>
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '8px 14px 14px' }}>
          {section.items.map(item => {
            const key = `${section.id}_${item.id}`;
            const checked = !!checks[key];
            return (
              <button
                key={key}
                onClick={() => onChange(key, !checked)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', textAlign: 'left', borderBottom: '1px solid var(--border)' }}
              >
                <span style={{ color: checked ? 'var(--success)' : 'var(--muted)', flexShrink: 0, marginTop: 1 }}>
                  {checked ? <CheckSquare size={18} /> : <Square size={18} />}
                </span>
                <span style={{ fontSize: 14, color: checked ? 'var(--muted)' : 'var(--text)', textDecoration: checked ? 'line-through' : 'none', lineHeight: 1.5 }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Guia() {
  const showAlert = useAlert();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('Checklist');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [runKm, setRunKm] = useState('');
  const [savedRuns, setSavedRuns] = useState<ChecklistRun[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    setSavedRuns(storage.getChecklists().sort((a, b) => b.date.localeCompare(a.date)));
    const s = storage.getSettings();
    setRunKm(String(s.currentMileage));
    setSettings(s);
  }, []);

  const allIds = allItemIds();
  const checkedTotal = allIds.filter(k => checks[k]).length;
  const allPassed = checkedTotal === allIds.length;

  function handleCheck(key: string, val: boolean) {
    setChecks(prev => ({ ...prev, [key]: val }));
  }

  function checkAll() {
    const all: Record<string, boolean> = {};
    allIds.forEach(k => { all[k] = true; });
    setChecks(all);
  }

  function clearAll() { setChecks({}); }

  async function saveRun() {
    const km = parseInt(runKm);
    if (!km) return;
    const run: ChecklistRun = {
      id: Date.now().toString(36),
      date: new Date().toISOString().slice(0, 10),
      mileage: km,
      passed: allPassed,
      items: { ...checks },
    };
    const updated = [run, ...savedRuns];
    storage.setChecklists(updated);
    setSavedRuns(updated);
    storage.patchSettings({ currentMileage: km });
    await showAlert({ title: 'Verificação salva!', message: `${checkedTotal}/${allIds.length} itens verificados.` });
  }

  async function deleteRun(id: string) {
    const ok = await confirm({ title: 'Excluir verificação', message: 'Remover este registro do histórico?', confirmLabel: 'Excluir', danger: true });
    if (!ok) return;
    const updated = savedRuns.filter(r => r.id !== id);
    storage.setChecklists(updated);
    setSavedRuns(updated);
  }

  function handleTireSave(position: 'dianteiro' | 'traseiro', tire: TireEntry) {
    const updated = { ...settings!, tires: { ...settings!.tires, [position]: tire } };
    storage.setSettings(updated);
    setSettings(updated);
  }

  function fmtDate(s: string) { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; }
  function fmt(n: number) { return n.toLocaleString('pt-BR'); }

  return (
    <>
      <div className="page-header" style={{ paddingTop: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Guia Técnico</h1>
        <div className="tab-bar" style={{ marginBottom: 0 }}>
          {TABS.map(t => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="page" style={{ paddingTop: 16 }}>

        {tab === 'Motor' && (
          <div className="card">
            <table className="spec-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {SPECS.motor.map(r => <SpecRow key={r.label} label={r.label} value={r.value} />)}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Óleo' && (
          <>
            <div className="card" style={{ marginBottom: 12 }}>
              <table className="spec-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {SPECS.oleo.map(r => <SpecRow key={r.label} label={r.label} value={r.value} />)}
                </tbody>
              </table>
            </div>
            <div style={{ background: 'var(--warn-dim)', border: '1px solid var(--warn)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--warn)' }}>
              ⚠️ Motor revisado — intervalo reduzido para 1.500 km. As 3 primeiras trocas após revisão devem ser feitas em oficina.
            </div>
          </>
        )}

        {tab === 'Ignição' && (
          <div className="card">
            <table className="spec-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {SPECS.ignição.map(r => <SpecRow key={r.label} label={r.label} value={r.value} />)}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Pneus' && (
          <>
            <div className="card" style={{ marginBottom: 12 }}>
              <table className="spec-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {SPECS.pneus.map(r => <SpecRow key={r.label} label={r.label} value={r.value} />)}
                </tbody>
              </table>
            </div>
            <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--accent)', marginBottom: 10 }}>
              💡 Verificar sempre com pneus FRIOS (moto parada por pelo menos 3h ou rodada menos de 1,5km).
            </div>
            <div style={{ background: 'var(--success-dim)', border: '1px solid var(--success)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--success)', marginBottom: 16 }}>
              ✓ Os valores de 29/33 psi são corretos para pneus motard/street (Pirelli Sport Demon). Calibrar semanalmente.
            </div>

            {settings && (
              <>
                <div className="section-title">Meus pneus</div>
                <div className="card">
                  <div className="card-pad">
                    <TireEditor
                      position="dianteiro"
                      tire={settings.tires?.dianteiro}
                      currentMileage={settings.currentMileage}
                      onSave={t => handleTireSave('dianteiro', t)}
                    />
                    <TireEditor
                      position="traseiro"
                      tire={settings.tires?.traseiro}
                      currentMileage={settings.currentMileage}
                      onSave={t => handleTireSave('traseiro', t)}
                    />
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {tab === 'Torques' && (
          <div className="card">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Item</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', textAlign: 'right' }}>kgf·m</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', textAlign: 'right' }}>Nm</td>
                </tr>
              </thead>
              <tbody>
                {SPECS.torques.map(r => (
                  <tr key={r.item}>
                    <td style={{ padding: '11px 12px', fontSize: 14, borderBottom: '1px solid var(--border)' }}>{r.item}</td>
                    <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid var(--border)' }}>{r.kgfm}</td>
                    <td style={{ padding: '11px 12px', textAlign: 'right', fontSize: 13, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>{r.nm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Elétrica' && (
          <div className="card">
            <table className="spec-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {SPECS.eletrica.map(r => <SpecRow key={r.label} label={r.label} value={r.value} />)}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Periódica' && (
          <>
            <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--accent)', marginBottom: 12 }}>
              🔧 Intervalos ajustados para motor revisado. Óleo: 1.500 km | Filtro: 3.000 km.
            </div>
            <div className="card">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)' }}>
                    <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Item</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap' }}>Intervalo</td>
                  </tr>
                </thead>
                <tbody>
                  {SPECS.periodica.map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 600 }}>{r.item}</div>
                        {(r as any).concessionaria && (
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>✦ Concessionária</div>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                        {r.km > 0 ? (
                          <span style={{ fontWeight: 700, color: urgenciaColor(r.urgencia) }}>
                            {r.km.toLocaleString('pt-BR')} km
                          </span>
                        ) : (
                          <span style={{ fontWeight: 700, color: urgenciaColor(r.urgencia) }}>
                            {(r as any).anos} anos
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--muted)' }}>
                <span style={{ color: 'var(--danger)', fontWeight: 700 }}>■ Alta</span> &nbsp;
                <span style={{ color: 'var(--warn)', fontWeight: 700 }}>■ Média</span> &nbsp;
                <span style={{ color: 'var(--muted)', fontWeight: 700 }}>■ Baixa</span>
                &nbsp;— prioridade
              </div>
            </div>
          </>
        )}

        {tab === 'Dicas' && (
          <>
            <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--accent)', marginBottom: 14 }}>
              🏍️ Guia completo para primeiros motociclistas — toque em cada seção para expandir.
            </div>
            {DICAS.map(dica => <DicaCard key={dica.id} dica={dica} />)}
          </>
        )}

        {tab === 'Checklist' && (
          <>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>T-CLOCS — Verificação pré-viagem</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{checkedTotal}/{allIds.length} itens verificados</div>
                  </div>
                  <span className={`badge ${allPassed ? 'badge-success' : 'badge-muted'}`}>
                    {allPassed ? '✓ Aprovado' : `${checkedTotal}/${allIds.length}`}
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${allIds.length ? (checkedTotal / allIds.length) * 100 : 0}%`, background: allPassed ? 'var(--success)' : 'var(--accent)' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={checkAll}>Marcar todos</button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={clearAll}>Limpar</button>
                </div>
              </div>
            </div>

            {TCLOCS.map(section => (
              <ChecklistSection key={section.id} section={section} checks={checks} onChange={handleCheck} />
            ))}

            <div className="card" style={{ marginTop: 6 }}>
              <div className="card-pad">
                <div className="card-title">Registrar verificação</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="KM atual"
                    value={runKm}
                    onChange={e => setRunKm(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-primary" onClick={saveRun} disabled={!runKm}>
                    <Save size={16} /> Salvar
                  </button>
                </div>
              </div>
            </div>

            {savedRuns.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <button
                  onClick={() => setShowHistory(h => !h)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}
                >
                  <History size={16} /> {showHistory ? 'Ocultar' : 'Ver'} histórico ({savedRuns.length})
                  {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showHistory && (
                  <div className="card">
                    {savedRuns.map((run, i) => {
                      const passedCount = Object.values(run.items).filter(Boolean).length;
                      const totalCount = allIds.length;
                      return (
                        <div key={run.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < savedRuns.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <span style={{ fontSize: 20, flexShrink: 0 }}>{run.passed ? '✅' : '⚠️'}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{fmtDate(run.date)}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{fmt(run.mileage)} km · {passedCount}/{totalCount} itens OK</div>
                          </div>
                          <span className={`badge ${run.passed ? 'badge-success' : 'badge-warn'}`}>
                            {run.passed ? 'OK' : 'Incompleto'}
                          </span>
                          <button
                            onClick={() => deleteRun(run.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', flexShrink: 0, padding: 4 }}
                            title="Excluir verificação"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
