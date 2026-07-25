'use client';
import type { MaintenanceEntry, FuelEntry, GalleryPhoto, AppSettings, MotoDocument, WishlistItem, TripLog, ChecklistRun } from './types';

const K = {
  MAINTENANCE: 'xtz_maintenance',
  FUEL: 'xtz_fuel',
  GALLERY: 'xtz_gallery',
  SETTINGS: 'xtz_settings',
  DOCUMENTS: 'xtz_documents',
  WISHLIST: 'xtz_wishlist',
  TRIPS: 'xtz_trips',
  CHECKLISTS: 'xtz_checklists',
  SEEDED: 'xtz_seeded_v3',
};

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
    notes: 'Trip2 zerado — início do controle de consumo.',
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
  bikeName: 'XTZ 250X',
  bikeYear: '2008',
  bikeColor: 'Preta',
};

const INIT_TRIPS: TripLog[] = [
  { id: 'trip_001', trip: 1, date: '2026-07-24', mileage: 1350 },
  { id: 'trip_002', trip: 2, date: '2026-07-24', mileage: 1357 },
];

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
  if (get(K.SEEDED, false)) return;
  set(K.MAINTENANCE, INIT_MAINTENANCE);
  set(K.FUEL, INIT_FUEL);
  set(K.GALLERY, []);
  set(K.SETTINGS, INIT_SETTINGS);
  set(K.DOCUMENTS, []);
  set(K.WISHLIST, []);
  set(K.TRIPS, INIT_TRIPS);
  set(K.CHECKLISTS, []);
  set(K.SEEDED, true);
}

export const storage = {
  getMaintenance: (): MaintenanceEntry[] => get(K.MAINTENANCE, []),
  setMaintenance: (d: MaintenanceEntry[]) => set(K.MAINTENANCE, d),

  getFuel: (): FuelEntry[] => get(K.FUEL, []),
  setFuel: (d: FuelEntry[]) => set(K.FUEL, d),

  getGallery: (): GalleryPhoto[] => get(K.GALLERY, []),
  setGallery: (d: GalleryPhoto[]) => set(K.GALLERY, d),

  getSettings: (): AppSettings => get(K.SETTINGS, INIT_SETTINGS),
  setSettings: (d: AppSettings) => set(K.SETTINGS, d),
  patchSettings: (p: Partial<AppSettings>) => {
    set(K.SETTINGS, { ...get(K.SETTINGS, INIT_SETTINGS), ...p });
  },

  getDocuments: (): MotoDocument[] => get(K.DOCUMENTS, []),
  setDocuments: (d: MotoDocument[]) => set(K.DOCUMENTS, d),

  getWishlist: (): WishlistItem[] => get(K.WISHLIST, []),
  setWishlist: (d: WishlistItem[]) => set(K.WISHLIST, d),

  getTrips: (): TripLog[] => get(K.TRIPS, []),
  setTrips: (d: TripLog[]) => set(K.TRIPS, d),

  getChecklists: (): ChecklistRun[] => get(K.CHECKLISTS, []),
  setChecklists: (d: ChecklistRun[]) => set(K.CHECKLISTS, d),

  clearAll: () => {
    Object.values(K).forEach(k => {
      if (typeof window !== 'undefined') localStorage.removeItem(k);
    });
    // also clear legacy seeds
    if (typeof window !== 'undefined') {
      localStorage.removeItem('xtz_seeded_v2');
      localStorage.removeItem('xtz_seeded_v1');
    }
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
