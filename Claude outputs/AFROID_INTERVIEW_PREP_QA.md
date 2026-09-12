# AfroID — Interview / Demo-Day Prep Q&A

Hard questions a Google Research / AI Futures Fund panel is likely to ask, with answers grounded in what AfroID actually is. Practice saying each answer out loud in under 45 seconds. Where a number belongs, a [BRACKET] marks what to insert.

---

### 1. "What's actually defensible here? Anyone can call Gemini."
The model is the commodity; the **orchestration and the data flywheel** are the moat. AfroID is a multi-agent pipeline — zero-question Architect intake, a parallel CodeGen swarm, AST/QA validation, a human-in-the-loop review loop, and a RegTech compliance layer — plus the accumulating data on which generated code actually ships and survives edits. Every build teaches the system what "good" looks like for African-market software. Swapping in a better base model makes us stronger, not obsolete.

### 2. "How do you know the generated code is any good? What's your eval story?"
Today: every build runs an **AST syntax-validation pass**, and the IDE has an integrated test-runner that surfaces failures inline. Honestly, that's necessary but not sufficient — a rigorous, automated **eval harness** for functional correctness and quality is exactly the capability I'd build with Google Research's mentorship. That's a specific, concrete reason I'm applying, not hand-waving.

### 3. "Why you? Why are you the right founder for this?"
[Your background — engineering depth, African market knowledge, why this problem is personal.] I've already shipped a real 12-service platform on Google Cloud solo/with [team], which shows I can build and operate this, not just pitch it.

### 4. "Why now?"
Two years ago models couldn't produce coherent multi-file software; now Gemini can. AfroID is the orchestration layer that converts that step-change into finished products. The window is open now, and building it for African markets first — mobile-first, compliance-aware, cost-sensitive — is a position no incumbent is taking.

### 5. "What's the African-market wedge? Why not just a global Cursor/Replit?"
The wedge is **talent access**: the constraint here isn't tooling for existing engineers, it's that most founders can't hire engineers at all. AfroID targets the founder with an idea and no dev team. We build in African constraints by default (mobile-first, offline-tolerant, local compliance) and route to formation/RegTech, which global IDE tools ignore.

### 6. "What's your traction?"
[Be direct and specific: "Pre-revenue, with [N] pilot users and [N] builds run; [design partner] in discussion."] I'm not going to inflate it — the reason I'm applying to the Lab is precisely to convert a working platform into distribution and a first paying cohort, which is what the program's go-to-market support and Futures Fund intros unlock.

### 7. "What would you do with early access to Gemini/Gemma and the funding?"
Three things: (1) run the agent swarm on stronger/cheaper models to raise build quality and cut cost per build; (2) build the eval + quality harness with Research mentorship; (3) fund distribution to reach [N] founders and the first paying cohort in [timeframe]. Concrete milestones, not "hire and grow."

### 8. "What are the unit economics? Swarms of LLM calls are expensive."
Each build is [rough token/cost estimate] today. The parallel swarm is the cost driver, so the levers are model tiering (cheap models for scaffolding, strong models for hard milestones — already how the model registry is structured), caching, and right-sizing context. Cheaper frontier access from the Lab directly improves margin. [If you have a price point: "we can charge [X] per build/seat against [Y] cost."]

### 9. "What's the biggest technical risk?"
Generated-code correctness at scale, and safe execution of that code. I've been explicit about both: validation is currently AST-level, and code execution needs a hardened sandbox before untrusted multi-tenant use. I know exactly what the production-hardening path is — auth on the execution path, a sandbox runner, an eval pipeline — and can walk you through it. *(Signals engineering maturity: you know your gaps.)*

### 10. "Is this a real company or a demo?"
Real infrastructure: 12 services live on Cloud Run, durable Postgres state, decoupled build execution with retries, WebSocket streaming, least-privilege security, scale-to-zero. I can show you the Cloud Run console. It's early on traction, production-grade on backbone.

### 11. "Who's the team?"
[Founder(s), roles, relevant history. If solo: "solo founder today; the platform's breadth is the evidence I can execute; first hires with Lab support would be [roles]."]

### 12. "How is this safe / responsible? You're auto-generating and running code."
Human-in-the-loop on every code change (the review queue), validation before anything is accepted, a compliance agent for regulatory checks, and a clear plan to sandbox execution. Responsible-AI framing matters to this panel — lead with the human-in-the-loop design.

---

## Delivery reminders
- Lead with the concrete, cut the adjectives. One real number beats a paragraph of vision.
- On weaknesses (traction, evals, sandbox), name them first and frame each as *why you're applying* — panels trust founders who see their own gaps.
- Bridge every answer back to one of: **real platform already built**, **Gemini/GCP-native**, **African talent-access wedge**, **human-in-the-loop responsibility**.
- Practice the three demo lines until they're reflex (see the demo script).
