import Link from "next/link";
import {
  BrainCircuit,
  FileImage,
  Search,
  HardDrive,
  Code2,
  Github as GithubIcon,
  ExternalLink,
} from "lucide-react";
import { Github } from "./icons";

const features = [
  {
    icon: BrainCircuit,
    title: "Multiple AI Models",
    description:
      "Chat with various AI models including GPT, Claude, Gemini, and more",
  },
  {
    icon: FileImage,
    title: "File & Image Support",
    description:
      "Upload and chat about documents, images, and other file types",
  },
  {
    icon: Search,
    title: "Web Search Support",
    description:
      "Get real-time information with integrated web search capabilities",
  },
  {
    icon: HardDrive,
    title: "Ollama Local Model Support",
    description:
      "Run AI models locally on your machine with Ollama integration",
  },
  {
    icon: Code2,
    title: "Code Markdown Support",
    description: "Beautiful syntax highlighting and code block rendering",
  },
  {
    icon: GithubIcon,
    title: "Open Source",
    description: "Built with transparency, contribute and customize as needed",
    link: "https://github.com/Aaryan6/better-chat",
  },
];

export const FeaturesOverview = () => {
  return (
    <div className="mt-8 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature, index) => {
          const IconComponent = feature.icon;
          const isGithubCard = feature.title === "Open Source";

          const cardContent = (
            <div className="group relative p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors duration-200 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-md bg-primary/10 text-primary">
                  {isGithubCard ? (
                    <Github className="w-5 h-5" />
                  ) : (
                    <IconComponent className="w-5 h-5" />
                  )}
                </div>
                <h3 className="font-semibold text-sm">{feature.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground flex-1">
                {feature.description}
              </p>
              {isGithubCard && (
                <span className="absolute top-3 right-3">
                  <ExternalLink className="w-4 h-4" />
                </span>
              )}
            </div>
          );

          if (feature.link) {
            return (
              <Link
                key={index}
                href={feature.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block h-full"
              >
                {cardContent}
              </Link>
            );
          }

          return (
            <div key={index} className="h-full">
              {cardContent}
            </div>
          );
        })}
      </div>
    </div>
  );
};
