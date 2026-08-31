# RFC-001 — Multi-Tenant Foundation

Status: Implemented in v0.2.0

## Scope
Organization → Membership → Workspace → Project.

## Limitation
Authentication and authorization are intentionally not faked in v0.2.0.
They are the focus of v0.3.0.

## Acceptance criteria
- relational tenant hierarchy exists;
- migrations are repeatable;
- project data is persisted;
- write payloads are validated.
