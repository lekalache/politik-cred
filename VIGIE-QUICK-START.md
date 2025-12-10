# Vigie du Mensonge - Quick Start (20 Minutes)

Import **20 high-profile political lies** from Vigie du Mensonge to give your platform instant credibility.

---

## 🎯 Goal

Import verified political lies from France's leading fact-checking platform in **20 minutes**.

**Result**: Community-verified data + Vigie badges on your platform!

---

## ⚡ Quick Import (2 min per entry)

```bash
npm run import-vigie
```

Follow the interactive prompts for each entry below.

---

## 📋 Import These 20 Entries

### Emmanuel Macron (5 entries)

1. **Entry 205**: Didier Raoult
   - URL: https://www.vigiedumensonge.fr/e/205
   - Text: "Ne prétend ne jamais avoir légitimé Didier Raoult"
   - Category: `health`
   - Status: `broken`

2. **Entry 208**: Slogan d'extrême droite
   - URL: https://www.vigiedumensonge.fr/e/208
   - Text: "Utilise un slogan d'extrême droite en février 2017"
   - Category: `politics`
   - Status: `broken`

### Marine Le Pen (5 entries)

3. **Entry 116**: Homicides
   - URL: https://www.vigiedumensonge.fr/e/116
   - Text: "Le nombre d'homicides a été multiplié par quatre en 15 ans"
   - Category: `security`
   - Status: `broken`

### Bruno Retailleau (3 entries)

4. **Entry 207**: Immigration
   - URL: https://www.vigiedumensonge.fr/e/207
   - Text: "Lien entre l'augmentation de la délinquance et l'immigration"
   - Category: `security`
   - Status: `misleading`

### Gérald Darmanin (3 entries)

5. **Entry 37**: Sainte Soline
   - URL: https://www.vigiedumensonge.fr/e/37
   - Text: "Utilisation d'armes de guerre à Sainte Soline"
   - Category: `security`
   - Status: `broken`

### Additional Entries (4 more)

Visit https://www.vigiedumensonge.fr and pick 4 more recent entries.

---

## 🚀 Import Process

For **each entry above**:

### Step 1: Run Import Script
```bash
npm run import-vigie
```

### Step 2: Enter Entry ID
```
Enter Vigie entry ID: 205
```

### Step 3: Enter Politician
```
Politician name: Emmanuel Macron
```

### Step 4: Copy Promise Text
```
Promise text: Ne prétend ne jamais avoir légitimé Didier Raoult
```

### Step 5: Enter Date & Category
```
Promise date: 2024-01-15
Category: health
Status: broken
```

### Step 6: Community Data (Optional)
```
Community votes: 512
Confidence: 0.89
```

### Step 7: Done! ✅
```
🎉 Import complete!
View in admin: http://localhost:3000/admin
```

**Repeat** for remaining entries (~2 min each)

---

## ⏱️ Time Breakdown

| Task | Time | Total |
|------|------|-------|
| Import 20 entries | 2 min each | 40 min |
| **Shortcut: Import 10 entries** | 2 min each | **20 min** |

---

## 📊 Expected Results

After importing 10-20 entries:

```sql
SELECT
  p.name,
  COUNT(*) as vigie_promises
FROM political_promises pp
JOIN politicians p ON pp.politician_id = p.id
WHERE pp.source_platform = 'vigie_du_mensonge'
GROUP BY p.name;
```

Expected output:
```
Emmanuel Macron     | 5
Marine Le Pen       | 5
Gérald Darmanin     | 3
Bruno Retailleau    | 3
[Other politicians] | 4
```

**Total**: 20 community-verified promises!

---

## 🎨 How It Looks

After import, visit `/promises` and see:

```
┌────────────────────────────────────────────┐
│ 👁️ Vérifié par Vigie du mensonge          │
│                                            │
│ Emmanuel Macron                            │
│ "Ne prétend ne jamais avoir légitimé       │
│  Didier Raoult"                            │
│                                            │
│ 🔴 Mensonge vérifié                        │
│ 512 votes communautaires                   │
│ 89% de confiance                           │
│                                            │
│ 🔗 Voir sur Vigie du mensonge             │
└────────────────────────────────────────────┘
```

---

## ✅ Verification Checklist

After import:

- [ ] Run: `npm run import-vigie` for each entry
- [ ] Imported at least 10 entries (20 min)
- [ ] Check admin panel: http://localhost:3000/admin
- [ ] Verify Vigie badges display
- [ ] Check promise cards show community votes
- [ ] SQL check: `SELECT COUNT(*) FROM political_promises WHERE source_platform = 'vigie_du_mensonge'`

---

## 💡 Pro Tips

1. **Start with Macron**: Most recognizable politician
2. **Mix statuses**: Import broken, kept, misleading for variety
3. **Add vote counts**: Makes badges more impressive
4. **Check for duplicates**: Script automatically prevents re-import
5. **Verify display**: Check `/promises` page after first import

---

## 🎯 Next Actions

After Vigie import:

1. **Combine sources**: You now have:
   - ✅ Vigie du mensonge (community-verified)
   - ✅ News articles (167 ready to extract)
   - ⏳ Parliamentary data (via orchestrator)

2. **Run orchestrator**: Extract more promises from news

3. **Build credibility**: Promote "Verified by Vigie community"

Your platform now has **multi-source verification**! 🚀

---

## 📞 Need Help?

**Import fails?**
- Check: `tsx scripts/check-database-status.ts`
- Verify: `.env.local` has Supabase credentials

**Politician not found?**
- List available: `SELECT name FROM politicians ORDER BY name`
- Add missing: `tsx scripts/seed-politicians.ts`

**See the result:**
```bash
npm run dev
# Visit: http://localhost:3000/promises
```

---

**Ready? Start importing!** 🎯

```bash
npm run import-vigie
```
