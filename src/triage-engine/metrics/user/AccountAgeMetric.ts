/**
 * Checks if the author's account is old enough to contribute.
 */
import {
  AccountAgeConfig,
  Metric,
  MetricResult,
  PullRequestContext,
  TriageConfig,
} from '../../types';
import { MessageProvider } from '../../../helpers/MessageProvider';
import { BaseEvaluator } from '../../BaseEvaluator';

export class AccountAgeMetric extends BaseEvaluator<AccountAgeConfig> implements Metric {
  readonly id = 'account_age';
  protected getConfig(config: TriageConfig): AccountAgeConfig {
    return config?.user_metrics?.account_age;
  }

  protected async doEvaluate(
    context: PullRequestContext,
    ageConfig: AccountAgeConfig,
  ): Promise<MetricResult> {
    if (context.authorAccountAgeDays < ageConfig.min_days) {
      return {
        passed: false,
        message: MessageProvider.getInstance().getMessage(
          'metrics.accountAge',
          context.authorAccountAgeDays,
          ageConfig.min_days,
        ),
      };
    }

    return { passed: true };
  }
}
