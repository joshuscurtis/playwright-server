// Global test setup
// This file runs before all test files

// Ensure test environment variables are set
(process.env as Record<string, string>).NODE_ENV = "test";
