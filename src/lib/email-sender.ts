/**
 * Client-side utility for sending emails through the API
 */

interface EmailParams {
  to: string
  toName?: string
  [key: string]: any
}

export class EmailSender {
  private static async sendEmailRequest(type: string, params: EmailParams) {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          ...params
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email')
      }

      return result
    } catch (error) {
      console.error(`Error sending ${type} email:`, error)
      throw error
    }
  }

  /**
   * Send welcome email to new user
   */
  static async sendWelcomeEmail(to: string, userName: string) {
    return this.sendEmailRequest('welcome', {
      to,
      toName: userName,
      userName
    })
  }

  /**
   * Send email verification email
   */
  static async sendEmailVerification(to: string, verificationLink: string) {
    return this.sendEmailRequest('email-verification', {
      to,
      verificationLink
    })
  }

  /**
   * Send password reset email
   */
  static async sendPasswordReset(to: string, resetLink: string) {
    return this.sendEmailRequest('password-reset', {
      to,
      resetLink
    })
  }

  /**
   * Send vote notification email
   */
  static async sendVoteNotification(
    to: string,
    politicianName: string,
    voteType: 'positive' | 'negative' | 'rectification'
  ) {
    return this.sendEmailRequest('vote-notification', {
      to,
      politicianName,
      voteType
    })
  }

  /**
   * Send newsletter email
   */
  static async sendNewsletter(to: string, title: string, content: string) {
    return this.sendEmailRequest('newsletter', {
      to,
      title,
      content
    })
  }

  /**
   * Send custom email
   */
  static async sendCustomEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
    toName?: string
  ) {
    return this.sendEmailRequest('custom', {
      to,
      toName,
      subject,
      htmlContent,
      textContent
    })
  }
}

// Server-side utility (for use in API routes and server components)
export async function sendServerEmail(type: string, params: EmailParams) {
  // Import here to avoid issues with server-only packages
  const { sendEmail } = await import('./mailjet')
  const {
    getWelcomeEmailTemplate,
    getEmailVerificationTemplate,
    getPasswordResetTemplate,
    getVoteNotificationTemplate,
    getNewsletterTemplate
  } = await import('./email-templates')

  let template
  const { to, toName, ...otherParams } = params

  switch (type) {
    case 'welcome':
      template = getWelcomeEmailTemplate(otherParams.userName || toName || 'Utilisateur')
      break
    case 'email-verification':
      template = getEmailVerificationTemplate(otherParams.verificationLink)
      break
    case 'password-reset':
      template = getPasswordResetTemplate(otherParams.resetLink)
      break
    case 'vote-notification':
      template = getVoteNotificationTemplate(otherParams.politicianName, otherParams.voteType)
      break
    case 'newsletter':
      template = getNewsletterTemplate(otherParams.title, otherParams.content)
      break
    default:
      throw new Error(`Unsupported email type: ${type}`)
  }

  return sendEmail({
    to,
    toName,
    subject: template.subject,
    htmlContent: template.htmlContent,
    textContent: template.textContent
  })
}