## server/.env
```
MONGODB_URI=your_mongodb_atlas_connection_string
SENDGRID_API_KEY=your_sendgrid_api_key
PORT=3000
```
Get MONGODB_URI from MongoDB Atlas after creating a cluster.
Get SENDGRID_API_KEY from SendGrid’s dashboard.


## Deployment
### Test Locally:
1. Run the server: cd server && node index.js.
2. Open http://localhost:3000 to test the website.
3. Test the booking form, contact form, gallery filters, and calendar.
4. Access http://localhost:3000/admin to view bookings (add basic password protection later).

### Deploy to GoDaddy:
1. Upload the public/ folder to GoDaddy’s hosting file manager (or use FTP).
2. Deploy the Node.js app by following GoDaddy’s Node.js hosting guide (zip the server/ folder and upload via cPanel).
3. Set up the domain in GoDaddy’s DNS settings to point to your hosting.

### Test Live Site:
1. Verify the domain (e.g., amanphotography.com) loads the site.
2. Test form submissions, email notifications, and admin approvals.


## Next Steps for You
### Provide Content:
1. Upload 12 portfolio images to public/images/ (2 per category: Weddings, Portraits, Events, Birthdays, Graduations, Others).
2. Update bios, contact info, and social media links in about.html.
3. Replace placeholder pricing in book-now.html if needed.

### Set Up Services:
1. Sign up for MongoDB Atlas, SendGrid, and GoDaddy (domain + hosting).
2. Update server/.env with your MongoDB URI and SendGrid API key.
3. Verify your email in SendGrid for sending emails.
    (Sign up for email service (SendGrid free tier for confirmation emails))


### Test and Customize:
1. Test the website locally (node server/index.js).
2. Customize colors in styles.css (e.g., change #ffd700 for gold accents to another color if desired).
3. Add a hero background image to public/images/hero-bg.jpg.

### Deploy:
1. Follow GoDaddy’s instructions to deploy the Node.js app and static files. 
    (Purchase a domain name via GoDaddy (e.g., amanphotography.com, ~$12/year))
2. Test the live site and admin dashboard.


=======================================
NOTE ==> MongoDB Instllation and setup
=======================================
1. MongoDB Installation (MacOS)
Step 1: Install Homebrew (if you don't have it)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Step 2: Install MongoDB
```bash
brew tap mongodb/brew
brew install mongodb-community
```

Step 3: Start MongoDB
```bash
brew services start mongodb-community
```

Step 4: Verify Installation
```bash
mongosh --eval "db.runCommand({ping:1})"
```
You should see: { ok: 1 }

2. Database Setup
Step 1: Create your database
```bash
mongosh "mongodb://localhost:27017" --eval '
  use amiphotography;
  db.createCollection("admins");
  db.createCollection("bookings");
  db.createCollection("contacts");'
```

Step 2: Create an admin user (run this in terminal)
First, generate a password hash at: https://bcrypt-generator.com/ (use cost 12)
[+] Bcrypt Hash Generator - https://bcrypt-generator.com/
```bash
mongosh "mongodb://localhost:27017/amiphotography" --eval '
  db.admins.insertOne({
    username: "admin",
    password: "$2a$12$u16iniumk1pURdCQBZRxc.ADNhFDU861ANZU9nD2jcAo2lPc2eYuW", 
    role: "superadmin",
    createdAt: new Date(),
    lastLogin: null
  })'
```

3. Backend Setup
Step 1: Create .env file
In your server folder, create .env with:
```bash
MONGODB_URI=mongodb://localhost:27017/amiphotography
JWT_SECRET=your_random_secret_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_plaintext_password
```