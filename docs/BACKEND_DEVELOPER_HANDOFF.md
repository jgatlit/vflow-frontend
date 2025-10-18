# Backend Developer Handoff - Visual Flow

**Date:** 2025-10-18
**Frontend Version:** Latest (commit: 8befbe2)
**Purpose:** Bring backend to parity with frontend data persistence features

---

## Executive Summary

The frontend has implemented a comprehensive **browser-based data persistence layer** using **Dexie.js + IndexedDB**. This document outlines the optional backend enhancements needed for:

1. **Cloud sync** - Cross-device flow access
2. **Team collaboration** - Shared flows and permissions
3. **Server-side execution history** - Persistent execution analytics
4. **Backup and recovery** - PostgreSQL-backed flow storage

**Critical Note:** The current implementation is **fully functional** without backend changes. All persistence works locally in the browser. Backend integration is **optional** for advanced features.

---

## 🎯 Current Frontend State

### What's Already Implemented (Frontend-Only):

✅ **Flow Persistence**
- Dexie.js database with Flow and Execution tables
- Auto-expanding metadata (40+ fields per flow)
- Device tracking (OS, browser, screen resolution)
- Version history with semantic versioning
- Soft delete pattern throughout

✅ **Autosave System**
- 2-second debounced autosave on changes
- Visual status indicator (⏳ Saving → ✓ Saved → ⚠️ Error)
- Dirty state tracking
- Only autosaves flows that have been manually saved once

✅ **Execution Tracking**
- createExecutionWithMetadata() before flow run
- completeExecutionWithMetadata() after completion
- Auto-calculated metrics: duration, tokens, success rate
- Error tracking with stack traces
- Performance metrics (node execution times, API call count)

✅ **Flow List UI**
- Real-time updates via Dexie live queries
- Search by name, tags, description
- Sort by: updated, created, name, executions
- Rich metadata display (success rate, execution count, version)
- Soft delete with recovery capability

### What Works Locally:

- ✅ Save flows with full metadata
- ✅ Autosave every 2 seconds
- ✅ Load flows from database
- ✅ Track execution history
- ✅ Search and filter flows
- ✅ View execution metrics
- ✅ Device and environment tracking
- ✅ Version history

### What Needs Backend (Optional):

- ❌ Cross-device sync
- ❌ Team collaboration
- ❌ Server-side backup
- ❌ Cloud-based execution history
- ❌ Multi-user permissions
- ❌ Organization-level analytics

---

## 📊 Database Schema Comparison

### Frontend Schema (Dexie.js + IndexedDB)

#### Flow Table

```typescript
interface Flow {
  // Core Identity
  id: string; // UUID v4
  name: string;
  description?: string;

  // Authorship & Collaboration
  author?: string;
  contributors?: string[];
  organization?: string;

  // Timestamps (ISO 8601)
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  publishedAt?: string;

  // Categorization
  tags?: string[];
  category?: string;
  visibility?: 'private' | 'team' | 'public';

  // Versioning
  version: string; // "1.0.0"
  versionHistory?: { version: string; timestamp: string; changes: string }[];
  parentFlowId?: string;

  // Device & Environment (auto-populated)
  createdOnDevice?: DeviceInfo;
  lastModifiedOnDevice?: DeviceInfo;
  userAgent?: string;

  // Usage Statistics
  executionCount?: number;
  lastExecutedAt?: string;
  avgExecutionTime?: number;
  successRate?: number;

  // Status & Lifecycle
  status?: 'draft' | 'active' | 'archived' | 'deprecated';
  isTemplate?: boolean;
  isFavorite?: boolean;

  // Content
  flow: ReactFlowJsonObject; // The actual workflow definition
  thumbnail?: string;
  readme?: string;

  // Soft Delete
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

interface DeviceInfo {
  deviceType: 'desktop' | 'mobile' | 'tablet';
  os: string; // "Windows 10", "macOS 14.1"
  browser: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  timestamp: string; // ISO 8601
}
```

#### Execution Table

```typescript
interface Execution {
  // Core Identity
  id: string; // UUID v4
  name?: string;
  description?: string;

  // Flow Reference
  flowId: string;
  flowName: string; // Snapshot at execution time
  flowVersion: string;

  // Status & Timing
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string; // ISO 8601
  completedAt?: string;
  duration?: number; // milliseconds

  // Trigger Context
  trigger: 'manual' | 'scheduled' | 'webhook' | 'api' | 'test';
  triggeredBy?: string;
  triggerMetadata?: Record<string, any>;

  // Device & Environment (auto-populated)
  executedOnDevice?: DeviceInfo;
  userAgent?: string;
  ipAddress?: string;

  // Input & Output
  input?: Record<string, any>;
  output?: any;
  results: ExecutionResult[];

  // Performance Metrics
  nodeExecutionTimes?: Record<string, number>;
  apiCallCount?: number;
  tokensUsed?: number;
  cacheHits?: number;
  cacheMisses?: number;

  // Error Tracking
  error?: string;
  errorStack?: string;
  errorType?: string;
  failedNodeId?: string;
  failedNodeName?: string;
  retryCount?: number;

  // Logging
  logs?: string[];
  warnings?: string[];
  debugInfo?: Record<string, any>;

  // Data Management
  compressed?: boolean;
  dataSize?: number; // bytes

  // Tags & Environment
  tags?: string[];
  environment?: 'development' | 'staging' | 'production';

  // Soft Delete
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}
```

### Recommended Backend Schema (PostgreSQL)

#### `flows` Table

```sql
CREATE TABLE flows (
  -- Core Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Authorship (link to users table)
  author_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,

  -- Categorization
  tags TEXT[], -- PostgreSQL array
  category VARCHAR(100),
  visibility VARCHAR(20) CHECK (visibility IN ('private', 'team', 'public')),

  -- Versioning
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  parent_flow_id UUID REFERENCES flows(id),

  -- Device Info (JSONB for flexibility)
  created_on_device JSONB,
  last_modified_on_device JSONB,
  user_agent TEXT,

  -- Usage Statistics
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  avg_execution_time NUMERIC,
  success_rate NUMERIC CHECK (success_rate >= 0 AND success_rate <= 100),

  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived', 'deprecated')),
  is_template BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,

  -- Content (JSONB for React Flow structure)
  flow JSONB NOT NULL,
  thumbnail TEXT, -- Base64 or URL
  readme TEXT,

  -- Soft Delete
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Indexes
  CONSTRAINT flows_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Indexes for performance
CREATE INDEX idx_flows_author_id ON flows(author_id);
CREATE INDEX idx_flows_organization_id ON flows(organization_id);
CREATE INDEX idx_flows_created_at ON flows(created_at DESC);
CREATE INDEX idx_flows_updated_at ON flows(updated_at DESC);
CREATE INDEX idx_flows_tags ON flows USING GIN(tags);
CREATE INDEX idx_flows_deleted ON flows(deleted) WHERE deleted = FALSE;
CREATE INDEX idx_flows_status ON flows(status);

-- Full-text search
CREATE INDEX idx_flows_name_search ON flows USING GIN(to_tsvector('english', name));
CREATE INDEX idx_flows_description_search ON flows USING GIN(to_tsvector('english', description));
```

#### `flow_contributors` Table (Many-to-Many)

```sql
CREATE TABLE flow_contributors (
  flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) CHECK (role IN ('owner', 'editor', 'viewer')),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID REFERENCES users(id),

  PRIMARY KEY (flow_id, user_id)
);

CREATE INDEX idx_flow_contributors_user_id ON flow_contributors(user_id);
```

#### `flow_version_history` Table

```sql
CREATE TABLE flow_version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
  version VARCHAR(20) NOT NULL,
  flow_snapshot JSONB NOT NULL, -- Full flow state at this version
  changes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE (flow_id, version)
);

CREATE INDEX idx_flow_version_history_flow_id ON flow_version_history(flow_id);
CREATE INDEX idx_flow_version_history_created_at ON flow_version_history(created_at DESC);
```

#### `executions` Table

```sql
CREATE TABLE executions (
  -- Core Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  description TEXT,

  -- Flow Reference
  flow_id UUID REFERENCES flows(id),
  flow_name VARCHAR(255) NOT NULL, -- Snapshot
  flow_version VARCHAR(20) NOT NULL,

  -- Status & Timing
  status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- milliseconds

  -- Trigger Context
  trigger VARCHAR(20) NOT NULL CHECK (trigger IN ('manual', 'scheduled', 'webhook', 'api', 'test')),
  triggered_by UUID REFERENCES users(id),
  trigger_metadata JSONB,

  -- Device & Environment
  executed_on_device JSONB,
  user_agent TEXT,
  ip_address INET,

  -- Input & Output
  input JSONB,
  output JSONB,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Performance Metrics
  node_execution_times JSONB,
  api_call_count INTEGER,
  tokens_used INTEGER,
  cache_hits INTEGER,
  cache_misses INTEGER,

  -- Error Tracking
  error TEXT,
  error_stack TEXT,
  error_type VARCHAR(100),
  failed_node_id VARCHAR(50),
  failed_node_name VARCHAR(255),
  retry_count INTEGER DEFAULT 0,

  -- Logging
  logs TEXT[],
  warnings TEXT[],
  debug_info JSONB,

  -- Data Management
  compressed BOOLEAN DEFAULT FALSE,
  data_size INTEGER, -- bytes

  -- Tags & Environment
  tags TEXT[],
  environment VARCHAR(20) CHECK (environment IN ('development', 'staging', 'production')),

  -- Soft Delete
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_executions_flow_id ON executions(flow_id);
CREATE INDEX idx_executions_started_at ON executions(started_at DESC);
CREATE INDEX idx_executions_status ON executions(status);
CREATE INDEX idx_executions_triggered_by ON executions(triggered_by);
CREATE INDEX idx_executions_deleted ON executions(deleted) WHERE deleted = FALSE;
```

---

## 🔌 API Endpoints Needed

### Flow Management

#### `POST /api/flows`
Create new flow (sync from frontend)

**Request:**
```json
{
  "name": "Data Analysis Pipeline",
  "description": "Automated data processing workflow",
  "flow": { /* ReactFlowJsonObject */ },
  "tags": ["analytics", "automation"],
  "category": "data-processing",
  "visibility": "private",
  "metadata": {
    "createdOnDevice": { /* DeviceInfo */ },
    "userAgent": "..."
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Data Analysis Pipeline",
  "version": "1.0.0",
  "createdAt": "2025-10-18T14:30:00Z",
  "updatedAt": "2025-10-18T14:30:00Z",
  "syncedToCloud": true
}
```

#### `PUT /api/flows/:id`
Update existing flow

**Request:**
```json
{
  "name": "Updated Name",
  "flow": { /* ReactFlowJsonObject */ },
  "metadata": {
    "lastModifiedOnDevice": { /* DeviceInfo */ }
  }
}
```

#### `GET /api/flows`
List user's flows with filtering

**Query Params:**
- `search` - Full-text search
- `tags` - Comma-separated tags
- `category` - Filter by category
- `status` - Filter by status
- `sort` - Sort field (updated, created, name, executions)
- `order` - Sort order (asc, desc)
- `limit` - Page size
- `offset` - Pagination offset

**Response:**
```json
{
  "flows": [
    {
      "id": "uuid",
      "name": "Flow Name",
      "description": "...",
      "tags": ["tag1", "tag2"],
      "executionCount": 42,
      "successRate": 87.5,
      "version": "1.2.0",
      "updatedAt": "2025-10-18T14:30:00Z",
      "thumbnail": "base64..."
    }
  ],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

#### `GET /api/flows/:id`
Get single flow with full details

**Response:**
```json
{
  "id": "uuid",
  "name": "Flow Name",
  "description": "...",
  "flow": { /* Full ReactFlowJsonObject */ },
  "tags": ["tag1"],
  "category": "automation",
  "version": "1.2.0",
  "versionHistory": [
    { "version": "1.0.0", "timestamp": "...", "changes": "Initial" },
    { "version": "1.1.0", "timestamp": "...", "changes": "Added nodes" }
  ],
  "executionCount": 42,
  "successRate": 87.5,
  "contributors": [
    { "userId": "uuid", "name": "John Doe", "role": "owner" }
  ],
  "createdAt": "2025-10-18T14:30:00Z",
  "updatedAt": "2025-10-18T15:45:00Z"
}
```

#### `DELETE /api/flows/:id`
Soft delete flow

**Response:**
```json
{
  "deleted": true,
  "deletedAt": "2025-10-18T16:00:00Z"
}
```

#### `POST /api/flows/:id/restore`
Restore soft-deleted flow

### Execution History

#### `POST /api/executions`
Create execution record (called from frontend before execution)

**Request:**
```json
{
  "flowId": "uuid",
  "flowName": "Data Pipeline",
  "flowVersion": "1.2.0",
  "input": { "variable": "value" },
  "trigger": "manual",
  "metadata": {
    "executedOnDevice": { /* DeviceInfo */ }
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "running",
  "startedAt": "2025-10-18T14:30:00Z"
}
```

#### `PUT /api/executions/:id/complete`
Complete execution (called from frontend after execution)

**Request:**
```json
{
  "status": "completed",
  "results": [ /* ExecutionResult[] */ ],
  "duration": 5420,
  "tokensUsed": 1234,
  "apiCallCount": 3,
  "metrics": {
    "nodeExecutionTimes": { "node1": 1000, "node2": 2000 }
  }
}
```

#### `GET /api/executions?flowId=:flowId`
List executions for a flow

**Query Params:**
- `flowId` - Filter by flow
- `status` - Filter by status
- `limit`, `offset` - Pagination

### Sync Endpoints

#### `POST /api/sync/flows`
Bulk sync flows from frontend to backend

**Request:**
```json
{
  "flows": [
    { "id": "uuid", "updatedAt": "2025-10-18T14:30:00Z", ... }
  ],
  "lastSyncAt": "2025-10-17T00:00:00Z"
}
```

**Response:**
```json
{
  "synced": ["uuid1", "uuid2"],
  "conflicts": [
    {
      "flowId": "uuid3",
      "localUpdatedAt": "2025-10-18T14:30:00Z",
      "serverUpdatedAt": "2025-10-18T15:00:00Z",
      "action": "server_wins"
    }
  ]
}
```

#### `GET /api/sync/flows?since=:timestamp`
Get flows updated since timestamp

---

## 🔐 Authentication & Authorization

### User Context

All API calls should include user context via JWT or session:

```typescript
interface AuthContext {
  userId: string;
  email: string;
  organizationId?: string;
  roles: string[]; // ['user', 'admin', 'owner']
}
```

### Permission Levels

**Flow Permissions:**
- **Owner** - Full control (edit, delete, share, manage contributors)
- **Editor** - Edit flow, view executions, cannot delete
- **Viewer** - Read-only access

**Organization Permissions:**
- **Team flows** - Visible to all organization members
- **Public flows** - Visible to anyone (templates, examples)
- **Private flows** - Only owner + explicit contributors

### Middleware

```typescript
// Example Express middleware
const requireFlowAccess = (level: 'read' | 'write' | 'admin') => {
  return async (req, res, next) => {
    const { flowId } = req.params;
    const { userId } = req.auth;

    const hasAccess = await checkFlowPermission(userId, flowId, level);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
};

// Usage
app.get('/api/flows/:id', requireFlowAccess('read'), getFlow);
app.put('/api/flows/:id', requireFlowAccess('write'), updateFlow);
app.delete('/api/flows/:id', requireFlowAccess('admin'), deleteFlow);
```

---

## 🔄 Sync Strategy

### Conflict Resolution

**Scenario:** User edits flow on Device A (offline), then opens on Device B (online with newer version)

**Strategy:**
1. **Last Write Wins** (default)
   - Compare `updatedAt` timestamps
   - Server version always wins if newer
   - Frontend shows warning: "Server has newer version, loading that"

2. **Manual Resolution** (advanced)
   - Detect conflict: `localUpdatedAt > serverUpdatedAt` AND `local content ≠ server content`
   - Show diff UI: "Local changes" vs "Server changes"
   - Let user choose: "Keep Local", "Use Server", "Merge"

3. **Version History Fallback**
   - If conflict detected, save local version to `versionHistory`
   - User can restore from version history later

**Implementation:**

```typescript
// Frontend sync logic
async function syncFlow(localFlow: Flow): Promise<SyncResult> {
  const serverFlow = await api.getFlow(localFlow.id);

  if (serverFlow.updatedAt > localFlow.updatedAt) {
    // Server is newer
    return {
      action: 'pull',
      flow: serverFlow,
      message: 'Loading newer version from server'
    };
  } else if (localFlow.updatedAt > serverFlow.updatedAt) {
    // Local is newer
    await api.updateFlow(localFlow.id, localFlow);
    return {
      action: 'push',
      flow: localFlow,
      message: 'Synced local changes to server'
    };
  } else {
    // Same version
    return {
      action: 'noop',
      flow: localFlow,
      message: 'Already in sync'
    };
  }
}
```

### Sync Triggers

**When to sync:**
1. **On save** - Immediate sync after manual save
2. **On load** - Check server on app start
3. **Periodic** - Background sync every 5 minutes
4. **On focus** - Sync when user returns to tab
5. **Manual** - User clicks "Sync Now" button

**Offline handling:**
- Queue sync operations if offline
- Show "Offline - changes will sync when online" banner
- Retry failed syncs with exponential backoff

---

## 📈 Analytics & Monitoring

### Metrics to Track

**Flow Metrics:**
- Total flows per user/organization
- Flows created per day/week/month
- Most popular templates
- Average flow size (node count)
- Flows by category/tag

**Execution Metrics:**
- Executions per flow
- Success rate by flow
- Average execution time
- Token usage by flow
- API call count
- Peak execution times (time of day)

**User Metrics:**
- Active users (daily/weekly/monthly)
- Flows created per user
- Executions per user
- Retention rate

### Recommended Tools

- **PostgreSQL Analytics** - Use materialized views for aggregations
- **Grafana** - Dashboards for metrics visualization
- **DataDog/New Relic** - Application performance monitoring
- **Mixpanel/Amplitude** - Product analytics

### Example Materialized View

```sql
CREATE MATERIALIZED VIEW flow_analytics AS
SELECT
  f.id AS flow_id,
  f.name AS flow_name,
  f.author_id,
  COUNT(e.id) AS total_executions,
  COUNT(e.id) FILTER (WHERE e.status = 'completed') AS successful_executions,
  ROUND(
    100.0 * COUNT(e.id) FILTER (WHERE e.status = 'completed') / NULLIF(COUNT(e.id), 0),
    2
  ) AS success_rate,
  AVG(e.duration) FILTER (WHERE e.status = 'completed') AS avg_duration_ms,
  SUM(e.tokens_used) AS total_tokens_used,
  MAX(e.started_at) AS last_executed_at
FROM flows f
LEFT JOIN executions e ON f.id = e.flow_id AND e.deleted = FALSE
WHERE f.deleted = FALSE
GROUP BY f.id, f.name, f.author_id;

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY flow_analytics;
```

---

## 🚀 Migration Strategy

### Phase 1: Read-Only Sync (2 weeks)

**Goal:** Backend can read frontend data, no writes yet

**Steps:**
1. Implement PostgreSQL schema
2. Create `POST /api/flows` endpoint (one-way sync)
3. Add "Sync to Cloud" button in frontend
4. Users manually trigger sync
5. Backend stores flows, no auto-sync yet

**Testing:**
- Verify flows sync correctly
- Check metadata preservation
- Test conflict scenarios manually

### Phase 2: Auto-Sync (2 weeks)

**Goal:** Automatic bidirectional sync

**Steps:**
1. Implement sync middleware in frontend
2. Add `GET /api/sync/flows?since=:timestamp`
3. Trigger sync on save, load, periodic
4. Show sync status in UI
5. Handle offline gracefully

**Testing:**
- Multi-device sync testing
- Offline/online transitions
- Conflict resolution

### Phase 3: Execution Tracking (1 week)

**Goal:** Backend tracks executions

**Steps:**
1. Implement execution endpoints
2. Update frontend to call backend before/after execution
3. Add execution analytics dashboard
4. Migrate existing frontend executions to backend (optional)

**Testing:**
- Verify execution tracking
- Check performance metrics
- Test analytics queries

### Phase 4: Collaboration (2 weeks)

**Goal:** Multi-user flows, permissions

**Steps:**
1. Implement `flow_contributors` table
2. Add sharing UI in frontend
3. Permission middleware
4. Real-time collaboration (WebSocket, optional)

**Testing:**
- Share flows between users
- Test permission levels
- Verify access control

---

## 🛠️ Implementation Checklist

### Backend Setup

- [ ] Create PostgreSQL database
- [ ] Run schema migrations
- [ ] Set up authentication (JWT/session)
- [ ] Implement CORS for frontend

### API Development

**Flow Management:**
- [ ] `POST /api/flows` - Create flow
- [ ] `GET /api/flows` - List flows
- [ ] `GET /api/flows/:id` - Get single flow
- [ ] `PUT /api/flows/:id` - Update flow
- [ ] `DELETE /api/flows/:id` - Soft delete
- [ ] `POST /api/flows/:id/restore` - Restore deleted

**Execution Tracking:**
- [ ] `POST /api/executions` - Create execution
- [ ] `PUT /api/executions/:id/complete` - Complete execution
- [ ] `GET /api/executions?flowId=:id` - List executions

**Sync:**
- [ ] `POST /api/sync/flows` - Bulk sync
- [ ] `GET /api/sync/flows?since=:timestamp` - Incremental sync

### Frontend Integration

- [ ] Add API client service
- [ ] Implement sync middleware
- [ ] Add "Sync to Cloud" button
- [ ] Show sync status indicator
- [ ] Handle offline/online transitions
- [ ] Add conflict resolution UI

### Testing

- [ ] Unit tests for sync logic
- [ ] Integration tests for API endpoints
- [ ] E2E tests for multi-device sync
- [ ] Load testing for analytics queries

### Monitoring

- [ ] Set up APM (DataDog/New Relic)
- [ ] Create Grafana dashboards
- [ ] Set up error tracking (Sentry)
- [ ] Monitor sync success rate

---

## 📝 Code Examples

### Frontend Sync Service

```typescript
// src/services/syncService.ts
import { db } from '../db/database';
import { api } from './api';

interface SyncOptions {
  force?: boolean;
  onProgress?: (progress: number) => void;
}

export async function syncToServer(options: SyncOptions = {}) {
  const { force = false, onProgress } = options;

  // Get flows that need syncing
  const localFlows = await db.flows.toArray();
  const lastSyncAt = localStorage.getItem('lastSyncAt');

  const flowsToSync = force
    ? localFlows
    : localFlows.filter(f => !lastSyncAt || f.updatedAt > lastSyncAt);

  console.log(`Syncing ${flowsToSync.length} flows to server`);

  for (let i = 0; i < flowsToSync.length; i++) {
    const flow = flowsToSync[i];

    try {
      // Check if exists on server
      const serverFlow = await api.getFlow(flow.id).catch(() => null);

      if (!serverFlow) {
        // Create new
        await api.createFlow(flow);
      } else if (flow.updatedAt > serverFlow.updatedAt) {
        // Update existing
        await api.updateFlow(flow.id, flow);
      }

      onProgress?.(((i + 1) / flowsToSync.length) * 100);
    } catch (error) {
      console.error(`Failed to sync flow ${flow.id}:`, error);
    }
  }

  localStorage.setItem('lastSyncAt', new Date().toISOString());
}

export async function syncFromServer(options: SyncOptions = {}) {
  const { onProgress } = options;
  const lastSyncAt = localStorage.getItem('lastSyncAt');

  // Get updated flows from server
  const serverFlows = await api.getFlowsSince(lastSyncAt);

  console.log(`Pulling ${serverFlows.length} flows from server`);

  for (let i = 0; i < serverFlows.length; i++) {
    const serverFlow = serverFlows[i];
    const localFlow = await db.flows.get(serverFlow.id);

    if (!localFlow || serverFlow.updatedAt > localFlow.updatedAt) {
      // Server is newer, update local
      await db.flows.put(serverFlow);
    }

    onProgress?.(((i + 1) / serverFlows.length) * 100);
  }

  localStorage.setItem('lastSyncAt', new Date().toISOString());
}

export async function bidirectionalSync(options: SyncOptions = {}) {
  // Sync to server first
  await syncToServer(options);

  // Then pull from server
  await syncFromServer(options);
}
```

### Backend API Client

```typescript
// src/services/api.ts
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  // Flows
  async createFlow(flow: Flow) {
    return request<Flow>('/flows', {
      method: 'POST',
      body: JSON.stringify(flow),
    });
  },

  async getFlows(params?: { search?: string; tags?: string[]; limit?: number; offset?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return request<{ flows: Flow[]; total: number }>(`/flows?${query}`);
  },

  async getFlow(id: string) {
    return request<Flow>(`/flows/${id}`);
  },

  async updateFlow(id: string, updates: Partial<Flow>) {
    return request<Flow>(`/flows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteFlow(id: string) {
    return request<{ deleted: boolean }>(`/flows/${id}`, {
      method: 'DELETE',
    });
  },

  async getFlowsSince(timestamp?: string) {
    const query = timestamp ? `?since=${timestamp}` : '';
    return request<Flow[]>(`/sync/flows${query}`);
  },

  // Executions
  async createExecution(execution: Partial<Execution>) {
    return request<Execution>('/executions', {
      method: 'POST',
      body: JSON.stringify(execution),
    });
  },

  async completeExecution(id: string, updates: Partial<Execution>) {
    return request<Execution>(`/executions/${id}/complete`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
};
```

### Backend Express Routes

```typescript
// backend/src/routes/flows.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { FlowService } from '../services/FlowService';

const router = Router();
const flowService = new FlowService();

// Create flow
router.post('/flows', requireAuth, async (req, res) => {
  try {
    const flow = await flowService.create({
      ...req.body,
      authorId: req.user.id,
    });

    res.status(201).json(flow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List flows
router.get('/flows', requireAuth, async (req, res) => {
  try {
    const { search, tags, limit = 20, offset = 0 } = req.query;

    const result = await flowService.list({
      userId: req.user.id,
      search: search as string,
      tags: tags ? (tags as string).split(',') : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single flow
router.get('/flows/:id', requireAuth, async (req, res) => {
  try {
    const flow = await flowService.getById(req.params.id, req.user.id);

    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    res.json(flow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update flow
router.put('/flows/:id', requireAuth, async (req, res) => {
  try {
    const flow = await flowService.update(req.params.id, req.user.id, req.body);
    res.json(flow);
  } catch (error) {
    res.status(403).json({ error: 'Access denied' });
  }
});

// Delete flow
router.delete('/flows/:id', requireAuth, async (req, res) => {
  try {
    await flowService.softDelete(req.params.id, req.user.id);
    res.json({ deleted: true });
  } catch (error) {
    res.status(403).json({ error: 'Access denied' });
  }
});

export default router;
```

---

## 🎓 Learning Resources

### Dexie.js (Frontend Database)
- **Docs:** https://dexie.org/
- **Live Queries:** https://dexie.org/docs/liveQuery()
- **Best Practices:** https://dexie.org/docs/Tutorial/Best-Practices

### PostgreSQL JSONB
- **Docs:** https://www.postgresql.org/docs/current/datatype-json.html
- **Indexing JSONB:** https://www.postgresql.org/docs/current/datatype-json.html#JSON-INDEXING
- **Query Performance:** https://www.postgresql.org/docs/current/functions-json.html

### Sync Strategies
- **CRDTs:** https://crdt.tech/
- **Operational Transformation:** https://operational-transformation.github.io/
- **Event Sourcing:** https://martinfowler.com/eaaDev/EventSourcing.html

---

## 📞 Support

**Questions?** Contact the frontend team:
- Frontend Lead: [Your Name]
- Email: [your.email@company.com]
- Slack: #visual-flow-dev

**Documentation Updates:**
- This document lives at: `docs/BACKEND_DEVELOPER_HANDOFF.md`
- Last updated: 2025-10-18
- Version: 1.0

---

## ✅ Summary

**What's Working Now (Frontend-Only):**
- ✅ Full flow persistence in browser (IndexedDB)
- ✅ Autosave with 2-second debounce
- ✅ Execution tracking with metrics
- ✅ Search, filter, sort flows
- ✅ Comprehensive metadata (40+ fields)
- ✅ Device tracking
- ✅ Version history

**What Backend Adds (Optional):**
- ☁️ Cross-device sync
- 👥 Team collaboration
- 🔒 Permissions & access control
- 📊 Organization-wide analytics
- 💾 Server-side backup
- 🌐 Public flow templates

**Implementation Timeline:**
- **Phase 1 (Read-Only):** 2 weeks
- **Phase 2 (Auto-Sync):** 2 weeks
- **Phase 3 (Executions):** 1 week
- **Phase 4 (Collaboration):** 2 weeks
- **Total:** 7 weeks for full feature parity

**Next Steps:**
1. Review this document
2. Set up PostgreSQL database
3. Implement Phase 1 (read-only sync)
4. Test with frontend team
5. Proceed to Phase 2

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
