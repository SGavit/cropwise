# Display-name editor verification

## Desktop

The signed-in Account page at `/account` rendered the current session with a dedicated **Display name** card and a visible **Change display name** action. Email, connected account, role, user ID, and last-sign-in metadata remained separate read-only session details.

## Mobile

At 375 × 812, the display-name card and action remained visible and touch-sized. The Account page stacked the session and retention sections without clipping inside the card content. The back-to-dashboard control remains available at the top of the page.

## Validation

The account UI is reachable from the dashboard account menu through **Manage account**. Automated validation passed before this visual check: 19 test files passed, 1 optional Resend integration test skipped, 66 tests passed, and TypeScript validation completed successfully.

The sandbox browser session itself was unauthenticated and redirected to `/sign-in`; the managed preview screenshot used its authenticated preview state and showed the profile record for the current owner account.
