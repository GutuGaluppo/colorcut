# Architecture decisions

Record accepted decisions here. Keep entries short and append-only.

## ADR-001 — CSS variables before a utility framework

**Status:** Accepted for starter scaffold  
**Decision:** Use CSS variables and component classes initially.  
**Reason:** Keeps the design tokens visible and avoids locking the scaffold to a styling dependency before the component language stabilizes.

## ADR-002 — Native work behind a typed adapter

**Status:** Accepted  
**Decision:** React features call `src/lib/tauri/commands.ts`; components never import Tauri APIs.  
**Reason:** Enables browser UI work, tests, predictable mocks, and controlled native-contract changes.

## ADR-003 — Model selection remains open

**Status:** Accepted  
**Decision:** Do not commit an inference model/runtime until benchmark and licensing notes are complete.  
**Reason:** Quality, packaging, Apple Silicon support, license, and bundle size are product-level tradeoffs.

