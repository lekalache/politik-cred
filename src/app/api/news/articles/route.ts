/**
 * Articles Retrieval API Route
 * Provides filtered access to collected news articles
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)

    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50) // Cap at 50
    const search = url.searchParams.get('search')
    const source = url.searchParams.get('source')
    const category = url.searchParams.get('category') || 'politics'
    const sortBy = url.searchParams.get('sortBy') || 'published_at'
    const sortOrder = url.searchParams.get('sortOrder') || 'desc'
    const minRelevance = parseInt(url.searchParams.get('minRelevance') || '30')

    // Calculate offset
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('articles')
      .select(`
        id,
        title,
        summary,
        url,
        source,
        author,
        published_at,
        image_url,
        keywords,
        sentiment,
        relevance_score,
        view_count,
        created_at
      `)
      .eq('category', category)
      .gte('relevance_score', minRelevance)

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%,keywords.cs.{${search}}`)
    }

    if (source) {
      query = query.eq('source', source)
    }

    // Apply sorting
    const ascending = sortOrder.toLowerCase() === 'asc'
    query = query.order(sortBy, { ascending })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: articles, error, count } = await query

    if (error) {
      console.error('Error fetching articles:', error)
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('category', category)
      .gte('relevance_score', minRelevance)

    // Calculate pagination info
    const totalPages = Math.ceil((totalCount || 0) / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1

    return NextResponse.json({
      success: true,
      articles: articles || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages,
        hasNext,
        hasPrev
      },
      filters: {
        search,
        source,
        category,
        minRelevance,
        sortBy,
        sortOrder
      }
    })

  } catch (error) {
    console.error('Error in articles API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Increment view count for an article
    const { articleId } = await request.json()

    if (!articleId) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      )
    }

    // First get the current view count, then increment it
    const { data: article, error: fetchError } = await supabase
      .from('articles')
      .select('view_count')
      .eq('id', articleId)
      .single()

    if (fetchError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('articles')
      .update({ view_count: (article.view_count || 0) + 1 })
      .eq('id', articleId)

    if (error) {
      console.error('Error updating view count:', error)
      return NextResponse.json(
        { error: 'Failed to update view count' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in articles POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}