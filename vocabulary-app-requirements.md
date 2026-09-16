# Vocab Forge — Requirements Specification

**Version:** 1.0  
**Date:** September 2026  
**Author:** NgCuong  
**Status:** Draft for review

---

## 1. Purpose

Vocab Forge is a single-purpose study tool: review foreign-language or technical vocabulary with flashcard-style sessions. It is intentionally simple — no accounts, no social features, no spaced-repetition algorithm in v1. The defining requirement is **massive-data upload**: the user must be able to import thousands of terms in one action and start studying immediately.

---

## 2. Target User

- A single learner managing their own word lists.
- Comfortable with spreadsheets or text files.
- Studies on a laptop or desktop browser; mobile support is secondary for v1.
- Expects the tool to stay fast even with 5,000–20,000 cards.

---

## 3. Core User Stories

### Must have

| Story | Description |
|-------|-------------|
| **Upload a large word list** | As a learner, I want to paste or upload a CSV/TSV file with thousands of rows so that I can import my entire vocabulary bank at once. |
| **Review cards front-to-back** | As a learner, I want to see a term, guess its meaning, then reveal the answer so I can self-test my memory. |
| **Mark recall results** | As a learner, I want to mark each card as *Known*, *Hard*, or *Unknown* so the session can filter what to review next. |

### Should have

| Story | Description |
|-------|-------------|
| **Shuffle and filter by deck** | As a learner, I want to choose a subset (e.g., only verbs, only recent imports) so I can target weak areas. |
| **Export my data** | As a learner, I want to download my cards with any edits or progress so I never lose my work. |

---

## 4. Data Model

Each record is a **Card**. The minimal schema is small so imports stay simple, but it supports optional richness.

| Field | Required | Notes |
|-------|----------|-------|
| `id` | Auto | Stable UUID generated on import. |
| `front` | Yes | Term, phrase, or prompt shown first. |
| `back` | Yes | Definition, translation, or answer. |
| `context` | No | Example sentence or short note. |
| `tags` | No | Comma-separated labels (e.g., `noun,unit-3`). |
| `deck` | No | Grouping name. Defaults to `imported`. |
| `createdAt` | Auto | ISO 8601 timestamp. |

---

## 5. Import Format

The app accepts **CSV** and **TSV**. The first row is a header. Column names are case-insensitive and whitespace-trimmed. Extra columns are ignored.

### Standard column names

```csv
front,back,context,tags,deck
bonjour,hello (informal),Bonjour! Comment ça va?,greeting,french-basics
serendipity,a pleasant surprise,Finding that cafe was pure serendipity.,noun,english-vocab
```

### Alternative accepted columns

| If you use... | It maps to... |
|---------------|---------------|
| `term` | `front` |
| `definition`, `meaning`, `translation` | `back` |
| `example`, `sentence` | `context` |
| `category`, `group` | `deck` |

> **Massive-data requirement:** The importer must parse at least 10,000 rows without freezing the UI. Parsing should run in chunks (or off the main thread) and show a progress indicator. Rows with empty `front` or `back` are skipped, with a downloadable error log.

---

## 6. Study Session Flow

1. Learner selects a deck or tag filter (default: all cards).
2. Cards are shuffled. Session size defaults to 20 cards, configurable up to the full filtered set.
3. Front is shown. Learner reveals the back.
4. Learner rates recall: **Again**, **Hard**, **Good**, **Easy**.
5. Session ends with a summary: cards studied, accuracy, weak items listed.

Rating only affects the current session in v1; it does not schedule future reviews. A future version may add spaced repetition.

---

## 7. Storage

### In scope

- Local persistence via `IndexedDB` or `localStorage`.
- All data stays in the browser by default.
- Export to CSV/JSON.

### Out of scope

- User accounts or cloud sync.
- Collaborative decks.
- Server-side storage.

---

## 8. UI/UX Requirements

- **Keyboard-first:** Space flips a card; 1–4 rates recall; arrows navigate.
- **No empty states:** On first launch, show a sample deck of 10 cards and a prominent import button.
- **Progress visibility:** Always show "card 7 of 20" and a thin progress bar.
- **Import feedback:** After upload, report total imported, skipped, and duplicates.
- **Responsive layout:** Works down to 400 px, though desktop is the primary target.
- **Dark mode:** Respect system preference and allow manual toggle.

---

## 9. Performance Requirements

| Scenario | Target |
|----------|--------|
| Import 10,000 CSV rows | Under 5 seconds on a modern laptop; UI stays responsive. |
| Shuffle / filter 20,000 cards | Under 500 ms. |
| Flip to next card | Instant (< 50 ms perceived). |
| Export full dataset | Under 2 seconds for 20,000 cards. |

---

## 10. Open Questions

- Should cards support images or audio in a future release?
- Is a spaced-repetition mode desired for v2?
- Should import support Anki `.apkg` export parsing?
- Should the app be installable as a PWA?

---

*Prepared for the Vocab Forge project. This document is a living draft; priorities may shift as implementation begins.*
