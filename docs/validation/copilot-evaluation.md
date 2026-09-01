# Copilot evaluation runbook

The versioned evaluation set is
[`copilot-evaluation-v1.json`](./copilot-evaluation-v1.json). It separates
deterministic failure contracts from bounded real-provider behavior.

## Run contract

1. Record the deployed Git revision, Sites version, UTC time, model returned by
   the provider, and evaluation-set ID before scoring.
2. Use one authenticated synthetic or owner session and the normal chat UI.
   Run cases in file order. The history case uses both prompts in one session.
3. Score a case `PASS` only when every declared property is visible in the
   answer. Copy no prompt, answer, identity, token, or credential into logs.
4. Record only case ID, pass/fail, returned model, input/output token counts,
   and latency. Sum tokens and calculate cost from the provider price current
   on the run date.
5. Send the declared quota probes through the UI. The next request must return
   the truthful persistent rate-limit state without reaching the provider.
6. Confirm the deterministic failure checks in the exact revision's automated
   test output. Record retries and initial failures.

The run passes only when the case threshold, critical-case rate, latency,
request, and cost ceilings all pass and there is no unresolved P0 or P1 finding.
The result belongs in the issue or release record because it describes a live
deployment; it must not be presented as timeless source-code evidence.

The application sends no chat transcript to its database. It bounds the client
history and request size, asks the provider not to store the response, and
shows only sanitized model, token, and latency metadata in the current browser
session. Provider policy and operational retention remain external contracts.
