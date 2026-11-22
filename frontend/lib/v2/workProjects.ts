import { workContent } from "../../app/content";

export interface BodySection {
  type: "description" | "media";
  mainTitle: string;
  subTitle: string;
  description?: string;
  mediaUrl?: string;
  mediaUrls?: string[];
}

export interface ProofLink {
  label: string;
  href: string;
}

export interface WorkProject {
  id?: string | number;
  title: string;
  subtitle?: string;
  serviceType?: string;
  startDate?: string;
  endDate?: string;
  client?: string;
  clientType?: "brand" | "person";
  category?: string;
  image?: string;
  thumbnailUrl?: string;
  videoThumbnailUrl?: string;
  logoUrl?: string;
  liveUrl?: string;
  isBookmarked?: boolean;
  bodySections?: BodySection[];
}

export function getProjectSlug(p: { id?: string | number; title?: string }, fallbackIdx = 0): string {
  const titleSlug = (p.title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (titleSlug) return titleSlug;
  if (p.id !== undefined && p.id !== null) return String(p.id);
  return `project-${fallbackIdx + 1}`;
}

export function getProjectImage(p: WorkProject): string {
  return p.image || p.thumbnailUrl || p.videoThumbnailUrl || "/images/work/ncsc_frontend.png";
}

export interface DefaultCaseStudyMeta {
  client: string;
  year: string;
  services: string[];
  summary: string;
  gallery: string[];
  proofLinks: ProofLink[];
}

const DEFAULT_CASE_STUDIES: Record<string, DefaultCaseStudyMeta> = {
  "ncsc-public-app": {
    client: "NCSC",
    year: "2025",
    services: ["React", "Frontend", "UI/UX"],
    summary:
      "A high-performance public web application built for NCSC with real-time scheduling, member portals, and seamless multi-device accessibility.",
    gallery: ["/images/work/ncsc_frontend.png", "/images/work/byterack.png"],
    proofLinks: [
      { label: "View Live App", href: "https://www.ditsndots.io/" },
      { label: "Frontend Preview", href: "/images/work/ncsc_frontend.png" },
    ],
  },
  "noor-digital-marketing": {
    client: "Noor",
    year: "2025",
    services: ["SEO", "Digital Marketing", "Growth"],
    summary:
      "A full-funnel digital marketing and technical SEO campaign built for Noor to grow organic search visibility and high-intent customer acquisition.",
    gallery: ["/images/work/noor.jpg", "/images/work/nexusai.png"],
    proofLinks: [
      { label: "View Live Campaign", href: "https://www.ditsndots.io/" },
      { label: "Campaign Visual", href: "/images/work/noor.jpg" },
    ],
  },
  "byterack-aerolutiom-inc": {
    client: "Byterack Aerolutiom Inc",
    year: "2025",
    services: ["Cloud", "Automation", "Software Dev"],
    summary:
      "Enterprise cloud automation and real-time operational control platform engineered for Byterack Aerolutiom Inc.",
    gallery: ["/images/work/byterack.png", "/images/work/ncsc_frontend.png"],
    proofLinks: [
      { label: "Visit Platform", href: "https://www.ditsndots.io/" },
      { label: "Dashboard Proof", href: "/images/work/byterack.png" },
    ],
  },
  "nexus-ai-platform": {
    client: "Nexus AI",
    year: "2026",
    services: ["AI App", "Next.js", "UI/UX Design"],
    summary:
      "An AI-native workspace and intelligent automation platform designed to turn multi-model workflows into an effortless visual interface.",
    gallery: ["/images/work/nexusai.png", "/images/work/byterack.png"],
    proofLinks: [
      { label: "Launch Live Demo", href: "https://www.ditsndots.io/" },
      { label: "Interface Preview", href: "/images/work/nexusai.png" },
    ],
  },
  "ncsc-pos-system": {
    client: "NCSC",
    year: "2025",
    services: ["POS System", "Full-Stack", "Inventory Sync"],
    summary:
      "A touch-optimized Point of Sale and real-time inventory management system engineered for fast on-site transactions.",
    gallery: ["https://picsum.photos/seed/ncfc-posh/800/600", "/images/work/ncsc_frontend.png"],
    proofLinks: [
      { label: "View Live System", href: "https://www.ditsndots.io/" },
    ],
  },
  "commscope-architect-design": {
    client: "Commscope",
    year: "2025",
    services: ["Architecture", "UI/UX", "Design System"],
    summary:
      "Unified enterprise architecture and interface design system enabling Commscope teams to visualize and deploy complex network topologies.",
    gallery: ["https://picsum.photos/seed/cummscope/800/600", "/images/work/nexusai.png"],
    proofLinks: [
      { label: "View Design System", href: "https://www.ditsndots.io/" },
    ],
  },
};

export function getCaseStudyMeta(project: WorkProject): DefaultCaseStudyMeta {
  const slug = getProjectSlug(project);
  const preset = DEFAULT_CASE_STUDIES[slug];
  const heroImg = getProjectImage(project);

  const servicesFromSubtitle = (project.subtitle || project.serviceType || project.category || "")
    .split(/[•,|/]/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Collect any extra images uploaded in CMS bodySections
  const cmsImages: string[] = [];
  let cmsDescription = "";
  if (Array.isArray(project.bodySections)) {
    project.bodySections.forEach((sec) => {
      if (!cmsDescription && sec?.description) {
        cmsDescription = sec.description;
      }
      if (sec?.mediaUrl) cmsImages.push(sec.mediaUrl);
      if (Array.isArray(sec?.mediaUrls)) {
        sec.mediaUrls.forEach((u) => {
          if (u) cmsImages.push(u);
        });
      }
    });
  }

  const rawGallery = [heroImg, ...cmsImages, ...(preset?.gallery || [])];
  const uniqueGallery = Array.from(new Set(rawGallery.filter(Boolean)));

  // Only show proof links if explicitly added to the project (e.g. liveUrl or a URL inside bodySections)
  const proofLinks: ProofLink[] = [];
  if (project.liveUrl && project.liveUrl.trim()) {
    const cleanUrl = project.liveUrl.trim();
    proofLinks.push({ label: cleanUrl, href: cleanUrl });
  }
  if (Array.isArray(project.bodySections)) {
    project.bodySections.forEach((sec) => {
      const candidate = (sec?.subTitle || "").trim();
      if (/^https?:\/\//i.test(candidate)) {
        proofLinks.push({ label: sec.mainTitle?.trim() || candidate, href: candidate });
      }
    });
  }

  return {
    client: project.client || preset?.client || project.title,
    year: project.endDate || project.startDate || preset?.year || "2025",
    services:
      servicesFromSubtitle.length
        ? servicesFromSubtitle
        : preset?.services || ["Web Development", "UI/UX Design"],
    summary:
      cmsDescription ||
      preset?.summary ||
      `${project.title} — designed and engineered by Dits and Dots Agency.`,
    gallery: uniqueGallery.length ? uniqueGallery : [heroImg],
    proofLinks,
  };
}

export function mergeWithStaticProjects(cmsProjects?: WorkProject[]): WorkProject[] {
  const staticList = (workContent.projects || []) as WorkProject[];
  if (!Array.isArray(cmsProjects) || cmsProjects.length === 0) {
    return staticList;
  }
  const validCms = cmsProjects.filter((p) => p && p.title && (p.image || p.thumbnailUrl || p.videoThumbnailUrl));
  return validCms.length > 0 ? validCms : staticList;
}
