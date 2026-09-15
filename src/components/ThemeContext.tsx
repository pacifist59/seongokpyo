import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ThemeValue = { theme: Theme; resolvedTheme: 'light' | 'dark'; setTheme: (theme: Theme) => void; toggleTheme: () => void };

const ThemeContext = createContext<ThemeValue | null>(null);

function systemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    const saved = localStorage.getItem('seongokpyo-theme');
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  });
  const [system, setSystem] = useState(systemTheme);
  const resolvedTheme = theme === 'system' ? system : theme;

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystem(media.matches ? 'dark' : 'light');
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    themeColor?.setAttribute('content', resolvedTheme === 'dark' ? '#101425' : '#151a32');
  }, [resolvedTheme]);

  const value = useMemo<ThemeValue>(() => ({
    theme,
    resolvedTheme,
    setTheme: (next) => {
      setThemeState(next);
      if (next === 'system') localStorage.removeItem('seongokpyo-theme');
      else localStorage.setItem('seongokpyo-theme', next);
    },
    toggleTheme: () => {
      const next = resolvedTheme === 'dark' ? 'light' : 'dark';
      setThemeState(next);
      localStorage.setItem('seongokpyo-theme', next);
    },
  }), [theme, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('ThemeProvider가 필요합니다.');
  return value;
}
