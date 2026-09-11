# SOP Builder — Market Study

_Last updated: 2026-08-01_

## 1. Category

Standard Operating Procedure (SOP) / process documentation software. Buyers: operations, quality, EHS, and training leads at manufacturing, industrial, healthcare, and technical service businesses who need repeatable, auditable step-by-step procedures.

The category splits into three tiers by business model, not just feature set:

| Tier | Model | Examples |
|---|---|---|
| Enterprise / compliance-heavy | Quote-based, MES/LMS/QMS integration, multi-site rollout | Dozuki |
| Mid-market SaaS | Monthly subscription, cloud-hosted, screen-recording capture | SweetProcess, Tango, Scribe, Trainual, Whale, Process Street, Waybook |
| SME lean/shop-floor | Cheaper SaaS, kanban + skills matrix bundled in | GembaDocs |
| Free / offline / local | No subscription, runs on one machine, no vendor | SOP Rocket, Regmed OpenSOP |

SOP Builder sits in the fourth tier — the smallest and least contested one.

## 2. Competitor landscape

### Cloud SaaS incumbents (the market's center of gravity)

- **Tango / Scribe** — browser extension watches you click through a workflow and auto-generates an annotated guide. Free tier for 1–3 users, fast to start, weak on structured revision/approval workflows. Strongest wedge into individuals and small teams; largest organic/SEO footprint in the category.
- **SweetProcess** — general ops documentation for 20+ person teams. ~$99/mo+, 14-day trial. Positioned as the "grown-up" tool once a team outgrows ad-hoc docs.
- **Trainual** — training/onboarding-first, not really a documentation platform; SOPs are secondary to LMS-style quizzes and tracks.
- **Whale** — knowledge-base framing, ~$250/mo billed yearly. Premium-priced, aimed at teams that want SOPs embedded in a broader wiki/onboarding product.
- **Process Street / Waybook** — workflow/checklist-run software; SOPs are treated as executable checklists rather than documents.
- **Dozuki** — enterprise manufacturing connected-worker platform (3M, Caterpillar, General Mills are reference customers). Custom pricing, reportedly $350–850+/mo with a 50-user minimum. Integrates with MES/QMS. Not a competitor for SMBs — it's the ceiling of the category.
- **GembaDocs** — SME-focused lean manufacturing tool bundling SOPs, kanban cards, and skills matrices. $49/mo for 5 users, on-prem available "on request" for larger orgs only. Closest SaaS competitor in spirit (targets the same shop-floor/SME buyer) but still subscription-only for the segment SOP Builder targets.

**Pattern:** every SaaS competitor charges monthly per-seat, requires an account, and stores data in their cloud. None of them offer a genuinely free, local-only, no-account tier for teams that specifically don't want recurring cost or data leaving the building (regulated, high-security, or cost-sensitive shops).

### Free / open-source / offline tier (direct competitors)

- **SOP Rocket** (github.com/dylanpjenkins/sop-rocket) — the closest direct competitor. Free, MIT-licensed, offline desktop app, Windows-only, no account, no cloud. Feature set: step editor with screenshots/annotations, folder-based library, export to PDF/DOCX/Markdown/HTML. No revision history, no approval workflow, no database (file/folder-based storage), no cross-platform build, no AI assistance.
- **Regmed OpenSOP** — academic/research-lab origin, Docker-deployed web app for self-hosted SOP management. Server-based (not a single-user desktop app), aimed at labs, not manufacturing/industrial teams. Low polish, low activity.
- General-purpose local-first note tools (AFFiNE, SiYuan) get recommended in "free SOP tool" roundups only because nothing purpose-built exists — they lack SOP-specific structure (revision approval, tool/parts lists, step ordering, SOP-ID tracking) entirely.

**Conclusion: this tier is real but thin.** SOP Rocket is the only purpose-built, actively free/open-source desktop competitor, and it is Windows-only with a materially shallower feature set (no revision history/approval metadata, no cross-platform, no structured DB, no AI, no multilingual export).

## 3. Where SOP Builder sits

SOP Builder is the only product found that combines:
- Cross-platform desktop (Linux/Windows/macOS) — SOP Rocket is Windows-only, GembaDocs/Dozuki/SweetProcess etc. are browser-based
- Structured SQLite backend with revision history, approval metadata, and unique SOP-ID tracking — none of the free/offline tools have this; it's normally an enterprise-tier feature (Dozuki-level)
- Zero subscription, zero account, fully offline by default — matches SOP Rocket/OpenSOP, but with enterprise-grade rigor
- Optional bring-your-own-key AI enhancement and multilingual translation — a differentiator against every competitor in every tier; nobody else offers AI features without a bundled subscription
- Portable `.sop` export bundles for air-gapped/high-security facility sharing — not offered anywhere else in the category

**Positioning statement:** *SOP Builder is the only cross-platform desktop SOP tool with enterprise-grade structure (revisions, approvals, audit trail) and zero recurring cost — for teams that want Dozuki-level rigor without Dozuki's price tag or cloud requirement.*

## 4. Market gaps this product can claim

1. **"Dozuki-grade structure, SOP Rocket-grade price (free)."** No competitor occupies this cell. This is the sharpest, most defensible claim.
2. **Cross-platform free desktop SOP tool.** SOP Rocket owns "free desktop" but only on Windows — macOS/Linux industrial and technical teams (labs, machine shops, IT depts) have no equivalent.
3. **Air-gapped / high-security facility use.** `.sop` portable bundles + no-cloud-by-design is a real unmet need for defense, pharma, and regulated manufacturing environments that explicitly cannot use SaaS tools — this is underserved by every SaaS competitor by definition, and SOP Rocket/OpenSOP don't market to it directly.
4. **AI-assisted writing without subscription.** Bring-your-own-key AI enhancement is unique; competitors either bundle AI into a paid tier or don't offer it.

## 5. Risks / honest caveats

- **Alpha status + unsigned installers** (macOS "damaged" warning, Windows SmartScreen) are real adoption friction versus polished SaaS competitors — worth fixing before a big-audience launch (HN/Product Hunt), since first impressions in this exact niche are unforgiving.
- **No mobile/QR-code shop-floor access** — GembaDocs and Dozuki both lead with this for the manufacturing floor; SOP Builder is desktop-only. This is a real feature gap for the shop-floor segment specifically (as opposed to the office/technical-writer segment, where it doesn't matter).
- **No team sync/multi-user editing** — being local-first/SQLite is the selling point, but it also means no concurrent multi-user editing out of the box, which larger teams (SweetProcess/Whale's buyers) will consider a hard requirement, not a trade-off.
- **Commons Clause license** rules out any positioning as "build a SaaS on top of this" — fine for the target buyer (self-hosting individuals/orgs) but means no ecosystem of resellers/integrators will form around it, unlike a fully permissive license.

## 6. Recommended target segment (priority order)

1. Small/mid manufacturing and industrial shops currently using paper binders or Word/PDF SOPs — no budget for SweetProcess/Dozuki, but need more rigor than a shared folder.
2. Regulated/high-security facilities (defense contractors, pharma, labs) that are contractually or policy-barred from cloud SaaS — the `.sop` air-gapped bundle is a killer feature nobody else has.
3. Cost-sensitive technical teams currently paying for Tango/Scribe/Trainual who don't need the collaboration features and want to cut a recurring line item.
4. Open-source/self-hosted community (r/selfhosted, r/opensource) — smaller commercial value but high leverage for stars, contributors, and word-of-mouth into segments 1–3.
