# Director Quest (sim4director)

Film-directing, animation and Blender learning journey. Same stack as sim4options:
Vue 3 + Vite, Hono API on Cloudflare Workers, Agents SDK tutor (Durable Object), D1 progress,
Workers AI with **Clef** decision models, BYOK through AI Gateway.

## What's in it
- 570 practice questions across 8 levels (104 authored multi-step and on-set questions + seeded drills)
- 341 linked terms, each in English, 中文 and 日本語, in 16 categories
- Knowledge map: department atlas, term cloud sized by usage and colored by mastery, relationship graph
- Inline `[[term]]` links open a term sheet from any question
- 13 famous scenes as the final test (Jaws, Psycho, The Godfather, Up, Spirited Away, ...)
- Lab: shot calculator (FOV, depth of field, shot size, shutter, Blender Python) and a bouncing-ball timing tool
- Clef sparring director, rationale grading, LLM explanations and a floating tutor
- Sources page with books, channels and free study tools

## Setup
```bash
cd ~/dev/sim4director
npm install
cp .dev.vars.example .dev.vars        # set ACCESS_TOKEN

# D1: create once, paste the id into wrangler.jsonc → d1_databases[0].database_id
npx wrangler d1 create sim4director
npm run db:migrate:local
npm run dev                            # http://localhost:5173

# deploy (also needs an AI Gateway named "sim4director")
npm run db:migrate
npx wrangler secret put ACCESS_TOKEN
npm run deploy
```

## Layout
```
worker/     Hono API, Clef + LLM client, TutorAgent
shared/     types, question generator
content/    terms (en/zh/ja), authored questions, scenes, sources
src/        Vue app (views, components, Pinia store)
migrations/ D1 schema
```

Add a term: append a line to `content/terms.ts`. Drills for it are generated automatically.
