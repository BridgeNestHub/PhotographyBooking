# Ami Photography Website - Project Structure

## 📁 Complete File Structure

```
photographer-website/
├── public/                          # Frontend static files (served by Express)
│   ├── index.html                   # Homepage - Hero slideshow, portfolio gallery, services
│   ├── book-now.html               # Booking page - Form with pricing, date/time pickers
│   ├── about.html                  # About page - Team info, testimonials, contact form
│   ├── admin.html                  # Admin dashboard - Login, booking/message management
│   ├── css/
│   │   ├── styles.css              # Main stylesheet - Responsive design, animations
│   │   └── admin.css               # Admin-specific styles (referenced but not created)
│   ├── js/
│   │   ├── main.js                 # Frontend JavaScript - Gallery, forms, navigation
│   │   └── admin.js                # Admin dashboard functionality - CRUD operations
│   ├── images/                     # Portfolio photos and assets
│   │   ├── hero images (seattle1.jpg, pikeplacemarket.jpg, etc.)
│   │   ├── portfolio images (wedding1-6.jpg, portrait1-3.jpg, etc.)
│   │   └── team photos (aman.png, tigist.jpg, tamirat.jpg)
│   ├── uploads/                    # User uploaded files directory
│   ├── TODO.md                     # Development notes and setup instructions
│   └── .gitignore                  # Frontend-specific ignores
├── server/
│   ├── index.js                    # Express server - API routes, auth, email, CSRF
│   ├── data/db/                    # Local MongoDB data directory
│   └── public/uploads/             # Server-side uploads directory
├── .env                            # Environment variables - DB, email, auth config
├── .gitignore                      # Project-wide ignores
├── package.json                    # Dependencies and npm scripts
├── package-lock.json               # Dependency lock file
├── vite.config.js                  # Vite dev server configuration
├── DesignStructure.md              # This file - Project documentation
└── README.md                       # Complete project documentation
```

## 🔧 File Functions & Usage

### Frontend Files (public/)

**HTML Pages:**
- `index.html` - Homepage with hero slideshow, filterable portfolio gallery, services grid
- `book-now.html` - Booking form with date/time pickers, pricing packages, CSRF protection
- `about.html` - Team profiles, testimonials, contact form with email integration
- `admin.html` - Protected admin dashboard with login, booking/message management

**Stylesheets:**
- `styles.css` - Complete responsive design system with CSS Grid/Flexbox, animations, mobile-first approach

**JavaScript:**
- `main.js` - Frontend interactivity: gallery filters, lightbox, form submissions, mobile navigation
- `admin.js` - Admin dashboard: authentication, CRUD operations, session management, modal system

**Assets:**
- `images/` - Portfolio photos organized by category (weddings, portraits, events, etc.)
- `uploads/` - Dynamic file upload directory

### Backend Files (server/)

**Server:**
- `index.js` - Express server with:
  - RESTful API routes (/api/admin/*, /submit-booking, /api/submit-contact)
  - Authentication & session management
  - CSRF protection
  - Email notifications (Nodemailer)
  - Rate limiting & security (Helmet)
  - MongoDB integration
  - In-memory data storage (development)

**Database:**
- `data/db/` - Local MongoDB storage directory

### Configuration Files

**Environment:**
- `.env` - Configuration for database, email, authentication, security settings

**Build Tools:**
- `package.json` - Dependencies, scripts (dev, build, start)
- `vite.config.js` - Development server with proxy to backend

**Version Control:**
- `.gitignore` - Excludes node_modules, .env, database files

## 🚀 How Files Interact

### Frontend → Backend Flow:
1. **Forms** (book-now.html, about.html) → **CSRF token fetch** → **POST to server routes**
2. **Admin dashboard** (admin.html) → **Authentication** → **API calls** → **Database operations**
3. **Static files** served by Express from public/ directory

### Backend Operations:
1. **Express server** handles all HTTP requests
2. **Session management** with MongoDB store
3. **Email notifications** via Nodemailer for form submissions
4. **CSRF protection** for all form submissions
5. **Rate limiting** for API endpoints

### Development Workflow:
1. **Vite dev server** (port 8080) for frontend development
2. **Express server** (port 3000) for backend API
3. **Proxy configuration** routes API calls from frontend to backend
4. **Hot reload** for frontend changes, **nodemon** for backend changes
