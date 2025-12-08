/**
 * Zod Validation Schemas
 * Type-safe request validation for all API routes
 */

import { z } from 'zod'

/**
 * Promise Extraction Schema
 */
export const PromiseExtractionSchema = z.object({
  politicianId: z.string().uuid('Invalid politician ID format'),
  text: z
    .string()
    .min(10, 'Text must be at least 10 characters')
    .max(10000, 'Text must not exceed 10,000 characters'),
  sourceUrl: z.string().url('Invalid source URL'),
  sourceType: z.enum([
    'campaign_site',
    'social_media',
    'news_article',
    'debate',
    'interview',
    'manifesto',
    'other'
  ]),
  date: z.string().datetime('Invalid date format. Use ISO 8601 format.')
})

export type PromiseExtractionInput = z.infer<typeof PromiseExtractionSchema>

/**
 * Promise Matching Schema
 */
export const PromiseMatchingSchema = z.object({
  politicianId: z.string().uuid('Invalid politician ID format'),
  promiseId: z.string().uuid('Invalid promise ID format').optional(),
  minConfidence: z
    .number()
    .min(0, 'Confidence must be between 0 and 1')
    .max(1, 'Confidence must be between 0 and 1')
    .optional()
    .default(0.6)
})

export type PromiseMatchingInput = z.infer<typeof PromiseMatchingSchema>

/**
 * Score Calculation Schema
 */
export const ScoreCalculationSchema = z.object({
  politicianId: z.string().uuid('Invalid politician ID format').optional(),
  all: z.boolean().optional().default(false)
}).refine(
  (data) => data.politicianId || data.all,
  {
    message: 'Must provide either politicianId or all=true'
  }
)

export type ScoreCalculationInput = z.infer<typeof ScoreCalculationSchema>

/**
 * Data Collection Schema
 */
export const DataCollectionSchema = z.object({
  type: z.enum(['full', 'deputies', 'senators', 'incremental']).default('incremental'),
  limit: z
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(1000, 'Limit must not exceed 1000')
    .optional(),
  forceRefresh: z.boolean().optional().default(false)
})

export type DataCollectionInput = z.infer<typeof DataCollectionSchema>

/**
 * Generic validation helper
 */
export async function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; errors: z.ZodError }> {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return { success: false, errors: result.error }
}

/**
 * Format Zod errors for API responses
 */
export function formatValidationErrors(error: z.ZodError<any>): {
  message: string
  errors: Array<{ field: string; message: string }>
} {
  return {
    message: 'Validation failed',
    errors: error.issues.map((err: z.ZodIssue) => ({
      field: err.path.join('.'),
      message: err.message
    }))
  }
}

/**
 * IP address validation regex (IPv4)
 */
const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/

/**
 * API Key Creation Schema
 */
export const ApiKeyCreationSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name must not exceed 100 characters'),
  tier: z.enum(['free', 'standard', 'premium', 'enterprise']),
  scopes: z.array(z.string()).min(1, 'At least one scope is required'),
  expires_at: z.string().datetime('Invalid date format. Use ISO 8601 format.').optional(),
  allowed_ips: z.array(z.string().regex(ipv4Regex, 'Invalid IP address format')).optional(),
  metadata: z.record(z.string(), z.any()).optional()
})

export type ApiKeyCreationInput = z.infer<typeof ApiKeyCreationSchema>

/**
 * API Key Update Schema
 */
export const ApiKeyUpdateSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name must not exceed 100 characters').optional(),
  tier: z.enum(['free', 'standard', 'premium', 'enterprise']).optional(),
  scopes: z.array(z.string()).min(1, 'At least one scope is required').optional(),
  is_active: z.boolean().optional(),
  expires_at: z.string().datetime('Invalid date format. Use ISO 8601 format.').nullable().optional(),
  allowed_ips: z.array(z.string().regex(ipv4Regex, 'Invalid IP address format')).nullable().optional(),
  rate_limit_minute: z.number().int('Must be an integer').min(1, 'Must be at least 1').nullable().optional(),
  rate_limit_hour: z.number().int('Must be an integer').min(1, 'Must be at least 1').nullable().optional(),
  rate_limit_day: z.number().int('Must be an integer').min(1, 'Must be at least 1').nullable().optional(),
  metadata: z.record(z.string(), z.any()).optional()
})

export type ApiKeyUpdateInput = z.infer<typeof ApiKeyUpdateSchema>

/**
 * Pagination Schema for Public API
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int('Page must be an integer').min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().int('Limit must be an integer').min(1, 'Limit must be at least 1').max(100, 'Limit must not exceed 100').default(20)
})

export type PaginationInput = z.infer<typeof PaginationSchema>
