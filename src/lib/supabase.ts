import { createClient } from '@supabase/supabase-js'

// Type definitions for JSON fields
export interface SocialMediaInfo {
  twitter?: string
  facebook?: string
  instagram?: string
  linkedin?: string
  youtube?: string
  tiktok?: string
  website?: string
}

export interface ContactInfo {
  email?: string
  phone?: string
  address?: string
  office_address?: string
  office_phone?: string
  website?: string
}

export interface PoliticianDetails {
  biography?: string
  education?: string[]
  career_highlights?: string[]
  current_positions?: string[]
  committee_memberships?: string[]
  voting_record_url?: string
  financial_disclosure_url?: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Use placeholder values during build time if environment variables are missing
const buildTimeUrl = supabaseUrl || 'https://placeholder.supabase.co'
const buildTimeKey = (supabaseAnonKey && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY_HERE')
  ? supabaseAnonKey
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDk0MDUyNDAsImV4cCI6MTk2NDk4MTI0MH0.placeholder'

export const supabase = createClient(buildTimeUrl, buildTimeKey)

// Runtime validation function
export const validateSupabaseConfig = () => {
  if (typeof window !== 'undefined') { // Only validate on client side
    if (!supabaseUrl) {
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
      return false
    }
    if (!supabaseAnonKey || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY_HERE') {
      console.error('Missing or invalid NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
      return false
    }
  }
  return true
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          role: 'user' | 'moderator' | 'admin'
          reputation_score: number
          contribution_score: number
          accuracy_rate: number
          total_votes_submitted: number
          approved_votes: number
          rejected_votes: number
          badges: string[]
          location: string | null
          political_preference: 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'prefer-not-say' | null
          verification_status: 'unverified' | 'email_verified' | 'phone_verified' | 'identity_verified'
          last_active: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          role?: 'user' | 'moderator' | 'admin'
          reputation_score?: number
          contribution_score?: number
          accuracy_rate?: number
          total_votes_submitted?: number
          approved_votes?: number
          rejected_votes?: number
          badges?: string[]
          location?: string | null
          political_preference?: 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'prefer-not-say' | null
          verification_status?: 'unverified' | 'email_verified' | 'phone_verified' | 'identity_verified'
          last_active?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          role?: 'user' | 'moderator' | 'admin'
          reputation_score?: number
          contribution_score?: number
          accuracy_rate?: number
          total_votes_submitted?: number
          approved_votes?: number
          rejected_votes?: number
          badges?: string[]
          location?: string | null
          political_preference?: 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'prefer-not-say' | null
          verification_status?: 'unverified' | 'email_verified' | 'phone_verified' | 'identity_verified'
          last_active?: string
          created_at?: string
          updated_at?: string
        }
      }
      politicians: {
        Row: {
          id: string
          name: string
          first_name: string | null
          last_name: string | null
          party: string | null
          position: string | null
          constituency: string | null
          image_url: string | null
          bio: string | null
          birth_date: string | null
          gender: 'male' | 'female' | 'other' | 'prefer-not-say' | null
          political_orientation: 'left' | 'center-left' | 'center' | 'center-right' | 'right' | null
          social_media: SocialMediaInfo | null
          contact_info: ContactInfo | null
          education: string | null
          career_history: string | null
          key_policies: string[]
          controversies: string[]
          achievements: string[]
          credibility_score: number
          total_votes: number
          positive_votes: number
          negative_votes: number
          trending_score: number
          last_updated_by: string | null
          is_active: boolean
          verification_status: 'pending' | 'verified' | 'disputed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          first_name?: string | null
          last_name?: string | null
          party?: string | null
          position?: string | null
          constituency?: string | null
          image_url?: string | null
          bio?: string | null
          birth_date?: string | null
          gender?: 'male' | 'female' | 'other' | 'prefer-not-say' | null
          political_orientation?: 'left' | 'center-left' | 'center' | 'center-right' | 'right' | null
          social_media?: SocialMediaInfo | null
          contact_info?: ContactInfo | null
          education?: string | null
          career_history?: string | null
          key_policies?: string[]
          controversies?: string[]
          achievements?: string[]
          credibility_score?: number
          total_votes?: number
          positive_votes?: number
          negative_votes?: number
          trending_score?: number
          last_updated_by?: string | null
          is_active?: boolean
          verification_status?: 'pending' | 'verified' | 'disputed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          first_name?: string | null
          last_name?: string | null
          party?: string | null
          position?: string | null
          constituency?: string | null
          image_url?: string | null
          bio?: string | null
          birth_date?: string | null
          gender?: 'male' | 'female' | 'other' | 'prefer-not-say' | null
          political_orientation?: 'left' | 'center-left' | 'center' | 'center-right' | 'right' | null
          social_media?: SocialMediaInfo | null
          contact_info?: ContactInfo | null
          education?: string | null
          career_history?: string | null
          key_policies?: string[]
          controversies?: string[]
          achievements?: string[]
          credibility_score?: number
          total_votes?: number
          positive_votes?: number
          negative_votes?: number
          trending_score?: number
          last_updated_by?: string | null
          is_active?: boolean
          verification_status?: 'pending' | 'verified' | 'disputed'
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
          category: 'integrity' | 'competence' | 'transparency' | 'consistency' | 'leadership' | 'other'
          evidence_title: string
          evidence_description: string
          evidence_url: string | null
          evidence_type: 'article' | 'video' | 'document' | 'social_media' | 'speech' | 'interview' | 'other'
          source_credibility: number
          fact_check_status: 'pending' | 'verified' | 'disputed' | 'false'
          ai_confidence_score: number
          community_rating: number
          status: 'pending' | 'approved' | 'rejected' | 'flagged'
          moderated_by: string | null
          moderated_at: string | null
          moderation_reason: string | null
          tags: string[]
          language: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          politician_id: string
          user_id?: string | null
          vote_type: 'positive' | 'negative'
          points: number
          category: 'integrity' | 'competence' | 'transparency' | 'consistency' | 'leadership' | 'other'
          evidence_title: string
          evidence_description: string
          evidence_url?: string | null
          evidence_type: 'article' | 'video' | 'document' | 'social_media' | 'speech' | 'interview' | 'other'
          source_credibility?: number
          fact_check_status?: 'pending' | 'verified' | 'disputed' | 'false'
          ai_confidence_score?: number
          community_rating?: number
          status?: 'pending' | 'approved' | 'rejected' | 'flagged'
          moderated_by?: string | null
          moderated_at?: string | null
          moderation_reason?: string | null
          tags?: string[]
          language?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          politician_id?: string
          user_id?: string | null
          vote_type?: 'positive' | 'negative'
          points?: number
          category?: 'integrity' | 'competence' | 'transparency' | 'consistency' | 'leadership' | 'other'
          evidence_title?: string
          evidence_description?: string
          evidence_url?: string | null
          evidence_type?: 'article' | 'video' | 'document' | 'social_media' | 'speech' | 'interview' | 'other'
          source_credibility?: number
          fact_check_status?: 'pending' | 'verified' | 'disputed' | 'false'
          ai_confidence_score?: number
          community_rating?: number
          status?: 'pending' | 'approved' | 'rejected' | 'flagged'
          moderated_by?: string | null
          moderated_at?: string | null
          moderation_reason?: string | null
          tags?: string[]
          language?: string
          created_at?: string
          updated_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          vote_id: string | null
          politician_id: string | null
          user_id: string | null
          parent_comment_id: string | null
          content: string
          upvotes: number
          downvotes: number
          is_flagged: boolean
          status: 'active' | 'hidden' | 'deleted'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vote_id?: string | null
          politician_id?: string | null
          user_id?: string | null
          parent_comment_id?: string | null
          content: string
          upvotes?: number
          downvotes?: number
          is_flagged?: boolean
          status?: 'active' | 'hidden' | 'deleted'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vote_id?: string | null
          politician_id?: string | null
          user_id?: string | null
          parent_comment_id?: string | null
          content?: string
          upvotes?: number
          downvotes?: number
          is_flagged?: boolean
          status?: 'active' | 'hidden' | 'deleted'
          created_at?: string
          updated_at?: string
        }
      }
      user_activities: {
        Row: {
          id: string
          user_id: string
          activity_type: 'vote_submitted' | 'comment_posted' | 'vote_moderated' | 'profile_updated' | 'login'
          details: PoliticianDetails | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity_type: 'vote_submitted' | 'comment_posted' | 'vote_moderated' | 'profile_updated' | 'login'
          details?: PoliticianDetails | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          activity_type?: 'vote_submitted' | 'comment_posted' | 'vote_moderated' | 'profile_updated' | 'login'
          details?: PoliticianDetails | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      fact_checks: {
        Row: {
          id: string
          vote_id: string
          checker_type: 'ai' | 'human' | 'external_api'
          checker_id: string | null
          result: 'true' | 'mostly_true' | 'partially_true' | 'mostly_false' | 'false' | 'unverifiable'
          confidence_score: number
          explanation: string | null
          sources: string[]
          created_at: string
        }
        Insert: {
          id?: string
          vote_id: string
          checker_type: 'ai' | 'human' | 'external_api'
          checker_id?: string | null
          result: 'true' | 'mostly_true' | 'partially_true' | 'mostly_false' | 'false' | 'unverifiable'
          confidence_score: number
          explanation?: string | null
          sources?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          vote_id?: string
          checker_type?: 'ai' | 'human' | 'external_api'
          checker_id?: string | null
          result?: 'true' | 'mostly_true' | 'partially_true' | 'mostly_false' | 'false' | 'unverifiable'
          confidence_score?: number
          explanation?: string | null
          sources?: string[]
          created_at?: string
        }
      }
      vote_ratings: {
        Row: {
          id: string
          vote_id: string
          user_id: string
          rating: number
          helpful: boolean | null
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          vote_id: string
          user_id: string
          rating: number
          helpful?: boolean | null
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          vote_id?: string
          user_id?: string
          rating?: number
          helpful?: boolean | null
          reason?: string | null
          created_at?: string
        }
      }
      user_badges: {
        Row: {
          id: string
          user_id: string
          badge_type: 'first_vote' | 'fact_checker' | 'trusted_contributor' | 'expert' | 'moderator_choice' | 'accuracy_master'
          badge_name: string
          description: string | null
          icon_url: string | null
          earned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_type: 'first_vote' | 'fact_checker' | 'trusted_contributor' | 'expert' | 'moderator_choice' | 'accuracy_master'
          badge_name: string
          description?: string | null
          icon_url?: string | null
          earned_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          badge_type?: 'first_vote' | 'fact_checker' | 'trusted_contributor' | 'expert' | 'moderator_choice' | 'accuracy_master'
          badge_name?: string
          description?: string | null
          icon_url?: string | null
          earned_at?: string
        }
      }
      politician_updates: {
        Row: {
          id: string
          politician_id: string
          updated_by: string | null
          field_changed: string
          old_value: string | null
          new_value: string | null
          change_reason: string | null
          verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          politician_id: string
          updated_by?: string | null
          field_changed: string
          old_value?: string | null
          new_value?: string | null
          change_reason?: string | null
          verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          politician_id?: string
          updated_by?: string | null
          field_changed?: string
          old_value?: string | null
          new_value?: string | null
          change_reason?: string | null
          verified?: boolean
          created_at?: string
        }
      }
    }
  }
}