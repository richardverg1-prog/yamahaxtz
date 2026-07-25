'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmOpts {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface AlertOpts {
  title: string;
  message: string;
}

interface ModalCtx {
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
  showAlert: (opts: AlertOpts) => Promise<void>;
}

const Ctx = createContext<ModalCtx>({
  confirm: async () => false,
  showAlert: async () => {},
});

type State =
  | { kind: 'confirm'; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { kind: 'alert'; opts: AlertOpts; resolve: () => void }
  | null;

export function ModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(null);

  const confirm = (opts: ConfirmOpts): Promise<boolean> =>
    new Promise(resolve => setState({ kind: 'confirm', opts, resolve }));

  const showAlert = (opts: AlertOpts): Promise<void> =>
    new Promise(resolve => setState({ kind: 'alert', opts, resolve: resolve as () => void }));

  function handleConfirm(v: boolean) {
    if (!state) return;
    if (state.kind === 'confirm') state.resolve(v);
    else (state.resolve as () => void)();
    setState(null);
  }

  const s = state;

  return (
    <Ctx.Provider value={{ confirm, showAlert }}>
      {children}
      {s && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 20px', animation: 'fadeIn .15s ease',
          }}
          onClick={e => e.target === e.currentTarget && handleConfirm(false)}
        >
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: '28px 24px',
            width: '100%',
            maxWidth: 360,
            animation: 'slideUp .2s ease',
            boxShadow: '0 24px 64px rgba(0,0,0,.4)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: s.kind === 'confirm' && s.opts.danger ? 'var(--danger-dim)' : 'var(--accent-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {s.kind === 'confirm' && s.opts.danger
                  ? <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
                  : <Info size={20} style={{ color: 'var(--accent)' }} />
                }
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                  {s.kind === 'confirm' ? s.opts.title : s.opts.title}
                </div>
                <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.55 }}>
                  {s.kind === 'confirm' ? s.opts.message : s.opts.message}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              {s.kind === 'confirm' && (
                <button
                  className="btn btn-ghost"
                  style={{ flex: 1 }}
                  onClick={() => handleConfirm(false)}
                >
                  {s.opts.cancelLabel || 'Cancelar'}
                </button>
              )}
              <button
                className={`btn ${s.kind === 'confirm' && s.opts.danger ? 'btn-danger-soft' : 'btn-primary'}`}
                style={{ flex: 1 }}
                onClick={() => handleConfirm(s.kind === 'confirm' ? true : false)}
              >
                {s.kind === 'confirm' ? (s.opts.confirmLabel || 'Confirmar') : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useConfirm() {
  return useContext(Ctx).confirm;
}

export function useAlert() {
  return useContext(Ctx).showAlert;
}
