import { describe, it, expect, afterEach, vi } from "vitest";
import { detectCI } from "./ci-detect";

describe("Reporter CI detection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("detects GitHub Actions", () => {
    vi.stubEnv("GITHUB_ACTIONS", "true");
    vi.stubEnv("GITHUB_HEAD_REF", "feature/cool");
    vi.stubEnv("GITHUB_SHA", "abc123");
    vi.stubEnv("GITHUB_SERVER_URL", "https://github.com");
    vi.stubEnv("GITHUB_REPOSITORY", "org/repo");
    vi.stubEnv("GITHUB_RUN_ID", "999");

    const ci = detectCI();
    expect(ci?.provider).toBe("github");
    expect(ci?.branch).toBe("feature/cool");
    expect(ci?.commitSha).toBe("abc123");
    expect(ci?.buildUrl).toBe(
      "https://github.com/org/repo/actions/runs/999"
    );
  });

  it("detects GitLab CI", () => {
    vi.stubEnv("GITLAB_CI", "true");
    vi.stubEnv("CI_COMMIT_REF_NAME", "main");
    vi.stubEnv("CI_COMMIT_SHA", "def456");

    const ci = detectCI();
    expect(ci?.provider).toBe("gitlab");
    expect(ci?.branch).toBe("main");
  });

  it("returns null outside CI", () => {
    // Clear any CI env vars
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITLAB_CI;
    delete process.env.CIRCLECI;
    delete process.env.JENKINS_URL;

    const ci = detectCI();
    expect(ci).toBeNull();
  });
});
