# Voter98 - Advanced Polling & Voting System

Deploy to Cloudflare License: MIT TypeScript React Tailwind CSS Cloudflare Workers

A powerful, web-based polling and voting system that enables organizations to create, manage, and conduct secure online polls with advanced features like email notifications, participant management, and real-time results. Built with React and TypeScript, optimized for easy and fast deployment on **Cloudflare Workers**.

## Screenshots

*[Screenshots will be added here]*

## ✨ Features

* 🗳️ **Advanced Poll Management** - Create, edit, and manage polls with complex ballot structures
* 👥 **Participant Management** - Add participants individually or import from spreadsheets with role-based access
* 📧 **Automated Email Notifications** - Send voting invitations and reminders via SMTP with configurable limits
* 🔐 **Secure Authentication** - JWT-based authentication with role-based access control (Admin, Sub-Admin, User)
* 📊 **Real-time Results** - View poll results with detailed analytics and vote tracking
* 🎯 **Audit Trail** - Complete audit system with auditor assignments and vote verification
* 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
* 🚀 **Cloudflare Workers Ready** - Optimized for edge deployment with D1 database
* ⏰ **Scheduled Polls** - Set start and end dates for automated poll lifecycle management
* 🔄 **Cron Job Integration** - Automated email sending and daily limit resets
* 📋 **Group Management** - Organize users into groups for easier participant management
* 🎨 **Modern UI** - Beautiful interface built with Tailwind CSS and React

## 🚀 Quick Start

### One-Click Deploy

Deploy directly to Cloudflare Workers with one click:

[Deploy to Cloudflare Workers]

### Local Development

1. **Clone the repository**  
```bash
git clone https://github.com/yourusername/voter98.git  
cd voter98
```

2. **Install dependencies**  
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. **Set up environment variables**  
Create a `.env` file in the backend directory:
```env
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:5173
```

4. **Set up database**  
```bash
cd backend
npm run db:generate
npm run db:migrate:local
```

5. **Start development servers**  
```bash
# Start backend (in backend directory)
npm run dev

# Start frontend (in frontend directory)
npm run dev
```

6. **Open in browser**  
```
Frontend: http://localhost:5173
Backend API: http://localhost:8787
```

## 🛠️ Tech Stack

* **Frontend**: Vite, React 19, TypeScript, Tailwind CSS, Cloudflare Workers
* **Backend**: Hono.js, TypeScript, Drizzle ORM, Cloudflare Workers
* **Database**: Cloudflare D1 (SQLite)
* **Authentication**: JWT with bcrypt
* **Email**: SMTP integration with worker-mailer

## 📖 How to Use

### 1. **User Authentication**
* Register/login with email and password
* Role-based access: Admin, Sub-Admin, User
* JWT-based session management

### 2. **Create a Poll**
* Navigate to Dashboard and click "Create New Poll"
* Set poll title, description, and schedule
* Configure ballot questions (multiple choice, text, etc.)
* Set up email notifications if needed

### 3. **Manage Participants**
* Add participants individually or import from CSV
* Assign participants to groups for easier management
* Set vote weights for weighted voting
* Generate unique tokens for non-user participants

### 4. **Configure Email Settings**
* Set up SMTP configuration in Admin Panel
* Configure daily email limits and cron job limits
* Customize email templates and content

### 5. **Poll Lifecycle**
* **Draft**: Poll is being created and configured
* **Active**: Poll is open for voting
* **Completed**: Poll has ended, results available
* **Cancelled**: Poll was cancelled

### 6. **Voting Process**
* Participants receive email invitations with unique links
* Secure token-based voting for non-users
* Real-time vote tracking and validation
* Audit trail for all voting activities

### 7. **Results & Analytics**
* View real-time poll results
* Export results in various formats
* Detailed analytics and vote breakdowns
* Auditor verification system

## 🎯 Use Cases

* **Corporate Voting** - Board elections, policy decisions, and shareholder votes
* **Academic Elections** - Student council elections, faculty voting, and course evaluations
* **Community Polls** - Neighborhood decisions, community surveys, and local elections
* **Event Planning** - Conference session voting, meetup topics, and event preferences
* **Product Development** - Feature prioritization, user feedback, and roadmap decisions
* **Non-profit Governance** - Board member elections, policy changes, and member votes
* **Research Surveys** - Academic research, market surveys, and data collection
* **Internal Communications** - Employee satisfaction surveys, team decisions, and feedback collection

## 🚀 Deployment

### Method 1: Deploy to Cloudflare Workers with one click

`Deploy Backend`<br>
[![Deploy to Cloudflare (Backend)](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/98tools/voter98/backend)

`Deploy Frontend`<br>
[![Deploy to Cloudflare (Frontend)](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/98tools/voter98/frontend)

- from Cloudflare dashboard, Workers, voter98-backend, Bindings, `Add Binding`, choose `D1 database` and press Add, Variable name is `DB`, D1 database is `voter-db` which you'll create here
- again `Add Binding`, choose `KV namespace` and press Add, Variable name is `VOTER_KV`, KV namespace is `voter-kv` which you'll create here
- navigate to `Settings`, Variables and Secrets, `Add`, Text, Variable name is `FRONTEND_URL`, Value is `https://voter98-frontend.your-username.workers.dev`

### Method 2: Deploy to Cloudflare Workers manually

#### Prerequisites
* Cloudflare account
* Node.js 18+ installed
* Git repository cloned

#### Step 1: Install and Setup Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

#### Step 2: Create Cloudflare Resources

```bash
# Create D1 database
wrangler d1 create voter-db

# Create KV namespace (optional, for caching)
wrangler kv:namespace create VOTER_KV
wrangler kv:namespace create VOTER_KV --preview
```

#### Step 3: Configure Backend

1. **Copy configuration template**:
```bash
cd backend
cp wrangler.jsonc.template wrangler.jsonc
```

2. **Update `wrangler.jsonc` with your values**:
```json
{
  // ...

  "vars": {
    "JWT_SECRET": "your-super-secret-jwt-key-change-this-in-production",
    "FRONTEND_URL": "https://your-frontend-url.workers.dev"
  },
  "kv_namespaces": [
    {
      "binding": "VOTER_KV",
      "id": "YOUR_KV_NAMESPACE_ID_HERE",
      "preview_id": "YOUR_KV_PREVIEW_NAMESPACE_ID_HERE"
    }
  ],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "voter-db",
      "database_id": "YOUR_D1_DATABASE_ID_HERE"
    }
  ]
}
```

3. **Deploy backend**:
```bash
npm run deploy
```

4. **Note your backend URL** (e.g., `https://voter15-backend.your-username.workers.dev`)

#### Step 4: Configure Frontend

1. **Create environment file**:
```bash
cd ../frontend
```

2. **Create `.env` file**:
```env
VITE_API_BASE_URL=https://voter15-backend.your-username.workers.dev/api
```

3. **Build and deploy frontend**:
```bash
npm run build
npm run deploy
```

4. **Note your frontend URL** (e.g., `https://voter15-frontend.your-username.workers.dev`)

#### Step 5: Update Backend Configuration

1. **Update backend `wrangler.jsonc`** with your frontend URL:
```json
{
  "vars": {
    "JWT_SECRET": "your-super-secret-jwt-key-change-this-in-production",
    "FRONTEND_URL": "https://your-frontend-url.workers.dev"
  }
}
```

2. **Redeploy backend**:
```bash
cd ../backend
npm run deploy
```

#### Step 6: Setup Database and Seed Data

1. **Apply database migrations**:
```bash
npm run db:migrate:remote
```

2. **Seed the database** (only in development):
```bash
# Make a POST request to seed endpoint
curl -X POST https://your-backend-url.workers.dev/api/dev/seed
```

**Default seed user**:
- **Admin**: `admin@example.com` / `password123`

#### Step 7: Configure SMTP (Optional)

1. **Access your application** at your frontend URL
2. **Login as admin** using the seed credentials
3. **Navigate to Admin Panel** → SMTP Settings
4. **Configure your SMTP settings**:
   - SMTP Host (e.g., `smtp.gmail.com`)
   - Port (e.g., `587` for TLS)
   - Username and Password
   - Daily email limits
   - Cron job limits

#### Step 8: Test Your Deployment

1. **Visit your frontend URL**
2. **Login with seed credentials**
3. **Create a test poll**
4. **Test email functionality** (if SMTP is configured)

### Environment Variables Reference

#### Backend Environment Variables (`wrangler.jsonc`)
```json
{
  "vars": {
    "JWT_SECRET": "your-jwt-secret-key",
    "FRONTEND_URL": "https://your-frontend-url.workers.dev"
  }
}
```

#### Frontend Environment Variables (`.env`)
```env
VITE_API_BASE_URL=https://your-backend-url.workers.dev/api
```

### Troubleshooting

#### Common Issues:

1. **CORS Errors**: Ensure `FRONTEND_URL` in backend config matches your frontend URL exactly
2. **Database Connection**: Verify D1 database ID is correct in `wrangler.jsonc`
3. **Email Not Working**: Check SMTP configuration in Admin Panel
4. **Build Errors**: Ensure all dependencies are installed with `npm install`

#### Development vs Production:

- **Development**: Use `npm run db:migrate:local` for local database
- **Production**: Use `npm run db:migrate:remote` for production database
- **Seeding**: Only available in development (JWT_SECRET contains "development")

### Deploy to Other Platforms

The built application can be deployed to any static hosting service:

* **Netlify**: Drag and drop the `dist` folder
* **Vercel**: Connect your repository for automatic deployments
* **GitHub Pages**: Use the built files from `dist/`

## 📜 Scripts

### Backend Scripts
* `npm run dev` - Start development server
* `npm run deploy` - Deploy to Cloudflare Workers
* `npm run db:generate` - Generate database migrations
* `npm run db:migrate:local` - Apply migrations locally
* `npm run db:migrate:remote` - Apply migrations to production
* `npm run db:studio` - Open Drizzle Studio

### Frontend Scripts
* `npm run dev` - Start development server
* `npm run build` - Build for production
* `npm run preview` - Preview production build locally
* `npm run deploy` - Deploy to Cloudflare Workers

## 🗄️ Database Schema

The application uses the following main entities:

* **Users** - Authentication and user management
* **User Groups** - Organization of users into groups
* **Polls** - Poll configuration and metadata
* **Poll Participants** - Voting participants with tokens
* **Poll Votes** - Individual vote records
* **Poll Auditors** - Audit trail management
* **SMTP Config** - Email configuration settings

## 🔧 Configuration

### Environment Variables

* `JWT_SECRET` - Secret key for JWT token generation
* `FRONTEND_URL` - Frontend application URL
* `DB` - D1 database binding (Cloudflare Workers)
* `VOTER_KV` - KV namespace for caching (optional)

### SMTP Configuration

Configure email settings through the Admin Panel:
* SMTP host and port
* Authentication credentials
* Daily email limits
* Cron job execution limits

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

* Follow TypeScript best practices
* Use Tailwind CSS for styling
* Write meaningful commit messages
* Test your changes thoroughly
* Update documentation as needed

## 📋 Roadmap

* **Enhanced Security**
  * Two-factor authentication
  * IP-based voting restrictions
  * Advanced audit logging
  * Blockchain integration for vote verification

* **Advanced Polling Features**
  * Ranked choice voting
  * Approval voting
  * Multi-stage polls
  * Poll templates and cloning

* **Email Integration**
  * Advanced email templates
  * Email tracking and analytics
  * Bulk email management
  * Email campaign scheduling

* **Analytics & Reporting**
  * Advanced analytics dashboard
  * Export to multiple formats
  * Real-time charts and graphs
  * Custom report generation

* **User Experience**
  * Dark mode support
  * Multi-language support
  * Mobile app development
  * Offline voting capabilities

* **Integration Features**
  * API for third-party integrations
  * Webhook support
  * SSO integration
  * Calendar integration

## 🐛 Bug Reports & Feature Requests

Found a bug or have a feature request? Please create an issue on GitHub Issues.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

* Built with React and TypeScript
* Styled with Tailwind CSS
* Deployed on Cloudflare Workers
* Database powered by Cloudflare D1
* Email functionality by worker-mailer
* Authentication with JWT and bcrypt

---

Made with ❤️ by the Voter98 Team

⭐ Star this project • 🐛 Report Bug • 🔧 Request Feature
