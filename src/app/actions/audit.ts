'use server'

import { headers } from 'next/headers'

export async function triggerAudit() {
    try {
        const headersList = await headers()
        const host = headersList.get('host') || 'localhost:3000'
        const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
        const baseUrl = `${protocol}://${host}`

        console.log('🔍 DEBUG: Triggering audit from Server Action...')
        console.log('🔍 DEBUG: CRON_SECRET_TOKEN available:', !!process.env.CRON_SECRET_TOKEN)
        console.log('🔍 DEBUG: CRON_SECRET_TOKEN length:', process.env.CRON_SECRET_TOKEN?.length || 0)
        console.log('🔍 DEBUG: Base URL:', baseUrl)

        // Call the daily-audit endpoint (or data-collection)
        // We use the daily-audit because it runs the full pipeline (collect -> match -> score)
        const response = await fetch(`${baseUrl}/api/cron/daily-audit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.CRON_SECRET_TOKEN}`
            },
            // We don't need a body for daily-audit as it orchestrates everything
            // But we recently updated it to expect bodies for internal calls.
            // Wait, daily-audit *orchestrates* calls. It doesn't need a body itself?
            // Let's check daily-audit/route.ts again.
            // It takes no body. It calls other endpoints WITH bodies.
            // So calling daily-audit is correct.
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Audit failed:', response.status, errorText)
            return { success: false, error: `Audit failed: ${response.statusText}` }
        }

        const result = await response.json()
        return { success: true, data: result }
    } catch (error) {
        console.error('Error triggering audit:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}
