import {
  AiCheck,
  AiService,
  DetectSlopConfig,
  MetricResult,
  PullRequestContext,
  TriageConfig,
} from '../types';
import { MessageProvider } from '../../helpers/MessageProvider';
import { BaseEvaluator } from '../BaseEvaluator';

export class SlopDetectionCheck extends BaseEvaluator<DetectSlopConfig> implements AiCheck {
  readonly id = 'detect_slop';

  constructor(private readonly aiService: AiService) {
    super();
  }

  protected getConfig(config: TriageConfig): DetectSlopConfig {
    return config?.ai_checks?.detect_slop;
  }

  protected async doEvaluate(
    context: PullRequestContext,
    aiConfig: DetectSlopConfig,
  ): Promise<MetricResult> {
    const prompt = MessageProvider.getInstance().getMessage(
      'prompts.slopDetection',
      aiConfig.strictness,
    );
    const content = MessageProvider.getInstance().getMessage(
      'prompts.slopDetectionContent',
      context.body,
      context.diff,
    );

    const analysis = await this.aiService.analyze(prompt, content);

    if (analysis.startsWith('FAIL:')) {
      return {
        passed: false,
        message: analysis.replace('FAIL:', '').trim(),
      };
    }

    return { passed: true };
  }
}
