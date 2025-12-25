'use client'

import { useState } from 'react'
import { X, KeyRound, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase' // On utilise le client static ici

interface PinManagementModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userName: string
  onSuccess: () => void
}

export default function PinManagementModal({ 
  isOpen, 
  onClose, 
  userId, 
  userName,
  onSuccess 
}: PinManagementModalProps) {
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // 1. Récupérer le token de session actuel
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Vous êtes déconnecté. Veuillez vous reconnecter.");
      }

      // 2. Appel API avec le token dans le header
      const response = await fetch('/api/users/set-pin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}` // <--- CLÉ DU FIX 401
        },
        body: JSON.stringify({ userId, pin }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue')
      }

      setSuccess(true)
      setPin('')
      setTimeout(() => {
        onSuccess()
        onClose()
        setSuccess(false)
      }, 1500)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <KeyRound className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Accès POS</h2>
              <p className="text-sm text-gray-500">Pour {userName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {success ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-2 text-green-600 animate-in fade-in">
              <CheckCircle className="w-12 h-12" />
              <span className="font-medium">PIN mis à jour avec succès !</span>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Nouveau Code PIN (4-6 chiffres)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 text-2xl tracking-[0.5em] text-center font-mono bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  placeholder="••••"
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || pin.length < 4}
                  className="w-full flex items-center justify-center py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enregistrer le PIN'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}