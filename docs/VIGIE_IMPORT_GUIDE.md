# Importing Data from Vigie du Mensonge

Complete guide for importing political lies and promises from [Vigie du Mensonge](https://www.vigiedumensonge.fr) into Politik Cred'.

---

## 🎯 Why Import from Vigie?

Vigie du Mensonge is a French community fact-checking platform that:
- ✅ Tracks political lies and broken promises
- ✅ Has community verification with vote counts
- ✅ Provides historical context
- ✅ Focuses on French politicians
- ✅ Already has dozens of verified entries

**Importing from Vigie gives instant credibility to your platform!**

---

## 📊 Current Status

✅ **Schema Ready**: Migration 007 applied
✅ **Badge Component**: `VigieBadge` displays verification
✅ **Homepage Attribution**: Credits Vigie du mensonge
✅ **Import Tool**: Interactive script ready
⚠️  **Data**: Needs manual import (no public API)

---

## 🚀 Quick Import Process

### Method 1: Interactive Script (Recommended)

```bash
# Run the import script
npx tsx scripts/import-from-vigie.ts

# Follow the prompts:
# 1. Enter Vigie entry ID (e.g., 116)
# 2. Enter politician name
# 3. Copy/paste promise text
# 4. Enter date, category, status
# 5. Optionally add community vote data
```

**Duration**: ~2 minutes per entry

### Method 2: Direct SQL Import

```sql
-- Get politician ID first
SELECT id, name FROM politicians WHERE name ILIKE '%macron%';

-- Insert promise with Vigie source
INSERT INTO political_promises (
  politician_id,
  promise_text,
  promise_date,
  source_platform,
  external_id,
  external_url,
  source_url,
  category,
  verification_status,
  extraction_method,
  confidence_score,
  context
) VALUES (
  '<politician-uuid>',
  'Promise or lie text from Vigie',
  '2024-01-15',
  'vigie_du_mensonge',
  'vigie_205',  -- Entry ID from URL
  'https://www.vigiedumensonge.fr/e/205',
  'https://www.vigiedumensonge.fr/e/205',
  'health',  -- or social, economy, security, etc.
  'broken',  -- or kept, partial, misleading, pending
  'manual_import',
  1.0,
  'Macron ne prétend ne jamais avoir légitimé Didier Raoult'
) RETURNING id;

-- Add community verification (optional but recommended)
INSERT INTO promise_verifications (
  promise_id,
  verification_source,
  community_votes_count,
  community_confidence,
  verification_status,
  notes
) VALUES (
  '<promise-id-from-above>',
  'vigie_community',
  512,  -- Number of votes from Vigie
  0.89,  -- Confidence (0-1)
  'broken',
  'Verified by Vigie du mensonge community'
);
```

---

## 📝 Recommended Starter Set

Import these **high-profile entries** first (20-30 minutes total):

### Emmanuel Macron

| Entry | Title | Category | Status |
|-------|-------|----------|--------|
| [205](https://www.vigiedumensonge.fr/e/205) | Ne jamais avoir légitimé Didier Raoult | health | broken |
| [208](https://www.vigiedumensonge.fr/e/208) | Utilise un slogan d'extrême droite | politics | broken |

### Marine Le Pen

| Entry | Title | Category | Status |
|-------|-------|----------|--------|
| [116](https://www.vigiedumensonge.fr/e/116) | Homicides multipliés par quatre | security | broken |

### Bruno Retailleau

| Entry | Title | Category | Status |
|-------|-------|----------|--------|
| [207](https://www.vigiedumensonge.fr/e/207) | Lien délinquance et immigration | security | misleading |

### Gérald Darmanin

| Entry | Title | Category | Status |
|-------|-------|----------|--------|
| [37](https://www.vigiedumensonge.fr/e/37) | Armes de guerre à Sainte Soline | security | broken |

---

## 🔍 How to Find Entries on Vigie

### Step 1: Visit Vigie
```
https://www.vigiedumensonge.fr
```

### Step 2: Browse Recent Entries
- Homepage shows latest lies/promises
- Click on any entry to see details

### Step 3: Note the Entry ID
```
URL: https://www.vigiedumensonge.fr/e/116
Entry ID: 116  ← Use this in import script
```

### Step 4: Gather Information

From each Vigie page, collect:
- ✅ **Politician name** (e.g., "Marine Le Pen")
- ✅ **Promise/lie text** (copy the statement)
- ✅ **Date** (when it was said)
- ✅ **Category** (health, economy, security, etc.)
- ✅ **Verification status** (broken, kept, misleading)
- ✅ **Community votes** (if displayed)

---

## 📦 Batch Import Guide

### Importing 10 Entries (~20 minutes)

```bash
# For each entry:
npx tsx scripts/import-from-vigie.ts

# Entry 205 (Macron - Raoult)
# Entry 208 (Macron - slogan)
# Entry 116 (Le Pen - homicides)
# Entry 207 (Retailleau - immigration)
# Entry 37 (Darmanin - Sainte Soline)
# ... repeat for 5 more entries
```

**Target**: 5-10 entries per major politician

### Priority Politicians

Focus on these politicians first (already in your database):

1. **Emmanuel Macron** (Président) - 5 entries
2. **Marine Le Pen** (RN) - 5 entries
3. **Jean-Luc Mélenchon** (LFI) - 3 entries
4. **Gérald Darmanin** (Ministre Intérieur) - 3 entries
5. **Bruno Le Maire** (Ministre Économie) - 2 entries
6. **Gabriel Attal** (Ancien PM) - 2 entries

**Total**: 20 entries = Instant credibility boost!

---

## 🎨 Categories Mapping

Map Vigie entries to these categories:

| Vigie Topic | Category |
|-------------|----------|
| Santé, COVID | `health` |
| Économie, emploi | `economy` |
| Immigration, sécurité | `security` |
| Éducation | `education` |
| Environnement, climat | `environment` |
| Justice, institutions | `justice` |
| Social, retraites | `social` |
| Autres | `other` |

---

## ✅ Verification Status Mapping

| Vigie Assessment | Our Status | Badge Color |
|------------------|------------|-------------|
| Mensonge vérifié | `broken` | 🔴 Red |
| Promesse non tenue | `broken` | 🟠 Orange |
| Trompeur, inexact | `misleading` | 🟡 Yellow |
| Promesse tenue | `kept` | 🟢 Green |
| En cours | `pending` | ⚪ Gray |

---

## 🔍 Checking for Duplicates

Before importing, check if entry already exists:

```sql
-- Check by external_id
SELECT id, promise_text, external_id
FROM political_promises
WHERE external_id = 'vigie_205';

-- If returns results, entry already imported!
```

The import script automatically checks for duplicates using `external_id`.

---

## 📊 After Import - Verification

### Check Imported Promises

```sql
-- Count Vigie imports
SELECT COUNT(*) FROM political_promises
WHERE source_platform = 'vigie_du_mensonge';

-- List all Vigie promises
SELECT
  p.name as politician,
  pp.promise_text,
  pp.verification_status,
  pp.external_url
FROM political_promises pp
JOIN politicians p ON pp.politician_id = p.id
WHERE pp.source_platform = 'vigie_du_mensonge'
ORDER BY pp.created_at DESC;

-- Check community verifications
SELECT
  pp.promise_text,
  pv.community_votes_count,
  pv.community_confidence,
  pv.verification_status
FROM political_promises pp
JOIN promise_verifications pv ON pp.id = pv.promise_id
WHERE pp.source_platform = 'vigie_du_mensonge';
```

### View in Admin Panel

1. Go to `http://localhost:3000/admin`
2. Click "Promesses" tab
3. Filter by source: "vigie_du_mensonge"
4. See the Vigie badge on promise cards!

---

## 🎯 Expected Results

After importing 20 entries:

```
✅ Political Promises: 20 (from Vigie)
✅ Source Platform: vigie_du_mensonge
✅ With Community Verifications: 20
✅ Covering: 6 major politicians
✅ Categories: health, security, economy, social
✅ Verification Statuses: broken, misleading, kept
```

---

## 🤖 Future: Automated Scraping

**Current**: Manual import (2 min/entry)
**Future**: Automated scraper

To build automated scraper:

1. **Contact Vigie Team**
   - Request API access
   - Or permission to scrape
   - Partnership opportunity

2. **Build Scraper** (`src/lib/scrapers/vigie-client.ts` foundation exists)
   ```typescript
   // Fetch all entries
   const entries = await vigieClient.getAllEntries()

   // For each entry
   for (const entry of entries) {
     // Extract politician name
     // Map to our database
     // Import promise
     // Add community verification
   }
   ```

3. **Run Batch Import**
   ```bash
   tsx scripts/vigie-batch-import.ts
   # Imports 50-100 entries automatically
   ```

---

## 💡 Pro Tips

1. **Start Small**: Import 5 entries, verify they display correctly, then scale

2. **High-Profile First**: Import well-known politicians for maximum impact

3. **Community Data**: Always add vote counts when available - adds credibility

4. **Categories Matter**: Proper categorization helps with filtering and search

5. **Context is Key**: The `context` field shows on promise cards - make it descriptive

6. **Duplicates**: Use external_id (`vigie_XXX`) to prevent duplicates

7. **Verification Badge**: The VigieBadge component automatically displays on promise cards with Vigie source

---

## 🎨 How Vigie Data Displays

After import, promises show:

```
┌─────────────────────────────────────────┐
│ 👁️ Vigie du mensonge Badge             │
│                                          │
│ "Macron ne prétend ne jamais avoir      │
│  légitimé Didier Raoult"                │
│                                          │
│ 🔴 Mensonge vérifié                     │
│ 512 votes • 89% confiance               │
│ 🔗 Voir sur Vigie                       │
└─────────────────────────────────────────┘
```

---

## 📞 Support

### Troubleshooting

**"Politician not found"**
- Check spelling
- Search in Supabase: `SELECT name FROM politicians WHERE name ILIKE '%macron%'`
- Add politician if missing: `tsx scripts/seed-politicians.ts`

**"Duplicate entry"**
- Entry already imported
- Check: `SELECT * FROM political_promises WHERE external_id = 'vigie_XXX'`

**"Import script fails"**
- Verify environment variables in `.env.local`
- Check Supabase connection
- Run: `tsx scripts/check-database-status.ts`

---

## 🎯 Quick Start Checklist

- [ ] Run import script: `npx tsx scripts/import-from-vigie.ts`
- [ ] Import 5 Macron entries
- [ ] Import 5 Marine Le Pen entries
- [ ] Import 3-5 other politician entries
- [ ] Verify in admin panel: `/admin`
- [ ] Check badges display correctly
- [ ] Add community vote data where available
- [ ] Total: 15-20 imported entries

**Time**: 30-40 minutes
**Result**: Instant credibility boost for your platform!

---

## 🚀 Next Steps

After importing from Vigie:

1. **Combine with your data**: You now have 3 sources:
   - Vigie du mensonge (community-verified)
   - Your news extraction (AI-powered)
   - Parliamentary data (official)

2. **Multi-source verification**: Promises verified by multiple sources show higher confidence

3. **Display badges**: Vigie badge appears automatically on promise cards

4. **Build credibility**: "Verified by Vigie du mensonge community" adds trust

Your platform now has **community-verified data** alongside AI and official sources! 🎉
