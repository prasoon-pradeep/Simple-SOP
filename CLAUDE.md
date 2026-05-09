# CLAUDE.md — Agent Instructions for SOP Builder

These rules apply to every coding agent working on this repository. Read and follow them before making any changes.

---

## General

- This is a Tauri v2 desktop app. Frontend is React + TypeScript. Backend is Rust + SQLite.
- Do not include AI tool names, model names, or assistant attribution in commits, comments, code, or any user-facing text.
- Do not create documentation files (README, CONTRIBUTING, etc.) unless explicitly asked.

---

## Release Rules

Every GitHub release MUST include meaningful release notes describing what changed for the user. Hardcoded placeholder text like "See release notes on GitHub" or generic installation instructions are not acceptable as the sole content.

### Where notes must appear
1. **`latest.json` → `notes` field** — this is what the in-app update dialog shows when the user is prompted to install an update. It must describe what is new or fixed in plain language.
2. **GitHub release `body`** — this is what the GitHub releases page and the GitHub API return. It must also contain the feature/fix summary, not just installation instructions.

### Format for release notes
```
## What's new in vX.Y.Z

- Short description of feature or fix
- Short description of feature or fix

### Installation
- Windows: ...
- Linux: ...
```

### When cutting a release
- The `release.yml` workflow accepts a `notes` input. Always populate it with a human-readable summary of what changed.
- Never trigger a release without filling in the notes input.
- Notes should be written from the user's perspective (what they can now do, what was broken and is now fixed) — not internal implementation details.

---

## Commit Style

- Present tense imperative: `fix:`, `feat:`, `chore:`
- No co-author lines, no AI attribution in commit messages
- One logical change per commit
