# LF.things - Project Defense Presentation Guide

**CTU Daanbantayan Campus**  
**Lost & Found Management System**  
**Defense Date:** April 18, 2026

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Presentation Structure](#presentation-structure)
3. [System Architecture Overview](#system-architecture-overview)
4. [Workflow Demonstrations](#workflow-demonstrations)
5. [Roadmap & Timeline](#roadmap--timeline)
6. [Technical Implementation](#technical-implementation)
7. [Q&A Preparation](#qa-preparation)

---

## Executive Summary

### Project Overview

**LF.things** is an AI-powered Lost & Found management system designed specifically for CTU Daanbantayan campus. The application addresses the common problem of lost personal belongings through:

- **QR Code Technology**: Students register items and receive unique QR code stickers
- **AI-Powered Matching**: Intelligent matching between lost and found items using Google Gemini AI
- **Real-time Communication**: In-app messaging between finders and owners
- **Administrative Oversight**: Comprehensive admin panel with custody tracking and audit logging

### Key Achievements

- ✅ **Development Period**: 20 days of active development (7 weeks)
- ✅ **Completion Status**: 73.3% (11/15 planned features)
- ✅ **Technology Stack**: React Native + Expo + Supabase + Google AI
- ✅ **Platform Support**: iOS, Android, and Web
- ✅ **Security**: Row Level Security (RLS), audit logging, student ID verification

### Problem Statement

Students frequently lose personal belongings on campus with no systematic way to:
- Identify owners of found items
- Report and track lost items
- Match found items with their owners
- Maintain accountability for items in custody

### Solution

A comprehensive mobile and web application that:
1. Enables item registration with QR codes
2. Facilitates found item reporting
3. Uses AI to match lost and found items
4. Provides direct communication channels
5. Tracks custody through SSG Office

---

## Presentation Structure

### Recommended Flow (45-60 minutes)

#### 1. Introduction (5 minutes)
- Team introduction
- Project motivation
- Problem statement
- Solution overview

#### 2. System Architecture (10 minutes)
- Technology stack explanation
- System components
- Data flow architecture
- Security implementation

**Visual Aid**: Use `docs/graphviz/00-system-architecture.dot`

#### 3. Core Workflows (15 minutes)
- User journey walkthrough
- Key feature demonstrations
- Workflow diagrams

**Visual Aids**: 
- `docs/graphviz/00-simplified-workflow.dot` (6-stage journey)
- `docs/graphviz/00-general-workflow.dot` (complete workflow)

#### 4. Feature Deep Dive (10 minutes)
- Authentication & registration
- Item registration with QR codes
- AI matching system
- Admin panel capabilities

**Visual Aids**: Individual feature flowcharts (01-14)

#### 5. Development Roadmap (5 minutes)
- Historical timeline
- Current status
- Future enhancements

**Visual Aids**: 
- `docs/graphviz/15-roadmap-timeline.dot`
- `docs/graphviz/16-roadmap-features.dot`
- `docs/graphviz/17-roadmap-milestones.dot`

#### 6. Live Demonstration (10 minutes)
- App walkthrough
- Key features in action
- Admin panel demonstration

#### 7. Q&A (5-10 minutes)
- Address professor's questions
- Technical clarifications
- Future plans discussion

---

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   iOS App    │  │ Android App  │  │   Web App    │ │
│  │ (React Native)│  │(React Native)│  │(React Native)│ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   API LAYER                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Supabase Backend (BaaS)                  │  │
│  │  • Authentication (JWT)                          │  │
│  │  • PostgreSQL Database                           │  │
│  │  • Real-time Subscriptions                       │  │
│  │  • Storage (Photos)                              │  │
│  │  • Row Level Security (RLS)                      │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  AI LAYER                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │      Google Generative AI (Gemini)               │  │
│  │  • Item Description Analysis                     │  │
│  │  • Similarity Scoring                            │  │
│  │  • Match Confidence Calculation                  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React Native 0.83.2 | Cross-platform mobile development |
| **Framework** | Expo 55.0.5 | Development tooling & deployment |
| **Backend** | Supabase | Authentication, database, real-time |
| **Database** | PostgreSQL | Relational data storage |
| **AI** | Google Gemini AI | Intelligent item matching |
| **Styling** | NativeWind + Tailwind | Utility-first CSS |
| **QR Codes** | react-native-qrcode-svg | QR generation & scanning |

### Key Design Decisions

1. **React Native + Expo**: Single codebase for iOS, Android, and Web
2. **Supabase**: Rapid development with built-in auth and real-time capabilities
3. **Google Gemini AI**: Advanced natural language understanding for matching
4. **Row Level Security**: Database-level security policies
5. **Student ID Verification**: Ensures only enrolled students can register

---

## Workflow Demonstrations

### 1. Simplified User Journey (6 Stages)

**Visual**: `docs/graphviz/00-simplified-workflow.dot`

```
Stage 1: AUTHENTICATION
└─> Student verifies identity with Student ID

Stage 2: ITEM REGISTRATION
└─> Register belongings with photos and QR codes

Stage 3: ITEM LOSS
└─> Mark item as lost when it goes missing

Stage 4: FOUND ITEM REPORTING
└─> Someone finds an item and reports it

Stage 5: AI MATCHING
└─> System automatically matches lost and found items

Stage 6: RECOVERY
└─> Owner and finder communicate to return item
```

### 2. Complete System Workflow

**Visual**: `docs/graphviz/00-general-workflow.dot`

This comprehensive flowchart shows all system interactions including:
- User authentication flow
- Item lifecycle (registration → safe → lost → found → recovered)
- AI matching process
- Admin oversight
- Custody tracking

### 3. Feature-Specific Workflows

#### Authentication Flow
**Visual**: `docs/graphviz/01-authentication.dot`

**Key Points**:
- Student ID must exist in master list
- Status must be 'active'
- One account per student
- Profile auto-created from student data

#### Item Registration Flow
**Visual**: `docs/graphviz/02-item-registration.dot`

**Key Points**:
- Category-specific forms
- Photo upload (multiple images)
- Unique QR code generation
- Printable QR stickers

#### QR Scanning Flow
**Visual**: `docs/graphviz/03-qr-scanning.dot`

**Key Points**:
- Camera permission handling
- Token validation
- Owner identification
- Contact options

#### AI Matching Flow
**Visual**: `docs/graphviz/05-ai-matching.dot`

**Key Points**:
- Triggered when found item reported
- Compares against all lost items
- Confidence scoring (0-100)
- Automatic notification to owners
- Threshold: 70+ for match creation

---

## Roadmap & Timeline

### Development Timeline (Completed)

**Visual**: `docs/graphviz/15-roadmap-timeline.dot`

#### Week 1: Planning & Pivot (Feb 23-29, 2026)
- ✅ Initial concept: Event Attendance System
- ✅ Identified fundamental flaw (proxy fraud vulnerability)
- ✅ Team decision to pivot to Lost & Found
- ✅ Feature planning and tech stack selection

#### Week 2: UI Design & Development (Mar 1-7, 2026)
- ✅ UI/UX design (wireframes, color scheme)
- ✅ Frontend development initiated
- ✅ Backend integration with Supabase

#### Week 3: Core Features (Mar 8-14, 2026)
- ✅ Authentication system
- ✅ Item registration
- ✅ Web interface support
- ✅ Admin panel scoped

#### Week 4: Critical Sprint (Mar 15-21, 2026)
- ⚠️ AI matching bug encountered (Day 10)
- ✅ Recovery and containment strategy
- ✅ QR code implementation as alternative

#### Week 5: Testing & Review (Mar 22-31, 2026)
- ✅ Full codebase testing
- ✅ Bug fixes and cleanup
- ✅ Faculty review and feedback

#### Week 6: Stability (Apr 1-10, 2026)
- ✅ Quality assurance pass
- ✅ Admin features completion
- ✅ Audit logging implementation

#### Week 7: AI Refinement (Apr 11-18, 2026)
- ✅ AI model switch (to Groq API → Google Gemini)
- ⏳ AI matching integration (in progress)
- ⏳ Terms & Conditions screen
- ⏳ Final testing

### Feature Roadmap

**Visual**: `docs/graphviz/16-roadmap-features.dot`

Shows feature dependencies and enhancement paths:

```
Completed Features → Enhanced UX → AI Evolution → Analytics → Integration
```

### Milestone Tracking

**Visual**: `docs/graphviz/17-roadmap-milestones.dot`

**Current Status**: 11/15 features completed (73.3%)

| Milestone | Status | Date |
|-----------|--------|------|
| Core Authentication | ✅ Complete | Mar 7, 2026 |
| Item Management | ✅ Complete | Mar 14, 2026 |
| QR System | ✅ Complete | Mar 21, 2026 |
| Admin Panel | ✅ Complete | Apr 1, 2026 |
| Audit Logging | ✅ Complete | Apr 10, 2026 |
| AI Matching | ⏳ In Progress | Apr 18, 2026 |
| Final Testing | ⏳ Ongoing | Apr 18, 2026 |

---

## Technical Implementation

### Database Schema

**Core Tables**:
1. `students` - Master list of enrolled students
2. `profiles` - User profile information
3. `items` - Registered items with QR codes
4. `found_items` - Reported found items
5. `ai_matches` - AI-generated matches
6. `chat_threads` - Conversation threads
7. `chat_messages` - Individual messages
8. `notifications` - User notifications
9. `admins` - Admin users
10. `custody_log` - Physical custody tracking
11. `audit_log` - System audit trail

### Security Implementation

1. **Row Level Security (RLS)**
   - Users can only access their own data
   - Admins have elevated permissions
   - Policies enforced at database level

2. **Authentication**
   - JWT-based authentication via Supabase
   - Student ID verification before registration
   - Secure password hashing

3. **Audit Logging**
   - All admin actions logged
   - User actions tracked
   - IP address and user agent recorded
   - Filterable and exportable logs

### AI Matching Algorithm

**Process**:
1. Found item is reported
2. System fetches all lost items
3. For each lost item:
   - Build comparison prompt
   - Send to Google Gemini AI
   - Parse confidence score
4. Create matches for scores ≥ 70
5. Notify item owners

**Matching Criteria**:
- Category similarity
- Description semantic analysis
- Color matching
- Brand/model comparison
- Location proximity
- Time relevance

---

## Q&A Preparation

### Anticipated Questions

#### 1. "Why did you pivot from the attendance system?"

**Answer**: We identified a fundamental security flaw - a software-only attendance system is vulnerable to proxy fraud where students can mark attendance for absent friends. This would undermine the system's integrity. We pivoted early (Day 3) to avoid investing months in a flawed concept.

#### 2. "How does the AI matching work?"

**Answer**: When a found item is reported, our system uses Google Gemini AI to compare it against all lost items. The AI analyzes descriptions, categories, colors, and brands to generate a confidence score (0-100). Matches with scores ≥70 are automatically created and owners are notified. The AI provides reasoning for each match to help users make informed decisions.

#### 3. "What makes this different from a simple lost & found board?"

**Answer**: 
- **QR Codes**: Instant owner identification when items are found
- **AI Matching**: Automatic matching reduces manual searching
- **Real-time Notifications**: Owners are immediately alerted to potential matches
- **Custody Tracking**: Admin oversight ensures accountability
- **Audit Trail**: Complete history of all actions for transparency

#### 4. "How do you ensure only students can use the system?"

**Answer**: We maintain a master list of enrolled students in the `students` table. During registration, users must provide their Student ID, which is verified against this list. Only active students with valid IDs can create accounts. This prevents unauthorized access and ensures campus-wide accountability.

#### 5. "What about privacy concerns?"

**Answer**: 
- **Row Level Security**: Users can only see their own items and matches
- **Controlled Sharing**: Contact information is only shared after match confirmation
- **Admin Oversight**: Audit logging tracks all admin access to sensitive data
- **Data Minimization**: We only collect necessary information

#### 6. "What were the biggest technical challenges?"

**Answer**: 
1. **AI Matching Bug (Day 10)**: A critical bug in the AI matching feature cascaded across multiple screens. We contained it by isolating the code and pivoting to QR implementation while we resolved it.
2. **AI Model Selection**: Our original AI model proved inadequate. We switched to Google Gemini AI for better performance and accuracy.
3. **Real-time Synchronization**: Ensuring data consistency across multiple users required careful implementation of Supabase real-time subscriptions.

#### 7. "How scalable is this system?"

**Answer**: 
- **Database**: PostgreSQL can handle millions of records
- **Backend**: Supabase auto-scales based on demand
- **Multi-campus Ready**: Architecture supports multiple campuses with minimal changes
- **API-first Design**: Can integrate with external systems via API

#### 8. "What's the recovery rate target?"

**Answer**: We're targeting a 60% recovery rate for reported lost items. Currently, most lost items are never recovered because there's no systematic way to match them with finders. Our AI matching and QR system should significantly improve this rate.

#### 9. "How do you handle items that are never claimed?"

**Answer**: The admin custody log tracks items turned in to the SSG Office. Admins can:
- Record when items are received
- Assign storage locations
- Track claim dates
- Mark items for disposal after a retention period
- Maintain complete audit trail

#### 10. "What are the next steps after this defense?"

**Answer**: 
1. Complete AI matching integration (currently 90% done)
2. Finish Terms & Conditions screen
3. Conduct comprehensive end-to-end testing
4. Deploy to production
5. Onboard initial user group (pilot program)
6. Gather feedback and iterate

### Technical Deep-Dive Questions

#### "Explain your database schema design"

**Answer**: We use a relational PostgreSQL database with 11 core tables:
- **students**: Master list (source of truth for enrollment)
- **profiles**: User-editable information
- **items**: Registered belongings with QR tokens
- **found_items**: Reported found items
- **ai_matches**: Links lost and found items with confidence scores
- **chat_threads** & **chat_messages**: Communication system
- **notifications**: Alert system
- **admins**: Role-based access control
- **custody_log**: Physical item tracking
- **audit_log**: Complete action history

All tables use UUIDs for primary keys, have proper foreign key constraints, and implement Row Level Security policies.

#### "How do you handle concurrent updates?"

**Answer**: Supabase (PostgreSQL) provides ACID transactions. We use:
- **Optimistic locking**: Check timestamps before updates
- **Real-time subscriptions**: Immediate UI updates when data changes
- **Database constraints**: Prevent invalid states
- **Atomic operations**: Match confirmation updates multiple tables in a single transaction

#### "Explain your authentication flow"

**Answer**: 
1. User provides Student ID, email, password
2. Backend verifies Student ID exists and status is 'active'
3. Supabase Auth creates account with JWT
4. `auth_user_id` is linked to student record
5. Profile is auto-created from student data
6. JWT is stored securely on device
7. All API requests include JWT for authentication
8. RLS policies enforce data access rules

---

## Presentation Tips

### Visual Aids Strategy

1. **Start with Architecture**: Show `00-system-architecture.dot` to give big picture
2. **Simplify the Journey**: Use `00-simplified-workflow.dot` for non-technical audience
3. **Deep Dive Selectively**: Show specific feature flowcharts (01-14) based on questions
4. **End with Roadmap**: Use roadmap diagrams (15-17) to show progress and future

### Demonstration Flow

1. **Authentication**: Show student ID verification
2. **Item Registration**: Register a sample item, show QR code generation
3. **QR Scanning**: Scan the QR code to identify owner
4. **Report Found**: Submit a found item report
5. **AI Matching**: Show match notification and review process
6. **Admin Panel**: Demonstrate custody log and audit trail

### Key Messages to Emphasize

1. **Problem-Solution Fit**: Clear campus need, practical solution
2. **Technical Sophistication**: AI, real-time, security, scalability
3. **User-Centric Design**: Simple workflows, intuitive interface
4. **Administrative Value**: Oversight, accountability, audit trail
5. **Future-Ready**: Extensible architecture, roadmap for enhancements

### Common Pitfalls to Avoid

1. ❌ Don't get lost in technical details unless asked
2. ❌ Don't apologize for incomplete features - focus on what works
3. ❌ Don't criticize the pivot - frame it as adaptive problem-solving
4. ❌ Don't promise features you can't deliver
5. ❌ Don't ignore the professor's questions - address them directly

---

## Appendix: Quick Reference

### File Locations

- **System Architecture**: `docs/graphviz/00-system-architecture.dot`
- **Simplified Workflow**: `docs/graphviz/00-simplified-workflow.dot`
- **Complete Workflow**: `docs/graphviz/00-general-workflow.dot`
- **Feature Flowcharts**: `docs/graphviz/01-14-*.dot`
- **Roadmap Diagrams**: `docs/graphviz/15-17-*.dot`
- **Comprehensive Guide**: `docs/COMPREHENSIVE_GUIDE.md`
- **Development Roadmap**: `docs/ROADMAP.md`
- **Audit Documentation**: `docs/AUDIT_LOGGING.md`

### Viewing Flowcharts

**Option 1: Online Viewer**
1. Go to https://dreampuf.github.io/GraphvizOnline/
2. Copy content of any `.dot` file
3. Paste and view rendered diagram

**Option 2: Export to Images**
```bash
# Install Graphviz
# Then generate PNGs for presentation
dot -Tpng 00-system-architecture.dot -o architecture.png
dot -Tpng 00-simplified-workflow.dot -o workflow.png
dot -Tpng 15-roadmap-timeline.dot -o timeline.png
```

### Key Statistics

- **Development Time**: 20 days (7 weeks)
- **Completion**: 73.3% (11/15 features)
- **Database Tables**: 11 core tables
- **Flowcharts**: 17 comprehensive diagrams
- **Platforms**: iOS, Android, Web
- **Lines of Code**: ~15,000+ (estimated)

---

**Good luck with your defense!** 🎓

Remember: You've built a sophisticated, practical solution to a real campus problem. Be confident in your work, be honest about challenges, and demonstrate your technical competence through clear explanations and live demonstrations.

