module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  globalSetup: "<rootDir>/src/__tests__/global-setup.ts",
  transform: {
    "^.+\\.[tj]sx?$": [
      "ts-jest",
      {
        isolatedModules: true,
        tsconfig: "tsconfig.json",
      },
    ],
  },
  transformIgnorePatterns: ["node_modules/(?!(uuid|@handoverkey)/)"],
  moduleNameMapper: {
    "^@handoverkey/shared$": "<rootDir>/../../packages/shared/src/index.ts",
    "^@handoverkey/shared/src/(.*)$": "<rootDir>/../../packages/shared/src/$1",
    "^@handoverkey/database$": "<rootDir>/../../packages/database/src/index.ts",
    "^@handoverkey/database/src/(.*)$":
      "<rootDir>/../../packages/database/src/$1",
    "^@handoverkey/crypto$": "<rootDir>/../../packages/crypto/src/index.ts",
    "^@handoverkey/crypto/src/(.*)$": "<rootDir>/../../packages/crypto/src/$1",
    // Strip .js extension for local imports when running in Jest/CommonJS
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  rootDir: ".",
};
