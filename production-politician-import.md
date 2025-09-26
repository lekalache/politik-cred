# Politicians Data Import Mapping & Production Setup

## 📊 **Current Data Sources Available**

### 1. **Scripts/populate-politicians.js**
- **Contains:** 8 detailed politician profiles with comprehensive data
- **Quality:** High - includes full biographical, political, and social media data
- **Status:** Ready for production import

### 2. **Scripts/import-politicians.js**
- **Expects:** `politicians.json` file (currently missing)
- **Function:** Bulk import with basic name/party mapping
- **Status:** Needs data source file

## 🗂️ **Current Politicians Table Schema**

```sql
CREATE TABLE politicians (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,                    -- Full name
  first_name TEXT,                       -- First name
  last_name TEXT,                        -- Last name
  party TEXT,                           -- Political party
  position TEXT,                        -- Current position/title
  constituency TEXT,                    -- Electoral district
  image_url TEXT,                       -- Profile photo URL
  bio TEXT,                            -- Biography
  birth_date DATE,                     -- Date of birth
  gender TEXT,                         -- male/female/other/prefer-not-say
  political_orientation TEXT,          -- left/center-left/center/center-right/right
  social_media JSONB DEFAULT '{}',     -- Social media links
  contact_info JSONB DEFAULT '{}',     -- Contact information
  education TEXT,                      -- Educational background
  career_history TEXT,                 -- Career timeline
  key_policies TEXT[],                 -- Main policy positions
  controversies TEXT[],                -- Known controversies
  achievements TEXT[],                 -- Major achievements
  credibility_score INTEGER DEFAULT 100,
  total_votes INTEGER DEFAULT 0,
  transparency_score INTEGER DEFAULT 100,
  consistency_score INTEGER DEFAULT 100,
  integrity_score INTEGER DEFAULT 100,
  engagement_score INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🎯 **Data Mapping: populate-politicians.js → Production**

### **Available High-Quality Data (8 Politicians):**

| Field | Source Data | Production Mapping | Notes |
|-------|-------------|-------------------|-------|
| `name` | ✅ Full name | Direct mapping | "Emmanuel Macron" |
| `first_name` | ✅ Available | Direct mapping | "Emmanuel" |
| `last_name` | ✅ Available | Direct mapping | "Macron" |
| `party` | ✅ Available | Direct mapping | "Renaissance" |
| `position` | ✅ Available | Direct mapping | "Président de la République" |
| `constituency` | ✅ Available | Direct mapping | "France" |
| `bio` | ✅ Available | Direct mapping | Full biography |
| `birth_date` | ✅ Available | Direct mapping | "1977-12-21" |
| `gender` | ✅ Available (M/F) | Map M→male, F→female | Gender normalization |
| `political_orientation` | ✅ Available | Direct mapping | "center", "left", "right" |
| `social_media` | ✅ JSONB object | Direct mapping | Twitter, Facebook links |
| `education` | ✅ Available | Direct mapping | "ENA, Sciences Po Paris" |
| `career_history` | ✅ Available | Direct mapping | Full career timeline |
| `key_policies` | ✅ Array | Direct mapping | Policy positions |
| `achievements` | ✅ Array | Direct mapping | Major accomplishments |
| `controversies` | ✅ Array | Direct mapping | Known controversies |
| `verified` | ✅ verification_status | Map "verified"→true | Verification status |
| `is_active` | ✅ Available | Direct mapping | Current activity status |

### **Fields Needing Default Values:**
- `image_url` → NULL (to be added later)
- `contact_info` → {} (empty JSON)
- `credibility_score` → 100 (default)
- `transparency_score` → 100 (default)
- `consistency_score` → 100 (default)
- `integrity_score` → 100 (default)
- `engagement_score` → 100 (default)

## 🚀 **Production Import Strategy**

### **Phase 1: Import Core Politicians (Immediate)**
```bash
# Use the existing populate-politicians.js script
cd /Users/ayoubkalache/repos/politics-trust
node scripts/populate-politicians.js
```

### **Phase 2: Update Import Script for Production Schema**
The current script needs minor updates for the new custom auth schema:

1. **Gender mapping:** `M` → `male`, `F` → `female`
2. **Verification mapping:** `verification_status: "verified"` → `verified: true`
3. **Additional score fields:** Add default values for new score columns

### **Phase 3: Expand Dataset (Future)**
- **Add more politicians** from various levels (local, regional, national)
- **Add profile images** (image_url field)
- **Import historical politicians** for comprehensive coverage

## 📝 **Updated Import Script for Production**

```javascript
// Updated politician transformation for production schema
const transformedPoliticians = politicians.map(politician => ({
  name: politician.name,
  first_name: politician.first_name,
  last_name: politician.last_name,
  party: politician.party,
  position: politician.position,
  constituency: politician.constituency,
  bio: politician.bio,
  birth_date: politician.birth_date,
  gender: politician.gender === 'M' ? 'male' : politician.gender === 'F' ? 'female' : 'prefer-not-say',
  political_orientation: politician.political_orientation,
  social_media: politician.social_media || {},
  contact_info: {},
  education: politician.education,
  career_history: politician.career_history,
  key_policies: politician.key_policies || [],
  controversies: politician.controversies || [],
  achievements: politician.achievements || [],
  credibility_score: 100,
  total_votes: 0,
  transparency_score: 100,
  consistency_score: 100,
  integrity_score: 100,
  engagement_score: 100,
  is_active: politician.is_active || true,
  verified: politician.verification_status === 'verified'
}))
```

## ✅ **Ready for Production Import**

**Status:** ✅ **READY** - High-quality data available for immediate import

**Next Steps:**
1. Run `custom-auth-schema.sql` on production database
2. Update `populate-politicians.js` with gender/verification mapping
3. Execute import script on production
4. Verify data integrity
5. Add profile images in Phase 2

**Expected Result:** 8 verified, active politicians with comprehensive biographical and political data ready for Politik Cred' platform.