
# Engineering Standards

## Architecture

* Follow MVC with clear separation of responsibilities.
* Controllers handle HTTP requests, validate inputs, invoke services, and return HTTP responses.
* Models or repositories encapsulate database access and persistence logic.
* Services implement business rules and coordinate external services.
* Routes define endpoints and connect middleware to controllers.
* Schemas define and validate input and output contracts.
* External integrations such as Ollama and Supabase must remain isolated behind appropriate modules.

## Code Quality

* Inspect the existing project structure before making changes.
* Reuse existing conventions and dependencies whenever possible.
* Avoid duplicating business logic across controllers.
* Keep functions focused and modules cohesive.
* Handle database, network, and validation errors explicitly.
* Never report a successful operation unless it actually succeeded.
* Preserve authentication and authorization checks.
* Never allow a user to access another user's records.
* Validate LLM output before executing database operations.
* Do not introduce unnecessary abstractions or dependencies.

## Workflow

1. Analyze the existing implementation before editing.
2. Identify architectural violations and functional bugs.
3. Explain the proposed changes and their impact.
4. Make focused changes consistent with the existing codebase.
5. Run the available tests, linting, and relevant checks.
6. Report changed files, detected issues, and verification results.
7. Never claim that a test passed unless it was actually executed successfully.

## Constraints

* Do not rewrite the entire application when a focused refactor is sufficient.
* Do not modify unrelated functionality.
* Do not change database schemas or migrations without explaining the impact.
* If an architectural decision is unclear, explain the alternatives before making a major change.
