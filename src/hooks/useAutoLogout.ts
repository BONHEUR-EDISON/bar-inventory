import { useEffect, useRef } from "react";
import { logout } from "../services/login"; // ton fichier logout

const INACTIVITY_TIME = 30 * 60 * 1000; // 30 minutes en ms

export function useAutoLogout() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset le timer
  const resetTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      logout(); // Déconnexion automatique
      window.location.reload(); // redirige vers login ou refresh
    }, INACTIVITY_TIME);
  };

  useEffect(() => {
    // Écoute toutes les interactions utilisateur
    const events = ["mousemove", "keydown", "mousedown", "scroll", "touchstart"];

    events.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer(); // démarre le timer dès le montage

    return () => {
      // nettoyage
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
}