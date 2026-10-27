# agentic-base

One portable, headless contract for explicitly base-owned records and deterministic Table, Multi-dimensional Table, Kanban, and Calendar projections. The first adapter stores data in the current browser origin with IndexedDB. The core has no runtime dependencies and makes no network requests.

## Local demo

Requires Node.js 22 or later for the development scripts. No package install is needed.

```sh
npm run dev
```

Open `http://127.0.0.1:4173/`. Choose **Create local sample** to create a base and sample records. Reload the page to read the same origin-local data. The service worker caches only the static demo and source modules; record data stays in IndexedDB.

## Contract use

Import `createBaseEngine` and `IndexedDBAdapter` from `src/index.mjs`. Supply an authorization callback for each operation. The callback is the caller's local policy hook; it is not an identity system or a security boundary against other same-origin code. See [Product scope](docs/PRODUCT.md), [development](docs/DEVELOPMENT.md), [deployment](docs/DEPLOY.md), and [rollback](docs/ROLLBACK.md).

Record writes require both an expected base revision and, for update/delete, an expected record revision. Conflicts return typed errors without partial writes. Views are pure projections of a bounded snapshot.

## Scope and status

This public repository remains canonical. `agentic-base-private-archive` is a private,
frozen history copy, not a package, build, or release source. Follow the [shared private
archive policy](https://github.com/huijoohwee/agentic-os/blob/main/guides/PRIVATE-ARCHIVE-POLICY.md).

The demo is a projection harness, not a second product UI. This repository is the canonical Git source for the shared views; exact commit pins are consumed through Git access. Table and Multi-dimensional Table share one Base grid; the optional graph overlay remains a host callback. Dashboard visuals, saved-view settings, reusable MainPanel settings, FloatingPanel shell/close visuals, and Workflow Manager field presentation also use neutral host contracts. `packages/views-react/migration-source.json` pins 54 source/candidate pairs to canonical `agentic-graph` main with SHA-256 digests. Graph imports Base React views from an exact commit pin, and Shoply consumes the bounded browser Table artifact from an exact Base commit pin. Graph-specific schemas, controls, data formatting, drag policy, field actions, outer panels, and Mission content remain host supplied. Both consumers retain their data and product lifecycle. FloatingPanel placement/lifecycle and complete interaction parity remain open. No competing renderer is retained.

This implementation does not provide file storage, remote sync, an edge database, MCP/WebMCP servers, or production deployment. The repository's original materials are licensed under MIT; see [LICENSE](LICENSE). Third-party components retain their own licenses and notices. `package.json` remains private to prevent registry publication; GitHub source visibility does not publish a package. No consumer data or credentials belong in this repository.

Graph PR #1470 was closed as superseded by merged successor #1471, which includes the same functional view changes and later Calendar refinements. Graph's current `main` passed its protected Integration Gate. Graph imports the shared React views from Base, while Shoply embeds the bounded browser Table artifact; both keep their schemas, data, authorization, actions, persistence, and host lifecycle. This repository change does not migrate consumer data or deploy either product.
