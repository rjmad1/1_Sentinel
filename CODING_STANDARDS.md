# Sentinel (EIIP) Coding Standards

## 1. Architecture & Design Patterns
- **Bounded Context Separation**: Do not mix domain logic across bounded contexts. Define strict interfaces/contracts for cross-context calls.
- **Event-Driven Communication**: All communication between microservices/contexts should occur via events conforming to the CloudEvents 1.0 schema over NATS.
- **Clean API Interfaces**: FastAPI routers should only handle request parsing, validation, and calling domain service actions. They should not contain business logic.

## 2. InsForge Backend Development
- **Configuration**: Always load API keys and credentials from `.env.local` or environment variables. Do not hardcode them.
- **Database Operations**:
  - Always perform insertions using array format, e.g., `insert([{ field: 'value' }])`.
  - Reference users in schemas via `auth.users(id)`.
  - Use `auth.uid()` to enforce Row Level Security (RLS) policies.
- **File Storage**:
  - For storage uploads, always persist both the returned `url` and the unique resource `key`.
- **Backend Infrastructure**:
  - Always configure infrastructure changes and RLS policies through `.insforge/project.json` or migrations via the `insforge` CLI.

## 3. Frontend & Styling
- **Type Safety**: Strictly typed TypeScript is required for all new components and utilities. Avoid `any`.
- **Styling**:
  - Use modern CSS variables (custom properties) and Vanilla CSS for maximum styling control and premium aesthetics.
  - Avoid ad-hoc utility classes where custom component-focused CSS selectors provide better isolation and maintainability.
  - Follow modern design standards: sleek dark mode themes, HSL tailored color schemes, glassmorphism, and responsive CSS Grid/Flexbox layouts.

## 4. Testing & Quality Control
- **Test Categories**:
  - `tests/unit`: Isolated business logic and component tests.
  - `tests/integration`: End-to-end component/service orchestration tests.
  - `tests/contract`: API and event structure contract validation.
- **Quality Metrics**: Maintain 100% test passing score on all core engines (Discovery, Assessment, Risk, Graph Topology).
