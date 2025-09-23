import mailjet from 'node-mailjet'

// Initialize Mailjet client
const mailjetClient = mailjet.apiConnect(
  process.env.MAILJET_API_KEY || '',
  process.env.MAILJET_SECRET_KEY || ''
)

export interface EmailData {
  to: string
  toName?: string
  subject: string
  htmlContent: string
  textContent?: string
}

export interface EmailTemplate {
  subject: string
  htmlContent: string
  textContent?: string
}

/**
 * Send an email using Mailjet
 */
export async function sendEmail(emailData: EmailData): Promise<boolean> {
  try {
    if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
      console.error('Mailjet API credentials are not configured')
      return false
    }

    const request = await mailjetClient
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.MAILJET_FROM_EMAIL || 'noreply@politik-cred.fr',
              Name: process.env.MAILJET_FROM_NAME || 'Politik Cred'
            },
            To: [
              {
                Email: emailData.to,
                Name: emailData.toName || emailData.to
              }
            ],
            Subject: emailData.subject,
            HTMLPart: emailData.htmlContent,
            TextPart: emailData.textContent || emailData.htmlContent.replace(/<[^>]*>/g, '')
          }
        ]
      })

    console.log('Email sent successfully:', request.body)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

/**
 * Send bulk emails using Mailjet
 */
export async function sendBulkEmails(recipients: { email: string; name?: string }[], template: EmailTemplate): Promise<boolean> {
  try {
    if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
      console.error('Mailjet API credentials are not configured')
      return false
    }

    const messages = recipients.map(recipient => ({
      From: {
        Email: process.env.MAILJET_FROM_EMAIL || 'noreply@politik-cred.fr',
        Name: process.env.MAILJET_FROM_NAME || 'Politik Cred'
      },
      To: [
        {
          Email: recipient.email,
          Name: recipient.name || recipient.email
        }
      ],
      Subject: template.subject,
      HTMLPart: template.htmlContent,
      TextPart: template.textContent || template.htmlContent.replace(/<[^>]*>/g, '')
    }))

    const request = await mailjetClient
      .post('send', { version: 'v3.1' })
      .request({
        Messages: messages
      })

    console.log('Bulk emails sent successfully:', request.body)
    return true
  } catch (error) {
    console.error('Error sending bulk emails:', error)
    return false
  }
}

export default mailjetClient