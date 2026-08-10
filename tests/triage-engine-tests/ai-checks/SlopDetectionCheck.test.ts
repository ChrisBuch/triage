import { SlopDetectionCheck } from '../../../src/triage-engine/ai-checks/SlopDetectionCheck';
import { AiService, PullRequestContext, TriageConfig } from '../../../src/triage-engine/types';

describe('SlopDetectionCheck', () => {
  let mockAiService: jest.Mocked<AiService>;
  let check: SlopDetectionCheck;
  let baseContext: PullRequestContext;
  let baseConfig: TriageConfig;

  beforeEach(() => {
    mockAiService = {
      analyze: jest.fn(),
    };
    check = new SlopDetectionCheck(mockAiService);

    baseContext = {
      number: 1,
      author: 'test',
      body: 'body',
      diff: 'diff',
      linterPassed: true,
      authorAccountAgeDays: 50,
      userPoints: 10,
    };
    baseConfig = {
      triage_levels: [],
      user_metrics: {
        account_age: { enabled: false, min_days: 30 },
        point_system: { enabled: false, min_score: 5 },
      },
      code_metrics: { linter_passed: { enabled: false } },
      ai_checks: {
        detect_slop: { enabled: true, strictness: 'high' },
        review_quality: [],
      },
    };
  });

  it('should pass if no slop detected', async () => {
    mockAiService.analyze.mockResolvedValue('PASS');
    const result = await check.evaluate(baseContext, baseConfig);
    expect(result?.passed).toBe(true);
  });

  it('should fail if slop detected', async () => {
    mockAiService.analyze.mockResolvedValue('FAIL: Detected slop');
    const result = await check.evaluate(baseContext, baseConfig);
    expect(result?.passed).toBe(false);
    expect(result?.message).toBe('Detected slop');
  });

  it('should return null if disabled', async () => {
    baseConfig.ai_checks.detect_slop.enabled = false;
    const result = await check.evaluate(baseContext, baseConfig);
    expect(result).toBeNull();
  });
});
