import { BaseMetricConfig, MetricResult, PullRequestContext, TriageConfig } from './types';

export abstract class BaseEvaluator<TConfig extends BaseMetricConfig> {
  abstract readonly id: string;

  protected abstract getConfig(config: TriageConfig): TConfig | undefined;

  protected abstract doEvaluate(
    context: PullRequestContext,
    specificConfig: TConfig,
  ): Promise<MetricResult> | MetricResult;

  async evaluate(context: PullRequestContext, config: TriageConfig): Promise<MetricResult | null> {
    const specificConfig = this.getConfig(config);
    if (!specificConfig || !specificConfig.enabled) {
      return null;
    }
    return this.doEvaluate(context, specificConfig);
  }
}
