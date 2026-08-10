import * as github from '@actions/github';
import { EngineResult } from '../../triage-engine/types';
import { MessageProvider } from '../../helpers/MessageProvider';

export class GitHubInteractionService {
  constructor(private readonly token: string) {}

  async handleResult(result: EngineResult, prNumber: number): Promise<void> {
    const executedActions = new Set<string>();

    for (const level of result.triggeredLevels) {
      for (const action of level.actions) {
        if (!executedActions.has(action)) {
          executedActions.add(action);
          await this.executeAction(action, result, prNumber);
        }
      }
    }
  }

  private async executeAction(
    action: string,
    result: EngineResult,
    prNumber: number,
  ): Promise<void> {
    const octokit = github.getOctokit(this.token);
    const { owner, repo } = github.context.repo;

    if (action === 'comment_structured_error' && result.failures.length > 0) {
      const header = MessageProvider.getInstance().getMessage('github.issuesDetectedHeader');
      const footer = MessageProvider.getInstance().getMessage('github.issuesDetectedFooter');
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: header + result.failures.map((f) => `- ${f}`).join('\n') + footer,
      });
    }

    if (action === 'request_changes' && result.failures.length > 0) {
      const header = MessageProvider.getInstance().getMessage('github.changesRequestedHeader');
      await octokit.rest.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        body: header + result.failures.map((f) => `- ${f}`).join('\n'),
        event: 'REQUEST_CHANGES',
      });
    }

    if (action === 'approve') {
      await octokit.rest.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        event: 'APPROVE',
      });
    }

    if (action === 'close_pr') {
      await octokit.rest.pulls.update({
        owner,
        repo,
        pull_number: prNumber,
        state: 'closed',
      });
    }

    if (action === 'auto_merge') {
      await octokit.rest.pulls.merge({
        owner,
        repo,
        pull_number: prNumber,
        merge_method: 'squash',
      });
    }

    if (action.startsWith('label_')) {
      const label = action.replace('label_', '').replace(/_/g, '-');
      await octokit.rest.issues.addLabels({ owner, repo, issue_number: prNumber, labels: [label] });
    }

    if (action.startsWith('remove_label_')) {
      const label = action.replace('remove_label_', '').replace(/_/g, '-');
      await octokit.rest.issues.removeLabel({ owner, repo, issue_number: prNumber, name: label });
    }
  }
}
