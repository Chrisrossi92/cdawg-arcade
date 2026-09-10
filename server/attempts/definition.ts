// Immutable v1 definition. Any physics/protocol change requires a new ruleset and digest.
export const RULESET = Object.freeze({
  versionId: '00000000-0000-4000-8000-000000000002',
  id: 'balance-replay-v1',
  simulationDigest: 'a257d27a418dce1e2fb493ec889d317f1aeeb430a98ad18af249dc53f66d8781',
  validatorRevision: 'balance-replay-1',
  tickRate: 60,
  maxTicks: 18000,
  maxEdges: 4096,
  maxEvidenceBytes: 65536,
  countdownMs: 2400,
  submitWindowMs: 330000,
  retryWindowMs: 930000,
  membershipFreshMs: 300000,
});
