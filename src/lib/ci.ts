/** Detects CI provider and extracts metadata from environment variables */
export interface CIMetadata {
  provider: string;
  branch?: string;
  commitSha?: string;
  commitMessage?: string;
  buildUrl?: string;
}

export function detectCI(env: Record<string, string | undefined>): CIMetadata | null {
  // GitHub Actions
  if (env.GITHUB_ACTIONS === "true") {
    return {
      provider: "github",
      branch: env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME,
      commitSha: env.GITHUB_SHA,
      commitMessage: env.GITHUB_EVENT_NAME,
      buildUrl: env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID
        ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`
        : undefined,
    };
  }

  // GitLab CI
  if (env.GITLAB_CI === "true") {
    return {
      provider: "gitlab",
      branch: env.CI_COMMIT_REF_NAME,
      commitSha: env.CI_COMMIT_SHA,
      commitMessage: env.CI_COMMIT_MESSAGE,
      buildUrl: env.CI_JOB_URL,
    };
  }

  // Jenkins
  if (env.JENKINS_URL) {
    return {
      provider: "jenkins",
      branch: env.GIT_BRANCH || env.BRANCH_NAME,
      commitSha: env.GIT_COMMIT,
      buildUrl: env.BUILD_URL,
    };
  }

  // CircleCI
  if (env.CIRCLECI === "true") {
    return {
      provider: "circleci",
      branch: env.CIRCLE_BRANCH,
      commitSha: env.CIRCLE_SHA1,
      buildUrl: env.CIRCLE_BUILD_URL,
    };
  }

  // Generic CI
  if (env.CI === "true") {
    return {
      provider: "unknown",
      branch: env.BRANCH || env.GIT_BRANCH,
      commitSha: env.COMMIT_SHA || env.GIT_COMMIT,
    };
  }

  return null;
}
