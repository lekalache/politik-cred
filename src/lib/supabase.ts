import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      politicians: {
        Row: {
          id: string
          name: string
          party: string | null
          position: string | null
          image_url: string | null
          bio: string | null
          credibility_score: number
          total_votes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          party?: string | null
          position?: string | null
          image_url?: string | null
          bio?: string | null
          credibility_score?: number
          total_votes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          party?: string | null
          position?: string | null
          image_url?: string | null
          bio?: string | null
          credibility_score?: number
          total_votes?: number
          created_at?: string
          updated_at?: string
        }
      }
      votes: {
        Row: {
          id: string
          politician_id: string
          user_id: string | null
          vote_type: 'positive' | 'negative'
          points: number
          evidence_title: string
          evidence_description: string
          evidence_url: string | null
          evidence_type: 'article' | 'video' | 'document' | 'other'
          status: 'pending' | 'approved' | 'rejected'
          moderated_by: string | null
          moderated_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          politician_id: string
          user_id?: string | null
          vote_type: 'positive' | 'negative'
          points: number
          evidence_title: string
          evidence_description: string
          evidence_url?: string | null
          evidence_type: 'article' | 'video' | 'document' | 'other'
          status?: 'pending' | 'approved' | 'rejected'
          moderated_by?: string | null
          moderated_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          politician_id?: string
          user_id?: string | null
          vote_type?: 'positive' | 'negative'
          points?: number
          evidence_title?: string
          evidence_description?: string
          evidence_url?: string | null
          evidence_type?: 'article' | 'video' | 'document' | 'other'
          status?: 'pending' | 'approved' | 'rejected'
          moderated_by?: string | null
          moderated_at?: string | null
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          role: 'user' | 'moderator' | 'admin'
          reputation_score: number
          created_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          role?: 'user' | 'moderator' | 'admin'
          reputation_score?: number
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          role?: 'user' | 'moderator' | 'admin'
          reputation_score?: number
          created_at?: string
        }
      }
    }
  }
}