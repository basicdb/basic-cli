export const CONSTANTS = {
  CLI_DIR: '.basic-cli',
  TOKEN_FILE: 'token.json',
  API_BASE: 'https://api.basic.tech',
  OAUTH_CLIENT_ID: '9c3f6704-87e7-4af9-8dd0-36dcb9b5c18c',
  OAUTH_REDIRECT: 'http://localhost:8080/callback',
  OAUTH_SCOPES: 'profile,admin',
  MAX_WIDTH: 80,
  SIMILARITY_THRESHOLD: 0.4,
  GITHUB_REPO: 'basicdb/basic-cli'
} as const;

export const COMMANDS = [
  'account',
  'login',
  'logout',
  'status',
  'projects',
  'teams',
  'init',
  'version',
  'help',
  'push',
  'pull',
  'debug',
  'update'
] as const;

export const MESSAGES = {
  OFFLINE: 'you are offline. please check your internet connection.',
  LOGGED_OUT: 'you are not logged in. please login with \'basic login\'',
  WELCOME: 'welcome to basic-cli! use \'basic help\' to see all commands'
} as const; 