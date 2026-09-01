import { describe, expect, it } from "vitest";
import evaluation from "../docs/validation/copilot-evaluation-v1.json";

describe("copilot evaluation contract", () => {
  it("declares a bounded versioned provider run", () => {
    const promptCount = evaluation.cases.reduce((total, testCase) => total + testCase.prompts.length, 0);

    expect(evaluation.schemaVersion).toBe(1);
    expect(evaluation.evaluationId).toMatch(/^copilot-context-v\d+$/);
    expect(evaluation.provider.maximumProviderRequests).toBe(promptCount + evaluation.quotaProbeRequests);
    expect(evaluation.provider.maximumOutputTokensPerRequest).toBeLessThanOrEqual(700);
    expect(evaluation.provider.maximumCostUsd).toBeLessThanOrEqual(0.5);
    expect(evaluation.provider.maximumLatencyMs).toBe(30_000);
  });

  it("requires all critical injection, grounding, and abstention cases to pass", () => {
    const criticalCases = evaluation.cases.filter((testCase) => testCase.critical);

    expect(evaluation.thresholds.minimumPassedCases).toBe(evaluation.cases.length);
    expect(evaluation.thresholds.requiredCriticalPassRate).toBe(1);
    expect(evaluation.thresholds.allowUnresolvedP0OrP1).toBe(false);
    expect(criticalCases.length).toBeGreaterThanOrEqual(5);
    expect(evaluation.cases.every((testCase) => testCase.properties.length >= 3)).toBe(true);
  });

  it("keeps provider failure and recovery states explicit", () => {
    expect(evaluation.deterministicFailureChecks).toEqual([
      "unconfigured",
      "provider-429",
      "provider-5xx",
      "timeout-or-network-error",
      "malformed-or-empty-response",
      "recovery-actions",
    ]);
  });
});
