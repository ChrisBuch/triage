import { ReviewQualityCheck } from '../../../src/triage-engine/ai-checks/ReviewQualityCheck';
import { AiService, PullRequestContext, ReviewQualityConfig, TriageConfig } from '../../../src/triage-engine/types';

describe('ReviewQualityCheck', () => {
  let mockAiService: jest.Mocked<AiService>;
  let baseContext: PullRequestContext;
  let baseConfig: TriageConfig;
  let checkConfig: ReviewQualityConfig;

  beforeEach(() => {
    mockAiService = { analyze: jest.fn() };

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
        detect_slop: { enabled: false, strictness: 'high' },
        review_quality: [],
      },
    };
    checkConfig = { name: 'quality-check', enabled: true, prompt: 'Check stuff' };
  });

  it('should pass if review quality is good', async () => {
    mockAiService.analyze.mockResolvedValue('PASS');
    const check = new ReviewQualityCheck(mockAiService, checkConfig);
    const result = await check.evaluate(baseContext, baseConfig);
    expect(result?.passed).toBe(true);
  });

  it('should fail if review quality is poor', async () => {
    mockAiService.analyze.mockResolvedValue('FAIL: Missing details');
    const check = new ReviewQualityCheck(mockAiService, checkConfig);
    const result = await check.evaluate(baseContext, baseConfig);
    expect(result?.passed).toBe(false);
    expect(result?.message).toBe('Missing details');
  });

  it('should return null if disabled', async () => {
    const check = new ReviewQualityCheck(mockAiService, { ...checkConfig, enabled: false });
    const result = await check.evaluate(baseContext, baseConfig);
    expect(result).toBeNull();
  });

  it('should run independently per check instance', async () => {
    mockAiService.analyze
      .mockResolvedValueOnce('PASS')
      .mockResolvedValueOnce('FAIL: Empty functions found');

    const check1 = new ReviewQualityCheck(mockAiService, { name: 'check-1', enabled: true, prompt: 'p1' });
    const check2 = new ReviewQualityCheck(mockAiService, { name: 'check-2', enabled: true, prompt: 'p2' });

    const result1 = await check1.evaluate(baseContext, baseConfig);
    const result2 = await check2.evaluate(baseContext, baseConfig);

    expect(result1?.passed).toBe(true);
    expect(result2?.passed).toBe(false);
    expect(result2?.message).toBe('Empty functions found');
  });
});
