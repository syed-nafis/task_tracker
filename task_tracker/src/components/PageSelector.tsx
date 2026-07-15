'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';

interface PageSelectorProps {
  selected: string[];
  onChange: (pages: string[]) => void;
  allPages: string[];
  onNewPage?: (page: string) => void;
}

export function PageSelector({ selected, onChange, allPages, onNewPage }: PageSelectorProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = allPages.filter(
    (p) => p.toLowerCase().includes(input.toLowerCase()) && !selected.includes(p)
  );

  function toggle(page: string) {
    if (selected.includes(page)) {
      onChange(selected.filter((p) => p !== page));
    } else {
      onChange([...selected, page]);
    }
  }

  function addCustom() {
    const v = input.trim().toLowerCase();
    if (!v) return;
    onNewPage?.(v);
    if (!selected.includes(v)) onChange([...selected, v]);
    setInput('');
  }

  return (
    <div ref={ref} className="relative">
      <div
        className="flex flex-wrap gap-1 min-h-[36px] px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 cursor-pointer"
        onClick={() => setOpen(true)}
      >
        {selected.map((p) => (
          <span
            key={p}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30"
          >
            {p}
            <X
              size={10}
              className="cursor-pointer hover:text-slate-900 dark:text-white"
              onClick={(e) => { e.stopPropagation(); toggle(p); }}
            />
          </span>
        ))}
        {selected.length === 0 && (
          <span className="text-sm text-slate-900 dark:text-white/30 self-center">Select pages…</span>
        )}
        <ChevronDown size={14} className="ml-auto self-center text-slate-900 dark:text-white/40" />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-[#1a1a2e] shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-slate-200 dark:border-white/10">
            <input
              autoFocus
              className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-900 dark:text-white/30 outline-none"
              placeholder="Search or add page…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); }}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((p) => (
              <button
                key={p}
                className="w-full text-left px-3 py-2 text-sm text-slate-900 dark:text-white/70 hover:bg-slate-100 dark:bg-white/5 hover:text-slate-900 dark:text-white transition-colors"
                onClick={() => { toggle(p); setInput(''); }}
              >
                {p}
              </button>
            ))}
            {input.trim() && !allPages.includes(input.trim().toLowerCase()) && (
              <button
                className="w-full text-left px-3 py-2 text-sm text-violet-400 hover:bg-violet-500/10 transition-colors"
                onClick={addCustom}
              >
                + Add &quot;{input.trim()}&quot;
              </button>
            )}
            {filtered.length === 0 && !input && (
              <p className="px-3 py-2 text-sm text-slate-900 dark:text-white/30">All pages selected</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
