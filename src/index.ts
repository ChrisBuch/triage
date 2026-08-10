import * as core from '@actions/core';
import * as github from '@actions/github';
import { TriageEngine } from './triage-engine/engine';
import { ConfigLoader } from './helpers/ConfigLoader';
import { GitHubPullRequestFetcher } from './services/github/GitHubPullRequestFetcher';
import { GitHubInteractionService } from './services/github/GitHubInteractionService';
import { GitHubModelsAIService } from './services/ai/GitHubModelsAIService';
import { HashedFileStateService } from './services/state/HashedFileStateService';
import { MessageProvider } from './helpers/MessageProvider';

async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('github-token', { required: true });
    const scoresSalt = core.getInput('scores-salt');
    const aiModel = core.getInput('ai-model');
    const configPath = core.getInput('config-path') || '.github/triage-rules.yml';

    const config = ConfigLoader.load(configPath);

    const stateService = scoresSalt ? new HashedFileStateService(githubToken, scoresSalt) : null;
    const aiService = aiModel ? new GitHubModelsAIService(githubToken, aiModel) : undefined;
    const prFetcher = new GitHubPullRequestFetcher(githubToken);
    const interactionService = new GitHubInteractionService(githubToken);

    const pr = github.context.payload.pull_request;

    if (!pr) {
      core.info(MessageProvider.getInstance().getMessage('github.actionOnlyPullRequest'));
      return;
    }

    const username = pr.user.login;
    const userPoints = stateService ? await stateService.getUserPoints(username) : 0;
    const prContext = await prFetcher.fetchContext(userPoints);

    const engine = new TriageEngine(aiService);
    const result = await engine.evaluate(prContext, config);

    await interactionService.handleResult(result, prContext.number);

    if (result.passed && stateService) {
      await stateService.incrementUserPoints(username);
    }

    if (result.passed) {
      core.info(MessageProvider.getInstance().getMessage('github.allChecksPassed'));
    } else {
      core.setFailed(
        MessageProvider.getInstance().getMessage(
          'github.issuesDetectedSummary',
          result.failures.length,
        ),
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(
        MessageProvider.getInstance().getMessage('github.actionFailedWithError', error.message),
      );
    } else {
      core.setFailed(MessageProvider.getInstance().getMessage('github.actionFailedUnknown'));
    }
  }
}

run();
