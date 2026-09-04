# HiveMind Frontend — Plan

Nothing is scaffolded yet. These documents are the plan; the app gets created
with `npm create vite@latest` once the decisions below are signed off.

| Doc | What it answers |
| --- | --- |
| [docs/01-stack.md](docs/01-stack.md) | Which stack, and why each piece over the alternative |
| [docs/02-architecture.md](docs/02-architecture.md) | Folder structure and the coding conventions carried over from the backend |
| [docs/03-api-contract.md](docs/03-api-contract.md) | The real API surface, and the six things the spec promises that do not exist |
| [docs/04-pages.md](docs/04-pages.md) | 21 pages, each mapped to its checklist.design requirements |
| [docs/05-motion.md](docs/05-motion.md) | Every micro-interaction, with spring values and the vocabulary term for each |
| [docs/06-assets.md](docs/06-assets.md) | What to build in Figma, frame by frame, and what to never generate with AI |

## Open decisions

These block the first commit:

1. **Shared shell or split apps** — one React app with role-based route trees
   (recommended), or a separate seller application.
2. **Missing endpoints** — build only against what exists, or add
   `PATCH /auth/users/me` first so the account page can edit a profile.
3. **TypeScript** — recommended, but the backend is plain JavaScript.

## Source material

- `.claude/skills/apple-design/SKILL.md` — motion and craft principles
- `.claude/skills/animation-vocabulary/SKILL.md` — naming glossary
- `../Cohort online market place.md` — original assignment spec
- checklist.design — 19 checklists pulled and folded into `04-pages.md`
