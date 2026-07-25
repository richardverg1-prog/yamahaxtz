'use client';
import { useEffect, useState } from 'react';
import { storage } from '@/lib/storage';
import type { MotoDocument } from '@/lib/types';
import { FileText, Shield, AlertCircle, Plus, Pencil, Trash2, X, ExternalLink } from 'lucide-react';

function fmtDate(s: string) { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; }
function fmtR(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

function expiryBadge(expiry?: string): { label: string; cls: string } | null {
  if (!expiry) return null;
  const days = Math.round((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `Venceu há ${Math.abs(days)} dias`, cls: 'badge-danger' };
  if (days <= 30) return { label: `Vence em ${days} dias`, cls: 'badge-danger' };
  if (days <= 90) return { label: `Vence em ${days} dias`, cls: 'badge-warn' };
  return { label: `Válido — ${days} dias`, cls: 'badge-success' };
}

type DocType = 'crlv' | 'seguro' | 'multa';

interface ModalProps {
  doc?: MotoDocument | null;
  type: DocType;
  onClose: () => void;
  onSave: (doc: MotoDocument) => void;
}

function Modal({ doc, type, onClose, onSave }: ModalProps) {
  const isMulta = type === 'multa';
  const [label, setLabel] = useState(doc?.label ?? (type === 'crlv' ? 'CRLV 2026' : type === 'seguro' ? 'Seguro 2026' : ''));
  const [number, setNumber] = useState(doc?.number ?? '');
  const [expiry, setExpiry] = useState(doc?.expiry ?? '');
  const [amount, setAmount] = useState(doc?.amount ? String(doc.amount) : '');
  const [status, setStatus] = useState<'pago' | 'pendente'>(doc?.status ?? 'pendente');
  const [notes, setNotes] = useState(doc?.notes ?? '');

  function handleSave() {
    const d: MotoDocument = {
      id: doc?.id ?? Date.now().toString(36),
      type,
      label: label.trim() || (type === 'crlv' ? 'CRLV' : type === 'seguro' ? 'Seguro' : 'Multa'),
      number: number.trim(),
      expiry: expiry || undefined,
      amount: isMulta && amount ? parseFloat(amount) : undefined,
      status: isMulta ? status : undefined,
      notes: notes.trim() || undefined,
    };
    onSave(d);
  }

  const titles: Record<DocType, string> = { crlv: 'CRLV', seguro: 'Seguro', multa: 'Multa' };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="modal-title">{doc ? 'Editar' : 'Novo'} {titles[type]}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', marginBottom: 20 }}>
            <X size={22} />
          </button>
        </div>
        <div className="form-group">
          <label className="form-label">Descrição</label>
          <input className="form-input" value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex: CRLV 2026" />
        </div>
        {!isMulta && (
          <>
            <div className="form-group">
              <label className="form-label">{type === 'crlv' ? 'Placa / Nº RENAVAM' : 'Nº da apólice'}</label>
              <input className="form-input" value={number} onChange={e => setNumber(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Validade</label>
              <input className="form-input" type="date" value={expiry} onChange={e => setExpiry(e.target.value)} />
            </div>
          </>
        )}
        {isMulta && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Valor (R$)</label>
                <input className="form-input" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={status} onChange={e => setStatus(e.target.value as 'pago' | 'pendente')}>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Data / Infração</label>
              <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Data, código, local..." />
            </div>
          </>
        )}
        {!isMulta && (
          <div className="form-group">
            <label className="form-label">Observações</label>
            <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional" />
          </div>
        )}
        <button className="btn btn-primary btn-full" onClick={handleSave} style={{ marginBottom: 8 }}>
          Salvar
        </button>
      </div>
    </div>
  );
}

export default function DocumentosPage() {
  const [docs, setDocs] = useState<MotoDocument[]>([]);
  const [modal, setModal] = useState<{ open: boolean; type: DocType; doc?: MotoDocument | null }>({ open: false, type: 'crlv', doc: null });

  useEffect(() => { setDocs(storage.getDocuments()); }, []);

  function save(d: MotoDocument) {
    let updated: MotoDocument[];
    const idx = docs.findIndex(x => x.id === d.id);
    if (idx >= 0) { updated = docs.map(x => x.id === d.id ? d : x); }
    else { updated = [...docs, d]; }
    storage.setDocuments(updated);
    setDocs(updated);
    setModal({ open: false, type: 'crlv' });
  }

  function remove(id: string) {
    if (!confirm('Remover este documento?')) return;
    const updated = docs.filter(d => d.id !== id);
    storage.setDocuments(updated);
    setDocs(updated);
  }

  function openNew(type: DocType) { setModal({ open: true, type, doc: null }); }
  function openEdit(doc: MotoDocument) { setModal({ open: true, type: doc.type as DocType, doc }); }

  const crlvDocs = docs.filter(d => d.type === 'crlv');
  const seguroDocs = docs.filter(d => d.type === 'seguro');
  const multaDocs = docs.filter(d => d.type === 'multa');
  const totalMultas = multaDocs.reduce((s, d) => s + (d.amount ?? 0), 0);

  return (
    <>
      <div className="page-header" style={{ paddingTop: 24, paddingBottom: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Documentos</h1>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>CRLV, Seguradora e Multas</div>
      </div>

      <div className="page" style={{ paddingTop: 16 }}>

        {/* CRLV */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 700, fontSize: 16 }}>CRLV</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => openNew('crlv')} style={{ gap: 4 }}>
              <Plus size={14} /> Adicionar
            </button>
          </div>
          {crlvDocs.length === 0 && (
            <div className="card">
              <div className="card-pad" style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--muted)', fontSize: 14 }}>
                Nenhum CRLV cadastrado
              </div>
            </div>
          )}
          {crlvDocs.map(doc => {
            const badge = expiryBadge(doc.expiry);
            return (
              <div key={doc.id} className="card" style={{ marginBottom: 8 }}>
                <div className="card-pad">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{doc.label}</div>
                      {doc.number && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{doc.number}</div>}
                      {doc.expiry && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Validade: {fmtDate(doc.expiry)}</div>}
                      {badge && <span className={`badge ${badge.cls}`} style={{ marginTop: 8, display: 'inline-flex' }}>{badge.label}</span>}
                      {doc.notes && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>{doc.notes}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(doc)}><Pencil size={14} /></button>
                      <button className="btn btn-danger-soft btn-sm btn-icon" onClick={() => remove(doc.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Seguradora */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={18} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 700, fontSize: 16 }}>Seguradora</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => openNew('seguro')} style={{ gap: 4 }}>
              <Plus size={14} /> Adicionar
            </button>
          </div>
          {seguroDocs.length === 0 && (
            <div className="card">
              <div className="card-pad" style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--muted)', fontSize: 14 }}>
                Nenhum seguro cadastrado
              </div>
            </div>
          )}
          {seguroDocs.map(doc => {
            const badge = expiryBadge(doc.expiry);
            return (
              <div key={doc.id} className="card" style={{ marginBottom: 8 }}>
                <div className="card-pad">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{doc.label}</div>
                      {doc.number && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Apólice: {doc.number}</div>}
                      {doc.expiry && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Validade: {fmtDate(doc.expiry)}</div>}
                      {badge && <span className={`badge ${badge.cls}`} style={{ marginTop: 8, display: 'inline-flex' }}>{badge.label}</span>}
                      {doc.notes && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>{doc.notes}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(doc)}><Pencil size={14} /></button>
                      <button className="btn btn-danger-soft btn-sm btn-icon" onClick={() => remove(doc.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Multas */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={18} style={{ color: 'var(--danger)' }} />
              <span style={{ fontWeight: 700, fontSize: 16 }}>Multas</span>
              {totalMultas > 0 && (
                <span className="badge badge-danger">{fmtR(totalMultas)}</span>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => openNew('multa')} style={{ gap: 4 }}>
              <Plus size={14} /> Adicionar
            </button>
          </div>
          {multaDocs.length === 0 && (
            <div className="card">
              <div className="card-pad" style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--muted)', fontSize: 14 }}>
                Nenhuma multa cadastrada
              </div>
            </div>
          )}
          {multaDocs.map(doc => (
            <div key={doc.id} className="card" style={{ marginBottom: 8 }}>
              <div className="card-pad">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{doc.label}</div>
                      <span className={`badge ${doc.status === 'pago' ? 'badge-success' : 'badge-danger'}`}>
                        {doc.status === 'pago' ? 'Pago' : 'Pendente'}
                      </span>
                    </div>
                    {doc.amount !== undefined && (
                      <div style={{ fontSize: 18, fontWeight: 800, color: doc.status === 'pago' ? 'var(--muted)' : 'var(--danger)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                        {fmtR(doc.amount)}
                      </div>
                    )}
                    {doc.notes && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{doc.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(doc)}><Pencil size={14} /></button>
                    <button className="btn btn-danger-soft btn-sm btn-icon" onClick={() => remove(doc.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {multaDocs.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, textAlign: 'right' }}>
              Total de multas: <strong style={{ color: 'var(--danger)' }}>{fmtR(totalMultas)}</strong> · incluído no total investido
            </div>
          )}
        </div>
      </div>

      {modal.open && (
        <Modal
          type={modal.type}
          doc={modal.doc}
          onClose={() => setModal({ open: false, type: 'crlv' })}
          onSave={save}
        />
      )}
    </>
  );
}
