/**
 * API Route: Promise Extraction
 * POST /api/promises/extract
 *
 * Extracts promises from text and stores them in database
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { promiseClassifier } from '@/lib/promise-extraction/promise-classifier'

interface ExtractRequest {
  politicianId: string
  text: string
  sourceUrl: string
  sourceType: 'campaign_site' | 'interview' | 'social_media' | 'debate' | 'vigie_du_mensonge'
  date?: string
}

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify user is admin
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || !['admin', 'moderator'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin role required.' },
        { status: 403 }
      )
    }

    // Parse request body
    const body: ExtractRequest = await request.json()
    const { politicianId, text, sourceUrl, sourceType, date } = body

    if (!politicianId || !text || !sourceUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: politicianId, text, sourceUrl' },
        { status: 400 }
      )
    }

    // Extract promises from text
    const promises = promiseClassifier.extractPromises(text, sourceUrl)

    console.log(
      `Extracted ${promises.length} promises from ${sourceUrl}`
    )

    // Store promises in database
    const storedPromises = []

    for (const promise of promises) {
      try {
        const { data, error } = await supabase
          .from('political_promises')
          .insert({
            politician_id: politicianId,
            promise_text: promise.text,
            promise_date: date || new Date().toISOString(),
            category: promise.category,
            source_url: sourceUrl,
            source_type: sourceType,
            extraction_method: 'ai_extracted',
            confidence_score: promise.confidence,
            verification_status: 'pending',
            is_actionable: promise.isActionable
          })
          .select()
          .single()

        if (error) {
          console.error('Error storing promise:', error)
          continue
        }

        storedPromises.push(data)
      } catch (error) {
        console.error('Error storing promise:', error)
      }
    }

    return NextResponse.json({
      success: true,
      extracted: promises.length,
      stored: storedPromises.length,
      promises: storedPromises,
      message: `Successfully extracted and stored ${storedPromises.length} promises`
    })
  } catch (error) {
    console.error('Promise extraction error:', error)

    return NextResponse.json(
      {
        error: 'Promise extraction failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to view extracted promises for a politician
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const politicianId = searchParams.get('politicianId')

    if (!politicianId) {
      return NextResponse.json(
        { error: 'Missing politicianId parameter' },
        { status: 400 }
      )
    }

    const { data: promises, error } = await supabase
      .from('political_promises')
      .select('*')
      .eq('politician_id', politicianId)
      .order('promise_date', { ascending: false })

    if (error) throw error

    // Group by verification status
    const summary = {
      total: promises?.length || 0,
      pending: promises?.filter(p => p.verification_status === 'pending').length || 0,
      verified: promises?.filter(p => p.verification_status === 'verified').length || 0,
      actionable: promises?.filter(p => p.is_actionable).length || 0
    }

    return NextResponse.json({
      success: true,
      summary,
      promises
    })
  } catch (error) {
    console.error('Error fetching promises:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch promises',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
