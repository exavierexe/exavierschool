# CLAUDE.md - Exastro Project Guidelines

## Build Commands
```bash
npm install       # Install dependencies
npm run dev       # Development server with turbopack
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
```

## Code Style Guidelines
- **Component Structure**: Server components by default; add 'use client' when needed
- **Naming**: PascalCase for components, camelCase for functions, kebab-case for files
- **Imports**: React/Next imports first, third-party libraries next, local modules last (with @/ alias)
- **Typing**: TypeScript throughout (though strict mode is off)
- **Error Handling**: Try/catch for async operations with user-friendly error states
- **Component Design**: Leverage shadcn/ui components with "new-york" style
- **Styling**: Use Tailwind CSS and maintain existing CSS variables for theming

## Project Structure
- Next.js 15 with React 19
- Prisma ORM with PostgreSQL for data persistence
- Server actions for data mutations in src/actions.ts
- Components follow shadcn/ui patterns with component/ui directory structure
- Uses Clerk for authentication
- Implements ephemeris.js for astrological calculations

## Integration Notes
When adding new features, check existing patterns in similar components and maintain consistency with established conventions.