require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const morgan = require('morgan');
const csrf = require('csurf');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const app = express();

// ===== In-Memory Database (For Development) =====
let bookings = [];
let messages = [];

// Sample initial data
const initializeSampleData = () => {
  bookings = [
    {
      id: uuidv4(),
      clientName: 'John Doe',
      clientEmail: 'john@example.com',
      clientPhone: '555-0101',
      eventType: 'Wedding',
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      package: 'Premium',
      status: 'pending',
      additionalNotes: 'Outdoor ceremony requested',
      createdAt: new Date()
    },
    {
      id: uuidv4(),
      clientName: 'Jane Smith',
      clientEmail: 'jane@example.com',
      clientPhone: '555-0202',
      eventType: 'Portrait',
      eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      package: 'Basic',
      status: 'confirmed',
      additionalNotes: '',
      createdAt: new Date()
    }
  ];

  messages = [
    {
      id: uuidv4(),
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      subject: 'Wedding Inquiry',
      message: 'I would like information about your wedding packages.',
      date: new Date(),
      read: false, 
      archived: false
    },
    {
      id: uuidv4(),
      name: 'Mike Brown',
      email: 'mike@example.com',
      subject: 'Availability Question',
      message: 'Are you available for a corporate event on June 15th?',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      read: true,
      archived: false
    }
  ];
};

// Initialize sample data
initializeSampleData();

// ===== Enhanced Security Middleware =====
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com"],
      connectSrc: ["'self'"],
      frameAncestors: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// ===== Request Logging =====
app.use(morgan('dev'));

// ===== CORS Configuration =====
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL 
    : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token'],
  maxAge: 600
}));
app.options('*', cors());

// ===== Body Parsers =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== Static Files =====
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: (res) => {
    res.set('Cache-Control', 'public, max-age=3600');
  }
}));

// ===== Session Configuration =====
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI,
  collectionName: 'sessions',
  ttl: 24 * 60 * 60,
  autoRemove: 'interval',
  autoRemoveInterval: 60,
  crypto: {
    secret: process.env.SESSION_SECRET.substring(0, 32)
  }
});

app.use(session({
  name: process.env.SESSION_NAME,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    domain: process.env.COOKIE_DOMAIN,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  },
  rolling: true
}));

// ===== CSRF Middleware Configuration =====
const csrfProtection = csrf({
    cookie: false, // We're using sessions
    value: (req) => {
      // Check both headers and body for CSRF token
      return req.headers['x-csrf-token'] || req.body._csrf;
    }
});

// CSRF token endpoints - MUST be before CSRF protection is applied
app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ 
        token: req.csrfToken(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
});

app.get('/csrf-token', csrfProtection, (req, res) => {
    res.json({ 
        token: req.csrfToken(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
});

// ===== Rate Limiting =====
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  skip: (req) => ['/api/admin/health'].includes(req.path),
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: req.rateLimit.resetTime
    });
  }
});
app.use('/api/', apiLimiter);

// ===== No-Cache Middleware =====
const noCache = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};

// ===== Database Connection =====
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 50,
    wtimeoutMS: 2500
  })
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('⚠️ Server will continue running without database connection');
    // Remove process.exit(1) to let server run without DB
  });
  
  mongoose.connection.on('error', err => {
    console.error('MongoDB runtime error:', err);
});

// ===== Authentication Middleware =====
const authenticate = (req, res, next) => {
  if (!req.session.admin) {
    return res.status(401).json({ 
      error: 'Authentication required',
      authenticated: false
    });
  }
  next();
};

// ===== Public Routes (before auth middleware) =====
app.get('/api/admin/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    sessionStore: 'active',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/admin/check-auth', noCache, (req, res) => {
  try {
    res.json({ 
      authenticated: !!req.session.admin,
      username: req.session.admin ? process.env.ADMIN_USERNAME : null,
      csrfValid: true
    });
  } catch (err) {
    res.status(500).json({ error: 'Auth check failed' });
  }
});

app.post('/api/admin/login', noCache, (req, res) => {
  const { username, password } = req.body;

  if (username === process.env.ADMIN_USERNAME && 
      password === process.env.ADMIN_PASSWORD) {
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session error' });

      req.session.admin = true;
      req.session.cookie.expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      res.json({
        success: true,
        expires: req.session.cookie.expires
      });
    });
  } else {
    res.status(401).json({
      error: 'Invalid credentials',
      authenticated: false
    });
  }
});

// ===== Protected Routes =====
app.use('/api/admin', authenticate, noCache);

// Bookings
app.get('/api/admin/bookings', (req, res) => {
  try {
    let filteredBookings = [...bookings];
    
    if (req.query.status) {
      filteredBookings = filteredBookings.filter(
        b => b.status.toLowerCase() === req.query.status.toLowerCase()
      );
    }
    
    filteredBookings.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
    
    res.json(filteredBookings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

app.get('/api/admin/bookings/:id', (req, res) => {
  try {
    const booking = bookings.find(b => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

app.post('/api/admin/bookings/:id/confirm', csrfProtection, (req, res) => {
  try {
    const index = bookings.findIndex(b => b.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Booking not found' });
    
    bookings[index] = {
      ...bookings[index],
      status: 'confirmed',
      updatedAt: new Date()
    };
    
    res.json({
      ...bookings[index],
      csrfToken: req.csrfToken() // Send new token
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to confirm booking',
      csrfToken: req.csrfToken() // Send new token on error
    });
  }
});

app.get('/api/admin/bookings/export', async (req, res) => {
  try {
    let dataToExport;
    const { id, format = 'json' } = req.query;
    
    if (id) {
      const booking = bookings.find(b => b.id === id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      dataToExport = booking;
    } else {
      dataToExport = bookings;
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=booking${id ? `-${id}` : 's'}.json`);
    res.send(JSON.stringify(dataToExport, null, 2));
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// Messages
app.get('/api/admin/messages', (req, res) => {
  try {
    let filteredMessages = [...messages];
    
    if (req.query.includeArchived !== 'true') {
      filteredMessages = filteredMessages.filter(m => !m.archived);
    }
    
    if (req.query.unread === 'true') {
      filteredMessages = filteredMessages.filter(m => !m.read);
    }
    
    filteredMessages.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json(filteredMessages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.get('/api/admin/messages/:id', (req, res) => {
  try {
    const index = messages.findIndex(m => m.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Message not found' });
    
    messages[index] = {
      ...messages[index],
      read: true,
      readAt: new Date()
    };
    
    res.json(messages[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

app.post('/api/admin/messages/:id/mark-read', csrfProtection, (req, res) => {
  try {
    const index = messages.findIndex(m => m.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Message not found' });
    
    messages[index] = {
      ...messages[index],
      read: true,
      readAt: new Date()
    };
    
    res.json({ 
      success: true, 
      message: 'Message marked as read',
      data: messages[index],
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to mark message as read',
      csrfToken: req.csrfToken()
    });
  }
});

// ===== Email Configuration =====
const emailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
});
  
  // Email templates
  const getContactEmailTemplate = (name, formData) => {
    return {
      subject: 'Thank you for contacting Ami Photography!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hi ${name},</h2>
          <p>Thank you for reaching out to Ami Photography! We've received your inquiry and are excited to potentially work with you.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3>Your Message Details:</h3>
            <p><strong>Subject:</strong> ${formData.subject}</p>
            <p><strong>Message:</strong> ${formData.message}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <p>We'll get back to you within 24-48 hours with a detailed response.</p>
          <p>In the meantime, feel free to browse our portfolio or check out our photography packages on our website.</p>
          
          <p>Best regards,<br>
          <strong>The Ami Photography Team</strong><br>
          📞 (123) 456-7890<br>
          ✉️ info@amiphotography.com</p>
        </div>
      `
    };
  };
  
  const getBookingEmailTemplate = (name, formData) => {
    return {
      subject: 'Booking Request Confirmation - Ami Photography',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hi ${name},</h2>
          <p>Thank you for your booking request! We're thrilled that you've chosen Ami Photography for your special event.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3>Your Booking Details:</h3>
            <p><strong>Event Type:</strong> ${formData.eventType}</p>
            <p><strong>Date:</strong> ${new Date(formData.date).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${formData.startTime} - ${formData.endTime}</p>
            <p><strong>Location:</strong> ${formData.location}</p>
            <p><strong>Package:</strong> ${formData.package}</p>
            <p><strong>Additional Notes:</strong> ${formData.details || 'None'}</p>
          </div>
          
          <p>We'll review your request and get back to you within 24-48 hours to confirm availability and discuss any details.</p>
          <p>If you have any urgent questions, please don't hesitate to contact us directly.</p>
          
          <p>Looking forward to capturing your special moments!<br>
          <strong>The Ami Photography Team</strong><br>
          📞 (123) 456-7890<br>
          ✉️ info@amiphotography.com</p>
        </div>
      `
    };
  };
  
  // Email sending function
  async function sendConfirmationEmail(email, template) {
    try {
      const mailOptions = {
        from: `"Ami Photography" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html
      };
      
      const result = await emailTransporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
}

// Logout
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie(process.env.SESSION_NAME);
    res.json({ success: true });
  });
});

// ===== Contact Message Submission Route with CSRF Protection =====
app.post('/api/submit-contact', csrfProtection, async (req, res) => {
    try {
      const { name, email, phone, subject, message } = req.body;
  
      if (!name || !email || !message) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields (name, email, message)',
          csrfToken: req.csrfToken()
        });
      }
  
      const newMessage = {
        id: uuidv4(),
        name: name.trim(),
        email: email.trim(),
        phone: phone ? phone.trim() : '',
        subject: subject || 'General Inquiry',
        message: message.trim(),
        date: new Date(),
        read: false,
        archived: false
      };
  
      messages.push(newMessage);
  
      // Send confirmation email
      const emailTemplate = getContactEmailTemplate(name, {
        subject: subject || 'General Inquiry',
        message: message
      });
      
      const emailResult = await sendConfirmationEmail(email, emailTemplate);
  
      res.status(201).json({
        success: true,
        message: 'Message sent successfully!',
        messageId: newMessage.id,
        emailSent: emailResult.success,
        csrfToken: req.csrfToken()
      });
    } catch (error) {
      console.error('Contact form error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send message',
        csrfToken: req.csrfToken()
      });
    }
});

// ===== Booking Submission Route with CSRF Protection =====
app.post('/submit-booking', csrfProtection, async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        eventType,
        date,
        package: packageType,
        startTime,
        endTime,
        location,
        details
      } = req.body;
  
      if (!name || !email || !phone || !eventType || !date || !packageType || !startTime || !endTime || !location) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
          csrfToken: req.csrfToken()
        });
      }
  
      const newBooking = {
        id: uuidv4(),
        clientName: name,
        clientEmail: email,
        clientPhone: phone,
        eventType,
        eventDate: new Date(`${date} ${startTime}`),
        package: packageType,
        startTime,
        endTime,
        location,
        additionalNotes: details || '',
        status: 'pending',
        createdAt: new Date()
      };
  
      bookings.push(newBooking);
  
      // Send confirmation email
      const emailTemplate = getBookingEmailTemplate(name, {
        eventType,
        date,
        startTime,
        endTime,
        location,
        package: packageType,
        details
      });
      
      const emailResult = await sendConfirmationEmail(email, emailTemplate);
  
      res.status(201).json({
          success: true,
          message: 'Booking request received successfully!',
          bookingId: newBooking.id,
          emailSent: emailResult.success,
          csrfToken: req.csrfToken()
      });
      } catch (error) {
          console.error('Booking submission error:', error);
          res.status(500).json({
              success: false,
              message: 'Failed to process booking',
              csrfToken: req.csrfToken()
          });
      }
});

// ===== Serve Frontend Static Files in Production =====
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../dist');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Handle 404
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ===== Error Handling =====
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    status: err.status || 500
  });

  // Handle CSRF token errors specifically
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      csrfToken: req.csrfToken() // Provide new token
    });
  }

  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.stack })
  });
});

// ===== Server Startup =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`🔗 Access URL: ${process.env.CLIENT_URL || 'http://localhost:' + PORT}`);
  console.log(`🔐 Admin panel: ${process.env.CLIENT_URL || 'http://localhost:' + PORT}/admin.html`);
  console.log(`📡 API Base URL: ${process.env.CLIENT_URL || 'http://localhost:' + PORT}/api/admin\n`);
});