import { TriageEngine } from '../../src/triage-engine/engine';
import { AiService, PullRequestContext, TriageConfig } from '../../src/triage-engine/types';

describe('TriageEngine', () => {
  let mockAiService: jest.Mocked<AiService>;
  let engine: TriageEngine;
  let baseContext: PullRequestContext;
  let baseConfig: TriageConfig;

  beforeEach(() => {
    mockAiService = {
      analyze: jest.fn().mockResolvedValue('PASS'),
    };
    engine = new TriageEngine(mockAiService);

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
      triage_levels: [
        {
          name: 'blocker',
          triggers: ['account_age', 'linter_passed'],
          actions: ['close_pr', 'comment_structured_error'],
        },
        {
          name: 'approved',
          triggers: [],
          actions: ['approve'],
        },
      ],
      user_metrics: {
        account_age: { enabled: true, min_days: 30 },
        point_system: { enabled: true, min_score: 5 },
      },
      code_metrics: { linter_passed: { enabled: true } },
      ai_checks: {
        detect_slop: { enabled: true, strictness: 'high' },
        review_quality: [{ name: 'quality', enabled: true, prompt: 'Check stuff' }],
      },
    };
  });

  it('should trigger default level and pass when all checks pass', async () => {
    const result = await engine.evaluate(baseContext, baseConfig);
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
    expect(result.triggeredLevels).toHaveLength(1);
    expect(result.triggeredLevels[0].name).toBe('approved');
  });

  it('should trigger the correct level when a metric fails', async () => {
    baseContext.authorAccountAgeDays = 10;
    const result = await engine.evaluate(baseContext, baseConfig);
    expect(result.passed).toBe(false);
    expect(result.triggeredLevels).toHaveLength(1);
    expect(result.triggeredLevels[0].name).toBe('blocker');
  });

  it('should collect failures from multiple checks', async () => {
    baseContext.authorAccountAgeDays = 10;
    baseContext.linterPassed = false;
    mockAiService.analyze.mockResolvedValue('FAIL: Bad PR');
    const result = await engine.evaluate(baseContext, baseConfig);
    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(4); // age, linter, slop, quality
  });

  it('should trigger multiple levels when different trigger groups fail', async () => {
    const config: TriageConfig = {
      ...baseConfig,
      triage_levels: [
        { name: 'blocker', triggers: ['linter_passed'], actions: ['close_pr'] },
        { name: 'warning', triggers: ['account_age'], actions: ['label_needs-work'] },
        { name: 'approved', triggers: [], actions: ['approve'] },
      ],
    };
    baseContext.linterPassed = false;
    baseContext.authorAccountAgeDays = 10;
    const result = await engine.evaluate(baseContext, config);
    expect(result.triggeredLevels.map((l) => l.name)).toEqual(['blocker', 'warning']);
  });

  it('should not trigger default level when other levels are active', async () => {
    baseContext.authorAccountAgeDays = 10;
    const result = await engine.evaluate(baseContext, baseConfig);
    expect(result.triggeredLevels.map((l) => l.name)).not.toContain('approved');
  });
});
