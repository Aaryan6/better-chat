import Chat from "@/components/chat";
import { v4 as uuidv4 } from "uuid";

export default function Page() {
  // Generate a new chatId for new conversations
  const newChatId = uuidv4();
  return <Chat key={newChatId} chatId={newChatId} />;
}
