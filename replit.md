# Dynamic Survey Management System for Utility Companies

## Overview

This is a comprehensive React-based survey management platform that allows utility companies to create custom photo verification surveys and send them to users via email invitations. The system includes an admin panel for survey creation, dynamic survey configuration, and AI-powered photo verification using OpenAI Vision API. Users receive invitation links to complete surveys on mobile devices with a Typeform-style interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (January 30, 2025)

✓ Transformed simple photo verification app into full survey management system
✓ Added PostgreSQL database with surveys, steps, invitations, and sessions tables  
✓ Created admin panel for survey creation and user invitation management
✓ Implemented dynamic survey configuration with custom steps and tips
✓ Added email invitation system with unique tokens and expiry dates
✓ Built mobile-first survey interface for users with invitation tokens
✓ Maintained AI photo verification using OpenAI Vision API
✓ Redesigned landing page as "Office Scavenger Hunt" with riddle-based challenges
✓ Added themed UI with Gauntlet HQ branding and treasure hunt narrative

## System Architecture

The application follows a modern full-stack architecture with clear separation between admin and user experiences:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful endpoints under `/api` prefix
- **File Upload**: Multer middleware for handling image uploads
- **Development**: Hot reload with Vite integration in development mode

## Key Components

### Database Layer
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured via Neon serverless)
- **Schema**: Located in `shared/schema.ts` with three main tables:
  - `users`: User account management
  - `photoSessions`: Tracking verification session progress
  - `photoAttempts`: Individual photo submission records

### Storage Abstraction
- Interface-based storage layer (`IStorage`) with in-memory implementation
- Easily replaceable with database-backed storage
- Supports session management and attempt tracking

### AI Integration
- **Provider**: OpenAI GPT-4o for image analysis
- **Service**: Located in `server/services/openai.ts`
- **Capabilities**: Object detection and verification with confidence scoring
- **Input**: Base64-encoded images with expected object descriptions

### Camera System
- Custom React hook (`use-camera.tsx`) for camera access
- Fallback to file upload when camera access is denied
- Mobile-optimized with rear camera preference
- Canvas-based photo capture with customizable resolution

### UI Components
- **Progress Tracking**: Step-by-step progress header with visual progress bar
- **Camera Interface**: Integrated camera viewfinder with capture controls
- **Responsive Design**: Mobile-first approach with desktop compatibility
- **Design System**: Consistent styling with CSS custom properties

## Data Flow

1. **Session Initialization**: User starts verification process, creates new photo session
2. **Task Presentation**: App displays current photo task with instructions
3. **Photo Capture**: User takes photo via camera or uploads file
4. **AI Verification**: Image sent to OpenAI API for object detection
5. **Result Processing**: Verification result determines step progression
6. **Progress Tracking**: Session state updated, user advances or retries
7. **Completion**: All tasks completed successfully

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Accessible UI component primitives
- **openai**: Official OpenAI API client
- **drizzle-orm**: Type-safe database ORM
- **multer**: File upload handling middleware

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Static type checking
- **tailwindcss**: Utility-first CSS framework
- **@replit/vite-plugin-***: Replit-specific development plugins

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds React app to `dist/public`
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Shared**: TypeScript types shared between client and server

### Environment Configuration
- **Database**: `DATABASE_URL` environment variable required
- **AI Service**: `OPENAI_API_KEY` required for image verification
- **Development**: Automatic Vite integration with Express server
- **Production**: Static file serving with Express middleware

### Scalability Considerations
- In-memory storage implementation should be replaced with persistent database storage for production
- File upload size limits configured (10MB maximum)
- API rate limiting may be needed for OpenAI integration
- Session management could benefit from Redis for distributed deployments