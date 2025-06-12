import { UIMessage } from "ai";

export const createUserMessage = ({
  id,
  content,
}: {
  id: string;
  content: string;
}): UIMessage => ({
  id,
  role: "user" as UIMessage["role"],
  content,
  parts: [{ type: "text", text: content }] as UIMessage["parts"],
  createdAt: new Date(),
});

export const createAIMessage = ({
  id,
  content,
  parts,
  role,
}: {
  id: string;
  content: string;
  parts: UIMessage["parts"];
  role: UIMessage["role"];
}): UIMessage => ({
  id,
  role,
  content,
  parts,
  createdAt: new Date(),
});
