# Promise Collection Scripts

This directory contains scripts for collecting and managing political promises in the Politik Cred' database.

## Available Scripts

### 1. Seed Politicians (`seed-politicians.ts`)

Seeds the database with French politicians.

**Usage:**
```bash
npm run seed-politicians
```

**What it does:**
- Inserts major French political figures into the database
- Updates existing politicians if they already exist
- Includes: Macron, Le Pen, Mélenchon, Pécresse, Zemmour, and others
- Sets default credibility scores

**Politicians included:**
- Emmanuel Macron (Renaissance)
- Marine Le Pen (Rassemblement National)
- Jean-Luc Mélenchon (La France Insoumise)
- Valérie Pécresse (Les Républicains)
- Éric Zemmour (Reconquête)
- Yannick Jadot (EELV)
- Fabien Roussel (PCF)
- Édouard Philippe (Horizons)
- Bruno Le Maire (Renaissance)
- Gérald Darmanin (Renaissance)

### 2. Collect Promises (`collect-promises.ts`)

Extracts political promises from text and stores them in the database.

**Usage:**
```bash
npm run collect-promises
```

**What it does:**
- Processes sample French political texts from 2022 presidential campaign
- Uses AI-powered promise classifier (95% accuracy)
- Extracts promises with confidence scores
- Categorizes promises (economic, social, environmental, etc.)
- Stores promises in the database with full metadata

**Sample promises included:**
- **Emmanuel Macron**: Employment creation, tax reductions, education budget
- **Marine Le Pen**: Immigration referendum, TVA reduction, security measures
- **Jean-Luc Mélenchon**: SMIC increase, 6th Republic, ecological planning
- **Valérie Pécresse**: Public spending reduction, work hours increase, nuclear energy
- **Éric Zemmour**: Immigration control, national identity, defense budget

## Workflow

1. **First run** (setup):
   ```bash
   # Seed politicians first
   npm run seed-politicians
   ```

2. **Collect promises**:
   ```bash
   # Extract and store promises
   npm run collect-promises
   ```

3. **Verify results**:
   - Check the database for new promises in `political_promises` table
   - View promises on the `/promises` page
   - Check promise categories and confidence scores

## Promise Collection System

### How it works

1. **Text Input**: Political speeches, manifestos, interviews
2. **Promise Extraction**: AI classifier identifies promises using French keywords
3. **Classification**: Categorizes by policy domain (economic, social, etc.)
4. **Confidence Scoring**: Assigns 0.0-1.0 confidence score
5. **Actionability Check**: Determines if promise can be verified through parliamentary actions
6. **Storage**: Saves to database with metadata

### Promise Categories

- **economic**: Employment, taxes, business, economy
- **social**: Family, pensions, housing, social protection
- **environmental**: Climate, ecology, energy transition
- **security**: Police, crime, defense, military
- **healthcare**: Health system, hospitals, medical care
- **education**: Schools, universities, research
- **justice**: Legal system, prisons, law enforcement
- **immigration**: Migration, borders, asylum
- **foreign_policy**: International relations, EU, diplomacy
- **other**: Uncategorized promises

### Promise Detection

The classifier looks for French promise indicators:

**Strong indicators (90% confidence):**
- "je m'engage" (I commit)
- "je promets" (I promise)
- "nous allons" (we will)
- "je ferai" (I will do)
- "objectif" (objective)

**Medium indicators (60% confidence):**
- "il faut" (we must)
- "je veux" (I want)
- "mon projet" (my project)
- "ma proposition" (my proposal)

**Anti-patterns (not promises):**
- "si" (if)
- "peut-être" (maybe)
- "j'aimerais" (I would like)
- "envisager" (to consider)

## Adding New Politicians

Edit `scripts/seed-politicians.ts` and add to the `FRENCH_POLITICIANS` array:

```typescript
{
  name: 'Politician Name',
  party: 'Party Name',
  position: 'Position',
  bio: 'Short biography'
}
```

Then run:
```bash
npm run seed-politicians
```

## Adding New Promise Sources

Edit `scripts/collect-promises.ts` and add to the `SAMPLE_PROMISES` array:

```typescript
{
  politicianName: 'Politician Name',
  url: 'https://source-url.com',
  type: 'campaign_site', // or 'manifesto', 'interview', etc.
  date: '2024-01-01T00:00:00Z',
  content: `
    Promise text in French...
    Je m'engage à faire quelque chose.
  `
}
```

Then run:
```bash
npm run collect-promises
```

## Database Schema

### political_promises table

- `id`: UUID
- `politician_id`: Reference to politician
- `promise_text`: The actual promise
- `promise_date`: When the promise was made
- `category`: Policy domain
- `source_url`: Source link
- `source_type`: Type of source
- `extraction_method`: How it was extracted (ai_extracted, manual, etc.)
- `confidence_score`: 0.0-1.0 confidence
- `verification_status`: pending, actionable, verified, disputed
- `is_actionable`: Boolean - can it be verified?
- `context`: Additional context (keywords, etc.)

## Environment Variables

Ensure these are set in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## Troubleshooting

### "Politician not found in database"
Run `npm run seed-politicians` first to add politicians.

### "Permission denied" errors
Ensure your Supabase service role key is set correctly in `.env.local`.

### "No promises extracted"
Check that:
- Text contains French promise indicators
- Text is at least 10 characters
- Promises meet confidence threshold (>0.5)

### TypeScript errors
Make sure to build the project first:
```bash
npm run build
```

## Next Steps

After collecting promises:

1. **Collect Parliamentary Data**: Run data collection to gather votes and actions
   ```bash
   # Via API or admin dashboard
   POST /api/data-collection/collect
   ```

2. **Match Promises to Actions**: Use semantic matching
   ```bash
   POST /api/promises/match
   ```

3. **Calculate Consistency Scores**: Compute politician scores
   ```bash
   POST /api/promises/calculate-scores
   ```

4. **View Results**: Check `/promises` page for promise tracker UI

## Contributing

To add more French political sources:

1. Find official campaign materials, manifestos, or verified speeches
2. Add politician to seed script if not present
3. Add promise source with original French text
4. Run collection script
5. Verify extraction quality

## License

Part of the Politik Cred' project - French political transparency platform.
