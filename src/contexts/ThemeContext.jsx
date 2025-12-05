import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Default to dark theme and remove toggle functionality
  const [isDark, setIsDark] = useState(true); 

  useEffect(() => {
    // Always apply dark theme
    localStorage.setItem('neomart-theme', 'dark');
    const root = document.documentElement;
    const body = document.body;

    root.classList.add('dark');
    body.classList.add('dark');
    body.classList.remove('light-theme'); 
    body.classList.add('dark-theme');

    root.style.setProperty('--background-hsl', '222.2 84% 4.9%'); 
    root.style.setProperty('--foreground-hsl', '210 40% 98%'); 
    root.style.setProperty('--themed-foreground', 'hsl(var(--foreground-hsl))');

    root.style.setProperty('--card-hsl', '222.2 84% 4.9%');
    root.style.setProperty('--card-foreground-hsl', '210 40% 98%');
    root.style.setProperty('--popover-hsl', '222.2 84% 4.9%');
    root.style.setProperty('--popover-foreground-hsl', '210 40% 98%');
    root.style.setProperty('--primary-hsl', '262.1 83.3% 57.8%');
    root.style.setProperty('--primary-foreground-hsl', '210 40% 98%');
    root.style.setProperty('--secondary-hsl', '217.2 32.6% 17.5%');
    root.style.setProperty('--secondary-foreground-hsl', '210 40% 98%');
    root.style.setProperty('--muted-hsl', '217.2 32.6% 17.5%');
    root.style.setProperty('--muted-foreground-hsl', '215 20.2% 65.1%');
    root.style.setProperty('--accent-hsl', '217.2 32.6% 17.5%');
    root.style.setProperty('--accent-foreground-hsl', '210 40% 98%');
    root.style.setProperty('--destructive-hsl', '0 62.8% 30.6%');
    root.style.setProperty('--destructive-foreground-hsl', '210 40% 98%');
    root.style.setProperty('--border-hsl', '217.2 32.6% 17.5%');
    root.style.setProperty('--input-hsl', '217.2 32.6% 17.5%');
    root.style.setProperty('--ring-hsl', '262.1 83.3% 57.8%');
    
  }, []); // Empty dependency array means this runs once on mount

  const value = {
    isDark,
    // toggleTheme function is removed
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};