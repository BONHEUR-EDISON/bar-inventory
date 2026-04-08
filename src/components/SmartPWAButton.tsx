import { useEffect, useState } from "react"
import { Download, RefreshCw } from "lucide-react"
import toast from "react-hot-toast"

// Déclaration propre pour l'événement beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
  prompt(): Promise<void>
}

// Déclaration globale pour window.updatePWA
declare global {
  interface Window {
    updatePWA?: () => Promise<void>
  }
}

export default function SmartPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updating, setUpdating] = useState(false)

  // Détection iOS + installation / update events
  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(ua)
    const standalone = (window.navigator as any).standalone === true

    setIsIOS(ios)
    setIsInstalled(standalone)

    const installHandler = (e: Event) => {
      const evt = e as BeforeInstallPromptEvent
      e.preventDefault()
      setDeferredPrompt(evt)
      setVisible(true)
    }

    const updateHandler = () => {
      setUpdateAvailable(true)
      setVisible(true)

      // Auto update silencieux après 3s
      setTimeout(() => autoUpdate(), 3000)
    }

    window.addEventListener("beforeinstallprompt", installHandler)
    window.addEventListener("pwa-update-available", updateHandler)

    return () => {
      window.removeEventListener("beforeinstallprompt", installHandler)
      window.removeEventListener("pwa-update-available", updateHandler)
    }
  }, [])

  // iOS fallback
  useEffect(() => {
    if (isIOS && !isInstalled) setVisible(true)
  }, [isIOS, isInstalled])

  // Auto update
  const autoUpdate = async (): Promise<void> => {
    if (!window.updatePWA) return

    setUpdating(true)

    try {
      await window.updatePWA()
      toast.success("App mise à jour 🚀")
      setUpdateAvailable(false)
      setVisible(false)
    } catch {
      toast.error("Erreur lors de la mise à jour")
    } finally {
      setUpdating(false)
    }
  }

  const handleClick = async (): Promise<void> => {
    // Priorité update
    if (updateAvailable) {
      await autoUpdate()
      return
    }

    // Install Android
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice

      if (choice.outcome === "accepted") {
        toast.success("App installée 🎉")
        setVisible(false)
      } else {
        toast("Installation annulée")
      }

      setDeferredPrompt(null)
      return
    }

    // iOS fallback
    setShowTooltip(true)
    setTimeout(() => setShowTooltip(false), 4000)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-5 left-5 z-50">
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
        {updateAvailable
          ? "Mise à jour disponible"
          : isIOS
          ? "Partager → Ajouter à l’écran"
          : "Installer l’app"}
      </div>

      {/* Bouton */}
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          relative
          w-14 h-14
          flex items-center justify-center
          rounded-full
          text-white
          shadow-xl
          transition-all duration-300
          hover:scale-110 active:scale-95
          ${updateAvailable ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"}
        `}
      >
        {/* Badge rouge */}
        {updateAvailable && !updating && (
          <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
        )}

        {/* Pulse */}
        {updateAvailable && !updating && (
          <span className="absolute w-full h-full rounded-full bg-emerald-400 opacity-30 animate-ping"></span>
        )}

        {/* Icône */}
        {updateAvailable ? (
          <RefreshCw
            size={22}
            className={`relative z-10 ${updating ? "animate-spin" : ""}`}
          />
        ) : (
          <Download size={22} className="relative z-10" />
        )}
      </button>
    </div>
  )
}