export const skills = [
  { name: "React Native", category: "Mobile" },
  { name: "Expo", category: "Mobile" },
  { name: "Next.js", category: "Frontend" },
  { name: "React", category: "Frontend" },
  { name: "TypeScript", category: "Language" },
  { name: "Node.js", category: "Backend" },
  { name: "Express.js", category: "Backend" },
  { name: "PostgreSQL", category: "Database" },
  { name: "Prisma", category: "Database" },
  { name: "Supabase", category: "Database" },
  { name: "Redis", category: "Database" },
  { name: "Stripe", category: "Services" },
  { name: "Socket.io", category: "Services" },
  { name: "Firebase", category: "Services" },
  { name: "NextAuth", category: "Services" },
  { name: "JWT", category: "Services" },
  { name: "Zustand", category: "Frontend" },
  { name: "Tailwind CSS", category: "Frontend" },
];

export const projects = [
  {
    title: "Furrsati",
    subtitle: "Freelancing Marketplace",
    description:
      "A full-stack freelancing marketplace that connects freelancers with clients. Features an escrow-based milestone payment system where money is held securely until work is approved, protecting both parties. Includes real-time messaging, KYC identity verification, and a comprehensive admin dashboard.",
    tech: [
      "React Native",
      "Node.js",
      "Express",
      "Next.js",
      "PostgreSQL",
      "Prisma",
      "Stripe",
      "Socket.io",
      "Firebase",
      "Zustand",
    ],
    platforms: ["iOS", "Android", "Web"] as const,
    image: "/images/projects/furrsati.png",
    screenshots: {
      web: "/images/projects/furrsati/web.png",
      url: "https://furrsati.com",
      mobile: [
        "/images/projects/furrsati/mobile-1.png",
        "/images/projects/furrsati/mobile-2.png",
        "/images/projects/furrsati/mobile-3.png",
        "/images/projects/furrsati/mobile-4.png",
        "/images/projects/furrsati/mobile-5.png",
      ],
    },
    highlights: [
      "Escrow-based milestone payment system",
      "Real-time chat with Socket.io",
      "KYC identity verification flow",
      "Admin dashboard with dispute resolution",
    ],
  },
  {
    title: "Collabfront",
    subtitle: "Influencer-Brand Collaboration Platform",
    description:
      "A marketplace connecting influencers with brands for content collaborations. Supports paid campaigns, barter collaborations, and direct booking with built-in escrow payments. Features multi-language support including Arabic with full RTL layout, and a subscription system for premium features.",
    tech: [
      "React Native",
      "Expo",
      "Node.js",
      "Express",
      "Next.js",
      "PostgreSQL",
      "Prisma",
      "Stripe",
      "Socket.io",
      "Redis",
    ],
    platforms: ["iOS", "Android", "Web"] as const,
    image: "/images/projects/collabfront.png",
    screenshots: {
      web: "/images/projects/collabfront/web.png",
      url: "https://collabfront.me",
      mobile: [
        "/images/projects/collabfront/mobile-1.png",
        "/images/projects/collabfront/mobile-2.png",
        "/images/projects/collabfront/mobile-3.png",
        "/images/projects/collabfront/mobile-4.png",
        "/images/projects/collabfront/mobile-5.png",
      ],
    },
    highlights: [
      "Multi-language support (EN/FR/AR) with RTL",
      "Stripe subscriptions & escrow payments",
      "Campaign management system",
      "Real-time notifications & messaging",
    ],
  },
];

export const stats = [
  { label: "Projects Completed", value: 10, suffix: "+", icon: "projects" },
  { label: "Lines of Code", value: 50000, suffix: "+", icon: "code" },
  { label: "Technologies Used", value: 15, suffix: "+", icon: "tech" },
  { label: "Years Experience", value: 3, suffix: "+", icon: "years" },
];

export const testimonials = [
  {
    name: "Sarah M.",
    role: "Startup Founder",
    rating: 5,
    content:
      "Dani delivered our entire platform from scratch — mobile apps, backend, and admin dashboard. His attention to detail and ability to handle complex payment integrations was impressive.",
    avatar: "/images/testimonials/avatar1.png",
  },
  {
    name: "Ali Younes",
    role: "Founder, Collabfront",
    rating: 5,
    content:
      "Working with Dani was a great experience. He understood our requirements quickly and built a scalable solution that handles thousands of users. The real-time features work flawlessly.",
    avatar: "/images/testimonials/avatar2.png",
  },
  {
    name: "Fatima Darwiche",
    role: "Founder, Autre Paris",
    rating: 5,
    content:
      "Dani built our admin platform with incredible precision. The role-based access control and audit logging gave us exactly the security and oversight we needed. Highly recommended.",
    avatar: "/images/testimonials/avatar3.png",
  },
];

export const navLinks = [
  { label: "About", href: "#about" },
  { label: "Projects", href: "#projects" },
  { label: "Stats", href: "#stats" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Contact", href: "#contact" },
];

export const socialLinks = [
  { label: "GitHub", href: "https://github.com/furrsati", icon: "github" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/danizein",
    icon: "linkedin",
  },
];
