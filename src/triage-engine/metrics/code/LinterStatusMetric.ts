import {
  LinterPassedConfig,
  Metric,
  MetricResult,
  PullRequestContext,
  TriageConfig,
} from '../../types';
import { MessageProvider } from '../../../helpers/MessageProvider';
import { BaseEvaluator } from '../../BaseEvaluator';

export class LinterStatusMetric extends BaseEvaluator<LinterPassedConfig> implements Metric {
  readonly id = 'linter_passed';
  protected getConfig(config: TriageConfig): LinterPassedConfig {
    return config?.code_metrics?.linter_passed;
  }

  protected async doEvaluate(
    context: PullRequestContext,
    _linterConfig: LinterPassedConfig,
  ): Promise<MetricResult> {
    if (!context.linterPassed) {
      return {
        passed: false,
        message: MessageProvider.getInstance().getMessage('metrics.linter'),
      };
    }

    return { passed: true };
  }
}
