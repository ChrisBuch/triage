/**
 * Core types for the Triage Engine.
 */

export interface PullRequestContext {
  number: number;
  author: string;
  body: string;
  diff: string;
  authorAccountAgeDays: number;
  linterPassed: boolean;
  userPoints: number;
}

export interface MetricResult {
  passed: boolean;
  message?: string;
}

export interface TriageLevel {
  name: string;
  triggers: string[];
  actions: string[];
}

export interface EngineResult {
  passed: boolean;
  failures: string[];
  triggeredLevels: TriageLevel[];
}

export interface BaseMetricConfig {
  enabled: boolean;
}

export interface AccountAgeConfig extends BaseMetricConfig {
  min_days: number;
}

export interface PointSystemConfig extends BaseMetricConfig {
  min_score: number;
}

export type LinterPassedConfig = BaseMetricConfig;

export interface DetectSlopConfig extends BaseMetricConfig {
  strictness: string;
}

export interface ReviewQualityConfig extends BaseMetricConfig {
  name: string;
  prompt: string;
}

export interface TriageConfig {
  triage_levels: TriageLevel[];
  user_metrics: {
    account_age: AccountAgeConfig;
    point_system: PointSystemConfig;
  };
  code_metrics: {
    linter_passed: LinterPassedConfig;
  };
  ai_checks: {
    detect_slop: DetectSlopConfig;
    review_quality: ReviewQualityConfig[];
  };
}

export interface Metric {
  readonly id: string;
  evaluate(context: PullRequestContext, config: TriageConfig): Promise<MetricResult | null>;
}

export interface AiCheck {
  readonly id: string;
  evaluate(context: PullRequestContext, config: TriageConfig): Promise<MetricResult | null>;
}

export interface AiService {
  analyze(prompt: string, content: string): Promise<string>;
}

export interface StateService {
  getUserPoints(username: string): Promise<number>;
  incrementUserPoints(username: string, points?: number): Promise<void>;
}
