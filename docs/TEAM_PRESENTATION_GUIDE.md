# LF.things - Team Presentation Guide
**How to Explain This Project to Anyone**

---

## 🎯 What is LF.things?

Think of it as a "Lost & Found system with superpowers" for CTU Daanbantayan campus.

**The Problem**: Students lose things all the time. When someone finds an item, there's no easy way to return it to the owner.

**Our Solution**: 
1. Students put QR code stickers on their belongings
2. If someone finds a lost item, they scan the QR code or report it in the app
3. AI matches lost items with found items automatically
4. Owner and finder can chat to arrange the return

---

## 🛠️ Technologies Used (Simplified)

### 1. React Native + Expo
**What it is**: A framework for building mobile apps

**Why we chose it**: 
- Write code once, works on iPhone, Android, and Web
- Faster development than building separate apps
- Large community and lots of ready-made components

**Real-world comparison**: Like using WordPress instead of coding a website from scratch

---

### 2. Supabase (Backend)
**What it is**: A "backend-as-a-service" - basically a ready-made server with database

**Why we chose it**:
- No need to build our own server
- Built-in user authentication (login/signup)
- Real-time updates (like when you get a new message)
- File storage for photos

**Real-world comparison**: Like using Gmail instead of running your own email server

**What it gives us**:
- PostgreSQL database (stores all our data)
- Authentication system (handles passwords securely)
- Storage (for item photos)
- Real-time subscriptions (instant notifications)

---

### 3. Google Gemini AI
**What it is**: Google's artificial intelligence that can understand and compare text

**Why we chose it**:
- Smart matching between lost and found items
- Understands descriptions even if worded differently
- Free tier is generous for our use case

**How it works**:
```
Found Item: "Blue Nike backpack with laptop inside"
Lost Items in database:
  1. "Navy blue bag, Nike brand"
  2. "Red Adidas backpack"
  3. "Black laptop bag"

AI says: Item #1 is 85% match! (blue ≈ navy, Nike = Nike, bag = backpack)
```

---

### 4. NativeWind (Styling)
**What it is**: A way to style our app using simple class names

**Why we chose it**:
- Faster than writing custom CSS
- Consistent design across all screens
- Easy to make responsive layouts

**Example**:
```javascript
// Instead of writing complex styles:
<View style={{ backgroundColor: '#F5C842', padding: 16, borderRadius: 8 }}>

// We write:
<View className="bg-gold p-4 rounded-lg">
```

---

### 5. Expo Camera & QR Codes
**What it is**: Built-in camera access and QR code generation

**Why we chose it**:
- No need to build QR scanner from scratch
- Works on all platforms
- Reliable and well-tested

**How it works**:
1. User registers item → System generates unique QR code
2. User prints QR sticker → Puts on item
3. Someone finds item → Scans QR code
4. App shows owner's contact info

---

## 📱 Main Features (Explained Simply)

### Feature 1: Register Your Items
**What**: Put your belongings in the app and get a QR code sticker

**How it works**:
1. Take a photo of your item
2. Fill in details (name, color, brand)
3. App generates a unique QR code
4. Print and stick on your item

**Why it's useful**: If someone finds your item, they can scan the QR code and contact you immediately

---

### Feature 2: Report Found Items
**What**: Found something? Report it in the app

**How it works**:
1. Take a photo of the found item
2. Describe it (color, category, where you found it)
3. Submit the report
4. AI automatically searches for matching lost items
5. If there's a match, the owner gets notified

**Why it's useful**: Even items without QR codes can be returned to owners

---

### Feature 3: AI Matching
**What**: Smart system that matches found items with lost items

**How it works**:
```
Step 1: Someone reports a found item
Step 2: AI compares it with all lost items in database
Step 3: AI gives each potential match a score (0-100)
Step 4: High-scoring matches (70+) notify the owner
Step 5: Owner reviews and confirms if it's their item
```

**Example**:
```
Found: "Black iPhone 13 with cracked screen"
Lost: "Dark phone, Apple brand, screen damaged"
AI Match Score: 88% ✓
```

---

### Feature 4: In-App Chat
**What**: Direct messaging between finder and owner

**How it works**:
1. Owner confirms a match
2. Chat thread is created automatically
3. Both parties can message each other
4. Coordinate where/when to return the item

**Why it's useful**: No need to share personal phone numbers or social media

---

### Feature 5: Admin Dashboard
**What**: Control panel for SSG officers to manage the system

**Features**:
- View all users and items
- Manage student master list (who can register)
- Track physical items in SSG office (custody log)
- View audit logs (who did what, when)
- Generate reports

**Why it's useful**: Accountability and oversight for the system

---

## 🔄 Complete Workflows

### Workflow 1: Happy Path (Item with QR Code)

```
1. REGISTRATION PHASE
   Student → Opens app
   Student → Registers water bottle
   System → Generates QR code
   Student → Prints sticker, puts on bottle

2. LOSS PHASE
   Student → Loses bottle in cafeteria
   Student → Marks item as "lost" in app

3. FOUND PHASE
   Finder → Finds bottle with QR sticker
   Finder → Scans QR code with app
   System → Shows owner's name and contact option

4. RETURN PHASE
   Finder → Clicks "Contact Owner"
   System → Creates chat thread
   Finder & Owner → Arrange meetup
   Owner → Gets bottle back!
   Owner → Marks item as "found" in app
```

---

### Workflow 2: Item Without QR Code (AI Matching)

```
1. LOSS PHASE
   Student → Loses blue Nike backpack
   Student → Reports as lost in app
   Student → Adds photos and description

2. FOUND PHASE
   Finder → Finds blue backpack in library
   Finder → Reports found item in app
   Finder → Uploads photo and description

3. AI MATCHING PHASE
   System → AI compares found item with all lost items
   System → Finds 85% match with student's backpack
   System → Sends notification to student

4. REVIEW PHASE
   Student → Gets notification
   Student → Views found item photos
   Student → Confirms "Yes, this is mine!"
   System → Creates chat thread

5. RETURN PHASE
   Student & Finder → Chat to arrange meetup
   Student → Gets backpack back!
```

---

### Workflow 3: SSG Office Custody

```
1. ITEM TURNED IN
   Finder → Brings item to SSG office
   SSG Officer → Logs item in custody system
   SSG Officer → Assigns shelf location (e.g., "A-12")
   SSG Officer → Takes photo for records

2. OWNER CLAIMS
   Owner → Comes to SSG office
   SSG Officer → Verifies identity
   SSG Officer → Logs "claimed" in system
   SSG Officer → Gives item to owner

3. UNCLAIMED ITEMS
   System → Marks items unclaimed after 30 days
   SSG Officer → Decides disposal method
   SSG Officer → Logs disposal in system
```

---

## 🗄️ Database Structure (Simplified)

Think of the database as a filing cabinet with different drawers:

### Drawer 1: Students
**What's stored**: Master list of all enrolled students
**Why**: Only enrolled students can create accounts
**Key info**: Student ID, Name, Email, Program, Year Level

### Drawer 2: Profiles
**What's stored**: User profile information
**Why**: Display names, avatars, bios for the app
**Key info**: Display name, Avatar, Bio

### Drawer 3: Items
**What's stored**: All registered items
**Why**: Track what belongs to whom
**Key info**: Item name, Photos, QR code, Status (safe/lost/found)

### Drawer 4: Found Items
**What's stored**: Items people have reported finding
**Why**: Match with lost items
**Key info**: Description, Photos, Location found, Date found

### Drawer 5: AI Matches
**What's stored**: Connections between lost and found items
**Why**: Track which items might belong together
**Key info**: Lost item ID, Found item ID, Match score, Status

### Drawer 6: Chat Messages
**What's stored**: Conversations between users
**Why**: Coordinate item returns
**Key info**: Sender, Message, Timestamp

### Drawer 7: Notifications
**What's stored**: Alerts for users
**Why**: Notify about matches, messages, etc.
**Key info**: User, Message, Read status

### Drawer 8: Audit Log
**What's stored**: Record of all admin actions
**Why**: Accountability and security
**Key info**: Who did what, when, and why

---

## 🔐 Security Features

### 1. Student ID Verification
**What**: Only enrolled students can create accounts
**How**: Student ID must exist in pre-loaded master list
**Why**: Prevents random people from using the system

### 2. Row Level Security (RLS)
**What**: Database rules that control who can see what
**Examples**:
- Users can only see their own items
- Users can only edit their own profile
- Admins can see everything

### 3. Audit Logging
**What**: Every admin action is recorded
**Tracked**: Who, What, When, Why
**Purpose**: Accountability and investigation if needed

### 4. No Personal Info Exposure
**What**: Phone numbers and addresses are never shown
**How**: All communication through in-app chat
**Why**: Privacy and safety

---

## 📊 Key Statistics & Metrics

### What We Track:

1. **User Metrics**
   - Total registered users
   - Active users (logged in last 30 days)
   - New signups per week

2. **Item Metrics**
   - Total registered items
   - Items currently lost
   - Items successfully returned
   - Recovery rate (%)

3. **Matching Metrics**
   - AI matches created
   - Matches confirmed by owners
   - Match accuracy rate
   - Average match score

4. **Engagement Metrics**
   - QR scans per day
   - Found item reports per week
   - Chat messages sent
   - Average response time

---

## 🎨 Design Philosophy

### Color Scheme
- **Gold (#F5C842)**: Primary color, represents value and importance
- **Cream (#F5F0E8)**: Background, warm and welcoming
- **Dark (#1A1611)**: Text, high contrast for readability
- **Red (#E53935)**: Alerts and lost items
- **Green (#10b981)**: Success and found items

### User Experience Principles
1. **Simple**: No complicated menus or hidden features
2. **Fast**: Most actions take 2-3 taps
3. **Clear**: Always know what's happening
4. **Helpful**: Guidance and tips throughout
5. **Accessible**: Works for everyone, including those with disabilities

---

## 🚀 Future Enhancements (Roadmap)

### Phase 1: Current (MVP)
- ✅ Item registration with QR codes
- ✅ Found item reporting
- ✅ AI matching
- ✅ In-app chat
- ✅ Admin dashboard

### Phase 2: Near Future
- 📍 Map view of where items were found
- 🔔 Push notifications (currently in-app only)
- 📊 Analytics dashboard for admins
- 🏆 Gamification (badges for helpful finders)

### Phase 3: Long Term
- 🤖 Image recognition (AI identifies items from photos)
- 🌐 Multi-campus support
- 📱 SMS notifications for non-app users
- 🔗 Integration with student ID system

---

## 💡 Common Questions & Answers

### Q: What if someone doesn't have the app?
**A**: They can still scan QR codes! The QR code links to a web page that works in any browser.

### Q: What if the item doesn't have a QR code?
**A**: That's where AI matching comes in. Report the found item, and the AI will search for matching lost items.

### Q: How accurate is the AI matching?
**A**: In testing, it's about 85% accurate for clear descriptions. It gets better as more people use it.

### Q: What if someone falsely claims an item?
**A**: The owner must confirm the match and verify details through chat. SSG office can also verify identity for high-value items.

### Q: Is my data safe?
**A**: Yes! We use industry-standard encryption, and personal info is never shared publicly. All data is stored securely on Supabase servers.

### Q: Can I use this for expensive items like laptops?
**A**: Yes, but we recommend also reporting to campus security. The app is a tool to help, not a guarantee.

### Q: What happens to unclaimed items?
**A**: After 30 days in SSG custody, items are disposed of according to campus policy (donated, recycled, or discarded).

---

## 🎤 Presentation Tips

### For Technical Audience (Developers, IT)
- Focus on: Architecture, tech stack, API integrations
- Show: Code snippets, database schema, API flows
- Emphasize: Scalability, security, performance

### For Non-Technical Audience (Students, Faculty)
- Focus on: User benefits, ease of use, success stories
- Show: App demo, user flows, before/after scenarios
- Emphasize: Convenience, community, responsibility

### For Administrators (SSG, Campus Officials)
- Focus on: Oversight, accountability, reporting
- Show: Admin dashboard, audit logs, statistics
- Emphasize: Control, transparency, efficiency

---

## 📝 Demo Script

### 1. Opening (30 seconds)
"Hi everyone! Today we're presenting LF.things, a smart lost and found system for our campus. Have you ever lost something valuable and wished there was an easier way to get it back? That's exactly what we built."

### 2. Problem Statement (1 minute)
"Every semester, hundreds of items are lost on campus. Some are turned in to the SSG office, but most are never reunited with their owners. Why? Because there's no easy way to identify who owns what."

### 3. Solution Overview (1 minute)
"LF.things solves this with three key features:
1. QR code stickers for your belongings
2. AI-powered matching for items without codes
3. In-app chat to coordinate returns"

### 4. Live Demo (5 minutes)
- Register an item and show QR code
- Scan the QR code
- Report a found item
- Show AI matching in action
- Demonstrate chat feature

### 5. Technical Deep Dive (3 minutes)
- Show architecture diagram
- Explain tech stack choices
- Highlight security features

### 6. Impact & Future (2 minutes)
- Share statistics (if available)
- Discuss scalability
- Present roadmap

### 7. Q&A (5 minutes)
- Be ready for common questions
- Have backup slides for technical details

---

## 🎯 Key Talking Points

### Why This Matters
- **Community**: Encourages helping each other
- **Responsibility**: Students take better care of belongings
- **Efficiency**: Saves time for SSG office
- **Innovation**: Brings modern tech to campus life

### What Makes It Unique
- **AI Matching**: Not just a database, but intelligent matching
- **QR Integration**: Physical and digital connection
- **Campus-Specific**: Built for CTU Daanbantayan's needs
- **Open Source**: Can be adapted by other schools

### Success Metrics
- **Adoption Rate**: % of students using the app
- **Recovery Rate**: % of lost items returned
- **User Satisfaction**: Ratings and feedback
- **Time Saved**: For SSG office and students

---

## 📚 Additional Resources

### For Team Members
- **CODE_DOCUMENTATION.md**: Detailed code explanations
- **COMPREHENSIVE_GUIDE.md**: Feature workflows
- **PRESENTATION_DEFENSE.md**: Defense preparation

### For Users
- **User Guide**: (To be created) Step-by-step instructions
- **FAQ**: Common questions and answers
- **Video Tutorials**: (To be created) Screen recordings

### For Developers
- **API Documentation**: (To be created) Supabase endpoints
- **Setup Guide**: How to run locally
- **Contributing Guide**: How to add features

---

**Remember**: The goal is to make complex technology understandable. Use analogies, show real examples, and always connect back to the user benefit!

**Last Updated**: April 18, 2026
