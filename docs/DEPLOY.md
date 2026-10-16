# Deployment boundary

There is no hosted deployment in this increment. The supported runtime is a static browser demo with same-origin IndexedDB. Local demonstration uses `npm run dev`; Shoply can bundle the bounded Base browser artifact into its existing offline static assets. Consumer distribution uses exact private Git commits with separate read-only keys; there is no registry publish. Production host selection, public source license, release authority, storage recovery, and consumer pin/cutover remain gated.

The source workflow may prove checks for an exact commit. It does not authorize package publication, static-site upload, a remote object store, an edge runtime, schema migration, or production promotion. Revisit this boundary only with a selected product owner, exact target and artifact, a verified free/FOSS path, backup/restore proof, and a separate operator instruction.
