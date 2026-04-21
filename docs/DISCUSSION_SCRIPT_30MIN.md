# LF.things - 30-Minute Discussion Script (7 Team Members)

**Total Time:** 30 minutes  
**Team Members:** 7  
**Time per member:** ~4 minutes each  
**Format:** Structured presentation with live demo

---

## 🕐 Time Allocation Breakdown

| Time | Segment | Duration | Presenter |
|------|---------|----------|-----------|
| 0:00-2:00 | Introduction & Problem Statement | 2 min | Member 1 |
| 2:00-6:00 | What the App is About | 4 min | Member 2 |
| 6:00-10:00 | Technologies Used (AI with Groq) | 4 min | Member 3 |
| 10:00-14:00 | Two Interfaces & Ecosystem | 4 min | Member 4 |
| 14:00-18:00 | Project Structure & Architecture | 4 min | Member 7 |
| 18:00-22:00 | Flowcharts & Important Features | 4 min | Member 5 |
| 22:00-26:00 | Live Demonstration | 4 min | Member 6 |
| 26:00-30:00 | Q&A & Closing | 4 min | All |

---

## 🎤 Detailed Script

### **0:00-2:00 - Introduction & Problem Statement** (Member 1)

**Opening Statement:**
"Good day everyone! We're team LF.things, and today we're presenting a smart solution to a common campus problem. Quick question - how many of you have ever lost something valuable on campus?" 

[Pause for hands]

"And how many actually got it back?"

[Pause - expect fewer hands]

"Exactly. That's the problem we're solving today."

**Problem Statement:**
"Every semester, hundreds of items are lost at CTU Daanbantayan. The SSG office becomes a graveyard of unclaimed belongings. The current system relies on people remembering to check physical bulletin boards or visit the office. Our research shows that less than 20% of lost items are ever reunited with their owners."

**The Core Issue:**
"There's no efficient way to connect finders with owners. If you find something, you have no idea who it belongs to. If you lose something, you have no way to know if someone found it."

**Transition:**
"Let me hand it over to [Member 2] who will show you our solution."

---

### **2:00-6:00 - What the App is About** (Member 2)

**The Solution Overview:**
"LF.things is a mobile app that transforms how lost and found works on campus. Think of it as a digital bridge between lost items and their owners."

**Three Core Functions:**

1. **QR Code Registration:**
   "Students can register their belongings in the app. Each item gets a unique QR code sticker that they can print and attach to their items."

2. **Smart Reporting:**
   "If someone finds an item, they can either scan the QR code or report it in the app with photos and description."

3. **AI-Powered Matching:**
   "Our system uses artificial intelligence to automatically match found items with lost items, even without QR codes."

**Key Benefits:**
- **For Students:** Higher chance of getting lost items back
- **For Finders:** Easy way to do the right thing
- **For SSG:** Reduced workload and better tracking
- **For Campus:** Builds a more responsible community

**Visual Aid:** Show app icon and main screens
**Transition:** "Now let's dive into the technology behind this, explained by [Member 3]."

---

### **6:00-10:00 - Technologies Used (AI with Groq)** (Member 3)

**Tech Stack Overview:**
"We built LF.things using modern, scalable technologies that work together seamlessly."

**Frontend: React Native + Expo**
- Write once, run on iOS, Android, and Web
- Fast development with ready-made components
- Perfect for student developers learning mobile development

**Backend: Supabase**
- Complete backend-as-a-service
- Handles authentication, database, storage, and real-time updates
- Security built-in with Row Level Security

**The AI Magic: Groq API with Llama 3**
"This is where our innovation shines. We use Groq's API running the Llama 3 model to intelligently match lost and found items."

**How AI Matching Works:**
1. When a found item is reported, the system gathers all lost items
2. AI analyzes multiple factors: category, location, timing, brand, color, model, and description
3. Uses semantic understanding (not just keyword matching)
4. Generates match scores from 0.0 to 1.0 (0-100%)
5. Only shows matches with 50% confidence or higher
6. Notifies owners of high-probability matches

**Example:**
```
Found: "Blue Nike backpack, found in cafeteria"
Lost: "Navy blue bag, Nike brand, last seen in library"
AI Score: 78% match ✓
Reasoning: Same category, similar location, matching brand and color
```

**Smart Fallback System:**
"If the AI service is unavailable, our system automatically switches to a rule-based matching algorithm, ensuring the app always works."

**Why Groq?**
- Lightning-fast inference speeds (faster than traditional cloud AI)
- Generous free tier perfect for educational projects
- Excellent text understanding with Llama 3 model
- Easy integration with React Native via standard fetch API

**Transition:** "With the tech foundation set, let's look at the user experience with [Member 4]."

---

### **10:00-14:00 - Two Interfaces & Ecosystem** (Member 4)

**Dual Interface Design:**
"LF.things has two distinct interfaces serving different needs in our campus ecosystem."

**1. Student Interface (Mobile App)**
**Purpose:** Everyday use by students
**Key Screens:**
- Home Dashboard: Quick stats and actions
- Register Items: Add belongings with QR codes
- Report Found: Submit found items
- My Items: Track your registered items
- Notifications: Alerts for matches and messages
- Chat: Communicate with finders/owners

**Workflow for Students:**
```
Register → Get QR → Attach to item → If lost → Mark as lost → Wait for match → Chat → Get item back
```

**2. Admin Interface (Web Dashboard)**
**Purpose:** Management by SSG officers
**Key Modules:**
- User Management: View all registered students
- Student Master List: Manage enrolled students
- Items Overview: See all items in system
- Custody Log: Track physical items in office
- Audit Trail: Record of all admin actions
- Reports: Generate statistics and insights

**Workflow for Admins:**
```
Item turned in → Log in custody system → Assign shelf → Notify owner → Verify claim → Record return
```

**The Complete Ecosystem:**
"Here's how everything works together in our campus ecosystem:"

```
Student loses item 
    ↓
Finder reports it (with or without QR scan)
    ↓
AI automatically matches with lost items
    ↓
Owner gets notified
    ↓
They chat to coordinate
    ↓
SSG office can track physical custody if needed
    ↓
Item successfully returned!
```

"Every step is tracked, secure, and designed to make returning lost items as easy as possible."

**Visual Aid:** Show ecosystem diagram or animated flow
**Transition:** "Now let's look at how we organized the codebase with [Member 7]."

---

### **14:00-18:00 - Project Structure & Architecture** (Member 7)

**Code Organization Overview:**

"Now let me walk you through how we organized this project to make it maintainable and scalable."

**1. Main Folders** (1 minute)

**Visual Aid:** Show folder tree diagram

"Our project is organized into four main areas:

- **app/** - All the screens users see (home, register, chat, admin panel)
- **lib/** - The brain of our app (AI matching, database connections, utilities)
- **components/** - Reusable UI pieces
- **docs/** - All our documentation and flowcharts"

**2. App Folder Structure** (1.5 minutes)

"The app folder uses Expo Router's file-based routing - meaning the folder structure IS the navigation:

- **(tabs)/** - The 5 main tabs: Home, Register, My Items, Notifications, Profile
- **admin/** - Complete admin panel with 7 different management screens
- **chat/[thread_id].js** - Dynamic chat conversations
- **found/[id]/** - Found item details and match review
- **scan/[token].js** - QR code scan results"

**Visual Aid:** Show app folder tree with color coding

**3. Core Business Logic** (1 minute)

"The lib folder contains our core functionality:

- **supabase.js** - Database connection for regular users
- **supabaseAdmin.js** - Admin database connection with elevated permissions
- **aiMatching.js** - The AI matching algorithm using Groq's Llama 3 model with rule-based fallback
- **auditLog.js** - Tracks all admin actions for accountability
- **categoryForms.js** - Dynamic form fields based on item type
- **ctuConstants.js** - CTU-specific constants like programs and student ID validation"

**4. Why This Structure Matters** (0.5 minutes)

"This organization gives us:
1. **Separation of concerns** - UI separate from business logic
2. **Easy navigation** - File structure matches app navigation
3. **Maintainability** - Easy to find and update code
4. **Scalability** - Simple to add new features without breaking existing ones"

**Key Takeaways:**
1. Clean folder structure = easier development
2. File-based routing makes navigation intuitive
3. Separation of UI and logic improves code quality
4. Well-documented and organized for future developers

**Transition:** "Now let's visualize these workflows with [Member 5]."

---

### **18:00-22:00 - Flowcharts & Important Features** (Member 5)

**Key Flowcharts to Show:**

1. **Simplified Overall Workflow** (2 minutes)
```
[Show flowchart: 00-simplified-workflow.dot]
Student → Register Item → QR Code → If Lost → Finder Scans/Reports → AI Matches → Chat → Return
```

**Important Features Highlight:**

**Feature 1: QR Code System**
- Unique QR for each item
- Web fallback for non-app users
- Instant owner contact when scanned

**Feature 2: AI Matching Engine**
- Analyzes multiple factors: category, location, timing, brand, color, model
- Semantic understanding of descriptions (understands "navy" matches "blue")
- Confidence scoring system (0-100%)
- Automatic notifications to potential owners
- Smart fallback: If AI is down, rule-based matching takes over

**Feature 3: In-App Chat**
- Secure messaging without sharing personal info
- Real-time updates
- Coordinated meetup planning

**Feature 4: Admin Oversight**
- Complete audit trail
- Physical custody tracking
- Student verification system

**Feature 5: Security & Privacy**
- Row Level Security in database
- No personal contact info exposed
- All communication through app

**Visual Aid:** Display key flowcharts on screen
**Transition:** "Now for the moment you've been waiting for - a live demo with [Member 6]."

---

### **22:00-26:00 - Live Demonstration** (Member 6)

**Demo Setup:**
"Let me show you how this works in real-time. I have the app installed on my phone, and we'll go through a complete user journey - from registration to successful match."

**Step 1: Registering an Item** (1 minute)
- Open app and show home dashboard
- Tap "Register Item" button
- Select category: "Accessories"
- Take photo of sample item (water bottle or ID case)
- Fill in details: 
  - Name: "Blue Hydro Flask water bottle"
  - Color: "Blue"
  - Brand: "Hydro Flask"
- Tap "Generate QR Code"
- Show generated QR code on screen
- "Students can print this and stick it on their item"

**Step 2: Reporting as Lost** (30 seconds)
- Navigate to "My Items" tab
- Find the water bottle in the list
- Tap the three dots menu
- Select "Mark as Lost"
- Add last seen location: "Cafeteria"
- Confirm status change
- "Now this item is in the lost items database"

**Step 3: Finding & Reporting** (1 minute)
- "Now let's switch perspectives - someone finds this item"
- Switch to different account (or explain the process)
- Tap "I Found Something" on home screen
- Select category: "Accessories"
- Take photo of the same item
- Describe: "Blue metal water bottle found in cafeteria"
- Add location: "Cafeteria, Table 5"
- Submit report
- "The moment I submit, the AI starts working"

**Step 4: AI Matching** (1 minute)
- Show notification appearing on owner's phone
- "The AI analyzed the found item and matched it with the lost item"
- Open notification to see match details
- Show match score: "78% confidence"
- Show AI reasoning: "Same category, matching location, similar description"
- Display side-by-side comparison of photos

**Step 5: Chat & Coordination** (30 seconds)
- Owner taps "Yes, this is mine!"
- Chat thread automatically opens
- Send test message: "Hi! Thanks for finding my bottle. Can we meet at the library?"
- Show real-time message delivery
- "And just like that, they can coordinate the return"

**Demo Summary:**
"In under 4 minutes, we've shown the complete journey - from registration to match to coordination. In real life, this could save someone's semester notes, their ID, or even their laptop!"

**Backup Plan:**
[If live demo fails, have screenshots ready or pre-recorded video]

**Transition:** "Now let's open the floor for your questions."

---

### **26:00-30:00 - Q&A & Closing** (All Members)

**Anticipated Questions & Prepared Answers:**

**Q: What if someone doesn't have a smartphone?**
**A:** The QR codes link to a web page that works in any browser. Also, they can ask friends with the app to help report found items.

**Q: How accurate is the AI matching?**
**A:** The AI considers multiple factors - category, location, timing, brand, color, and descriptions. It only suggests matches with 50% confidence or higher. In testing, high-confidence matches (70%+) are typically accurate. The system also has a rule-based fallback if AI is unavailable.

**Q: What about privacy and security?**
**A:** We use Row Level Security in the database. Personal contact info is never exposed - all communication happens through the in-app chat.

**Q: How do you prevent false claims?**
**A:** Owners must confirm matches through detailed verification in chat. For high-value items, SSG office provides additional identity verification.

**Q: What's the cost to students?**
**A:** The app is completely free for students. QR stickers can be printed at the computer lab for minimal cost.

**Q: How do you handle unclaimed items?**
**A:** After 30 days in SSG custody, items are disposed of according to campus policy - typically donated, recycled, or discarded.

**Q: Can this work for other campuses?**
**A:** Absolutely! The system is designed to be campus-agnostic. Other schools could deploy it with their own student databases.

**Closing Statement:** (Member 1)
"Thank you for your time and questions. LF.things represents how technology can solve real campus problems while building a more connected community. We believe this system could significantly improve lost item recovery rates and make our campus a better place for everyone."

**Final Visual:** Show app download QR code and contact information
**End Time:** 30:00

---

## 🎯 Preparation Checklist

### **One Week Before:**
- [ ] All members review script and timing
- [ ] Assign presentation segments clearly
- [ ] Prepare visual aids (slides, flowcharts, diagrams)
- [ ] Test live demo on actual devices (have 2 phones ready)
- [ ] Record backup demo video (in case live demo fails)
- [ ] Practice timing with stopwatch - aim for 26 minutes to leave buffer
- [ ] Prepare printed handouts with QR code to app/documentation
- [ ] Create engagement questions for audience

### **Three Days Before:**
- [ ] Full dress rehearsal with all members
- [ ] Time each segment precisely
- [ ] Practice transitions between speakers
- [ ] Test all technology (projector, phones, internet)
- [ ] Prepare answers to anticipated questions
- [ ] Create backup slides for technical failures

### **Day Before:**
- [ ] Final run-through with all members
- [ ] Check all devices are charged (bring chargers!)
- [ ] Test projector and audio in actual venue if possible
- [ ] Prepare backup plans (screenshots, videos, slides)
- [ ] Print handouts and QR codes
- [ ] Confirm all team members know their parts

### **One Hour Before:**
- [ ] Arrive early to setup (at least 30 minutes)
- [ ] Test all technology in the venue
- [ ] Connect phones to projector/screen
- [ ] Test internet connectivity
- [ ] Distribute speaking notes to team members
- [ ] Do a quick sound check
- [ ] Final team huddle and encouragement
- [ ] Deep breaths and positive mindset!

### **During Presentation:**
- [ ] Speak clearly and at moderate pace
- [ ] Make eye contact with audience
- [ ] Use hand gestures naturally
- [ ] Smile and show enthusiasm
- [ ] Watch the time (have timekeeper)
- [ ] Support team members during their segments
- [ ] Be ready to help if someone forgets their part

---

## 📊 Success Metrics for Discussion

1. **Engagement:** Audience asks at least 3 questions
2. **Clarity:** No segment runs over time
3. **Demo Success:** Live demo works smoothly
4. **Team Coordination:** Smooth transitions between speakers
5. **Message Delivery:** Core value proposition is clear

---

## 🆘 Troubleshooting Guide

### **If Live Demo Fails:**
- **Plan A:** Switch to pre-recorded video immediately
- **Plan B:** Use screenshots to walk through the process
- **Plan C:** Focus on explaining the workflow with diagrams
- **Stay calm:** Say "Let me show you our backup demo" confidently
- **Don't apologize excessively:** Technology issues happen, move forward

### **If Time Runs Short:**
- **Priority 1:** Complete the live demo (most impressive part)
- **Priority 2:** Keep Q&A session (shows you can think on your feet)
- **Can skip:** Detailed code structure explanation
- **Can condense:** Flowcharts section (show 1-2 key ones only)
- **Speed up:** Speak slightly faster but stay clear

### **If Time Runs Long:**
- **Slow down:** You're probably rushing, take a breath
- **Cut content:** Skip some flowcharts or technical details
- **Signal to team:** Have a subtle hand signal to speed up
- **Watch timekeeper:** Designate someone to give time warnings

### **If Technical Issues:**
- **No WiFi:** Use phone hotspot (test beforehand)
- **Projector fails:** Gather audience around laptop/phone
- **Phone dies:** Have backup phone with app installed
- **App crashes:** Restart app, use backup demo if needed
- **Can't login:** Have test accounts ready with credentials written down

### **If Audience is Quiet:**
- **Ask direct questions:** "How many of you have lost something this semester?"
- **Use polling:** "Raise your hand if you'd use this app"
- **Share stories:** "During testing, a student found their lost ID after 2 weeks"
- **Team questions:** Have team members ask prepared questions to break ice
- **Show enthusiasm:** Your energy will encourage audience participation

### **If Someone Forgets Their Part:**
- **Jump in smoothly:** Another member continues the thought
- **Use notes:** It's okay to glance at notes briefly
- **Stay supportive:** Team members can prompt with key words
- **Keep moving:** Don't dwell on mistakes, audience won't notice small slips

### **If Asked Difficult Questions:**
- **Be honest:** "That's a great question. We haven't implemented that yet, but it's on our roadmap"
- **Redirect:** "That's more of a [Member X]'s area, let me pass it to them"
- **Defer:** "That's an excellent point for future development"
- **Don't fake it:** Better to admit you don't know than give wrong information

---

**Remember:** The goal is to show how LF.things solves a real problem with smart technology. Focus on benefits, keep it engaging, and demonstrate value!

Good luck team! 🚀


---

## 🎤 Presentation Delivery Tips

### **For All Presenters:**

**Voice & Speech:**
- Speak at 120-150 words per minute (moderate pace)
- Project your voice - speak to the back of the room
- Pause after important points (let them sink in)
- Vary your tone - don't be monotone
- Avoid filler words: "um," "uh," "like," "you know"

**Body Language:**
- Stand up straight with confidence
- Make eye contact with different audience members
- Use natural hand gestures to emphasize points
- Don't hide behind podium or laptop
- Smile genuinely - show you're excited about your project
- Move purposefully, don't pace nervously

**Engagement:**
- Ask rhetorical questions to keep audience thinking
- Use "you" and "your" to make it personal
- Tell brief stories or examples
- Show genuine enthusiasm for your work
- React to audience feedback (nods, smiles)

**Transitions:**
- Clearly signal when passing to next speaker
- Use their name: "Now [Name] will show you..."
- Brief handoff, don't overlap
- Next speaker should acknowledge: "Thanks [Name]..."

### **For Technical Sections:**
- Don't assume everyone knows technical terms
- Use analogies: "Think of it like..."
- Show visuals, don't just describe
- Focus on "why" not just "what"
- Connect technical features to user benefits

### **For Demo Section:**
- Narrate everything you're doing
- Hold phone/device steady for projection
- Tap deliberately so audience can see
- Point out key UI elements
- If something loads slowly, fill the silence with explanation

### **For Q&A:**
- Listen to full question before answering
- Repeat or rephrase question for whole audience
- Answer concisely, don't ramble
- If you don't know, be honest
- Thank questioner: "Great question!"
- Stay positive even with critical questions

---

## 📊 Enhanced Success Metrics

### **Engagement Indicators:**
1. **Audience asks at least 3-5 questions** (shows interest)
2. **People take photos of slides/demo** (want to remember)
3. **Nods and smiles during presentation** (understanding and approval)
4. **Questions about implementation/adoption** (serious interest)
5. **Requests for app download link** (want to use it)

### **Timing Success:**
1. **No segment runs over allocated time** (well-practiced)
2. **Finish at 26-27 minutes** (leaves buffer for Q&A)
3. **Smooth transitions** (no awkward pauses)
4. **Demo completes in 4 minutes** (efficient)

### **Technical Success:**
1. **Live demo works smoothly** (well-tested)
2. **All visuals display correctly** (technical prep)
3. **Audio is clear** (good projection)
4. **No major technical interruptions** (backup plans work)

### **Team Coordination:**
1. **All members speak clearly** (practiced)
2. **Smooth handoffs between speakers** (rehearsed)
3. **Team supports each other** (collaborative)
4. **Everyone contributes to Q&A** (prepared)

### **Message Delivery:**
1. **Core value proposition is clear** (solves real problem)
2. **Technical innovation is highlighted** (AI matching)
3. **Practical benefits are obvious** (easy to use)
4. **Audience understands how it works** (clear explanation)

---

## 💡 Engagement Strategies

### **Opening Hook (First 30 seconds):**
Use one of these attention-grabbers:
- **Statistics:** "Every semester, over 500 items are lost on our campus"
- **Story:** "Last month, a student lost their laptop with their thesis on it..."
- **Question:** "How many of you check the SSG office for lost items?" [Expect few hands]
- **Bold statement:** "What if I told you we could increase lost item recovery by 300%?"

### **During Presentation:**
- **Use "we" and "our"** to include audience: "We've all experienced this..."
- **Ask for shows of hands** to keep audience active
- **Reference current events:** "Just last week in the SSG office..."
- **Use humor appropriately:** Light jokes about common lost items
- **Show empathy:** "We know how stressful losing your ID can be"

### **Visual Engagement:**
- **Use colors strategically:** Red for problems, green for solutions
- **Animate key points:** Builds appear one at a time
- **Show real photos:** Actual app screenshots, not mockups
- **Use icons and diagrams:** Visual learners appreciate this
- **Limit text on slides:** Max 6 lines per slide

### **Closing Strong:**
- **Summarize key benefits** in one sentence
- **Call to action:** "We invite you to try the app"
- **Future vision:** "Imagine a campus where no item is lost forever"
- **Thank audience:** "Thank you for your time and attention"
- **Invite questions:** "We're excited to answer your questions"

---

## 🎬 Script Memorization Tips

### **Don't Memorize Word-for-Word:**
- Memorize key points and flow
- Use bullet points, not full sentences
- Practice explaining concepts in your own words
- Be natural, not robotic

### **Memory Techniques:**
- **Acronym method:** Create acronyms for lists (e.g., SMART for features)
- **Story method:** Link points together in a narrative
- **Visual method:** Associate points with images
- **Practice method:** Rehearse 5-10 times minimum

### **Note Cards:**
- Use 3x5 cards with bullet points only
- One card per major section
- Large, readable font
- Glance briefly, don't read

### **Backup Plan:**
- Have full script printed (just in case)
- Keep it nearby but out of sight
- Only use if absolutely necessary
- Better to glance at notes than freeze up

---

## 🎯 Final Reminders

**The Night Before:**
- Get good sleep (7-8 hours)
- Review key points, don't cram
- Prepare your outfit (professional but comfortable)
- Charge all devices fully
- Pack backup chargers and cables

**The Morning Of:**
- Eat a good breakfast
- Arrive 30 minutes early
- Do vocal warm-ups
- Practice deep breathing
- Positive self-talk: "We've got this!"

**During Presentation:**
- Breathe deeply and slowly
- If you make a mistake, keep going
- Support your team members
- Enjoy the moment - you've worked hard!
- Remember: The audience wants you to succeed

**After Presentation:**
- Thank the audience and evaluators
- Collect feedback
- Celebrate as a team
- Reflect on what went well
- Note improvements for next time

---

**Remember:** You're not just presenting a project - you're showing how technology can make campus life better for everyone. Your passion and preparation will shine through!

Good luck, Team LF.things! 🚀✨
