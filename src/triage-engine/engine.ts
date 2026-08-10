import {
  AiCheck,
  AiService,
  EngineResult,
  Metric,
  PullRequestContext,
  TriageConfig,
  TriageLevel,
} from './types';
import { AccountAgeMetric } from './metrics/user/AccountAgeMetric';
import { PointSystemMetric } from './metrics/user/PointSystemMetric';
import { LinterStatusMetric } from './metrics/code/LinterStatusMetric';
import { SlopDetectionCheck } from './ai-checks/SlopDetectionCheck';
import { ReviewQualityCheck } from './ai-checks/ReviewQualityCheck';

export class TriageEngine {
  private readonly metrics: Metric[] = [
    new AccountAgeMetric(),
    new PointSystemMetric(),
    new LinterStatusMetric(),
  ];

  constructor(private readonly aiService?: AiService) {}

  async evaluate(context: PullRequestContext, config: TriageConfig): Promise<EngineResult> {
    const failedIds = new Set<string>();
    const failures: string[] = [];

    for (const metric of this.metrics) {
      const result = await metric.evaluate(context, config);
      if (result && !result.passed) {
        failedIds.add(metric.id);
        if (result.message) failures.push(result.message);
      }
    }

    if (this.aiService) {
      const aiChecks: AiCheck[] = [
        new SlopDetectionCheck(this.aiService),
        ...config.ai_checks.review_quality.map(
          (cfg) => new ReviewQualityCheck(this.aiService!, cfg),
        ),
      ];

      for (const check of aiChecks) {
        const result = await check.evaluate(context, config);
        if (result && !result.passed) {
          failedIds.add(check.id);
          if (result.message) failures.push(result.message);
        }
      }
    }

    const triggeredLevels = this.resolveLevels(config.triage_levels, failedIds);

    return {
      passed: failedIds.size === 0,
      failures,
      triggeredLevels,
    };
  }

  private resolveLevels(levels: TriageLevel[], failedIds: Set<string>): TriageLevel[] {
    const triggered = levels.filter(
      (level) => level.triggers.length > 0 && level.triggers.some((t) => failedIds.has(t)),
    );

    if (triggered.length === 0) {
      const defaultLevel = levels.find((l) => l.triggers.length === 0);
      return defaultLevel ? [defaultLevel] : [];
    }

    return triggered;
  }
}
