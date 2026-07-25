'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';
import { useTheme } from '@/components/ThemeProvider';
import { useConfirm } from '@/components/ConfirmModal';
import { clearSession } from '@/lib/auth';
import type { AppSettings, Theme } from '@/lib/types';
import { Check, Download, Trash2, LogOut } from 'lucide-react';

const THEMES: { key: Theme; label: string; desc: string; colors: [string, string, string] }[] = [
  { key: 'dark', label: 'Noite', desc: 'Fundo escuro com âmbar — padrão noturno', colors: ['#0D0C08', '#F5A623', '#2E2C22'] },
  { key: 'light', label: 'Dia', desc: 'Fundo claro — ideal para luz do dia', colors: ['#F2F0EB', '#C47D12', '#DDDAD2'] },
  { key: 'azul', label: 'Noite Azul', desc: 'Fundo escuro azulado — visual alternativo', colors: ['#070B14', '#4F8EF7', '#1E3056'] },
];

export default function Ajustes() {
  const { theme, setTheme } = useTheme();
  const confirm = useConfirm();
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(storage.getSettings());
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
