# Basic CLI - Go Implementation

This directory contains the original Go implementation of the Basic CLI, which has been migrated to TypeScript (see root directory).

## Directory Structure

```
go/
├── src/
│   └── main.go          # Original Go CLI implementation (2,565 lines)
├── bin/
│   └── readme.md        # Documentation for binary releases
├── go.mod               # Go module definition
├── go.sum               # Go module checksums
├── .goreleaser.yaml     # GoReleaser configuration for releases
├── index.js             # Binary installer script for npm
├── dev.md               # Go development notes
└── README.md            # This file
```

## About the Go Implementation

The Go version was the original implementation of the Basic CLI, built using:

- **Go 1.23.2** - Modern Go runtime
- **Bubble Tea** - Terminal UI framework
- **Huh** - Interactive forms
- **Lipgloss** - Styling and layout
- **OAuth2** - Authentication

### Key Features (Implemented)
- OAuth2 authentication flow
- Interactive project management
- Schema management (push/pull)
- Team management
- Cross-platform binary distribution
- GitHub releases via GoReleaser

## Migration Status

✅ **Migration Complete**: The Go CLI has been fully migrated to TypeScript with 100% feature parity and enhancements.

The TypeScript version (in the root directory) provides:
- All original functionality
- Enhanced user experience with React Ink
- Superior error handling
- Comprehensive test coverage (183 tests)
- Modern development experience

## Why Keep the Go Version?

This Go implementation is maintained for:

1. **Reference**: Understanding original design decisions
2. **Comparison**: Validating feature parity during migration
3. **Fallback**: Backup implementation if needed
4. **Learning**: Educational purposes for Go developers

## Building the Go Version

From this directory:

```bash
# Install dependencies
go mod download

# Build binary
go build -o basic src/main.go

# Run locally
./basic --help
```

## Releasing the Go Version

The Go version uses GoReleaser for automated releases:

```bash
# Create a git tag
git tag -a v1.0.0 -m "release v1.0.0"

# Release with GoReleaser
goreleaser release --clean
```

See `dev.md` for detailed release notes.

## Current Status

🚨 **Deprecated**: The Go version is no longer actively developed. All new features and bug fixes are implemented in the TypeScript version.

For current development, please use the TypeScript implementation in the root directory.

## File Sizes
- `main.go`: 63KB (2,565 lines) - Complete CLI implementation
- `go.mod`: 1.3KB - Module dependencies
- `go.sum`: 5.5KB - Dependency checksums

---

**Note**: This directory was created during the TypeScript migration to organize the legacy Go implementation separately from the new TypeScript codebase. 