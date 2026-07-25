'use client';
import { useEffect, useRef, useState } from 'react';
import { storage, compressImage } from '@/lib/storage';
import type { GalleryPhoto } from '@/lib/types';
import { Camera, Plus, X, Trash2 } from 'lucide-react';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

const CATS = [
  { key: 'moto', label: 'Moto' },
  { key: 'nota', label: 'Nota fiscal' },
  { key: 'manutencao', label: 'Manutenção' },
  { key: 'outro', label: 'Outro' },
] as const;

export default function Galeria() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [viewer, setViewer] = useState<GalleryPhoto | null>(null);
  const [adding, setAdding] = useState(false);
  const [newCaption, setNewCaption] = useState('');
  const [newCat, setNewCat] = useState<GalleryPhoto['category']>('moto');
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setPhotos(storage.getGallery()); }, []);

  async function handleFile(files: FileList | null) {
    if (!files?.[0]) return;
    setUploading(true);
    const url = await compressImage(files[0]);
    setPendingUrl(url);
    setAdding(true);
    setUploading(false);
  }

  function savePhoto() {
    if (!pendingUrl) return;
    const p: GalleryPhoto = {
      id: uid(),
      date: new Date().toISOString().slice(0, 10),
      caption: newCaption,
      category: newCat,
      dataUrl: pendingUrl,
    };
    const updated = [p, ...photos];
    storage.setGallery(updated);
    setPhotos(updated);
    setAdding(false);
    setPendingUrl(null);
    setNewCaption('');
  }

  function deletePhoto(id: string) {
    const updated = photos.filter(p => p.id !== id);
    storage.setGallery(updated);
    setPhotos(updated);
    setViewer(null);
  }

  const filtered = filter === 'all' ? photos : photos.filter(p => p.category === filter);

  return (
    <>
      <div className="page-header" style={{ paddingTop: 24, paddingBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Galeria</h1>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{photos.length} foto{photos.length !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {[{ key: 'all', label: 'Todas' }, ...CATS].map(c => (
            <button key={c.key}
              className={`btn btn-sm ${filter === c.key ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flexShrink: 0 }}
              onClick={() => setFilter(c.key)}
            >{c.label}</button>
          ))}
        </div>
      </div>

      <div className="page" style={{ paddingTop: 16 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
            <Camera size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <div>{photos.length === 0 ? 'Nenhuma foto ainda' : 'Nenhuma foto nesta categoria'}</div>
            {photos.length === 0 && <div style={{ fontSize: 13, marginTop: 4 }}>Toque no + para adicionar</div>}
          </div>
        )}

        <div className="photo-grid">
          {filtered.map(p => (
            <div key={p.id} className="photo-cell" onClick={() => setViewer(p)}>
              <img src={p.dataUrl} alt={p.caption} />
              {p.caption && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,.7))', padding: '12px 6px 4px', fontSize: 10, color: '#fff', fontWeight: 600 }}>
                  {p.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FAB */}
      <input ref={fileRef} type="file" accept="image/*" onChange={e => handleFile(e.target.files)} style={{ display: 'none' }} />
      <button className="fab" onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? <div style={{ width: 20, height: 20, border: '2px solid var(--accent-fg)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <Plus size={24} />}
      </button>

      {/* Add modal */}
      {adding && pendingUrl && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAdding(false)}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div className="modal-title" style={{ margin: 0 }}>Adicionar foto</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setAdding(false)}><X size={18} /></button>
            </div>
            <img src={pendingUrl} alt="" style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 10, marginBottom: 16 }} />
            <div className="form-group">
              <label className="form-label">Legenda (opcional)</label>
              <input className="form-input" placeholder="Ex: Motor aberto na revisão" value={newCaption} onChange={e => setNewCaption(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CATS.map(c => (
                  <button key={c.key} className={`btn btn-sm ${newCat === c.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setNewCat(c.key as GalleryPhoto['category'])}>{c.label}</button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary btn-full" onClick={savePhoto}>Salvar</button>
            <div style={{ height: 8 }} />
          </div>
        </div>
      )}

      {/* Viewer */}
      {viewer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.95)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 16px', paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}>
            <div>
              {viewer.caption && <div style={{ fontWeight: 600, color: '#fff' }}>{viewer.caption}</div>}
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{viewer.date}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-danger-soft btn-icon" onClick={() => { if (confirm('Excluir foto?')) deletePhoto(viewer.id); }}>
                <Trash2 size={18} />
              </button>
              <button className="btn btn-ghost btn-icon" style={{ background: 'rgba(255,255,255,.1)', color: '#fff' }} onClick={() => setViewer(null)}>
                <X size={18} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <img src={viewer.dataUrl} alt={viewer.caption} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  );
}
