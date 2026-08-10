import { createHmac } from 'crypto';
import * as github from '@actions/github';
import { StateService } from '../../triage-engine/types';

const SCORES_PATH = '.github/triage-scores.json';

type ScoresFile = {
  scores: Record<string, number>;
  sha: string | undefined;
};

export class HashedFileStateService implements StateService {
  constructor(
    private readonly token: string,
    private readonly salt: string,
  ) {}

  private hashUsername(username: string): string {
    return createHmac('sha256', this.salt).update(username.toLowerCase()).digest('hex');
  }

  protected async readScoresFile(): Promise<ScoresFile> {
    const octokit = github.getOctokit(this.token);
    const { owner, repo } = github.context.repo;

    try {
      const { data } = await octokit.rest.repos.getContent({ owner, repo, path: SCORES_PATH });

      if (Array.isArray(data) || data.type !== 'file' || !('content' in data)) {
        return { scores: {}, sha: undefined };
      }

      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return { scores: JSON.parse(content) as Record<string, number>, sha: data.sha };
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'status' in error &&
        (error as { status: number }).status === 404
      ) {
        return { scores: {}, sha: undefined };
      }
      throw error;
    }
  }

  protected async writeScoresFile(
    scores: Record<string, number>,
    sha: string | undefined,
  ): Promise<void> {
    const octokit = github.getOctokit(this.token);
    const { owner, repo } = github.context.repo;

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: SCORES_PATH,
      message: 'chore: update triage scores [skip ci]',
      content: Buffer.from(JSON.stringify(scores, null, 2)).toString('base64'),
      ...(sha ? { sha } : {}),
    });
  }

  async getUserPoints(username: string): Promise<number> {
    const { scores } = await this.readScoresFile();
    return scores[this.hashUsername(username)] ?? 0;
  }

  async incrementUserPoints(username: string, points = 1): Promise<void> {
    const { scores, sha } = await this.readScoresFile();
    const hash = this.hashUsername(username);
    scores[hash] = (scores[hash] ?? 0) + points;
    await this.writeScoresFile(scores, sha);
  }
}
