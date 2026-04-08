import { useEffect, useState } from "react"
import { Download } from "lucide-react"

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [visible, setVisible] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Détection iOS
    const ua = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(ua)
    const standalone = (window.navigator as any).standalone === true

    setIsIOS(ios)
    setIsInstalled(standalone)

    // Android / Chrome
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }

    window.addEventListener("beforeinstallprompt", handler)

    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  useEffect(() => {
    // iOS fallback (pas de beforeinstallprompt)
    if (isIOS && !isInstalled) {
      setVisible(true)
    }
  }, [isIOS, isInstalled])

  const installApp = async () => {
    // Android
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice

      if (choice.outcome === "accepted") {
        console.log("✅ App installée")
      }

      setDeferredPrompt(null)
      setVisible(false)
    } else {
      // iOS → afficher tooltip
      setShowTooltip(true)

      // auto hide
      setTimeout(() => setShowTooltip(false), 4000)
    }
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
        {isIOS ? "Partager → Ajouter à l’écran" : "Installer l’app"}
      </div>

      {/* Bouton */}
      <button
        onClick={installApp}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="
          w-14 h-14
          flex items-center justify-center
          rounded-full
          bg-indigo-600 hover:bg-indigo-700
          text-white
          shadow-xl
          transition-all duration-300
          hover:scale-110
          active:scale-95
        "
      >
        <Download size={22} />
      </button>
    </div>
  )
}