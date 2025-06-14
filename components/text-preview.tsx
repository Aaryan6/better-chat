import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

export default function TextPreview({ file }: { file: File }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setText(e.target?.result as string);
    };
    reader.readAsText(file);
  }, [file]);

  // Clean and format the text for preview
  const cleanText = text
    .replace(/\s+/g, " ") // Replace multiple whitespace with single space
    .trim();

  const previewText =
    cleanText.length > 100 ? cleanText.slice(0, 100) + "..." : cleanText;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 mb-1">
        <FileText className="w-3 h-3 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground truncate">
          {file.name}
        </span>
      </div>
      <div className="text-[10px] leading-relaxed text-foreground/80 overflow-hidden">
        {previewText || "Empty file"}
      </div>
      <div className="mt-auto pt-1">
        <span className="text-[8px] text-muted-foreground">
          {text.length} chars
        </span>
      </div>
    </div>
  );
}
