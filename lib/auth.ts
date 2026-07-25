'use client';
import type { User, Session } from './types';

const USERS_KEY = 'xtz_auth_users';
const SESSION_KEY = 'xtz_auth_session';
const SESSION_DAYS = 5;

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, username: string): Promise<string> {
  return sha256(password + username + 'xtz_salt_2026');
}

export function getUsers(): User[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { return []; }
}

function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s: Session = JSON.parse(raw);
    if (new Date(s.expiresAt) < new Date()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch { return null; }
}

function setSession(userId: string, role: 'admin' | 'user'): Session {
  const exp = new Date();
  exp.setDate(exp.getDate() + SESSION_DAYS);
  const session: Session = { userId, role, expiresAt: exp.toISOString() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearSession(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(SESSION_KEY);
}

export async function login(username: string, password: string): Promise<Session | null> {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  if (!user) return null;
  const hash = await hashPassword(password, username);
  if (hash !== user.passwordHash) return null;
  return setSession(user.id, user.role);
}

export async function createUser(
  username: string,
  password: string,
  role: 'admin' | 'user',
  displayName: string,
  bikeName: string,
  bikeYear: string,
  bikeColor: string,
): Promise<User> {
  const users = getUsers();
  if (users.find(u => u.username === username)) throw new Error('Usuário já existe');
  const passwordHash = await hashPassword(password, username);
  const user: User = {
    id: username,
    username,
    passwordHash,
    role,
    displayName: displayName || username,
    bikeName: bikeName || 'XTZ 250X',
    bikeYear: bikeYear || '2008',
    bikeColor: bikeColor || 'Preta',
    createdAt: new Date().toISOString().slice(0, 10),
  };
  saveUsers([...users, user]);
  return user;
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) throw new Error('Usuário não encontrado');
  user.passwordHash = await hashPassword(newPassword, userId);
  saveUsers(users);
}

export function deleteUser(userId: string): void {
  const users = getUsers().filter(u => u.id !== userId);
  saveUsers(users);
  // Remove all their data
  if (typeof window !== 'undefined') {
    const prefix = `xtz_u_${userId}_`;
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k));
  }
}

export function isAdmin(): boolean {
  const s = getSession();
  return s?.role === 'admin';
}

export function getCurrentUser(): User | null {
  const s = getSession();
  if (!s) return null;
  return getUsers().find(u => u.id === s.userId) ?? null;
}

export async function initAdminIfNeeded(): Promise<void> {
  const users = getUsers();
  if (users.length === 0) {
    await createUser('richardverg1', 'xtz250admin!', 'admin', 'Richard', 'XTZ 250X', '2008', 'Preta');
  }
}
