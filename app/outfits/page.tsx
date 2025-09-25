'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface ClosetItem {
  id: string
  image_url: string
  category: string
  subcategory: string
  color: string
  silhouette: string
  season: string
}

interface Outfit {
  id: string
  items: ClosetItem[]
  occasion: string
  score: number
  saved: boolean
  worn: boolean
  metadata: any
}

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)
      await loadOutfits(user.id)
    }
    getUser()
  }, [router])

  const loadOutfits = async (userId: string) => {
    try {
      // Get user's closet items
      const { data: closetItems, error } = await supabase
        .from('closet_items')
        .select('*')
        .eq('user_id', userId)

      if (error) {
        console.error('Error loading closet items:', error)
        return
      }

      if (!closetItems || closetItems.length < 3) {
        router.push('/closet')
        return
      }

      // Generate outfits
      const generatedOutfits = generateOutfits(closetItems)
      setOutfits(generatedOutfits)

      // Save outfits to database
      await saveOutfits(userId, generatedOutfits)

      // Log event
      await supabase
        .from('events')
        .insert({
          user_id: userId,
          type: 'generate_outfits',
          metadata: { 
            total_outfits: generatedOutfits.length,
            total_items: closetItems.length
          }
        })

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateOutfits = (items: ClosetItem[]): Outfit[] => {
    const outfits: Outfit[] = []
    
    // Group items by category
    const tops = items.filter(item => item.category === 'top')
    const bottoms = items.filter(item => item.category === 'bottom')
    const dresses = items.filter(item => item.category === 'dress')
    const outerwear = items.filter(item => item.category === 'outerwear')
    const shoes = items.filter(item => item.category === 'shoes')
    const bags = items.filter(item => item.category === 'bag')

    // Generate outfit combinations
    let outfitCount = 0

    // Dress outfits (if available)
    for (const dress of dresses) {
      if (outfitCount >= 10) break
      
      const shoe = shoes.find(s => s.color === dress.color || isColorCompatible(s.color, dress.color)) || shoes[0]
      const bag = bags.find(b => b.color === dress.color || isColorCompatible(b.color, dress.color)) || bags[0]
      const jacket = outerwear.find(o => isColorCompatible(o.color, dress.color))

      const outfitItems = [dress, shoe].filter(Boolean)
      if (bag) outfitItems.push(bag)
      if (jacket) outfitItems.push(jacket)

      if (outfitItems.length >= 2) {
        outfits.push({
          id: `outfit-${outfitCount}`,
          items: outfitItems,
          occasion: 'evening',
          score: calculateOutfitScore(outfitItems),
          saved: false,
          worn: false,
          metadata: { type: 'dress', colors: outfitItems.map(i => i.color) }
        })
        outfitCount++
      }
    }

    // Top + Bottom combinations
    for (const top of tops) {
      for (const bottom of bottoms) {
        if (outfitCount >= 10) break
        
        // Check color compatibility
        if (!isColorCompatible(top.color, bottom.color)) continue
        
        const shoe = shoes.find(s => 
          s.color === top.color || 
          s.color === bottom.color || 
          isColorCompatible(s.color, top.color)
        ) || shoes[0]
        
        const bag = bags.find(b => 
          b.color === top.color || 
          b.color === bottom.color || 
          isColorCompatible(b.color, top.color)
        ) || bags[0]
        
        const jacket = outerwear.find(o => 
          isColorCompatible(o.color, top.color) && 
          isColorCompatible(o.color, bottom.color)
        )

        const outfitItems = [top, bottom, shoe].filter(Boolean)
        if (bag) outfitItems.push(bag)
        if (jacket) outfitItems.push(jacket)

        if (outfitItems.length >= 3) {
          const occasion = determineOccasion(outfitItems)
          outfits.push({
            id: `outfit-${outfitCount}`,
            items: outfitItems,
            occasion,
            score: calculateOutfitScore(outfitItems),
            saved: false,
            worn: false,
            metadata: { type: 'separates', colors: outfitItems.map(i => i.color) }
          })
          outfitCount++
        }
      }
    }

    // Sort by score and return top 10
    return outfits
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }

  const isColorCompatible = (color1: string, color2: string): boolean => {
    const neutralColors = ['black', 'white', 'cream', 'camel', 'navy', 'grey']
    const warmColors = ['brown', 'red', 'yellow', 'orange']
    const coolColors = ['blue', 'denim-dark', 'denim-light', 'green']
    
    // Neutrals go with everything
    if (neutralColors.includes(color1) || neutralColors.includes(color2)) return true
    
    // Same color family
    if (color1 === color2) return true
    
    // Warm with warm, cool with cool
    if (warmColors.includes(color1) && warmColors.includes(color2)) return true
    if (coolColors.includes(color1) && coolColors.includes(color2)) return true
    
    // Some specific good combinations
    const goodCombos = [
      ['black', 'white'], ['black', 'red'], ['black', 'blue'],
      ['white', 'navy'], ['cream', 'brown'], ['navy', 'white']
    ]
    
    return goodCombos.some(combo => 
      (combo[0] === color1 && combo[1] === color2) ||
      (combo[0] === color2 && combo[1] === color1)
    )
  }

  const determineOccasion = (items: ClosetItem[]): string => {
    const hasBlazer = items.some(item => item.subcategory === 'blazer')
    const hasHeels = items.some(item => item.subcategory === 'heels')
    const hasSneakers = items.some(item => item.subcategory === 'sneakers')
    
    if (hasBlazer || hasHeels) return 'work'
    if (hasSneakers) return 'casual'
    return 'casual'
  }

  const calculateOutfitScore = (items: ClosetItem[]): number => {
    let score = 0
    
    // Base score for having essential pieces
    if (items.some(item => item.category === 'top')) score += 2
    if (items.some(item => item.category === 'bottom')) score += 2
    if (items.some(item => item.category === 'shoes')) score += 1
    
    // Bonus for accessories
    if (items.some(item => item.category === 'bag')) score += 1
    if (items.some(item => item.category === 'outerwear')) score += 1
    
    // Color harmony bonus
    const colors = items.map(item => item.color)
    const uniqueColors = [...new Set(colors)]
    if (uniqueColors.length <= 3) score += 2 // Good color coordination
    if (uniqueColors.length <= 2) score += 1 // Excellent color coordination
    
    return score
  }

  const saveOutfits = async (userId: string, outfits: Outfit[]) => {
    for (const outfit of outfits) {
      const { error } = await supabase
        .from('outfits')
        .insert({
          user_id: userId,
          item_ids: outfit.items.map(item => item.id),
          occasion: outfit.occasion,
          score: outfit.score,
          saved: outfit.saved,
          metadata: outfit.metadata
        })

      if (error) {
        console.error('Error saving outfit:', error)
      }
    }
  }

  const handleAction = async (outfitId: string, action: 'wear' | 'swap' | 'save') => {
    if (!user) return

    const outfit = outfits.find(o => o.id === outfitId)
    if (!outfit) return

    try {
      if (action === 'save') {
        setOutfits(prev => prev.map(o => 
          o.id === outfitId ? { ...o, saved: !o.saved } : o
        ))
        
        await supabase
          .from('events')
          .insert({
            user_id: user.id,
            type: 'save_look',
            entity_id: outfitId,
            metadata: { outfit_id: outfitId, action: 'toggle_save' }
          })
      } else if (action === 'wear') {
        setOutfits(prev => prev.map(o => 
          o.id === outfitId ? { ...o, worn: true } : o
        ))
        
        await supabase
          .from('events')
          .insert({
            user_id: user.id,
            type: 'wear',
            entity_id: outfitId,
            metadata: { outfit_id: outfitId, occasion: outfit.occasion }
          })
      } else if (action === 'swap') {
        // For now, just log the swap action
        await supabase
          .from('events')
          .insert({
            user_id: user.id,
            type: 'swap',
            entity_id: outfitId,
            metadata: { outfit_id: outfitId }
          })
        
        // TODO: Implement actual swap logic
        alert('Swap feature coming soon!')
      }
    } catch (error) {
      console.error('Error handling action:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-black">Generating your outfit looks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Your Daily Style Feed</h1>
          <p className="text-gray-600">
            {outfits.length} looks using your closet items
          </p>
        </div>

        {/* Outfits Grid */}
        <div className="space-y-6">
          {outfits.map((outfit, index) => (
            <div key={outfit.id} className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-black">
                    Look #{index + 1}
                  </h3>
                  <p className="text-sm text-gray-600 capitalize">
                    {outfit.occasion} • Score: {outfit.score}/10
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(outfit.id, 'save')}
                    className={`px-3 py-1 rounded text-sm ${
                      outfit.saved 
                        ? 'bg-blue-500 text-white' 
                        : 'border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {outfit.saved ? '✓ Saved' : 'Save'}
                  </button>
                  <button
                    onClick={() => handleAction(outfit.id, 'wear')}
                    disabled={outfit.worn}
                    className={`px-3 py-1 rounded text-sm ${
                      outfit.worn 
                        ? 'bg-green-500 text-white' 
                        : 'bg-black text-white hover:bg-gray-800'
                    }`}
                  >
                    {outfit.worn ? '✓ Worn' : 'Wear'}
                  </button>
                  <button
                    onClick={() => handleAction(outfit.id, 'swap')}
                    className="px-3 py-1 rounded text-sm border border-gray-300 hover:bg-gray-100"
                  >
                    Swap
                  </button>
                </div>
              </div>

              {/* Outfit Items */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {outfit.items.map((item) => (
                  <div key={item.id} className="text-center">
                    <img
                      src={item.image_url}
                      alt={item.category}
                      className="w-full h-20 object-cover rounded mb-2"
                    />
                    <p className="text-xs text-black font-medium capitalize">{item.category}</p>
                    <p className="text-xs text-gray-600">{item.color}</p>
                  </div>
                ))}
              </div>

              {/* Outfit Description */}
              <div className="mt-4 p-3 bg-white rounded border-l-4 border-blue-500">
                <p className="text-sm text-gray-700">
                  {outfit.metadata.type === 'dress' 
                    ? `Perfect ${outfit.occasion} look with your ${outfit.items[0]?.color} dress`
                    : `Stylish ${outfit.occasion} combination with ${outfit.metadata.colors.join(' and ')} colors`
                  }
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Back to Capsule Button */}
        <div className="text-center mt-8">
          <button
            onClick={() => router.push('/capsule')}
            className="bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Back to Capsule
          </button>
        </div>
      </div>
    </div>
  )
}
