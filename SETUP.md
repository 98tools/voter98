# Voter98 Project - Setup and Run Instructions

This is a full-stack voting application with a Cloudflare Workers backend and React frontend.

## Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Cloudflare account (for deployment)

## Project Structure

- `backend/` - Cloudflare Workers API with Hono framework
- `frontend/` - React application with Vite

## Setup Instructions

### 1. Dependencies Installation ✅
Dependencies have been installed for both backend and frontend.

### 2. Environment Configuration ✅
Environment files have been created:
- `backend/.env` - Backend configuration
- `frontend/.env` - Frontend configuration

### 3. Database Setup ✅
Local database migrations have been applied successfully.

## Running the Project

### Start the Backend (Cloudflare Workers)
```bash
cd backend
npm run dev
```
This will start the backend development server on `http://localhost:8787`

### Start the Frontend (React/Vite)
```bash
cd frontend
npm run dev
```
This will start the frontend development server on `http://localhost:5173`

## Available Scripts

### Backend Scripts
- `npm run dev` - Start development server
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm run db:generate` - Generate database migrations
- `npm run db:migrate:local` - Apply migrations locally
- `npm run db:migrate:remote` - Apply migrations to remote database
- `npm run db:studio` - Open Drizzle Studio

### Frontend Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run deploy` - Deploy frontend to Cloudflare Pages

## Configuration Notes

### Backend Configuration
The backend uses the following services:
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare KV (for session data)
- **Email**: Worker-mailer for SMTP
- **Cron Jobs**: Automated email sending and daily resets

### Frontend Configuration
The frontend is configured to:
- Connect to the local backend at `http://localhost:8787/api`
- Use Vite for fast development and hot reload
- Include Tailwind CSS for styling

## Next Steps for Production

1. **Update Cloudflare Configuration**:
   - Update `backend/wrangler.jsonc` with your actual Cloudflare resource IDs
   - Update environment variables with production values

2. **Deploy Backend**:
   ```bash
   cd backend
   npm run deploy
   ```

3. **Deploy Frontend**:
   ```bash
   cd frontend
   npm run deploy
   ```

## Security Notes

- The JWT secret in development is set to a default value
- Change all secrets and API keys before production deployment
- Update CORS settings in production for your actual domain

## Troubleshooting

- If you encounter database issues, try running `npm run db:migrate:local` again
- For CORS issues, check that the frontend URL matches in both environment files
- Ensure all Cloudflare resource IDs are correctly configured before deployment

## Features

This voting application includes:
- User authentication and authorization
- Poll creation and management
- Real-time voting
- Results visualization
- Admin panel
- Email notifications
- Audit logging
- Scheduled tasks for automated operations