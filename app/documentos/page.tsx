'use client';
import { useEffect, useState } from 'react';
import { storage } from '@/lib/storage';
import { useConfirm } from '@/components/ConfirmModal';
import type { MotoDocument, InsuranceRecord, InsurancePayment } from '@/lib/types';
import { FileText, Shield, AlertCircle, Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronUp } from 'lucide-react';

function fmtDate(s: string) { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; }
function fmtR(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function fmtMonth(m: string): string {
  const [y, mo] = m.split('-');
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${names[parseInt(mo) - 1]} ${y}`;
}

function getContractMonths(record: InsuranceRecord): string[] {
  const start = new Date(record.contractStartDate + 'T00:00:00');
  const months: string[] = [];
  for (let i = 0; i < record.contractMonths; i++) {
    const totalM = start.getMonth() + i;
    const year = start.getFullYear() + Math.floor(totalM / 12);
    const month = totalM % 12;
    months.push(`${year}-${String(month + 1).padStart(2, '0')}`);
  }
  return months;
}

function expiryBadge(expiry?: string): { label: string; cls: string } | null {
  if (!expiry) return null;
  const days = Math.round((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `Venceu há ${Math.abs(days)} dias`, cls: 'badge-danger' };
  if (days <= 30) return { label: `Vence em ${days} dias`, cls: 'badge-danger' };
  if (days <= 90) return { label: `Vence em ${days} dias`, cls: 'badge-warn' };
  return { label: `Válido — ${days} dias`, cls: 'badge-success' };
}

function CrlvModal({ doc, onClose, onSave }: { doc?: MotoDocument | null; onClose: () => void; onSave: (d: MotoDocument) => void }) {
  const [label, setLabel] = useState(doc?.label ?? 'CRLV 2026');
  const [number, setNumber] = useState(doc?.number ?? '');
  const [expiry, setExpiry] = useState(doc?.expiry ?? '');
  const [notes, setNotes] = useState(doc?.notes ?? '');

  function save() {
    onSave({ id: doc?.id ?? uid(), type: 'crlv', label: label.trim() || 'CRLV', number: number.trim() || undefined, expiry: expiry || undefined, notes: notes.trim() || undefined });
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="modal-title">{doc ? 'Editar' : 'Novo'} CRLV</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', marginBottom: 20 }}><X size={22} /></button>
        </div>
        <div className="form-group"><label className="form-label">Descrição</label><input className="form-input" value={label} onChange={e => setLabel(e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Placa / Nº RENAVAM</label><input className="form-input" value={number} onChange={e => setNumber(e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Validade</label><input className="form-input" type="date" value={expiry} onChange={e => setExpiry(e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Observações</label><input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional" /></div>
        <button className="btn btn-primary btn-full" onClick={save} style={{ marginBottom: 8 }}>Salvar</button>
      </div>
    </div>
  );
}

function MultaModal({ doc, onClose, onSave }: { doc?: MotoDocument | null; onClose: () => void; onSave: (d: MotoDocument) => void }) {
  const [label, setLabel] = useState(doc?.label ?? '');
  const [amount, setAmount] = useState(doc?.amount ? String(doc.amount) : '');
  const [status, setStatus] = useState<'pago' | 'pendente'>(doc?.status ?? 'pendente');
  const [infractedDate, setInfractedDate] = useState(doc?.infractedDate ?? '');
  const [paymentDate, setPaymentDate] = useState(doc?.paymentDate ?? '');
  const [notes, setNotes] = useState(doc?.notes ?? '');

  function save() {
    onSave({
      id: doc?.id ?? uid(), type: 'multa',
      label: label.trim() || 'Multa',
      amount: amount ? parseFloat(amount) : undefined,
      status,
      infractedDate: infractedDate || undefined,
      paymentDate: status === 'pago' ? (paymentDate || undefined) : undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="modal-title">{doc ? 'Editar' : 'Nova'} Multa</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', marginBottom: 20 }}><X size={22} /></button>
        </div>
        <div className="form-group">
          <label className="form-label">Descrição / Infração</label>
          <input className="form-input" value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex: Excesso de velocidade" />
        </div>
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
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Data da infração</label>
            <input className="form-input" type="date" value={infractedDate} onChange={e => setInfractedDate(e.target.value)} />
          </div>
          {status === 'pago' && (
            <div className="form-group">
              <label className="form-label">Data do pagamento</label>
              <input className="form-input" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Observações (código, local...)</label>
          <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional" />
        </div>
        <button className="btn btn-primary btn-full" onClick={save} style={{ marginBottom: 8 }}>Salvar</button>
      </div>
    </div>
  );
}

function InsuranceForm({ record, onSave, onCancel }: {
  record?: InsuranceRecord | null;
  onSave: (r: InsuranceRecord) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(record?.insurerName ?? '');
  const [policy, setPolicy] = useState(record?.policyNumber ?? '');
  const [startDate, setStartDate] = useState(record?.contractStartDate ?? '');
  const [months, setMonths] = useState(String(record?.contractMonths ?? 12));
  const [monthly, setMonthly] = useState(record?.monthlyValue ? String(record.monthlyValue) : '');
  const [notes, setNotes] = useState(record?.notes ?? '');

  function save() {
    if (!name || !startDate || !monthly) return;
    onSave({
      id: record?.id ?? uid(),
      insurerName: name.trim(),
      policyNumber: policy.trim() || undefined,
      contractStartDate: startDate,
      contractMonths: parseInt(months) || 12,
      monthlyValue: parseFloat(monthly),
      notes: notes.trim() || undefined,
      payments: record?.payments ?? [],
    });
  }

  return (
    <div className="card-inner" style={{ marginBottom: 12 }}>
      <div className="form-group"><label className="form-label">Seguradora *</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Porto Seguro" /></div>
      <div className="form-group"><label className="form-label">Nº da apólice</label><input className="form-input" value={policy} onChange={e => setPolicy(e.target.value)} placeholder="Opcional" /></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Início do contrato *</label><input className="form-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Duração (meses)</label><input className="form-input" type="number" value={months} onChange={e => setMonths(e.target.value)} /></div>
      </div>
      <div className="form-group"><label className="form-label">Valor mensal (R$) *</label><input className="form-input" type="number" step="0.01" value={monthly} onChange={e => setMonthly(e.target.value)} placeholder="0,00" /></div>
      <div className="form-group"><label className="form-label">Observações</label><input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional" /></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={save} disabled={!name || !startDate || !monthly}>Salvar</button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

export default function DocumentosPage() {
  const confirm = useConfirm();
  const [docs, setDocs] = useState<MotoDocument[]>([]);
  const [insurance, setInsurance] = useState<InsuranceRecord | null>(null);
  const [crlvModal, setCrlvModal] = useState<{ open: boolean; doc?: MotoDocument | null }>({ open: false });
  const [multaModal, setMultaModal] = useState<{ open: boolean; doc?: MotoDocument | null }>({ open: false });
  const [showInsForm, setShowInsForm] = useState(false);
  const [editInsurance, setEditInsurance] = useState(false);
  const [showPayments, setShowPayments] = useState(true);
  const [payingMonth, setPayingMonth] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setDocs(storage.getDocuments());
    setInsurance(storage.getInsurance());
  }, []);

  function saveDoc(d: MotoDocument) {
    const idx = docs.findIndex(x => x.id === d.id);
    const updated = idx >= 0 ? docs.map(x => x.id === d.id ? d : x) : [...docs, d];
    storage.setDocuments(updated);
    setDocs(updated);
    setCrlvModal({ open: false });
    setMultaModal({ open: false });
  }

  async function removeDoc(id: string, label: string) {
    const ok = await confirm({ title: 'Remover documento', message: `Remover "${label}"?`, confirmLabel: 'Remover', danger: true });
    if (!ok) return;
    const updated = docs.filter(d => d.id !== id);
    storage.setDocuments(updated);
    setDocs(updated);
  }

  function saveInsurance(r: InsuranceRecord) {
    storage.setInsurance(r);
    setInsurance(r);
    setShowInsForm(false);
    setEditInsurance(false);
  }

  async function deleteInsurance() {
    const ok = await confirm({ title: 'Remover seguro', message: 'Remover o contrato de seguro e todo o histórico de pagamentos?', confirmLabel: 'Remover', danger: true });
    if (!ok) return;
    storage.setInsurance(null);
    setInsurance(null);
    setEditInsurance(false);
  }

  function startPayingMonth(month: string) {
    setPayingMonth(month);
    setPayAmount(String(insurance?.monthlyValue ?? ''));
    setPayDate(new Date().toISOString().slice(0, 10));
  }

  function markPaid(month: string) {
    if (!insurance) return;
    const payment: InsurancePayment = {
      id: uid(), month,
      amount: parseFloat(payAmount) || insurance.monthlyValue,
      paidAt: payDate,
    };
    const updated: InsuranceRecord = { ...insurance, payments: [...insurance.payments, payment] };
    storage.setInsurance(updated);
    setInsurance(updated);
    setPayingMonth(null);
  }

  async function unmarkPaid(month: string) {
    if (!insurance) return;
    const ok = await confirm({ title: 'Desfazer pagamento', message: `Remover o registro de pagamento de ${fmtMonth(month)}?`, confirmLabel: 'Remover', danger: true });
    if (!ok) return;
    const updated: InsuranceRecord = { ...insurance, payments: insurance.payments.filter(p => p.month !== month) };
    storage.setInsurance(updated);
    setInsurance(updated);
  }

  const crlvDocs = docs.filter(d => d.type === 'crlv');
  const multaDocs = docs.filter(d => d.type === 'multa');
  const totalMultas = multaDocs.reduce((s, d) => s + (d.amount ?? 0), 0);
  const totalPaidMultas = multaDocs.filter(d => d.status === 'pago').reduce((s, d) => s + (d.amount ?? 0), 0);
  const totalSeguro = insurance?.payments.reduce((s, p) => s + p.amount, 0) ?? 0;

  const contractMonths = insurance ? getContractMonths(insurance) : [];
  const currentMonth = new Date().toISOString().slice(0, 7);
  const pendingCurrentMonth = insurance && !insurance.payments.some(p => p.month === currentMonth);

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
            <button className="btn btn-ghost btn-sm" onClick={() => setCrlvModal({ open: true, doc: null })} style={{ gap: 4 }}>
              <Plus size={14} /> Adicionar
            </button>
          </div>
          {crlvDocs.length === 0 && (
            <div className="card"><div className="card-pad" style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--muted)', fontSize: 14 }}>Nenhum CRLV cadastrado</div></div>
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
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setCrlvModal({ open: true, doc })}><Pencil size={14} /></button>
                      <button className="btn btn-danger-soft btn-sm btn-icon" onClick={() => removeDoc(doc.id, doc.label)}><Trash2 size={14} /></button>
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
              {totalSeguro > 0 && <span className="badge badge-muted">{fmtR(totalSeguro)} pago</span>}
              {pendingCurrentMonth && <span className="badge badge-warn">Pagamento pendente</span>}
            </div>
            {!insurance && !showInsForm && (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowInsForm(true)} style={{ gap: 4 }}>
                <Plus size={14} /> Cadastrar
              </button>
            )}
          </div>

          {!insurance && !showInsForm && (
            <div className="card"><div className="card-pad" style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--muted)', fontSize: 14 }}>Nenhum seguro cadastrado</div></div>
          )}

          {showInsForm && (
            <InsuranceForm onSave={saveInsurance} onCancel={() => setShowInsForm(false)} />
          )}

          {insurance && !showInsForm && (
            <div className="card" style={{ marginBottom: 8 }}>
              <div className="card-pad">
                {/* Contract info */}
                {editInsurance ? (
                  <InsuranceForm record={insurance} onSave={saveInsurance} onCancel={() => setEditInsurance(false)} />
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{insurance.insurerName}</div>
                        {insurance.policyNumber && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Apólice: {insurance.policyNumber}</div>}
                        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                          Início: {fmtDate(insurance.contractStartDate)} · {insurance.contractMonths} meses
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', marginTop: 4 }}>
                          {fmtR(insurance.monthlyValue)}/mês
                        </div>
                        {insurance.notes && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{insurance.notes}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditInsurance(true)} title="Editar contrato"><Pencil size={14} /></button>
                        <button className="btn btn-danger-soft btn-sm btn-icon" onClick={deleteInsurance} title="Remover seguro"><Trash2 size={14} /></button>
                      </div>
                    </div>

                    {/* Summary */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                      <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>Pago</div>
                        <div style={{ fontWeight: 700, color: 'var(--success)' }}>{fmtR(totalSeguro)}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{insurance.payments.length} parcelas</div>
                      </div>
                      <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>Restante</div>
                        <div style={{ fontWeight: 700, color: 'var(--accent)' }}>
                          {fmtR((contractMonths.length - insurance.payments.length) * insurance.monthlyValue)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{contractMonths.length - insurance.payments.length} parcelas</div>
                      </div>
                    </div>

                    {/* Monthly payments */}
                    <button
                      onClick={() => setShowPayments(p => !p)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13, fontWeight: 600, width: '100%', marginBottom: showPayments ? 10 : 0 }}
                    >
                      {showPayments ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      Parcelas mensais ({contractMonths.length})
                    </button>

                    {showPayments && (
                      <div>
                        {contractMonths.map(month => {
                          const payment = insurance.payments.find(p => p.month === month);
                          const isPayingThis = payingMonth === month;
                          const isPast = month <= currentMonth;
                          return (
                            <div key={month} style={{ borderTop: '1px solid var(--border)', paddingTop: 10, paddingBottom: 10 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 14 }}>{fmtMonth(month)}</div>
                                  {payment && (
                                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                                      Pago em {fmtDate(payment.paidAt)} · {fmtR(payment.amount)}
                                    </div>
                                  )}
                                  {!payment && isPast && (
                                    <div style={{ fontSize: 12, color: 'var(--warn)', marginTop: 2 }}>Não registrado</div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {payment ? (
                                    <>
                                      <span className="badge badge-success"><Check size={11} /> Pago</span>
                                      <button onClick={() => unmarkPaid(month)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>
                                        <X size={12} />
                                      </button>
                                    </>
                                  ) : (
                                    <button className="btn btn-ghost btn-sm" onClick={() => isPayingThis ? setPayingMonth(null) : startPayingMonth(month)}>
                                      {isPayingThis ? 'Cancelar' : 'Marcar pago'}
                                    </button>
                                  )}
                                </div>
                              </div>
                              {isPayingThis && (
                                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                                  <div className="form-row" style={{ marginBottom: 8 }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                      <label className="form-label">Valor (R$)</label>
                                      <input className="form-input" type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                      <label className="form-label">Data do pagamento</label>
                                      <input className="form-input" type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
                                    </div>
                                  </div>
                                  <button className="btn btn-primary btn-sm btn-full" onClick={() => markPaid(month)}>
                                    <Check size={14} /> Confirmar pagamento
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
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
            <button className="btn btn-ghost btn-sm" onClick={() => setMultaModal({ open: true, doc: null })} style={{ gap: 4 }}>
              <Plus size={14} /> Adicionar
            </button>
          </div>
          {multaDocs.length === 0 && (
            <div className="card"><div className="card-pad" style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--muted)', fontSize: 14 }}>Nenhuma multa cadastrada</div></div>
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
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {doc.infractedDate && <span>Infração: {fmtDate(doc.infractedDate)}</span>}
                      {doc.status === 'pago' && doc.paymentDate && <span>Pago em: {fmtDate(doc.paymentDate)}</span>}
                    </div>
                    {doc.notes && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{doc.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setMultaModal({ open: true, doc })}><Pencil size={14} /></button>
                    <button className="btn btn-danger-soft btn-sm btn-icon" onClick={() => removeDoc(doc.id, doc.label)}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {multaDocs.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, textAlign: 'right' }}>
              Total multas: <strong style={{ color: 'var(--danger)' }}>{fmtR(totalMultas)}</strong>
              {totalPaidMultas < totalMultas && <> · Pago: <strong style={{ color: 'var(--success)' }}>{fmtR(totalPaidMultas)}</strong></>}
              {' '}· incluído no total investido
            </div>
          )}
        </div>
      </div>

      {crlvModal.open && <CrlvModal doc={crlvModal.doc} onClose={() => setCrlvModal({ open: false })} onSave={saveDoc} />}
      {multaModal.open && <MultaModal doc={multaModal.doc} onClose={() => setMultaModal({ open: false })} onSave={saveDoc} />}
    </>
  );
}
