import { NextResponse } from 'next/server'
import { checkMailjetConfig } from '@/lib/mailjet-config-checker'

export async function GET() {
  try {
    const configStatus = checkMailjetConfig()

    return NextResponse.json(configStatus)
  } catch (error) {
    console.error('Error checking Mailjet configuration:', error)

    return NextResponse.json(
      {
        hasApiKey: false,
        hasSecretKey: false,
        hasFromEmail: false,
        hasFromName: false,
        emailFormat: false,
        isComplete: false,
        warnings: ['Failed to check configuration'],
        suggestions: ['Check server logs for detailed error information']
      },
      { status: 500 }
    )
  }
}