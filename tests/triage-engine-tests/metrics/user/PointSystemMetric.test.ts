import { PointSystemMetric } from '../../../../src/triage-engine/metrics/user/PointSystemMetric';
import { PullRequestContext, TriageConfig } from '../../../../src/triage-engine/types';

describe('PointSystemMetric', () => {
  const metric = new PointSystemMetric();
  let baseContext: PullRequestContext;
  let baseConfig: TriageConfig;

  beforeEach(() => {
    baseContext = {
      number: 1,
      author: 'test',
      body: '',
      diff: '',
      linterPassed: true,
      authorAccountAgeDays: 50,
      userPoints: 10,
    };
    baseConfig = {
      triage_levels: [],
      user_metrics: {
        account_age: { enabled: false, min_days: 30 },
        point_system: { enabled: true, min_score: 5 },
      },
      code_metrics: { linter_passed: { enabled: false } },
      ai_checks: {
        detect_slop: { enabled: false, strictness: 'low' },
        review_quality: [],
      },
    };
  });

  it('should pass if points are greater than min_score', async () => {
    const result = await metric.evaluate(baseContext, baseConfig);
    expect(result?.passed).toBe(true);
  });

  it('should fail if points are less than min_score', async () => {
    baseContext.userPoints = 2;
    const result = await metric.evaluate(baseContext, baseConfig);
    expect(result?.passed).toBe(false);
    expect(result?.message).toContain('less than the required 5 points');
  });

  it('should return null if disabled', async () => {
    baseContext.userPoints = 2;
    baseConfig.user_metrics.point_system.enabled = false;
    const result = await metric.evaluate(baseContext, baseConfig);
    expect(result).toBeNull();
  });
});
