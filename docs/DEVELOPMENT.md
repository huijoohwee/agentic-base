# Development

The headless product core is native ECMAScript modules. Runtime code imports only browser platform APIs; the local test adapter uses Node built-ins. The MIT-licensed package contains source-mapped Table, Multi-dimensional Table, Kanban, Calendar, Dashboard and shared settings/panel visuals behind neutral host contracts. `TableCore` is the shared grid. A bounded browser adapter composes `DataTableCore` and builds an offline ESM artifact plus CSS; Graph can import the React source and Shoply can copy the generated artifact from its exact Base package pin. The artifact accepts at most 64 fields, 1,000 records, 4,096 characters per cell, and 192 KiB serialized payload; it renders literal text and owns no data or persistence. `migration-source.json` records source paths, canonical Graph main, and digests. The `dev/` fixture composes Base visuals with host controls for local checks; it is not a second product UI. FloatingPanel placement/lifecycle, complete consumer parity, and exact pins remain gated.

Continue centralizing the existing Graph Table, Multi-dimensional Table, Kanban, Calendar, Dashboard composition, and reusable view/field settings in this one Base-owned package. Keep Graph-specific schema sources, workflow actions, resize configuration/persistence, and host shells behind adapters. Do not author a replacement renderer or retain parallel visual implementations. Keep Dashboard snapshot/configuration, Graph Markdown editing, graph-specific MCP commands, and Agent Mission composition in Graph; after package integration, route their reusable visual imports to Base. Graph stays on its current UI until the exact Base package is distributable and passes shared-fixture and live interaction parity.

```sh
npm run check
npm run build:browser-data-view
npm run check:browser-data-view
npm run dev
```

`npm run check` parses the modules, runs the built-in Node suite, writes bounded source evidence, and runs the pinned Agentic OS evaluations. `npm run dev` serves only the demo, source modules, and root service worker on `127.0.0.1:4173`; set `HOST` or `PORT` only for a local device session. The service worker requires a secure context, which includes localhost. The browser can evict origin storage; this MVP is not a backup service.

Open `http://127.0.0.1:4173/test-browser/idb-atomicity.html` to inject an IndexedDB write failure against a temporary database, verify the committed revision remains intact, and delete the temporary database.

The GitHub Actions workflow runs the same check and writes a compact source-check receipt to the job summary. It does not publish a package, upload customer data, or provision a hosted service. It uses the included standard runner quota, one pinned checkout action, and no dependency cache or artifact upload.

The exact Git commit is the consumer distribution path; no registry publication occurs. The source-rights review and owner-selected MIT license cover this repository's owner-authored materials only; third-party components retain their own notices and licenses. `package.json` remains private to disable registry publication. Graph and Shoply Actions use separate read-only keys. Pin a full Base commit SHA; Git access method follows the repository's current visibility and consumer policy.
