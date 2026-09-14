# CropWise Design Direction

## Three Possible Approaches

### Theme Name: Monsoon Field Notes
Very Brief Intro: An editorial agronomy interface inspired by field notebooks, monsoon skies, and seed packets. It feels grounded, trustworthy, and made for real decisions rather than abstract dashboards.
Probability: 0.07

### Theme Name: Mandi Signal
Very Brief Intro: A bright utility-first market dashboard that turns weather, crop fit, and price movement into fast visual signals. It is energetic, legible, and operational.
Probability: 0.03

### Theme Name: Soil & Sun
Very Brief Intro: A soft, tactile interface with clay, leaf, and sun tones that makes agriculture feel personal and optimistic. It uses warmth and restraint to build confidence for first-time users.
Probability: 0.08

## Selected Approach: Monsoon Field Notes

### Design Movement
Contemporary editorial utility: part agronomy field journal, part calm decision-support console. The interface should feel like a trusted extension of a farmer's notebook, translated into a modern product without losing its human texture.

### Core Principles
1. Information should read in layers: immediate action first, supporting context second, deeper agronomy third.
2. Every visual signal must be interpretable at a glance, especially on small screens and in bright outdoor conditions.
3. Texture and warmth should make the product feel local and human, while spacing and typography keep it precise.
4. The primary action is always visible: help a farmer choose the next crop decision with confidence.

### Color Philosophy
The foundation is a warm rice-paper cream, not clinical white. Deep indigo provides high-contrast structure inspired by evening monsoon skies, while leaf green signals healthy recommendations and marigold marks time-sensitive actions. A restrained terracotta accent adds a tactile agricultural note. The ownable brand color is **Monsoon Indigo #223A5E**: calm, dependable, and distinct from the expected green-only agri palette.

### Layout Paradigm
Use an asymmetric, editorial dashboard: a narrow left rail for orientation on desktop, a broad field of content with stacked cards, and an offset recommendation rail that feels like a pinned field note. On mobile, the rail collapses into a bottom navigation and the layout becomes a vertical sequence of decision moments.

### Signature Elements
1. A small sun-and-sprout crop mark used as the brand symbol and status accent.
2. “Field note” labels, thin ruled dividers, and small uppercase metadata that make data feel recorded rather than dumped.
3. Quiet paper grain and soft inset shadows that add tactile depth without making the UI ornamental.

### Interaction Philosophy
Interactions should feel like turning a page or pinning a note: deliberate, light, and instantly legible. Hover states lift cards slightly; selection states use a solid indigo edge; primary actions respond with a short physical press. Placeholder features use a toast that clearly says what is coming next.

### Animation
Use 180–260ms ease-out transitions for buttons, tabs, cards, and the sidebar. Cards enter with a subtle opacity and 8px upward movement, staggered by 40ms. Recommendation scores can animate once from 0 to their current value, but all key information remains visible without motion. Respect reduced-motion preferences.

### Typography System
Display and section headings use **Fraunces** in medium or semibold weights for an editorial, human voice. Body and data use **DM Sans** for clarity at small sizes. Metadata is DM Sans uppercase with 0.12em tracking. Use large numerals sparingly for score and profit so they read as decisions, not decoration.

### Brand Essence
CropWise is the calm agronomy companion for smallholder farmers who want the next crop decision to be clearer, more profitable, and better matched to their land.
Personality adjectives: grounded, generous, capable.

### Brand Voice
Headlines are direct but never cold. CTAs sound like confident invitations, not marketing slogans. Microcopy explains the reason behind a recommendation in plain language.
Example headline: “A better crop starts with the field you have.”
Example CTA: “See what fits your soil.”

### Wordmark & Logo
The mark is a compact sprout emerging from a circular sun, with one leaf shaped like a subtle checkmark. The wordmark is set in a custom-feeling Fraunces treatment with a slightly tightened “Crop” and an open “Wise,” communicating both cultivation and judgment. The icon must work independently at favicon size.

### Signature Brand Color
**Monsoon Indigo #223A5E**.

## Style Decisions

- The desktop orientation area must show the CropWise mark and Fraunces wordmark so the dashboard reads as a product, not a generic template.
- The recommendation rail stays offset beside the main crop shortlist, with the soil profile note acting as the pinned reason behind the decision.
- Recommendation microcopy names the reason a crop fits the field: pH and rain fit, market fit, or low water need.
- Monsoon Indigo remains the structural anchor; marigold marks action, green marks healthy fit, and terracotta marks seasonal timing.
