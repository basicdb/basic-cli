# Basic CLI Development Guide

## Overview

This document outlines the development standards, testing practices, and publishing guidelines for the Basic CLI TypeScript project. The CLI is built with React Ink for interactive UI components and follows modern TypeScript best practices.

## 🏗️ Project Architecture

### Core Structure
```
src/
├── lib/              # Core services and utilities
│   ├── auth.ts       # Authentication service
│   ├── api.ts        # API client with type safety
│   ├── errors.ts     # Custom error classes
│   ├── platform.ts   # Cross-platform utilities
│   ├── constants.ts  # Configuration constants
│   ├── version.ts    # Version management
│   ├── config.ts     # Schema file operations
│   └── types.ts      # TypeScript type definitions
├── components/       # React Ink UI components
│   ├── Spinner.tsx   # Loading indicators
│   ├── Table.tsx     # Interactive tables
│   ├── Form.tsx      # Multi-step forms
│   └── InitForm.tsx  # Project initialization
├── commands/         # Command implementations
│   ├── *.ts          # Command logic
│   └── *.tsx         # React Ink commands
└── index.ts          # Main CLI entry point
```

### Design Principles
- **Type Safety First**: Everything must be typed
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Cross-Platform**: Works on macOS, Linux, Windows
- **Performance**: Fast startup, lazy loading, efficient memory usage
- **User Experience**: Interactive, intuitive, with clear feedback

## 🔧 Development Setup

### Prerequisites
- Node.js 18+ with npm
- TypeScript 5.6+
- Git with conventional commit practices

### Initial Setup
```bash
git clone <repository>
cd basic-cli
npm install
npm run build
npm test
```

### Development Workflow
```bash
# Development with hot reload
npm run dev:watch

# Run specific command during development
npm run dev -- login
npm run dev -- projects --help

# Run tests continuously
npm run test:watch

# Build and test before committing
npm run build && npm test
```

## 📝 Code Standards

### TypeScript Guidelines

#### 1. Strict Type Safety
```typescript
// ✅ Good - Explicit types
interface ApiResponse<T> {
  data: T;
  status: number;
  error?: string;
}

// ❌ Bad - Any types
function handleResponse(response: any): any { }
```

#### 2. Error Handling
```typescript
// ✅ Good - Custom error classes
import { ApiError, AuthError } from '../lib/errors.js';

try {
  const result = await apiCall();
} catch (error) {
  if (error instanceof AuthError) {
    throw new Error('Please login first: basic login');
  }
  throw error;
}

// ❌ Bad - Generic error handling
try {
  const result = await apiCall();
} catch (error) {
  console.error(error);
}
```

#### 3. Import/Export Patterns
```typescript
// ✅ Good - Named exports with .js extensions
export { AuthService } from './auth.js';
import { ApiClient } from '../lib/api.js';

// ❌ Bad - Default exports without extensions
export default AuthService;
import ApiClient from '../lib/api';
```

### React Ink Component Guidelines

#### 1. Component Structure
```typescript
// ✅ Good - Typed props with proper structure
interface TableProps {
  data: ProjectData[];
  onSelect?: (item: ProjectData) => void;
  loading?: boolean;
}

export function Table({ data, onSelect, loading = false }: TableProps) {
  // Component logic
}
```

#### 2. Keyboard Navigation
```typescript
// ✅ Good - Consistent key bindings
useInput((input, key) => {
  if (key.upArrow) setSelectedIndex(prev => Math.max(0, prev - 1));
  if (key.downArrow) setSelectedIndex(prev => Math.min(data.length - 1, prev + 1));
  if (key.return) onSelect?.(data[selectedIndex]);
  if (input === 'q') process.exit(0);
});
```

#### 3. Error Display
```typescript
// ✅ Good - Consistent error formatting
if (error) {
  return (
    <Box flexDirection="column">
      <Text color="red">✗ Error: {error.message}</Text>
      {error.suggestion && (
        <Text color="yellow">💡 Suggestion: {error.suggestion}</Text>
      )}
    </Box>
  );
}
```

### Command Implementation Patterns

#### 1. Command Structure
```typescript
// commands/example.ts
import { Command } from 'commander';
import { handleError } from '../lib/errors.js';

export function createExampleCommand(): Command {
  return new Command('example')
    .description('Example command description')
    .option('--flag', 'Flag description')
    .action(async (options) => {
      try {
        await executeExample(options);
      } catch (error) {
        handleError(error);
      }
    });
}

async function executeExample(options: ExampleOptions): Promise<void> {
  // Command implementation
}
```

#### 2. React Ink Commands
```typescript
// commands/interactive.tsx
import React from 'react';
import { render } from 'ink';
import { ExampleComponent } from '../components/ExampleComponent.js';

export async function runInteractiveCommand(options: Options): Promise<void> {
  const { waitUntilExit } = render(<ExampleComponent {...options} />);
  await waitUntilExit();
}
```

## 🧪 Testing Guidelines

### Test Structure
```
tests/
├── commands/         # Command integration tests
├── components/       # React Ink component tests
├── lib/             # Unit tests for utilities
└── unit/            # Legacy unit tests (being migrated)
```

### Testing Standards

#### 1. Unit Tests
```typescript
// ✅ Good - Comprehensive test coverage
describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should authenticate user with valid credentials', async () => {
    const mockResponse = { token: 'valid-token', user: mockUser };
    vi.mocked(fetch).mockResolvedValueOnce(createMockResponse(mockResponse));
    
    const result = await authService.login('test@example.com', 'password');
    
    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password' })
      })
    );
  });

  it('should handle authentication errors gracefully', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
    
    await expect(authService.login('test@example.com', 'password'))
      .rejects.toThrow('Network error');
  });
});
```

#### 2. Component Tests
```typescript
// ✅ Good - React Ink component testing
import { render } from 'ink-testing-library';
import { Table } from '../src/components/Table.js';

describe('Table Component', () => {
  it('should render data correctly', () => {
    const mockData = [
      { id: '1', name: 'Project 1', team: 'Team A' }
    ];
    
    const { lastFrame } = render(<Table data={mockData} />);
    
    expect(lastFrame()).toContain('Project 1');
    expect(lastFrame()).toContain('Team A');
  });

  it('should handle keyboard navigation', () => {
    const mockData = [
      { id: '1', name: 'Project 1', team: 'Team A' },
      { id: '2', name: 'Project 2', team: 'Team B' }
    ];
    
    const { stdin, lastFrame } = render(<Table data={mockData} />);
    
    stdin.write('\u001b[B'); // Down arrow
    expect(lastFrame()).toContain('Project 2'); // Should highlight second item
  });
});
```

#### 3. Integration Tests
```typescript
// ✅ Good - End-to-end command testing
describe('Login Command', () => {
  it('should complete OAuth flow successfully', async () => {
    // Mock OAuth server response
    const mockServer = setupMockOAuthServer();
    
    // Execute command
    const result = await executeCommand(['login']);
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('✓ Successfully logged in');
    
    // Verify token was saved
    const savedToken = await getStoredToken();
    expect(savedToken).toBeTruthy();
    
    mockServer.close();
  });
});
```

### Test Requirements
- **Coverage Target**: 90%+ line coverage
- **All Commands**: Must have integration tests
- **All Components**: Must have UI tests
- **Error Scenarios**: Must test error handling
- **Cross-Platform**: Test platform-specific functionality

### Running Tests
```bash
# Run all tests
npm test

# Watch mode during development
npm run test:watch

# Coverage report
npm run test:coverage

# UI test runner
npm run test:ui

# Run specific test file
npm test -- auth.test.ts
```

## 📦 Build & Deployment

### Build Process
```bash
# TypeScript compilation
npm run build

# Verify build output
ls -la dist/
```

### Build Requirements
- Clean TypeScript compilation (no errors)
- All tests passing
- No linting errors
- Bundle size < 100KB

## 🚀 Release Process

### Using Changesets (Recommended)

#### 1. Development Workflow
```bash
# After making changes, create a changeset
npm run changeset
# Select change type (patch/minor/major)
# Write clear description of changes

# Commit the changeset with your changes
git add .
git commit -m "feat: add new command with changeset"
```

#### 2. Release Workflow
```bash
# Update versions and generate changelog
npm run changeset:version

# Review generated CHANGELOG.md
git add .
git commit -m "chore: release version bump"

# Build and publish
npm run build
npm run changeset:publish

# Push changes and tags
git push
git push --tags
```

### Manual Release (Alternative)
```bash
# Bump version manually
npm version patch  # or minor/major

# Build and publish
npm run build
npm publish

# Push changes
git push
git push --tags
```

### Pre-Release Checklist
- [ ] All tests passing (`npm test`)
- [ ] Clean build (`npm run build`)
- [ ] Manual testing of key commands
- [ ] Changeset created with clear description
- [ ] Version bump is appropriate (semver)
- [ ] CHANGELOG.md is updated

### Post-Release Checklist
- [ ] Verify package published correctly on npm
- [ ] Test installation: `npm install -g @basictech/cli`
- [ ] Verify commands work: `basic --version`
- [ ] Update documentation if needed
- [ ] Announce release if significant

## 🔍 Code Review Guidelines

### Review Checklist
- [ ] **Type Safety**: All code properly typed
- [ ] **Error Handling**: Errors handled gracefully with user-friendly messages
- [ ] **Testing**: Adequate test coverage for new functionality
- [ ] **Performance**: No performance regressions
- [ ] **Cross-Platform**: Code works on all target platforms
- [ ] **Documentation**: Code is self-documenting with clear variable names
- [ ] **Consistency**: Follows established patterns and conventions

### Review Process
1. **Automated Checks**: All CI checks must pass
2. **Manual Review**: At least one team member review
3. **Testing**: Reviewer should test functionality locally
4. **Documentation**: Ensure any new features are documented

## 🐛 Debugging Guidelines

### Debug Commands
```bash
# Debug specific command
DEBUG=basic:* npm run dev -- <command>

# Debug with TypeScript source maps
node --inspect dist/index.js <command>

# Debug tests
npm run test:watch -- --reporter=verbose
```

### Common Issues

#### 1. ESM Import Issues
```typescript
// ✅ Always use .js extensions in imports
import { helper } from './lib/helper.js';

// ✅ Dynamic imports for conditional loading
const { feature } = await import('./lib/feature.js');
```

#### 2. React Ink State Issues
```typescript
// ✅ Proper state management
const [state, setState] = useState(initialState);

// ✅ Cleanup effects
useEffect(() => {
  const cleanup = setupHandler();
  return cleanup;
}, []);
```

#### 3. Cross-Platform Path Issues
```typescript
// ✅ Use path utilities
import { join } from 'path';
const configPath = join(os.homedir(), '.basic', 'config.json');

// ❌ Hardcoded paths
const configPath = `${os.homedir()}/.basic/config.json`;
```

## 📚 Resources

### Documentation
- [React Ink Documentation](https://github.com/vadimdemedes/ink)
- [Commander.js Guide](https://github.com/tj/commander.js)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Testing Framework](https://vitest.dev/)
- [Changesets Documentation](https://github.com/changesets/changesets)

### Internal Resources
- `MIGRATION_PRD.md` - Migration progress and feature parity
- `readme.md` - User-facing documentation
- `.changeset/README.md` - Changesets usage guide

## 🤝 Contributing

### Getting Started
1. Read this development guide thoroughly
2. Set up development environment
3. Run existing tests to ensure everything works
4. Pick an issue or feature to work on
5. Create a branch with descriptive name
6. Make changes following guidelines
7. Write tests for new functionality
8. Create changeset for your changes
9. Submit pull request with clear description

### Commit Convention
```bash
# Format: type(scope): description
feat(commands): add new update command
fix(auth): handle token expiration gracefully
docs(readme): update installation instructions
test(components): add Table component tests
chore(deps): update dependencies
```

### Branch Naming
```bash
feature/add-update-command
fix/auth-token-expiration
docs/development-guide
test/table-component
chore/dependency-updates
```

Remember: The goal is to maintain a high-quality, user-friendly CLI that provides an excellent developer experience. Every change should improve the tool for our users while maintaining backwards compatibility and reliability. 