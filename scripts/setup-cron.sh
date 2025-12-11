#!/bin/bash

# PolitikCred' Automated Cron Setup Script
# This script sets up the database and environment for automated cron jobs

set -e  # Exit on error

echo "🚀 PolitikCred' Cron Setup"
echo "============================================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ .env.local not found${NC}"
    echo "Please copy .env.local.example to .env.local and configure it"
    exit 1
fi

echo -e "${GREEN}✅ Found .env.local${NC}"

# Load environment variables
export $(grep -v '^#' .env.local | xargs)

# Check required variables
echo ""
echo "🔍 Checking required environment variables..."

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_URL not set${NC}"
    exit 1
fi
echo -e "${GREEN}✅ NEXT_PUBLIC_SUPABASE_URL${NC}"

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ SUPABASE_SERVICE_ROLE_KEY not set${NC}"
    exit 1
fi
echo -e "${GREEN}✅ SUPABASE_SERVICE_ROLE_KEY${NC}"

if [ -z "$HUGGINGFACE_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  HUGGINGFACE_API_KEY not set (optional but recommended)${NC}"
fi

# Generate CRON_SECRET_TOKEN if not set or is placeholder
if [ -z "$CRON_SECRET_TOKEN" ] || [ "$CRON_SECRET_TOKEN" = "your_secure_cron_secret_token_here_change_in_production" ]; then
    echo ""
    echo "🔐 Generating CRON_SECRET_TOKEN..."
    NEW_TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

    # Update .env.local
    if grep -q "CRON_SECRET_TOKEN=" .env.local; then
        # Replace existing
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/CRON_SECRET_TOKEN=.*/CRON_SECRET_TOKEN=$NEW_TOKEN/" .env.local
        else
            # Linux
            sed -i "s/CRON_SECRET_TOKEN=.*/CRON_SECRET_TOKEN=$NEW_TOKEN/" .env.local
        fi
    else
        # Add new
        echo "" >> .env.local
        echo "CRON_SECRET_TOKEN=$NEW_TOKEN" >> .env.local
    fi

    echo -e "${GREEN}✅ Generated and saved CRON_SECRET_TOKEN${NC}"
    echo -e "${YELLOW}Token: $NEW_TOKEN${NC}"
    echo -e "${YELLOW}⚠️  Save this token for production deployment!${NC}"
    export CRON_SECRET_TOKEN=$NEW_TOKEN
else
    echo -e "${GREEN}✅ CRON_SECRET_TOKEN already set${NC}"
fi

# Run TypeScript setup script
echo ""
echo "📊 Setting up database..."
npx tsx scripts/setup-cron-database.ts

# Check if setup was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "============================================================"
    echo -e "${GREEN}✅ SETUP COMPLETE!${NC}"
    echo "============================================================"
    echo ""
    echo "📝 Next steps:"
    echo ""
    echo "1. Test locally:"
    echo -e "   ${BLUE}npm run dev${NC}"
    echo ""
    echo "2. In another terminal, test the cron endpoint:"
    echo -e "   ${BLUE}curl -X POST http://localhost:3000/api/cron/test-audit \\${NC}"
    echo -e "   ${BLUE}  -H \"Authorization: Bearer $CRON_SECRET_TOKEN\" \\${NC}"
    echo -e "   ${BLUE}  -H \"Content-Type: application/json\"${NC}"
    echo ""
    echo "3. Deploy to Netlify:"
    echo -e "   ${BLUE}git add .${NC}"
    echo -e "   ${BLUE}git commit -m \"feat: Add automated cron jobs\"${NC}"
    echo -e "   ${BLUE}git push${NC}"
    echo ""
    echo "4. Add environment variables to Netlify:"
    echo "   - Go to Site Settings → Environment Variables"
    echo "   - Add: CRON_SECRET_TOKEN (use a DIFFERENT token for production!)"
    echo "   - Add: ENABLE_CRON=true"
    echo ""
    echo "============================================================"
else
    echo ""
    echo -e "${RED}❌ Setup failed. Please check the errors above.${NC}"
    exit 1
fi
