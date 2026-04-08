import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"

export default function UpdatePWA() {
  const [visible, setVisible] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    const show = () => setVisible(true)

    window.addEventListener("pwa-update-available", show)

    return () => window.removeEventListener("pwa-update-available", show)
  }, [])

  const updateApp = () => {
    ;(window as any).updatePWA?.()
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-20 left-5 z-50">
      {/* Tooltip */}
      <div
        className={`
          absolute bottom-16 left-0
          px-3 py-2
          rounded-xl
          text-xs text-white
          bg-black/80 backdrop-blur-md
          shadow-lg
          transition-all duration-300
          ${showTooltip ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}
        `}
      >
        Mettre à jour l’app
      </div>

      {/* Bouton flottant */}
      <button
        onClick={updateApp}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="
          relative
          w-14 h-14
          flex items-center justify-center
          rounded-full
          bg-emerald-600 hover:bg-emerald-700
          text-white
          shadow-xl
          transition-all duration-300
          hover:scale-110
          active:scale-95
        "
      >
        {/* Pulse animation */}
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-30 animate-ping"></span>

        <RefreshCw size={22} className="relative z-10" />
      </button>
    </div>
  )
}