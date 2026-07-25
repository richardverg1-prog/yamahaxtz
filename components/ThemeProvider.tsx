'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '@/lib/storage';
import type { Theme } from '@/lib/types';

interface Ctx { theme: Theme; setTheme: (t: Theme) => void; }
const ThemeCtx = createContext<Ctx>({ theme: 'dark', setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    const t = storage.getSettings().theme;
    apply(t);
    setThemeState(t);
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    apply(t);
    storage.patchSettings({ theme: t });
  }

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

function apply(t: Theme) { document.documentElement.dataset.theme = t; }
export const useTheme = () => useContext(ThemeCtx);
