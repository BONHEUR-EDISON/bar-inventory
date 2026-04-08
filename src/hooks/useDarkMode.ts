// src/hooks/useDarkMode.ts
import { useState, useEffect } from "react";

const DARK_KEY = "bar-inventory-dark-mode";

export function useDarkMode() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // Lire la préférence depuis localStorage
    const stored = localStorage.getItem(DARK_KEY);
    if (stored !== null) {
      setDark(stored === "true");
    } else {
      // Sinon détecter préférences système
      setDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  useEffect(() => {
    // Mettre à jour localStorage et <html> classe
    localStorage.setItem(DARK_KEY, dark.toString());
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  return { dark, setDark };
}