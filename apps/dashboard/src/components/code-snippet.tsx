"use client";

import { CopyButton } from "./copy-button";

interface CodeSnippetProps {
  code: string;
  language?: string;
  title?: string;
}

export function CodeSnippet({ code, language = "html", title }: CodeSnippetProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
      {title && (
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
          <span className="text-xs font-medium text-zinc-400">{title}</span>
          <CopyButton text={code} />
        </div>
      )}
      <div className="relative">
        {!title && (
          <div className="absolute right-2 top-2">
            <CopyButton text={code} />
          </div>
        )}
        <pre className="overflow-x-auto p-4 text-sm">
          <code className={`language-${language} text-zinc-300`}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}
