'use client'

import { useState, useCallback, useEffect } from 'react'
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
  status: 'uploading' | 'tagging' | 'confirmed' | 'error'
}

export default function ClosetPage() {
  const [items, setItems] = useState<ClosetItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
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
    }
    getUser()
  }, [router])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (!user) return

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    )

    if (files.length === 0) return

    setUploading(true)

    for (const file of files.slice(0, 15 - items.length)) { // Max 15 items
      const tempId = `temp-${Date.now()}-${Math.random()}`
      
      // Add item to state immediately
      const newItem: ClosetItem = {
        id: tempId,
        image_url: URL.createObjectURL(file),
        category: '',
        subcategory: '',
        color: '',
        silhouette: '',
        season: 'all-season',
        status: 'uploading'
      }
      
      setItems(prev => [...prev, newItem])

      try {
        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('closet-images')
          .upload(fileName, file)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          setItems(prev => prev.map(item => 
            item.id === tempId 
              ? { ...item, status: 'error' }
              : item
          ))
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('closet-images')
          .getPublicUrl(fileName)

        // Update item with real URL and move to tagging
        setItems(prev => prev.map(item => 
          item.id === tempId 
            ? { 
                ...item, 
                image_url: publicUrl,
                status: 'tagging'
              }
            : item
        ))

      } catch (error) {
        console.error('Error uploading file:', error)
        setItems(prev => prev.map(item => 
          item.id === tempId 
            ? { ...item, status: 'error' }
            : item
        ))
      }
    }

    setUploading(false)
  }, [user, items.length])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return

    const files = Array.from(e.target.files).filter(file => 
      file.type.startsWith('image/')
    )

    if (files.length === 0) return

    setUploading(true)

    for (const file of files.slice(0, 15 - items.length)) { // Max 15 items
      const tempId = `temp-${Date.now()}-${Math.random()}`
      
      // Add item to state immediately
      const newItem: ClosetItem = {
        id: tempId,
        image_url: URL.createObjectURL(file),
        category: '',
        subcategory: '',
        color: '',
        silhouette: '',
        season: 'all-season',
        status: 'uploading'
      }
      
      setItems(prev => [...prev, newItem])

      try {
        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('closet-images')
          .upload(fileName, file)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          setItems(prev => prev.map(item => 
            item.id === tempId 
              ? { ...item, status: 'error' }
              : item
          ))
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('closet-images')
          .getPublicUrl(fileName)

        // Update item with real URL and move to tagging
        setItems(prev => prev.map(item => 
          item.id === tempId 
            ? { 
                ...item, 
                image_url: publicUrl,
                status: 'tagging'
              }
            : item
        ))

      } catch (error) {
        console.error('Error uploading file:', error)
        setItems(prev => prev.map(item => 
          item.id === tempId 
            ? { ...item, status: 'error' }
            : item
        ))
      }
    }

    setUploading(false)
    
    // Clear the input
    e.target.value = ''
  }, [user, items.length])

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const confirmedItems = items.filter(item => item.status === 'confirmed').length
  const canProceed = confirmedItems >= 8

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
              Upload Your Closet
            </h1>
            <p className="text-gray-600 text-lg">
              Add 8-15 items from your wardrobe ({confirmedItems}/15 confirmed)
            </p>
          </div>
        </div>
          {!canProceed && (
            <p className="text-sm text-orange-600 mt-2 text-center">
              You need at least 8 items to continue
            </p>
          )}

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 bg-white/80 backdrop-blur-sm shadow-lg ${
            dragActive 
              ? 'border-emerald-500 bg-emerald-50/80 transform scale-105' 
              : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={items.length >= 15 || uploading}
          />
          
          <label
            htmlFor="file-upload"
            className="cursor-pointer"
          >
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">
              {uploading ? 'Uploading...' : 'Drag & drop photos here'}
            </h3>
            <p className="text-gray-600 mb-6 text-lg">
              or click to browse files
            </p>
            <button
              type="button"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              disabled={items.length >= 15 || uploading}
            >
              Choose Files
            </button>
          </label>
          
          <p className="text-sm text-gray-500 mt-4">
            Max 15 items • JPG, PNG, WebP supported
          </p>
        </div>

        {/* Items Grid */}
        {items.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-black mb-4">Your Items</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item) => (
                <ClosetItemCard
                  key={item.id}
                  item={item}
                  onRemove={() => removeItem(item.id)}
                  onUpdate={(updates) => setItems(prev => 
                    prev.map(i => i.id === item.id ? { ...i, ...updates } : i)
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {/* Continue Button */}
        {canProceed && (
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/capsule')}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-4 px-10 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Generate My Capsule ({confirmedItems} items)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Closet Item Card Component
function ClosetItemCard({ 
  item, 
  onRemove, 
  onUpdate 
}: { 
  item: ClosetItem
  onRemove: () => void
  onUpdate: (updates: Partial<ClosetItem>) => void
}) {
  const [showTagging, setShowTagging] = useState(false)

  const categories = [
    { value: 'top', label: 'Top', subcategories: ['tee', 'blouse', 'sweater', 'tank', 'polo'] },
    { value: 'bottom', label: 'Bottom', subcategories: ['jeans', 'trousers', 'shorts', 'skirt'] },
    { value: 'dress', label: 'Dress', subcategories: ['midi', 'mini', 'maxi', 'shirt-dress'] },
    { value: 'outerwear', label: 'Outerwear', subcategories: ['blazer', 'jacket', 'coat', 'vest'] },
    { value: 'shoes', label: 'Shoes', subcategories: ['sneakers', 'loafers', 'boots', 'heels', 'flats'] },
    { value: 'bag', label: 'Bag', subcategories: ['tote', 'crossbody', 'clutch', 'backpack'] },
    { value: 'accessory', label: 'Accessory', subcategories: ['belt', 'scarf', 'hat', 'jewelry'] }
  ]

  const colors = [
    'black', 'white', 'cream', 'camel', 'navy', 'grey', 'blue', 
    'denim-dark', 'denim-light', 'olive', 'blush', 'brown', 'red', 'green'
  ]

  const silhouettes = [
    'fitted', 'straight', 'relaxed', 'oversized', 'wide-leg', 'tapered', 'A-line'
  ]

  const handleConfirm = async () => {
    if (!item.category || !item.color || !item.silhouette) return

    try {
      // Save to database
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('closet_items')
        .insert({
          user_id: user.id,
          image_url: item.image_url,
          category: item.category,
          subcategory: item.subcategory,
          color: item.color,
          silhouette: item.silhouette,
          season: item.season
        })

      if (error) {
        console.error('Error saving item:', error)
        return
      }

      onUpdate({ status: 'confirmed' })
      setShowTagging(false)

      // Log event
      await supabase
        .from('events')
        .insert({
          user_id: user.id,
          type: 'confirm_tag',
          metadata: {
            category: item.category,
            color: item.color,
            silhouette: item.silhouette
          }
        })

    } catch (error) {
      console.error('Error:', error)
    }
  }

  const currentCategory = categories.find(c => c.value === item.category)

  return (
    <div className="relative bg-gray-50 rounded-lg overflow-hidden">
      <img
        src={item.image_url}
        alt="Closet item"
        className="w-full h-32 object-cover"
      />
      
      <div className="p-3">
        {item.status === 'uploading' && (
          <div className="text-center">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Uploading...</p>
          </div>
        )}
        
        {item.status === 'error' && (
          <div className="text-center">
            <p className="text-sm text-red-600 mb-2">Upload failed</p>
            <button
              onClick={onRemove}
              className="text-xs text-gray-500 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        )}
        
        {item.status === 'tagging' && (
          <div className="text-center">
            <p className="text-sm text-blue-600 mb-2">Ready to tag</p>
            <button
              onClick={() => setShowTagging(true)}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
            >
              Tag Item
            </button>
          </div>
        )}
        
        {item.status === 'confirmed' && (
          <div className="text-center">
            <p className="text-sm text-green-600 mb-1">✓ Confirmed</p>
            <p className="text-xs text-gray-600">
              {item.category} • {item.color}
            </p>
          </div>
        )}
      </div>

      {/* Tagging Modal */}
      {showTagging && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-black mb-4">Tag This Item</h3>
            
            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">Category</label>
                <select
                  value={item.category}
                  onChange={(e) => onUpdate({ category: e.target.value, subcategory: '' })}
                  className="w-full p-2 border border-gray-300 rounded text-black"
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Subcategory */}
              {currentCategory && (
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Subcategory</label>
                  <select
                    value={item.subcategory}
                    onChange={(e) => onUpdate({ subcategory: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-black"
                  >
                    <option value="">Select subcategory</option>
                    {currentCategory.subcategories.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">Color</label>
                <div className="grid grid-cols-4 gap-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => onUpdate({ color })}
                      className={`p-2 text-xs rounded border text-black ${
                        item.color === color 
                          ? 'border-blue-500 bg-blue-500 text-white' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Silhouette */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">Silhouette</label>
                <div className="grid grid-cols-2 gap-2">
                  {silhouettes.map(silhouette => (
                    <button
                      key={silhouette}
                      onClick={() => onUpdate({ silhouette })}
                      className={`p-2 text-xs rounded border text-black ${
                        item.silhouette === silhouette 
                          ? 'border-blue-500 bg-blue-500 text-white' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {silhouette}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowTagging(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-black"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!item.category || !item.color || !item.silhouette}
                className="flex-1 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:bg-gray-300"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
      >
        ×
      </button>
    </div>
  )
}
