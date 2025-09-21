# Setup Guide - Politics Trust

## 🚨 Environment Setup Required

To run this application locally, you need to configure your Supabase credentials.

### Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **Settings** > **API**
3. Copy the following values:
   - **Project URL** (example: `https://whjoqxozjzcluhdgocly.supabase.co`)
   - **Anon/Public Key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### Step 2: Update Environment Variables

Update the `.env.local` file with your actual Supabase credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://whjoqxozjzcluhdgocly.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

### Step 3: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Run the SQL schema from `supabase-schema.sql` file in the root directory
3. This will create all necessary tables and security policies

### Step 4: Seed Sample Data (Optional)

To populate the database with sample politicians:

```bash
# First, update the import script with your service role key (found in Supabase Settings > API)
node scripts/import-politicians.js
```

Or manually insert sample data using the data from `src/lib/seed-data.ts`

### Step 5: Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000` (or 3001 if 3000 is busy).

## 🔑 Required Supabase Setup

### Authentication Settings
1. In Supabase dashboard, go to **Authentication** > **Settings**
2. Enable **Enable email confirmations** if desired
3. Configure **Site URL** to your domain (for production)

### Database Policies
The SQL schema includes Row Level Security (RLS) policies for:
- Users can only see/edit their own data
- Politicians are publicly readable
- Votes require authentication to create
- Moderators/admins can moderate votes

### User Roles
To create admin/moderator users:
1. Create a user account through the app
2. In Supabase dashboard, go to **Authentication** > **Users**
3. Edit the user and add custom claims in the `user_metadata`:
   ```json
   {
     "name": "Admin User",
     "role": "admin"
   }
   ```

## 🚀 Production Deployment

For production:
1. Use environment variables on your hosting platform
2. Update CORS settings in Supabase for your domain
3. Consider using the service role key for data imports (keep it secret!)

## 📧 Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Supabase credentials in the dashboard
3. Ensure the database schema is properly set up

The application requires a properly configured Supabase project with authentication enabled and the correct database schema.