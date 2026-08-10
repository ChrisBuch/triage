# Triage Bot

[![Build](https://github.com/chrisbuch/triage/actions/workflows/ci.yml/badge.svg?job=build)](https://github.com/chrisbuch/triage/actions/workflows/ci.yml)
![Version](https://img.shields.io/badge/version-v0.1.0-blue)

The goal of this repository is to help (public) repositorys to triage PRs according to their wishes. It is difficult and time consuming for maintainers to overview and then decide on the sheer amount of PRs in some repositories. A triaging tool that is able to check on certain metrics (see Metrics) so maintainers don't have to, could help enormous.

## Usage

Add the triage bot as the last job in your PR workflow, after your CI jobs have completed:

```yaml
# .github/workflows/pr.yml
name: PR Pipeline

on:
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test

  triage:
    needs: [lint, test]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: your-org/triage-bot@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          ai-model: gpt-4o-mini
          config-path: .github/triage-rules.yml
```

> **Note:** `needs: [lint, test]` ensures the triage bot only runs after all CI checks have finished. `if: always()` ensures it still runs even if CI fails, so it can report the failures.

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `github-token` | ✅ | — | GitHub token for API access |
| `scores-salt` | ❌ | — | Secret salt for HMAC-hashing usernames in the scores file. Required if `point_system` is enabled. Store as a repository secret |
| `ai-model` | ❌ | — | GitHub Models model name (e.g. `gpt-4o-mini`). If omitted, AI checks are skipped |
| `config-path` | ❌ | `.github/triage-rules.yml` | Path to your triage config file |

### Available AI models

Any model available via [GitHub Models](https://github.com/marketplace/models).

## Configuration

Create `.github/triage-rules.yml` in your repository:

```yaml
triage_levels:
  - name: blocker
    triggers: [account_age, linter_passed]
    actions: [close_pr, comment_structured_error, label_blocked]

  - name: quality-warning
    triggers: [detect_slop]
    actions: [label_needs-improvement, comment_structured_error]

  - name: approved
    triggers: []
    actions: [approve, remove_label_needs-improvement, label_ready-to-merge]

user_metrics:
  account_age:
    enabled: true
    min_days: 30
  point_system:
    enabled: true
    min_score: 5

code_metrics:
  linter_passed:
    enabled: true
ai_checks:
  detect_slop:
    enabled: true
    strictness: high
  review_quality:
    - name: multi-domain-check
      enabled: true
      prompt: "Check if this PR modifies multiple unrelated domains without a clear reason."
    - name: empty-functions-check
      enabled: true
      prompt: "Check if this PR introduces empty or stub functions with no implementation."
```

## Triage Levels

Levels are evaluated independently — multiple levels can fire on the same PR. A level with **empty `triggers`** is the default and only fires when no other level was triggered.

```yaml
triage_levels:
  - name: my-level
    triggers:         # metric IDs that activate this level (any match is enough)
      - linter_passed
      - account_age
    actions:          # what to do when this level fires
      - close_pr
      - comment_structured_error
```

### Available Actions

| Action | Description |
|---|---|
| `comment_structured_error` | Posts a PR comment listing all failures |
| `request_changes` | Submits a "Request Changes" review |
| `approve` | Submits an "Approve" review |
| `close_pr` | Closes the PR |
| `auto_merge` | Merges the PR (squash) |
| `label_<name>` | Adds a label, e.g. `label_needs-work` → adds label `needs-work` |
| `remove_label_<name>` | Removes a label, e.g. `remove_label_needs-work` |

## Metrics

### User Metrics

| Metric ID | Config key | Description |
|---|---|---|
| `account_age` | `user_metrics.account_age` | Author's GitHub account must be at least `min_days` old |
| `point_system` | `user_metrics.point_system` | Author must have at least `min_score` points. Scores are stored in `.github/triage-scores.json` with HMAC-SHA256 hashed usernames: requires `scores-salt` secret |

### Code Metrics

| Metric ID | Config key | Description |
|---|---|---|
| `linter_passed` | `code_metrics.linter_passed` | All CI checks must have passed |
### AI Checks

| Metric ID | Config key | Description |
|---|---|---|
| `detect_slop` | `ai_checks.detect_slop` | Detects low-quality or AI-generated content (`strictness: low/medium/high`) |
| `<name>` | `ai_checks.review_quality[]` | Custom prompt-based quality check: define as many as you need, each with its own `name` and `prompt` |

The `name` of each `review_quality` entry is also its metric ID for use in `triggers`.

## Testing

### Unit tests

```bash
npm test
```

All metrics, AI checks and the engine are unit-tested with mocked dependencies. No GitHub token, no API key, no external tools needed.

### Testing the action locally with `act`

[`act`](https://github.com/nektos/act) runs GitHub Actions locally using Docker.

```bash
# Install (macOS)
brew install act

# Run the triage job as if a PR was opened
act pull_request --job triage
```

You'll need a `.secrets` file next to the repo:

```
GITHUB_TOKEN=ghp_your_token_here
```

### Testing on GitHub

1. Push this repository to GitHub
2. Create a **second test repository** that uses the action in its workflow:

```yaml
# In the test repo: .github/workflows/pr.yml
- uses: your-org/triage-bot@main
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    config-path: .github/triage-rules.yml
```

3. Open a Pull Request in that test repo — the triage bot will run and comment on it.

> **Tip:** Set all metrics to very low thresholds in the test `triage-rules.yml` (e.g. `min_days: 0`) so every PR passes on the first run, then tighten them to verify failures.

### Background

Recently, I wanted to contribute to an open-source tool I use for a private project. To give something back to something I use for free. 
When I looked for a starting point, I noticed that they stopped using tags like "good first issue". The reason was the AI Slop that they got recently. They had to check on so many low quality PRs, that they had to do something about it. 

When looking further, I saw a lot of complicated PRs to seemingly easy issues. As a new contributor, this was intimidating. Starting out in a new project usually means your initial code won't be optimal, and the last thing I wanted to do was burden the maintainers even further. 

At this point I want to make clear that I don't think AI is bad. I think that the future of software development could be that human + AI program together. 

So I thought: How can I help solve this problem? And my answer was a triaging system for PRs, similar to triage in medicine. 
What if we can triage the AI Slop and the low quality PRs? This way, we can block what needs to be blocked and mentor what is worthy of being mentored! The goal isn't to ban AI (unless a repository explicitly wants to), but to guide the tooling and the human user in the right direction.

My idea is to provide maintainers with a set of metrics and tools. From there, every codebase can create its own custom triaging system, deciding exactly what they want to filter and how they want to handle it.

-Chris 

## How to Contribute

I am building this to help the open-source community, and I would love your help! You absolutely do not need to be a senior engineer to contribute. Since the whole goal of this project is to help beginners contribute without fear, your perspective is incredibly valuable.

Here are a few ways you can jump in right now:

* Share your pain points: Are you a maintainer drowning in PRs? Open a GitHub Discussion and tell me what specific AI behaviors drive you crazy.

* Brainstorm metrics: Have an idea for a metric that proves a PR was written by a human (or a bot)? Open an Issue and let's talk about it.

* Write code: We need help building the actual parsing scripts and GitHub Action wrappers. 

* Test the prototype: Once we have scripts running, we will need people to test them against real-world PRs to see if our logic holds up.

If you have an idea, just open an Issue. Don't worry about it being perfect—let's figure it out together!
