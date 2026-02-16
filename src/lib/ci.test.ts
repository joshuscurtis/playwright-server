import { describe, it, expect } from "vitest";
import { detectCI } from "./ci";

describe("CI detection", () => {
  it("detects GitHub Actions", () => {
    const result = detectCI({
      GITHUB_ACTIONS: "true",
      GITHUB_HEAD_REF: "feature-branch",
      GITHUB_SHA: "abc123",
      GITHUB_SERVER_URL: "https://github.com",
      GITHUB_REPOSITORY: "org/repo",
      GITHUB_RUN_ID: "12345",
      GITHUB_EVENT_NAME: "push",
    });

    expect(result).toEqual({
      provider: "github",
      branch: "feature-branch",
      commitSha: "abc123",
      commitMessage: "push",
      buildUrl: "https://github.com/org/repo/actions/runs/12345",
    });
  });

  it("detects GitLab CI", () => {
    const result = detectCI({
      GITLAB_CI: "true",
      CI_COMMIT_REF_NAME: "main",
      CI_COMMIT_SHA: "def456",
      CI_COMMIT_MESSAGE: "fix: something",
      CI_JOB_URL: "https://gitlab.com/job/1",
    });

    expect(result).toEqual({
      provider: "gitlab",
      branch: "main",
      commitSha: "def456",
      commitMessage: "fix: something",
      buildUrl: "https://gitlab.com/job/1",
    });
  });

  it("detects Jenkins", () => {
    const result = detectCI({
      JENKINS_URL: "https://jenkins.example.com",
      GIT_BRANCH: "develop",
      GIT_COMMIT: "789xyz",
      BUILD_URL: "https://jenkins.example.com/job/1",
    });

    expect(result).toEqual({
      provider: "jenkins",
      branch: "develop",
      commitSha: "789xyz",
      buildUrl: "https://jenkins.example.com/job/1",
    });
  });

  it("detects CircleCI", () => {
    const result = detectCI({
      CIRCLECI: "true",
      CIRCLE_BRANCH: "test-branch",
      CIRCLE_SHA1: "circle123",
      CIRCLE_BUILD_URL: "https://circleci.com/build/1",
    });

    expect(result).toEqual({
      provider: "circleci",
      branch: "test-branch",
      commitSha: "circle123",
      buildUrl: "https://circleci.com/build/1",
    });
  });

  it("detects generic CI", () => {
    const result = detectCI({ CI: "true" });
    expect(result).toEqual({
      provider: "unknown",
      branch: undefined,
      commitSha: undefined,
    });
  });

  it("returns null when not in CI", () => {
    expect(detectCI({})).toBeNull();
  });

  it("prefers GITHUB_HEAD_REF over GITHUB_REF_NAME for PR branches", () => {
    const result = detectCI({
      GITHUB_ACTIONS: "true",
      GITHUB_HEAD_REF: "pr-branch",
      GITHUB_REF_NAME: "merge-ref",
      GITHUB_SHA: "abc",
    });
    expect(result?.branch).toBe("pr-branch");
  });
});
