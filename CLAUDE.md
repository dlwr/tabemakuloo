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

## Service Implementation Plan

### Phase 1: MVP (最優先実装)
1. **Tumblr** - メイン機能、多様な投稿形式（photo, text, link, quote等）
2. **Chrome Bookmarks** - ローカルブックマーク機能（Chrome API使用）
3. **Pocket** - Read Later機能（シンプルなAPI、高人気）
4. **Twitter** - ツイート投稿（標準的なOAuth 2.0実装）

### Phase 2: 主要サービス
1. **Google Bookmarks** - Googleアカウント連携
2. **Hatena Bookmark** - 日本市場重要サービス
3. **Pinterest** - 画像系コンテンツ投稿
4. **Instapaper** - Read Later機能の代替

### Phase 3: 拡張機能
1. **Evernote** - ノート作成機能
2. **Flickr** - 写真管理
3. **Gmail** - メール送信機能
4. **その他のニッチサービス**

### サービス認証方式分類

**OAuth 2.0系:** Twitter, Tumblr, Evernote, Flickr
**API Key系:** Pocket, Instapaper, Hatena Bookmark
**ブラウザAPI系:** Chrome Bookmarks, Google Bookmarks
**Session/Cookie系:** 一部のレガシーサービス

### 技術的考慮事項

**セキュリティ:**
- Manifest V3のCSP準拠
- OAuth 2.0 PKCE使用
- トークンの暗号化ストレージ

**パフォーマンス:**
- サービス並列投稿
- 認証情報キャッシュ
- 動的モジュール読み込み

**UX改善:**
- リアルタイム投稿状況表示
- エラー時の分かりやすいメッセージ
- 投稿履歴管理