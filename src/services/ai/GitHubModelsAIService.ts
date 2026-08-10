import { AiService } from '../../triage-engine/types';

const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions';

type ChatCompletionResponse = {
  choices: Array<{ message: { content: string } }>;
};

export class GitHubModelsAIService implements AiService {
  constructor(
    private readonly token: string,
    private readonly model: string,
  ) {}

  async analyze(prompt: string, content: string): Promise<string> {
    const response = await fetch(GITHUB_MODELS_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: `${prompt}\n\nContent:\n${content}` }],
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub Models API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    return data.choices[0].message.content;
  }
}
