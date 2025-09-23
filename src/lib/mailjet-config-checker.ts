/**
 * Mailjet Configuration Checker
 * Helps verify that Mailjet is properly configured
 */

export interface ConfigStatus {
  hasApiKey: boolean
  hasSecretKey: boolean
  hasFromEmail: boolean
  hasFromName: boolean
  emailFormat: boolean
  isComplete: boolean
  warnings: string[]
  suggestions: string[]
}

export function checkMailjetConfig(): ConfigStatus {
  const warnings: string[] = []
  const suggestions: string[] = []

  const apiKey = process.env.MAILJET_API_KEY
  const secretKey = process.env.MAILJET_SECRET_KEY
  const fromEmail = process.env.MAILJET_FROM_EMAIL
  const fromName = process.env.MAILJET_FROM_NAME

  const hasApiKey = Boolean(apiKey && apiKey !== 'your_mailjet_api_key_here')
  const hasSecretKey = Boolean(secretKey && secretKey !== 'your_mailjet_secret_key_here')
  const hasFromEmail = Boolean(fromEmail && fromEmail !== 'your.personal.email@gmail.com')
  const hasFromName = Boolean(fromName)

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const emailFormat = hasFromEmail ? emailRegex.test(fromEmail!) : false

  // Check for placeholder values
  if (!hasApiKey) {
    warnings.push('MAILJET_API_KEY is not set or still has placeholder value')
    suggestions.push('Get your API key from Mailjet dashboard → Account Settings → API Keys')
  }

  if (!hasSecretKey) {
    warnings.push('MAILJET_SECRET_KEY is not set or still has placeholder value')
    suggestions.push('Get your secret key from Mailjet dashboard → Account Settings → API Keys')
  }

  if (!hasFromEmail) {
    warnings.push('MAILJET_FROM_EMAIL is not set or still has placeholder value')
    suggestions.push('Use your verified email address (personal email for development)')
  }

  if (!emailFormat && fromEmail) {
    warnings.push('MAILJET_FROM_EMAIL format appears invalid')
    suggestions.push('Use a valid email format like: yourname@gmail.com')
  }

  if (!hasFromName) {
    suggestions.push('Consider setting MAILJET_FROM_NAME for better email branding')
  }

  // Check for potentially problematic email addresses
  if (fromEmail) {
    if (fromEmail.includes('politik-cred.fr') || fromEmail.includes('politikcred.fr')) {
      warnings.push('Using politik-cred.fr domain without owning it')
      suggestions.push('Use your personal email for now, or buy the politik-cred domain')
    }

    if (fromEmail.includes('example.com') || fromEmail.includes('test.com')) {
      warnings.push('Using example/test domain')
      suggestions.push('Replace with your actual email address')
    }
  }

  const isComplete = hasApiKey && hasSecretKey && hasFromEmail && emailFormat

  return {
    hasApiKey,
    hasSecretKey,
    hasFromEmail,
    hasFromName,
    emailFormat,
    isComplete,
    warnings,
    suggestions
  }
}

/**
 * Test Mailjet connection (server-side only)
 */
export async function testMailjetConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    // This should only run on server-side
    if (typeof window !== 'undefined') {
      throw new Error('testMailjetConnection can only be used server-side')
    }

    const config = checkMailjetConfig()
    if (!config.isComplete) {
      return {
        success: false,
        error: `Configuration incomplete: ${config.warnings.join(', ')}`
      }
    }

    // Try to initialize Mailjet client
    const mailjet = await import('node-mailjet')
    const client = mailjet.default.apiConnect(
      process.env.MAILJET_API_KEY!,
      process.env.MAILJET_SECRET_KEY!
    )

    // Test API connection by getting account info
    await client.get('user').request()

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get configuration summary for display
 */
export function getConfigSummary(): string {
  const config = checkMailjetConfig()

  if (config.isComplete) {
    return '✅ Mailjet configuration looks good!'
  }

  const issues = [
    ...config.warnings.map(w => `❌ ${w}`),
    ...config.suggestions.map(s => `💡 ${s}`)
  ]

  return issues.join('\n')
}