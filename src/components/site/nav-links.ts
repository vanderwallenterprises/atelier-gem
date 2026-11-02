export const primaryNav = [
  { href: "/", label: "Discover" },
  { href: "/gemstones", label: "Gemstones" },
  { href: "/design-studio", label: "Design Studio" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/sell", label: "For Sellers" },
] as const;

export const footerNav = [
  {
    title: "Marketplace",
    links: [
      { href: "/gemstones", label: "Browse gemstones" },
      { href: "/search", label: "Search" },
      { href: "/design-studio", label: "Design Studio" },
      { href: "/how-it-works", label: "How it works" },
    ],
  },
  {
    title: "Sellers and makers",
    links: [
      { href: "/sell", label: "Sell loose gemstones" },
      { href: "/jewelers", label: "Jewelry makers" },
      { href: "/policies/fees", label: "Marketplace fees" },
      { href: "/policies/seller-terms", label: "Seller terms" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/policies/shipping", label: "Shipping" },
      { href: "/policies/returns", label: "Returns and cancellations" },
      { href: "/policies/disputes", label: "Disputes" },
      { href: "/policies/authenticity", label: "Report verification" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/policies/ai-concepts", label: "AI concept images" },
    ],
  },
] as const;
