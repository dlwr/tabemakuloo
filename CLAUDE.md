# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tabemakuloo is a modern TypeScript reimplementation of taberareloo - a Chrome browser extension for cross-posting content to multiple social media and bookmarking services (Tumblr, Twitter, Hatena Bookmark, Pocket, etc.).

## Architecture

- **Chrome Extension Manifest V3** - Modern extension architecture
- **TypeScript** - Full type safety with strict configuration
- **Vite** - Fast development and building with HMR
- **Background Service Worker** - Handles context menus and cross-service communication
- **Content Scripts** - Extract page data and handle user interactions
- **Popup UI** - Main user interface for posting content
- **Service Layer** - Modular service integrations for each platform

## Common Development Commands

```bash
# Install dependencies
npm install

# Development with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm test
npm run test:coverage
npm run test:ui

# Code quality
npm run lint
npm run lint:fix
npm run typecheck
```

## Directory Structure

```
src/
├── background/     # Service worker for background tasks
├── content/        # Content scripts for page interaction
├── popup/          # Extension popup interface
├── options/        # Settings/configuration pages
├── services/       # Service integrations (Tumblr, Twitter, etc.)
├── types/          # TypeScript type definitions
└── utils/          # Shared utilities
```

## Key Components

- **Background Service**: Manages context menus, message passing, and service coordination
- **Content Script**: Extracts page metadata, handles user selections, communicates with popup
- **Popup Interface**: Main UI for posting content with service selection
- **Service Integrations**: Individual modules for each supported platform's API

## Development Notes

- Uses path aliases (`@/types`, `@/utils`, `@/services`) configured in `tsconfig.json` and `vite.config.ts`
- Extension permissions configured for storage, activeTab, contextMenus, and scripting
- Supports cross-origin requests to service APIs via host_permissions
- Built with webextension-polyfill for cross-browser compatibility

## Testing

- **Vitest** for unit testing with jsdom environment
- Test files should be colocated with source files or in `__tests__` directories
- Coverage reports generated in `coverage/` directory

## Git Workflow & Automation

**Branch Strategy:**
- Main branch: `main` 
- Feature branches: `feature/機能名`
- Bug fix branches: `fix/バグ名`

**Commit Policy:**
- Claude Code has full permission to create commits and pull requests without asking
- Commit messages should be in Japanese and descriptive
- Follow TDD approach: commit tests first, then implementation
- Use conventional commit format when appropriate

**Development Flow:**
1. Create feature branch for each new functionality
2. Implement with TDD approach (test → implementation)
3. Commit frequently with meaningful messages
4. Create PR when feature is complete
5. Merge to main after review (if needed)

**Automated Actions:**
- Claude Code can execute `git commit`, `git push`, `gh pr create` autonomously
- No explicit permission needed for Git operations
- Focus on clean, logical commit history