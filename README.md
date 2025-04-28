# Poll Application

A polling application built with Next.js, tRPC, and Firebase Firestore following the T3 stack.

## Features

- Create, read, update, and delete polls
- Create, read, update, and delete groups
- Link polls to groups
- Navigate between polls and groups pages

## Firebase Schema

The application uses the following Firestore collections:

### Groups Collection

- `group_name` (string)
- `group_description` (string)
- Sub-collection: `members`
  - `member_name` (string)
  - `member_no` (string)

### Polls Collection

- `poll_name` (string)
- `poll_description` (string)
- `poll_group` (reference to a group document)
- Sub-collection: `questions`
  - `question` (string)
  - `choices` (string list)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Firebase project with Firestore enabled

### Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your Firebase configuration:
   ```
   cp src/.env.example .env
   ```
4. Configure your Firebase project:
   - Go to the [Firebase Console](https://console.firebase.google.com/)
   - Create a new project (or use an existing one)
   - Enable Firestore Database
   - Go to Project Settings > General and copy the Firebase configuration values to your `.env` file

### Development

Run the development server:

```
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Build for Production

```
npm run build
npm run start
```

## Project Structure

The application follows the T3 stack structure:

- `/src/app` - Next.js app router pages
- `/src/components` - Reusable React components
- `/src/lib` - Firebase configuration and service functions
- `/src/server` - tRPC routers and procedures
- `/src/styles` - Global CSS

## Technologies Used

- [Next.js](https://nextjs.org/) - React framework
- [tRPC](https://trpc.io/) - End-to-end typesafe APIs
- [Firebase](https://firebase.google.com/) - Backend and database
- [TailwindCSS](https://tailwindcss.com/) - Styling
- [TypeScript](https://www.typescriptlang.org/) - Type safety
