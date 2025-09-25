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

interface GapSpec {
  category: string
  color: string
  silhouette: string
  reason: string
}

export default function CapsulePage() {
  const [items, setItems] = useState<ClosetItem[]>([])
  const [gaps, setGaps] = useState<GapSpec[]>([])
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
      await loadCapsule(user.id)
    }
    getUser()
  }, [router])

  const loadCapsule = async (userId: string) => {
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

      if (!closetItems || closetItems.length < 8) {
        router.push('/closet')
        return
      }

      setItems(closetItems)

      // Generate capsule and gaps
      const { selectedItems, gapSpecs } = generateCapsule(closetItems)
      
      // Save capsule to database
      await saveCapsule(userId, selectedItems, gapSpecs)
      
      setItems(selectedItems)
      setGaps(gapSpecs)

      // Log event
      await supabase
        .from('events')
        .insert({
          user_id: userId,
          type: 'generate_capsule',
          metadata: { 
            total_items: closetItems.length,
            selected_items: selectedItems.length,
            gaps_count: gapSpecs.length
          }
        })

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateCapsule = (allItems: ClosetItem[]) => {
    // Include ALL confirmed items from your closet
    const selectedItems: ClosetItem[] = [...allItems]
    const gapSpecs: GapSpec[] = []
    
    // Count items by category
    const categoryCounts = allItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Suggest gaps based on what's missing or could be improved
    const categoryPriority = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory']
    
    for (const category of categoryPriority) {
      const count = categoryCounts[category] || 0
      
      // Suggest gaps if we don't have enough of a category
      if (count === 0) {
        gapSpecs.push({
          category,
          color: category === 'bottom' ? 'black' : 'neutral',
          silhouette: 'straight',
          reason: `A ${category === 'bottom' ? 'black trouser' : category} would unlock 5+ outfit combinations`
        })
      } else if (count === 1 && category !== 'accessory') {
        gapSpecs.push({
          category,
          color: category === 'bottom' ? 'blue' : 'neutral',
          silhouette: category === 'bottom' ? 'straight' : 'fitted',
          reason: `An additional ${category} would create more outfit variety`
        })
      }
    }

    // Add some strategic gaps for a complete wardrobe
    if (!categoryCounts.outerwear) {
      gapSpecs.push({
        category: 'outerwear',
        color: 'neutral',
        silhouette: 'fitted',
        reason: 'A neutral blazer would create 8+ professional looks'
      })
    }

    if (!categoryCounts.bag) {
      gapSpecs.push({
        category: 'bag',
        color: 'black',
        silhouette: 'medium',
        reason: 'A versatile bag would complete your daily looks'
      })
    }

    return { selectedItems, gapSpecs: gapSpecs.slice(0, 6) }
  }

  const saveCapsule = async (userId: string, selectedItems: ClosetItem[], gapSpecs: GapSpec[]) => {
    const { error } = await supabase
      .from('capsules')
      .upsert({
        user_id: userId,
        owned_item_ids: selectedItems.map(item => item.id),
        gap_specs: gapSpecs.map(gap => ({
          category: gap.category,
          color: gap.color,
          silhouette: gap.silhouette
        })),
        reasons: gapSpecs.reduce((acc, gap, index) => {
          acc[`gap_${index}`] = gap.reason
          return acc
        }, {} as Record<string, string>)
      })

    if (error) {
      console.error('Error saving capsule:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-black">Generating your capsule...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Your 20-Piece Capsule</h1>
          <p className="text-gray-600">
            {items.length} items from your closet + {gaps.length} strategic gaps
          </p>
        </div>

        {/* Your Items Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-black mb-6">Your Items ({items.length})</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map((item) => (
              <div key={item.id} className="bg-gray-50 rounded-lg overflow-hidden">
                <img
                  src={item.image_url}
                  alt={item.category}
                  className="w-full h-24 object-cover"
                />
                <div className="p-2">
                  <p className="text-xs text-black font-medium capitalize">{item.category}</p>
                  <p className="text-xs text-gray-600">{item.color}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gaps Section */}
        {gaps.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-black mb-6">Suggested Gaps ({gaps.length})</h2>
            <div className="space-y-4">
              {gaps.map((gap, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-black capitalize">
                        {gap.color} {gap.silhouette} {gap.category}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{gap.reason}</p>
                    </div>
                    <button className="ml-4 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
                      Find Options
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Continue Button */}
        <div className="text-center">
          <button
            onClick={() => router.push('/outfits')}
            className="bg-black hover:bg-gray-800 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Generate 10 Outfit Looks
          </button>
        </div>
      </div>
    </div>
  )
}
