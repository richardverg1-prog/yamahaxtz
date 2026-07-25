'use client';
import { useEffect, useState } from 'react';
import { storage } from '@/lib/storage';
import type { AppSettings, MaintenanceEntry, FuelEntry, MotoDocument, WishlistItem, InsuranceRecord } from '@/lib/types';
import { AlertTriangle, Wrench, Droplets, ChevronRight, Check, Bell, X, Shield, AlertCircle, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

function fmt(n: number) { return n.toLocaleString('pt-BR'); }
function fmtR(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function fmtDate(s: string) { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; }
function fmtMonth(m: string): string {
  const [y, mo] = m.split('-');
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${names[parseInt(mo) - 1]} ${y}`;
}

interface Notif {
  id: string;
  urgency: 'danger' | 'warn' | 'info';
  icon: string;
  title: string;
  detail: string;
  at_km: number;
}

interface ActivityItem {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  amount?: number;
  iconType: 'maint' | 'fuel' | 'multa' | 'insurance';
  href: string;
}

function computeNotifs(s: AppSettings): Notif[] {
  const km = s.currentMileage;
  const out: Notif[] = [];

  const oilDone = km - s.lastOilChangeMileage;
  const oilLeft = s.oilChangeInterval - oilDone;
  if (oilLeft <= 0) {
    out.push({ id: 'oil', urgency: 'danger', icon: '🛢️', title: 'Troca de óleo — VENCIDA', detail: `${fmt(Math.abs(oilLeft))} km atrasada`, at_km: s.lastOilChangeMileage + s.oilChangeInterval });
  } else if (oilLeft <= 200) {
    out.push({ id: 'oil', urgency: 'warn', icon: '🛢️', title: 'Óleo — trocar em breve', detail: `Faltam apenas ${fmt(oilLeft)} km`, at_km: s.lastOilChangeMileage + s.oilChangeInterval });
  }

  const filterDone = km - s.lastFilterChangeMileage;
  const filterLeft = s.filterChangeInterval - filterDone;
  if (filterLeft <= 0) {
    out.push({ id: 'filter', urgency: 'danger', icon: '🔵', title: 'Filtro de óleo — VENCIDO', detail: `${fmt(Math.abs(filterLeft))} km atrasado`, at_km: s.lastFilterChangeMileage + s.filterChangeInterval });
  } else if (filterLeft <= 400) {
    out.push({ id: 'filter', urgency: 'warn', icon: '🔵', title: 'Filtro de óleo — trocar em breve', detail: `Faltam ${fmt(filterLeft)} km`, at_km: s.lastFilterChangeMileage + s.filterChangeInterval });
  }

  const lastChain = s.lastChainCheckMileage || s.lastOilChangeMileage;
  const nextChain = lastChain + s.chainInterval;
  const chainLeft = nextChain - km;
  if (chainLeft <= 50) {
    out.push({ id: 'chain', urgency: 'warn', icon: '⛓️', title: 'Corrente — verificar agora', detail: `Próxima verificação em ${fmt(nextChain)} km (faltam ${fmt(chainLeft)} km)`, at_km: nextChain });
  }

  const sparkNext = Math.ceil((km + 1) / 5000) * 5000;
  const sparkLeft = sparkNext - km;
  if (sparkLeft <= 500) {
    out.push({ id: 'spark', urgency: 'warn', icon: '⚡', title: 'Vela — verificar/limpar', detail: `Faltam ${fmt(sparkLeft)} km para ${fmt(sparkNext)} km`, at_km: sparkNext });
  }

  const brakeNext = s.lastOilChangeMileage + 3000;
  const brakeLeft = brakeNext - km;
  if (brakeLeft <= 0) {
    out.push({ id: 'brake', urgency: 'warn', icon: '🔴', title: 'Freios — verificar pastilhas/nível', detail: `Em ${fmt(brakeNext)} km (${fmt(Math.abs(brakeLeft))} km atrás)`, at_km: brakeNext });
  }

  // Document alerts
  const docs = storage.getDocuments();
  const today = new Date().toISOString().slice(0, 10);
  docs.forEach(doc => {
    if (!doc.expiry) return;
    const daysLeft = Math.round((new Date(doc.expiry).getTime() - new Date(today).getTime()) / 86400000);
    if (daysLeft < 0) {
      out.push({ id: `doc_${doc.id}`, urgency: 'danger', icon: '📄', title: `${doc.label} — VENCIDO`, detail: `Venceu há ${Math.abs(daysLeft)} dias`, at_km: 0 });
    } else if (daysLeft <= 30) {
      out.push({ id: `doc_${doc.id}`, urgency: 'danger', icon: '📄', title: `${doc.label} — vence em breve`, detail: `${daysLeft} dias restantes`, at_km: 0 });
    } else if (daysLeft <= 90) {
      out.push({ id: `doc_${doc.id}`, urgency: 'warn', icon: '📄', title: `${doc.label} — renovar em breve`, detail: `${daysLeft} dias para vencer`, at_km: 0 });
    }
  });

  // Insurance payment alert
  const insurance = storage.getInsurance();
  if (insurance) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const hasPaid = insurance.payments.some(p => p.month === currentMonth);
    if (!hasPaid) {
      out.push({ id: 'insurance', urgency: 'warn', icon: '🛡️', title: `Seguro ${insurance.insurerName} — pagamento pendente`, detail: `Parcela de ${fmtR(insurance.monthlyValue)} não registrada para ${fmtMonth(currentMonth)}`, at_km: 0 });
    }
  }

  return out;
}

function NotifPanel({ settings, onClose }: { settings: AppSettings; onClose: () => void }) {
  const notifs = computeNotifs(settings);
  const urgencyColor = (u: Notif['urgency']) =>
    u === 'danger' ? 'var(--danger)' : u === 'warn' ? 'var(--warn)' : 'var(--accent)';
  const urgencyBg = (u: Notif['urgency']) =>
    u === 'danger' ? 'var(--danger-dim)' : u === 'warn' ? 'var(--warn-dim)' : 'var(--accent-dim)';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 300 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        background: 'var(--surface)', borderRadius: '0 0 20px 20px',
        padding: '20px 16px 24px', maxWidth: 640, margin: '0 auto',
        animation: 'slideDown .2s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} style={{ color: 'var(--accent)' }} /> Notificações
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            <X size={20} />
          </button>
        </div>
        {notifs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)' }}>
            <Check size={32} style={{ margin: '0 auto 8px', color: 'var(--success)' }} />
            <div style={{ fontWeight: 600 }}>Tudo em dia!</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Nenhuma manutenção urgente no momento.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifs.map(n => (
              <div key={n.id} style={{
                background: urgencyBg(n.urgency), border: `1px solid ${urgencyColor(n.urgency)}`,
                borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{n.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: urgencyColor(n.urgency) }}>{n.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 2 }}>{n.detail}</div>
                  {n.at_km > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                      Previsto para {fmt(n.at_km)} km · atual: {fmt(settings.currentMileage)} km
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          Atualize o odômetro no painel para recalcular automaticamente
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceEntry[]>([]);
  const [fuel, setFuel] = useState<FuelEntry[]>([]);
  const [docs, setDocs] = useState<MotoDocument[]>([]);
  const [insurance, setInsurance] = useState<InsuranceRecord | null>(null);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [mileageInput, setMileageInput] = useState('');
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    setSettings(storage.getSettings());
    setMaintenance(storage.getMaintenance().sort((a, b) => b.date.localeCompare(a.date)));
    setFuel(storage.getFuel().sort((a, b) => b.date.localeCompare(a.date)));
    setDocs(storage.getDocuments());
    setInsurance(storage.getInsurance());
    setWishlist(storage.getWishlist());
  }, []);

  if (!settings) return null;

  const km = settings.currentMileage;
  const oilKm = km - settings.lastOilChangeMileage;
  const oilPct = Math.min(1, oilKm / settings.oilChangeInterval);
  const oilRemaining = settings.oilChangeInterval - oilKm;

  const filterKm = km - settings.lastFilterChangeMileage;
  const filterPct = Math.min(1, filterKm / settings.filterChangeInterval);
  const filterRemaining = settings.filterChangeInterval - filterKm;

  const notifs = computeNotifs(settings);
  const notifBadge = notifs.filter(n => n.urgency !== 'info').length;

  const totalMaintCost = maintenance.reduce((s, e) => s + e.totalCost, 0);
  const totalFuelCost = fuel.reduce((s, e) => s + e.totalCost, 0);
  const totalMultas = docs.filter(d => d.type === 'multa').reduce((s, d) => s + (d.amount ?? 0), 0);
  const totalSeguro = insurance?.payments.reduce((s, p) => s + p.amount, 0) ?? 0;
  const totalInvested = totalMaintCost + totalFuelCost + totalMultas + totalSeguro;

  const validKmL = fuel.filter(f => f.kmL !== null && f.kmL! > 0);
  const avgKmL = validKmL.length ? validKmL.reduce((s, f) => s + f.kmL!, 0) / validKmL.length : null;

  const allMileages = [...maintenance.map(e => e.mileage), ...fuel.map(e => e.mileage)];
  const firstKm = allMileages.length > 0 ? Math.min(...allMileages) : km;
  const kmTracked = Math.max(0, km - firstKm);
  const custoPorKm = kmTracked > 10 ? totalInvested / kmTracked : null;

  const alerts: { type: 'danger' | 'warn' | 'ok'; msg: string }[] = [];
  if (oilPct >= 1) alerts.push({ type: 'danger', msg: `Troca de óleo vencida! (${fmt(oilKm)} km sem trocar)` });
  else if (oilPct >= 0.8) alerts.push({ type: 'warn', msg: `Troca de óleo em breve — restam ~${fmt(oilRemaining)} km` });
  if (filterPct >= 1) alerts.push({ type: 'danger', msg: `Filtro de óleo vencido! (${fmt(filterKm)} km sem trocar)` });
  else if (filterPct >= 0.8) alerts.push({ type: 'warn', msg: `Filtro em breve — restam ~${fmt(filterRemaining)} km` });

  function saveKm() {
    const v = parseInt(mileageInput);
    if (!v || v <= 0) return;
    const updated = { ...settings!, currentMileage: v };
    storage.setSettings(updated);
    setSettings(updated);
    setEditing(false);
  }

  const oilColor = oilPct >= 1 ? 'var(--danger)' : oilPct >= 0.8 ? 'var(--warn)' : 'var(--success)';
  const filterColor = filterPct >= 1 ? 'var(--danger)' : filterPct >= 0.8 ? 'var(--warn)' : 'var(--accent)';

  const lastChainKm = settings.lastChainCheckMileage || settings.lastOilChangeMileage;
  const nextChainKm = lastChainKm + settings.chainInterval;
  const chainLeft = nextChainKm - km;
  const sparkNext = Math.ceil((km + 1) / 5000) * 5000;
  const airFilterNext = sparkNext;
  const brakeNext = settings.lastOilChangeMileage + 3000;

  const schedule = [
    { emoji: '⛓️', label: 'Corrente (verificar/lubrificar)', km: nextChainKm, left: chainLeft, badge: chainLeft <= 50 ? 'warn' : 'muted' as string },
    { emoji: '🛢️', label: 'Troca de óleo', km: settings.lastOilChangeMileage + settings.oilChangeInterval, left: oilRemaining, badge: oilPct >= 1 ? 'danger' : oilPct >= 0.8 ? 'warn' : 'muted' as string },
    { emoji: '🔵', label: 'Filtro de óleo', km: settings.lastFilterChangeMileage + settings.filterChangeInterval, left: filterRemaining, badge: filterPct >= 1 ? 'danger' : filterPct >= 0.8 ? 'warn' : 'muted' as string },
    { emoji: '🔴', label: 'Freios (desgaste/nível DOT4)', km: brakeNext, left: brakeNext - km, badge: brakeNext <= km ? 'warn' : 'muted' as string },
    { emoji: '⚡', label: 'Vela (verificar/limpar)', km: sparkNext, left: sparkNext - km, badge: sparkNext - km <= 500 ? 'warn' : 'muted' as string },
    { emoji: '💨', label: 'Filtro de ar (limpar)', km: airFilterNext, left: airFilterNext - km, badge: airFilterNext - km <= 500 ? 'warn' : 'muted' as string },
  ];

  // Merged activity feed
  const paidMultas = docs.filter(d => d.type === 'multa' && d.status === 'pago' && !!d.paymentDate);
  const activityItems: ActivityItem[] = [
    ...maintenance.map(e => ({
      id: e.id, date: e.date, iconType: 'maint' as const,
      title: e.shop || 'Manutenção', subtitle: `${fmtDate(e.date)} · ${fmt(e.mileage)} km`,
      amount: e.totalCost, href: '/manutencao',
    })),
    ...fuel.map(e => ({
      id: e.id, date: e.date, iconType: 'fuel' as const,
      title: `${e.liters.toFixed(3)} L abastecidos`,
      subtitle: `${fmtDate(e.date)} · ${fmt(e.mileage)} km${e.kmL ? ` · ${e.kmL.toFixed(1)} km/L` : ''}`,
      amount: e.totalCost, href: '/combustivel',
    })),
    ...paidMultas.map(d => ({
      id: d.id, date: d.paymentDate!, iconType: 'multa' as const,
      title: `Multa paga — ${d.label}`, subtitle: `Paga em ${fmtDate(d.paymentDate!)}`,
      amount: d.amount, href: '/documentos',
    })),
    ...(insurance?.payments ?? []).map(p => ({
      id: p.id, date: p.paidAt.slice(0, 10), iconType: 'insurance' as const,
      title: `Seguro — ${fmtMonth(p.month)}`, subtitle: `Pago em ${fmtDate(p.paidAt.slice(0, 10))}`,
      amount: p.amount, href: '/documentos',
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  // Gastos breakdown
  const gastosCategories = [
    { label: 'Manutenção', amount: totalMaintCost, color: 'var(--accent)' },
    { label: 'Combustível', amount: totalFuelCost, color: 'var(--success)' },
    { label: 'Seguros', amount: totalSeguro, color: 'var(--warn)' },
    { label: 'Multas', amount: totalMultas, color: 'var(--danger)' },
  ];
  const gastosTotal = gastosCategories.reduce((s, c) => s + c.amount, 0);

  const pendingWish = wishlist.filter(w => !w.done);

  function ActivityIcon({ type }: { type: ActivityItem['iconType'] }) {
    if (type === 'maint') return <div className="entry-icon"><Wrench size={18} /></div>;
    if (type === 'fuel') return <div className="entry-icon" style={{ background: 'rgba(82,160,96,.15)', color: 'var(--success)' }}><Droplets size={18} /></div>;
    if (type === 'multa') return <div className="entry-icon" style={{ background: 'var(--danger-dim)', color: 'var(--danger)' }}><AlertCircle size={18} /></div>;
    return <div className="entry-icon" style={{ background: 'var(--warn-dim)', color: 'var(--warn)' }}><Shield size={18} /></div>;
  }

  function amountColor(type: ActivityItem['iconType']) {
    if (type === 'fuel') return 'var(--success)';
    if (type === 'multa') return 'var(--danger)';
    if (type === 'insurance') return 'var(--warn)';
    return 'var(--accent)';
  }

  return (
    <>
      <div className="page-header" style={{ paddingTop: 24, paddingBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>
              Yamaha {settings.bikeName} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{settings.bikeYear}</span>
            </h1>
          </div>
          <button
            onClick={() => setShowNotifs(true)}
            style={{ position: 'relative', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: notifBadge > 0 ? 'var(--warn)' : 'var(--muted)' }}
          >
            <Bell size={20} />
            {notifBadge > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: 'var(--danger)', color: '#fff',
                borderRadius: '50%', width: 18, height: 18,
                fontSize: 11, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--bg)',
              }}>
                {notifBadge}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 12 }}>
        <div className="dash-grid">

          {/* Left column: core info */}
          <div>
            {/* Fotos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <div style={{ borderRadius: 14, overflow: 'hidden', height: 160, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <img src="/foto-moto-2.jpg" alt="XTZ 250X" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ borderRadius: 14, overflow: 'hidden', height: 160, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <img src="/foto-moto-1.jpg" alt="XTZ 250X" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>

            {/* Alertas */}
            {alerts.map((a, i) => (
              <div key={i} className={`alert alert-${a.type}`}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                {a.msg}
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="alert alert-ok" style={{ marginBottom: 14 }}>
                <Check size={18} style={{ flexShrink: 0 }} />
                Tudo em dia — nenhuma manutenção urgente
              </div>
            )}

            {/* Odômetro */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-pad">
                <div className="card-title">Odômetro atual</div>
                {editing ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="form-input" type="number" placeholder="Ex: 1500"
                      value={mileageInput} onChange={e => setMileageInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveKm()} autoFocus style={{ flex: 1 }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={saveKm}>Salvar</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancelar</button>
                  </div>
                ) : (
                  <button onClick={() => { setMileageInput(String(km)); setEditing(true); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 42, fontWeight: 800, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-.02em' }}>
                        {fmt(km)}
                      </span>
                      <span style={{ fontSize: 16, color: 'var(--muted)' }}>km</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Toque para atualizar</div>
                  </button>
                )}
              </div>
            </div>

            {/* Vida útil */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-pad">
                <div className="card-title">Vida útil dos consumíveis</div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>Óleo do motor</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>a cada {fmt(settings.oilChangeInterval)} km</span>
                    </div>
                    <span style={{ fontSize: 13, color: oilColor, fontWeight: 700 }}>
                      {oilPct >= 1 ? 'VENCIDO' : `+${fmt(oilRemaining)} km`}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${oilPct * 100}%`, background: oilColor }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {fmt(oilKm)} km desde troca · trocar em ~{fmt(settings.lastOilChangeMileage + settings.oilChangeInterval)} km
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>Filtro de óleo</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>a cada {fmt(settings.filterChangeInterval)} km</span>
                    </div>
                    <span style={{ fontSize: 13, color: filterColor, fontWeight: 700 }}>
                      {filterPct >= 1 ? 'VENCIDO' : `+${fmt(filterRemaining)} km`}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${filterPct * 100}%`, background: filterColor }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {fmt(filterKm)} km desde troca · trocar em ~{fmt(settings.lastFilterChangeMileage + settings.filterChangeInterval)} km
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Corrente</span>
                    <span className={`badge badge-${chainLeft <= 50 ? 'warn' : 'success'}`}>
                      {chainLeft <= 50 ? 'Verificar!' : 'Ok'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Próxima verificação em {fmt(nextChainKm)} km (faltam {fmt(Math.max(0, chainLeft))} km) · folga ideal: 15–25 mm
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="stat-grid" style={{ marginBottom: 14 }}>
              <div className="stat-tile">
                <div className="stat-label">Total investido</div>
                <div className="stat-value" style={{ fontSize: 20 }}>{fmtR(totalInvested)}</div>
                <div className="stat-sub">todos os gastos</div>
              </div>
              <div className="stat-tile">
                <div className="stat-label">Custo por km</div>
                <div className="stat-value" style={{ fontSize: 20 }}>
                  {custoPorKm ? `R$${custoPorKm.toFixed(2)}` : '—'}
                </div>
                <div className="stat-sub">{kmTracked > 10 ? `${fmt(kmTracked)} km rastreados` : 'aguardando dados'}</div>
              </div>
              <div className="stat-tile">
                <div className="stat-label">Consumo médio</div>
                <div className="stat-value">{avgKmL ? avgKmL.toFixed(1) : '—'}</div>
                <div className="stat-sub">km/L</div>
              </div>
              <div className="stat-tile">
                <div className="stat-label">Abastecimentos</div>
                <div className="stat-value">{fuel.length}</div>
                <div className="stat-sub">{fmtR(totalFuelCost)}</div>
              </div>
            </div>

            {/* Próximas manutenções */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-pad">
                <div className="card-title">Próximas manutenções</div>
                {schedule.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < schedule.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{item.emoji}</span>
                    <span style={{ flex: 1, fontSize: 13 }}>{item.label}</span>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div>
                        <span className={`badge badge-${item.badge}`}>{fmt(item.km)} km</span>
                      </div>
                      {item.left > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          faltam {fmt(item.left)} km
                        </div>
                      )}
                      {item.left <= 0 && (
                        <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>vencida</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: activity, gastos, wishlist */}
          <div>
            {/* Atividade recente */}
            <div className="card-title" style={{ marginBottom: 8 }}>Atividade recente</div>
            {activityItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 14, marginBottom: 14 }}>
                Nenhuma atividade registrada ainda
              </div>
            )}
            {activityItems.map(item => (
              <Link href={item.href} key={item.id} style={{ textDecoration: 'none', display: 'block' }}>
                <div className="card" style={{ marginBottom: 8 }}>
                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ActivityIcon type={item.iconType} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="entry-title">{item.title}</div>
                      <div className="entry-sub">{item.subtitle}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {item.amount !== undefined && (
                        <div style={{ fontWeight: 700, color: amountColor(item.iconType) }}>{fmtR(item.amount)}</div>
                      )}
                      <ChevronRight size={16} style={{ color: 'var(--muted)' }} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {/* Gastos por categoria */}
            {gastosTotal > 0 && (
              <div className="card" style={{ marginTop: 14, marginBottom: 14 }}>
                <div className="card-pad">
                  <div className="card-title">Gastos por categoria</div>
                  {gastosCategories.map(cat => (
                    <div key={cat.label} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: 'var(--text)' }}>{cat.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {gastosTotal > 0 && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{Math.round((cat.amount / gastosTotal) * 100)}%</span>}
                          <span style={{ fontSize: 13, fontWeight: 700, color: cat.amount > 0 ? cat.color : 'var(--muted)' }}>
                            {fmtR(cat.amount)}
                          </span>
                        </div>
                      </div>
                      {cat.amount > 0 && (
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${(cat.amount / gastosTotal) * 100}%`, background: cat.color }} />
                        </div>
                      )}
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Total</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)' }}>{fmtR(gastosTotal)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de desejo */}
            {pendingWish.length > 0 && (
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-pad">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ShoppingBag size={16} style={{ color: 'var(--accent)' }} />
                      <div className="card-title" style={{ margin: 0 }}>Lista de desejo</div>
                    </div>
                    <Link href="/ajustes" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Ver tudo</Link>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
                    {pendingWish.length} {pendingWish.length === 1 ? 'item' : 'itens'} · ~{fmtR(pendingWish.reduce((s, w) => s + (w.estimatedPrice || 0), 0))}
                  </div>
                  {pendingWish.slice(0, 4).map((item, i) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < Math.min(pendingWish.length, 4) - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.priority === 'alta' ? 'var(--danger)' : item.priority === 'media' ? 'var(--warn)' : 'var(--muted)', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</span>
                      </div>
                      {item.estimatedPrice > 0 && (
                        <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0, marginLeft: 8 }}>~{fmtR(item.estimatedPrice)}</span>
                      )}
                    </div>
                  ))}
                  {pendingWish.length > 4 && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>
                      +{pendingWish.length - 4} itens pendentes
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {showNotifs && <NotifPanel settings={settings} onClose={() => setShowNotifs(false)} />}
    </>
  );
}
