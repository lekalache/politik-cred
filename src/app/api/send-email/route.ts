import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailjet'
import {
  getWelcomeEmailTemplate,
  getEmailVerificationTemplate,
  getPasswordResetTemplate,
  getVoteNotificationTemplate,
  getNewsletterTemplate
} from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, to, toName, ...params } = body

    if (!to || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: to, type' },
        { status: 400 }
      )
    }

    let template
    let subject
    let htmlContent
    let textContent

    switch (type) {
      case 'welcome':
        template = getWelcomeEmailTemplate(params.userName || toName || 'Utilisateur')
        break

      case 'email-verification':
        if (!params.verificationLink) {
          return NextResponse.json(
            { error: 'Missing verificationLink for email verification' },
            { status: 400 }
          )
        }
        template = getEmailVerificationTemplate(params.verificationLink)
        break

      case 'password-reset':
        if (!params.resetLink) {
          return NextResponse.json(
            { error: 'Missing resetLink for password reset' },
            { status: 400 }
          )
        }
        template = getPasswordResetTemplate(params.resetLink)
        break

      case 'vote-notification':
        if (!params.politicianName || !params.voteType) {
          return NextResponse.json(
            { error: 'Missing politicianName or voteType for vote notification' },
            { status: 400 }
          )
        }
        template = getVoteNotificationTemplate(params.politicianName, params.voteType)
        break

      case 'newsletter':
        if (!params.title || !params.content) {
          return NextResponse.json(
            { error: 'Missing title or content for newsletter' },
            { status: 400 }
          )
        }
        template = getNewsletterTemplate(params.title, params.content)
        break

      case 'custom':
        if (!params.subject || !params.htmlContent) {
          return NextResponse.json(
            { error: 'Missing subject or htmlContent for custom email' },
            { status: 400 }
          )
        }
        subject = params.subject
        htmlContent = params.htmlContent
        textContent = params.textContent
        break

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        )
    }

    // Use template if not custom email
    if (template) {
      subject = template.subject
      htmlContent = template.htmlContent
      textContent = template.textContent
    }

    const success = await sendEmail({
      to,
      toName,
      subject: subject!,
      htmlContent: htmlContent!,
      textContent
    })

    if (success) {
      return NextResponse.json({ success: true, message: 'Email sent successfully' })
    } else {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Example usage endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Email API is ready',
    availableTypes: [
      'welcome',
      'email-verification',
      'password-reset',
      'vote-notification',
      'newsletter',
      'custom'
    ],
    examples: {
      welcome: {
        type: 'welcome',
        to: 'user@example.com',
        toName: 'John Doe',
        userName: 'John'
      },
      'email-verification': {
        type: 'email-verification',
        to: 'user@example.com',
        verificationLink: 'https://politik-cred.fr/verify?token=abc123'
      },
      'password-reset': {
        type: 'password-reset',
        to: 'user@example.com',
        resetLink: 'https://politik-cred.fr/reset?token=abc123'
      },
      'vote-notification': {
        type: 'vote-notification',
        to: 'user@example.com',
        politicianName: 'Emmanuel Macron',
        voteType: 'negative'
      },
      newsletter: {
        type: 'newsletter',
        to: 'user@example.com',
        title: 'Nouvelles fonctionnalités',
        content: '<p>Découvrez les nouvelles fonctionnalités de Politik Cred...</p>'
      },
      custom: {
        type: 'custom',
        to: 'user@example.com',
        subject: 'Custom Subject',
        htmlContent: '<p>Custom HTML content</p>',
        textContent: 'Custom text content'
      }
    }
  })
}