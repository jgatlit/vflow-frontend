# Prompt Flow Frontend

Visual workflow builder for creating complex LLM automation flows with drag-and-drop interface.

## Architecture

This frontend is served through a **reverse proxy** on the backend server. The application runs on **http://localhost:3000** (not port 5173).

### Reverse Proxy Setup
- Backend server (Express) runs on port 3000
- Frontend dev server (Vite) runs internally on port 5173
- All requests to `http://localhost:3000` are proxied to the frontend
- API requests to `http://localhost:3000/api/*` are handled by the backend

## Development

### Prerequisites
- Node.js 18+
- Backend server must be running (see `../prompt-flow-backend`)

### Start Development Server

```bash
# Install dependencies
npm install

# Start frontend dev server (runs on port 5173 internally)
npm run dev
```

**Access the application at: http://localhost:3000** (via backend reverse proxy)

### Build for Production

```bash
npm run build
```

The production build is served statically by the backend server.

## Technology Stack

- **React 18** - UI framework
- **TypeScript 5** - Type safety
- **Vite 7** - Build tool and dev server
- **React Flow** - Visual workflow canvas
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Dexie.js** - Client-side IndexedDB storage

## Features

### LLM Node Support
- **OpenAI**: GPT-4o, o3, o4-mini with structured output
- **Anthropic**: Claude 4.5 Sonnet, Haiku, Opus with extended thinking
- **Google Gemini**: 2.0 Flash, 1.5 Pro/Flash with multimodal support

### Structured Output
- JSON output with schema validation
- CSV output with automatic conversion
- Auto-conversion between JSON ↔ CSV formats
- Field-level variable extraction (e.g., `{{node.field}}`)

### Node Types
- **LLM Nodes**: OpenAI, Anthropic, Gemini
- **Notes Nodes**: Variable substitution and passthrough modes
- **Code Nodes**: Python and JavaScript execution
- **Input/Output**: Manual variable entry and results display

### Visual Features
- Drag-and-drop workflow builder
- Real-time execution with streaming
- Compact/expanded node views
- Custom output variable names
- Variable reference highlighting

## Project Structure

```
src/
├── components/     # Reusable UI components
├── nodes/          # React Flow node components
├── pages/          # Main application pages
├── services/       # API and execution services
├── store/          # Zustand state management
├── db/             # IndexedDB database layer
├── utils/          # Utility functions
└── config/         # Configuration files
```

## Configuration

Environment variables (optional):
- `VITE_API_URL` - Backend API URL (default: http://localhost:3000)

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Notes

- The frontend communicates with the backend via REST API at `/api/*`
- All authentication and API keys are handled server-side
- Flows are saved to IndexedDB locally and optionally synced to PostgreSQL backend
- The dev server uses HMR (Hot Module Replacement) for fast development
