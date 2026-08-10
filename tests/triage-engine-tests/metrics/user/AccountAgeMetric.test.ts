import { AccountAgeMetric } from '../../../../src/triage-engine/metrics/user/AccountAgeMetric';
import { PullRequestContext, TriageConfig } from '../../../../src/triage-engine/types';

describe('AccountAgeMetric', () => {
  const metric = new AccountAgeMetric();
  let baseContext: PullRequestContext;
  let baseConfig: TriageConfig;

  beforeEach(() => {
    baseContext = {
      number: 1,
      author: 'test',
      body: '',
      diff: '',
      linterPassed: true,
      userPoints: 0,
      authorAccountAgeDays: 50,
    };
    baseConfig = {
      triage_levels: [],
      user_metrics: {
        account_age: { enabled: true, min_days: 30 },
        point_system: { enabled: false, min_score: 0 },
      },
      code_metrics: { linter_passed: { enabled: false } },
      ai_checks: {
        detect_slop: { enabled: false, strictness: 'low' },
        review_quality: [],
      },
    };
  });

  it('should pass if age is greater than min_days', async () => {
    const result = await metric.evaluate(baseContext, baseConfig);
    expect(result?.passed).toBe(true);
  });

  it('should fail if age is less than min_days', async () => {
    baseContext.authorAccountAgeDays = 10;
    const result = await metric.evaluate(baseContext, baseConfig);
    expect(result?.passed).toBe(false);
    expect(result?.message).toContain('less than the required 30 days');
  });

  it('should return null if disabled', async () => {
    baseContext.authorAccountAgeDays = 10;
    baseConfig.user_metrics.account_age.enabled = false;
    const result = await metric.evaluate(baseContext, baseConfig);
    expect(result).toBeNull();
  });
});
