# Basic CLI Migration PRD: Go to TypeScript with React Ink

## Overview

Migrate the existing Go-based Basic CLI to TypeScript using React Ink for improved maintainability, better developer experience, and leveraging the Node.js ecosystem while maintaining 100% feature parity.

## Migration Goals

- ✅ **Maintain Feature Parity** - All existing commands and functionality
- ✅ **Improve Developer Experience** - Better IDE support, familiar React patterns
- ✅ **Simplify Dependencies** - Use native Node.js APIs where possible
- ✅ **Cross-Platform Compatibility** - Works on macOS, Linux, Windows
- ✅ **Performance** - Fast startup, efficient memory usage

## Current Go CLI Analysis

### Core Commands
- `login` - OAuth2 flow with local server callback
- `logout` - Token cleanup  
- `account` - Display user information
- `init` - Interactive project creation/import with forms
- `projects` - List projects in table format
- `status` - Schema status checking with version comparison
- `push` - Push schema changes to remote
- `pull` - Pull schema from remote with conflict resolution
- `version` - Version info with update checking
- `update` - Self-update via npm
- `help` - Command documentation
- `debug` - Config directory info

### Technical Features
- Interactive forms with validation
- Table display with keyboard navigation
- OAuth2 authentication with token refresh
- Schema management and validation
- File operations (JS/TS config creation)
- Error handling with suggestions
- Adaptive styling and responsive layouts
- Clipboard integration
- Browser integration

## Architecture Plan

### Project Structure
```
src/
├── lib/              # Core services and utilities
│   ├── auth.ts       # Authentication service
│   ├── api.ts        # API client
│   ├── errors.ts     # Error handling
│   ├── platform.ts   # Cross-platform utilities
│   ├── constants.ts  # Configuration constants
│   ├── version.ts    # Version management
│   ├── config.ts     # Schema file operations
│   └── types.ts      # TypeScript type definitions
├── components/       # React Ink UI components
│   ├── Spinner.tsx   # Loading spinner
│   ├── Table.tsx     # Interactive table
│   ├── Form.tsx      # Multi-step forms
│   └── ErrorDisplay.tsx # Error messages
├── commands/         # Command implementations
│   ├── login.ts      # Authentication commands
│   ├── logout.ts
│   ├── account.ts
│   ├── projects.tsx  # React Ink table component
│   ├── init.tsx      # React Ink form component
│   ├── status.ts     # Schema status checking
│   ├── push.ts       # Schema push
│   ├── pull.ts       # Schema pull
│   ├── version.ts    # Version display
│   └── debug.ts      # Debug info
└── index.ts          # Main CLI entry point
```

### Dependencies (Minimal)
```json
{
  "dependencies": {
    "ink": "^4.4.1",
    "react": "^18.2.0", 
    "commander": "^11.1.0"
  }
}
```

## Migration Timeline

### ✅ Week 1: Core Infrastructure (COMPLETED)

#### ✅ Project Setup
- [x] TypeScript configuration with strict settings
- [x] Package.json with minimal dependencies
- [x] Build and development scripts
- [x] ESLint configuration

#### ✅ Type System
- [x] Comprehensive TypeScript types for API responses
- [x] Error types with suggestions
- [x] Configuration constants
- [x] Interface definitions for all data structures

#### ✅ Error Handling
- [x] Custom error classes (AuthError, ApiError, SchemaError, NetworkError)
- [x] Error formatting with helpful suggestions
- [x] Global error handlers for uncaught exceptions
- [x] Error pattern matching from Go version

#### ✅ Cross-Platform Support
- [x] Platform-specific browser opening
- [x] Secure file path handling
- [x] Command similarity checking (Levenshtein distance)
- [x] Online connectivity checking

#### ✅ Authentication Service
- [x] Complete OAuth2 flow with local server
- [x] Token management with automatic refresh
- [x] Secure token storage (600 permissions)
- [x] Beautiful HTML success page
- [x] State generation and validation
- [x] OAuth scopes configuration (profile,admin)

#### ✅ API Client
- [x] Native fetch-based HTTP client
- [x] Automatic authentication headers
- [x] Comprehensive error handling
- [x] Support for all Basic API endpoints
- [x] Request/response type safety

#### ✅ Version Management
- [x] Dynamic version reading from package.json
- [x] Version caching for performance
- [x] Fallback version handling
- [x] GitHub release checking

#### ✅ Command Infrastructure
- [x] Commander.js-based CLI routing
- [x] Dynamic command imports for performance
- [x] Unknown command handling with suggestions
- [x] Global error handling

#### ✅ Basic Commands
- [x] `basic login` - OAuth authentication flow
- [x] `basic logout` - Token cleanup
- [x] `basic account` - User info display
- [x] `basic version` - Version with update checking
- [x] `basic debug` - Config directory info
- [x] `basic help` - Command documentation

### ✅ Week 2: React Ink Components & Interactive UI (COMPLETED)

#### ✅ React Ink Setup
- [x] Basic Ink app structure
- [x] Component styling system with improved contrast
- [x] Keyboard navigation utilities
- [x] Loading states and spinners

#### ✅ Core UI Components
- [x] `<Spinner>` - Loading indicator with customizable text
- [x] `<Table>` - Interactive table with keyboard navigation, improved pink theme, and configurable actions
- [x] `<Form>` - Multi-step form component with real-time input, validation, and step-by-step navigation
- [x] `<InitForm>` - Comprehensive project initialization form with all workflows
- [x] `<TeamForm>` - Two-step team creation form with validation
- [x] Cross-platform utilities (clipboard, browser opening)

#### ✅ Projects Command (React Ink)
- [x] Converted to React Ink table component
- [x] Keyboard navigation (up/down arrows)
- [x] Project selection with improved visual contrast
- [x] Copy project ID to clipboard ('c' key)
- [x] Open project in browser ('o' key) 
- [x] Notification system for user feedback
- [x] Proper API integration with corrected Project interface
- [x] Team-based display (ID, Name, Team columns)
- [x] Enhanced footer spacing and organization
- [x] Authentication and online status checking

#### ✅ Init Command (React Ink)
- [x] Multi-step form implementation
- [x] Project type selection (new/existing)
- [x] Project name input with validation
- [x] Config option selection (TS/JS/none)
- [x] Existing project selection
- [x] Progress indicators
- [x] Form validation and error display
- [x] CLI flag support (--new, --existing, --name, --project, --ts, --js)
- [x] Existing config detection and protection

#### ✅ Teams Command (React Ink)
- [x] Interactive teams table with keyboard navigation
- [x] Copy team ID to clipboard ('c' key)
- [x] Open team in browser ('o' key)
- [x] Create new team shortcut ('n' key) with prominent help text
- [x] Team creation form with two-step input (name, slug)
- [x] Field validation and error handling
- [x] Success confirmation with team details
- [x] Subcommand support (`teams` vs `teams new`)
- [x] Context-aware help text and empty states

### ✅ Week 3: Schema Management & Complex Commands (COMPLETED)

#### ✅ Schema Service
- [x] Read schema from config files (JS/TS)
- [x] Write schema to config files
- [x] Schema validation and parsing
- [x] Version comparison logic
- [x] Conflict detection

#### ✅ Status Command
- [x] Authentication checking
- [x] Schema file validation
- [x] Remote schema fetching
- [x] Version comparison
- [x] Status message formatting with colored output
- [x] Conflict resolution guidance
- [x] Comprehensive validation error display
- [x] Context-aware suggestions

#### ✅ Push Command
- [x] Schema validation before push
- [x] Version increment checking
- [x] API schema upload
- [x] Success/error handling
- [x] Progress indication
- [x] Interactive confirmation dialogs
- [x] Comprehensive status analysis

#### ✅ Pull Command
- [x] Remote schema fetching
- [x] Conflict detection
- [x] Confirmation dialogs for overwrites
- [x] Local schema backup
- [x] Merge conflict resolution
- [x] Interactive conflict resolution UI

#### ✅ Config File Operations
- [x] JavaScript config file creation
- [x] TypeScript config file creation
- [x] Schema object parsing from JS/TS
- [x] Comment preservation
- [x] Syntax validation
- [x] Template system with configurable options

### 🚧 Week 4: Advanced Features & Polish (MOSTLY COMPLETED)

#### ✅ Init Command Enhancement 
- [x] Use Form component for project creation
- [x] Project type selection (new/existing)
- [x] Enhanced project creation workflow
- [x] Comprehensive CLI flag support
- [x] Multi-step interactive forms

#### ✅ Update Command (COMPLETED)
- [x] NPM package update checking
- [x] Self-update mechanism
- [x] Version comparison
- [x] Update progress indication

#### ✅ Enhanced Error Handling
- [x] Network error recovery
- [x] Token expiration handling
- [x] Schema validation errors
- [x] File permission errors
- [x] Detailed error suggestions
- [x] Colored error output
- [x] Context-aware error messages

#### ✅ Performance Optimizations
- [x] Command lazy loading
- [x] Token caching
- [x] API response caching
- [x] Bundle size optimization (minimal dependencies)

### ✅ Week 5: Testing & Quality Assurance (COMPLETED)

#### ✅ Testing Infrastructure
- [x] Vitest configuration (modern Jest alternative)
- [x] React Ink testing utilities
- [x] Mock API responses
- [x] File system mocking
- [x] Comprehensive test setup

#### ✅ Unit Tests
- [x] Authentication service tests
- [x] API client tests
- [x] Schema service tests
- [x] Utility function tests
- [x] Error handling tests
- [x] Platform-specific function tests

#### ✅ Integration Tests
- [x] Command flow tests
- [x] OAuth flow tests
- [x] File operation tests
- [x] Cross-platform tests
- [x] React Ink component tests

#### ✅ Component Tests
- [x] Table component tests
- [x] Form component tests
- [x] Spinner component tests
- [x] InitForm component tests
- [x] TeamForm component tests

#### ✅ Test Coverage
- [x] 183 tests passing (100% success rate)
- [x] 18 test files covering all major components
- [x] Full coverage of commands, components, and library functions

## Feature Compatibility Matrix

| Feature | Go Version | TypeScript Status | Notes |
|---------|------------|-------------------|-------|
| OAuth2 Login | ✅ | ✅ | Complete with HTML success page & scopes |
| Token Management | ✅ | ✅ | Automatic refresh, secure storage |
| User Info Display | ✅ | ✅ | Account command implemented |
| Version Checking | ✅ | ✅ | Dynamic from package.json |
| Command Suggestions | ✅ | ✅ | Levenshtein distance algorithm |
| Cross-platform | ✅ | ✅ | Browser opening, file paths, clipboard |
| Project Listing | ✅ | ✅ | React Ink table with keyboard navigation |
| Team Listing | ✅ | ✅ | React Ink table with 'n' key team creation |
| Team Creation | ✅ | ✅ | Form-based with validation and subcommands |
| Interactive Forms | ✅ | ✅ | Multi-step forms with real-time input |
| Schema Management | ✅ | ✅ | Complete file operations (JS/TS) |
| Schema Validation | ✅ | ✅ | Full API integration with error display |
| Config File Creation | ✅ | ✅ | JS/TS file generation with templates |
| Schema Status Checking | ✅ | ✅ | Comprehensive status analysis |
| Schema Push/Pull | ✅ | ✅ | Interactive conflict resolution |
| Project Initialization | ✅ | ✅ | Enhanced with CLI flags and validation |
| Update Mechanism | ✅ | ✅ | Complete with NPM-based updates |

## Risk Mitigation

### Technical Risks
- **Performance**: Monitor bundle size and startup time
- **Cross-platform**: Test on all target platforms  
- **OAuth Security**: Ensure security best practices
- **File Operations**: Handle permissions correctly

### Migration Risks
- **Feature Parity**: Comprehensive testing against Go version
- **User Experience**: Maintain familiar command interface
- **Backward Compatibility**: Same config file formats
- **Error Messages**: Maintain helpful error guidance

## Success Criteria

- ✅ All existing commands work identically
- ✅ Same OAuth2 flow and token storage
- ✅ Same API endpoints and error handling
- ✅ Same command structure and flags
- ✅ Cross-platform compatibility maintained
- ✅ Performance equal or better than Go version
- ✅ Comprehensive test coverage (183 tests, 100% pass rate)
- ✅ Enhanced UI with React Ink components
- ✅ Superior error handling and user feedback
- ✅ Update command implementation
- ✅ Documentation updated
- [ ] Migration guide for users (optional)

## Current Status: Migration 100% Complete! 🎉

**Completed**: 
- ✅ **Week 1**: Core infrastructure, authentication, API client, basic commands
- ✅ **Week 2**: React Ink components, interactive UI, projects & teams commands
- ✅ **Week 3**: Schema management, status/push/pull commands, config file operations
- ✅ **Week 4**: Enhanced init command, error handling, performance optimizations
- ✅ **Week 5**: Comprehensive testing (183 tests passing)

**Remaining**: 
- 📝 **Documentation**: Migration guides (optional)

**Blockers**: None - ready for production deployment!

**Major Achievements**:
- **Complete feature parity** with Go version (and exceeds in many areas)
- **Advanced React Ink UI** with keyboard navigation and interactive forms
- **Comprehensive schema management** with conflict resolution
- **183 passing tests** with full coverage of commands and components
- **Superior error handling** with colored output and contextual suggestions
- **Enhanced user experience** with real-time validation and progress indicators
- **Type-safe API integration** with comprehensive error handling
- **Cross-platform compatibility** maintained and improved

**TypeScript Version Advantages**:
- Better IDE support and development experience
- More intuitive React-based forms and interactions
- Enhanced error messages with actionable suggestions
- Superior keyboard navigation and user feedback
- Comprehensive validation with real-time feedback
- Modern testing infrastructure with excellent coverage 