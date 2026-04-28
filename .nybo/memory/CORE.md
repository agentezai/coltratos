# CORE.md — a-saas-platform
# Always loaded by every nybble skill. Keep under 50 lines.

## Project
A SaaS platform that analyzes Colombian public procurement contract documents (pliegos) to determine if companies are eligible to bid.. Colombian SMBs and procurement consultants who need to quickly assess their eligibility for government contracts.. 20 paying users each running ≥5 analyses/month with p95 latency <60s and eligibility verdicts matching expert manual review on ≥85% of requisitos.

## Working Directory
src/

## Key Commands
- Dev: npm run dev
- Build: npm run build
- Test: npm run test
- Lint: npm run lint

## Stack
- Runtime: Node.js
- Language: TypeScript
- Frontend: Next.js
- Backend: Node.js
- Database: Supabase
- Auth: Supabase Auth
- Hosting: Vercel

## Universal Conventions
- Follow project conventions
- Keep generated files under 500 lines
- Use Mermaid for flow/sequence diagrams in specs

## Active Domains
- auth — `.nybo/memory/domains/auth.md`
- empresa-profile — `.nybo/memory/domains/empresa-profile.md`
- pliego-upload — `.nybo/memory/domains/pliego-upload.md`
- requisito-extraction — `.nybo/memory/domains/requisito-extraction.md`
- eligibility-matching — `.nybo/memory/domains/eligibility-matching.md`
- analytics — `.nybo/memory/domains/analytics.md`
