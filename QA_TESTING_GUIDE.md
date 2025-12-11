# ITSM Platform - Complete QA Testing Guide

## For QA Testers Who Are New to This Application

**Application URL:** http://itsm-alb-711993406.eu-north-1.elb.amazonaws.com

---

# PART 1: UNDERSTANDING THE APPLICATION

## What is This Application?

This is an **IT Service Management (ITSM)** platform. Think of it as a help desk system where:
- **End Users** report problems (like "my laptop won't turn on")
- **IT Agents** fix those problems
- **Managers** oversee the team and approve changes
- **Admins** configure the entire system

The application follows ITIL (IT Infrastructure Library) best practices with modules for:
- **Incidents** - Something is broken, fix it fast!
- **Service Requests** - User wants something (new laptop, software, access)
- **Problems** - Finding root cause of recurring incidents
- **Changes** - Planned modifications to IT systems
- **Assets** - Track all IT equipment (laptops, servers, etc.)
- **Projects** - Manage IT projects with Kanban boards
- **Knowledge Base** - Documentation and how-to articles

---

# PART 2: USER ROLES EXPLAINED

## Role Hierarchy (Top to Bottom)

```
SUPER ADMIN (God mode - can do everything)
     ↓
  ADMIN (System configuration)
     ↓
  MANAGER (Team oversight, approvals)
     ↓
  AGENT (Handle tickets, resolve issues)
     ↓
  USER (Create tickets, view own stuff)
```

---

## 2.1 SUPER ADMIN Role

### How to Login as Super Admin
1. Go to the application URL
2. Enter email: `admin@yourcompany.com` (or whatever admin account exists)
3. Enter password
4. Click "Sign In"

### What Super Admin Sees After Login

**Left Sidebar Navigation:**
```
📊 Dashboard
📋 Incidents
🎫 Service Requests
🔍 Problems
🔄 Changes
💻 Assets
📚 Knowledge Base
📁 Projects
💬 Chat
📈 Reports
⚙️ Settings
   ├── General
   ├── Categories
   ├── SLA Policies
   ├── Service Templates
   ├── Groups
   ├── Users
   ├── Roles
   └── Integrations
```

**Top Header:**
- Company logo (left)
- Search bar (center)
- Notification bell icon (right)
- User avatar with dropdown (right)

### What Super Admin Can Do
| Module | Permissions |
|--------|-------------|
| Incidents | Create, View All, Edit All, Delete, Assign to anyone |
| Service Requests | Create, View All, Edit All, Approve/Reject |
| Problems | Create, View All, Edit All, Delete |
| Changes | Create, View All, Edit All, Approve/Reject, Delete |
| Assets | Create, View All, Edit All, Delete, Manage Types |
| Knowledge Base | Create, View All, Edit All, Publish, Delete |
| Projects | Create, View All, Manage All, Delete |
| Reports | View All Reports, Export, Schedule |
| Settings | FULL ACCESS to all settings |
| Users | Create, Edit, Deactivate, Change Roles |

---

## 2.2 MANAGER Role

### How to Login as Manager
1. Go to application URL
2. Enter manager credentials
3. Click "Sign In"

### What Manager Sees After Login

**Left Sidebar Navigation:**
```
📊 Dashboard
📋 Incidents
🎫 Service Requests
🔍 Problems
🔄 Changes
💻 Assets
📚 Knowledge Base
📁 Projects
💬 Chat
📈 Reports
⚙️ Settings (LIMITED)
   ├── Categories
   ├── SLA Policies
   ├── Service Templates
   └── Groups
```

**Note:** Manager does NOT see:
- Users management
- Roles management
- System integrations

### What Manager Can Do
| Module | Permissions |
|--------|-------------|
| Incidents | Create, View All, Edit All, Assign to team members |
| Service Requests | Create, View All, Approve/Reject requests |
| Problems | Create, View All, Edit All |
| Changes | Create, View All, **APPROVE/REJECT** (Key responsibility!) |
| Assets | Create, View All, Edit |
| Knowledge Base | Create, Edit, Publish |
| Projects | Create, Manage team projects |
| Reports | View team reports |
| Settings | Limited - Categories, SLA, Templates, Groups |

### Manager's Key Responsibilities
1. **Approve Changes** - When agents request system changes, manager must approve
2. **Approve Service Requests** - Some requests need manager approval
3. **Assign Tickets** - Distribute work among agents
4. **Monitor SLA** - Ensure tickets are resolved on time

---

## 2.3 AGENT Role

### How to Login as Agent
1. Go to application URL
2. Enter agent credentials
3. Click "Sign In"

### What Agent Sees After Login

**Left Sidebar Navigation:**
```
📊 Dashboard
📋 Incidents
🎫 Service Requests
🔍 Problems
🔄 Changes
💻 Assets
📚 Knowledge Base
📁 Projects
💬 Chat
📈 Reports (LIMITED)
```

**Note:** Agent does NOT see:
- Settings menu (no configuration access)
- User management
- Role management

### What Agent Can Do
| Module | Permissions |
|--------|-------------|
| Incidents | Create, View Assigned/All, Edit Assigned, Add Comments |
| Service Requests | View All, Fulfill requests assigned to them |
| Problems | Create, View All, Add RCA/Workarounds |
| Changes | Create (submit for approval), View All |
| Assets | View All, Edit assigned assets |
| Knowledge Base | Create drafts, View published |
| Projects | Work on assigned tasks |
| Reports | View own performance |

### Agent's Key Responsibilities
1. **Resolve Incidents** - Fix user problems
2. **Fulfill Service Requests** - Process user requests
3. **Document Solutions** - Add to knowledge base
4. **Update Ticket Status** - Keep users informed

---

## 2.4 END USER Role

### How to Login as End User
1. Go to application URL
2. Enter user credentials
3. Click "Sign In"

### What End User Sees After Login

**Left Sidebar Navigation:**
```
📊 Dashboard (Personal)
📋 My Incidents
🎫 My Service Requests
📚 Knowledge Base (Read Only)
💬 Chat
```

**Note:** End User does NOT see:
- Problems module
- Changes module
- Assets module
- Projects module
- Reports module
- Settings

### What End User Can Do
| Module | Permissions |
|--------|-------------|
| Incidents | Create own, View own only, Add comments to own |
| Service Requests | Create own, View own only |
| Knowledge Base | Search and read articles only |
| Chat | Chat with support agents |

### End User's Typical Actions
1. **Report Problems** - "My email isn't working"
2. **Request Services** - "I need a new laptop"
3. **Check Status** - "What's happening with my ticket?"
4. **Find Answers** - Search knowledge base for self-help

---

# PART 3: MODULE-BY-MODULE WALKTHROUGH

## 3.1 AUTHENTICATION MODULE

### Login Page Layout
```
┌─────────────────────────────────────┐
│                                     │
│         [Company Logo]              │
│                                     │
│     ┌─────────────────────────┐     │
│     │ Email                   │     │
│     └─────────────────────────┘     │
│     ┌─────────────────────────┐     │
│     │ Password            👁  │     │
│     └─────────────────────────┘     │
│                                     │
│     [        Sign In        ]       │
│                                     │
│     Forgot Password?                │
│                                     │
└─────────────────────────────────────┘
```

### Test Cases for Authentication

#### TC-AUTH-001: Successful Login
**Role:** Any
**Steps:**
1. Open browser and go to application URL
2. You should see the login page with email and password fields
3. Enter a valid email (e.g., `admin@test.com`)
4. Enter the correct password
5. Click "Sign In" button

**Expected:**
- Page redirects to Dashboard
- Your name appears in top-right corner
- Sidebar shows menu items based on your role

**How to Verify:**
- Check the URL changed to `/dashboard`
- Check your avatar/name in header
- Check sidebar has correct menu items for your role

---

#### TC-AUTH-002: Failed Login - Wrong Password
**Role:** Any
**Steps:**
1. Go to login page
2. Enter valid email
3. Enter WRONG password (intentionally)
4. Click "Sign In"

**Expected:**
- Red error message appears: "Invalid credentials" or similar
- You stay on login page
- Password field may clear

**How to Verify:**
- Error message is visible and readable
- URL is still `/login`
- Cannot access any other pages

---

#### TC-AUTH-003: Failed Login - Empty Fields
**Role:** Any
**Steps:**
1. Go to login page
2. Leave email empty
3. Leave password empty
4. Click "Sign In"

**Expected:**
- Validation errors appear on both fields
- Message like "Email is required" and "Password is required"
- Form does not submit

---

#### TC-AUTH-004: Logout
**Role:** Any logged in user
**Steps:**
1. Login successfully
2. Click on your avatar/name in top-right corner
3. Click "Logout" from dropdown menu

**Expected:**
- Redirected to login page
- If you try to go back (browser back button), you should NOT see dashboard
- If you manually type `/dashboard` in URL, you should be redirected to login

---

#### TC-AUTH-005: Password Reset Flow
**Role:** Any
**Steps:**
1. Go to login page
2. Click "Forgot Password?" link
3. Enter your registered email
4. Click "Send Reset Link"
5. Check your email inbox
6. Click the reset link in email
7. Enter new password
8. Confirm new password
9. Submit
10. Try logging in with new password

**Expected:**
- Reset email arrives within 2-3 minutes
- Reset link opens password reset form
- New password works for login

---

#### TC-AUTH-006: Session Expiry
**Role:** Any
**Steps:**
1. Login to application
2. Note the time
3. Leave browser idle for 30+ minutes (or whatever session timeout is configured)
4. Try to click on any link or perform any action

**Expected:**
- Redirected to login page
- Message like "Session expired, please login again"

---

## 3.2 DASHBOARD MODULE

### Dashboard Layout (Admin/Manager View)
```
┌──────────────────────────────────────────────────────────────┐
│  Dashboard                                      🔔  👤 Admin  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │   12     │  │    5     │  │    3     │  │    8     │     │
│  │  Open    │  │ Pending  │  │ Critical │  │  Due     │     │
│  │ Tickets  │  │ Changes  │  │ Incidents│  │  Today   │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                              │
│  ┌─────────────────────────────┐  ┌─────────────────────┐   │
│  │                             │  │                     │   │
│  │   Tickets by Status        │  │  Recent Activity    │   │
│  │   [PIE CHART]              │  │  • Ticket #123...   │   │
│  │                             │  │  • Change #45...    │   │
│  │                             │  │  • User John...     │   │
│  └─────────────────────────────┘  └─────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │   Tickets Over Time [LINE CHART]                    │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Dashboard Layout (End User View)
```
┌──────────────────────────────────────────────────────────────┐
│  My Dashboard                                   🔔  👤 User   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐                                 │
│  │    2     │  │    1     │                                 │
│  │   My     │  │   My     │                                 │
│  │ Tickets  │  │ Requests │                                 │
│  └──────────┘  └──────────┘                                 │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  My Recent Tickets                                  │    │
│  │  • INC-001: Email not working (Open)               │    │
│  │  • INC-002: VPN issue (Resolved)                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Test Cases for Dashboard

#### TC-DASH-001: Dashboard Loads Correctly
**Role:** Login as Admin
**Steps:**
1. Login as Admin
2. You should automatically land on Dashboard

**Expected:**
- Stat cards show numbers (Open Tickets, Pending Changes, etc.)
- Charts render properly (not broken/empty)
- Recent activity list shows items

**How to Verify:**
- No loading spinners stuck forever
- No error messages
- Numbers in cards are not "NaN" or "undefined"

---

#### TC-DASH-002: Dashboard Stats Are Accurate
**Role:** Admin
**Steps:**
1. Note the "Open Incidents" count on dashboard (let's say it shows "12")
2. Click on "Incidents" in sidebar
3. Filter by Status = "Open"
4. Count the tickets shown

**Expected:**
- The count from dashboard matches the filtered count in Incidents page
- Do this for other stats too (Pending Changes, etc.)

---

#### TC-DASH-003: Role-Based Dashboard Content
**Steps:**
1. Login as Admin → Note what you see on dashboard
2. Logout
3. Login as Agent → Note what you see
4. Logout
5. Login as End User → Note what you see

**Expected:**
| Role | Dashboard Shows |
|------|-----------------|
| Admin | All stats, all charts, all activity |
| Manager | Team stats, team charts, team activity |
| Agent | Assigned tickets, personal performance |
| End User | Only own tickets and requests |

---

## 3.3 INCIDENTS MODULE

### What is an Incident?
An **Incident** is an unplanned interruption or degradation of an IT service.
- Examples: "My laptop crashed", "Email server is down", "Can't login to system"
- Goal: Restore service as quickly as possible

### Incidents List Page Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│  Incidents                                    [Table] [Kanban]       │
│                                               [+ Create Incident]    │
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 🔍 Search incidents...                                         │  │
│  │                                                                │  │
│  │ Status: [All ▼]  Priority: [All ▼]  Assignee: [All ▼]         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ # ID     │ Title            │ Status │ Priority │ Assignee    │  │
│  ├──────────┼──────────────────┼────────┼──────────┼─────────────┤  │
│  │ INC-001  │ Email not work.. │ 🟡 Open│ 🔴 High  │ John Doe    │  │
│  │ INC-002  │ VPN connection.. │ 🔵 New │ 🟡 Medium│ Unassigned  │  │
│  │ INC-003  │ Printer error..  │ 🟢 Done│ 🟢 Low   │ Jane Smith  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Showing 1-20 of 45    [< Prev] [1] [2] [3] [Next >]                │
└──────────────────────────────────────────────────────────────────────┘
```

### Incident Kanban View Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Incidents (Kanban)                                    [Table] [Kanban]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  NEW          OPEN         IN PROGRESS    PENDING      RESOLVED    CLOSED  │
│  ┌─────┐      ┌─────┐      ┌─────┐       ┌─────┐      ┌─────┐     ┌─────┐ │
│  │INC02│      │INC01│      │INC05│       │INC07│      │INC03│     │INC09│ │
│  │Email│      │VPN  │      │Print│       │Wait │      │Fixed│     │Done │ │
│  │     │      │     │      │     │       │     │      │     │     │     │ │
│  └─────┘      └─────┘      └─────┘       └─────┘      └─────┘     └─────┘ │
│  ┌─────┐      ┌─────┐                                                      │
│  │INC04│      │INC06│                                                      │
│  │Crash│      │Slow │                                                      │
│  └─────┘      └─────┘                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Incident Detail Page Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Back to Incidents                           [Edit] [Delete]       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  INC-001: Email not working after Windows update                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                     │
│                                                                      │
│  Status: [Open ▼]     Priority: 🔴 High     Category: Email          │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Description                                                  │    │
│  │                                                             │    │
│  │ After the latest Windows update, Outlook keeps crashing    │    │
│  │ when I try to open it. I've tried restarting but it        │    │
│  │ doesn't help.                                               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Assignee: John Doe            Reporter: Alice Smith                │
│  Created: Dec 10, 2024         SLA Due: Dec 11, 2024 (2h left)     │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════    │
│  Activity / Comments                                                 │
│  ═══════════════════════════════════════════════════════════════    │
│                                                                      │
│  👤 John Doe - 2 hours ago                                          │
│  Looking into this issue. Will update shortly.                      │
│                                                                      │
│  👤 System - 3 hours ago                                            │
│  Ticket assigned to John Doe                                        │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Add a comment...                                            │    │
│  │                                                 [Send]      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Incident Status Flow
```
NEW → OPEN → IN_PROGRESS → PENDING → RESOLVED → CLOSED
                              ↑          │
                              └──────────┘
                           (Can reopen if needed)
```

| Status | Meaning |
|--------|---------|
| NEW | Just created, not yet looked at |
| OPEN | Someone is aware, will work on it |
| IN_PROGRESS | Actively being worked on |
| PENDING | Waiting for something (user response, parts, etc.) |
| RESOLVED | Fix applied, waiting for user confirmation |
| CLOSED | Completely done |

### Test Cases for Incidents

#### TC-INC-001: Create Incident as Admin
**Role:** Admin
**Steps:**
1. Login as Admin
2. Click "Incidents" in sidebar
3. Click "+ Create Incident" button (top right)
4. A modal/form appears
5. Fill in:
   - Title: "Test Incident - Printer not printing"
   - Description: "The office printer on 2nd floor is showing error code E-45"
   - Category: Select "Hardware" (or whatever exists)
   - Priority: Select "High"
   - Assignee: Select an agent (or leave unassigned)
6. Click "Create" button

**Expected:**
- Modal closes
- Success toast: "Incident created successfully"
- New incident appears in list
- Incident has ID like "INC-XXX"

**How to Verify:**
- Click on the new incident to open it
- All fields you entered are saved correctly

---

#### TC-INC-002: Create Incident as End User
**Role:** End User
**Steps:**
1. Login as End User
2. Click "Incidents" in sidebar (shows as "My Incidents")
3. Click "Create Incident" or "Report Issue"
4. Fill in:
   - Title: "My laptop is very slow"
   - Description: "Since yesterday my laptop takes 5 minutes to boot"
5. Click "Create"

**Expected:**
- Incident created
- End user can see it in "My Incidents"
- End user CANNOT assign it to anyone (field not visible or disabled)

**How to Verify:**
- The incident shows YOUR name as reporter
- Status is "NEW"
- Assignee is empty or "Unassigned"

---

#### TC-INC-003: View Incident List with Filters
**Role:** Admin or Agent
**Steps:**
1. Go to Incidents page
2. You see list of all incidents
3. Use Status dropdown, select "Open"
4. Notice list filters to show only Open tickets
5. Use Priority dropdown, select "Critical"
6. Notice list now shows only Open + Critical tickets
7. Clear all filters
8. Type in search box: "email"
9. Notice list shows incidents with "email" in title/description

**Expected:**
- Filters work correctly
- Search finds matching incidents
- Clearing filters shows all incidents

---

#### TC-INC-004: View Incident Details
**Role:** Any
**Steps:**
1. Go to Incidents list
2. Click on any incident row
3. Detail page opens

**Expected:**
- See ticket ID (INC-XXX)
- See title, description
- See status badge with color
- See priority badge with color
- See assignee name/avatar (or "Unassigned")
- See reporter name
- See created date
- See activity/comments section

---

#### TC-INC-005: Update Incident Status
**Role:** Agent or Admin
**Steps:**
1. Open an incident that is in "NEW" status
2. Find the Status dropdown (usually at top of detail page)
3. Click dropdown and select "IN_PROGRESS"
4. (May ask for confirmation or save automatically)

**Expected:**
- Status changes to "IN_PROGRESS"
- Activity log shows: "Status changed from NEW to IN_PROGRESS by [your name]"
- Toast message: "Status updated"

---

#### TC-INC-006: Assign Incident to Agent
**Role:** Admin or Manager
**Steps:**
1. Open an unassigned incident
2. Find "Assignee" field
3. Click to open user selector
4. Select an agent (e.g., "John Doe")
5. Save/confirm

**Expected:**
- Assignee shows "John Doe"
- Activity log shows: "Assigned to John Doe by [your name]"
- John Doe should receive notification (check notification bell)

---

#### TC-INC-007: Add Comment to Incident
**Role:** Any role with access to the incident
**Steps:**
1. Open any incident
2. Scroll to comments section
3. Type in comment box: "I am investigating this issue"
4. Click "Send" or "Add Comment"

**Expected:**
- Comment appears in activity feed
- Shows your name and timestamp
- Comment text is displayed correctly

---

#### TC-INC-008: Drag Ticket in Kanban View
**Role:** Agent or Admin
**Steps:**
1. Go to Incidents page
2. Click "Kanban" view toggle (top right, next to Table)
3. Find a ticket card in "NEW" column
4. Click and drag it to "IN_PROGRESS" column
5. Release (drop) the card

**Expected:**
- Card moves to new column
- Toast: "Status updated to IN_PROGRESS"
- If you switch back to Table view, ticket status shows "IN_PROGRESS"

---

#### TC-INC-009: Incident Cannot Be Edited by End User
**Role:** End User
**Steps:**
1. Login as End User
2. Go to My Incidents
3. Click on your own incident
4. Try to change status, priority, or assignee

**Expected:**
- Status dropdown is disabled OR not visible
- Priority cannot be changed
- Assignee field is not visible
- End user can ONLY add comments

---

#### TC-INC-010: Resolve and Close Incident
**Role:** Agent then Admin
**Agent Steps:**
1. Login as Agent
2. Open an incident assigned to you
3. Add comment: "Fixed by reinstalling the software"
4. Change status to "RESOLVED"

**Admin Steps:**
1. Login as Admin (or same agent)
2. Open the resolved incident
3. Change status to "CLOSED"

**Expected:**
- Incident flow: IN_PROGRESS → RESOLVED → CLOSED
- Each status change is logged in activity

---

## 3.4 SERVICE REQUESTS MODULE

### What is a Service Request?
A **Service Request** is a formal request from a user for something to be provided.
- Examples: "I need a new laptop", "Please install Photoshop", "Need access to sales folder"
- Unlike incidents (something broken), these are planned requests

### Service Request Catalog View
```
┌──────────────────────────────────────────────────────────────────────┐
│  Service Catalog                               [+ New Request]       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Select a service to request:                                        │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │       💻        │  │       📧        │  │       🔐        │      │
│  │                 │  │                 │  │                 │      │
│  │  New Hardware   │  │  Email Setup    │  │  Access Request │      │
│  │                 │  │                 │  │                 │      │
│  │  Request new    │  │  Setup email    │  │  Request access │      │
│  │  laptop, phone  │  │  on device      │  │  to systems     │      │
│  │                 │  │                 │  │                 │      │
│  │  Est: 5 days    │  │  Est: 1 day     │  │  Est: 2 days    │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │       🖥️        │  │       📱        │  │       🔧        │      │
│  │                 │  │                 │  │                 │      │
│  │  Software       │  │  Mobile Device  │  │  Equipment      │      │
│  │  Installation   │  │  Setup          │  │  Repair         │      │
│  │                 │  │                 │  │                 │      │
│  │  Est: 2 days    │  │  Est: 1 day     │  │  Est: 3 days    │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Test Cases for Service Requests

#### TC-SR-001: View Service Catalog
**Role:** End User
**Steps:**
1. Login as End User
2. Click "Service Requests" in sidebar
3. Click "+ New Request" button

**Expected:**
- Modal opens showing service catalog
- Service types displayed as cards with icons
- Each card shows name, description, estimated time

**If catalog is empty:**
- Should show message: "No Service Templates Available"
- Admin needs to create templates first

---

#### TC-SR-002: Create Service Request
**Role:** End User
**Steps:**
1. Open Service Catalog (above step)
2. Click on "Software Installation" card
3. Form appears with fields:
   - What software do you need? (text)
   - Business justification (text)
4. Fill in the form
5. Click "Submit Request"

**Expected:**
- Request created successfully
- Request ID generated (SR-XXX)
- Status: "PENDING" or "AWAITING_APPROVAL"
- You can see it in your Service Requests list

---

#### TC-SR-003: Manager Approves Service Request
**Role:** Manager
**Steps:**
1. Login as Manager
2. Go to Service Requests
3. Find a request with status "PENDING_APPROVAL"
4. Click to open details
5. Click "Approve" button
6. (Optional) Add approval note

**Expected:**
- Status changes to "APPROVED"
- Requester receives notification
- Request moves forward for fulfillment

---

#### TC-SR-004: Manager Rejects Service Request
**Role:** Manager
**Steps:**
1. Login as Manager
2. Find a pending request
3. Click "Reject" button
4. Enter rejection reason (required)
5. Confirm

**Expected:**
- Status changes to "REJECTED"
- Requester receives notification with reason
- Request is closed

---

## 3.5 PROBLEMS MODULE

### What is a Problem?
A **Problem** is the underlying cause of one or more incidents.
- Example: 5 users report "email not working" (5 incidents) → 1 problem: "Mail server disk full"
- Goal: Find root cause and prevent future incidents

### Problem Record Flow
```
NEW → UNDER_INVESTIGATION → KNOWN_ERROR → RESOLVED → CLOSED

During investigation:
- Link related incidents
- Add Root Cause Analysis (RCA)
- Add Workaround (temporary fix)
- Add Permanent Solution
```

### Test Cases for Problems

#### TC-PROB-001: Create Problem Record
**Role:** Agent or Admin
**Steps:**
1. Login as Agent
2. Click "Problems" in sidebar
3. Click "Create Problem"
4. Fill in:
   - Title: "Recurring network disconnections"
   - Description: "Multiple users reporting network drops at 2pm daily"
   - Priority: High
   - Category: Network
5. Click "Create"

**Expected:**
- Problem created with ID (PROB-XXX)
- Status: "NEW"
- Appears in Problems list

---

#### TC-PROB-002: Link Incidents to Problem
**Role:** Agent or Admin
**Steps:**
1. Open a Problem record
2. Find "Related Incidents" section
3. Click "Link Incident"
4. Search/select incidents to link
5. Confirm

**Expected:**
- Incidents appear in Related Incidents list
- If you open those incidents, they show linked to this problem

---

#### TC-PROB-003: Add Root Cause Analysis
**Role:** Agent or Admin
**Steps:**
1. Open a Problem record
2. Find "Root Cause Analysis" section
3. Click "Add RCA"
4. Enter: "Network switch in server room overheating due to failed AC unit"
5. Save

**Expected:**
- RCA appears in problem record
- Problem status can change to "KNOWN_ERROR"

---

#### TC-PROB-004: Add Workaround
**Role:** Agent
**Steps:**
1. Open a Problem (that has RCA)
2. Click "Add Workaround"
3. Enter: "Restart the network switch every day at 1:30pm until AC is fixed"
4. Save

**Expected:**
- Workaround visible in problem record
- Can be shared with linked incidents

---

#### TC-PROB-005: Add Permanent Solution
**Role:** Agent or Admin
**Steps:**
1. Open a Known Error problem
2. Click "Add Solution"
3. Enter: "AC unit replaced on Dec 15. Network switch temperature now stable."
4. Save

**Expected:**
- Solution recorded
- Problem can be marked RESOLVED
- Linked incidents can reference this solution

---

## 3.6 CHANGES MODULE

### What is a Change?
A **Change** is a planned modification to IT infrastructure or services.
- Examples: "Upgrade email server", "Install new firewall", "Deploy software update"
- Requires planning, approval, and rollback plan

### Change Types
| Type | Description | Approval |
|------|-------------|----------|
| Standard | Pre-approved, low-risk, routine | Auto-approved |
| Normal | Regular change, needs planning | CAB approval |
| Emergency | Urgent fix for critical issue | Expedited approval |

### Change Workflow
```
DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED → SCHEDULED → IN_PROGRESS → COMPLETED
                          ↓
                       REJECTED
```

### Change Detail Page Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Back to Changes                             [Submit for Approval] │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CHG-001: Upgrade Exchange Server to 2024                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                     │
│                                                                      │
│  Status: PENDING_APPROVAL      Type: Normal      Risk: Medium        │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Description                                                   │   │
│  │ Upgrade Exchange server from 2019 to 2024 version.           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Implementation Plan                                           │   │
│  │ 1. Backup current server (2 hours)                           │   │
│  │ 2. Stop email services (notify users)                        │   │
│  │ 3. Run upgrade installer (1 hour)                            │   │
│  │ 4. Test email functionality                                   │   │
│  │ 5. Resume services                                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Rollback Plan                                                 │   │
│  │ If upgrade fails:                                             │   │
│  │ 1. Stop services                                              │   │
│  │ 2. Restore from backup                                        │   │
│  │ 3. Verify email working                                       │   │
│  │ 4. Resume services                                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Scheduled: Dec 20, 2024 10:00 PM - Dec 21, 2024 2:00 AM           │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════    │
│  Approvals                                                          │
│  ═══════════════════════════════════════════════════════════════    │
│  👤 Manager Smith    ⏳ Pending                                     │
│  👤 IT Director      ⏳ Pending                                     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Test Cases for Changes

#### TC-CHG-001: Create Change Request
**Role:** Agent
**Steps:**
1. Login as Agent
2. Go to Changes page
3. Click "Create Change"
4. Fill in ALL fields:
   - Title: "Install new antivirus software"
   - Description: Detailed explanation
   - Change Type: Normal
   - Risk Level: Low
   - Implementation Plan: Step by step
   - Rollback Plan: What to do if it fails
   - Scheduled Start: Pick a future date/time
   - Scheduled End: Pick end date/time
5. Click "Save as Draft" or "Submit"

**Expected:**
- Change created with ID (CHG-XXX)
- Status: "DRAFT" or "PENDING_APPROVAL"

---

#### TC-CHG-002: Submit Change for Approval
**Role:** Agent (who created the change)
**Steps:**
1. Open your draft change
2. Click "Submit for Approval"
3. Confirm

**Expected:**
- Status changes to "PENDING_APPROVAL"
- Approvers receive notification
- Cannot edit change while pending (or limited editing)

---

#### TC-CHG-003: Approve Change (Manager)
**Role:** Manager
**Steps:**
1. Login as Manager
2. Go to Changes page
3. Find change with "PENDING_APPROVAL"
4. Click to open
5. Review details
6. Click "Approve" button

**Expected:**
- Your approval is recorded
- If all required approvers have approved → Status becomes "APPROVED"
- Requester is notified

---

#### TC-CHG-004: Reject Change (Manager)
**Role:** Manager
**Steps:**
1. Login as Manager
2. Open pending change
3. Click "Reject" button
4. Enter reason: "Too risky during holiday season"
5. Confirm

**Expected:**
- Status: "REJECTED"
- Rejection reason visible
- Requester notified

---

#### TC-CHG-005: Implement Change
**Role:** Agent or whoever is assigned
**Steps:**
1. Open an "APPROVED" change (on or after scheduled date)
2. Click "Start Implementation"
3. Status changes to "IN_PROGRESS"
4. Do the work (outside the system)
5. Come back and click "Complete"
6. Select outcome: "Successful" or "Failed"
7. If failed, document what happened

**Expected:**
- If Successful → Status: "COMPLETED"
- If Failed → May need to execute rollback plan

---

#### TC-CHG-006: Emergency Change
**Role:** Admin
**Steps:**
1. Create change with Type: "Emergency"
2. Submit for approval
3. Notice expedited workflow (fewer approvers, faster)

**Expected:**
- Emergency changes have streamlined approval
- But still require post-implementation review

---

## 3.7 ASSETS MODULE

### What is an Asset?
An **Asset** is any IT equipment or resource that needs tracking.
- Examples: Laptops, servers, monitors, software licenses, phones

### Asset Types
- Hardware: Laptops, desktops, servers, phones
- Software: Licenses, subscriptions
- Network: Routers, switches, firewalls
- Peripherals: Monitors, keyboards, mice

### Asset Status Values
| Status | Meaning |
|--------|---------|
| IN_STOCK | Available, not assigned |
| IN_USE | Assigned to someone |
| IN_REPAIR | Being fixed |
| RETIRED | No longer in use |
| DISPOSED | Thrown away/recycled |

### Asset List Page Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│  Assets                                          [+ Add Asset]       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🔍 Search...   Type: [All ▼]   Status: [All ▼]   Location: [All ▼] │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Asset Tag  │ Name           │ Type     │ Status  │ Assigned  │   │
│  ├────────────┼────────────────┼──────────┼─────────┼───────────┤   │
│  │ LAPTOP-001 │ Dell XPS 15    │ Hardware │ 🟢 In Use│ John Doe │   │
│  │ LAPTOP-002 │ MacBook Pro    │ Hardware │ 🟡 Stock │ -        │   │
│  │ MON-001    │ Dell 27" 4K    │ Hardware │ 🟢 In Use│ Jane Doe │   │
│  │ SW-001     │ MS Office 365  │ Software │ 🟢 In Use│ Team A   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Test Cases for Assets

#### TC-ASSET-001: Create Asset
**Role:** Admin
**Steps:**
1. Login as Admin
2. Go to Assets page
3. Click "Add Asset"
4. Fill in:
   - Asset Type: Hardware > Laptop
   - Asset Name: "Dell Latitude 5520"
   - Asset Tag: "LAP-100" (unique identifier)
   - Serial Number: "ABC123XYZ"
   - Status: "IN_STOCK"
   - Location: "IT Storage Room"
5. Click "Save"

**Expected:**
- Asset created
- Visible in asset list

---

#### TC-ASSET-002: Assign Asset to User
**Role:** Admin or Manager
**Steps:**
1. Open an asset with status "IN_STOCK"
2. Click "Assign" or edit and set Assigned User
3. Select a user
4. Save

**Expected:**
- Status changes to "IN_USE"
- Assigned user shows on asset
- User can see it in their assets (if feature exists)

---

#### TC-ASSET-003: View Asset Details
**Role:** Any with access
**Steps:**
1. Go to Assets
2. Click on any asset

**Expected:**
- See all asset information
- See assignment history
- See related tickets (incidents linked to this asset)

---

#### TC-ASSET-004: Manage Asset Types
**Role:** Admin
**Steps:**
1. Go to Assets → Asset Types (or Settings → Asset Types)
2. Click "Add Type"
3. Enter: "Printer"
4. Add custom fields:
   - Color/B&W (dropdown)
   - Network IP (text)
5. Save

**Expected:**
- New asset type created
- When creating assets of this type, custom fields appear

---

## 3.8 KNOWLEDGE BASE MODULE

### What is Knowledge Base?
A **Knowledge Base** is a library of articles, how-tos, and documentation.
- Helps users solve problems themselves
- Helps agents find solutions faster

### Article States
| State | Meaning |
|-------|---------|
| DRAFT | Being written, not visible to users |
| IN_REVIEW | Submitted for approval |
| PUBLISHED | Live, visible to everyone |
| ARCHIVED | Hidden but not deleted |

### Knowledge Base Page Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│  Knowledge Base                              [+ Create Article]      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🔍 Search articles...                                               │
│                                                                      │
│  Categories                          │  Popular Articles            │
│  ┌────────────────────────────────┐  │  ┌────────────────────────┐  │
│  │ 📁 Email & Communication (12)  │  │  │ How to reset password  │  │
│  │ 📁 Network & VPN (8)           │  │  │ VPN connection guide   │  │
│  │ 📁 Hardware (15)               │  │  │ Outlook setup          │  │
│  │ 📁 Software (22)               │  │  │ WiFi troubleshooting   │  │
│  │ 📁 Security (5)                │  │  └────────────────────────┘  │
│  └────────────────────────────────┘  │                              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Test Cases for Knowledge Base

#### TC-KB-001: Search Knowledge Base
**Role:** End User
**Steps:**
1. Login as End User
2. Go to Knowledge Base
3. Type "password reset" in search box
4. Press Enter or wait

**Expected:**
- Articles matching "password reset" appear
- Results show title and snippet
- Clicking opens full article

---

#### TC-KB-002: Browse by Category
**Role:** Any
**Steps:**
1. Go to Knowledge Base
2. Click on a category (e.g., "Email & Communication")
3. See articles in that category
4. Click on an article

**Expected:**
- Category filters articles
- Article opens and displays content

---

#### TC-KB-003: Create Article
**Role:** Agent or Admin
**Steps:**
1. Login as Agent
2. Go to Knowledge Base
3. Click "Create Article"
4. Fill in:
   - Title: "How to Configure VPN on Mac"
   - Category: Select "Network & VPN"
   - Content: Write the article (rich text editor)
   - Tags: "vpn, mac, network"
5. Click "Save as Draft"

**Expected:**
- Article saved as draft
- Only you (and admins) can see it

---

#### TC-KB-004: Publish Article
**Role:** Admin or Manager
**Steps:**
1. Open a draft article
2. Click "Publish"
3. Confirm

**Expected:**
- Article status: "PUBLISHED"
- Now visible to all users
- Appears in search results

---

#### TC-KB-005: End User Cannot Create Articles
**Role:** End User
**Steps:**
1. Login as End User
2. Go to Knowledge Base

**Expected:**
- "Create Article" button is NOT visible
- End user can only search and read

---

## 3.9 PROJECTS MODULE

### What is the Projects Module?
A **Project Management** feature with Kanban boards for IT projects.
- Track tasks, bugs, features
- Organize in sprints
- Assign to team members

### Key Concepts
| Term | Meaning |
|------|---------|
| Project | A container for related work (e.g., "Website Redesign") |
| Project Key | Short code like "WEB", "API", "HR" (no hyphens!) |
| Task | A work item: task, bug, feature, or story |
| Task ID | Format: KEY-1, KEY-2, etc. (e.g., WEB-1, WEB-2) |
| Sprint | A time-boxed period (usually 2 weeks) |

### Task Status Columns
```
BACKLOG → TODO → IN_PROGRESS → IN_REVIEW → DONE
```

### Project Board (Kanban) Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Project: Website Redesign (WEB)                    [+ Create Task]         │
│  Sprint 1 (Dec 1-15) • 5 tasks • 21 story points                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BACKLOG      TODO          IN PROGRESS    IN REVIEW      DONE             │
│  (gray)       (blue)        (yellow)       (purple)       (green)          │
│  ┌─────┐      ┌─────┐       ┌─────┐        ┌─────┐       ┌─────┐          │
│  │WEB-5│      │WEB-2│       │WEB-1│        │WEB-4│       │WEB-3│          │
│  │     │      │     │       │     │        │     │       │     │          │
│  │📋 Task│    │🐛 Bug│      │✨Feature│    │📋 Task│     │📋 Task│         │
│  │🔴 High│    │🟡 Med│      │🔴 High│      │🟢 Low│      │🟡 Med│         │
│  │3 pts │      │2 pts│       │8 pts │       │1 pt  │      │5 pts │         │
│  │👤 John│    │👤 Jane│     │👤 Bob │      │👤 Amy │     │👤 Tom │        │
│  └─────┘      └─────┘       └─────┘        └─────┘       └─────┘          │
│               ┌─────┐                                                       │
│               │WEB-6│                                                       │
│               │Story│                                                       │
│               └─────┘                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Test Cases for Projects

#### TC-PROJ-001: Create Project
**Role:** Admin or Manager
**Steps:**
1. Login as Admin
2. Go to Projects page
3. Click "New Project"
4. Fill in:
   - Project Name: "Mobile App Development"
   - Project Key: "MOB" (2-10 chars, letters & numbers only, NO HYPHENS)
   - Description: "Build iOS and Android app"
   - Project Lead: Select yourself or a manager
   - Start Date: Today
   - End Date: 3 months from now
5. Click "Create"

**Expected:**
- Project created
- Redirected to project board
- Empty board with status columns

**IMPORTANT - Project Key Rules:**
- ✅ Valid: "MOB", "WEB", "API", "HR2"
- ❌ Invalid: "MOB-1" (no hyphens), "A" (too short), "VERYLONGKEY" (too long)

---

#### TC-PROJ-002: Create Task in Project
**Role:** Any with project access
**Steps:**
1. Open a project board
2. Click "+ Create Task"
3. Fill in:
   - Title: "Design login screen"
   - Type: Feature
   - Priority: High
   - Description: Details about the work
   - Assignee: Select team member
   - Story Points: 5
   - Due Date: Pick a date
4. Click "Create"

**Expected:**
- Task created with ID "MOB-1" (or next number)
- Task appears in "BACKLOG" column
- Task card shows type icon, priority color, assignee

---

#### TC-PROJ-003: Drag Task on Kanban Board
**Role:** Assignee or Admin
**Steps:**
1. Open project board
2. Find a task in "TODO" column
3. Click and drag it
4. Drop it in "IN_PROGRESS" column

**Expected:**
- Task moves to new column
- Toast: "Task moved successfully"
- Status saved immediately

---

#### TC-PROJ-004: View Task Details
**Role:** Any with access
**Steps:**
1. Click on any task card

**Expected:**
- Modal/page opens with full details
- Can edit fields
- Can add comments
- Can change status

---

#### TC-PROJ-005: Create Sprint
**Role:** Project Lead or Admin
**Steps:**
1. Open project
2. Go to "Sprints" tab
3. Click "Create Sprint"
4. Fill in:
   - Sprint Name: "Sprint 1"
   - Goal: "Complete authentication module"
   - Start Date: Dec 1
   - End Date: Dec 15
5. Create

**Expected:**
- Sprint created (not started yet)
- Can add tasks to sprint

---

#### TC-PROJ-006: Start Sprint
**Role:** Project Lead
**Steps:**
1. Make sure sprint has tasks assigned to it
2. Click "Start Sprint"

**Expected:**
- Sprint becomes active
- Board shows sprint info bar
- Only active sprint tasks shown on board

---

#### TC-PROJ-007: Complete Sprint
**Role:** Project Lead
**Steps:**
1. When sprint end date reached (or manually)
2. Click "Complete Sprint"
3. Handle incomplete tasks:
   - Move to backlog
   - Move to next sprint
4. Confirm

**Expected:**
- Sprint marked complete
- Stats shown (completed points vs planned)
- Incomplete tasks moved as selected

---

## 3.10 LIVE CHAT MODULE

### What is Live Chat?
Real-time messaging between users and support agents.
- Users can chat with IT support
- Agents handle multiple conversations

### Test Cases for Chat

#### TC-CHAT-001: User Starts Chat
**Role:** End User
**Steps:**
1. Login as End User
2. Click "Chat" in sidebar
3. Click "Start New Conversation"
4. Select "IT Support" or available agent
5. Type message: "Hi, I need help with my email"
6. Send

**Expected:**
- Conversation created
- Message appears in chat window
- Waiting for agent response

---

#### TC-CHAT-002: Agent Responds to Chat
**Role:** Agent
**Steps:**
1. Login as Agent
2. Go to Chat
3. See incoming conversation notification
4. Click to open conversation
5. Read user's message
6. Type response: "Hi, I can help. What's the issue?"
7. Send

**Expected:**
- Agent can see user's messages
- Response sent
- User sees response in real-time

---

#### TC-CHAT-003: Chat Notification
**Role:** Agent (on different page)
**Steps:**
1. Login as Agent
2. Go to Dashboard (not Chat)
3. Have another user send you a chat message

**Expected:**
- Notification bell shows number
- Badge on Chat menu item
- Can click to go to Chat

---

## 3.11 REPORTS MODULE

### What Reports Are Available?
- Incident statistics (by status, priority, category)
- Agent performance (resolution time, volume)
- SLA compliance
- Change success rate
- Asset inventory

### Test Cases for Reports

#### TC-RPT-001: View Incident Report
**Role:** Manager or Admin
**Steps:**
1. Go to Reports page
2. Select "Incident Analytics"
3. Set date range: Last 30 days

**Expected:**
- Charts show:
  - Tickets by status (pie chart)
  - Tickets over time (line chart)
  - Top categories (bar chart)
- Numbers match actual data

---

#### TC-RPT-002: Export Report
**Role:** Manager or Admin
**Steps:**
1. Generate any report
2. Click "Export PDF" button
3. Save file

**Expected:**
- PDF downloads
- Contains report data and charts

---

#### TC-RPT-003: End User Cannot Access Reports
**Role:** End User
**Steps:**
1. Login as End User
2. Look at sidebar

**Expected:**
- "Reports" menu item is NOT visible
- If manually go to /reports URL → Access denied

---

## 3.12 SETTINGS MODULE

### Settings Available by Role

| Setting | Admin | Manager | Agent | User |
|---------|-------|---------|-------|------|
| General/System | ✅ | ❌ | ❌ | ❌ |
| Categories | ✅ | ✅ | ❌ | ❌ |
| SLA Policies | ✅ | ✅ | ❌ | ❌ |
| Service Templates | ✅ | ✅ | ❌ | ❌ |
| Groups | ✅ | ✅ | ❌ | ❌ |
| Users | ✅ | ❌ | ❌ | ❌ |
| Roles | ✅ | ❌ | ❌ | ❌ |
| Integrations | ✅ | ❌ | ❌ | ❌ |

### Test Cases for Settings

#### TC-SET-001: Manage Categories
**Role:** Admin
**Steps:**
1. Go to Settings → Categories
2. Click "Add Category"
3. Enter: "Printing Issues"
4. Add subcategories:
   - "Printer Offline"
   - "Paper Jam"
   - "Print Quality"
5. Save

**Expected:**
- Category created with subcategories
- Visible when creating tickets

---

#### TC-SET-002: Create SLA Policy
**Role:** Admin
**Steps:**
1. Go to Settings → SLA Policies
2. Click "Add Policy"
3. Enter:
   - Name: "Critical Incidents"
   - Condition: Priority = Critical
   - Response Time: 15 minutes
   - Resolution Time: 2 hours
4. Save

**Expected:**
- Policy created
- When creating Critical priority incident, SLA timer starts

---

#### TC-SET-003: Create Service Template
**Role:** Admin or Manager
**Steps:**
1. Go to Settings → Service Templates
2. Click "Add Template"
3. Enter:
   - Name: "New Laptop Request"
   - Icon: 💻
   - Description: "Request a new laptop computer"
   - Estimated Days: 7
   - Requires Approval: Yes
4. Save

**Expected:**
- Template created
- Appears in Service Catalog when users make requests

---

#### TC-SET-004: Manage Users
**Role:** Admin (ONLY)
**Steps:**
1. Go to Settings → Users
2. Click "Add User"
3. Enter:
   - Email: newagent@company.com
   - Full Name: New Agent
   - Role: Agent
   - Password: (set initial password)
4. Save

**Expected:**
- User created
- User can login with provided credentials

---

#### TC-SET-005: Manage Roles
**Role:** Admin (ONLY)
**Steps:**
1. Go to Settings → Roles
2. View existing roles
3. Click "Add Role"
4. Name: "Senior Agent"
5. Set permissions (checkboxes):
   - ✅ View all incidents
   - ✅ Edit all incidents
   - ✅ Create problems
   - ❌ Manage users
   - etc.
6. Save

**Expected:**
- Role created
- Can assign users to this role
- Users get specified permissions

---

#### TC-SET-006: End User Cannot Access Settings
**Role:** End User
**Steps:**
1. Login as End User
2. Look for Settings in sidebar

**Expected:**
- Settings menu NOT visible
- If manually go to /settings URL → Redirected or access denied

---

## 3.13 NOTIFICATIONS MODULE

### Notification Types
| Event | Who Gets Notified |
|-------|-------------------|
| Ticket assigned | Assigned agent |
| Ticket status changed | Reporter and assignee |
| Comment added | Reporter and assignee |
| SLA warning | Assignee and manager |
| SLA breach | Assignee, manager, admin |
| Change needs approval | Approvers |
| Change approved/rejected | Requester |

### Test Cases for Notifications

#### TC-NOTIF-001: In-App Notification
**Role:** Multiple users
**Steps:**
1. Login as Admin
2. Create incident and assign to Agent John
3. Login as Agent John
4. Look at notification bell (top right)

**Expected:**
- Bell shows number badge (1)
- Click bell → shows "You were assigned incident INC-XXX"
- Click notification → goes to that incident

---

#### TC-NOTIF-002: Email Notification
**Role:** Any
**Prerequisite:** Email must be configured (SMTP settings)
**Steps:**
1. Admin assigns ticket to agent@test.com
2. Check agent's email inbox

**Expected:**
- Email received: "You have been assigned ticket INC-XXX"
- Email contains link to ticket

**If email not received:**
- Check spam folder
- Verify SMTP is configured (ask Admin to check)
- Note: Email may not work if SMTP not set up

---

#### TC-NOTIF-003: Notification Preferences
**Role:** Any
**Steps:**
1. Go to Profile (click avatar → Profile)
2. Find "Notification Settings" section
3. Toggle off "Email on ticket assigned"
4. Save
5. Have someone assign you a ticket

**Expected:**
- In-app notification: YES
- Email notification: NO (because you turned it off)

---

## 3.14 AI CHATBOT MODULE

### What is the AI Chatbot?
An AI assistant that helps users:
- Find knowledge base articles
- Answer common questions
- Help create tickets

### Test Cases for AI Chatbot

#### TC-AI-001: Open AI Assistant
**Role:** Any
**Steps:**
1. Look for floating chat button (usually bottom right)
2. Click to open

**Expected:**
- Chat window opens
- Shows welcome message
- Has text input field

---

#### TC-AI-002: Ask Question
**Role:** Any
**Steps:**
1. Open AI Assistant
2. Type: "How do I reset my password?"
3. Send

**Expected:**
- AI responds with helpful answer
- May suggest KB articles
- Response is relevant to question

---

#### TC-AI-003: AI Suggests Creating Ticket
**Role:** End User
**Steps:**
1. Open AI Assistant
2. Type: "My laptop is broken and I need help"
3. AI may ask clarifying questions
4. Eventually AI suggests: "Would you like me to create a support ticket?"
5. Confirm

**Expected:**
- Ticket created with details from conversation
- Ticket ID provided
- Can view ticket in My Incidents

---

# PART 4: INTEGRATION FLOWS

## 4.1 End-to-End: User Reports Problem → Agent Resolves

### Complete Flow
```
1. End User creates incident: "My email won't send"
2. System assigns ticket ID: INC-050
3. Manager sees new ticket, assigns to Agent John
4. Agent John receives notification
5. Agent John investigates, adds comment: "Please try clearing cache"
6. End User replies: "That worked!"
7. Agent John changes status to RESOLVED
8. End User confirms, ticket CLOSED
```

### How to Test This Flow

**Step 1: End User Creates Ticket**
- Login as End User
- Create incident: "My email won't send attachments"
- Note the ticket ID

**Step 2: Manager Assigns**
- Logout, login as Manager
- Go to Incidents
- Find the new ticket
- Assign to an Agent
- Verify agent notification

**Step 3: Agent Works Ticket**
- Logout, login as Agent
- Check notifications (should see assignment)
- Open the ticket
- Add comment: "Please check file size"
- Change status to IN_PROGRESS

**Step 4: User Responds**
- Login as End User
- Open your ticket
- Add comment: "Files are under 1MB"

**Step 5: Agent Resolves**
- Login as Agent
- Read user response
- Add comment: "Fixed the mail server config"
- Change status to RESOLVED

**Step 6: User Confirms & Close**
- Login as End User
- See resolved status
- Add comment: "Confirmed working"
- (Agent or Admin closes the ticket)

---

## 4.2 End-to-End: Change Request Approval

### Complete Flow
```
1. Agent creates change request for server upgrade
2. Agent submits for approval
3. Manager 1 reviews and approves
4. Manager 2 reviews and approves
5. Change status becomes APPROVED
6. Agent implements change
7. Agent marks change as COMPLETED (successful)
```

### How to Test This Flow

**Step 1-2: Agent Creates and Submits**
- Login as Agent
- Create change with all required fields
- Submit for approval

**Step 3-4: Managers Approve**
- Login as Manager 1
- Open change, click Approve
- Login as Manager 2 (if required)
- Open change, click Approve

**Step 5: Check Status**
- Change should now be APPROVED

**Step 6-7: Implement**
- Login as Agent
- Open approved change
- Click "Start Implementation"
- (Do the work)
- Click "Complete" → Select "Successful"

---

## 4.3 End-to-End: Problem Investigation

### Complete Flow
```
1. Multiple users report similar incidents
2. Agent notices pattern, creates Problem record
3. Agent links all related incidents
4. Agent investigates, adds Root Cause
5. Agent adds Workaround (temporary fix)
6. Agent works on permanent solution
7. Problem resolved, incidents updated
```

### How to Test This Flow

**Step 1: Create Multiple Incidents**
- Create 3 incidents about "Network slow"
- All slightly different descriptions

**Step 2: Create Problem**
- Login as Agent
- Create problem: "Network slowdown affecting Building A"
- Link the 3 incidents

**Step 3-4: Add RCA**
- Add Root Cause: "Network switch firmware bug"

**Step 5: Add Workaround**
- Add Workaround: "Restart switch daily at 6am"

**Step 6-7: Resolve**
- Add Solution: "Upgraded switch firmware to v2.3"
- Change problem status to RESOLVED
- Verify linked incidents are notified

---

# PART 5: SECURITY TESTS

## 5.1 Test Unauthorized Access

#### TC-SEC-001: Access Without Login
**Steps:**
1. Open browser
2. Directly go to: `/dashboard`

**Expected:**
- Redirected to login page
- Cannot see any data

---

#### TC-SEC-002: User Accessing Admin Pages
**Role:** End User
**Steps:**
1. Login as End User
2. Manually type URL: `/settings/users`

**Expected:**
- Access denied message OR
- Redirected to dashboard
- Cannot see user management

---

#### TC-SEC-003: Agent Accessing Other's Tickets
**Role:** Agent
**Steps:**
1. Login as Agent A
2. Find a ticket assigned to Agent B
3. Try to view it

**Expected:**
- If system allows viewing: Can view but not reassign (depending on config)
- If restricted: Cannot view ticket

---

## 5.2 Test Input Validation

#### TC-SEC-004: XSS Prevention
**Steps:**
1. Create incident with title: `<script>alert('XSS')</script>`
2. Save and view the incident

**Expected:**
- Script does NOT execute
- Text is displayed as plain text (escaped)

---

#### TC-SEC-005: SQL Injection Prevention
**Steps:**
1. In search box, type: `'; DROP TABLE users; --`
2. Search

**Expected:**
- Search completes normally (no results)
- Database is NOT damaged
- No errors shown

---

# PART 6: PERFORMANCE TESTS

## 6.1 Page Load Times

Test each page and note how long it takes to load:

| Page | Acceptable | Notes |
|------|------------|-------|
| Login | < 2 sec | |
| Dashboard | < 3 sec | |
| Incidents List | < 3 sec | |
| Incident Detail | < 2 sec | |
| Projects Board | < 3 sec | |
| Reports | < 5 sec | May be slower |

## 6.2 How to Measure

1. Open browser DevTools (F12)
2. Go to "Network" tab
3. Refresh the page
4. Look at total load time at bottom

---

# PART 7: MOBILE TESTING

## 7.1 Test on Mobile Devices

Test the application on:
- iPhone (Safari)
- Android (Chrome)
- Tablet

### What to Check

#### TC-MOB-001: Navigation
1. Open app on mobile
2. Sidebar should be hidden (hamburger menu)
3. Click hamburger → sidebar slides in
4. Click menu item → page loads, menu closes

#### TC-MOB-002: Forms
1. Open any form (create incident)
2. Fields should be full width
3. Keyboard opens when tapping field
4. Can scroll form
5. Can submit form

#### TC-MOB-003: Tables
1. Open Incidents list
2. Table may become scrollable horizontally
3. Or cards view instead of table
4. Can tap to open details

#### TC-MOB-004: Kanban
1. Open Incidents Kanban view
2. Columns scroll horizontally
3. Can drag cards (if supported)
4. Or tap to change status

---

# PART 8: BUG REPORTING

## Bug Report Template

When you find a bug, document it like this:

```
BUG REPORT
==========

Bug ID: BUG-001
Date: December 11, 2024
Tester: [Your Name]
Severity: Critical / High / Medium / Low

ENVIRONMENT
-----------
Browser: Chrome 120
OS: Windows 11
Screen: 1920x1080
User Role: Admin

DESCRIPTION
-----------
What happened: Cannot create incident - button does nothing

STEPS TO REPRODUCE
------------------
1. Login as Admin
2. Go to Incidents
3. Click "Create Incident"
4. Fill in all fields
5. Click "Create" button
6. Nothing happens

EXPECTED RESULT
---------------
Incident should be created and I should see success message

ACTUAL RESULT
-------------
Button does nothing, no error message, incident not created

SCREENSHOT
----------
[Attach screenshot]

CONSOLE ERRORS
--------------
Error: POST /api/v1/tickets failed with 500
Uncaught TypeError: Cannot read property 'id' of undefined

ADDITIONAL NOTES
----------------
Only happens when Category is not selected
```

## Severity Definitions

| Severity | Definition | Example |
|----------|------------|---------|
| Critical | System unusable, data loss | Cannot login, database corrupted |
| High | Major feature broken, no workaround | Cannot create tickets |
| Medium | Feature broken but has workaround | Filter doesn't work, but can search |
| Low | Minor issue, cosmetic | Typo, alignment off |

---

# PART 9: TEST EXECUTION CHECKLIST

## Pre-Testing Setup
- [ ] Test accounts created for all roles
- [ ] Browser cache cleared
- [ ] Know the test environment URL
- [ ] Have access to email for notifications

## Daily Testing Routine

### Authentication (10 minutes)
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Logout and verify

### Incidents (30 minutes)
- [ ] Create incident as End User
- [ ] Create incident as Admin
- [ ] View incident list
- [ ] Use filters
- [ ] Open incident detail
- [ ] Add comment
- [ ] Change status
- [ ] Assign incident
- [ ] Kanban drag and drop

### Service Requests (15 minutes)
- [ ] View service catalog
- [ ] Create service request
- [ ] Approve/reject as manager

### Changes (20 minutes)
- [ ] Create change request
- [ ] Submit for approval
- [ ] Approve as manager
- [ ] Reject and verify

### Projects (20 minutes)
- [ ] Create project
- [ ] Create task
- [ ] Drag task on Kanban
- [ ] Create sprint

### Knowledge Base (10 minutes)
- [ ] Search KB
- [ ] Browse categories
- [ ] Create article (as agent)

### Settings (15 minutes)
- [ ] Verify role access restrictions
- [ ] Create category
- [ ] Create service template

### Reports (10 minutes)
- [ ] View report
- [ ] Export report

---

# PART 10: QUICK REFERENCE

## URLs
| Page | URL |
|------|-----|
| Login | /login |
| Dashboard | /dashboard |
| Incidents | /incidents |
| Service Requests | /service-requests |
| Problems | /problems |
| Changes | /changes |
| Assets | /assets |
| Knowledge Base | /knowledge |
| Projects | /projects |
| Reports | /reports |
| Settings | /settings |
| Profile | /profile |

## Status Colors (Typical)
- 🔵 Blue = New
- 🟡 Yellow = Open / In Progress
- 🟠 Orange = Pending
- 🟢 Green = Resolved / Done
- ⚫ Gray = Closed

## Priority Colors
- 🔴 Red = Critical / High
- 🟡 Yellow = Medium
- 🟢 Green = Low

## Keyboard Shortcuts (if implemented)
- `?` = Show shortcuts help
- `c` = Create new item
- `s` = Focus search
- `Esc` = Close modal

---

**END OF QA TESTING GUIDE**

*Document Version: 2.0*
*Created: December 2024*
*For: QA Team*
