import {
  AiCheck,
  AiService,
  MetricResult,
  PullRequestContext,
  ReviewQualityConfig,
  TriageConfig,
} from '../types';
import { MessageProvider } from '../../helpers/MessageProvider';
import { BaseEvaluator } from '../BaseEvaluator';

export class ReviewQualityCheck extends BaseEvaluator<ReviewQualityConfig> implements AiCheck {
  get id(): string {
    return this.checkConfig.name;
  }

  constructor(
    private readonly aiService: AiService,
    private readonly checkConfig: ReviewQualityConfig,
  ) {
    super();
  }

  protected getConfig(_config: TriageConfig): ReviewQualityConfig {
    return this.checkConfig;
  }

  protected async doEvaluate(
    context: PullRequestContext,
    checkConfig: ReviewQualityConfig,
  ): Promise<MetricResult> {
    const prompt = MessageProvider.getInstance().getMessage(
      'prompts.reviewQuality',
      checkConfig.prompt,
    );
    const content = MessageProvider.getInstance().getMessage(
      'prompts.reviewQualityContent',
      context.body,
      context.diff,
    );

    const analysis = await this.aiService.analyze(prompt, content);

    if (analysis.startsWith('FAIL:')) {
      return { passed: false, message: analysis.replace('FAIL:', '').trim() };
    }

    return { passed: true };
  }
}
