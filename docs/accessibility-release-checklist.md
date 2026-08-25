# Accessibility release checks

**Standard:** WCAG 2.1 AA

**Candidate:** `codex/issue-2-accessibility`

**Checked:** 2026-08-25 on macOS, Chromium, and Safari with VoiceOver

## Automated evidence

- `npm test` covers tab semantics, live-region isolation, Mermaid text alternatives, form recovery, quiz feedback, and persistence states.
- `tests/e2e/accessibility.spec.ts` runs axe-core on the introduction, requirements, a Mermaid section, workshop, and owner comments. Serious and critical violations must be zero.
- The browser suite verifies the skip link, tab arrow/Home/End behavior, 44 CSS-pixel controls, visible focus, reduced motion, and 320 CSS-pixel reflow (the 400% equivalent of a 1280-pixel viewport).
- Existing route smoke tests submit mocked chat responses and exercise the notes/comments surfaces without production credentials.

## Manual assistive-technology record

Safari was opened against the local candidate while macOS VoiceOver was active. VoiceOver was turned off after the checks to restore the prior system state.

| Area | Check | Result |
| --- | --- | --- |
| Navigation | Page exposes “Skip to main content” first, primary navigation, one level-one page heading, and ordered level-two content headings. | Pass |
| Reader | The requirements table is announced as “Scrollable handbook table” followed by its row and cell structure. | Pass |
| Tabs | VoiceOver exposed “Learning lab tools” as a tab group. Right Arrow moved Diagram to Quiz; Quiz became focused and selected, and the Quiz panel replaced the Diagram panel. | Pass |
| Quiz | Selecting the measurable-NFR answer announced “Correct” plus its feedback and exposed the handbook reference. | Pass |
| Save | A signed-out save announced the recoverable error and confirmed that the learner’s work remained available to edit and retry. | Pass |
| Chat | VoiceOver exposed the “Not configured” status, its explanatory alert, the labeled question field, the character instruction, and the disabled send state without treating the full transcript as a live region. | Pass |

Keyboard traversal was also exercised by the Chromium browser suite at desktop and mobile/reflow widths. The mobile copilot test verifies its focus trap, Escape close, focus restoration, and visible question field above the viewport edge.

## Contrast record

| Use | Foreground | Background | Ratio | Requirement | Result |
| --- | --- | --- | ---: | ---: | --- |
| Body/muted text | `#58645d` | `#f4f0e8` | 5.44:1 | 4.5:1 | Pass |
| Kicker/status text | `#517700` | `#f4f0e8` | 4.63:1 | 4.5:1 | Pass |
| Light text | `#ffffff` | `#17201c` | 16.67:1 | 4.5:1 | Pass |
| Accent status | `#d8ff73` | `#17201c` | 14.66:1 | 4.5:1 | Pass |
| Control boundary | `#58645d` | `#f4f0e8` | 5.44:1 | 3:1 | Pass |
| Focus ring, light surface | `#17201c` outer ring | `#f4f0e8` | 14.67:1 | 3:1 | Pass |
| Focus ring, dark surface | `#ffffff` inner ring | `#17201c` | 16.67:1 | 3:1 | Pass |

Status meaning is repeated in text and, where useful, a symbol. Green or red color is never the only cue.

## Release commands

```bash
npm test
npm run lint
npm run check:generated
npm audit --omit=dev --audit-level=high
npm run build
npm run test:e2e
git diff --check
```
