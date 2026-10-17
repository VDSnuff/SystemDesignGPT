# VoiceOver and Safari human review — Sites version 62

## Review status

**PARTIAL — issue #64 remains open.** This record preserves only the human observations reported on 15–16 October 2026. It does not establish WCAG 2.2 AA compliance or a release-ready verdict. Prepared for publication on 17 October 2026; no new human checks were performed during publication.

The [incremental issue record](https://github.com/VDSnuff/SystemDesignGPT/issues/64#issuecomment-6194727205) contains the same direct reports. The operator prepared the page and transcribed the reviewer's statements; the operator did not independently hear the speech. Exact wording is quoted only where the reviewer supplied it.

## Candidate identity

- Issue: https://github.com/VDSnuff/SystemDesignGPT/issues/64
- Review started: 2026-10-15 (Europe/Warsaw); continued by human report on 2026-10-16.
- Site: https://system-design-studio.v-dovnich.chatgpt.site
- Sites version: 62.
- Source SHA: `e0e5feb8b39539a4e4b72f6abd94fff3ef4623ee`.
- Saved version: `appgprj_6a8cb22f54f88191a25aabef51dde422~appgver_fe53d8efcf548191b329ad7569a5d38d`.
- Deployment: `appgdep_6ad0d3ac0a4c81919e2f797927a24fe9`.
- Native Sites readback at session setup and publication preflight on 17 October: active public Site, latest saved version 62, matching saved source SHA and deployment reference. This records the tested version; later publication of this document does not transfer human results to a different revision.
- macOS: 27.0.1, build 26A434.
- Safari: 27.0.1, build 22625.1.29.11.28.
- VoiceOver: 10, build 993.
- VoiceOver running before review: no. Restore this initial state when the review ends.
- Operator: Codex. Human listener and keyboard reviewer: repository owner.
- Review viewport, browser zoom and VoiceOver verbosity/grouping preferences: not recorded; UNVERIFIED.

## Evidence matrix

Only rows explicitly marked PASS have direct supporting human reports. All other human checks remain UNVERIFIED. Accessibility-tree inspection and prior automated tests do not establish a screen-reader PASS. This record covers the macOS/Safari stack; the second materially different stack remains a separate requirement of the issue.

| ID | Route / surface | Human check | State | Actual announcement / observation |
| --- | --- | --- | --- | --- |
| VO-01 | `/` | Audible VoiceOver speech and first page-link announcement | PASS | Human reviewer reports: “Speech is audible” and “Skip to main content, link.” This row verifies speech and the first link announcement only; skip-link activation is recorded separately below. |
| VO-02a | `/` | Activate skip link and move focus to main content | PASS | Human reviewer reports the announcement “main” and visible focus moving into the page content after Control-Option-Space. Heading navigation and the remaining landmark checks are not inferred. |
| VO-02b | `/` | Heading order, announced levels and heading-rotor navigation | PASS | Reported 2026-10-16: first headings are “System Design Checklist Book,” level 1, then “Section learning lab,” level 2. Selecting the page heading takes the reviewer to it. This covers the reported homepage headings only. |
| VO-02 | `/` and `/chapter/requirements` | Landmarks, heading order, main navigation and focus restoration | UNVERIFIED | Awaiting human review |
| VO-03 | `/book/1-requirements-frs-nfrs-constraints-and-assumptions` | Prose, table headers/cells, code and link purpose | UNVERIFIED | Awaiting human review |
| VO-04 | `/book/practical-system-design-workflow` | Mermaid name and useful nonvisual alternative | UNVERIFIED | Awaiting human review |
| VO-05a | Global search to `/book/9-security` | Search label, result count, result name and keyboard activation | PASS | Reported 2026-10-16: field announces “Search the guide and handbook”; a result count is announced (exact number not supplied); selected result announces “9. Security”; Return opens that page heading. Escape dismissal and focus retention were checked separately in VO-05b. |
| VO-05b | Global search | Escape dismissal, focus retention and collapsed-state announcement | PASS | Reported 2026-10-16: results close, focus stays in the search field, and VoiceOver announces “collapsed.” |
| VO-05 | Global search | Label, result announcements, keyboard activation and Escape | PASS | Covered by the direct human reports in VO-05a and VO-05b. |
| VO-06a | Learning lab on the opened Security page | Tab selected-state announcement and first question access | PASS | Reported 2026-10-16: VoiceOver announces “Quiz, selected,” and the reviewer can reach and hear the first quiz question. Choice selection, feedback, focus retention, and the remaining tabs are not inferred. |
| VO-06b | First Security quiz question | Correct-answer selection, automatic feedback and retained answer focus | PASS | Reported 2026-10-16: reviewer selected the correct answer; VoiceOver automatically announces “Correct” and its explanation; focus stays on that answer. Exact answer wording and explanation were not provided. Incorrect-answer feedback, other questions and remaining tabs are not inferred. |
| VO-06 | Learning lab | Tabs, quiz choices and feedback, focus retention | UNVERIFIED | Awaiting human review |
| VO-07a | Notes & feedback / Private page note | Tab state, field label, text entry and readback | PASS | Reported 2026-10-16: VoiceOver announces “Notes & feedback, selected” and “Private page note.” Reviewer can enter “VoiceOver review test” and hear it read back. At this step the reviewer had not pressed Save or Send; the later signed-out Save attempt is recorded separately. |
| VO-07b-preflight | Status after Save learning work | Establish signed-out status before save attempt | PASS | Human reports the exact existing message: “Sign in to load learning work. Your work remains available; edit it and try saving again.” At this preflight step Save had not been activated. This establishes the displayed precondition only, not a new save result or automatic error announcement. |
| VO-07b | Save learning work and Private page note | Fresh signed-out save error, automatic announcement, retained button focus and preserved note | PASS | Reported 2026-10-16: after the requested Save attempt, VoiceOver automatically announces the sign-in error; focus stays on Save learning work; “VoiceOver review test” remains in the note. The reviewer did not provide the fresh error's exact wording. Authenticated saving/conflicts and persistence after refresh are not inferred. |
| VO-07 | Notes and progress | Tested signed-out note editing and recoverable save failure | PASS | Scoped to VO-07a and VO-07b: local editing/readback, sign-in error announcement, focus retention and preservation without refresh. Authenticated saves, progress-specific errors and concurrency remain UNVERIFIED. |
| VO-08a | Signed-out Design copilot | Status, unavailable question controls and fallback-link discovery | PASS | Reported 2026-10-16: VoiceOver announces “Sign in required”; the question field and Send question button are unavailable; reviewer can find “Open section learning lab.” No submission was requested. Fallback-link activation, provider responses and dynamic transcript announcements are not inferred. |
| VO-08b | Open section learning lab | Fallback-link activation, destination announcement and focus movement | PASS | Reported 2026-10-16: activating the link announces “Section learning lab,” visible focus moves into that section, and the reviewer remains on the same page. This does not prove provider or dynamic transcript states. |
| VO-08 | Copilot | Status, labeled input, dynamic announcements and bounded live region | UNVERIFIED | Awaiting human review; no paid provider call planned |
| VO-09 | `/workshop` | Canvas navigation, node controls, connections and keyboard alternatives | UNVERIFIED | Awaiting human review |
| VO-10 | `/owner/comments` | Available shell and authorization messaging | UNVERIFIED | Authenticated owner actions require an approved owner session and synthetic fixtures |
| VO-11 | Home, guide, handbook and workshop | Actual 200% and 400% Safari zoom, focus visibility, reflow and control reachability | UNVERIFIED | Awaiting human review; record actual supported zoom levels |

## Skips, retries, and unavailable evidence

- PASS applies only to the exact reported interaction and the tested version 62. Aggregate rows that still contain untested states remain UNVERIFIED.
- Remaining Mac checks: Requirements-table headers/cells and code/link semantics; Mermaid description and nonvisual comprehension; wider landmarks/navigation; incorrect-answer feedback; workshop controls and keyboard alternatives; owner shell; actual 200%/400% Safari zoom and focus/reflow.
- Page-title announcement, viewport/orientation, high contrast, reduced motion and the full status/control contrast matrix were not recorded in this human session. Automated coverage is separate evidence.
- Authenticated saves/conflicts, populated owner actions and real-provider responses were not exercised. The signed-out checks cannot pass those states.
- A second materially different screen-reader stack and physical iOS/Android checks remain outstanding. Mac-only reports cannot complete issues #64, #95 or #70.
- No account credentials, personal notes, raw headers or paid-provider requests were recorded. No Send to owner action was requested.

## Findings

Setup limitation at VO-07a continuation: a fresh native Safari connection showed Start Page, not the human review tab. The operator did not navigate, replace text or submit anything. The operator could not independently confirm current sign-out status through that connection. The human subsequently reported the exact displayed signed-out message in VO-07b-preflight; no save result is inferred. This is a verification limit, not a reproduced product defect.

No product defect was reported in the completed checks. This is not a verdict on untested states or unresolved accessibility findings. Distinguish a VoiceOver command/setup issue from a reproduced application defect before assigning severity.

## Cleanup and system-state restoration

- A dedicated Safari review tab was opened during setup; existing tabs were retained. Current tab/window state was not changed during publication.
- VoiceOver: initially off; the automated Command-F5 attempt did not activate it. The native Accessibility switch was then changed to on for the review. The reviewer confirmed audible speech. A read-only runtime check on 17 October finds VoiceOver no longer running, matching the initial off state; the operator made no new setting change during publication. Enable it again and reconfirm the environment before continuing.
- Zoom: no zoom test was performed and the operator made no zoom-setting change. Establish and record initial zoom before the remaining zoom checks.
- Synthetic learning fixtures: cleanup confirmed by the human on 2026-10-16. Private page note is empty, and Retry quiz cleared the selected answer. One signed-out Save attempt was previously reported in VO-07b; no Send to owner action was requested. This is human-observed UI cleanup, not a hosted database readback or deletion claim. Reset-status speech was not reported.

## Resume the review

Confirm that Safari is testing the intended deployed version and record any changed OS/browser/VoiceOver version or setting. Enable VoiceOver only for the review and restore its initial state afterward.

The next unreported check is VO-03a: open the canonical Requirements chapter, use the rotor Tables list and report the table name, column headings and whether the FR/NFR rows are understandable without sight. Then test Read diagram description on the workflow page. Do not infer a PASS from the source or accessibility tree.

After those observations, continue the outstanding workshop, owner-shell, zoom and wider-state checks. Keep #64 and #70 open until their full criteria are supported.
