'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    sizes: {
      top: '',
      bottom: '',
      shoe: ''
    },
    budget_band: '',
    vibes: [] as string[],
    climate: 'temperate',
    brands: [] as string[]
  })

  const router = useRouter()

  const vibeOptions = [
    'minimal', 'tailored', 'street-lite', 'romantic', 'edgy', 'classic', 'bohemian', 'preppy'
  ]

  const brandOptions = [
    'Zara', 'H&M', 'Uniqlo', 'Everlane', 'COS', 'Arket', 'Massimo Dutti', 
    'Mango', 'Banana Republic', 'J.Crew', 'Madewell', 'Reformation', 
    '& Other Stories', 'Ganni', 'Staud', 'Other'
  ]

  const handleVibeToggle = (vibe: string) => {
    setFormData(prev => ({
      ...prev,
      vibes: prev.vibes.includes(vibe) 
        ? prev.vibes.filter(v => v !== vibe)
        : [...prev.vibes, vibe]
    }))
  }

  const handleBrandToggle = (brand: string) => {
    setFormData(prev => ({
      ...prev,
      brands: prev.brands.includes(brand)
        ? prev.brands.filter(b => b !== brand)
        : [...prev.brands, brand]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const { data, error } = await supabase
        .from('users')
        .update({
          sizes: formData.sizes,
          budget_band: formData.budget_band,
          vibes: formData.vibes,
          climate: formData.climate,
          brands: formData.brands
        })
        .eq('id', user.id)
        .select()

      if (error) {
        console.error('Error updating user:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return
      }

      console.log('User updated successfully:', data)

      // Log onboarding completion event
      await supabase
        .from('events')
        .insert({
          user_id: user.id,
          type: 'complete_onboarding',
          metadata: { 
            budget_band: formData.budget_band,
            vibes: formData.vibes,
            climate: formData.climate
          }
        })

      router.push('/closet')
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Welcome to Your Fashion Journey
            </h1>
            <p className="text-gray-600 text-lg">Let's get to know your style preferences</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Sizes Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></span>
              Your Sizes
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Top</label>
                <input
                  type="text"
                  placeholder="M, L, etc."
                  value={formData.sizes.top}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    sizes: { ...prev.sizes, top: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bottom</label>
                <input
                  type="text"
                  placeholder="30, 32, etc."
                  value={formData.sizes.bottom}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    sizes: { ...prev.sizes, bottom: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shoe</label>
                <input
                  type="text"
                  placeholder="8, 9, etc."
                  value={formData.sizes.shoe}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    sizes: { ...prev.sizes, shoe: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Budget Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></span>
              Budget Range
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {['low', 'mid', 'high'].map((budget) => (
                <button
                  key={budget}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, budget_band: budget }))}
                  className={`py-3 px-4 rounded-lg border-2 transition-colors ${
                    formData.budget_band === budget
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-300 hover:border-gray-400 text-black'
                  }`}
                >
                  <div className="font-medium capitalize">{budget}</div>
                  <div className={`text-sm ${
                    formData.budget_band === budget ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {budget === 'low' && '< $50'}
                    {budget === 'mid' && '$50 - $150'}
                    {budget === 'high' && '> $150'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Vibes Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"></span>
              Style Vibes (select 2-3)
            </h2>
            <div className="flex flex-wrap gap-2">
              {vibeOptions.map((vibe) => (
                <button
                  key={vibe}
                  type="button"
                  onClick={() => handleVibeToggle(vibe)}
                  className={`px-4 py-2 rounded-full border transition-colors ${
                    formData.vibes.includes(vibe)
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-300 hover:border-gray-400 text-black'
                  }`}
                >
                  {vibe}
                </button>
              ))}
            </div>
          </div>

          {/* Climate Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></span>
              Climate
            </h2>
            <select
              value={formData.climate}
              onChange={(e) => setFormData(prev => ({ ...prev, climate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            >
              <option value="temperate">Temperate</option>
              <option value="warm">Warm</option>
              <option value="cool">Cool</option>
            </select>
          </div>

          {/* Brands Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"></span>
              Favorite Brands (optional)
            </h2>
            <div className="flex flex-wrap gap-2">
              {brandOptions.map((brand) => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => handleBrandToggle(brand)}
                  className={`px-3 py-1 rounded-full border text-sm transition-colors ${
                    formData.brands.includes(brand)
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-300 hover:border-gray-400 text-black'
                  }`}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !formData.budget_band || formData.vibes.length === 0}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none"
            >
              {loading ? 'Saving...' : 'Continue to Closet Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
