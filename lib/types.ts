export interface MaintenanceItem {
  description: string;
  quantity: number;
  unit: string;
  total: number;
}

export interface MaintenanceEntry {
  id: string;
  date: string;
  mileage: number;
  shop: string;
  shopPhone?: string;
  items: MaintenanceItem[];
  totalCost: number;
  notes: string;
  photos: string[];
  tags: string[];
}

export interface FuelEntry {
  id: string;
  date: string;
  mileage: number;
  liters: number;
  totalCost: number;
  pricePerLiter: number;
  isFull: boolean;
  notes: string;
  kmL: number | null;
  photos?: string[];
}

export interface GalleryPhoto {
  id: string;
  date: string;
  caption: string;
  category: 'moto' | 'nota' | 'manutencao' | 'outro';
  dataUrl: string;
}

export type Theme = 'dark' | 'light' | 'azul';

export interface TireEntry {
  position: 'dianteiro' | 'traseiro';
  brand: string;
  model: string;
  size: string;
  installDate: string;
  installMileage: number;
  expectedLifeKm: number;
  dotCode: string;
  notes: string;
}

export interface MotoDocument {
  id: string;
  type: 'crlv' | 'seguro' | 'multa' | 'outro';
  label: string;
  expiry?: string;
  number?: string;
  amount?: number;
  status?: 'pago' | 'pendente';
  notes?: string;
  // Multa fields
  infractedDate?: string;
  paymentDate?: string;
}

export interface InsurancePayment {
  id: string;
  month: string;    // "2026-07"
  amount: number;
  paidAt: string;   // ISO date
}

export interface InsuranceRecord {
  id: string;
  insurerName: string;
  policyNumber?: string;
  contractStartDate: string;
  contractMonths: number;
  monthlyValue: number;
  notes?: string;
  payments: InsurancePayment[];
}

export interface WishlistItem {
  id: string;
  description: string;
  priority: 'alta' | 'media' | 'baixa';
  estimatedPrice: number;
  url?: string;
  done: boolean;
}

export interface TripLog {
  id: string;
  trip: 1 | 2;
  date: string;
  mileage: number;
}

export interface ChecklistRun {
  id: string;
  date: string;
  mileage: number;
  passed: boolean;
  items: Record<string, boolean>;
}

export interface AppSettings {
  theme: Theme;
  currentMileage: number;
  lastOilChangeMileage: number;
  lastFilterChangeMileage: number;
  oilChangeInterval: number;
  filterChangeInterval: number;
  chainInterval: number;
  lastChainCheckMileage: number;
  bikeName: string;
  bikeYear: string;
  bikeColor: string;
  anthropicApiKey?: string;
  tires?: { dianteiro?: TireEntry; traseiro?: TireEntry };
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'user';
  displayName: string;
  bikeName: string;
  bikeYear: string;
  bikeColor: string;
  createdAt: string;
}

export interface Session {
  userId: string;
  role: 'admin' | 'user';
  expiresAt: string;
}
