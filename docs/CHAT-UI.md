# Ask the archive: a chat panel with nothing extra in it

The panel lives in `src/components/Ask.tsx`, and its answers come from `src/lib/ask.ts`. It opens from the
nav, from the “Just ask” section, or with <kbd>/</kbd> anywhere on the page.

## Principles

1. **One column, one input.** There are no avatars, names, timestamps, reactions or sidebars. The reader
   only needs the question, the answer and a place to type.
2. **Answers are not boxed.** Answers sit on the page as plain text. The visitor’s own questions get a
   faint tile, enough to tell the two apart at a glance.
3. **Show where answers come from.** A footer line says whether answers come from the case studies on
   this site or from a model. It changes automatically when an endpoint is configured.
4. **Every answer leads to the work.** When an answer mentions projects, they appear as small links
   under it, each with the project’s colour dot, and open the case study.
5. **Suggestions only when it’s empty.** Four starter questions show on first open and disappear once a
   conversation starts.
6. **It stays quiet.** The panel uses the same slow clip-path reveal as the rest of the site, a
   three-dot pulse while thinking, and no sound or badges.

## Anatomy

```
┌──────────────────────────────── 28rem ─┐
│ ● Ask the archive                Close │  header: accent dot, Clash Display title
├────────────────────────────────────────┤
│                                        │
│  What would you like to know           │  empty state: one display line
│  about the work?                       │
│  ┌──────────────────────────────────┐  │
│  │ Which sites have a 3D world…     │  │  four suggestions
│  └──────────────────────────────────┘  │
│                                        │
│              ┌───────────────────────┐ │  your question: a faint tile, right
│              │ Tell me about the…    │ │
│              └───────────────────────┘ │
│  N & K, an invitation book: A Telugu   │  answer: plain text, left
│  wedding invitation you turn…          │
│  [● N & K, an invitation book]         │  links to case studies
│                                        │
├────────────────────────────────────────┤
│ ┌────────────────────────────────┬───┐ │  auto-growing textarea + send
│ │ Ask about a project, a tool…   │ ↑ │ │
│ └────────────────────────────────┴───┘ │
│ Answers come straight from the case…   │  where answers come from
└────────────────────────────────────────┘
```

On phones the panel is full width; on larger screens it is 28 rem against the right edge.

## Behaviour

| Input | Result |
|-------|--------|
| <kbd>/</kbd> outside a text field | Opens the panel and focuses the input |
| <kbd>Enter</kbd> | Sends (ignored while an IME is composing) |
| <kbd>Shift</kbd> + <kbd>Enter</kbd> | New line |
| <kbd>Esc</kbd> | Closes the panel |
| Clicking a project link | Closes the panel and opens that case study |

The answer log is an `aria-live="polite"` region, and each turn carries hidden “You:” and “Answer:”
labels for screen readers. Under reduced motion the reveal and the thinking pulse are switched off.

## Plugging in a model

By default, `answerLocally()` answers from `src/data/projects.ts` with a few intents (contact, tools,
counts, kinds, 3D worlds, the most technical site) and keyword scoring for the rest. No network is used.

To use a model instead, build with an endpoint:

```bash
VITE_ASK_ENDPOINT=https://your-function.example.com/ask npm run build
```

The panel then sends this request:

```http
POST /ask
Content-Type: application/json

{ "messages": [ { "role": "user", "text": "Which sites were built for clients?" } ] }
```

and expects this reply:

```json
{ "reply": "Three: Lotus Constructions, the N & K invitation book and CapQ.", "slugs": ["lotus-constructions", "invitation-book", "capq"] }
```

`slugs` is optional and becomes the links under the answer. If the endpoint fails, the panel falls back
to the local answers without showing an error. Give the model the contents of `projects.ts` as its
context, so it answers from the same facts as the page.
