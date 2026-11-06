# Product scope

`agentic-base` owns only datasets explicitly created in its own base or migrated after a separate owner-approved cutover. It provides headless schema, persistence, query, and projection contracts. This public repository is the sole source for the existing Graph Table, Multi-dimensional Table, Kanban, Calendar, Dashboard, saved-view settings, reusable MainPanel settings, FloatingPanel shell/close visuals, and Workflow Manager field presentation. Table and Multi-dimensional Table use one Base grid. The shared hierarchy cell places the grip, chevron, and checkbox in fixed, aligned slots in that order; header chevron and checkbox slots line up with row controls, and nesting depth never shifts those slots. The grip uses a 16px affordance; row order remains consumer-owned. Consumers clear selection through an optional `onDeselectRow` callback. The offline browser Multi-dimensional Table can render its shared pivot control when the consumer supplies an orientation callback; data and workflow actions stay consumer-owned. Its offline browser entry is a bounded, literal-text consumer adapter; it adds no data store or network behavior. Graph consumes the Base React modules and Commerce in `agentic-commerce-os` consumes the compiled browser artifact. Source provenance and exact candidate digests are recorded in `packages/views-react/migration-source.json`; consumers retain schemas, data, product workflow controls, actions, persistence, drag policy, outer panel lifecycle, and Mission composition. Their exact pins and full interaction parity remain open. Do not add a competing visual variant.

The MVP provides:

- Versioned JSON requests and stable typed errors.
- Base, table, field, and record contracts with optimistic revisions.
- Atomic IndexedDB writes and a memory adapter for deterministic checks.
- Table, two-dimension matrix, Kanban, and date-only Calendar projections over the same record IDs.
- The local demo renders all four deterministic projection outputs through the same Base browser Table/Multi-dimensional Table adapter. The view is read-only; the local form remains its record-write control. There is no raw-JSON fallback or second table renderer.
- One canonical, unpublished view package that source-maps the existing Graph Table, Multi-dimensional Table, Kanban, Calendar, Dashboard, and shared settings visuals behind neutral host contracts. One offline browser artifact serves vanilla-JS consumers from the same Base table source. The development fixture proves shared in-memory records and host composition, not full consumer parity. Graph and Shoply must pin exact commits; retain their schema, data, and actions in consumer adapters. No separate starter or conflicting implementation.
- Caller-supplied authorization before each read or write.
- A mobile-width browser demo with an origin-local offline app shell.

Per-base limits are 2,000 records, 5 MiB serialized records, 128 fields per table, 64 filter nodes, six filter levels, eight sort keys, 250 records per page, and 500 KiB per operation. Browser quotas may be lower. Limits can be reduced by a caller. They are product caps, not measured capacity claims.

Dates use ISO `YYYY-MM-DD` values without timezone conversion. Missing dates are unscheduled. A date with a different month appears in `outsideMonth`; malformed persisted data appears in `invalid` and is not silently repaired.

The demo's local operator policy is illustrative. It does not authenticate callers. A production consumer must supply its own trusted authorization boundary.

TableCore owns one sticky column header and the active expanded ancestor path, measured within the table scrollport. Original rows keep their controls, selection and horizontal alignment; ancestors release at their subtree boundary. The double-chevron header action toggles all groups, while each group has one single-chevron toggle. Consumers supply a bounded viewport and theme tokens, never a second header or hierarchy renderer.

The same TableCore sticky helper resolves the vertical scroll owner for embedded tables: an unbounded horizontal table frame delegates vertical positioning to its scrolling ancestor pane (including shadow-host ancestry). The original header stays inside the table boundary and uses the same ancestor-row geometry. Bounded grid frames retain native sticky positioning. Outer-pane scrolling, resize, collapse and cleanup use that one owner; consumers supply no sticky variant.

The same owner honors the scroll pane's native `scroll-padding-top`, including pixel and percentage values, to keep table controls below surrounding sticky content. Hosts retain their existing padding calculation; no host-specific selector or parallel inset registry is introduced.
