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

// Multi-Source Verification Types
export type ValueCategory =
  | 'economy'
  | 'environment'
  | 'social_justice'
  | 'security'
  | 'immigration'
  | 'health'
  | 'education'
  | 'foreign_policy'
  | 'other'

export type SourceType =
  | 'vigie'
  | 'les_decodeurs'
  | 'afp_factuel'
  | 'official'
  | 'community'
  | 'other'

export type PromiseStatus = 'kept' | 'broken' | 'partial' | 'pending'

export interface ValueMetrics {
  promise_count: number
  kept_count: number
  broken_count: number
  partial_count: number
  consistency_score: number  // Percentage of promises kept
  attention_score: number    // Percentage of total promises in this category
  priority_rank: number      // 1 = highest priority based on promise count
}

export interface GreenwashingFlag {
  category: ValueCategory
  type: 'greenwashing' | 'priority_mismatch'
  severity: 'low' | 'medium' | 'high'
  description: string
  detected_at: string
}

export interface PriorityShift {
  from_category: ValueCategory
  to_category: ValueCategory
  shift_date: string
  magnitude: number  // How significant the shift was
  reason?: string
}

// Promise Tracker Type Aliases
export type PromiseCategory =
  | 'economic'
  | 'social'
  | 'environmental'
  | 'security'
  | 'healthcare'
  | 'education'
  | 'justice'
  | 'immigration'
  | 'foreign_policy'
  | 'other'

export type PromiseSourceType =
  | 'campaign_site'
  | 'interview'
  | 'social_media'
  | 'debate'
  | 'press_release'
  | 'manifesto'
  | 'other'

export type ExtractionMethod =
  | 'manual'
  | 'ai_extracted'
  | 'scraped'
  | 'user_submitted'

export type VerificationStatus =
  | 'pending'
  | 'actionable'
  | 'non_actionable'
  | 'verified'
  | 'disputed'

export type URLHealthStatus =
  | 'unchecked'
  | 'valid'
  | 'redirect'
  | 'client_error'
  | 'server_error'
  | 'network_error'
  | 'timeout'
  | 'invalid_format'
  | 'archived_only'

export type ActionType =
  | 'vote'
  | 'bill_sponsor'
  | 'amendment'
  | 'attendance'
  | 'debate'
  | 'question'
  | 'committee'
  | 'other'

export type VotePosition = 'pour' | 'contre' | 'abstention' | 'absent'

export type MatchType = 'kept' | 'broken' | 'partial' | 'pending' | 'contradictory'

export type VerificationMethod =
  | 'exact_match'
  | 'semantic_match'
  | 'manual_review'
  | 'ai_assisted'

export type DataCollectionJobType =
  | 'assemblee_votes'
  | 'senat_votes'
  | 'twitter_scrape'
  | 'promise_extraction'
  | 'attendance_update'
  | 'vigie_import'

export type DataCollectionJobStatus = 'running' | 'completed' | 'failed' | 'cancelled'

// Authenticity flags for promise verification
export interface AuthenticityFlags {
  is_verified?: boolean
  has_multiple_sources?: boolean
  sources_agree?: boolean
  official_source_exists?: boolean
  community_verified?: boolean
  discrepancy_detected?: boolean
  discrepancy_reason?: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Use placeholder values during build time if environment variables are missing
const buildTimeUrl = supabaseUrl || 'https://placeholder.supabase.co'
const buildTimeKey = (supabaseAnonKey && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY_HERE')
  ? supabaseAnonKey
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDk0MDUyNDAsImV4cCI6MTk2NDk4MTI0MH0.placeholder'

export const supabase = createClient(buildTimeUrl, buildTimeKey)

// Service role client for server-side operations that bypass RLS
export const supabaseAdmin = supabaseServiceKey
  ? createClient(buildTimeUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

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
      promise_sources: {
        Row: {
          id: string
          promise_id: string
          source_type: SourceType
          source_url: string
          source_name: string | null
          verified_at: string
          credibility_weight: number
          status_claimed: PromiseStatus | null
          evidence_text: string | null
          confidence: number | null
          extracted_at: string
          last_checked: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          promise_id: string
          source_type: SourceType
          source_url: string
          source_name?: string | null
          verified_at?: string
          credibility_weight?: number
          status_claimed?: PromiseStatus | null
          evidence_text?: string | null
          confidence?: number | null
          extracted_at?: string
          last_checked?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          promise_id?: string
          source_type?: SourceType
          source_url?: string
          source_name?: string | null
          verified_at?: string
          credibility_weight?: number
          status_claimed?: PromiseStatus | null
          evidence_text?: string | null
          confidence?: number | null
          extracted_at?: string
          last_checked?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      source_reputation: {
        Row: {
          id: string
          source_type: string
          accuracy_rate: number
          credibility_weight: number
          total_claims: number
          verified_claims: number
          disputed_claims: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source_type: string
          accuracy_rate?: number
          credibility_weight?: number
          total_claims?: number
          verified_claims?: number
          disputed_claims?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source_type?: string
          accuracy_rate?: number
          credibility_weight?: number
          total_claims?: number
          verified_claims?: number
          disputed_claims?: number
          created_at?: string
          updated_at?: string
        }
      }
      core_value_profiles: {
        Row: {
          id: string
          politician_id: string
          value_metrics: Record<ValueCategory, ValueMetrics>
          authenticity_score: number | null
          greenwashing_flags: GreenwashingFlag[]
          priority_shifts: PriorityShift[]
          behavioral_patterns: string[]
          calculated_at: string
          data_quality_score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          politician_id: string
          value_metrics?: Record<ValueCategory, ValueMetrics>
          authenticity_score?: number | null
          greenwashing_flags?: GreenwashingFlag[]
          priority_shifts?: PriorityShift[]
          behavioral_patterns?: string[]
          calculated_at?: string
          data_quality_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          politician_id?: string
          value_metrics?: Record<ValueCategory, ValueMetrics>
          authenticity_score?: number | null
          greenwashing_flags?: GreenwashingFlag[]
          priority_shifts?: PriorityShift[]
          behavioral_patterns?: string[]
          calculated_at?: string
          data_quality_score?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      political_promises: {
        Row: {
          id: string
          politician_id: string
          promise_text: string
          promise_date: string
          category: PromiseCategory
          source_url: string
          source_type: PromiseSourceType
          extraction_method: ExtractionMethod
          confidence_score: number | null
          verification_status: VerificationStatus
          is_actionable: boolean
          context: string | null
          // URL health tracking fields
          source_url_status: URLHealthStatus
          source_url_http_status: number | null
          source_url_last_checked: string | null
          source_url_redirect_url: string | null
          source_url_archive_url: string | null
          source_url_error_message: string | null
          url_check_attempts: number
          // Multi-source verification fields
          authenticity_flags: AuthenticityFlags | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          politician_id: string
          promise_text: string
          promise_date: string
          category: PromiseCategory
          source_url: string
          source_type: PromiseSourceType
          extraction_method: ExtractionMethod
          confidence_score?: number | null
          verification_status?: VerificationStatus
          is_actionable?: boolean
          context?: string | null
          source_url_status?: URLHealthStatus
          source_url_http_status?: number | null
          source_url_last_checked?: string | null
          source_url_redirect_url?: string | null
          source_url_archive_url?: string | null
          source_url_error_message?: string | null
          url_check_attempts?: number
          authenticity_flags?: AuthenticityFlags | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          politician_id?: string
          promise_text?: string
          promise_date?: string
          category?: PromiseCategory
          source_url?: string
          source_type?: PromiseSourceType
          extraction_method?: ExtractionMethod
          confidence_score?: number | null
          verification_status?: VerificationStatus
          is_actionable?: boolean
          context?: string | null
          source_url_status?: URLHealthStatus
          source_url_http_status?: number | null
          source_url_last_checked?: string | null
          source_url_redirect_url?: string | null
          source_url_archive_url?: string | null
          source_url_error_message?: string | null
          url_check_attempts?: number
          authenticity_flags?: AuthenticityFlags | null
          created_at?: string
          updated_at?: string
        }
      }
      parliamentary_actions: {
        Row: {
          id: string
          politician_id: string
          action_type: ActionType
          action_date: string
          session_id: string | null
          description: string
          vote_position: VotePosition | null
          bill_id: string | null
          bill_title: string | null
          official_reference: string
          category: PromiseCategory | null
          metadata: Record<string, unknown> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          politician_id: string
          action_type: ActionType
          action_date: string
          session_id?: string | null
          description: string
          vote_position?: VotePosition | null
          bill_id?: string | null
          bill_title?: string | null
          official_reference: string
          category?: PromiseCategory | null
          metadata?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          politician_id?: string
          action_type?: ActionType
          action_date?: string
          session_id?: string | null
          description?: string
          vote_position?: VotePosition | null
          bill_id?: string | null
          bill_title?: string | null
          official_reference?: string
          category?: PromiseCategory | null
          metadata?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
      }
      promise_verifications: {
        Row: {
          id: string
          promise_id: string
          action_id: string
          match_type: MatchType
          match_confidence: number
          verification_method: VerificationMethod
          evidence_urls: string[] | null
          explanation: string
          verified_by: string | null
          verified_at: string | null
          is_disputed: boolean
          dispute_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          promise_id: string
          action_id: string
          match_type: MatchType
          match_confidence: number
          verification_method: VerificationMethod
          evidence_urls?: string[] | null
          explanation: string
          verified_by?: string | null
          verified_at?: string | null
          is_disputed?: boolean
          dispute_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          promise_id?: string
          action_id?: string
          match_type?: MatchType
          match_confidence?: number
          verification_method?: VerificationMethod
          evidence_urls?: string[] | null
          explanation?: string
          verified_by?: string | null
          verified_at?: string | null
          is_disputed?: boolean
          dispute_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      consistency_scores: {
        Row: {
          id: string
          politician_id: string
          overall_score: number
          promises_kept: number
          promises_broken: number
          promises_partial: number
          promises_pending: number
          total_promises: number
          attendance_rate: number | null
          sessions_attended: number
          sessions_scheduled: number
          legislative_activity_score: number | null
          bills_sponsored: number
          amendments_proposed: number
          debates_participated: number
          questions_asked: number
          last_calculated_at: string
          calculation_period_start: string | null
          calculation_period_end: string | null
          data_quality_score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          politician_id: string
          overall_score: number
          promises_kept?: number
          promises_broken?: number
          promises_partial?: number
          promises_pending?: number
          attendance_rate?: number | null
          sessions_attended?: number
          sessions_scheduled?: number
          legislative_activity_score?: number | null
          bills_sponsored?: number
          amendments_proposed?: number
          debates_participated?: number
          questions_asked?: number
          last_calculated_at?: string
          calculation_period_start?: string | null
          calculation_period_end?: string | null
          data_quality_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          politician_id?: string
          overall_score?: number
          promises_kept?: number
          promises_broken?: number
          promises_partial?: number
          promises_pending?: number
          attendance_rate?: number | null
          sessions_attended?: number
          sessions_scheduled?: number
          legislative_activity_score?: number | null
          bills_sponsored?: number
          amendments_proposed?: number
          debates_participated?: number
          questions_asked?: number
          last_calculated_at?: string
          calculation_period_start?: string | null
          calculation_period_end?: string | null
          data_quality_score?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      data_collection_jobs: {
        Row: {
          id: string
          job_type: DataCollectionJobType
          status: DataCollectionJobStatus
          source: string
          records_collected: number
          records_new: number
          records_updated: number
          records_skipped: number
          error_message: string | null
          error_count: number
          started_at: string
          completed_at: string | null
          duration_seconds: number | null
          metadata: Record<string, unknown> | null
        }
        Insert: {
          id?: string
          job_type: DataCollectionJobType
          status?: DataCollectionJobStatus
          source: string
          records_collected?: number
          records_new?: number
          records_updated?: number
          records_skipped?: number
          error_message?: string | null
          error_count?: number
          started_at?: string
          completed_at?: string | null
          duration_seconds?: number | null
          metadata?: Record<string, unknown> | null
        }
        Update: {
          id?: string
          job_type?: DataCollectionJobType
          status?: DataCollectionJobStatus
          source?: string
          records_collected?: number
          records_new?: number
          records_updated?: number
          records_skipped?: number
          error_message?: string | null
          error_count?: number
          started_at?: string
          completed_at?: string | null
          duration_seconds?: number | null
          metadata?: Record<string, unknown> | null
        }
      }
    }
  }
}

// ============================================================================
// Convenience Type Aliases for easier imports
// ============================================================================

// Row types (what you get from SELECT queries)
export type PoliticalPromise = Database['public']['Tables']['political_promises']['Row']
export type ParliamentaryAction = Database['public']['Tables']['parliamentary_actions']['Row']
export type PromiseVerification = Database['public']['Tables']['promise_verifications']['Row']
export type ConsistencyScore = Database['public']['Tables']['consistency_scores']['Row']
export type DataCollectionJob = Database['public']['Tables']['data_collection_jobs']['Row']
export type PromiseSource = Database['public']['Tables']['promise_sources']['Row']
export type SourceReputation = Database['public']['Tables']['source_reputation']['Row']
export type CoreValueProfile = Database['public']['Tables']['core_value_profiles']['Row']
export type Politician = Database['public']['Tables']['politicians']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Vote = Database['public']['Tables']['votes']['Row']

// Insert types (for creating new records)
export type PoliticalPromiseInsert = Database['public']['Tables']['political_promises']['Insert']
export type ParliamentaryActionInsert = Database['public']['Tables']['parliamentary_actions']['Insert']
export type PromiseVerificationInsert = Database['public']['Tables']['promise_verifications']['Insert']
export type ConsistencyScoreInsert = Database['public']['Tables']['consistency_scores']['Insert']
export type DataCollectionJobInsert = Database['public']['Tables']['data_collection_jobs']['Insert']
export type PromiseSourceInsert = Database['public']['Tables']['promise_sources']['Insert']
export type CoreValueProfileInsert = Database['public']['Tables']['core_value_profiles']['Insert']

// Update types (for partial updates)
export type PoliticalPromiseUpdate = Database['public']['Tables']['political_promises']['Update']
export type ParliamentaryActionUpdate = Database['public']['Tables']['parliamentary_actions']['Update']
export type PromiseVerificationUpdate = Database['public']['Tables']['promise_verifications']['Update']
export type ConsistencyScoreUpdate = Database['public']['Tables']['consistency_scores']['Update']
export type PromiseSourceUpdate = Database['public']['Tables']['promise_sources']['Update']
export type CoreValueProfileUpdate = Database['public']['Tables']['core_value_profiles']['Update']

// View types
export interface PromiseWithSources extends PoliticalPromise {
  source_count: number
  source_types: SourceType[]
}

export interface PoliticianWithValues extends Politician {
  value_metrics: Record<ValueCategory, ValueMetrics> | null
  authenticity_score: number | null
  greenwashing_flags: GreenwashingFlag[] | null
  value_data_quality: number | null
}