"use client";

import React, { useMemo, useState } from "react";
import ProjectModal, { ProjectData } from "./ProjectModal";
import { LogoData } from "./LogoModal";
import { getProjectSlug } from "../../lib/v2/workProjects";

interface WorkFormProps {
  data: {
    projects: ProjectData[];
  };
  logosData?: LogoData[];
  onChange: (data: any, updatedLogos?: LogoData[]) => void;
  onStartEditing?: () => void;
  disabled?: boolean;
}

export default function WorkForm({
  data,
  logosData = [],
  onChange,
  onStartEditing,
  disabled = false,
}: WorkFormProps) {
  const [editingProjectIndex, setEditingProjectIndex] = useState<number | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<string>("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const projectsList = data?.projects || [];
  const bookmarkedCount = projectsList.filter((p) => p.isBookmarked).length;

  const existingCategories = useMemo(() => {
    const set = new Set<string>();
    projectsList.forEach((p) => {
      const cat = (p.category || p.serviceType || "").trim();
      if (cat) set.add(cat);
    });
    return Array.from(set);
  }, [projectsList]);

  const filterCategories = useMemo(
    () => ["All", ...existingCategories],
    [existingCategories]
  );

  const handleStartEdit = (index: number) => {
    if (onStartEditing) onStartEditing();
    setEditingProjectIndex(index);
  };

  const toggleBookmark = (index: number) => {
    const targetProject = projectsList[index];
    const currentlyBookmarked = Boolean(targetProject.isBookmarked);

    if (!currentlyBookmarked && bookmarkedCount >= 6) {
      setToastMsg("Bookmark limit reached (max 6 featured projects)");
      setTimeout(() => setToastMsg(null), 4000);
      return;
    }

    if (onStartEditing) onStartEditing();

    const updatedList = projectsList.map((p, i) =>
      i === index ? { ...p, isBookmarked: !currentlyBookmarked } : p
    );

    onChange({ ...data, projects: updatedList });
  };

  const moveProject = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= projectsList.length) return;
    if (onStartEditing) onStartEditing();

    const updated = [...projectsList];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    onChange({ ...data, projects: updated });
  };

  const handleSaveModal = (updatedProject: ProjectData) => {
    if (onStartEditing) onStartEditing();
    const list = [...projectsList];

    if (isCreatingNew) {
      list.push(updatedProject);
    } else if (editingProjectIndex !== null) {
      list[editingProjectIndex] = {
        ...updatedProject,
        isBookmarked: Boolean(updatedProject.isBookmarked),
      };
    }

    onChange({ ...data, projects: list }, logosData);
    setEditingProjectIndex(null);
    setIsCreatingNew(false);
  };

  const removeProject = (index: number) => {
    const projectToDelete = projectsList[index];
    const projectTitle = projectToDelete?.title || "this project";
    if (!window.confirm(`Are you sure you want to delete "${projectTitle}"?`)) {
      return;
    }
    if (onStartEditing) onStartEditing();
    const list = projectsList.filter((_, i) => i !== index);
    onChange({ ...data, projects: list }, logosData);
  };

  const handleStartRenameCategory = (cat: string) => {
    setEditingCategory(cat);
    setCategoryDraft(cat);
  };

  const handleSaveRenameCategory = (oldCat: string) => {
    const nextCat = categoryDraft.trim();
    setEditingCategory(null);
    setCategoryDraft("");
    if (!nextCat || nextCat === oldCat) return;

    if (onStartEditing) onStartEditing();
    const updatedList = projectsList.map((p) => {
      const current = (p.category || p.serviceType || "").trim();
      if (current.toLowerCase() === oldCat.toLowerCase()) {
        return {
          ...p,
          category: nextCat,
          serviceType: nextCat,
          subtitle: nextCat,
        };
      }
      return p;
    });

    onChange({ ...data, projects: updatedList }, logosData);
    if (activeCategory.toLowerCase() === oldCat.toLowerCase()) {
      setActiveCategory(nextCat);
    }
  };

  const handleDeleteCategory = (catToDelete: string) => {
    const affectedCount = projectsList.filter(
      (p) => (p.category || p.serviceType || "").trim().toLowerCase() === catToDelete.toLowerCase()
    ).length;

    if (
      !window.confirm(
        `Delete category "${catToDelete}"?\n\nThe ${affectedCount} project${affectedCount === 1 ? "" : "s"} in this category will remain in "All" as uncategorized.`
      )
    ) {
      return;
    }

    if (onStartEditing) onStartEditing();
    const updatedList = projectsList.map((p) => {
      const current = (p.category || p.serviceType || "").trim();
      if (current.toLowerCase() === catToDelete.toLowerCase()) {
        return {
          ...p,
          category: "",
          serviceType: "",
          subtitle: "",
        };
      }
      return p;
    });

    onChange({ ...data, projects: updatedList }, logosData);
    if (activeCategory.toLowerCase() === catToDelete.toLowerCase()) {
      setActiveCategory("All");
    }
    if (editingCategory === catToDelete) {
      setEditingCategory(null);
      setCategoryDraft("");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {toastMsg && (
        <div className="bg-red-600 text-white text-xs font-bold uppercase tracking-wider px-4 py-3 rounded-xl shadow-lg flex items-center justify-between">
          <span>{toastMsg}</span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-white/80 hover:text-white font-mono text-sm leading-none ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Info Banner explaining how Work Admin connects to Homepage, /work, and /work/[slug] */}


      {/* Category Filter Bar (with inline Edit & Delete) + Add Project Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {filterCategories.map((cat) => {
            const active = activeCategory === cat;
            const isAll = cat === "All";
            const count = isAll
              ? projectsList.length
              : projectsList.filter(
                (p) => (p.category || p.serviceType || "").trim().toLowerCase() === cat.toLowerCase()
              ).length;

            if (!isAll && editingCategory === cat) {
              return (
                <div
                  key={cat}
                  className="inline-flex items-center gap-1 bg-white border border-brand rounded-full pl-3 pr-1.5 py-1 shadow-xs"
                >
                  <input
                    type="text"
                    autoFocus
                    value={categoryDraft}
                    onChange={(e) => setCategoryDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveRenameCategory(cat);
                      } else if (e.key === "Escape") {
                        setEditingCategory(null);
                        setCategoryDraft("");
                      }
                    }}
                    className="w-28 text-xs font-bold text-foreground focus:outline-none bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveRenameCategory(cat)}
                    title="Save category name"
                    className="w-5 h-5 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center hover:bg-brand/90 cursor-pointer"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryDraft("");
                    }}
                    title="Cancel"
                    className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-500 text-[10px] font-bold flex items-center justify-center hover:bg-neutral-200 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              );
            }

            if (isAll) {
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${active
                      ? "bg-brand text-white shadow-xs"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                >
                  All ({count})
                </button>
              );
            }

            return (
              <div
                key={cat}
                className={`inline-flex items-center rounded-full text-xs font-bold transition-all ${active
                    ? "bg-brand text-white shadow-xs"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className="pl-3 pr-1.5 py-1.5 cursor-pointer"
                >
                  {cat} ({count})
                </button>
                <button
                  type="button"
                  onClick={() => handleStartRenameCategory(cat)}
                  title={`Rename "${cat}"`}
                  className={`p-1 rounded-full transition-colors cursor-pointer ${active
                      ? "text-white/80 hover:text-white hover:bg-white/15"
                      : "text-neutral-400 hover:text-brand hover:bg-white"
                    }`}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(cat)}
                  title={`Delete "${cat}"`}
                  className={`p-1 mr-1 rounded-full transition-colors cursor-pointer ${active
                      ? "text-white/80 hover:text-white hover:bg-white/15"
                      : "text-neutral-400 hover:text-red-500 hover:bg-white"
                    }`}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            if (onStartEditing) onStartEditing();
            setIsCreatingNew(true);
          }}
          className="text-xs bg-brand/10 hover:bg-brand hover:text-white text-brand px-4 py-1.5 rounded-full font-bold transition-all uppercase cursor-pointer"
        >
          + Add Project
        </button>
      </div>

      {/* Projects List matching /work & /work/[slug] */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projectsList.map((project, index) => {
          const cat = (project.category || project.serviceType || "Project").trim();
          if (
            activeCategory !== "All" &&
            cat.toLowerCase() !== activeCategory.toLowerCase()
          ) {
            return null;
          }

          const coverImg =
            project.thumbnailUrl || (project as any).image || project.videoThumbnailUrl || "";
          const slug = getProjectSlug(project, index);

          // Extract short description, proof URL, and extra gallery image count from bodySections
          let shortDesc = "";
          let proofUrl = "";
          let extraImagesCount = 0;
          (project.bodySections || []).forEach((sec) => {
            if (sec?.type === "description") {
              if (!shortDesc && sec.description) shortDesc = sec.description;
              if (!proofUrl && /^https?:\/\//i.test((sec.subTitle || "").trim())) {
                proofUrl = (sec.subTitle || "").trim();
              }
            }
            if (sec?.mediaUrl) extraImagesCount += 1;
            if (Array.isArray(sec?.mediaUrls)) extraImagesCount += sec.mediaUrls.length;
          });

          return (
            <div
              key={`${project.id ?? "new"}-${index}`}
              className={`border rounded-2xl overflow-hidden flex flex-col justify-between transition-all bg-white ${project.isBookmarked
                  ? "border-amber-300 ring-1 ring-amber-200/60"
                  : "border-neutral-200/90 hover:border-neutral-300 shadow-xs"
                }`}
            >
              {/* Top Image Preview */}
              <div>
                <div className="relative h-44 w-full bg-neutral-100 border-b border-neutral-100 overflow-hidden">
                  {coverImg ? (
                    <img
                      src={coverImg}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-mono text-neutral-400 uppercase">
                      No Cover Image
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="bg-neutral-900/80 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {cat}
                    </span>
                    {extraImagesCount > 0 && (
                      <span className="bg-white/90 backdrop-blur-md text-neutral-800 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full">
                        +{extraImagesCount} gallery img{extraImagesCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {project.isBookmarked && (
                    <span className="absolute top-3 right-3 bg-amber-500 text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase">
                      ★ Featured
                    </span>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-base font-black text-foreground truncate">
                      {project.title || "Untitled Project"}
                    </h4>
                    <a
                      href={`/work/${slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono font-bold text-brand hover:underline shrink-0"
                      title="Open individual work page"
                    >
                      /work/{slug} &#8599;
                    </a>
                  </div>

                  <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                    {shortDesc || "Default case study description active — click Edit to customize."}
                  </p>

                  {proofUrl && (
                    <div className="text-[11px] font-mono text-brand truncate mt-1">
                      Proof Link: {proofUrl}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Action Footer */}
              <div className="px-4 py-3 bg-neutral-50/70 border-t border-neutral-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveProject(index, "up")}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-900 disabled:opacity-30 cursor-pointer text-xs font-bold"
                    title="Move earlier"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveProject(index, "down")}
                    disabled={index === projectsList.length - 1}
                    className="p-1.5 rounded-lg bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-900 disabled:opacity-30 cursor-pointer text-xs font-bold"
                    title="Move later"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleBookmark(index)}
                    className={`p-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${project.isBookmarked
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "bg-white border-neutral-200 text-neutral-400 hover:text-amber-500"
                      }`}
                    title={project.isBookmarked ? "Unpin featured project" : "Pin project to top"}
                  >
                    ★
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(index)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-neutral-200 hover:border-brand text-neutral-700 hover:text-brand text-xs font-bold uppercase transition-colors cursor-pointer"
                  >
                    Edit Page
                  </button>
                  <button
                    type="button"
                    onClick={() => removeProject(index)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-neutral-200 hover:border-red-500 text-neutral-400 hover:text-red-600 text-xs font-bold uppercase transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {projectsList.length === 0 && (
        <p className="text-sm text-neutral-400 font-mono italic text-center py-8">
          No work projects found. Click &quot;+ Add Project&quot; to add a project to the carousel and /work page.
        </p>
      )}

      {/* Modal for Editing existing project or Creating new project */}
      {(isCreatingNew || editingProjectIndex !== null) && (
        <ProjectModal
          project={editingProjectIndex !== null ? projectsList[editingProjectIndex] : null}
          existingCategories={existingCategories}
          onSave={handleSaveModal}
          onClose={() => {
            setEditingProjectIndex(null);
            setIsCreatingNew(false);
          }}
        />
      )}
    </div>
  );
}
