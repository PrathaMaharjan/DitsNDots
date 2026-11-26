"use client";

import React from "react";

export interface ContactData {
  headlineLine1?: string;
  headlineLine2?: string;
  description?: string;
  email?: string;
  phone?: string;
}

interface ContactFormProps {
  data: ContactData;
  onChange: (data: ContactData) => void;
  onStartEditing?: () => void;
  disabled?: boolean;
}

export default function ContactForm({
  data,
  onChange,
  onStartEditing,
  disabled = false,
}: ContactFormProps) {
  return (
    <div className="flex flex-col gap-6">


      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-mono font-bold tracking-widest text-neutral-500 uppercase mb-2">
            Headline Line 1 (White Text)
          </label>
          <input
            type="text"
            disabled={disabled}
            placeholder="e.g. Let's Build Something"
            value={data?.headlineLine1 || ""}
            onChange={(e) => {
              if (onStartEditing) onStartEditing();
              onChange({ ...data, headlineLine1: e.target.value });
            }}
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand font-bold disabled:bg-neutral-50 disabled:text-neutral-400"
          />
        </div>
        <div>
          <label className="block text-[11px] font-mono font-bold tracking-widest text-neutral-500 uppercase mb-2">
            Headline Line 2 (#0082C8 Blue Accent)
          </label>
          <input
            type="text"
            disabled={disabled}
            placeholder="e.g. Extraordinary."
            value={data?.headlineLine2 || ""}
            onChange={(e) => {
              if (onStartEditing) onStartEditing();
              onChange({ ...data, headlineLine2: e.target.value });
            }}
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand font-bold text-brand disabled:bg-neutral-50 disabled:text-neutral-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-mono font-bold tracking-widest text-neutral-500 uppercase mb-2">
          Description Paragraph
        </label>
        <textarea
          rows={3}
          disabled={disabled}
          placeholder="e.g. Ready to elevate your digital presence? Reach out to us today and let's discuss how we can help your business grow."
          value={data?.description || ""}
          onChange={(e) => {
            if (onStartEditing) onStartEditing();
            onChange({ ...data, description: e.target.value });
          }}
          className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand disabled:bg-neutral-50 disabled:text-neutral-400"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-mono font-bold tracking-widest text-neutral-500 uppercase mb-2">
            Display Email Address
          </label>
          <input
            type="email"
            disabled={disabled}
            placeholder="e.g. hello@Ditsanddots.com"
            value={data?.email || ""}
            onChange={(e) => {
              if (onStartEditing) onStartEditing();
              onChange({ ...data, email: e.target.value });
            }}
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand disabled:bg-neutral-50 disabled:text-neutral-400 font-mono"
          />
        </div>
        <div>
          <label className="block text-[11px] font-mono font-bold tracking-widest text-neutral-500 uppercase mb-2">
            Display Phone Number
          </label>
          <input
            type="text"
            disabled={disabled}
            placeholder="e.g. +1 (817) 330-9194"
            value={data?.phone || ""}
            onChange={(e) => {
              if (onStartEditing) onStartEditing();
              onChange({ ...data, phone: e.target.value });
            }}
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand disabled:bg-neutral-50 disabled:text-neutral-400 font-mono"
          />
        </div>
      </div>
    </div>
  );
}
