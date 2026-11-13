# Development

The headless product core is native ECMAScript modules. Runtime code imports only browser platform APIs; the local test adapter uses Node built-ins. The MIT-licensed package contains source-mapped Table, Multi-dimensional Table, Kanban, Calendar, Dashboard and shared panel visuals behind neutral host contracts. `TableCore` is the shared grid. The bounded offline browser adapter projects consumer-owned rows and columns into the same `TableView` host runtime and builds an ESM artifact plus CSS; its optional orientation callback exposes the Base-owned pivot control without transferring row data or workflow ownership to Base. Container fit applies in both pivot orientations, while minimum content width keeps larger matrices scrollable. Hierarchy controls share fixed grip, chevron, and checkbox slots; the header chevron and checkbox align with row controls, and nesting depth does not offset them. Graph can import the React source and Commerce can copy the generated artifact from its exact Base package pin. The artifact accepts at most 64 fields, 1,000 records, 4,096 characters per cell, and 192 KiB serialized payload; it renders literal text and owns no data or persistence. Its manifest hashes every source file included in the bundle. `migration-source.json` records source paths, canonical Graph main, and digests. The root demo uses the generated browser artifact for one interactive Table/Multi-dimensional Table renderer. The React `dev/` fixture remains composition coverage, not a second product UI. Agentic Design System owns MainPanel, FloatingPanel, BottomPanel, and Editor Workspace visuals, dimensions, spacing, and responsive layout. Base owns the React adapter; hosts keep panel state and lifecycle. Consumers pin exact central source and projection revisions and add no panel visual overrides.

Continue centralizing the existing Graph Table, Multi-dimensional Table, Kanban, Calendar, Dashboard composition, and reusable view/field settings in this one Base-owned package. Keep Graph-specific schema sources, workflow actions, resize configuration/persistence, and host shells behind adapters. Do not author a replacement renderer or retain parallel visual implementations. Keep Dashboard snapshot/configuration, Graph Markdown editing, graph-specific MCP commands, and Agent Mission composition in Graph; after package integration, route their reusable visual imports to Base. Graph stays on its current UI until the exact Base package is distributable and passes shared-fixture and live interaction parity.

```sh
npm run check
npm run build:browser-data-view
npm run check:browser-data-view
npm run dev
```

`npm run check` parses the modules, runs the built-in Node suite, writes bounded source evidence, and runs the pinned Agentic OS evaluations. For the React Table and Multi-dimensional Table composition fixture, run Vite with `packages/views-react/dev/vite.config.mjs`; it uses the adjacent Graph checkout for surrounding host controls and binds to `127.0.0.1:5176` with strict port selection. The root browser demo starts on `127.0.0.1:4173`, mounts the generated Base browser artifact, and caches its bounded JS/CSS for offline reload. The service worker requires a secure context, which includes localhost. The browser can evict origin storage; this MVP is not a backup service.

The root workflow demo's IndexedDB check is at `http://127.0.0.1:4173/test-browser/idb-atomicity.html`; it injects a write failure against a temporary database, verifies the committed revision remains intact, and deletes the temporary database.

## E2E storage boundaries

The demo's default IndexedDB (`agentic-base-local-v1`) holds origin-local records and is user data.
Generic cleanup and source rollback must preserve it. The atomicity check uses a per-run
`crypto.randomUUID()` database name and deletes only that exact temporary database; new browser E2E
must follow the same run-owned isolation instead of clearing an origin or browser profile.

Keep `packages/views-react/dist` and its source manifest as the generated offline distribution
artifact. Rebuild and compare it through `npm run build:browser-data-view` and
`npm run check:browser-data-view`; do not retire it as a cache. Keep the active dependency install
bound to `package-lock.json` for offline development. Use the shared Agentic OS storage owner for
one exact retained quarantine target when measured bytes justify compression; size, age and the
`node_modules` name alone do not authorize retirement. Record validation wall time separately from
allocated bytes; a browser pass is functional evidence, not a storage benchmark or data backup. For
command-level CPU/RSS, use the shared Agentic OS receipt when it owns the run; do not infer browser
origin storage from process memory or report unavailable host metrics as zero.

The GitHub Actions workflow runs the same check and writes a compact source-check receipt to the job summary. It does not publish a package, upload customer data, or provision a hosted service. It uses the included standard runner quota, one pinned checkout action, and no dependency cache or artifact upload.

The exact Git commit is the consumer distribution path; no registry publication occurs. The source-rights review and owner-selected MIT license cover this repository's owner-authored materials only; third-party components retain their own notices and licenses. `package.json` remains private to disable registry publication. Graph and Shoply Actions use separate read-only keys. Pin a full Base commit SHA; Git access method follows the repository's current visibility and consumer policy.
