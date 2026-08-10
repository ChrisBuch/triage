import * as github from '@actions/github';
import { PullRequestContext } from '../../triage-engine/types';

export class GitHubPullRequestFetcher {
  constructor(private readonly token: string) {}

  async fetchContext(userPoints: number): Promise<PullRequestContext> {
    const octokit = github.getOctokit(this.token);
    const context = github.context;

    if (!context.payload.pull_request) {
      throw new Error('Action must be run on a pull request event');
    }

    const pr = context.payload.pull_request;
    const author = pr.user.login;
    const number = pr.number;
    const body = pr.body || '';

    const { data: diff } = await octokit.rest.pulls.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: number,
      mediaType: { format: 'diff' },
    });

    const { data: userData } = await octokit.rest.users.getByUsername({
      username: author,
    });

    const createdAt = new Date(userData.created_at);
    const now = new Date();
    const ageDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24));

    // Determine linter status by checking PR status checks
    const { data: checks } = await octokit.rest.checks.listForRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: pr.head.sha,
    });

    const externalRuns = checks.check_runs.filter(
      (run) => !run.details_url?.includes(String(context.runId)),
    );
    const linterPassed =
      externalRuns.length > 0 &&
      externalRuns.every(
        (run) =>
          run.conclusion === 'success' ||
          run.conclusion === 'neutral' ||
          run.conclusion === 'skipped',
      );

    return {
      number,
      author,
      body,
      diff: diff as unknown as string,
      authorAccountAgeDays: ageDays,
      linterPassed,
      userPoints,
    };
  }
}
