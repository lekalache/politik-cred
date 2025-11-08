#!/bin/bash
# Setup Environment Variables for Promise Collection
# This script helps you create the .env.local file with your Supabase credentials

echo "🔧 Politik Cred' - Environment Setup"
echo "===================================="
echo ""
echo "This script will help you set up your Supabase credentials."
echo ""
echo "You'll need to get these values from:"
echo "https://app.supabase.com → Your Project → Settings → API"
echo ""

# Check if .env.local already exists
if [ -f .env.local ]; then
    echo "⚠️  Warning: .env.local already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Prompt for Supabase URL
echo ""
echo "1️⃣  Enter your Supabase Project URL"
echo "   (Example: https://abcdefghijk.supabase.co)"
read -p "   URL: " SUPABASE_URL

# Prompt for anon key
echo ""
echo "2️⃣  Enter your Supabase Anonymous Key"
echo "   (This is the 'anon' or 'public' key from the API settings)"
read -p "   Key: " ANON_KEY

# Prompt for service role key
echo ""
echo "3️⃣  Enter your Supabase Service Role Key (optional but recommended)"
echo "   (This is needed for the seeding scripts)"
read -p "   Key: " SERVICE_KEY

# Create .env.local file
cat > .env.local << EOF
# Supabase Configuration
# Generated on $(date)
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY

# World News API (optional)
WORLD_NEWS_API_KEY=

# Mailjet (optional)
MAILJET_API_KEY=
MAILJET_SECRET_KEY=

# Hugging Face API (optional - for semantic matching)
HUGGINGFACE_API_KEY=
EOF

echo ""
echo "✅ Environment file created successfully!"
echo ""
echo "You can now run:"
echo "  npm run check-env         # Verify configuration"
echo "  npm run seed-politicians  # Seed the database"
echo "  npm run collect-promises  # Collect promises"
echo ""
