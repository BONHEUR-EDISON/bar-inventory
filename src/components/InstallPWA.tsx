import { useEffect, useState } from "react"

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }

    window.addEventListener("beforeinstallprompt", handler)

    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const installApp = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice

    if (choice.outcome === "accepted") {
      console.log("✅ App installée")
    } else {
      console.log("❌ Installation refusée")
    }

    setDeferredPrompt(null)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl p-4 flex items-center justify-between">
        
        <div>
          <p className="text-white font-semibold">Installer l’application</p>
          <p className="text-sm text-gray-400">
            Accès rapide + mode hors ligne 🚀
          </p>
        </div>

        <button
          onClick={installApp}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition"
        >
          Installer
        </button>
      </div>
    </div>
  )
}