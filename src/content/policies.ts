/**
 * Policy page content. These are working drafts that describe how the product behaves.
 * They are NOT legal advice and must be reviewed by counsel before launch (spec §25).
 * Keep statements factual about what the software does; avoid promises it doesn't keep.
 */
export type PolicySection = { heading: string; paragraphs?: string[]; list?: string[] };
export type Policy = { slug: string; title: string; summary: string; sections: PolicySection[] };

export const policies: Record<string, Policy> = {
  terms: {
    slug: "terms",
    title: "Terms of service",
    summary: "The rules for using the marketplace as a buyer, seller or jewelry maker.",
    sections: [
      {
        heading: "What the marketplace is",
        paragraphs: [
          "The marketplace connects people who sell individual loose gemstones with people who want to buy them, and with independent jewelry makers who can make pieces from them. The marketplace is not the seller of the stones listed by sellers.",
        ],
      },
      {
        heading: "Accounts",
        list: [
          "One account can buy, sell and design. Selling and offering manufacturing services require additional onboarding.",
          "You are responsible for activity on your account and for keeping your sign-in details private.",
          "Accounts may be restricted or suspended for breaching these terms. Material account decisions are recorded.",
        ],
      },
      {
        heading: "Listings and claims",
        paragraphs: [
          "Sellers are responsible for the accuracy of their listings, including treatments, origin and classification as natural or laboratory-grown. Report verification status is shown on each listing and describes only the checks that were actually performed.",
        ],
      },
      {
        heading: "Designs and quotes",
        paragraphs: [
          "Designs created in the studio are concepts. A design is only manufacturable once a jewelry maker has reviewed it and issued a quote. Estimates shown in the studio are not quotes.",
        ],
      },
      { heading: "Status of this document", paragraphs: ["Draft pending legal review. Do not rely on it as final terms."] },
    ],
  },
  privacy: {
    slug: "privacy",
    title: "Privacy policy",
    summary: "What personal information the marketplace collects and how it is used.",
    sections: [
      {
        heading: "Information we collect",
        list: [
          "Account details: email address, display name and the roles you choose.",
          "Seller and maker details you provide during onboarding, such as business name and business location at city or region level.",
          "Listings, designs, messages, orders and favorites you create.",
          "Payment and identity verification is handled by the payment provider; card numbers are not stored by the marketplace.",
        ],
      },
      {
        heading: "How it is shared",
        list: [
          "Email addresses and phone numbers are not shown to other users by default. Messaging happens inside the marketplace.",
          "When you request a quote, the design and the relevant stone details are shared with the makers you choose.",
          "AI design features send your design preferences and the selected stone's public details to the configured AI provider. Private seller records are not sent.",
        ],
      },
      { heading: "Status of this document", paragraphs: ["Draft pending legal review."] },
    ],
  },
  "seller-terms": {
    slug: "seller-terms",
    title: "Seller terms",
    summary: "Obligations for people who list gemstones.",
    sections: [
      {
        heading: "Listing rules",
        list: [
          "Each listing is one physical stone you own or are authorized to sell.",
          "Disclose all known treatments, and classify the stone as natural or laboratory-grown accurately.",
          "Only claim a grading report you hold for that stone. Report numbers are checked; mismatches are shown to buyers and may lead to removal.",
          "Do not use laboratory names or logos to suggest endorsement.",
        ],
      },
      {
        heading: "Payouts",
        paragraphs: [
          "Payouts are made through the payment provider after its seller onboarding is complete. Payout timing and holds follow the published fees and payout policy.",
        ],
      },
      { heading: "Status of this document", paragraphs: ["Draft pending legal review."] },
    ],
  },
  fees: {
    slug: "fees",
    title: "Marketplace fees",
    summary: "How the marketplace commission and payment fees are calculated.",
    sections: [
      {
        heading: "Commission",
        paragraphs: [
          "The marketplace charges sellers a commission on the stone's sale price, excluding shipping and tax. The rate is set in the marketplace configuration and shown to sellers before they publish a listing. It has not been finalized.",
          "Each order records the gross amount, payment processing fees, marketplace commission, refunds and the net amount payable to the seller.",
        ],
      },
      { heading: "Status of this document", paragraphs: ["Rates are not yet set. This page will state them before payments go live."] },
    ],
  },
  shipping: {
    slug: "shipping",
    title: "Shipping",
    summary: "How sellers ship stones and what buyers can expect.",
    sections: [
      {
        heading: "Shipping",
        list: [
          "Each listing states its handling time, shipping regions and whether shipments are insured and tracked.",
          "Loss or damage in transit is handled under the dispute process.",
        ],
      },
      { heading: "Status of this document", paragraphs: ["Draft pending review."] },
    ],
  },
  returns: {
    slug: "returns",
    title: "Returns and cancellations",
    summary: "Return windows and cancellation rules for stones and custom pieces.",
    sections: [
      {
        heading: "Loose stones",
        paragraphs: ["Each seller sets a return policy, shown on the listing before purchase."],
      },
      {
        heading: "Custom pieces",
        paragraphs: [
          "Custom pieces are made to order. Each maker's quote states its revision and cancellation policy, and you accept it when you approve the quote.",
        ],
      },
      { heading: "Status of this document", paragraphs: ["Draft pending legal review."] },
    ],
  },
  disputes: {
    slug: "disputes",
    title: "Disputes",
    summary: "What happens when something goes wrong with an order.",
    sections: [
      {
        heading: "Opening a dispute",
        list: [
          "Open a dispute from the order page if an item doesn't arrive, arrives damaged, or doesn't match its listing or report.",
          "Both parties can submit evidence. Marketplace staff review it and record the decision.",
          "Refunds and chargebacks are processed through the payment provider.",
        ],
      },
      { heading: "Status of this document", paragraphs: ["Draft pending legal review."] },
    ],
  },
  authenticity: {
    slug: "authenticity",
    title: "Report verification",
    summary: "What a verified report means on this marketplace, and what it doesn't.",
    sections: [
      {
        heading: "Three separate checks",
        paragraphs: [
          "A grading report number on a listing starts as the seller's claim. We record three separate checks and never treat one as another:",
        ],
        list: [
          "Report record: whether the issuing laboratory has a report with that number. Checked through an authorized laboratory service where one is configured, otherwise by our reviewers using the laboratory's public report-check page.",
          "Listing consistency: whether the listing's weight, measurements and grades agree with that report record. Differences are shown on the listing.",
          "Physical match: whether the actual stone has been examined and matched to the report. This requires the stone; listings state when it has not been done.",
        ],
      },
      {
        heading: "What “report verified” means",
        paragraphs: [
          "A listing shows “report verified” only when the record check and the listing-consistency check have both passed under the current verification policy. It does not mean the marketplace has examined the stone unless the listing also says the physical match was completed.",
          "The marketplace is not affiliated with, and is not endorsed by, any gemological laboratory. Laboratory names identify who issued a report.",
        ],
      },
      {
        heading: "Rechecks",
        paragraphs: ["Verification can be marked for recheck if a report is updated, a listing is edited, or new evidence appears."],
      },
    ],
  },
  "ai-concepts": {
    slug: "ai-concepts",
    title: "AI concept images and estimates",
    summary: "The limits of the Design Studio's AI-generated images and estimates.",
    sections: [
      {
        heading: "Concept images",
        list: [
          "Concept images are generated illustrations, not photographs of the stone you selected.",
          "They may not show the stone's exact color, facets, proportions or size.",
          "They are not CAD files or manufacturing drawings. A jewelry maker reviews every design before quoting.",
        ],
      },
      {
        heading: "Estimates",
        paragraphs: [
          "Studio estimates come from configured pricing data such as metal prices and typical labor ranges. They are labelled as estimates. Only a maker's quote is a price you can accept.",
        ],
      },
    ],
  },
};
