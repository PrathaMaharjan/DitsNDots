// Static content for the Dits and Dots Agency Home landing page.

export const heroContent = {
  headlineLine1: "Engineering Digital Excellence.",
  description:
    "Your end-to-end partner for Web Development, AI Solutions, and Creative Media. We build the future, one dot at a time.",
};

export const positionContent = {
  statement:
    "In the fast-paced digital landscape, reliability is the ultimate currency. Dits and Dots serves as your extended team, providing seamless integration and dedicated support for your most ambitious projects.",
};

export const logosContent = [
  { name: "NCSC" },
  { name: "NOOR" },
  { name: "COMMSCOPE" },
  { name: "BYTERACK" },
  { name: "NEXUS AI" },
];

// `display` opts a stat out of the count-up animation and renders as-is.
export const statsContent = [
  { value: 99, suffix: "%", label: "Project Success" },
  { value: 92, suffix: "%", label: "Client Retention" },
  { value: 0, suffix: "", display: "99.9%", label: "Uptime Guarantee" },
  { value: 45, suffix: "%", label: "ROI Increase" },
];

export const capabilitiesContent = {
  pillars: {
    web: {
      id: "01",
      label: "ENGINEERING",
      title: "WEB DEVELOPMENT",
      description:
        "High-performance, scalable web applications built with modern frameworks and cutting-edge tech.",
      tag: "Web Development, Full-Stack",
    },
    marketing: {
      id: "02",
      label: "GROWTH",
      title: "DIGITAL MARKETING",
      description:
        "Data-driven strategies to amplify your brand presence and drive measurable growth across all channels.",
      tag: "SEO, Performance Marketing",
    },
    ai: {
      id: "03",
      label: "INTELLIGENCE",
      title: "AI-DRIVEN APPS",
      description:
        "Intelligent solutions leveraging machine learning to automate processes and enhance user experiences.",
      tag: "AI Solutions, Machine Learning",
    },
    design: {
      id: "04",
      label: "DESIGN",
      title: "GRAPHIC DESIGNING",
      description:
        "Visual storytelling that resonates. From branding to UI/UX, we design for impact and clarity.",
      tag: "Branding, UI/UX Design",
    },
    video: {
      id: "05",
      label: "MEDIA",
      title: "VIDEO EDITING",
      description:
        "Cinematic video production and editing that captures attention and tells your story beautifully.",
      tag: "Video Production, Motion",
    },
  },
};

export const workContent = {
  projects: [
    {
      id: 1,
      title: "NCSC Public App",
      subtitle: "React • Frontend",
      category: "Web Dev",
      image: "/images/work/ncsc_frontend.png",
    },
    {
      id: 2,
      title: "Noor Digital Marketing",
      subtitle: "SEO • Marketing",
      category: "Marketing",
      image: "/images/work/noor.jpg",
    },
    {
      id: 3,
      title: "Byterack Aerolutiom Inc",
      subtitle: "Automation • Cloud",
      category: "Software Dev",
      image: "/images/work/byterack.png",
    },
    {
      id: 4,
      title: "Nexus AI Platform",
      subtitle: "AI App • UI/UX",
      category: "AI App",
      image: "/images/work/nexusai.png",
    },
    {
      id: 5,
      title: "NCSC POS System",
      subtitle: "POS • Full-Stack",
      category: "Software Dev",
      image: "https://picsum.photos/seed/ncfc-posh/800/600",
    },
    {
      id: 6,
      title: "Commscope Architect Design",
      subtitle: "Architecture • UI/UX",
      category: "Design",
      image: "https://picsum.photos/seed/cummscope/800/600",
    },
  ],
};

export const processContent = {
  steps: [
    {
      id: "01",
      title: "Discovery",
      description:
        "We align on your business goals, technical requirements, and timeline to map out the right digital ecosystem.",
    },
    {
      id: "02",
      title: "Architecture",
      description:
        "Seamless integration planning, UI/UX systems, and scalable stack selection before a single line of code is written.",
    },
    {
      id: "03",
      title: "Build",
      description:
        "Dedicated teams across web, AI, marketing, and creative media shipping weekly milestones with transparent progress.",
    },
    {
      id: "04",
      title: "Scale",
      description:
        "Launch with 99.9% uptime standards, continuous optimization, and long-term partnership support as your business grows.",
    },
  ],
};

export const peopleContent = {
  team: [],
};

export const testimonialsContent = [
  {
    quote:
      "Dits and Dots serves as our extended engineering team — their seamless integration and dedicated support helped us launch on schedule.",
    authorName: "NCSC Team",
    authorRole: "Public App & POS System",
    theme: "light" as const,
  },
  {
    quote:
      "Their data-driven SEO and digital marketing strategy amplified our brand presence and delivered measurable ROI across every channel.",
    authorName: "Noor Leadership",
    authorRole: "Digital Marketing Partner",
    theme: "light" as const,
  },
  {
    quote:
      "From cloud automation to UI/UX, they don't just deliver code — they build comprehensive digital ecosystems that evolve with our business.",
    authorName: "Byterack Aerolutiom Inc",
    authorRole: "Automation & Cloud",
    theme: "light" as const,
  },
  {
    quote:
      "Combining AI-driven workflows with sharp product design, the Nexus AI Platform launch exceeded every performance benchmark.",
    authorName: "Nexus AI",
    authorRole: "AI Platform & UI/UX",
    theme: "light" as const,
  },
];

export const careersContent = {
  badge: "CAREERS",
  title: "We are hiring",
  description:
    "Send the project you are proudest of. If it is good we will find a seat for you, listed role or not.",
  roles: [
    { title: "Full-Stack Web Engineer", location: "The Colony, TX / Remote", type: "Full-time" },
    { title: "AI Solutions Engineer", location: "Remote", type: "Full-time" },
    { title: "Digital Marketing Strategist", location: "Remote", type: "Contract" },
  ],
};

export const hiringTeamContent: { name: string; role: string; description?: string }[] = [];

export const faqContent = {
  questions: [
    {
      question: "What does Dits and Dots actually do?",
      answer:
        "We are an end-to-end partner for Web Development, AI-Driven Apps, Digital Marketing, Graphic Designing, and Video Editing — building complete digital ecosystems.",
    },
    {
      question: "How does your B2B partnership model work?",
      answer:
        "Dits and Dots serves as your extended team, providing seamless integration, dedicated teams, and long-term reliability so your technology stack stays ahead of the curve.",
    },
    {
      question: "Where are you located and do you work globally?",
      answer:
        "We are based at 3620 Adelaide, The Colony, TX 75056, and partner with global brands across time zones.",
    },
    {
      question: "How do we start a project?",
      answer:
        "Reach out via the contact form, email hello@Ditsanddots.com, or call +1 (817) 330-9194 to discuss your goals and scope.",
    },
  ],
};

export const contactContent = {
  headlineLine1: "Let's Build Something",
  headlineLine2: "Extraordinary.",
  description:
    "Ready to elevate your digital presence? Reach out to us today and let's discuss how we can help your business grow.",
  email: "hello@Ditsanddots.com",
  phone: "+1 (817) 330-9194",
  skills: [
    { label: "Web Development", accent: true },
    { label: "AI-Driven Apps", accent: false },
    { label: "Digital Marketing", accent: true },
    { label: "Graphic Designing", accent: true },
    { label: "Video Editing", accent: false },
    { label: "React", accent: false },
    { label: "Next.js", accent: true },
    { label: "Full-Stack", accent: true },
    { label: "Cloud & Automation", accent: false },
    { label: "SEO & Growth", accent: true },
    { label: "UI/UX Design", accent: true },
    { label: "POS Systems", accent: false },
    { label: "Machine Learning", accent: false },
    { label: "Brand Systems", accent: true },
  ],
};
