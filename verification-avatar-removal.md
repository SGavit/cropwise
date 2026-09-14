
## Avatar removal verification — 2026-08-28

The protected removal route is covered by the authenticated router regression: it forwards `null` to the account avatar helper, returns `avatarUrl: null`, and does not create a storage upload. Account UI verification confirms the avatar panel remains clean at desktop and 375px phone widths. When an avatar exists, the localized Remove photo action appears next to the upload guidance; removal clears the local preview immediately, restores initials/default-avatar rendering, refreshes authenticated profile data, and allows the profile-completion avatar item to update. With no uploaded photo in the current preview session, the conditional removal action correctly stays hidden.
