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
  id: string; urgency: 'danger' | 'warn' | 'info';
  icon: string; title: string; detail: string; at_km: number;
}
interface ActivityItem {
  id: string; date: string; title: string; subtitle: string;
  amount?: number; iconType: 'maint' | 'fuel' | 'multa' | 'insurance'; href: string;
}

function computeNotifs(s: AppSettings): Notif[] {
  const km = s.currentMileage;
  const out: Notif[] = [];
  const oilLeft = s.oilChangeInterval - (km - s.lastOilChangeMileage);
  if (oilLeft <= 0) out.push({ id: 'oil', urgency: 'danger', icon: '🛢️', title: 'Troca de óleo — VENCIDA', detail: `${fmt(Math.abs(oilLeft))} km atrasada`, at_km: s.lastOilChangeMileage + s.oilChangeInterval });
  else if (oilLeft <= 200) out.push({ id: 'oil', urgency: 'warn', icon: '🛢️', title: 'Óleo — trocar em breve', detail: `Faltam ${fmt(oilLeft)} km`, at_km: s.lastOilChangeMileage + s.oilChangeInterval });
  const filterLeft = s.filterChangeInterval - (km - s.lastFilterChangeMileage);
  if (filterLeft <= 0) out.push({ id: 'filter', urgency: 'danger', icon: '🔵', title: 'Filtro de óleo — VENCIDO', detail: `${fmt(Math.abs(filterLeft))} km atrasado`, at_km: s.lastFilterChangeMileage + s.filterChangeInterval });
  else if (filterLeft <= 400) out.push({ id: 'filter', urgency: 'warn', icon: '🔵', title: 'Filtro de óleo — trocar em breve', detail: `Faltam ${fmt(filterLeft)} km`, at_km: s.lastFilterChangeMileage + s.filterChangeInterval });
  const lastChain = s.lastChainCheckMileage || s.lastOilChangeMileage;
  const chainLeft = (lastChain + s.chainInterval) - km;
  if (chainLeft <= 50) out.push({ id: 'chain', urgency: 'warn', icon: '⛓️', title: 'Corrente — verificar agora', detail: `Próxima em ${fmt(lastChain + s.chainInterval)} km (faltam ${fmt(chainLeft)} km)`, at_km: lastChain + s.chainInterval });
  const sparkLeft = Math.ceil((km + 1) / 5000) * 5000 - km;
  if (sparkLeft <= 500) out.push({ id: 'spark', urgency: 'warn', icon: '⚡', title: 'Vela — verificar/limpar', detail: `Faltam ${fmt(sparkLeft)} km`, at_km: km + sparkLeft });
  const brakeNext = s.lastOilChangeMileage + 3000;
  if (brakeNext <= km) out.push({ id: 'brake', urgency: 'warn', icon: '🔴', title: 'Freios — verificar pastilhas', detail: `Em ${fmt(brakeNext)} km (${fmt(km - brakeNext)} km atrás)`, at_km: brakeNext });
  const docs = storage.getDocuments();
  const today = new Date().toISOString().slice(0, 10);
  docs.forEach(doc => {
    if (!doc.expiry) return;
    const daysLeft = Math.round((new Date(doc.expiry).getTime() - new Date(today).getTime()) / 86400000);
    if (daysLeft < 0) out.push({ id: `doc_${doc.id}`, urgency: 'danger', icon: '📄', title: `${doc.label} — VENCIDO`, detail: `Venceu há ${Math.abs(daysLeft)} dias`, at_km: 0 });
    else if (daysLeft <= 30) out.push({ id: `doc_${doc.id}`, urgency: 'danger', icon: '📄', title: `${doc.label} — vence em breve`, detail: `${daysLeft} dias`, at_km: 0 });
    else if (daysLeft <= 90) out.push({ id: `doc_${doc.id}`, urgency: 'warn', icon: '📄', title: `${doc.label} — renovar em breve`, detail: `${daysLeft} dias para vencer`, at_km: 0 });
  });
  const insurance = storage.getInsurance();
  if (insurance) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (!insurance.payments.some(p => p.month === currentMonth))
      out.push({ id: 'insurance', urgency: 'warn', icon: '🛡️', title: `Seguro ${insurance.insurerName} — pagamento pendente`, detail: `${fmtR(insurance.monthlyValue)} não registrado para ${fmtMonth(currentMonth)}`, at_km: 0 });
  }
  return out;
}

function NotifPanel({ settings, onClose }: { settings: AppSettings; onClose: () => void }) {
  const notifs = computeNotifs(settings);
  const uc = (u: Notif['urgency']) => u === 'danger' ? 'var(--danger)' : u === 'warn' ? 'var(--warn)' : 'var(--accent)';
  const ub = (u: Notif['urgency']) => u === 'danger' ? 'var(--danger-dim)' : u === 'warn' ? 'var(--warn-dim)' : 'var(--accent-dim)';
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 300 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'var(--surface)', borderRadius: '0 0 20px 20px', padding: '20px 16px 24px', maxWidth: 640, margin: '0 auto', animation: 'slideDown .2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} style={{ color: 'var(--accent)' }} /> Notificações
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
        </div>
        {notifs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)' }}>
            <Check size={32} style={{ margin: '0 auto 8px', color: 'var(--success)' }} />
            <div style={{ fontWeight: 600 }}>Tudo em dia!</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Nenhuma manutenção urgente.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifs.map(n => (
              <div key={n.id} style={{ background: ub(n.urgency), border: `1px solid ${uc(n.urgency)}`, borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{n.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: uc(n.urgency) }}>{n.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 2 }}>{n.detail}</div>
                  {n.at_km > 0 && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Previsto: {fmt(n.at_km)} km · atual: {fmt(settings.currentMileage)} km</div>}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>Atualize o odômetro no painel para recalcular</div>
      </div>
    </div>
  );
}

// ── ARC GAUGE ─────────────────────────────────────────────
function ArcGauge({ pct, size = 120, sw = 11, color, icon, label, valueText, subtext }: {
  pct: number; size?: number; sw?: number; color: string;
  icon: string; label: string; valueText: string; subtext?: string;
}) {
  const half = size / 2;
  const r = half - sw / 2 - 2;
  const C = 2 * Math.PI * r;
  const track = C * 0.75;
  const fill = track * Math.min(1, Math.max(0, pct));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ display: 'block', transform: 'rotate(135deg)' }}>
          <circle cx={half} cy={half} r={r} fill="none" stroke="var(--surface2)" strokeWidth={sw}
            strokeDasharray={`${track} ${C}`} strokeLinecap="round" />
          <circle cx={half} cy={half} r={r} fill="none" stroke={color} strokeWidth={sw}
            strokeDasharray={`${fill} ${C}`} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 5px ${color}55)` }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, paddingBottom: 10 }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
          <span style={{ fontSize: 13, fontWeight: 900, color, lineHeight: 1, letterSpacing: '-.02em' }}>{valueText}</span>
          {subtext && <span style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1 }}>{subtext}</span>}
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', textAlign: 'center', lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

// ── SPEEDOMETER ODOMETER ──────────────────────────────────
function SpeedoOdo({ km, editing, onEdit, mileageInput, onChange, onSave, onCancel }: {
  km: number; editing: boolean; onEdit: () => void;
  mileageInput: string; onChange: (v: string) => void; onSave: () => void; onCancel: () => void;
}) {
  const size = 210;
  const half = size / 2;
  const r = 88;
  const sw = 13;
  const C = 2 * Math.PI * r;
  const track = C * 0.75;
  const pct = Math.min(1, km / 50000);
  const fill = track * pct;
  const rInner = r - 24;
  const CInner = 2 * Math.PI * rInner;
  const trackInner = CInner * 0.75;

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ display: 'block', transform: 'rotate(135deg)' }}>
          {/* Outer track */}
          <circle cx={half} cy={half} r={r} fill="none" stroke="var(--surface2)" strokeWidth={sw}
            strokeDasharray={`${track} ${C}`} strokeLinecap="round" />
          {/* Outer fill (accent) */}
          <circle cx={half} cy={half} r={r} fill="none" stroke="var(--accent)" strokeWidth={sw}
            strokeDasharray={`${fill} ${C}`} strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 8px rgba(245,166,35,0.6))' }} />
          {/* Inner decorative ring */}
          <circle cx={half} cy={half} r={rInner} fill="none" stroke="var(--border)" strokeWidth={1.5}
            strokeDasharray={`${trackInner} ${CInner}`} strokeLinecap="round" />
          {/* Tick marks (every 30°, 8 ticks for 240° sweep) */}
          {Array.from({ length: 9 }).map((_, i) => {
            const angleDeg = 135 + i * (270 / 8);
            const angleRad = angleDeg * Math.PI / 180;
            const x1 = half + (r - sw / 2 - 3) * Math.cos(angleRad);
            const y1 = half + (r - sw / 2 - 3) * Math.sin(angleRad);
            const x2 = half + (r - sw / 2 - 10) * Math.cos(angleRad);
            const y2 = half + (r - sw / 2 - 10) * Math.sin(angleRad);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border)" strokeWidth={1.5} strokeLinecap="round" />;
          })}
        </svg>
        {/* Center content */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 2 }}>Odômetro</div>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
              <input className="form-input" type="number" placeholder="km atual"
                value={mileageInput} onChange={e => onChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onSave()} autoFocus
                style={{ textAlign: 'center', fontSize: 18, fontWeight: 800, width: 120, padding: '6px 10px' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-primary btn-sm" onClick={onSave}>Salvar</button>
                <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕</button>
              </div>
            </div>
          ) : (
            <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'center' }}>
                <span style={{ fontSize: 38, fontWeight: 900, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-.03em' }}>{fmt(km)}</span>
                <span style={{ fontSize: 15, color: 'var(--muted)' }}>km</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Toque para atualizar</div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────
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

  // Oil
  const oilKm = km - settings.lastOilChangeMileage;
  const oilPct = Math.min(1, oilKm / settings.oilChangeInterval);
  const oilRemaining = settings.oilChangeInterval - oilKm;
  const oilColor = oilPct >= 1 ? 'var(--danger)' : oilPct >= 0.8 ? 'var(--warn)' : 'var(--success)';

  // Filter
  const filterKm = km - settings.lastFilterChangeMileage;
  const filterPct = Math.min(1, filterKm / settings.filterChangeInterval);
  const filterRemaining = settings.filterChangeInterval - filterKm;
  const filterColor = filterPct >= 1 ? 'var(--danger)' : filterPct >= 0.8 ? 'var(--warn)' : 'var(--accent)';

  // Spark
  const sparkNext = Math.ceil((km + 1) / 5000) * 5000;
  const sparkLeft = sparkNext - km;
  const sparkPct = Math.min(1, (5000 - sparkLeft) / 5000);
  const sparkColor = sparkLeft <= 500 ? 'var(--warn)' : 'var(--success)';

  // Chain
  const lastChainKm = settings.lastChainCheckMileage || settings.lastOilChangeMileage;
  const nextChainKm = lastChainKm + settings.chainInterval;
  const chainLeft = nextChainKm - km;
  const brakeNext = settings.lastOilChangeMileage + 3000;

  // Fuel stats
  const validKmL = fuel.filter(f => f.kmL !== null && f.kmL! > 0);
  const avgKmL = validKmL.length ? validKmL.reduce((s, f) => s + f.kmL!, 0) / validKmL.length : null;
  // Fuel efficiency gauge: XTZ 250X gets ~30-42 km/L. 40 = 100%.
  const fuelPct = avgKmL ? Math.min(1, avgKmL / 40) : 0;
  const fuelColor = avgKmL ? (avgKmL >= 32 ? 'var(--success)' : avgKmL >= 26 ? 'var(--warn)' : 'var(--danger)') : 'var(--muted)';

  // Costs
  const totalMaintCost = maintenance.reduce((s, e) => s + e.totalCost, 0);
  const totalFuelCost = fuel.reduce((s, e) => s + e.totalCost, 0);
  const totalMultas = docs.filter(d => d.type === 'multa').reduce((s, d) => s + (d.amount ?? 0), 0);
  const totalSeguro = insurance?.payments.reduce((s, p) => s + p.amount, 0) ?? 0;
  const totalInvested = totalMaintCost + totalFuelCost + totalMultas + totalSeguro;

  const allMileages = [...maintenance.map(e => e.mileage), ...fuel.map(e => e.mileage)];
  const firstKm = allMileages.length > 0 ? Math.min(...allMileages) : km;
  const kmTracked = Math.max(0, km - firstKm);
  const custoPorKm = kmTracked > 10 ? totalInvested / kmTracked : null;

  const notifs = computeNotifs(settings);
  const notifBadge = notifs.filter(n => n.urgency !== 'info').length;

  const alerts: { type: 'danger' | 'warn' | 'ok'; msg: string }[] = [];
  if (oilPct >= 1) alerts.push({ type: 'danger', msg: `Troca de óleo vencida! (${fmt(oilKm)} km sem trocar)` });
  else if (oilPct >= 0.8) alerts.push({ type: 'warn', msg: `Troca de óleo em breve — restam ~${fmt(oilRemaining)} km` });
  if (filterPct >= 1) alerts.push({ type: 'danger', msg: `Filtro de óleo vencido! (${fmt(filterKm)} km sem trocar)` });
  else if (filterPct >= 0.8) alerts.push({ type: 'warn', msg: `Filtro em breve — restam ~${fmt(filterRemaining)} km` });

  function saveKm() {
    const v = parseInt(mileageInput);
    if (!v || v <= 0) return;
    const updated = { ...settings!, currentMileage: v };
    storage.setSettings(updated); setSettings(updated); setEditing(false);
  }

  const schedule = [
    { emoji: '⛓️', label: 'Corrente (verificar/lubrificar)', km: nextChainKm, left: chainLeft, badge: chainLeft <= 50 ? 'warn' : 'muted' as string },
    { emoji: '🛢️', label: 'Troca de óleo', km: settings.lastOilChangeMileage + settings.oilChangeInterval, left: oilRemaining, badge: oilPct >= 1 ? 'danger' : oilPct >= 0.8 ? 'warn' : 'muted' as string },
    { emoji: '🔵', label: 'Filtro de óleo', km: settings.lastFilterChangeMileage + settings.filterChangeInterval, left: filterRemaining, badge: filterPct >= 1 ? 'danger' : filterPct >= 0.8 ? 'warn' : 'muted' as string },
    { emoji: '🔴', label: 'Freios (desgaste/nível DOT4)', km: brakeNext, left: brakeNext - km, badge: brakeNext <= km ? 'warn' : 'muted' as string },
    { emoji: '⚡', label: 'Vela (verificar/limpar)', km: sparkNext, left: sparkLeft, badge: sparkLeft <= 500 ? 'warn' : 'muted' as string },
    { emoji: '💨', label: 'Filtro de ar (limpar)', km: sparkNext, left: sparkLeft, badge: sparkLeft <= 500 ? 'warn' : 'muted' as string },
  ];

  const paidMultas = docs.filter(d => d.type === 'multa' && d.status === 'pago' && !!d.paymentDate);
  const activityItems: ActivityItem[] = [
    ...maintenance.map(e => ({ id: e.id, date: e.date, iconType: 'maint' as const, title: e.shop || 'Manutenção', subtitle: `${fmtDate(e.date)} · ${fmt(e.mileage)} km`, amount: e.totalCost, href: '/manutencao' })),
    ...fuel.map(e => ({ id: e.id, date: e.date, iconType: 'fuel' as const, title: `${e.liters.toFixed(3)} L abastecidos`, subtitle: `${fmtDate(e.date)} · ${fmt(e.mileage)} km${e.kmL ? ` · ${e.kmL.toFixed(1)} km/L` : ''}`, amount: e.totalCost, href: '/combustivel' })),
    ...paidMultas.map(d => ({ id: d.id, date: d.paymentDate!, iconType: 'multa' as const, title: `Multa paga — ${d.label}`, subtitle: `Paga em ${fmtDate(d.paymentDate!)}`, amount: d.amount, href: '/documentos' })),
    ...(insurance?.payments ?? []).map(p => ({ id: p.id, date: p.paidAt.slice(0, 10), iconType: 'insurance' as const, title: `Seguro — ${fmtMonth(p.month)}`, subtitle: `Pago em ${fmtDate(p.paidAt.slice(0, 10))}`, amount: p.amount, href: '/documentos' })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  const gastosCategories = [
    { label: 'Manutenção', amount: totalMaintCost, color: 'var(--accent)' },
    { label: 'Combustível', amount: totalFuelCost, color: 'var(--success)' },
    { label: 'Seguros', amount: totalSeguro, color: 'var(--warn)' },
    { label: 'Multas', amount: totalMultas, color: 'var(--danger)' },
  ];
  const gastosTotal = gastosCategories.reduce((s, c) => s + c.amount, 0);

  const pendingWish = wishlist.filter(w => !w.done);
  const wishTotal = pendingWish.reduce((s, w) => s + (w.estimatedPrice || 0), 0);

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
      {/* ── HEADER ─────────────────────────────────────── */}
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
          <button onClick={() => setShowNotifs(true)} style={{ position: 'relative', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: notifBadge > 0 ? 'var(--warn)' : 'var(--muted)' }}>
            <Bell size={20} />
            {notifBadge > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--danger)', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg)' }}>
                {notifBadge}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 12 }}>
        <div className="dash-grid">

          {/* ── LEFT COLUMN ─────────────────────────────── */}
          <div>
            {/* Photos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <div style={{ borderRadius: 14, overflow: 'hidden', height: 160, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <img src="/foto-moto-2.jpg" alt="XTZ 250X" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ borderRadius: 14, overflow: 'hidden', height: 160, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <img src="/foto-moto-1.jpg" alt="XTZ 250X" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>

            {/* Alerts */}
            {alerts.map((a, i) => (
              <div key={i} className={`alert alert-${a.type}`}><AlertTriangle size={18} style={{ flexShrink: 0 }} />{a.msg}</div>
            ))}
            {alerts.length === 0 && (
              <div className="alert alert-ok" style={{ marginBottom: 14 }}>
                <Check size={18} style={{ flexShrink: 0 }} />Tudo em dia — nenhuma manutenção urgente
              </div>
            )}

            {/* SPEEDOMETER ODOMETER */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-pad" style={{ paddingTop: 20, paddingBottom: 16 }}>
                <SpeedoOdo km={km} editing={editing} onEdit={() => { setMileageInput(String(km)); setEditing(true); }}
                  mileageInput={mileageInput} onChange={setMileageInput} onSave={saveKm} onCancel={() => setEditing(false)} />
              </div>
            </div>

            {/* INSTRUMENT CLUSTER ── 4 arc gauges */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-pad">
                <div className="card-title">Saúde dos consumíveis</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, justifyItems: 'center' }}>
                  <ArcGauge
                    pct={oilPct} color={oilColor} icon="🛢️" label="Óleo motor"
                    valueText={oilPct >= 1 ? 'VENC.' : `+${oilRemaining > 999 ? (oilRemaining/1000).toFixed(1)+'k' : fmt(oilRemaining)}`}
                    subtext={`/${fmt(settings.oilChangeInterval)} km`}
                  />
                  <ArcGauge
                    pct={filterPct} color={filterColor} icon="🔵" label="Filtro óleo"
                    valueText={filterPct >= 1 ? 'VENC.' : `+${filterRemaining > 999 ? (filterRemaining/1000).toFixed(1)+'k' : fmt(filterRemaining)}`}
                    subtext={`/${fmt(settings.filterChangeInterval)} km`}
                  />
                  <ArcGauge
                    pct={sparkPct} color={sparkColor} icon="⚡" label="Vela"
                    valueText={sparkLeft <= 500 ? 'VERIF.' : `+${sparkLeft > 999 ? (sparkLeft/1000).toFixed(1)+'k' : fmt(sparkLeft)}`}
                    subtext={`/5.000 km`}
                  />
                  <ArcGauge
                    pct={fuelPct} color={fuelColor} icon="⛽" label="Consumo"
                    valueText={avgKmL ? `${avgKmL.toFixed(1)}` : '—'}
                    subtext={avgKmL ? 'km/L' : 'sem dados'}
                  />
                </div>
                {/* Chain status bar */}
                <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>⛓️</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Corrente</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Próxima verificação: {fmt(nextChainKm)} km · folga ideal 15–25 mm</div>
                    </div>
                  </div>
                  <span className={`badge badge-${chainLeft <= 50 ? 'warn' : 'success'}`}>{chainLeft <= 50 ? 'Verificar!' : `+${fmt(Math.max(0, chainLeft))} km`}</span>
                </div>
                <div style={{ marginTop: 8, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🔴</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Freios</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Verificar pastilhas/nível DOT4 em {fmt(brakeNext)} km</div>
                    </div>
                  </div>
                  <span className={`badge badge-${brakeNext <= km ? 'warn' : 'muted'}`}>{brakeNext <= km ? 'Verificar!' : `+${fmt(brakeNext - km)} km`}</span>
                </div>
              </div>
            </div>

            {/* STATS GRID */}
            <div className="stat-grid" style={{ marginBottom: 14 }}>
              <div className="stat-tile" style={{ borderLeft: '3px solid var(--accent)' }}>
                <div className="stat-label">💰 Total investido</div>
                <div className="stat-value" style={{ fontSize: 18 }}>{fmtR(totalInvested)}</div>
                <div className="stat-sub">todos os gastos</div>
              </div>
              <div className="stat-tile" style={{ borderLeft: '3px solid var(--success)' }}>
                <div className="stat-label">📍 Custo por km</div>
                <div className="stat-value" style={{ fontSize: 18 }}>{custoPorKm ? `R$${custoPorKm.toFixed(2)}` : '—'}</div>
                <div className="stat-sub">{kmTracked > 10 ? `${fmt(kmTracked)} km rastreados` : 'aguardando dados'}</div>
              </div>
              <div className="stat-tile" style={{ borderLeft: '3px solid var(--warn)' }}>
                <div className="stat-label">⛽ Consumo médio</div>
                <div className="stat-value">{avgKmL ? `${avgKmL.toFixed(1)}` : '—'}</div>
                <div className="stat-sub">{avgKmL ? 'km/L' : 'sem dados'}</div>
              </div>
              <div className="stat-tile" style={{ borderLeft: '3px solid var(--muted)' }}>
                <div className="stat-label">🏁 Abastecimentos</div>
                <div className="stat-value">{fuel.length}</div>
                <div className="stat-sub">{fmtR(totalFuelCost)}</div>
              </div>
            </div>

            {/* PRÓXIMAS MANUTENÇÕES */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-pad">
                <div className="card-title">Próximas manutenções</div>
                {schedule.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < schedule.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontSize: 16, flexShrink: 0, width: 24, textAlign: 'center' }}>{item.emoji}</span>
                    <span style={{ flex: 1, fontSize: 13 }}>{item.label}</span>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span className={`badge badge-${item.badge}`}>{fmt(item.km)} km</span>
                      {item.left > 0 && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>faltam {fmt(item.left)} km</div>}
                      {item.left <= 0 && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>vencida</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LISTA DE DESEJO — always visible in main panel */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShoppingBag size={16} style={{ color: 'var(--accent)' }} />
                    <div className="card-title" style={{ margin: 0 }}>Lista de desejo</div>
                  </div>
                  <Link href="/ajustes" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
                    Gerenciar <ChevronRight size={14} />
                  </Link>
                </div>
                {pendingWish.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--muted)', fontSize: 13 }}>
                    Nenhum item na lista · <Link href="/ajustes" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Adicionar</Link>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
                      {pendingWish.length} {pendingWish.length === 1 ? 'item' : 'itens'} · estimado {fmtR(wishTotal)}
                    </div>
                    {pendingWish.slice(0, 5).map((item, i) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < Math.min(pendingWish.length, 5) - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.priority === 'alta' ? 'var(--danger)' : item.priority === 'media' ? 'var(--warn)' : 'var(--muted)', flexShrink: 0 }} />
                          <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</span>
                          <span className={`badge badge-${item.priority === 'alta' ? 'danger' : item.priority === 'media' ? 'warn' : 'muted'}`} style={{ flexShrink: 0 }}>{item.priority}</span>
                        </div>
                        {item.estimatedPrice > 0 && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', flexShrink: 0, marginLeft: 8 }}>~{fmtR(item.estimatedPrice)}</span>
                        )}
                      </div>
                    ))}
                    {pendingWish.length > 5 && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>+{pendingWish.length - 5} itens · <Link href="/ajustes" style={{ color: 'var(--accent)', textDecoration: 'none' }}>ver todos</Link></div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ────────────────────────────── */}
          <div>
            {/* Atividade recente */}
            <div className="card-title" style={{ marginBottom: 8 }}>Atividade recente</div>
            {activityItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 14, marginBottom: 14 }}>Nenhuma atividade registrada ainda</div>
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
                      {item.amount !== undefined && <div style={{ fontWeight: 700, color: amountColor(item.iconType) }}>{fmtR(item.amount)}</div>}
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
                  {/* Donut mini SVG */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                    {(() => {
                      const size = 110, half = size / 2, r = 38, sw = 14;
                      const C = 2 * Math.PI * r;
                      let offset = 0;
                      return (
                        <div style={{ position: 'relative', width: size, height: size }}>
                          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                            {gastosCategories.filter(c => c.amount > 0).map((cat, i) => {
                              const arc = (cat.amount / gastosTotal) * C;
                              const dashArray = `${arc} ${C - arc}`;
                              const dashOffset = -offset;
                              offset += arc;
                              return (
                                <circle key={i} cx={half} cy={half} r={r} fill="none"
                                  stroke={cat.color} strokeWidth={sw}
                                  strokeDasharray={dashArray} strokeDashoffset={dashOffset} />
                              );
                            })}
                          </svg>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{fmtR(gastosTotal)}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Total</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  {gastosCategories.map(cat => (
                    <div key={cat.label} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 13 }}>{cat.label}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{gastosTotal > 0 ? Math.round((cat.amount / gastosTotal) * 100) : 0}%</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: cat.amount > 0 ? cat.color : 'var(--muted)' }}>{fmtR(cat.amount)}</span>
                        </div>
                      </div>
                      {cat.amount > 0 && (
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${(cat.amount / gastosTotal) * 100}%`, background: cat.color }} />
                        </div>
                      )}
                    </div>
                  ))}
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
