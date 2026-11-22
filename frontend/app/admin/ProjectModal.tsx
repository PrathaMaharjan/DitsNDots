"use client";

import React, { useState, useRef } from "react";
import Button from "../../components/ui/Button";

export interface BodySection {
  type: "description" | "media";
  mainTitle: string;
  subTitle: string;
  description?: string;
  mediaUrl?: string;
  mediaUrls?: string[];
}

export interface ProjectData {
  id?: number;
  title: string;
  subtitle: string;
  serviceType: string;
  startDate: string;
  endDate: string;
  client: string;
  clientType: "brand" | "person";
  category: string;
  logoUrl?: string;
  thumbnailUrl?: string;
  videoThumbnailUrl?: string;
  isBookmarked?: boolean;
  bodySections: BodySection[];
}

interface ProjectModalProps {
  project?: ProjectData | null;
  existingCategories?: string[];
  onSave: (project: ProjectData) => void;
  onClose: () => void;
}

const DEFAULT_CATEGORIES = [
  "Web Dev",
  "Marketing",
  "Software Dev",
  "AI App",
  "Design",
];

function extractFromBodySections(sections: BodySection[] = []) {
  let description = "";
  let proofUrl = "";
  let proofLabel = "";
  const gallery: string[] = [];

  sections.forEach((sec) => {
    if (!sec) return;
    if (sec.type === "description") {
      if (!description && sec.description) {
        description = sec.description;
      }
      const sub = (sec.subTitle || "").trim();
      if (!proofUrl && /^https?:\/\//i.test(sub)) {
        proofUrl = sub;
        proofLabel = (sec.mainTitle || "").trim();
      }
    }
    if (sec.mediaUrl) {
      gallery.push(sec.mediaUrl);
    }
    if (Array.isArray(sec.mediaUrls)) {
      sec.mediaUrls.forEach((u) => {
        if (u) gallery.push(u);
      });
    }
  });

  return { description, proofUrl, proofLabel, gallery };
}

export default function ProjectModal({
  project,
  existingCategories = [],
  onSave,
  onClose,
}: ProjectModalProps) {
  const initialExtracted = extractFromBodySections(project?.bodySections);

  const cleanExisting = existingCategories.filter(Boolean);
  const categoryOptions = Array.from(
    new Set(cleanExisting.length > 0 ? cleanExisting : DEFAULT_CATEGORIES)
  );

  const [title, setTitle] = useState(project?.title || "");
  const [category, setCategory] = useState(
    project?.category || categoryOptions[0] || "Web Dev"
  );
  const [customCategory, setCustomCategory] = useState("");
  const [isCustomCat, setIsCustomCat] = useState(() => {
    const c = (project?.category || "").trim();
    if (!c) return false;
    return !categoryOptions.includes(c);
  });

  const [thumbnailUrl, setThumbnailUrl] = useState(
    project?.thumbnailUrl || (project as any)?.image || ""
  );
  const [description, setDescription] = useState(initialExtracted.description);
  const [proofUrl, setProofUrl] = useState(initialExtracted.proofUrl);
  const [proofLabel, setProofLabel] = useState(initialExtracted.proofLabel);
  const [galleryImages, setGalleryImages] = useState<string[]>(initialExtracted.gallery);
  const [isBookmarked, setIsBookmarked] = useState(Boolean(project?.isBookmarked));
  const [error, setError] = useState("");

  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Main Cover Image Upload
  const handleThumbnailUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file for the cover image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Cover image is too large. Max allowed size is 10MB.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onloadend = () => {
      setThumbnailUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Additional Case Study Gallery Images Upload
  const handleGalleryFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((file) => {
      if (!file.type.startsWith("image/")) return false;
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 10MB limit.`);
        return false;
      }
      return true;
    });
    if (fileArray.length === 0) return;

    let loaded = 0;
    const added: string[] = [];
    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          added.push(reader.result);
        }
        loaded++;
        if (loaded === fileArray.length) {
          setGalleryImages((prev) => [...prev, ...added]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeGalleryImage = (idx: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Project title is required.");
      return;
    }
    if (!thumbnailUrl.trim()) {
      setError("Please upload or provide a cover image so the project card can be displayed.");
      return;
    }

    const finalCategory = isCustomCat
      ? customCategory.trim() || "Web Dev"
      : category.trim() || "Web Dev";

    const cleanProofUrl = proofUrl.trim();
    const normalizedProofUrl =
      cleanProofUrl && !/^https?:\/\//i.test(cleanProofUrl)
        ? `https://${cleanProofUrl}`
        : cleanProofUrl;

    // Pack the simple description, optional proof link, and gallery images into bodySections
    // so both PostgreSQL (`projects.body_sections`) and `/work/[slug]` read them seamlessly.
    const nextSections: BodySection[] = [];
    if (description.trim() || normalizedProofUrl) {
      nextSections.push({
        type: "description",
        mainTitle: proofLabel.trim() || normalizedProofUrl,
        subTitle: normalizedProofUrl,
        description: description.trim(),
      });
    }
    if (galleryImages.length > 0) {
      nextSections.push({
        type: "media",
        mainTitle: "Project Gallery",
        subTitle: "",
        mediaUrls: galleryImages,
      });
    }

    onSave({
      id: project?.id,
      title: title.trim(),
      subtitle: finalCategory,
      serviceType: finalCategory,
      startDate: project?.startDate || "",
      endDate: project?.endDate || "2025",
      client: project?.client || title.trim(),
      clientType: project?.clientType || "brand",
      category: finalCategory,
      logoUrl: project?.logoUrl || "",
      thumbnailUrl: thumbnailUrl.trim(),
      videoThumbnailUrl: project?.videoThumbnailUrl || "",
      isBookmarked,
      bodySections: nextSections,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-2xl max-h-[90vh] flex flex-col z-10 overflow-hidden animate-fade-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 bg-neutral-50/50">
          <div>
            <h3 className="text-lg font-black uppercase text-foreground leading-none">
              {project ? "Edit Work Project" : "Add New Work Project"}
            </h3>
            <p className="text-xs text-neutral-400 mt-1 font-mono uppercase tracking-wider">
              Updates the 3D Homepage Carousel, /work Page, and Individual Case Study Page
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* 1. Title & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono font-bold tracking-widest text-neutral-500 uppercase mb-2">
                Project Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                placeholder="e.g. NCSC Public App"
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand font-bold text-foreground"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-mono font-bold tracking-widest text-neutral-500 uppercase">
                  Category Filter <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomCat((v) => !v);
                    if (!isCustomCat) setCustomCategory(category);
                  }}
                  className="text-[10px] font-mono font-bold text-brand hover:underline uppercase cursor-pointer"
                >
                  {isCustomCat ? "Choose Existing" : "+ Custom Category"}
                </button>
              </div>

              {isCustomCat ? (
                <input
                  type="text"
                  value={customCategory}
                  placeholder="e.g. Mobile App"
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand font-bold"
                />
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand font-bold bg-white cursor-pointer"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* 2. Short Description for Individual Work Page */}
          <div>
            <label className="block text-[11px] font-mono font-bold tracking-widest text-neutral-500 uppercase mb-2">
              Short Project Description (Shown on Individual Work Page)
            </label>
            <textarea
              rows={3}
              value={description}
              placeholder="A brief 1–2 sentence summary of what was built for this project..."
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand leading-relaxed"
            />
          </div>

          {/* 3. Optional Proof of Work Link */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold tracking-widest text-neutral-600 uppercase">
                Proof of Work Link (Optional)
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                Leave empty to hide link on individual page
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1">
                  Live URL
                </label>
                <input
                  type="text"
                  value={proofUrl}
                  placeholder="https://example.com"
                  onChange={(e) => setProofUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1">
                  Link Text (Optional — defaults to URL)
                </label>
                <input
                  type="text"
                  value={proofLabel}
                  placeholder="e.g. Visit Live Site"
                  onChange={(e) => setProofLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                />
              </div>
            </div>
          </div>

          {/* 4. Cover Image (Card Thumbnail + Primary Hero Image) */}
          <div>
            <label className="block text-[11px] font-mono font-bold tracking-widest text-neutral-500 uppercase mb-2">
              Primary Cover Image <span className="text-red-500">*</span>
            </label>
            {thumbnailUrl ? (
              <div className="relative rounded-xl border border-neutral-200 bg-neutral-50 p-3 flex items-center justify-between gap-4">
                <img
                  src={thumbnailUrl}
                  alt="Cover Preview"
                  className="h-24 w-36 object-cover rounded-lg border border-neutral-200"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-neutral-700 truncate">
                    Cover Image Active
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Displayed on the 3D carousel, /work card grid, and top of the case study page.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setThumbnailUrl("")}
                  className="text-xs font-bold text-neutral-400 hover:text-red-500 uppercase transition-colors px-3 py-1.5 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleThumbnailUpload(file);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => thumbnailInputRef.current?.click()}
                className="rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50/60 flex flex-col items-center justify-center py-6 px-4 text-center hover:border-brand/50 hover:bg-brand/5 cursor-pointer transition-colors"
              >
                <span className="text-xs text-neutral-600 font-bold">
                  Drop cover image here or click to upload
                </span>
                <span className="text-[10px] text-neutral-400 font-mono mt-1">
                  PNG, JPG, WEBP — max 10MB
                </span>
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleThumbnailUpload(file);
                  }}
                />
              </div>
            )}
          </div>

          {/* 5. Additional Individual Page Gallery Images */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-mono font-bold tracking-widest text-neutral-500 uppercase">
                Additional Case Study Images ({galleryImages.length})
              </label>
              <span className="text-[10px] font-mono text-neutral-400">
                Stacked cleanly below the cover image on /work/[slug]
              </span>
            </div>

            {galleryImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                {galleryImages.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group border border-neutral-200 bg-neutral-50 rounded-xl p-1.5 overflow-hidden"
                  >
                    <img
                      src={url}
                      alt={`Gallery #${idx + 1}`}
                      className="h-24 w-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(idx)}
                      className="absolute top-2.5 right-2.5 bg-neutral-900/80 hover:bg-red-600 text-white text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center transition-colors cursor-pointer"
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files?.length) {
                  handleGalleryFiles(e.dataTransfer.files);
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => galleryInputRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50/40 flex flex-col items-center justify-center py-4 px-4 text-center hover:border-brand/50 hover:bg-brand/5 cursor-pointer transition-colors"
            >
              <span className="text-xs text-neutral-600 font-semibold">
                + Add extra screenshots / proof images
              </span>
              <span className="text-[10px] text-neutral-400 font-mono mt-0.5">
                Select one or multiple images
              </span>
              <input
                ref={galleryInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    handleGalleryFiles(e.target.files);
                  }
                }}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-neutral-400 hover:text-neutral-700 transition-colors uppercase py-2 px-4 cursor-pointer"
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="primary"
              className="py-2.5 px-7 font-bold text-xs uppercase"
            >
              {project ? "Update Project" : "+ Add Project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
