# Ami Photography Website

A professional photography portfolio and booking website built with Node.js, Express, and MongoDB. Features a responsive frontend with an admin dashboard for managing bookings and client communications.

## 🌟 Features

### Frontend
- **Responsive Design**: Mobile-first approach with modern CSS Grid and Flexbox
- **Interactive Portfolio**: Filterable gallery with lightbox functionality
- **Booking System**: Comprehensive booking form with real-time validation
- **Contact Forms**: Multiple contact methods with email notifications
- **Hero Slideshow**: Automatic image rotation on homepage
- **Service Showcase**: Detailed photography service listings

### Backend & Admin
- **Secure Admin Dashboard**: Protected admin panel with session management
- **Booking Management**: View, confirm, and export booking requests
- **Message System**: Handle client inquiries with read/unread status
- **Email Notifications**: Automated confirmation emails via Nodemailer
- **CSRF Protection**: Security against cross-site request forgery
- **Rate Limiting**: API protection against abuse
- **MongoDB Integration**: Persistent data storage

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Security**: Helmet, CSRF tokens, Rate limiting
- **Email**: Nodemailer with Gmail/SMTP support
- **Development**: Vite for frontend development server
- **Session Management**: Express-session with MongoDB store

## 📁 Project Structure

```
photographer-website/
├── public/                 # Frontend static files
│   ├── css/
│   │   ├── styles.css     # Main stylesheet
│   │   └── admin.css      # Admin dashboard styles
│   ├── js/
│   │   ├── main.js        # Frontend JavaScript
│   │   └── admin.js       # Admin dashboard functionality
│   ├── images/            # Portfolio and site images
│   ├── uploads/           # User uploaded files
│   ├── index.html         # Homepage
│   ├── book-now.html      # Booking page
│   ├── about.html         # About page
│   └── admin.html         # Admin dashboard
├── server/
│   ├── data/db/           # MongoDB data directory
│   └── index.js           # Express server
├── .env                   # Environment variables
├── package.json           # Dependencies and scripts
├── vite.config.js         # Vite configuration
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local installation or Atlas)
- Gmail account (for email notifications)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd photographer-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up MongoDB**
   
   **Option A: Local MongoDB**
   ```bash
   # Install MongoDB via Homebrew (macOS)
   brew tap mongodb/brew
   brew install mongodb-community
   
   # Start MongoDB
   brew services start mongodb-community
   
   # Create database and collections
   mongosh "mongodb://localhost:27017" --eval '
     use amiphotography;
     db.createCollection("admins");
     db.createCollection("bookings");
     db.createCollection("contacts");'
   ```
   
   **Option B: MongoDB Atlas**
   - Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a cluster and get connection string
   - Update `MONGODB_URI` in `.env`

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

5. **Start the application**
   ```bash
   # Development mode (both frontend and backend)
   npm run dev
   
   # Or start separately
   npm run dev:backend    # Backend only
   npm run dev:frontend   # Frontend only
   
   # Production mode
   npm start
   ```

6. **Access the application**
   - Website: http://localhost:3000
   - Admin Dashboard: http://localhost:3000/admin.html
   - Frontend Dev Server: http://localhost:8080 (if using Vite)

## ⚙️ Configuration

### Environment Variables (.env)

```env
# Core Configuration
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:3000

# Security
SESSION_SECRET=your_random_secret_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password

# Database
MONGODB_URI=mongodb://localhost:27017/amiphotography

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="Ami Photography" <noreply@amiphotography.com>
CONTACT_EMAIL=contact@amiphotography.com

# Session & Cookies
SESSION_NAME=amiphotography.sid
COOKIE_DOMAIN=localhost
```

### Email Setup (Gmail)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use the generated password in `EMAIL_PASS`

## 📱 Usage

### For Clients
1. **Browse Portfolio**: View categorized photography work
2. **Book Sessions**: Fill out detailed booking form
3. **Contact**: Send inquiries via contact form
4. **Receive Confirmations**: Automatic email confirmations

### For Administrators
1. **Login**: Access admin dashboard with credentials
2. **Manage Bookings**: View, confirm, or export booking requests
3. **Handle Messages**: Read and respond to client inquiries
4. **Monitor Activity**: Track booking status and client communications

## 🎨 Customization

### Styling
- Edit `public/css/styles.css` for design changes
- CSS variables in `:root` for easy color scheme updates
- Responsive breakpoints already configured

### Content
- Replace images in `public/images/`
- Update text content in HTML files
- Modify service offerings and pricing

### Functionality
- Add new form fields in HTML and corresponding backend handling
- Extend admin dashboard features in `server/index.js`
- Customize email templates in server code

## 🚀 Deployment

### Local Testing
```bash
# Test the production build
npm run build
npm start
```

### Production Deployment

#### Option 1: Traditional Hosting (GoDaddy, etc.)
1. **Build the project**
   ```bash
   npm run build
   ```

2. **Upload files**
   - Upload `public/` folder contents to web root
   - Upload `server/` folder and `package.json`
   - Install dependencies on server: `npm install --production`

3. **Configure environment**
   - Set production environment variables
   - Update `CLIENT_URL` and `COOKIE_DOMAIN`
   - Set `NODE_ENV=production`

4. **Start the server**
   ```bash
   node server/index.js
   ```

#### Option 2: Cloud Platforms (Heroku, Railway, etc.)
1. **Prepare for deployment**
   ```bash
   # Ensure start script in package.json
   "scripts": {
     "start": "node server/index.js"
   }
   ```

2. **Set environment variables** on your platform
3. **Deploy** following platform-specific instructions

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use strong `SESSION_SECRET`
- [ ] Configure proper `MONGODB_URI`
- [ ] Set up SSL/HTTPS
- [ ] Configure domain in `CLIENT_URL`
- [ ] Test email functionality
- [ ] Verify admin login works
- [ ] Test booking and contact forms

## 🔧 Development

### Available Scripts
```bash
npm start              # Start production server
npm run dev           # Start both frontend and backend in dev mode
npm run dev:backend   # Start backend with nodemon
npm run dev:frontend  # Start Vite dev server
npm run build         # Build frontend for production
npm run mongo         # Start local MongoDB
```

### Development Workflow
1. **Frontend changes**: Edit files in `public/`, auto-reload with Vite
2. **Backend changes**: Edit `server/index.js`, auto-restart with nodemon
3. **Database changes**: Use MongoDB Compass or mongosh for data management

### Adding New Features
1. **Frontend**: Add HTML/CSS/JS in `public/`
2. **Backend**: Add routes and logic in `server/index.js`
3. **Database**: Define schemas and models as needed
4. **Admin**: Extend admin dashboard functionality

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Failed**
```bash
# Check if MongoDB is running
brew services list | grep mongodb

# Start MongoDB if not running
brew services start mongodb-community
```

**Email Not Sending**
- Verify Gmail App Password is correct
- Check 2FA is enabled on Gmail account
- Ensure `EMAIL_USER` and `EMAIL_PASS` are set correctly

**Admin Login Not Working**
- Verify `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`
- Check browser console for CSRF token errors
- Clear browser cookies and try again

**Port Already in Use**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 <PID>
```

### Debug Mode
Set `NODE_ENV=development` for detailed error messages and stack traces.

## 📄 License

This project is licensed under the ISC License - see the package.json file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions:
- Check the troubleshooting section above
- Review the TODO.md file for known issues
- Create an issue in the repository

## 🔄 Updates & Maintenance

### Regular Tasks
- Update dependencies: `npm update`
- Backup MongoDB data regularly
- Monitor server logs for errors
- Update portfolio images as needed
- Review and respond to client inquiries

### Security Updates
- Keep Node.js and dependencies updated
- Rotate session secrets periodically
- Monitor for security vulnerabilities
- Review admin access logs

---

**Built with ❤️ for Ami Photography**