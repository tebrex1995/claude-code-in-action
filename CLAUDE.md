# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. It uses Claude AI to generate React components via chat, stores them in a virtual file system (never written to disk), and displays them in a live preview using Babel transformation and import maps.

## Development Commands

**Initial setup:**
```bash
npm run setup  # Installs deps, generates Prisma client, runs migrations
```

**Development:**
```bash
npm run dev            # Start dev server with turbopack at localhost:3000
npm run dev:daemon     # Run dev server in background, logs to logs.txt
```

**Testing:**
```bash
npm test              # Run all tests with vitest
npm test -- <path>    # Run specific test file
npm test -- --watch   # Run in watch mode
```

**Other commands:**
```bash
npm run build         # Build for production
npm run lint          # Run ESLint
npm run db:reset      # Reset database (WARNING: deletes all data)
```

## Architecture

### Virtual File System

The core abstraction is `VirtualFileSystem` (src/lib/file-system.ts), an in-memory file tree that never touches the real disk. Files exist only in memory and are serialized to SQLite for persistence.

- All AI-generated code lives in the virtual FS
- Files are stored as a Map<string, FileNode> with parent-child relationships
- Supports all standard operations: create, read, update, delete, rename
- Serializes to JSON for database storage
- The VirtualFileSystem is instantiated per-request on the server and reconstructed from serialized state

### AI Integration Flow

1. User sends message via ChatInterface (src/components/chat/ChatInterface.tsx)
2. Request goes to `/api/chat` route (src/app/api/chat/route.ts)
3. Vercel AI SDK streams Claude responses with tool calling enabled
4. Claude uses two tools to manipulate the virtual FS:
   - `str_replace_editor` (src/lib/tools/str-replace.ts): view, create, edit files
   - `file_manager` (src/lib/tools/file-manager.ts): rename, delete files
5. After stream completes, updated FS + messages are saved to database (if authenticated)
6. Client receives file updates and triggers preview refresh

### Preview System

The preview (src/components/preview/PreviewFrame.tsx) renders AI-generated components in an iframe:

1. All files from VirtualFileSystem are transformed via Babel (src/lib/transform/jsx-transformer.ts)
   - JSX/TSX → JavaScript with automatic React imports
   - Creates blob URLs for each transformed file
2. Import map is generated mapping all file paths to blob URLs
   - Handles absolute paths, relative paths, and `@/` alias
   - External packages loaded from esm.sh
3. HTML document is constructed with:
   - Script type="importmap" for module resolution
   - Tailwind CDN for styling
   - Error boundary for runtime errors
   - Syntax error display for transformation failures
4. Entry point is `/App.jsx` by convention (fallbacks: App.tsx, index.jsx, etc.)

### File Import Convention

All AI-generated files use the `@/` import alias for local imports:
```jsx
// Example: /App.jsx importing /components/Button.jsx
import Button from '@/components/Button'
```

The transformer handles this by mapping `@/` to the root directory `/` in the import map.

### State Management

Two main React contexts provide global state:

- **FileSystemContext** (src/lib/contexts/file-system-context.tsx): Manages client-side virtual FS instance, provides file operations, triggers preview updates
- **ChatContext** (src/lib/contexts/chat-context.tsx): Manages chat state, message history, streaming responses

### Authentication & Projects

- Optional authentication via bcrypt + JWT (src/lib/auth.ts)
- Anonymous users can work without saving (tracked via src/lib/anon-work-tracker.ts)
- Authenticated users can save projects to SQLite via Prisma
- Projects store: name, messages (JSON), and virtual FS data (JSON)
- Database schema: User (email, password) → Project (name, messages, data)

### Mock Provider

When `ANTHROPIC_API_KEY` is not set, a mock provider (src/lib/provider.ts) returns static component code instead of calling Claude. This allows the app to run and be tested without API access.

## File Structure

```
src/
├── app/                       # Next.js App Router
│   ├── api/chat/route.ts     # Streaming AI chat endpoint
│   ├── [projectId]/page.tsx  # Project-specific workspace
│   └── page.tsx              # Homepage / project list
├── components/
│   ├── chat/                 # Chat UI components
│   ├── editor/               # Code editor, file tree
│   ├── preview/              # Preview iframe
│   ├── auth/                 # Sign in/up forms
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── file-system.ts        # Virtual file system implementation
│   ├── transform/            # JSX → JS transformation
│   ├── tools/                # AI tool implementations
│   ├── contexts/             # React contexts
│   ├── prompts/              # AI system prompts
│   ├── auth.ts               # Authentication
│   ├── prisma.ts             # Database client
│   └── provider.ts           # LLM provider (real or mock)
├── actions/                  # Server actions for DB operations
└── generated/prisma/         # Prisma client (generated)
```

## Testing Strategy

Tests use Vitest + Testing Library:
- Component tests in `__tests__/` directories adjacent to components
- Focus on rendering, user interactions, and context integration
- Virtual FS has its own test suite (src/lib/__tests__/file-system.test.ts)
- JSX transformer tested separately (src/lib/transform/__tests__/jsx-transformer.test.ts)

## Important Constraints

1. **Never write to real filesystem**: All generated code stays in VirtualFileSystem
2. **Entry point convention**: AI always creates `/App.jsx` as the main component
3. **Import alias**: All local imports in generated code must use `@/` prefix
4. **No HTML files**: Generated apps are pure React, no index.html needed
5. **Tailwind for styling**: AI uses Tailwind classes, not inline styles
6. **maxSteps limit**: Chat API limits tool calling steps (4 for mock, 40 for real Claude)

## Environment Variables

Optional `.env` file:
```
ANTHROPIC_API_KEY=your-api-key-here  # If omitted, uses mock provider
```

## Database

**Schema**: The database schema is defined in `prisma/schema.prisma` - reference this file to understand the structure of all data stored in the database.

Current schema:
- **User**: id, email, password, timestamps
- **Project**: id, name, userId (optional), messages (JSON), data (JSON), timestamps

Implementation details:
- SQLite via Prisma (prisma/dev.db)
- Migrations in prisma/migrations/
- To modify schema: edit prisma/schema.prisma, then run `npx prisma migrate dev`
- Prisma client generates to src/generated/prisma/ (non-standard location)
