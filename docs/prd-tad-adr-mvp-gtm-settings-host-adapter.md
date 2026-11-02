---
title: "Shared Settings Host Adapter"
doc_type: "PRD-TAD-ADR-MVP-GTM"
continuity_id: "BASE-SHARED-SETTINGS-HOST-001"
version: "0.1.0"
prd_revision: "0.1.0"
tad_revision: "0.1.0"
adr_revision: "0.1.0"
mvp_revision: "0.1.0"
gtm_revision: "0.1.0"
date: "2026-11-01"
owner: "agentic-base shared views"
frontmatter_contract: "required"
local_rung: "spec-complete"
delivered_rung: "undocumented"
universal_scope: false
lifecycle_status: "proposed"
load_policy: "on-demand"
---

# Shared Settings Host Adapter

## PRD

Consumers need to reuse Base-owned view and field settings without copying their visual controls or
creating parallel variants. The package already defines a neutral settings host contract and shared
settings primitives, but it does not expose the provider through its public settings entry point.

Expose the existing `SettingsHostAdapter` type and `SettingsHostProvider` from
`@agentic-base/views-react/settings`. Consumers provide their own theme tokens and input controls;
Base remains the sole owner of shared settings presentation. This is additive and does not change
data ownership, view state, persistence, actions, authorization, or FloatingPanel placement/lifecycle.

## TAD and ADR

The source of truth remains `packages/views-react/src/settings/SettingsHostContext.tsx`. The public
`settings` entry point re-exports its provider and contract type; it does not define a second context
or a consumer-specific theme. Consumers may wrap Base primitives with this provider and keep only
domain-specific state and actions in their adapters.

Reject copying the shared primitives into consumers or importing Base implementation files through
private paths. Both choices create competing ownership or a brittle package boundary.

## MVP and acceptance

- The public settings entry point exports the provider and adapter type from the existing context.
- Existing settings primitives keep the same behavior and visual contract.
- A consumer can compile against the public package entry point and provide its own adapter.
- No runtime dependency, data store, network call, or persistent effect is added.
- Local source checks and a live consumer UI review establish that shared controls render under the
  consumer adapter; no deployment or package publication is included.

## GTM and operating boundary

This is a free/FOSS maintainer improvement. Demand and willingness to pay are unknown. The package
remains unpublished and exact Git pins remain the consumer distribution mechanism. A protected merge
is required before consumers update their pins; this plan grants no release or deployment authority.
