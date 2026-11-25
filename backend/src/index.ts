import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log("DATABASE_URL connection string is loaded:", process.env.DATABASE_URL ? "YES" : "NO");
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import nodemailer from 'nodemailer';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import {
  hero,
  position,
  capabilities,
  projects,
  faqsMetadata,
  faqsItems,
  processSteps,
  peopleMetadata,
  teamMembers,
  logos,
  companyStats,
  testimonials,
  careersMetadata,
  careersRoles,
  contactInfo,
  contactSkills
} from './db/schema';

const app = express();
const port = process.env.PORT || 3001;

// Database connection
const dbUrl = (process.env.DATABASE_URL || "").trim();
const poolConfig = {
  connectionString: dbUrl,
  ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? undefined : { rejectUnauthorized: false }
};

const pool = new pg.Pool(poolConfig);
const db = drizzle({ client: pool });

// --- Admin Credential Helpers (scrypt salted hashing) ---
const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@ditsndots.com').trim().toLowerCase();
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPasswordHash(plain: string, stored: string): boolean {
  if (!plain || !stored) return false;
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  try {
    const derived = crypto.scryptSync(plain, salt, 64);
    const keyBuf = Buffer.from(keyHex, 'hex');
    if (derived.length !== keyBuf.length) return false;
    return crypto.timingSafeEqual(derived, keyBuf);
  } catch {
    return false;
  }
}

async function getAdminCredentials(): Promise<{ email: string; passwordHash: string } | null> {
  try {
    const res = await pool.query('SELECT email, password_hash FROM admin_credentials WHERE id = 1 LIMIT 1;');
    if (res.rows.length > 0) {
      return {
        email: String(res.rows[0].email || DEFAULT_ADMIN_EMAIL).trim().toLowerCase(),
        passwordHash: String(res.rows[0].password_hash || ''),
      };
    }
  } catch (err) {
    console.error('Failed to read admin_credentials:', err);
  }
  return null;
}

async function verifyAdminPassword(plain: string): Promise<boolean> {
  if (!plain) return false;
  const creds = await getAdminCredentials();
  if (creds && creds.passwordHash) {
    return verifyPasswordHash(plain, creds.passwordHash);
  }
  return plain === DEFAULT_ADMIN_PASSWORD;
}

async function verifyAdminCredentials(email: string, password: string): Promise<{ ok: boolean; email?: string }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !password) return { ok: false };
  const creds = await getAdminCredentials();
  if (creds && creds.passwordHash) {
    const ok = cleanEmail === creds.email && verifyPasswordHash(password, creds.passwordHash);
    return ok ? { ok: true, email: creds.email } : { ok: false };
  }
  const ok = cleanEmail === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASSWORD;
  return ok ? { ok: true, email: DEFAULT_ADMIN_EMAIL } : { ok: false };
}

// Automatically ensure schema tables and columns exist
async function initDbSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hero (
        id INTEGER PRIMARY KEY DEFAULT 1,
        location VARCHAR(255) NOT NULL DEFAULT '',
        headline_line1 VARCHAR(255) NOT NULL DEFAULT '',
        headline_line2 VARCHAR(255) NOT NULL DEFAULT '[]',
        headline_line3 VARCHAR(255) NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS position (
        id INTEGER PRIMARY KEY DEFAULT 1,
        statement TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS capabilities (
        id VARCHAR(50) PRIMARY KEY,
        slot_id VARCHAR(10) NOT NULL DEFAULT '',
        label VARCHAR(255) NOT NULL DEFAULT '',
        title VARCHAR(255) NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        image_url TEXT NOT NULL DEFAULT '',
        tag VARCHAR(255) NOT NULL DEFAULT '',
        badge VARCHAR(255) NOT NULL DEFAULT '',
        is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL DEFAULT '',
        subtitle VARCHAR(255) NOT NULL DEFAULT '',
        service_type VARCHAR(255) NOT NULL DEFAULT '',
        start_date VARCHAR(100) NOT NULL DEFAULT '',
        end_date VARCHAR(100) NOT NULL DEFAULT '',
        client VARCHAR(255) NOT NULL DEFAULT '',
        client_type VARCHAR(50) NOT NULL DEFAULT 'brand',
        ratio VARCHAR(20) NOT NULL DEFAULT '16:10',
        category VARCHAR(255) NOT NULL DEFAULT 'Web Dev',
        logo_url TEXT NOT NULL DEFAULT '',
        thumbnail_url TEXT NOT NULL DEFAULT '',
        video_thumbnail_url TEXT NOT NULL DEFAULT '',
        is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE,
        body_sections TEXT NOT NULL DEFAULT '[]',
        sort_order INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS faqs_metadata (
        id INTEGER PRIMARY KEY DEFAULT 1,
        badge VARCHAR(255) NOT NULL DEFAULT 'GOT QUESTIONS?',
        title VARCHAR(255) NOT NULL DEFAULT 'FREQUENTLY ASKED QUESTIONS',
        description TEXT NOT NULL DEFAULT '',
        button_text VARCHAR(255) NOT NULL DEFAULT 'VIEW ALL FAQS +',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS faqs_items (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL DEFAULT '',
        answer TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS process_steps (
        id SERIAL PRIMARY KEY,
        step_id VARCHAR(10) NOT NULL DEFAULT '',
        title VARCHAR(255) NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS people_metadata (
        id INTEGER PRIMARY KEY DEFAULT 1,
        extra_count INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS team_members (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL DEFAULT '',
        role VARCHAR(255) NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        avatar_url TEXT NOT NULL DEFAULT '',
        original_avatar_url TEXT NOT NULL DEFAULT '',
        socials TEXT NOT NULL DEFAULT '[]',
        is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS logos (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL DEFAULT '',
        image_url TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query('ALTER TABLE capabilities ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT \'\';');
    await pool.query('ALTER TABLE capabilities ADD COLUMN IF NOT EXISTS is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE;');
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE;');
    await pool.query('ALTER TABLE team_members ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT \'\';');
    await pool.query('ALTER TABLE team_members ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT \'\';');
    await pool.query('ALTER TABLE team_members ADD COLUMN IF NOT EXISTS original_avatar_url TEXT NOT NULL DEFAULT \'\';');
    await pool.query('ALTER TABLE team_members ADD COLUMN IF NOT EXISTS socials TEXT NOT NULL DEFAULT \'[]\';');
    await pool.query('ALTER TABLE team_members ADD COLUMN IF NOT EXISTS is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE;');

    // Ensure dynamic tables exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS company_stats (
        id SERIAL PRIMARY KEY,
        value INTEGER NOT NULL DEFAULT 0,
        suffix VARCHAR(50) NOT NULL DEFAULT '',
        display VARCHAR(50) NOT NULL DEFAULT '',
        label VARCHAR(255) NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS testimonials (
        id SERIAL PRIMARY KEY,
        quote TEXT NOT NULL DEFAULT '',
        author_name VARCHAR(255) NOT NULL DEFAULT '',
        author_role VARCHAR(255) NOT NULL DEFAULT '',
        theme VARCHAR(20) NOT NULL DEFAULT 'light',
        sort_order INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS careers_metadata (
        id INTEGER PRIMARY KEY DEFAULT 1,
        badge VARCHAR(255) NOT NULL DEFAULT 'CAREERS',
        title VARCHAR(255) NOT NULL DEFAULT 'We are hiring',
        description TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS careers_roles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL DEFAULT '',
        location VARCHAR(255) NOT NULL DEFAULT '',
        type VARCHAR(100) NOT NULL DEFAULT 'Full-time',
        sort_order INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_info (
        id INTEGER PRIMARY KEY DEFAULT 1,
        headline_line1 VARCHAR(255) NOT NULL DEFAULT 'Let''s Build Something',
        headline_line2 VARCHAR(255) NOT NULL DEFAULT 'Extraordinary.',
        description TEXT NOT NULL DEFAULT '',
        email VARCHAR(255) NOT NULL DEFAULT 'hello@ditsanddots.com',
        phone VARCHAR(255) NOT NULL DEFAULT '+1 (817) 330-9194',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_skills (
        id SERIAL PRIMARY KEY,
        label VARCHAR(255) NOT NULL,
        accent BOOLEAN NOT NULL DEFAULT FALSE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Ensure default row for contact_info
    await pool.query(`
      INSERT INTO contact_info (id, headline_line1, headline_line2, description, email, phone)
      VALUES (1, 'Let''s Build Something', 'Extraordinary.', 'Ready to elevate your digital presence? Reach out to us today and let''s discuss how we can help your business grow.', 'hello@ditsanddots.com', '+1 (817) 330-9194')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Ensure default contact_skills if empty
    const skillsRes = await pool.query('SELECT COUNT(*) FROM contact_skills;');
    if (parseInt(skillsRes.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO contact_skills (label, accent, sort_order) VALUES
        ('Web Development', true, 0),
        ('AI-Driven Apps', false, 1),
        ('Digital Marketing', true, 2),
        ('Graphic Designing', true, 3),
        ('Video Editing', false, 4),
        ('React', false, 5),
        ('Next.js', true, 6),
        ('Full-Stack', true, 7),
        ('Cloud & Automation', false, 8),
        ('SEO & Growth', true, 9),
        ('UI/UX Design', true, 10),
        ('POS Systems', false, 11),
        ('Machine Learning', false, 12),
        ('Brand Systems', true, 13);
      `);
    }

    // Ensure default row for careers_metadata
    await pool.query(`
      INSERT INTO careers_metadata (id, badge, title, description)
      VALUES (1, 'CAREERS', 'We are hiring', 'Send the project you are proudest of. If it is good we will find a seat for you, listed role or not.')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Ensure default company_stats if empty
    const statsRes = await pool.query('SELECT COUNT(*) FROM company_stats;');
    if (parseInt(statsRes.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO company_stats (value, suffix, display, label, sort_order) VALUES
        (99, '%', '', 'Project Success', 0),
        (92, '%', '', 'Client Retention', 1),
        (0, '', '99.9%', 'Uptime Guarantee', 2),
        (45, '%', '', 'ROI Increase', 3);
      `);
    }

    // Ensure default testimonials if empty
    const testRes = await pool.query('SELECT COUNT(*) FROM testimonials;');
    if (parseInt(testRes.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO testimonials (quote, author_name, author_role, theme, sort_order) VALUES
        ('Dits and Dots serves as our extended engineering team — their seamless integration and dedicated support helped us launch on schedule.', 'NCSC Team', 'Public App & POS System', 'light', 0),
        ('Their data-driven SEO and digital marketing strategy amplified our brand presence and delivered measurable ROI across every channel.', 'Noor Leadership', 'Digital Marketing Partner', 'light', 1),
        ('From cloud automation to UI/UX, they don''t just deliver code — they build comprehensive digital ecosystems that evolve with our business.', 'Byterack Aerolutiom Inc', 'Automation & Cloud', 'light', 2),
        ('Combining AI-driven workflows with sharp product design, the Nexus AI Platform launch exceeded every performance benchmark.', 'Nexus AI', 'AI Platform & UI/UX', 'dark', 3);
      `);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_credentials (
        id INTEGER PRIMARY KEY DEFAULT 1,
        email VARCHAR(255) NOT NULL DEFAULT 'admin@ditsndots.com',
        password_hash TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    const adminRes = await pool.query('SELECT COUNT(*) FROM admin_credentials WHERE id = 1;');
    if (parseInt(adminRes.rows[0].count, 10) === 0) {
      await pool.query(
        'INSERT INTO admin_credentials (id, email, password_hash) VALUES (1, $1, $2) ON CONFLICT (id) DO NOTHING;',
        [DEFAULT_ADMIN_EMAIL, hashPassword(DEFAULT_ADMIN_PASSWORD)]
      );
    }

    console.log("Database schema migration: successfully ensured all columns and dynamic tables.");
  } catch (err) {
    console.error("Database schema init warning:", err);
  }
}

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-admin-password', 'x-admin-email'],
}));
app.use(express.json({ limit: '10mb' }));

// Seeding function
async function seedDatabase() {
  console.log("Checking database content...");
  try {
    try {
      await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE;');
    } catch (e) {
      console.log("Column migration check:", e);
    }
    // 1. Seed Hero (and auto-migrate if DB still holds the old Abstrakt default seed)
    let heroCount = await db.select().from(hero);
    if (heroCount.length > 0 && (heroCount[0].headlineLine1 === "DESIGN." || heroCount[0].location?.includes("SANEPA"))) {
      console.log("Migrating old Abstrakt default seed to Dits and Dots seed...");
      await db.delete(hero);
      await db.delete(position);
      await db.delete(capabilities);
      await db.delete(projects);
      await db.delete(faqsMetadata);
      await db.delete(faqsItems);
      await db.delete(logos);
      await db.delete(companyStats);
      await db.delete(testimonials);
      await db.delete(contactInfo);
      await db.delete(contactSkills);
      heroCount = [];
    }
    if (heroCount.length === 0) {
      console.log("Seeding default Hero content...");
      await db.insert(hero).values({
        id: 1,
        location: "THE COLONY, TX",
        headlineLine1: "Engineering Digital Excellence.",
        headlineLine2: JSON.stringify(["DESIGN.", "BUILD.", "GROW."]),
        headlineLine3: "",
        description: "Your end-to-end partner for Web Development, AI Solutions, and Creative Media. We build the future, one dot at a time."
      });
    }

    // 2. Seed Position
    const positionCount = await db.select().from(position);
    if (positionCount.length === 0) {
      console.log("Seeding default Position content...");
      await db.insert(position).values({
        id: 1,
        statement: "In the fast-paced digital landscape, reliability is the ultimate currency. Dits and Dots serves as your extended team, providing seamless integration and dedicated support for your most ambitious projects."
      });
    }

    // 3. Seed Capabilities
    const capabilitiesCount = await db.select().from(capabilities);
    if (capabilitiesCount.length === 0) {
      console.log("Seeding default Capabilities...");
      const defaultPillars = [
        {
          id: "web",
          slotId: "01",
          label: "ENGINEERING",
          title: "WEB DEVELOPMENT",
          description: "High-performance, scalable web applications built with modern frameworks and cutting-edge tech.",
          imageUrl: "",
          tag: "Web Development, Full-Stack",
          badge: "WEB DEVELOPMENT",
          isBookmarked: false
        },
        {
          id: "marketing",
          slotId: "02",
          label: "GROWTH",
          title: "DIGITAL MARKETING",
          description: "Data-driven strategies to amplify your brand presence and drive measurable growth across all channels.",
          imageUrl: "",
          tag: "SEO, Performance Marketing",
          badge: "DIGITAL MARKETING",
          isBookmarked: false
        },
        {
          id: "ai",
          slotId: "03",
          label: "INTELLIGENCE",
          title: "AI-DRIVEN APPS",
          description: "Intelligent solutions leveraging machine learning to automate processes and enhance user experiences.",
          imageUrl: "",
          tag: "AI Solutions, Machine Learning",
          badge: "AI-DRIVEN APPS",
          isBookmarked: false
        },
        {
          id: "design",
          slotId: "04",
          label: "DESIGN",
          title: "GRAPHIC DESIGNING",
          description: "Visual storytelling that resonates. From branding to UI/UX, we design for impact and clarity.",
          imageUrl: "",
          tag: "Branding, UI/UX Design",
          badge: "GRAPHIC DESIGNING",
          isBookmarked: false
        },
        {
          id: "video",
          slotId: "05",
          label: "MEDIA",
          title: "VIDEO EDITING",
          description: "Cinematic video production and editing that captures attention and tells your story beautifully.",
          imageUrl: "",
          tag: "Video Production, Motion",
          badge: "VIDEO EDITING",
          isBookmarked: false
        }
      ];

      for (const pillar of defaultPillars) {
        await db.insert(capabilities).values(pillar);
      }
    }

    // 4. Seed Projects
    const projectsCount = await db.select().from(projects);
    if (projectsCount.length === 0) {
      console.log("Seeding default Projects...");
      const defaultProjects = [
        { title: "NCSC Public App", subtitle: "React • Frontend", client: "NCSC", ratio: "16:10", category: "Web Dev", thumbnailUrl: "/images/work/ncsc_frontend.png", isBookmarked: true, sortOrder: 0 },
        { title: "Noor Digital Marketing", subtitle: "SEO • Marketing", client: "Noor", ratio: "16:10", category: "Marketing", thumbnailUrl: "/images/work/noor.jpg", isBookmarked: true, sortOrder: 1 },
        { title: "Byterack Aerolutiom Inc", subtitle: "Automation • Cloud", client: "Byterack", ratio: "16:10", category: "Software Dev", thumbnailUrl: "/images/work/byterack.png", isBookmarked: false, sortOrder: 2 },
        { title: "Nexus AI Platform", subtitle: "AI App • UI/UX", client: "Nexus AI", ratio: "16:10", category: "AI App", thumbnailUrl: "/images/work/nexusai.png", isBookmarked: false, sortOrder: 3 },
        { title: "NCSC POS System", subtitle: "POS • Full-Stack", client: "NCSC", ratio: "16:10", category: "Software Dev", thumbnailUrl: "https://picsum.photos/seed/ncfc-posh/800/600", isBookmarked: false, sortOrder: 4 },
        { title: "Commscope Architect Design", subtitle: "Architecture • UI/UX", client: "Commscope", ratio: "16:10", category: "Design", thumbnailUrl: "https://picsum.photos/seed/cummscope/800/600", isBookmarked: false, sortOrder: 5 }
      ];
      for (const p of defaultProjects) {
        await db.insert(projects).values(p);
      }
    }

    // 5. Seed FAQ Metadata
    const faqMetaCount = await db.select().from(faqsMetadata);
    if (faqMetaCount.length === 0) {
      console.log("Seeding default FAQ Metadata...");
      await db.insert(faqsMetadata).values({
        id: 1,
        badge: "GOT QUESTIONS?",
        title: "FREQUENTLY ASKED QUESTIONS",
        description: "Find answers to the most common questions about Dits and Dots Agency and our web, AI, marketing, and creative media services.",
        buttonText: "VIEW ALL FAQS +"
      });
    }

    // 6. Seed FAQ Items
    const faqItemsCount = await db.select().from(faqsItems);
    if (faqItemsCount.length === 0) {
      console.log("Seeding default FAQ items...");
      const defaultQuestions = [
        {
          question: "What does Dits and Dots actually do?",
          answer: "We are an end-to-end partner for Web Development, AI-Driven Apps, Digital Marketing, Graphic Designing, and Video Editing — building complete digital ecosystems.",
          sortOrder: 0
        },
        {
          question: "How does your B2B partnership model work?",
          answer: "Dits and Dots serves as your extended team, providing seamless integration, dedicated teams, and long-term reliability so your technology stack stays ahead of the curve.",
          sortOrder: 1
        },
        {
          question: "Where are you located and do you work globally?",
          answer: "We are based at 3620 Adelaide, The Colony, TX 75056, and partner with global brands across time zones.",
          sortOrder: 2
        },
        {
          question: "How do we start a project?",
          answer: "Reach out via email at hello@ditsanddots.com or call +1 (817) 330-9194 to discuss your goals and scope.",
          sortOrder: 3
        }
      ];
      for (const q of defaultQuestions) {
        await db.insert(faqsItems).values(q);
      }
    }

    // 7. Seed Logos
    const logosCount = await db.select().from(logos);
    if (logosCount.length === 0) {
      console.log("Seeding default Logos...");
      const defaultLogos = [
        { name: "NCSC", imageUrl: "", sortOrder: 0 },
        { name: "NOOR", imageUrl: "", sortOrder: 1 },
        { name: "COMMSCOPE", imageUrl: "", sortOrder: 2 },
        { name: "BYTERACK", imageUrl: "", sortOrder: 3 },
        { name: "NEXUS AI", imageUrl: "", sortOrder: 4 }
      ];
      for (const logo of defaultLogos) {
        await db.insert(logos).values(logo);
      }
    }

    // 8. Seed Stats
    const statsCount = await db.select().from(companyStats);
    if (statsCount.length === 0) {
      console.log("Seeding default Company Stats...");
      const defaultStats = [
        { value: 99, suffix: "%", display: "", label: "Project Success", sortOrder: 0 },
        { value: 92, suffix: "%", display: "", label: "Client Retention", sortOrder: 1 },
        { value: 0, suffix: "", display: "99.9%", label: "Uptime Guarantee", sortOrder: 2 },
        { value: 45, suffix: "%", display: "", label: "ROI Increase", sortOrder: 3 },
      ];
      for (const s of defaultStats) {
        await db.insert(companyStats).values(s);
      }
    }

    // 9. Seed Testimonials
    const testimonialsCount = await db.select().from(testimonials);
    if (testimonialsCount.length === 0) {
      console.log("Seeding default Testimonials...");
      const defaultTestimonials = [
        {
          quote: "Dits and Dots serves as our extended engineering team — their seamless integration and dedicated support helped us launch on schedule.",
          authorName: "NCSC Team",
          authorRole: "Public App & POS System",
          theme: "light",
          sortOrder: 0
        },
        {
          quote: "Their data-driven SEO and digital marketing strategy amplified our brand presence and delivered measurable ROI across every channel.",
          authorName: "Noor Leadership",
          authorRole: "Digital Marketing Partner",
          theme: "light",
          sortOrder: 1
        },
        {
          quote: "From cloud automation to UI/UX, they don't just deliver code — they build comprehensive digital ecosystems that evolve with our business.",
          authorName: "Byterack Aerolutiom Inc",
          authorRole: "Automation & Cloud",
          theme: "light",
          sortOrder: 2
        },
        {
          quote: "Combining AI-driven workflows with sharp product design, the Nexus AI Platform launch exceeded every performance benchmark.",
          authorName: "Nexus AI",
          authorRole: "AI Platform & UI/UX",
          theme: "dark",
          sortOrder: 3
        }
      ];
      for (const t of defaultTestimonials) {
        await db.insert(testimonials).values(t);
      }
    }

    // 10. Seed Contact Info
    const contactCount = await db.select().from(contactInfo);
    if (contactCount.length === 0) {
      console.log("Seeding default Contact info...");
      await db.insert(contactInfo).values({
        id: 1,
        headlineLine1: "Let's Build Something",
        headlineLine2: "Extraordinary.",
        description: "Ready to elevate your digital presence? Reach out to us today and let's discuss how we can help your business grow.",
        email: "hello@ditsanddots.com",
        phone: "+1 (817) 330-9194"
      });
    }

    // 11. Seed Contact Skills / CTA Pills
    const contactSkillsCount = await db.select().from(contactSkills);
    if (contactSkillsCount.length === 0) {
      console.log("Seeding default Contact Skills pills...");
      const defaultSkills = [
        { label: "Web Development", accent: true, sortOrder: 0 },
        { label: "AI-Driven Apps", accent: false, sortOrder: 1 },
        { label: "Digital Marketing", accent: true, sortOrder: 2 },
        { label: "Graphic Designing", accent: true, sortOrder: 3 },
        { label: "Video Editing", accent: false, sortOrder: 4 },
        { label: "React", accent: false, sortOrder: 5 },
        { label: "Next.js", accent: true, sortOrder: 6 },
        { label: "Full-Stack", accent: true, sortOrder: 7 },
        { label: "Cloud & Automation", accent: false, sortOrder: 8 },
        { label: "SEO & Growth", accent: true, sortOrder: 9 },
        { label: "UI/UX Design", accent: true, sortOrder: 10 },
        { label: "POS Systems", accent: false, sortOrder: 11 },
        { label: "Machine Learning", accent: false, sortOrder: 12 },
        { label: "Brand Systems", accent: true, sortOrder: 13 }
      ];
      for (const s of defaultSkills) {
        await db.insert(contactSkills).values(s);
      }
    }

    console.log("Database seed verification complete.");
  } catch (error) {
    console.error("Database seed failed. Make sure to run 'pnpm run db:push'.", error);
  }
}

let cachedContentData: any = null;

const DEFAULT_FALLBACK_CONTENT = {
  hero: {
    location: "THE COLONY, TX",
    headlineLine1: "Engineering Digital Excellence.",
    subHeadlineLines: ["DESIGN.", "BUILD.", "GROW."],
    headlineLines: ["Engineering Digital Excellence.", "DESIGN.", "BUILD.", "GROW."],
    description: "Your end-to-end partner for Web Development, AI Solutions, and Creative Media. We build the future, one dot at a time."
  },
  position: {
    statement: "In the fast-paced digital landscape, reliability is the ultimate currency. Dits and Dots serves as your extended team, providing seamless integration and dedicated support for your most ambitious projects."
  },
  capabilities: {
    pillars: {
      web: {
        id: "01",
        label: "ENGINEERING",
        title: "WEB DEVELOPMENT",
        description: "High-performance, scalable web applications built with modern frameworks and cutting-edge tech.",
        imageUrl: "",
        tag: "Web Development, Full-Stack",
        badge: "WEB DEVELOPMENT",
        isBookmarked: false
      },
      marketing: {
        id: "02",
        label: "GROWTH",
        title: "DIGITAL MARKETING",
        description: "Data-driven strategies to amplify your brand presence and drive measurable growth across all channels.",
        imageUrl: "",
        tag: "SEO, Performance Marketing",
        badge: "DIGITAL MARKETING",
        isBookmarked: false
      },
      ai: {
        id: "03",
        label: "INTELLIGENCE",
        title: "AI-DRIVEN APPS",
        description: "Intelligent solutions leveraging machine learning to automate processes and enhance user experiences.",
        imageUrl: "",
        tag: "AI Solutions, Machine Learning",
        badge: "AI-DRIVEN APPS",
        isBookmarked: false
      },
      design: {
        id: "04",
        label: "DESIGN",
        title: "GRAPHIC DESIGNING",
        description: "Visual storytelling that resonates. From branding to UI/UX, we design for impact and clarity.",
        imageUrl: "",
        tag: "Branding, UI/UX Design",
        badge: "GRAPHIC DESIGNING",
        isBookmarked: false
      },
      video: {
        id: "05",
        label: "MEDIA",
        title: "VIDEO EDITING",
        description: "Cinematic video production and editing that captures attention and tells your story beautifully.",
        imageUrl: "",
        tag: "Video Production, Motion",
        badge: "VIDEO EDITING",
        isBookmarked: false
      }
    }
  },
  work: {
    projects: [
      {
        id: 1,
        title: "NCSC Public App",
        subtitle: "React • Frontend",
        serviceType: "Web Dev",
        startDate: "2024",
        endDate: "Present",
        client: "NCSC",
        clientType: "brand",
        ratio: "16:10",
        category: "Web Dev",
        logoUrl: "",
        thumbnailUrl: "/images/work/ncsc_frontend.png",
        videoThumbnailUrl: "",
        isBookmarked: true,
        bodySections: []
      },
      {
        id: 2,
        title: "Noor Digital Marketing",
        subtitle: "SEO • Marketing",
        serviceType: "Marketing",
        startDate: "2024",
        endDate: "Present",
        client: "Noor",
        clientType: "brand",
        ratio: "16:10",
        category: "Marketing",
        logoUrl: "",
        thumbnailUrl: "/images/work/noor.jpg",
        videoThumbnailUrl: "",
        isBookmarked: true,
        bodySections: []
      },
      {
        id: 3,
        title: "Byterack Aerolutiom Inc",
        subtitle: "Automation • Cloud",
        serviceType: "Software Dev",
        startDate: "2024",
        endDate: "Present",
        client: "Byterack",
        clientType: "brand",
        ratio: "16:10",
        category: "Software Dev",
        logoUrl: "",
        thumbnailUrl: "/images/work/byterack.png",
        videoThumbnailUrl: "",
        isBookmarked: false,
        bodySections: []
      },
      {
        id: 4,
        title: "Nexus AI Platform",
        subtitle: "AI App • UI/UX",
        serviceType: "AI App",
        startDate: "2024",
        endDate: "Present",
        client: "Nexus AI",
        clientType: "brand",
        ratio: "16:10",
        category: "AI App",
        logoUrl: "",
        thumbnailUrl: "/images/work/nexusai.png",
        videoThumbnailUrl: "",
        isBookmarked: false,
        bodySections: []
      },
      {
        id: 5,
        title: "NCSC POS System",
        subtitle: "POS • Full-Stack",
        serviceType: "Software Dev",
        startDate: "2023",
        endDate: "2024",
        client: "NCSC",
        clientType: "brand",
        ratio: "16:10",
        category: "Software Dev",
        logoUrl: "",
        thumbnailUrl: "https://picsum.photos/seed/ncfc-posh/800/600",
        videoThumbnailUrl: "",
        isBookmarked: false,
        bodySections: []
      },
      {
        id: 6,
        title: "Commscope Architect Design",
        subtitle: "Architecture • UI/UX",
        serviceType: "Design",
        startDate: "2023",
        endDate: "2024",
        client: "Commscope",
        clientType: "brand",
        ratio: "16:10",
        category: "Design",
        logoUrl: "",
        thumbnailUrl: "https://picsum.photos/seed/cummscope/800/600",
        videoThumbnailUrl: "",
        isBookmarked: false,
        bodySections: []
      }
    ]
  },
  faq: {
    badge: "GOT QUESTIONS?",
    title: "FREQUENTLY ASKED QUESTIONS",
    description: "Find answers to the most common questions about Dits and Dots Agency and our web, AI, marketing, and creative media services.",
    buttonText: "VIEW ALL FAQS +",
    questions: [
      {
        question: "What does Dits and Dots actually do?",
        answer: "We are an end-to-end partner for Web Development, AI-Driven Apps, Digital Marketing, Graphic Designing, and Video Editing — building complete digital ecosystems."
      },
      {
        question: "How does your B2B partnership model work?",
        answer: "Dits and Dots serves as your extended team, providing seamless integration, dedicated teams, and long-term reliability so your technology stack stays ahead of the curve."
      },
      {
        question: "Where are you located and do you work globally?",
        answer: "We are based at 3620 Adelaide, The Colony, TX 75056, and partner with global brands across time zones."
      },
      {
        question: "How do we start a project?",
        answer: "Reach out via email at hello@ditsanddots.com or call +1 (817) 330-9194 to discuss your goals and scope."
      }
    ]
  },
  process: { steps: [] },
  people: { team: [], extraCount: 0 },
  logos: [
    { id: 1, name: "NCSC", imageUrl: "" },
    { id: 2, name: "NOOR", imageUrl: "" },
    { id: 3, name: "COMMSCOPE", imageUrl: "" },
    { id: 4, name: "BYTERACK", imageUrl: "" },
    { id: 5, name: "NEXUS AI", imageUrl: "" }
  ],
  stats: [
    { id: 1, value: 99, suffix: "%", display: undefined, label: "Project Success" },
    { id: 2, value: 92, suffix: "%", display: undefined, label: "Client Retention" },
    { id: 3, value: 0, suffix: "", display: "99.9%", label: "Uptime Guarantee" },
    { id: 4, value: 45, suffix: "%", display: undefined, label: "ROI Increase" }
  ],
  testimonials: [
    { id: 1, quote: "Dits and Dots serves as our extended engineering team — their seamless integration and dedicated support helped us launch on schedule.", authorName: "NCSC Team", authorRole: "Public App & POS System", theme: "light" },
    { id: 2, quote: "Their data-driven SEO and digital marketing strategy amplified our brand presence and delivered measurable ROI across every channel.", authorName: "Noor Leadership", authorRole: "Digital Marketing Partner", theme: "light" },
    { id: 3, quote: "From cloud automation to UI/UX, they don't just deliver code — they build comprehensive digital ecosystems that evolve with our business.", authorName: "Byterack Aerolutiom Inc", authorRole: "Automation & Cloud", theme: "light" },
    { id: 4, quote: "Combining AI-driven workflows with sharp product design, the Nexus AI Platform launch exceeded every performance benchmark.", authorName: "Nexus AI", authorRole: "AI Platform & UI/UX", theme: "dark" }
  ],
  careers: { badge: "CAREERS", title: "We are hiring", description: "", roles: [] },
  contact: {
    headlineLine1: "Let's Build Something",
    headlineLine2: "Extraordinary.",
    description: "Ready to elevate your digital presence? Reach out to us today and let's discuss how we can help your business grow.",
    email: "hello@ditsanddots.com",
    phone: "+1 (817) 330-9194",
    skills: [
      { id: 1, label: "Web Development", accent: true },
      { id: 2, label: "AI-Driven Apps", accent: false },
      { id: 3, label: "Digital Marketing", accent: true },
      { id: 4, label: "Graphic Designing", accent: true },
      { id: 5, label: "Video Editing", accent: false },
      { id: 6, label: "React", accent: false },
      { id: 7, label: "Next.js", accent: true },
      { id: 8, label: "Full-Stack", accent: true },
      { id: 9, label: "Cloud & Automation", accent: false },
      { id: 10, label: "SEO & Growth", accent: true },
      { id: 11, label: "UI/UX Design", accent: true },
      { id: 12, label: "POS Systems", accent: false },
      { id: 13, label: "Machine Learning", accent: false },
      { id: 14, label: "Brand Systems", accent: true }
    ]
  }
};

// REST GET: Fetch all sections
app.get('/api/content', async (req, res) => {
  try {
    if (cachedContentData) {
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return res.json(cachedContentData);
    }
    const [
      heroRows,
      positionRows,
      capabilitiesRows,
      projectRows,
      faqMetaRows,
      faqItemRows,
      processRows,
      peopleMetaRows,
      teamRows,
      logoRows,
      statRows,
      testimonialRows,
      careersMetaRows,
      careersRoleRows,
      contactRows,
      contactSkillRows
    ] = await Promise.all([
      db.select().from(hero),
      db.select().from(position),
      db.select().from(capabilities),
      db.select().from(projects),
      db.select().from(faqsMetadata),
      db.select().from(faqsItems),
      db.select().from(processSteps),
      db.select().from(peopleMetadata),
      db.select().from(teamMembers),
      db.select().from(logos),
      db.select().from(companyStats),
      db.select().from(testimonials),
      db.select().from(careersMetadata),
      db.select().from(careersRoles),
      db.select().from(contactInfo),
      db.select().from(contactSkills)
    ]);

    // Format & sort arrays
    const subHeadlineLines = (() => {
      try {
        const val = heroRows[0]?.headlineLine2 || "";
        if (val.startsWith("[")) {
          return JSON.parse(val);
        }
      } catch (e) { }
      return [heroRows[0]?.headlineLine2, heroRows[0]?.headlineLine3].filter(Boolean);
    })();

    const formattedHero = heroRows[0] ? {
      location: heroRows[0].location,
      headlineLine1: heroRows[0].headlineLine1,
      subHeadlineLines: subHeadlineLines,
      headlineLines: [heroRows[0].headlineLine1, ...subHeadlineLines],
      description: heroRows[0].description
    } : undefined;

    const formattedPosition = positionRows[0] ? {
      statement: positionRows[0].statement
    } : undefined;

    const formattedCapabilities = {
      pillars: capabilitiesRows.reduce((acc, row) => {
        acc[row.id] = {
          id: row.slotId,
          label: row.label,
          title: row.title,
          description: row.description,
          imageUrl: row.imageUrl || "",
          tag: row.tag,
          badge: row.badge,
          isBookmarked: Boolean(row.isBookmarked)
        };
        return acc;
      }, {} as Record<string, any>)
    };

    const getProjectDateVal = (p: any) => {
      const end = (p.endDate || "").trim().toLowerCase();
      const start = (p.startDate || "").trim().toLowerCase();
      if (end.includes("present") || end.includes("current") || start.includes("present") || start.includes("current")) {
        return 999999;
      }
      const matches = `${end} ${start}`.match(/\b(19|20)\d{2}\b/g);
      if (matches && matches.length > 0) {
        return Math.max(...matches.map(y => parseInt(y, 10)));
      }
      return 0;
    };

    const formattedWork = {
      projects: projectRows
        .sort((a, b) => {
          if (Boolean(a.isBookmarked) !== Boolean(b.isBookmarked)) {
            return a.isBookmarked ? -1 : 1;
          }
          const dateA = getProjectDateVal(a);
          const dateB = getProjectDateVal(b);
          if (dateA !== dateB) {
            return dateB - dateA;
          }
          return a.sortOrder - b.sortOrder;
        })
        .map(p => ({
          id: p.id,
          title: p.title || "",
          subtitle: p.subtitle || "",
          serviceType: p.serviceType || "",
          startDate: p.startDate || "",
          endDate: p.endDate || "",
          client: p.client || "",
          clientType: p.clientType || "brand",
          ratio: p.ratio || "16:10",
          category: p.category || "Digital Marketing",
          logoUrl: p.logoUrl || "",
          thumbnailUrl: p.thumbnailUrl || "",
          videoThumbnailUrl: p.videoThumbnailUrl || "",
          isBookmarked: Boolean(p.isBookmarked),
          bodySections: (() => {
            try {
              return JSON.parse(p.bodySections || "[]");
            } catch {
              return [];
            }
          })()
        }))
    };

    const formattedFaq = faqMetaRows[0] ? {
      badge: faqMetaRows[0].badge,
      title: faqMetaRows[0].title,
      description: faqMetaRows[0].description,
      buttonText: faqMetaRows[0].buttonText,
      questions: faqItemRows
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(q => ({
          question: q.question,
          answer: q.answer
        }))
    } : undefined;

    const formattedProcess = {
      steps: processRows
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(s => ({
          id: s.stepId,
          title: s.title,
          description: s.description
        }))
    };

    const formattedPeople = peopleMetaRows[0] ? {
      team: teamRows
        .sort((a, b) => {
          if (Boolean(a.isBookmarked) !== Boolean(b.isBookmarked)) {
            return a.isBookmarked ? -1 : 1;
          }
          return a.sortOrder - b.sortOrder;
        })
        .map(m => ({
          name: m.name || "",
          role: m.role || "",
          description: m.description || "",
          avatarUrl: m.avatarUrl || "",
          originalAvatarUrl: m.originalAvatarUrl || "",
          isBookmarked: Boolean(m.isBookmarked),
          socials: (() => {
            try {
              return JSON.parse(m.socials || "[]");
            } catch {
              return [];
            }
          })()
        })),
      extraCount: peopleMetaRows[0].extraCount
    } : undefined;

    const formattedLogos = logoRows
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(logo => ({
        id: logo.id,
        name: logo.name,
        imageUrl: logo.imageUrl
      }));

    const formattedStats = statRows
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(s => ({
        id: s.id,
        value: s.value,
        suffix: s.suffix,
        display: s.display || undefined,
        label: s.label
      }));

    const formattedTestimonials = testimonialRows
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(t => ({
        id: t.id,
        quote: t.quote,
        authorName: t.authorName,
        authorRole: t.authorRole,
        theme: (t.theme as "light" | "dark") || "light"
      }));

    const formattedCareers = {
      badge: careersMetaRows[0]?.badge || "CAREERS",
      title: careersMetaRows[0]?.title || "We are hiring",
      description: careersMetaRows[0]?.description || "",
      roles: careersRoleRows
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(r => ({
          id: r.id,
          title: r.title,
          location: r.location,
          type: r.type
        }))
    };

    const formattedContact = {
      headlineLine1: contactRows[0]?.headlineLine1 || "Let's Build Something",
      headlineLine2: contactRows[0]?.headlineLine2 || "Extraordinary.",
      description: contactRows[0]?.description || "Ready to elevate your digital presence? Reach out to us today and let's discuss how we can help your business grow.",
      email: contactRows[0]?.email || "hello@ditsanddots.com",
      phone: contactRows[0]?.phone || "+1 (817) 330-9194",
      skills: (contactSkillRows || [])
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(s => ({
          id: s.id,
          label: s.label,
          accent: Boolean(s.accent)
        }))
    };

    const responseData = {
      hero: formattedHero,
      position: formattedPosition,
      capabilities: formattedCapabilities,
      work: formattedWork,
      faq: formattedFaq,
      process: formattedProcess,
      people: formattedPeople,
      logos: formattedLogos,
      stats: formattedStats,
      testimonials: formattedTestimonials,
      careers: formattedCareers,
      contact: formattedContact
    };

    cachedContentData = responseData;
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json(responseData);
  } catch (error) {
    console.warn("Database unavailable or uninitialized; serving default site content fallback.");
    res.setHeader('Cache-Control', 'public, max-age=10');
    res.json(DEFAULT_FALLBACK_CONTENT);
  }
});

// REST POST: Verify admin email + password
app.post('/api/auth/verify', async (req, res) => {
  const { email, password } = req.body || {};
  const result = await verifyAdminCredentials(String(email || ''), String(password || ''));
  if (result.ok) {
    res.json({ success: true, email: result.email });
  } else {
    res.status(401).json({ error: 'Invalid email or password.' });
  }
});

// REST POST: Update admin email and/or password
app.post('/api/auth/update', async (req, res) => {
  const { currentPassword, newEmail, newPassword } = req.body || {};
  const currentPassStr = String(currentPassword || '');

  const isAuthorized = await verifyAdminPassword(currentPassStr);
  if (!isAuthorized) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  const creds = await getAdminCredentials();
  const nextEmail = String(newEmail || '').trim().toLowerCase() || creds?.email || DEFAULT_ADMIN_EMAIL;
  const nextPassStr = String(newPassword || '');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (nextPassStr && nextPassStr.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  const nextHash = nextPassStr
    ? hashPassword(nextPassStr)
    : creds?.passwordHash || hashPassword(currentPassStr);

  try {
    await pool.query(
      `INSERT INTO admin_credentials (id, email, password_hash, updated_at)
       VALUES (1, $1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, updated_at = NOW();`,
      [nextEmail, nextHash]
    );
    res.json({
      success: true,
      email: nextEmail,
      message: 'Admin credentials updated successfully.',
    });
  } catch (error: any) {
    console.error('Failed to update admin credentials:', error);
    res.status(500).json({ error: 'Failed to update admin credentials in database.' });
  }
});

// REST POST: Clear all data from all sections
app.post('/api/content/clear', async (req, res) => {
  const password = String(req.headers['x-admin-password'] || '');

  if (!(await verifyAdminPassword(password))) {
    return res.status(401).json({ error: 'Unauthorized: Invalid password' });
  }

  try {
    // 1. Clear Hero
    await db.update(hero)
      .set({
        location: "",
        headlineLine1: "",
        headlineLine2: "[]",
        headlineLine3: "",
        description: "",
        updatedAt: new Date()
      })
      .where(eq(hero.id, 1));

    // 2. Clear Position
    await db.update(position)
      .set({
        statement: "",
        updatedAt: new Date()
      })
      .where(eq(position.id, 1));

    // 3. Clear Capabilities (reset values of the 5 Dits and Dots pillars)
    await db.delete(capabilities);
    const defaultKeys = ['web', 'marketing', 'ai', 'design', 'video'];
    const slotIds = ['01', '02', '03', '04', '05'];
    const labels = ['ENGINEERING', 'GROWTH', 'INTELLIGENCE', 'DESIGN', 'MEDIA'];
    for (let i = 0; i < defaultKeys.length; i++) {
      await db.insert(capabilities).values({
        id: defaultKeys[i],
        slotId: slotIds[i],
        label: labels[i],
        title: "",
        description: "",
        imageUrl: "",
        tag: "",
        badge: "",
        isBookmarked: false
      });
    }

    // 4. Delete all Projects
    await db.delete(projects);

    // 5. Clear FAQ Metadata
    await db.update(faqsMetadata)
      .set({
        badge: "",
        title: "",
        description: "",
        buttonText: "",
        updatedAt: new Date()
      })
      .where(eq(faqsMetadata.id, 1));

    // 6. Delete all FAQ items
    await db.delete(faqsItems);

    // 7. Delete all Process steps
    await db.delete(processSteps);

    // 8. Clear People Metadata
    await db.update(peopleMetadata)
      .set({
        extraCount: 0,
        updatedAt: new Date()
      })
      .where(eq(peopleMetadata.id, 1));

    // 9. Delete all Team members
    await db.delete(teamMembers);

    // 10. Delete all Logos
    await db.delete(logos);

    // 11. Delete all Stats
    await db.delete(companyStats);

    // 12. Delete all Testimonials
    await db.delete(testimonials);

    // 13. Clear Careers Metadata & Delete Roles
    await db.update(careersMetadata)
      .set({
        badge: "",
        title: "",
        description: "",
        updatedAt: new Date()
      })
      .where(eq(careersMetadata.id, 1));
    await db.delete(careersRoles);

    // 14. Clear Contact Info
    await db.update(contactInfo)
      .set({
        headlineLine1: "",
        headlineLine2: "",
        description: "",
        email: "",
        phone: "",
        updatedAt: new Date()
      })
      .where(eq(contactInfo.id, 1));
    await db.delete(contactSkills);

    console.log("Database cleared successfully by admin.");
    cachedContentData = null;
    res.json({ success: true, message: "All content cleared successfully. Ready for manual input." });
  } catch (error: any) {
    console.error("Failed to clear database:", error);
    res.status(500).json({ error: `Failed to clear content: ${error.message || error}` });
  }
});

// REST POST: Save changes to a specific section in its respective SQL table
app.post('/api/content/:id', async (req, res) => {
  const { id } = req.params;
  const contentBody = req.body;
  const password = String(req.headers['x-admin-password'] || '');

  if (!(await verifyAdminPassword(password))) {
    return res.status(401).json({ error: 'Unauthorized: Invalid password' });
  }

  if (!contentBody) {
    return res.status(400).json({ error: 'Missing content body' });
  }

  try {
    if (id === 'hero') {
      const headlineLine1 = contentBody.headlineLine1 !== undefined ? contentBody.headlineLine1 : (contentBody.headlineLines?.[0] || "");
      let headlineLine2 = "[]";
      if (contentBody.subHeadlineLines) {
        headlineLine2 = JSON.stringify(contentBody.subHeadlineLines);
      } else if (contentBody.headlineLines) {
        headlineLine2 = JSON.stringify(contentBody.headlineLines.slice(1));
      }
      await db.update(hero)
        .set({
          location: contentBody.location,
          headlineLine1: headlineLine1,
          headlineLine2: headlineLine2,
          headlineLine3: "",
          description: contentBody.description,
          updatedAt: new Date()
        })
        .where(eq(hero.id, 1));
    }
    else if (id === 'position') {
      await db.update(position)
        .set({
          statement: contentBody.statement,
          updatedAt: new Date()
        })
        .where(eq(position.id, 1));
    }
    else if (id === 'capabilities') {
      try {
        await pool.query('ALTER TABLE capabilities ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT \'\';');
        await pool.query('ALTER TABLE capabilities ADD COLUMN IF NOT EXISTS is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE;');
      } catch (e) {
        console.error("Column check error on capabilities save:", e);
      }
      await db.delete(capabilities);
      for (const [key, pillar] of Object.entries(contentBody.pillars)) {
        const p = pillar as any;
        await db.insert(capabilities).values({
          id: key,
          slotId: p.id || "",
          label: p.label || "",
          title: p.title || "",
          description: p.description || "",
          imageUrl: p.imageUrl || "",
          tag: p.tag || "",
          badge: p.badge || "",
          isBookmarked: Boolean(p.isBookmarked)
        });
      }
    }
    else if (id === 'work') {
      try {
        await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE;');
      } catch (e) {
        console.error("Column check error on work save:", e);
      }
      await db.delete(projects);
      const projectsList = Array.isArray(contentBody)
        ? contentBody
        : Array.isArray(contentBody.projects)
          ? contentBody.projects
          : [];
      for (let i = 0; i < projectsList.length; i++) {
        const p = projectsList[i];
        const sectionsStr = typeof p.bodySections === "string"
          ? p.bodySections
          : JSON.stringify(p.bodySections || []);

        await db.insert(projects).values({
          title: p.title || "",
          subtitle: p.subtitle || "",
          serviceType: p.serviceType || "",
          startDate: p.startDate || "",
          endDate: p.endDate || "",
          client: p.client || "",
          clientType: p.clientType || "brand",
          ratio: p.ratio || "16:10",
          category: p.category || "Digital Marketing",
          logoUrl: p.logoUrl || "",
          thumbnailUrl: p.thumbnailUrl || "",
          videoThumbnailUrl: p.videoThumbnailUrl || "",
          isBookmarked: Boolean(p.isBookmarked),
          bodySections: sectionsStr,
          sortOrder: i
        });
      }
    }
    else if (id === 'faq') {
      const badge = contentBody.badge || "GOT QUESTIONS?";
      const title = contentBody.title || "FREQUENTLY ASKED QUESTIONS";
      const description = contentBody.description || "Find answers to the most common questions about Dits and Dots Agency and our web, AI, marketing, and creative media services.";
      const buttonText = contentBody.buttonText || "VIEW ALL FAQS +";

      await db.update(faqsMetadata)
        .set({
          badge,
          title,
          description,
          buttonText,
          updatedAt: new Date()
        })
        .where(eq(faqsMetadata.id, 1));

      await db.delete(faqsItems);
      const questionsList = contentBody.questions || (Array.isArray(contentBody) ? contentBody : []);
      for (let i = 0; i < questionsList.length; i++) {
        const q = questionsList[i];
        await db.insert(faqsItems).values({
          question: q.question,
          answer: q.answer,
          sortOrder: i
        });
      }
    }
    else if (id === 'process') {
      await db.delete(processSteps);
      for (let i = 0; i < contentBody.steps.length; i++) {
        const step = contentBody.steps[i];
        await db.insert(processSteps).values({
          stepId: step.id,
          title: step.title,
          description: step.description,
          sortOrder: i
        });
      }
    }
    else if (id === 'people') {
      try {
        await pool.query('ALTER TABLE team_members ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT \'\';');
        await pool.query('ALTER TABLE team_members ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT \'\';');
        await pool.query('ALTER TABLE team_members ADD COLUMN IF NOT EXISTS original_avatar_url TEXT NOT NULL DEFAULT \'\';');
        await pool.query('ALTER TABLE team_members ADD COLUMN IF NOT EXISTS socials TEXT NOT NULL DEFAULT \'[]\';');
        await pool.query('ALTER TABLE team_members ADD COLUMN IF NOT EXISTS is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE;');
      } catch (e) {
        console.error("Column check error on people save:", e);
      }

      await db.update(peopleMetadata)
        .set({
          extraCount: contentBody.extraCount !== undefined ? contentBody.extraCount : 0,
          updatedAt: new Date()
        })
        .where(eq(peopleMetadata.id, 1));

      await db.delete(teamMembers);
      const teamList = Array.isArray(contentBody.team) ? contentBody.team : [];
      for (let i = 0; i < teamList.length; i++) {
        const m = teamList[i];
        const socialsStr = typeof m.socials === "string"
          ? m.socials
          : JSON.stringify(m.socials || []);

        await db.insert(teamMembers).values({
          name: m.name || "",
          role: m.role || "",
          description: m.description || "",
          avatarUrl: m.avatarUrl || "",
          originalAvatarUrl: m.originalAvatarUrl || "",
          isBookmarked: Boolean(m.isBookmarked),
          socials: socialsStr,
          sortOrder: i
        });
      }
    }
    else if (id === 'logos') {
      await db.delete(logos);
      const logosList = Array.isArray(contentBody)
        ? contentBody
        : Array.isArray(contentBody.logos)
          ? contentBody.logos
          : [];
      for (let i = 0; i < logosList.length; i++) {
        const logo = logosList[i];
        await db.insert(logos).values({
          name: logo.name || "",
          imageUrl: logo.imageUrl || "",
          sortOrder: i
        });
      }
    }
    else if (id === 'stats') {
      await db.delete(companyStats);
      const statsList = Array.isArray(contentBody)
        ? contentBody
        : Array.isArray(contentBody.stats)
          ? contentBody.stats
          : [];
      for (let i = 0; i < statsList.length; i++) {
        const s = statsList[i];
        await db.insert(companyStats).values({
          value: typeof s.value === 'number' ? s.value : parseInt(s.value, 10) || 0,
          suffix: s.suffix || "",
          display: s.display || "",
          label: s.label || "",
          sortOrder: i
        });
      }
    }
    else if (id === 'testimonials') {
      await db.delete(testimonials);
      const testList = Array.isArray(contentBody)
        ? contentBody
        : Array.isArray(contentBody.testimonials)
          ? contentBody.testimonials
          : [];
      for (let i = 0; i < testList.length; i++) {
        const t = testList[i];
        await db.insert(testimonials).values({
          quote: t.quote || "",
          authorName: t.authorName || "",
          authorRole: t.authorRole || "",
          theme: t.theme || "light",
          sortOrder: i
        });
      }
    }
    else if (id === 'careers') {
      const badge = contentBody.badge || "CAREERS";
      const title = contentBody.title || "We are hiring";
      const description = contentBody.description || "";

      await db.update(careersMetadata)
        .set({
          badge,
          title,
          description,
          updatedAt: new Date()
        })
        .where(eq(careersMetadata.id, 1));

      await db.delete(careersRoles);
      const rolesList = contentBody.roles || (Array.isArray(contentBody) ? contentBody : []);
      for (let i = 0; i < rolesList.length; i++) {
        const r = rolesList[i];
        await db.insert(careersRoles).values({
          title: r.title || "",
          location: r.location || "",
          type: r.type || "Full-time",
          sortOrder: i
        });
      }
    }
    else if (id === 'contact') {
      await db.update(contactInfo)
        .set({
          headlineLine1: contentBody.headlineLine1 || "",
          headlineLine2: contentBody.headlineLine2 || "",
          description: contentBody.description || "",
          email: contentBody.email || "",
          phone: contentBody.phone || "",
          updatedAt: new Date()
        })
        .where(eq(contactInfo.id, 1));

      if (Array.isArray(contentBody.skills)) {
        await db.delete(contactSkills);
        for (let i = 0; i < contentBody.skills.length; i++) {
          const s = contentBody.skills[i];
          if (s && s.label) {
            await db.insert(contactSkills).values({
              label: s.label,
              accent: Boolean(s.accent),
              sortOrder: i
            });
          }
        }
      }
    } else {
      return res.status(400).json({ error: `Invalid section ID: '${id}'` });
    }

    cachedContentData = null;
    res.json({ success: true, message: `Section '${id}' updated successfully.` });
  } catch (error: any) {
    console.error(`Failed to update SQL table for section '${id}':`, error);
    res.status(500).json({ error: `Failed to update section content: ${error.message || error}` });
  }
});

// REST POST: Send "Let's get started" contact inquiry email via Nodemailer
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

app.post('/api/contact/send', async (req, res) => {
  const { fullName, emailAddress, projectType, message } = req.body || {};
  const cleanName = String(fullName || '').trim();
  const cleanEmail = String(emailAddress || '').trim();
  const cleanType = String(projectType || 'General Inquiry').trim();
  const cleanMessage = String(message || '').trim();

  if (!cleanName || !cleanEmail || !cleanMessage) {
    return res.status(400).json({ error: 'Please fill in your name, email address, and message.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || '').trim();
  const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  const smtpSecure =
    process.env.SMTP_SECURE !== undefined
      ? String(process.env.SMTP_SECURE).toLowerCase() === 'true'
      : smtpPort === 465;
  const receiverEmail = (process.env.CONTACT_RECEIVER_EMAIL || smtpUser).trim();

  if (!smtpUser || !smtpPass || !receiverEmail) {
    return res.status(500).json({
      error: 'Email service is not configured yet. Please check SMTP_USER and SMTP_PASS in backend/.env.',
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const safeName = escapeHtml(cleanName);
    const safeEmail = escapeHtml(cleanEmail);
    const safeType = escapeHtml(cleanType);
    const safeMsg = escapeHtml(cleanMessage).replace(/\n/g, '<br/>');

    await transporter.sendMail({
      from: `"DitsNDots Website" <${smtpUser}>`,
      to: receiverEmail,
      replyTo: `"${cleanName}" <${cleanEmail}>`,
      subject: `New Project Inquiry (${cleanType}) — ${cleanName}`,
      text: [
        `New project inquiry from DitsNDots website`,
        ``,
        `Name: ${cleanName}`,
        `Email: ${cleanEmail}`,
        `Project Type: ${cleanType}`,
        ``,
        `Message:`,
        cleanMessage,
      ].join('\n'),
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #0E0E0E; background: #F7F6F3; padding: 28px; border-radius: 16px; border: 1px solid #E2E1DB;">
          <h2 style="margin: 0 0 6px; font-size: 22px; color: #0E0E0E;">New Project Inquiry</h2>
          <p style="margin: 0 0 22px; font-size: 13px; color: #0082C8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">${safeType}</p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #6B6A64; width: 120px; font-weight: 600;">Full Name</td>
              <td style="padding: 8px 0; color: #0E0E0E; font-weight: 700;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B6A64; font-weight: 600;">Email</td>
              <td style="padding: 8px 0; color: #0082C8; font-weight: 600;">${safeEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B6A64; font-weight: 600;">Project Type</td>
              <td style="padding: 8px 0; color: #0E0E0E;">${safeType}</td>
            </tr>
          </table>
          <div style="background: #FFFFFF; padding: 18px 20px; border-radius: 12px; border: 1px solid #E2E1DB; font-size: 14.5px; line-height: 1.65; color: #1F1F1D;">
            ${safeMsg}
          </div>
        </div>
      `,
    });

    res.json({ success: true, message: 'Message sent successfully.' });
  } catch (error: any) {
    console.error('Failed to send contact email:', error);
    res.status(500).json({
      error: 'Could not send email right now. Please check your SMTP credentials or try again.',
    });
  }
});

app.listen(port, async () => {
  console.log(`Backend Express server is running on http://localhost:${port}`);
  await initDbSchema();
  await seedDatabase();
});
