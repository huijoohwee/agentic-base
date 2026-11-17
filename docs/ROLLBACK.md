# Rollback boundary

No deployed runtime or published package exists in this increment. Source recovery is a reviewed revert of the exact candidate after preserving its worktree and check receipt; this does not authorize a push, merge, cleanup, or deployment rollback.

For the shared panel family, restore the prior exact `agentic-design-system` Git pin and package lock together with the reviewed consumer import commit. Restore any retained generated projections to their exact prior source revision and digests. Do not leave mixed Design System revisions, restore a Base forwarding adapter, or add local panel style/token overrides during rollback.

Consumer rollback is an exact Design System dependency-pin revert in that consumer's reviewed change. For Shoply, restore the previous generated browser asset and its manifest digest with the pin. Keep the prior source revision and build receipt until the replacement passes; never remove consumer domain data or rewrite its schema as part of a UI rollback. No consumer cutover is complete until its rollback pin/artifact has been built and read back locally.

Browser data is a separate state effect. Source rollback must not clear IndexedDB or claim to restore user data. The current schema opens only database version 1 and fails closed on an incompatible version; destructive schema rollback and database export/import are not implemented. Keep the origin data intact and stop writes if an incompatible build is encountered. A later data migration needs an explicit backup, forward recovery, and owner-authorized receipt.

## Sheets recovery

Source/UI rollback restores the exact prior Sheets source, generated artifact and central profile pin/bytes together. Preserve the browser database and downloaded snapshots; never delete IndexedDB or other product caches as part of source rollback. Restore validates version/limits and uses the current expected revision; imported clone is explicit and assigns fresh identities. A browser quota/conflict/cancellation error keeps the accepted workbook and the visible unsaved draft. The app's snapshot file is user-controlled data and must not enter a Git or static-site artifact. A public rollback still belongs to the native site controller and exact retained whole-site/route predecessor; local build success grants no deployment authority.
