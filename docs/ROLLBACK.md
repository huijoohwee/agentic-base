# Rollback boundary

No deployed runtime or published package exists in this increment. Source recovery is a reviewed revert of the exact candidate after preserving its worktree and check receipt; this does not authorize a push, merge, cleanup, or deployment rollback.

Consumer rollback is an exact Base dependency-pin revert in that consumer's reviewed change. For Shoply, restore the previous generated browser asset and its manifest digest with the pin. Keep the prior import adapter and build receipt until the replacement passes; never remove consumer domain data or rewrite its schema as part of a UI rollback. No consumer cutover is complete until its rollback pin/artifact has been built and read back locally.

Browser data is a separate state effect. Source rollback must not clear IndexedDB or claim to restore user data. The current schema opens only database version 1 and fails closed on an incompatible version; destructive schema rollback and database export/import are not implemented. Keep the origin data intact and stop writes if an incompatible build is encountered. A later data migration needs an explicit backup, forward recovery, and owner-authorized receipt.
