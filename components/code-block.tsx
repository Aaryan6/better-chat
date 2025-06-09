"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

interface CodeBlockProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children: any;
}

export function CodeBlock({
  node,
  inline = false,
  className = "",
  children,
  ...props
}: CodeBlockProps) {
  // Extract language from className (format: language-js)
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const codeContent = String(children).replace(/\n$/, "");

  const [copied, setCopied] = useState<boolean>(false);
  const handleCopy = async (e: React.MouseEvent) => {
    // Prevent any default behavior
    e.preventDefault();
    // Stop event propagation
    e.stopPropagation();

    try {
      // Mark data attribute to prevent scrolling
      const scrollArea = document.querySelector(".chat-scroll-area");
      if (scrollArea) {
        scrollArea.setAttribute("data-copying", "true");
      }

      // Copy the text
      await navigator.clipboard.writeText(codeContent);
      setCopied(true);

      // Reset the copying state after a short delay
      setTimeout(() => {
        if (scrollArea) {
          scrollArea.removeAttribute("data-copying");
        }
        setCopied(false);
      }, 1000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      // Clean up in case of error
      const scrollArea = document.querySelector(".chat-scroll-area");
      if (scrollArea) {
        scrollArea.removeAttribute("data-copying");
      }
    }
  };

  if (!inline) {
    return (
      <div className="not-prose relative my-4">
        <div className="relative max-w-2xl">
          <SyntaxHighlighter
            language={language || undefined}
            style={atomDark}
            customStyle={{
              borderRadius: "0.5rem",
              padding: "1rem",
              margin: "0",
              backgroundColor: "#101113",
            }}
            wrapLongLines={true}
            wrapLines={true}
          >
            {codeContent}
          </SyntaxHighlighter>
          <button
            onClick={handleCopy}
            className="absolute right-2 top-2 rounded-md bg-zinc-700/50 p-1.5 text-xs text-zinc-100 hover:bg-zinc-700/70"
            aria-label="Copy code"
            type="button"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    );
  } else {
    return (
      <code
        className={`${className} rounded-md bg-zinc-100 px-1 py-0.5 text-sm dark:bg-slate-800`}
        {...props}
      >
        {children}
      </code>
    );
  }
}
