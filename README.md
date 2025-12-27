This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Roadmap

- [x] Establish workflow docs and operating loop
- [x] Lock product behavior reference (`docs/product-reference.md`)
- [x] Define voice journal features in `AGENTS.md` and `docs/features/`
- [x] Add Jest setup and first red-green-refactor cycle
- [x] Build push-to-talk voice capture with Groq Whisper STT proxy
- [x] Add ElevenLabs TTS proxy and queued playback hook
- [x] Add chat turn endpoint with Bolt routing and confidence-aware field update gating
- [x] Ship the voice-first journal pane with explicit request gating and spoken replies
- [x] Add new-journal welcome tour with feature highlights and philosophy
- [x] Add privacy-first about page
- [x] Add primary navigation with Home/About links
- [ ] Ship local-first conversation history + navigation (encrypted IndexedDB)
- [ ] Add confirmation flow for low-confidence field updates
- [ ] Add streaming TTS/chunking for long replies
- [ ] Add export/import and deletion flows

## Internal Docs

- Feature catalog: `AGENTS.md`
- Product reference: `docs/product-reference.md`
- Orchestrator plan: `docs/orchestrator-doc.md`
- Workflow loop: `docs/workflow-handbook.md`
- Testing guide: `docs/testing-playbook-doc.md`
- Context log: `docs/context-doc.md`
- Workflow boilerplate: `docs/workflow-boilerplate.md`
- Feature blueprints: `docs/features/README.md`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
