import { useEffect, useState } from "react"

export default function UpdatePWA() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const show = () => setVisible(true)
    window.addEventListener("pwa-update-available", show)

    return () => window.removeEventListener("pwa-update-available", show)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50">
      <div className="bg-indigo-600 text-white p-4 rounded-xl flex justify-between items-center shadow-xl">
        <span>Nouvelle version disponible 🚀</span>
        <button
          onClick={() => (window as any).updatePWA()}
          className="bg-white text-indigo-600 px-3 py-1 rounded-lg"
        >
          Mettre à jour
        </button>
      </div>
    </div>
  )
}