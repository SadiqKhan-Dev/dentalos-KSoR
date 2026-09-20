---
format: 2
name: dentalos-clinic-ksor
title: DentalOS Clinic Knowledge
description: Governed clinic policies, FAQs, and procedures that the DentalOS booking, FAQ, and recall agent answers from.
toolchain:
  requires: ">=0.0.60"
  scaffolded: "0.0.60"
database:
  dsn_env: KSOR_DB_URL
retrieval:
  vector_floor: 0.627   # calibrated 2026-09-20 on generation 1, model gemini-embedding-001/d1536, door: queries-file
  floor_digest: 8bfb07d0e6f5
---

This record is the authoritative source for clinic-level policies, frequently
asked questions, and operational procedures that the DentalOS agent surface
answers from. It covers booking rules, pricing guidance, procedure information,
recall and reminder cadences, and internal staff procedures for each clinic
tenant.

## Agent instructions

Answer patient and staff questions **only from this record**. When a question
is about a specific patient's appointment, account, or medical history, say so
and defer to the booking tool rather than this knowledge base. If this record
has no answer for a policy or FAQ question, state the abstention clearly — do
not fabricate an answer from general knowledge.

Each clinic (tenant) owns its own subtree under `knowledge/<clinic-slug>/`.
The agent scopes its search to the requesting clinic's subtree using the
tenant context provided by the DentalOS FastAPI service.

## Multi-tenant structure

This record serves multiple dental clinics. Each clinic's knowledge lives in
`knowledge/<clinic-slug>/` and carries its own `ksor.audience` frontmatter.
Clinic admins manage their own documents through the DentalOS admin UI; the
platform admin oversees governance and can take down any document across all
tenants.
