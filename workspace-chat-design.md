# CropWise Functional Workspaces — Design Notes

- The dashboard currently keeps all main content mounted and uses `navigateWorkspace` only to scroll to section anchors. The new implementation will switch the workspace content for **Overview**, **Crop Plan**, **Crop Wealth Watch**, and **Krishi Expert**, while retaining the existing shared sidebar and top bar.
- The hero date will be derived from the current browser date with `Intl.DateTimeFormat`, using the selected English, Hindi, or Marathi locale instead of the static hero-date phrase.
- Crop Wealth Watch will reuse live district weather, selected crop, market values, and crop-fit signals so that every card is grounded in existing, interactive dashboard data.
- Krishi Expert will reuse the existing accessible `AIChatBox` component and call a public, rate-limited tRPC mutation. The server will use the live-catalog-verified `gpt-5-mini` model with concise multilingual responses, prevention-first crop guidance, and an explicit reminder to consult qualified local agricultural support for uncertain or high-risk cases.
