import { LinterStatusMetric } from '../../../../src/triage-engine/metrics/code/LinterStatusMetric';
import { PullRequestContext, TriageConfig } from '../../../../src/triage-engine/types';

describe('LinterStatusMetric', () => {
  const metric = new LinterStatusMetric();
  let baseContext: PullRequestContext;
  let baseConfig: TriageConfig;

  beforeEach(() => {
    baseContext = {
      number: 1,
      author: 'test',
      body: '',
      diff: '',
      authorAccountAgeDays: 50,
      userPoints: 10,
      linterPassed: true,
    };
    baseConfig = {
      triage_levels: [],
      user_metrics: {
        account_age: { enabled: false, min_days: 30 },
        point_system: { enabled: false, min_score: 5 },
      },
      code_metrics: { linter_passed: { enabled: true } },
      ai_checks: {
        detect_slop: { enabled: false, strictness: 'low' },
        review_quality: [],
      },
    };
  });

  it('should pass if linter passed', async () => {
    const result = await metric.evaluate(baseContext, baseConfig);
    expect(result?.passed).toBe(true);
  });

  it('should fail if linter failed', async () => {
    baseContext.linterPassed = false;
    const result = await metric.evaluate(baseContext, baseConfig);
    expect(result?.passed).toBe(false);
    expect(result?.message).toContain('Linters or CI checks have failed');
  });

  it('should return null if disabled', async () => {
    baseContext.linterPassed = false;
    baseConfig.code_metrics.linter_passed.enabled = false;
    const result = await metric.evaluate(baseContext, baseConfig);
    expect(result).toBeNull();
  });
});
