# 🤖 Better Chat

An advanced AI chat application built with modern web technologies, supporting multiple AI providers, file uploads, offline mode, and more.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)

## ✨ Features

### Chat Features

- 🔥 **Multiple AI Providers**: Support for OpenAI, Gemini, DeepSeek, Grok, Meta Llama, and more via OpenRouter
- 🏠 **Local AI Support**: Ollama integration for private AI models
- 🌊 **Resumable Streaming**: Continue conversations even after page reload without interrupting responses
- 🔄 **Multi-step Reasoning**: Advanced reasoning capabilities with supported models
- 💾 **Persistent Chat History**: Save and organize your conversations by time periods

### File & Media Support

- 📁 **File Uploads**: Support for images, documents, and text files
- 🖼️ **Multi-modal**: Chat with images and documents
- 📎 **Drag & Drop**: Easy file handling with drag and drop interface
- 🔍 **Web Search**: Integrated web search capabilities via EXA API

### User Experience

- 🔐 **Authentication**: Secure Google Auth via Clerk
- 🌙 **Dark/Light Mode**: Beautiful theme switching
- 📱 **Responsive Design**: Optimized for mobile and desktop
- ⚡ **Fast Performance**: Built with Next.js 15 and optimized for speed
- 🎨 **Modern UI**: Clean interface built with Shadcn/UI components

### Advanced Features

- 🔗 **Chat Sharing**: Share conversations with public links
- 🏷️ **Smart Grouping**: Automatic chat organization by time periods
- 🎯 **Model Selection**: Choose from multiple AI models with different capabilities
- 💳 **Credit System**: Anonymous usage with credit tracking
- 🔄 **Auto-resume**: Intelligent conversation resumption

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Database**: [PostgreSQL](https://www.postgresql.org/) (Neon DB)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Clerk](https://clerk.com/) with Google OAuth
- **AI**: [Vercel AI SDK](https://sdk.vercel.ai/) with [OpenRouter](https://openrouter.ai/)
- **Local AI**: [Ollama](https://ollama.ai/) integration
- **File Storage**: [UploadThing](https://uploadthing.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Shadcn/UI](https://ui.shadcn.com/)
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Web Search**: [EXA API](https://exa.ai/)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- pnpm package manager
- PostgreSQL database (Neon DB recommended)

### 1. Clone the Repository

```bash
git clone https://github.com/Aaryan6/better-chat
cd better-chat
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Database
NEON_DATABASE_URL="postgresql://username:password@host/database?sslmode=require"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# AI Providers
OPENROUTER_API_KEY="sk-or-v1-..."

# Web Search (Optional)
EXA_API_KEY="your-exa-api-key"

# File Uploads (UploadThing)
UPLOADTHING_SECRET="sk_live_..."
UPLOADTHING_APP_ID="your-app-id"

# Site Configuration
SITE_URL="http://localhost:3000"
```

### 4. Database Setup

```bash
# Generate migrations
pnpm db:generate

# Run migrations
pnpm db:migrate

# (Optional) Open Drizzle Studio to view your database
pnpm db:studio
```

### 5. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 API Keys Setup

### Required APIs

#### 1. Neon Database

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy the connection string to `NEON_DATABASE_URL`

#### 2. Clerk Authentication

1. Sign up at [Clerk](https://dashboard.clerk.com/)
2. Create a new application
3. Enable Google OAuth provider
4. Copy the publishable and secret keys

#### 3. OpenRouter (AI Models)

1. Visit [OpenRouter](https://openrouter.ai/)
2. Create an account and get API key
3. Add credits to your account for API usage

### Optional APIs

#### 4. EXA (Web Search)

1. Sign up at [EXA](https://dashboard.exa.ai/)
2. Get your API key for web search functionality

#### 5. UploadThing (File Storage)

1. Go to [UploadThing](https://uploadthing.com/)
2. Create a new app
3. Copy the secret key and app ID

## 🏠 Local AI Setup (Ollama)

For offline AI capabilities:

1. **Install Ollama**:

   ```bash
   # macOS
   brew install ollama

   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh

   # Windows
   # Download from https://ollama.ai/download
   ```

2. **Download Models**:

   ```bash
   ollama pull llama3.2
   ollama pull codellama
   ollama pull mistral
   ```

3. **Start Ollama Server**:
   ```bash
   ollama serve
   ```

The app will automatically detect available Ollama models when running locally.

## 📝 Available Scripts

```bash
# Development
pnpm dev          # Start development server with Turbopack
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint

# Database
pnpm db:push      # Push schema changes to database
pnpm db:pull      # Pull schema from database
pnpm db:generate  # Generate migrations
pnpm db:migrate   # Run migrations
pnpm db:studio    # Open Drizzle Studio
```

## 🌐 Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Aaryan6/better-chat)

1. Fork this repository
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Make sure to set all environment variables in your deployment platform. For Vercel:

1. Go to your project dashboard
2. Navigate to Settings → Environment Variables
3. Add all the required variables from `.env.local`

## 🎯 Model Support

### OpenRouter Models

- **OpenAI**: GPT-4o Mini, GPT-4.1 Mini
- **Google**: Gemini 2.5 Pro, Gemini 2.0 Flash
- **DeepSeek**: DeepSeek Chat v3
- **X.AI**: Grok 3 Mini Beta
- **Meta**: Llama 4 Scout

### Ollama Models (Local)

- Llama 3.2
- Code Llama
- Mistral
- Any model available in Ollama

## 📂 Project Structure

```
better-chat/
├── ai/                 # AI providers and tools
├── app/               # Next.js app router pages
├── components/        # React components
├── db/               # Database schema and migrations
├── hooks/            # Custom React hooks
├── lib/              # Utility libraries
├── providers/        # React context providers
├── public/           # Static assets
└── utils/            # Utility functions
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Open a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: [aaryanpatel683@gmail.com](mailto:aaryanpatel683@gmail.com)
- 🐛 Issues: [GitHub Issues](https://github.com/Aaryan6/better-chat/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/Aaryan6/better-chat/discussions)

## 🙏 Acknowledgments

- [Vercel AI SDK](https://sdk.vercel.ai/) for the amazing AI toolkit
- [Shadcn/UI](https://ui.shadcn.com/) for beautiful components
- [OpenRouter](https://openrouter.ai/) for AI model access
- [Clerk](https://clerk.com/) for authentication
- [Neon](https://neon.tech/) for serverless PostgreSQL

---

Made with ❤️ by [Aaryan Patel](https://github.com/Aaryan6)
