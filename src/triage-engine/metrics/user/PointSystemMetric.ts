import {
  Metric,
  MetricResult,
  PointSystemConfig,
  PullRequestContext,
  TriageConfig,
} from '../../types';
import { MessageProvider } from '../../../helpers/MessageProvider';
import { BaseEvaluator } from '../../BaseEvaluator';

export class PointSystemMetric extends BaseEvaluator<PointSystemConfig> implements Metric {
  readonly id = 'point_system';
  protected getConfig(config: TriageConfig): PointSystemConfig {
    return config?.user_metrics?.point_system;
  }

  protected async doEvaluate(
    context: PullRequestContext,
    pointConfig: PointSystemConfig,
  ): Promise<MetricResult> {
    if (context.userPoints < pointConfig.min_score) {
      return {
        passed: false,
        message: MessageProvider.getInstance().getMessage(
          'metrics.pointSystem',
          context.userPoints,
          pointConfig.min_score,
        ),
      };
    }

    return { passed: true };
  }
}
