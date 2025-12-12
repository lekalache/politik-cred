# Politik Cred' - Development Roadmap

## Current State Analysis

### ✅ What's Working
- **Data Collection**: AN Open Data (4,755 scrutins available, ZIP-based extraction)
- **Politicians Database**: 972 politicians (574 deputies, 347 senators)
- **Parliamentary Actions**: 14,869+ vote records
- **Promise System**: Extraction, matching, verification pipeline
- **Scoring**: AI-based consistency scores
- **Pages**: Home, Score, Transparency, Promises, Politicians, Admin

### ⚠️ Current Limitations
- Limited promise extraction (few politicians have promises)
- No search/filter functionality on main pages
- No party-level analytics
- No historical trend visualization
- Mobile experience could be improved
- No user personalization features

---

## Phase 1: Data Foundation (Week 1-2)
**Goal**: Ensure complete, accurate, reliable data

### 1.1 Complete Data Collection
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Run full AN data collection (all 4,755 scrutins) | High | Low | 🔄 Ready |
| Schedule daily automated collection (cron) | High | Low | Pending |
| Add Sénat voting data integration | High | Medium | Pending |
| Import legislature 16 historical data | Medium | Medium | Pending |

### 1.2 Data Quality
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Improve name matching accuracy (>95%) | High | Low | ✅ Done |
| Add data validation checks | Medium | Low | Pending |
| Create data quality dashboard | Medium | Medium | Pending |
| Add missing politician photos | Low | Low | Pending |

### 1.3 Promise Collection
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Integrate Vigie du Mensonge data | High | Medium | Pending |
| Add manual promise submission (admin) | Medium | Low | Pending |
| Improve AI promise extraction | Medium | High | Pending |

**Deliverables**:
- [ ] 100% of current legislature votes collected
- [ ] Daily automated data refresh
- [ ] Data quality score > 80%

---

## Phase 2: Core UX Improvements (Week 3-4)
**Goal**: Make the platform easy to use and navigate

### 2.1 Search & Discovery
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Add politician search (name, party) | High | Medium | Pending |
| Add filters (score range, party, region) | High | Medium | Pending |
| Add sorting options (score, name, activity) | Medium | Low | Pending |
| Implement pagination | Medium | Low | Pending |

### 2.2 Politician Profiles
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Add vote history timeline | High | Medium | Pending |
| Show promise vs action comparison | High | Medium | Pending |
| Add attendance rate visualization | Medium | Low | Pending |
| Display party affiliation clearly | Low | Low | Pending |

### 2.3 Mobile Experience
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Optimize mobile navigation | High | Medium | Pending |
| Add swipe gestures for politician cards | Low | Medium | Pending |
| Implement PWA (offline support) | Medium | Medium | Pending |

**Deliverables**:
- [ ] Search functionality on home page
- [ ] Filter by party, score, region
- [ ] Mobile-optimized politician profiles

---

## Phase 3: Analytics & Visualization (Week 5-6)
**Goal**: Provide meaningful insights through data visualization

### 3.1 Party Analytics
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Party average scores dashboard | High | Medium | Pending |
| Party voting alignment analysis | Medium | High | Pending |
| Party promise fulfillment rates | Medium | Medium | Pending |

### 3.2 Trend Visualization
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Score evolution charts (per politician) | High | Medium | Pending |
| Voting activity timeline | Medium | Medium | Pending |
| Promise status progression | Medium | Medium | Pending |

### 3.3 Comparative Tools
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Compare 2-3 politicians side by side | High | Medium | Pending |
| Party comparison tool | Medium | Medium | Pending |
| Regional comparison (by département) | Low | High | Pending |

### 3.4 Interactive Map
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| France map with constituency scores | Medium | High | Pending |
| Click to view local representatives | Medium | Medium | Pending |
| Regional statistics overlay | Low | Medium | Pending |

**Deliverables**:
- [ ] Party statistics page
- [ ] Politician comparison tool
- [ ] Score evolution charts

---

## Phase 4: Trust & Transparency (Week 7-8)
**Goal**: Build user trust through complete transparency

### 4.1 Source Verification
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Direct links to AN/Sénat for each vote | High | Low | Pending |
| Show original promise source URLs | High | Low | Pending |
| Display confidence levels prominently | Medium | Low | Pending |

### 4.2 Audit & Methodology
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Public data collection logs | High | Low | Pending |
| Detailed methodology documentation | High | Low | Pending |
| Algorithm transparency page | Medium | Medium | Pending |
| Open source scoring formulas | Medium | Low | Pending |

### 4.3 Dispute System
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Allow politicians to flag inaccuracies | High | Medium | Pending |
| Public dispute resolution log | Medium | Medium | Pending |
| User-reported error system | Medium | Medium | Pending |

**Deliverables**:
- [ ] Every data point linked to official source
- [ ] Complete methodology documentation
- [ ] Dispute submission system

---

## Phase 5: Engagement & Personalization (Week 9-10)
**Goal**: Increase user engagement and retention

### 5.1 User Features
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Follow/track specific politicians | High | Medium | Pending |
| Email alerts on score changes | High | Medium | Pending |
| User dashboard with tracked politicians | Medium | Medium | Pending |
| Saved searches and filters | Low | Low | Pending |

### 5.2 Social Features
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Share politician scores on social media | High | Low | Pending |
| Embeddable politician cards | Medium | Medium | Pending |
| Comment system improvements | Low | Medium | Pending |

### 5.3 Notifications
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Push notifications (PWA) | Medium | Medium | Pending |
| Weekly digest emails | Medium | Medium | Pending |
| Breaking news alerts | Low | Medium | Pending |

**Deliverables**:
- [ ] User tracking/following system
- [ ] Email notification system
- [ ] Social sharing functionality

---

## Phase 6: Platform & Ecosystem (Week 11-12)
**Goal**: Enable third-party integrations and scale

### 6.1 Public API
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| REST API v2 with full documentation | High | High | Pending |
| GraphQL endpoint | Medium | High | Pending |
| API rate limiting and authentication | High | Medium | Pending |
| Webhook support for real-time updates | Medium | Medium | Pending |

### 6.2 Integration Tools
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| RSS/Atom feeds for score changes | Medium | Low | Pending |
| WordPress plugin | Low | Medium | Pending |
| Browser extension | Low | High | Pending |

### 6.3 Data Export
| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| CSV/JSON export for all data | High | Low | Pending |
| Academic research data packages | Medium | Medium | Pending |
| Open data portal integration | Low | Medium | Pending |

**Deliverables**:
- [ ] Public API with documentation
- [ ] RSS feeds
- [ ] Data export functionality

---

## Quick Wins (Can implement immediately)

### This Week
1. **Full Data Collection** - Run all 4,755 scrutins
2. **Search Bar** - Add to home page
3. **Party Filter** - Filter politicians by party
4. **Source Links** - Add AN links to votes
5. **Dark Mode** - Theme toggle

### Low Effort / High Impact
- Add politician photos from Wikipedia
- Show party logos on cards
- Add "last updated" timestamps
- Improve loading states
- Add breadcrumb navigation

---

## Technical Debt to Address

| Item | Priority | Notes |
|------|----------|-------|
| Add comprehensive test coverage | High | Currently no tests |
| Implement error boundaries | Medium | Better error handling |
| Add Sentry for error tracking | Medium | Production monitoring |
| Optimize database queries | Medium | Some N+1 queries |
| Add Redis caching | Low | For API responses |
| Implement rate limiting | Medium | Prevent abuse |

---

## Success Metrics

### Phase 1 Success
- [ ] 100% vote coverage for legislature 17
- [ ] < 5% unmatched politicians
- [ ] Daily automated updates running

### Phase 2 Success
- [ ] Search returns results in < 500ms
- [ ] Mobile bounce rate < 40%
- [ ] Page load time < 2s

### Phase 3 Success
- [ ] Users spend > 3 min on analytics pages
- [ ] Comparison tool used by > 20% of users

### Phase 4 Success
- [ ] Every data point has source link
- [ ] < 1% disputed data points

### Phase 5 Success
- [ ] 10% of users create accounts
- [ ] Email open rate > 30%

### Phase 6 Success
- [ ] 100+ API integrations
- [ ] Featured in 3+ media outlets

---

## Recommended Starting Point

**Start with Phase 1.1 + Quick Wins:**

```bash
# 1. Run full data collection
npx tsx scripts/test-an-opendata.ts  # Set limit to 4755

# 2. Add search functionality (quick win)

# 3. Add party filter (quick win)

# 4. Add source links to votes
```

This gives you:
- Complete data foundation
- Immediate UX improvements
- Visible progress for users
