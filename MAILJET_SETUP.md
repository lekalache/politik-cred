# Mailjet Setup Guide for Politik Cred

## Quick Setup (Development)

### Step 1: Create Mailjet Account
1. Go to [mailjet.com](https://mailjet.com)
2. Sign up with your personal email
3. Verify your account

### Step 2: Get API Credentials
1. Go to Account Settings → API Keys
2. Copy your API Key and Secret Key
3. Update `.env.local`:
```env
MAILJET_API_KEY=your_actual_api_key
MAILJET_SECRET_KEY=your_actual_secret_key
MAILJET_FROM_EMAIL=your.email@gmail.com
MAILJET_FROM_NAME=Politik Cred
```

### Step 3: Verify Sender Email
1. In Mailjet dashboard: Account Settings → Sender addresses
2. Click "Add a sender address"
3. Enter your personal email (same as login or different)
4. Check your email and click verification link
5. Status should show "Verified"

### Step 4: Test
1. Visit `/admin/email-test`
2. Enter your email
3. Send test emails

## Production Setup (When Ready)

### Option A: Buy a Domain
1. Buy domain: `politikcred.com` (recommended)
2. Set up email forwarding to your personal email
3. Add `noreply@politikcred.com` as sender in Mailjet
4. Verify the email
5. Update environment variables

### Option B: Use Subdomain
1. Use free subdomain like `your-app.vercel.app`
2. Some providers allow email setup
3. Less professional but free

## Common Issues & Solutions

### Issue: "Sender not verified"
**Solution**: Add and verify sender email in Mailjet dashboard

### Issue: "Domain not authorized"
**Solution**: You can only send from domains you own/control

### Issue: "Authentication failed"
**Solution**: Check API key and secret in `.env.local`

## Email Limits (Free Plan)
- 200 emails/day
- 6,000 emails/month
- Perfect for development and small projects

## Recommended Domain Names
- `politikcred.com`
- `politik-cred.com`
- `politikcred.fr`
- `politikcred.app`

## Next Steps
1. Start with personal email for development
2. When ready for production, buy a domain
3. Set up professional email addresses
4. Update configuration

## Example .env.local (Development)
```env
# Mailjet Configuration
MAILJET_API_KEY=abc123yourapikey
MAILJET_SECRET_KEY=def456yoursecret
MAILJET_FROM_EMAIL=yourname@gmail.com
MAILJET_FROM_NAME=Politik Cred
```

## Example .env.local (Production)
```env
# Mailjet Configuration
MAILJET_API_KEY=abc123yourapikey
MAILJET_SECRET_KEY=def456yoursecret
MAILJET_FROM_EMAIL=noreply@politikcred.com
MAILJET_FROM_NAME=Politik Cred
```