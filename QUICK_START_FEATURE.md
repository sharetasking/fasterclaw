# Quick Start Feature - One-Click OpenClaw Setup

## Overview

Added a one-click start option that allows users to create and chat with OpenClaw instances without needing to configure Telegram. Users can communicate with their instances via an in-app chat window.

## Changes Made

### Backend Changes

1. **Schema Updates** (`packages/shared/src/schemas/instances.ts`):
   - Made `telegramBotToken` optional in `CreateInstanceRequestSchema`
   - Added `quickStart` boolean field (defaults to false)

2. **Provider Interface** (`apps/api/src/services/providers/types.ts`):
   - Made `telegramBotToken` optional in `CreateInstanceConfig`
   - Added `quickStart` boolean field

3. **Docker Provider** (`apps/api/src/services/providers/docker.provider.ts`):
   - Updated `configureOpenClaw()` to support both Telegram and Web channel modes
   - In quick start mode, enables web channel instead of Telegram
   - Only adds `TELEGRAM_BOT_TOKEN` env var if token is provided

4. **Instance Routes** (`apps/api/src/routes/instances.ts`):
   - Added validation: quickStart mode doesn't require Telegram token
   - Added validation: non-quickStart mode requires Telegram token
   - Passes `quickStart` flag to provider

5. **Chat Routes** (`apps/api/src/routes/chat.ts`) - NEW:
   - `POST /instances/:id/chat` - Send messages to OpenClaw instances
   - `GET /instances/:id/chat/history` - Get chat history (placeholder for future)
   - Only works for Docker instances in RUNNING status
   - Communicates with OpenClaw via HTTP API

6. **App Registration** (`apps/api/src/app.ts`):
   - Registered `chatRoutes` with Fastify app

### Frontend Changes

1. **Chat Actions** (`apps/web/src/actions/instances.actions.ts`):
   - Added `sendChatMessage()` server action to communicate with chat endpoint

2. **Chat Component** (`apps/web/src/components/instance-chat.tsx`) - NEW:
   - React component for chat interface
   - Shows messages in a scrollable area
   - Input field with send button
   - Loading states and error handling
   - Only enabled when instance is RUNNING

## Usage

### Creating a Quick Start Instance

When creating an instance, set `quickStart: true` and omit `telegramBotToken`:

```typescript
const result = await createInstance({
  name: "My Quick Start Bot",
  quickStart: true,
  aiModel: "claude-sonnet-4-0",
  region: "lax",
});
```

### Using the Chat Component

Import and use the `InstanceChat` component:

```tsx
import { InstanceChat } from "@/components/instance-chat";

<InstanceChat
  instanceId={instance.id}
  instanceName={instance.name}
  isRunning={instance.status === "RUNNING"}
/>
```

## How It Works

1. **Instance Creation**:
   - User creates instance with `quickStart: true`
   - Backend creates Docker container without Telegram token
   - OpenClaw is configured with web channel enabled instead of Telegram

2. **Chat Communication**:
   - Frontend sends messages via `POST /instances/:id/chat`
   - Backend proxies messages to OpenClaw instance at `http://localhost:{port}/api/v1/chat`
   - OpenClaw processes message and returns response
   - Response is sent back to frontend and displayed in chat UI

## Limitations

- Chat only works for Docker instances (not Fly.io instances)
- Instance must be in RUNNING status
- Requires OpenClaw to have web channel enabled (automatic in quick start mode)
- Chat history is not persisted (can be added later)

## Future Enhancements

- Add chat history persistence in database
- Support WebSocket for real-time communication
- Add typing indicators
- Support file uploads
- Add chat history export
- Support for Fly.io instances (requires different communication method)

## Testing

1. Create a quick start instance:
   ```bash
   curl -X POST http://localhost:3001/instances \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Quick Start",
       "quickStart": true,
       "aiModel": "claude-sonnet-4-0"
     }'
   ```

2. Wait for instance to be RUNNING, then send a chat message:
   ```bash
   curl -X POST http://localhost:3001/instances/<id>/chat \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello!"}'
   ```

## Notes

- The Telegram token option remains fully functional
- Quick start is an additional option, not a replacement
- Both modes can coexist in the same application




