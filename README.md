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

* **Frontend**: React 19, TypeScript, Tailwind CSS
* **Backend**: Hono.js, TypeScript, Drizzle ORM
* **Database**: Cloudflare D1 (SQLite)
* **Authentication**: JWT with bcrypt
* **Email**: SMTP integration with worker-mailer
* **Build Tool**: Vite
* **Deployment**: Cloudflare Workers
* **Development**: Hot reload, TypeScript support

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

[Deploy to Cloudflare Workers]

### Method 2: Deploy to Cloudflare Workers manually

1. **Install Wrangler CLI**  
```bash
npm install -g wrangler
```

2. **Login to Cloudflare**  
```bash
wrangler login
```

3. **Set up D1 database**  
```bash
wrangler d1 create voter-db
```

4. **Configure wrangler.toml**  
Update the database binding in your wrangler configuration.

5. **Build and Deploy**  
```bash
# Backend
cd backend
npm run deploy

# Frontend
cd ../frontend
npm run build
npm run deploy
```

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
