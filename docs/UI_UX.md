# Storefront direction and conversion

The JavaScript edition keeps the v5 Earthveda design and its product imagery rather than resetting the brand. Existing shopping features include the bilingual shop, flavour finder, custom boxes, wishlist, bag drawer and guest checkout. The admin adds inventory and refund-job visibility without exposing implementation details in customer shopping flows.

Use this visual direction as you replace draft catalogue data:

- Bold product-led cards, clear type, warm backgrounds and product-specific accent colours.
- Real pack photography and accurate ingredients/nutrition rather than unverified wellness claims.
- An obvious add-to-bag action and a short guest checkout.
- Visible delivery price/market/currency before the customer pays.
- Useful box personalization; do not represent the existing 8/16-pouch prices as discounts unless an actual comparison supports that claim.
- Accessible contrast, keyboard navigation, readable labels and reduced-motion support.
- Real stock signals and honest fulfilment estimates. Avoid fake scarcity, fabricated reviews/countdowns or forced marketing consent.

Country affects stock/payment routing; language does not. UK prices are visibly EUR in this release. A London-only service needs its approved postcode coverage and matching shipping copy.

Before launch, test mobile widths, German text wrapping, keyboard use, checkout validation, empty/unavailable inventory, slow networks and payment returns. Automated build/tests do not replace a complete browser/accessibility review. Measure lawful consent-aware add-to-bag, checkout and completion events to identify friction; no UI can guarantee that every visitor buys.
