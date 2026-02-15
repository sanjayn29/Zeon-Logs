# Zeon Logs

A modern log analysis and management system built with React and TypeScript.

## Features

- **Upload**: Import and process log files
- **Normalization**: Standardize log data formats
- **Dashboard**: Visualize log analytics and metrics
- **Chat**: Interactive log analysis interface

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

```sh
# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:8080`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode

## Technologies Used

- **Vite** - Build tool and dev server
- **React** - UI framework
- **TypeScript** - Type safety
- **shadcn/ui** - UI component library
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **TanStack Query** - Data fetching
- **Supabase** - Backend services

## Project Structure

```
src/
├── components/     # Reusable components
├── pages/          # Page components
├── hooks/          # Custom React hooks
├── lib/            # Utility functions
└── integrations/   # External service integrations
```
