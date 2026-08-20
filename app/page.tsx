"use client"

export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { useAppState } from '@/lib/app-state'
import { Navbar } from '@/components/navbar'
import { HomePage } from '@/components/home-page'
import { BuilderPage } from '@/components/builder-page'
import { PrebuiltPage } from '@/components/prebuilt-page'
import { ShopPage } from '@/components/shop-page'
import { DashboardPage } from '@/components/dashboard-page'
import { Notifications } from '@/components/notifications'
import { CheckoutReturnHandler } from '@/components/checkout-return-handler'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

function PageRouter() {
  const searchParams = useSearchParams()
  const { currentPage, setPage } = useAppState()

  useEffect(() => {
    const pageParam = searchParams.get('page')
    if (pageParam === 'dashboard' || pageParam === 'builder' || pageParam === 'prebuilt' || pageParam === 'shop' || pageParam === 'home') {
      setPage(pageParam)
    }
  }, [searchParams, setPage])

  return (
    <main>
      {currentPage === 'home' && <HomePage />}
      {currentPage === 'builder' && <BuilderPage />}
      {currentPage === 'prebuilt' && <PrebuiltPage />}
      {currentPage === 'shop' && <ShopPage />}
      {currentPage === 'dashboard' && <DashboardPage />}
    </main>
  )
}

export default function Page() {
  return (
    <>
      <Suspense>
        <CheckoutReturnHandler />
      </Suspense>
      <Navbar />
      <Suspense>
        <PageRouter />
      </Suspense>
      <Notifications />
    </>
  )
}
