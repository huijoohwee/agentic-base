# Product scope

`agentic-base` owns only datasets explicitly created in its own base or migrated after a separate owner-approved cutover. It provides headless schema, persistence, query, and projection contracts. This private repo is the sole source for the existing Graph Table, Multi-dimensional Table, Kanban, Calendar, Dashboard, saved-view settings, reusable MainPanel settings, FloatingPanel shell/close visuals, and Workflow Manager field presentation. Table and Multi-dimensional Table use one Base grid. Its offline browser entry is a bounded, literal-text consumer adapter; it adds no data store or network behavior. Graph consumes the Base React modules and Shoply in `agentic-commerce-os` consumes the compiled browser artifact. Source provenance and exact candidate digests are recorded in `packages/views-react/migration-source.json`; consumers retain schemas, data, controls, actions, persistence, drag policy, outer panel lifecycle, and Mission composition. Their exact pins and full interaction parity remain open. Do not add a competing visual variant.

The MVP provides:

- Versioned JSON requests and stable typed errors.
- Base, table, field, and record contracts with optimistic revisions.
- Atomic IndexedDB writes and a memory adapter for deterministic checks.
- Table, two-dimension matrix, Kanban, and date-only Calendar projections over the same record IDs.
- A local projection demo for product checks only; it is not the reusable consumer UI.
- One private, canonical view package that source-maps the existing Graph Table, Multi-dimensional Table, Kanban, Calendar, Dashboard, and shared settings visuals behind neutral host contracts. One offline browser artifact serves vanilla-JS consumers from the same Base table source. The development fixture proves shared in-memory records and host composition, not full consumer parity. Graph and Shoply must pin exact commits; retain their schema, data, and actions in consumer adapters. No separate starter or conflicting implementation.
- Caller-supplied authorization before each read or write.
- A mobile-width browser demo with an origin-local offline app shell.

Per-base limits are 2,000 records, 5 MiB serialized records, 128 fields per table, 64 filter nodes, six filter levels, eight sort keys, 250 records per page, and 500 KiB per operation. Browser quotas may be lower. Limits can be reduced by a caller. They are product caps, not measured capacity claims.

Dates use ISO `YYYY-MM-DD` values without timezone conversion. Missing dates are unscheduled. A date with a different month appears in `outsideMonth`; malformed persisted data appears in `invalid` and is not silently repaired.

The demo's local operator policy is illustrative. It does not authenticate callers. A production consumer must supply its own trusted authorization boundary.
