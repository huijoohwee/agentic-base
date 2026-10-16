# Development

The headless product core is native ECMAScript modules. Runtime code imports only browser platform APIs; the local test adapter uses Node built-ins. Private staging under `packages/views-react` now includes source-mapped Table, Multi-dimensional Table, Kanban, and Calendar components; one shared Table grid; saved-view settings; MainPanel settings, FloatingPanel shell/close visuals, and Workflow Manager field presentation; and Dashboard layout, card, chart, widget, disclosure, and resize visuals. Host-specific controls, data, schema, actions, drag policy, and panel lifecycle remain injected. `migration-source.json` records 54 candidate/source paths, canonical Graph main, and digests. The `dev/` fixture composes Base visuals with host controls for local interaction checks; it is not a release build or a second product UI. FloatingPanel placement/lifecycle, complete parity, package distribution, and consumer cutover remain gated.

Continue centralizing the existing Graph Table, Multi-dimensional Table, Kanban, Calendar, Dashboard composition, and reusable view/field settings in this one Base-owned package. Keep Graph-specific schema sources, workflow actions, resize configuration/persistence, and host shells behind adapters. Do not author a replacement renderer or retain parallel visual implementations. Keep Dashboard snapshot/configuration, Graph Markdown editing, graph-specific MCP commands, and Agent Mission composition in Graph; after package integration, route their reusable visual imports to Base. Graph stays on its current UI until the exact Base package is distributable and passes shared-fixture and live interaction parity.

```sh
npm run check
npm run dev
```

`npm run check` parses the modules, runs the built-in Node suite, writes bounded source evidence, and runs the pinned Agentic OS evaluations. `npm run dev` serves only the demo, source modules, and root service worker on `127.0.0.1:4173`; set `HOST` or `PORT` only for a local device session. The service worker requires a secure context, which includes localhost. The browser can evict origin storage; this MVP is not a backup service.

Open `http://127.0.0.1:4173/test-browser/idb-atomicity.html` to inject an IndexedDB write failure against a temporary database, verify the committed revision remains intact, and delete the temporary database.

The GitHub Actions workflow runs the same check and writes a compact source-check receipt to the job summary. It does not publish a package, upload customer data, or provision a hosted service. It uses the included standard runner quota, one pinned checkout action, and no dependency cache or artifact upload.

The repository is private and the exact private Git source is the distribution path; no registry publication occurs. Consumer CI uses its own read-only deploy key. Pin a full Base commit SHA and install via `git+ssh://git@github.com/huijoohwee/agentic-base.git#<sha>`. Public distribution still requires a FOSS license and source-rights review.
