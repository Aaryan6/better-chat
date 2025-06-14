import { useEffect, useState } from "react";

export default function TextPreview({ file }: { file: File }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setText(e.target?.result as string);
    };
    reader.readAsText(file);
  }, [file]);

  return <>{text}</>;
}
