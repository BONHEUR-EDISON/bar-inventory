import { useEffect, useState } from "react";

export function useDarkMode() {
  // État typé en boolean
  const [dark, setDark] = useState<boolean>(() => {
    // Vérifie si localStorage existe (ex: SSR sécurité)
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark";
    }
    return false; // valeur par défaut
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return { dark, setDark };
}