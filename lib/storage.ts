'use client';
import type { MaintenanceEntry, FuelEntry, GalleryPhoto, AppSettings, MotoDocument, WishlistItem, TripLog, ChecklistRun, InsuranceRecord } from './types';
import { scheduleSyncPush } from './sync';

function getCurrentUserId(): string {
  if (typeof window === 'undefined') return 'default';
  try {
    const raw = localStorage.getItem('xtz_auth_session');
    if (!raw) return 'default';
    const s = JSON.parse(raw);
    if (new Date(s.expiresAt) < new Date()) return 'default';
    return s.userId;
  } catch { return 'default'; }
}

function uk(base: string): string {
  return `xtz_u_${getCurrentUserId()}_${base}`;
}

const INIT_MAINTENANCE: MaintenanceEntry[] = [
  {
    id: 'mnt_001',
    date: '2026-07-24',
    mileage: 1350,
    shop: 'Premier Moto Peças',
    shopPhone: '99211-4793 / 3537-1353',
    items: [
      { description: 'Pinça do Freio Traseiro', quantity: 1, unit: 'un', total: 180 },
      { description: 'Conduíte do Filtro de Ar', quantity: 1, unit: 'un', total: 52 },
      { description: 'Acionador da Corrente de Comando', quantity: 1, unit: 'un', total: 110 },
      { description: 'Filtro de Óleo', quantity: 1, unit: 'un', total: 20 },
      { description: 'Óleo Yamalube 20W50', quantity: 1.2, unit: 'LT', total: 67 },
      { description: 'Suporte do Filtro de Ar', quantity: 1, unit: 'un', total: 45 },
      { description: 'Rosca do Carter + Parafuso', quantity: 1, unit: 'un', total: 90 },
      { description: 'Anel da Tampa do Filtro de Óleo', quantity: 2, unit: 'un', total: 76 },
      { description: 'Anel do Cano do Radiador', quantity: 2, unit: 'un', total: 74 },
      { description: 'Tucho do Cano do Radiador', quantity: 1, unit: 'un', total: 10 },
      { description: 'Arruela de Bronze do Cano do Óleo', quantity: 4, unit: 'un', total: 24 },
      { description: 'Anel da Tampa do Gerador', quantity: 2, unit: 'un', total: 8 },
      { description: 'Retentor do Eixo do Pião Vedamolis', quantity: 1, unit: 'un', total: 45 },
      { description: 'Trava do Pião', quantity: 1, unit: 'un', total: 15 },
      { description: 'Porca do Pião', quantity: 1, unit: 'un', total: 25 },
      { description: 'Mão de Obra — Conduíte', quantity: 1, unit: 'sv', total: 40 },
      { description: 'Mão de Obra — Pinça do Freio', quantity: 1, unit: 'sv', total: 30 },
    ],
    totalCost: 850,
    notes: 'Primeira revisão. Motor revisado. Rosca do carter danificada — reparada.',
    photos: [],
    tags: ['oleo', 'freio', 'filtro', 'vedacoes'],
  },
];

const INIT_FUEL: FuelEntry[] = [
  {
    id: 'fuel_001',
    date: '2026-07-24',
    mileage: 1357,
    liters: 8.796,
    totalCost: 60.16,
    pricePerLiter: 6.84,
    isFull: true,
    notes: 'Início do controle de consumo.',
    kmL: null,
  },
];

const INIT_SETTINGS: AppSettings = {
  theme: 'dark',
  currentMileage: 1381,
  lastOilChangeMileage: 1350,
  lastFilterChangeMileage: 1350,
  oilChangeInterval: 1500,
  filterChangeInterval: 3000,
  chainInterval: 500,
  lastChainCheckMileage: 1350,
  bikeName: 'XTZ 250X',
  bikeYear: '2008',
  bikeColor: 'Preta',
};

function get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}

function set<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { }
}

export function ensureSeeded() {
  const seedKey = uk('seeded_v4');
  if (get(seedKey, false)) return;

  // Migrate from old non-namespaced keys (only for admin user with existing data)
  const oldMaint = localStorage.getItem('xtz_maintenance');
  if (oldMaint && oldMaint !== '[]') {
    const keys = ['maintenance', 'fuel', 'gallery', 'settings', 'documents', 'wishlist', 'trips', 'checklists'];
    const oldKeys: Record<string, string> = {
      maintenance: 'xtz_maintenance', fuel: 'xtz_fuel', gallery: 'xtz_gallery',
      settings: 'xtz_settings', documents: 'xtz_documents', wishlist: 'xtz_wishlist',
      trips: 'xtz_trips', checklists: 'xtz_checklists',
    };
    keys.forEach(k => {
      const old = localStorage.getItem(oldKeys[k]);
      if (old) localStorage.setItem(uk(k), old);
    });
    // Patch settings to add lastChainCheckMileage if missing
    const s: AppSettings = get(uk('settings'), INIT_SETTINGS);
    if (!s.lastChainCheckMileage) {
      set(uk('settings'), { ...s, lastChainCheckMileage: s.lastOilChangeMileage || 1350 });
    }
  } else {
    // Fresh user seed
    set(uk('maintenance'), INIT_MAINTENANCE);
    set(uk('fuel'), INIT_FUEL);
    set(uk('gallery'), []);
    set(uk('settings'), INIT_SETTINGS);
    set(uk('documents'), []);
    set(uk('wishlist'), []);
    set(uk('trips'), []);
    set(uk('checklists'), []);
  }

  set(seedKey, true);
  scheduleSyncPush();
}

export const storage = {
  getMaintenance: (): MaintenanceEntry[] => get(uk('maintenance'), []),
  setMaintenance: (d: MaintenanceEntry[]) => { set(uk('maintenance'), d); scheduleSyncPush(); },

  getFuel: (): FuelEntry[] => get(uk('fuel'), []),
  setFuel: (d: FuelEntry[]) => { set(uk('fuel'), d); scheduleSyncPush(); },

  getGallery: (): GalleryPhoto[] => get(uk('gallery'), []),
  setGallery: (d: GalleryPhoto[]) => { set(uk('gallery'), d); scheduleSyncPush(); },

  getSettings: (): AppSettings => {
    const s = get(uk('settings'), INIT_SETTINGS);
    return {
      ...s,
      theme: (s.theme as string) === 'sunset' ? 'dark' : (s.theme || 'dark'),
      oilChangeInterval: s.oilChangeInterval || INIT_SETTINGS.oilChangeInterval,
      filterChangeInterval: s.filterChangeInterval || INIT_SETTINGS.filterChangeInterval,
      chainInterval: s.chainInterval || INIT_SETTINGS.chainInterval,
      lastChainCheckMileage: s.lastChainCheckMileage || s.lastOilChangeMileage || INIT_SETTINGS.lastChainCheckMileage,
    };
  },
  setSettings: (d: AppSettings) => { set(uk('settings'), d); scheduleSyncPush(); },
  patchSettings: (p: Partial<AppSettings>) => {
    const cur = get(uk('settings'), INIT_SETTINGS);
    set(uk('settings'), { ...cur, ...p });
    scheduleSyncPush();
  },

  getDocuments: (): MotoDocument[] => get(uk('documents'), []),
  setDocuments: (d: MotoDocument[]) => { set(uk('documents'), d); scheduleSyncPush(); },

  getWishlist: (): WishlistItem[] => get(uk('wishlist'), []),
  setWishlist: (d: WishlistItem[]) => { set(uk('wishlist'), d); scheduleSyncPush(); },

  getTrips: (): TripLog[] => get(uk('trips'), []),
  setTrips: (d: TripLog[]) => { set(uk('trips'), d); scheduleSyncPush(); },

  getChecklists: (): ChecklistRun[] => get(uk('checklists'), []),
  setChecklists: (d: ChecklistRun[]) => { set(uk('checklists'), d); scheduleSyncPush(); },

  getInsurance: (): InsuranceRecord | null => get(uk('insurance'), null),
  setInsurance: (d: InsuranceRecord | null) => { set(uk('insurance'), d); scheduleSyncPush(); },

  clearAll: () => {
    if (typeof window === 'undefined') return;
    const prefix = `xtz_u_${getCurrentUserId()}_`;
    Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k));
    // Also clear legacy keys
    ['xtz_maintenance','xtz_fuel','xtz_gallery','xtz_settings','xtz_documents',
     'xtz_wishlist','xtz_trips','xtz_checklists','xtz_seeded_v1','xtz_seeded_v2','xtz_seeded_v3']
      .forEach(k => localStorage.removeItem(k));
  },
};

export function compressImage(file: File, maxPx = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function ocrWithClaude(base64DataUrl: string, apiKey: string): Promise<any> {
  const base64 = base64DataUrl.split(',')[1];
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: 'Nota fiscal ou orçamento de manutenção de moto. Extraia os dados e responda SOMENTE com JSON válido (sem markdown, sem explicações):\n{"date":"YYYY-MM-DD","mileage":0,"shop":"","shopPhone":"","items":[{"description":"","quantity":1,"unit":"un","total":0}],"totalCost":0,"notes":""}\nSe algum campo não estiver visível: "" para strings, 0 para números. Data obrigatória no formato YYYY-MM-DD.' }
        ]
      }]
    })
  });
  if (!resp.ok) throw new Error(`API error ${resp.status}`);
  const data = await resp.json();
  const text = data.content?.[0]?.text ?? '';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}
