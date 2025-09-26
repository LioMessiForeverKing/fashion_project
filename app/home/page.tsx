'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
      
      if (!user) {
        router.push('/')
        return
      }

      // Check if user has completed onboarding
      const { data: userProfile } = await supabase
        .from('users')
        .select('budget_band, vibes')
        .eq('id', user.id)
        .single()

      if (!userProfile?.budget_band || !userProfile?.vibes?.length) {
        router.push('/onboarding')
        return
      }

      // If user has completed onboarding, redirect to closet (main app)
      router.push('/closet')
      return
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          router.push('/')
        } else {
          setUser(session.user)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to home page
  }

  // This page should redirect users, so show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="text-black">Redirecting...</div>
      </div>
    </div>
  );
}
