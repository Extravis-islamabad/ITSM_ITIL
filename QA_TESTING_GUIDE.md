# ITSM Platform - QA Testing Guide

## Document Information
| Field | Value |
|-------|-------|
| Version | 1.0 |
| Last Updated | December 2024 |
| Application URL | http://itsm-alb-711993406.eu-north-1.elb.amazonaws.com |
| API Base URL | /api/v1 |

---

## Table of Contents

1. [Test Environment Setup](#1-test-environment-setup)
2. [Test Accounts](#2-test-accounts)
3. [Module Test Cases](#3-module-test-cases)
   - [3.1 Authentication](#31-authentication)
   - [3.2 Dashboard](#32-dashboard)
   - [3.3 Incidents](#33-incidents)
   - [3.4 Service Requests](#34-service-requests)
   - [3.5 Problems](#35-problems)
   - [3.6 Changes](#36-changes)
   - [3.7 Assets](#37-assets)
   - [3.8 Knowledge Base](#38-knowledge-base)
   - [3.9 Projects](#39-projects)
   - [3.10 Live Chat](#310-live-chat)
   - [3.11 Reports](#311-reports)
   - [3.12 Settings & Administration](#312-settings--administration)
   - [3.13 User Management](#313-user-management)
   - [3.14 Notifications](#314-notifications)
   - [3.15 AI Chatbot](#315-ai-chatbot)
4. [Integration Tests](#4-integration-tests)
5. [Performance Tests](#5-performance-tests)
6. [Security Tests](#6-security-tests)
7. [UI/UX Tests](#7-uiux-tests)
8. [Mobile Responsiveness](#8-mobile-responsiveness)
9. [Bug Report Template](#9-bug-report-template)
10. [Test Execution Checklist](#10-test-execution-checklist)

---

## 1. Test Environment Setup

### Browser Requirements
- Chrome (latest) - Primary
- Firefox (latest) - Secondary
- Edge (latest) - Secondary
- Safari (latest) - Mac only

### Screen Resolutions to Test
| Device Type | Resolution |
|-------------|------------|
| Desktop Large | 1920x1080 |
| Desktop Medium | 1366x768 |
| Tablet Landscape | 1024x768 |
| Tablet Portrait | 768x1024 |
| Mobile Large | 414x896 |
| Mobile Small | 375x667 |

### Pre-requisites
- [ ] Clear browser cache before testing
- [ ] Disable browser extensions (especially ad blockers)
- [ ] Enable browser console for error monitoring
- [ ] Have screenshot tool ready
- [ ] Access to test email inbox for notification testing

---

## 2. Test Accounts

### Role-Based Test Accounts

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Super Admin | admin@test.com | TestAdmin123! | Full access to all modules |
| Manager | manager@test.com | TestManager123! | Manage team, approve changes |
| Agent | agent@test.com | TestAgent123! | Handle tickets, view reports |
| End User | user@test.com | TestUser123! | Create tickets, view own items |

### Create Test Accounts (if not exists)
1. Login as Super Admin
2. Go to Settings → Users
3. Create users with above credentials
4. Assign appropriate roles

---

## 3. Module Test Cases

### 3.1 Authentication

#### TC-AUTH-001: User Login - Valid Credentials
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User account exists and is active |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to login page | Login form displayed |
| 2 | Enter valid email | Email accepted |
| 3 | Enter valid password | Password masked |
| 4 | Click "Sign In" button | User redirected to dashboard |
| 5 | Check navigation menu | Menu items match user role |

---

#### TC-AUTH-002: User Login - Invalid Credentials
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | None |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to login page | Login form displayed |
| 2 | Enter invalid email | Email accepted |
| 3 | Enter wrong password | Password masked |
| 4 | Click "Sign In" button | Error message: "Invalid credentials" |
| 5 | Verify user stays on login page | Login form still visible |

---

#### TC-AUTH-003: User Login - Empty Fields
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | None |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to login page | Login form displayed |
| 2 | Leave email empty | - |
| 3 | Leave password empty | - |
| 4 | Click "Sign In" button | Validation error on both fields |

---

#### TC-AUTH-004: User Logout
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User is logged in |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click user avatar/menu | Dropdown menu appears |
| 2 | Click "Logout" | User redirected to login page |
| 3 | Try to access dashboard URL directly | Redirected to login page |
| 4 | Press browser back button | Should not access protected pages |

---

#### TC-AUTH-005: Password Reset Request
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Valid user email exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Forgot Password" link | Password reset form displayed |
| 2 | Enter registered email | Email accepted |
| 3 | Click "Send Reset Link" | Success message displayed |
| 4 | Check email inbox | Reset email received |
| 5 | Click reset link in email | Password reset page opens |
| 6 | Enter new password | Password accepted |
| 7 | Confirm new password | Passwords match |
| 8 | Submit | Success message, redirected to login |
| 9 | Login with new password | Login successful |

---

#### TC-AUTH-006: Session Timeout
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | User is logged in |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login to application | Dashboard displayed |
| 2 | Wait for session timeout (30 min) | - |
| 3 | Try to perform any action | Redirected to login with message |

---

#### TC-AUTH-007: Token Refresh
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | User is logged in |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login and stay active | Session remains active |
| 2 | Monitor network requests | Token refresh occurs automatically |
| 3 | Continue using application | No interruption to user |

---

### 3.2 Dashboard

#### TC-DASH-001: Dashboard Load
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User is logged in |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Dashboard | Dashboard page loads |
| 2 | Verify stat cards | Open Incidents, Pending Changes, etc. displayed |
| 3 | Verify charts load | Charts render with data |
| 4 | Verify recent activity | Recent items list populated |

---

#### TC-DASH-002: Dashboard Stats Accuracy
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Some tickets/changes exist in system |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Note "Open Incidents" count on dashboard | Count noted |
| 2 | Navigate to Incidents page | - |
| 3 | Filter by "Open" status | - |
| 4 | Compare counts | Dashboard count matches filtered count |
| 5 | Repeat for other stats | All counts accurate |

---

#### TC-DASH-003: Dashboard Quick Actions
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | User is logged in |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Create Incident" quick action | Create incident modal opens |
| 2 | Close modal | - |
| 3 | Click "View Reports" quick action | Reports page opens |

---

#### TC-DASH-004: Dashboard Role-Based Content
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Multiple role accounts |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Admin | Full dashboard with all stats |
| 2 | Logout and login as Agent | Agent-specific dashboard |
| 3 | Logout and login as End User | Limited dashboard (own tickets only) |

---

### 3.3 Incidents

#### TC-INC-001: Create Incident - All Fields
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User logged in with create permission |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Incidents | Incidents list page |
| 2 | Click "Create Incident" | Create modal opens |
| 3 | Enter Title: "Test Incident 001" | Title accepted |
| 4 | Enter Description: "Detailed description..." | Description accepted |
| 5 | Select Category | Category selected |
| 6 | Select Priority: "High" | Priority set |
| 7 | Select Assignee | Assignee selected |
| 8 | Click "Create" | Incident created, toast success |
| 9 | Verify in list | New incident appears at top |
| 10 | Click to view details | All entered data displayed correctly |

---

#### TC-INC-002: Create Incident - Required Fields Only
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | User logged in |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Create Incident" | Create modal opens |
| 2 | Enter only Title | - |
| 3 | Leave other fields empty/default | - |
| 4 | Click "Create" | Incident created successfully |

---

#### TC-INC-003: Create Incident - Validation
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | User logged in |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Create Incident" | Create modal opens |
| 2 | Leave Title empty | - |
| 3 | Click "Create" | Validation error: "Title is required" |
| 4 | Enter very long title (500+ chars) | Validation or truncation |

---

#### TC-INC-004: View Incident Details
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Incident exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Incidents | List displayed |
| 2 | Click on an incident | Detail page opens |
| 3 | Verify ticket number | Displayed correctly |
| 4 | Verify title and description | Displayed correctly |
| 5 | Verify status badge | Correct status shown |
| 6 | Verify priority badge | Correct priority shown |
| 7 | Verify assignee | Correct assignee or "Unassigned" |
| 8 | Verify activity timeline | Shows creation and updates |

---

#### TC-INC-005: Update Incident Status
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Incident exists, user has permission |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open incident detail | Detail page displayed |
| 2 | Click status dropdown/button | Status options shown |
| 3 | Select "In Progress" | Confirmation or immediate update |
| 4 | Verify status change | Status badge updated |
| 5 | Check activity timeline | Status change logged |
| 6 | Verify assignee notification | Notification sent (if configured) |

---

#### TC-INC-006: Assign Incident
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Incident exists, user has permission |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open incident detail | Detail page displayed |
| 2 | Click "Assign" button | Assignment modal/dropdown |
| 3 | Select an agent | Agent selected |
| 4 | Confirm assignment | Assignment saved |
| 5 | Verify assignee display | New assignee shown |
| 6 | Check assignee received notification | Email/in-app notification |

---

#### TC-INC-007: Add Comment to Incident
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Incident exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open incident detail | Detail page displayed |
| 2 | Scroll to comments section | Comments visible |
| 3 | Enter comment text | Text entered |
| 4 | Click "Add Comment" | Comment saved |
| 5 | Verify comment appears | Comment in list with timestamp |
| 6 | Verify commenter name | Your name displayed |

---

#### TC-INC-008: Filter Incidents
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Multiple incidents exist |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Incidents | All incidents shown |
| 2 | Filter by Status: "Open" | Only open incidents shown |
| 3 | Clear filter | All incidents shown |
| 4 | Filter by Priority: "Critical" | Only critical shown |
| 5 | Filter by Assignee | Only that assignee's tickets |
| 6 | Combine multiple filters | Intersection of filters |

---

#### TC-INC-009: Search Incidents
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Multiple incidents exist |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter search term in search box | - |
| 2 | Press Enter or wait for debounce | Search executed |
| 3 | Verify results match title/description | Relevant results shown |
| 4 | Clear search | All incidents shown |
| 5 | Search by ticket number | Exact ticket found |

---

#### TC-INC-010: Incidents Kanban View
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Multiple incidents in different statuses |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Incidents | Table view shown |
| 2 | Click "Kanban" view toggle | Kanban board displayed |
| 3 | Verify columns | NEW, OPEN, IN_PROGRESS, PENDING, RESOLVED, CLOSED |
| 4 | Verify tickets in correct columns | Tickets grouped by status |
| 5 | Drag ticket to another column | Status updates |
| 6 | Verify ticket moved | Now in new column |
| 7 | Check toast notification | "Status updated" message |

---

#### TC-INC-011: Incidents Pagination
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | More than 20 incidents exist |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Incidents (Table view) | First page shown |
| 2 | Verify pagination info | "Showing 1-20 of X" |
| 3 | Click "Next" | Page 2 loaded |
| 4 | Verify different incidents | Not duplicates |
| 5 | Click "Previous" | Back to page 1 |

---

#### TC-INC-012: Edit Incident
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Incident exists, user has permission |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open incident detail | Detail page displayed |
| 2 | Click "Edit" button | Edit page/modal opens |
| 3 | Modify title | Title changed |
| 4 | Modify description | Description changed |
| 5 | Modify priority | Priority changed |
| 6 | Save changes | Changes saved |
| 7 | Verify updates displayed | New values shown |
| 8 | Check activity timeline | Edit logged |

---

#### TC-INC-013: Delete Incident
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Incident exists, user is admin |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open incident detail | Detail page displayed |
| 2 | Click "Delete" button | Confirmation dialog |
| 3 | Confirm deletion | Incident deleted |
| 4 | Verify redirect to list | Incident not in list |

---

### 3.4 Service Requests

#### TC-SR-001: View Service Catalog
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Service templates exist |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Service Requests | Service Requests page |
| 2 | Click "New Request" | Service catalog modal |
| 3 | Verify templates displayed | Template cards with icons |
| 4 | Verify template details | Name, description, estimated days |

---

#### TC-SR-002: Create Service Request
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Service templates exist |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Request" | Service catalog shown |
| 2 | Select a template | Request form opens |
| 3 | Fill required fields | Fields populated |
| 4 | Submit request | Request created |
| 5 | Verify in list | New request appears |

---

#### TC-SR-003: Service Request - No Templates
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | No active templates exist |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Request" | Modal opens |
| 2 | Verify empty state | "No Service Templates Available" message |
| 3 | Verify admin link | Link to create templates (for admins) |

---

#### TC-SR-004: Service Request Approval Flow
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Request with approval requirement exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create request requiring approval | Request created with "Pending Approval" |
| 2 | Login as approver | - |
| 3 | Navigate to request | Approve/Reject buttons visible |
| 4 | Click "Approve" | Request approved |
| 5 | Verify status change | Status updated |
| 6 | Check requester notification | Requester notified |

---

### 3.5 Problems

#### TC-PROB-001: Create Problem Record
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User has problem management access |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Problems | Problems list |
| 2 | Click "Create Problem" | Create modal |
| 3 | Enter Title | Title accepted |
| 4 | Enter Description | Description accepted |
| 5 | Select Priority | Priority set |
| 6 | Select Category | Category set |
| 7 | Submit | Problem created |

---

#### TC-PROB-002: Link Incident to Problem
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Problem and incidents exist |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open problem detail | Detail page |
| 2 | Click "Link Incident" | Incident selector |
| 3 | Select incident(s) | Incidents selected |
| 4 | Confirm linking | Incidents linked |
| 5 | Verify linked incidents list | Incidents shown under problem |

---

#### TC-PROB-003: Add Root Cause Analysis
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Problem exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open problem detail | Detail page |
| 2 | Click "Add RCA" | RCA form |
| 3 | Enter root cause description | Text entered |
| 4 | Save RCA | RCA saved |
| 5 | Verify RCA displayed | RCA section shows content |

---

#### TC-PROB-004: Add Workaround
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Problem exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open problem detail | Detail page |
| 2 | Click "Add Workaround" | Workaround form |
| 3 | Enter workaround steps | Text entered |
| 4 | Save workaround | Workaround saved |
| 5 | Verify workaround displayed | Workaround visible |

---

#### TC-PROB-005: Add Permanent Solution
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Problem exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open problem detail | Detail page |
| 2 | Click "Add Solution" | Solution form |
| 3 | Enter solution details | Text entered |
| 4 | Save solution | Solution saved |
| 5 | Verify solution displayed | Solution visible |

---

#### TC-PROB-006: Problem Status Workflow
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Problem exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create new problem | Status: "New" |
| 2 | Change to "Under Investigation" | Status updates |
| 3 | Add RCA and change to "Known Error" | Status updates |
| 4 | Add solution and change to "Resolved" | Status updates |
| 5 | Close problem | Status: "Closed" |

---

### 3.6 Changes

#### TC-CHG-001: Create Change Request
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User has change management access |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Changes | Changes list |
| 2 | Click "Create Change" | Create page |
| 3 | Enter Title | Title accepted |
| 4 | Enter Description | Description accepted |
| 5 | Select Change Type (Standard/Normal/Emergency) | Type set |
| 6 | Select Risk Level | Risk set |
| 7 | Enter Implementation Plan | Plan entered |
| 8 | Enter Rollback Plan | Rollback entered |
| 9 | Set Scheduled Start/End | Dates set |
| 10 | Submit | Change created |

---

#### TC-CHG-002: Change Approval Workflow
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Change request exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open change detail | Detail page |
| 2 | Click "Submit for Approval" | Approval requested |
| 3 | Verify status: "Pending Approval" | Status shown |
| 4 | Login as CAB member/approver | - |
| 5 | Navigate to change | Approve/Reject visible |
| 6 | Click "Approve" | Approval recorded |
| 7 | Check all required approvals | If all approved → "Approved" |

---

#### TC-CHG-003: Change Rejection
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Change pending approval |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as approver | - |
| 2 | Open change pending approval | Detail page |
| 3 | Click "Reject" | Rejection form |
| 4 | Enter rejection reason | Reason required |
| 5 | Confirm rejection | Change rejected |
| 6 | Verify status: "Rejected" | Status updated |
| 7 | Check requester notification | Notification sent |

---

#### TC-CHG-004: Implement Change
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Change is approved |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open approved change | Detail page |
| 2 | Click "Start Implementation" | Status: "In Progress" |
| 3 | Add implementation notes | Notes saved |
| 4 | Click "Complete" | Completion form |
| 5 | Select outcome (Successful/Failed) | Outcome recorded |
| 6 | If failed, execute rollback | Rollback steps shown |

---

#### TC-CHG-005: Emergency Change
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | User has emergency change permission |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create change with type "Emergency" | Emergency flag set |
| 2 | Verify expedited workflow | Reduced approval requirements |
| 3 | Complete emergency change | Post-implementation review required |

---

### 3.7 Assets

#### TC-ASSET-001: Create Asset
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Asset types exist |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Assets | Assets list |
| 2 | Click "Add Asset" | Create form |
| 3 | Select Asset Type | Type selected |
| 4 | Enter Name | Name accepted |
| 5 | Enter Asset Tag | Tag accepted |
| 6 | Enter Serial Number | Serial accepted |
| 7 | Select Status | Status set |
| 8 | Select Assigned User | User assigned |
| 9 | Enter Location | Location entered |
| 10 | Save | Asset created |

---

#### TC-ASSET-002: View Asset Details
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Asset exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Assets | Assets list |
| 2 | Click on an asset | Detail page |
| 3 | Verify all fields displayed | All data shown |
| 4 | Verify linked tickets | Related incidents shown |
| 5 | Verify asset history | History timeline |

---

#### TC-ASSET-003: Edit Asset
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Asset exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open asset detail | Detail page |
| 2 | Click "Edit" | Edit mode |
| 3 | Modify fields | Changes made |
| 4 | Save | Changes saved |
| 5 | Verify updates | New values displayed |

---

#### TC-ASSET-004: Asset Assignment
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Asset exists, user exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open asset detail | Detail page |
| 2 | Change assigned user | User selector |
| 3 | Select new user | User selected |
| 4 | Save | Assignment saved |
| 5 | Verify history | Assignment logged |

---

#### TC-ASSET-005: Asset Type Management
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Admin access |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Assets → Asset Types | Types list |
| 2 | Click "Add Type" | Create form |
| 3 | Enter type name | Name accepted |
| 4 | Add custom fields | Fields added |
| 5 | Save | Type created |
| 6 | Create asset with new type | Custom fields appear |

---

#### TC-ASSET-006: Asset Search and Filter
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Multiple assets exist |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Search by asset name | Matching assets |
| 2 | Search by asset tag | Exact match |
| 3 | Filter by type | Only that type |
| 4 | Filter by status | Only that status |
| 5 | Filter by assigned user | Only their assets |

---

### 3.8 Knowledge Base

#### TC-KB-001: Create Article
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User has KB write access |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Knowledge Base | KB page |
| 2 | Click "Create Article" | Article editor |
| 3 | Enter Title | Title accepted |
| 4 | Select Category | Category selected |
| 5 | Enter content (rich text) | Content with formatting |
| 6 | Add tags | Tags added |
| 7 | Save as Draft | Article saved as draft |
| 8 | Publish | Article published |

---

#### TC-KB-002: Search Knowledge Base
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Published articles exist |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Knowledge Base | KB page |
| 2 | Enter search term | - |
| 3 | Execute search | Matching articles |
| 4 | Verify relevance | Title/content matches |

---

#### TC-KB-003: Browse by Category
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Articles in categories |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Knowledge Base | Categories shown |
| 2 | Click on a category | Category articles |
| 3 | Click subcategory | Filtered further |

---

#### TC-KB-004: Article Versioning
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Article exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open article | Article displayed |
| 2 | Edit article | Editor opens |
| 3 | Make changes | Changes made |
| 4 | Save | New version created |
| 5 | View version history | Previous versions listed |
| 6 | Revert to older version | Content restored |

---

#### TC-KB-005: KB Categories Management
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Admin access |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Settings → KB Categories | Categories list |
| 2 | Create new category | Category created |
| 3 | Create subcategory | Nested under parent |
| 4 | Reorder categories | Order saved |
| 5 | Delete empty category | Category removed |

---

### 3.9 Projects

#### TC-PROJ-001: Create Project
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User has project creation access |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Projects | Projects list |
| 2 | Click "New Project" | Create modal |
| 3 | Enter Project Name | Name accepted |
| 4 | Enter Project Key (e.g., "WEB") | Key accepted (uppercase, no hyphens) |
| 5 | Enter Description | Description accepted |
| 6 | Select Project Lead | Lead assigned |
| 7 | Set Start/End dates | Dates set |
| 8 | Submit | Project created |
| 9 | Verify redirect to project | Project board shown |

---

#### TC-PROJ-002: Project Key Validation
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | None |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Try key "WR-1" (with hyphen) | Error: only letters/numbers |
| 2 | Try key "A" (1 char) | Error: min 2 characters |
| 3 | Try key "VERYLONGKEY123" (>10 chars) | Error: max 10 characters |
| 4 | Try key "WR2" | Accepted |

---

#### TC-PROJ-003: Project Board View
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Project exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open project | Board tab active |
| 2 | Verify columns | BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE |
| 3 | Verify column colors | Each column has distinct color |
| 4 | Verify task cards | Tasks in correct columns |

---

#### TC-PROJ-004: Create Task
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Project exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open project board | Board displayed |
| 2 | Click "Create Task" | Task modal |
| 3 | Enter Title | Title accepted |
| 4 | Select Type (Task/Bug/Feature/Story) | Type set |
| 5 | Select Priority | Priority set |
| 6 | Select Assignee | Assignee set |
| 7 | Enter Story Points | Points set |
| 8 | Set Due Date | Date set |
| 9 | Submit | Task created |
| 10 | Verify task number | Format: KEY-1, KEY-2, etc. |

---

#### TC-PROJ-005: Drag Task on Kanban
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Tasks exist |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open project board | Board displayed |
| 2 | Drag task from BACKLOG | Dragging visual |
| 3 | Drop on IN_PROGRESS | Task moves |
| 4 | Verify status update | Task now in IN_PROGRESS |
| 5 | Verify toast message | "Task moved successfully" |

---

#### TC-PROJ-006: Create Sprint
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Project exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go to project Sprints tab | Sprints list |
| 2 | Click "Create Sprint" | Sprint modal |
| 3 | Enter Sprint Name | Name accepted |
| 4 | Enter Sprint Goal | Goal accepted |
| 5 | Set Start/End dates | Dates set |
| 6 | Submit | Sprint created |

---

#### TC-PROJ-007: Start Sprint
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Sprint exists with tasks |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go to Sprints tab | Sprint listed |
| 2 | Click "Start Sprint" | Confirmation |
| 3 | Confirm | Sprint started |
| 4 | Verify board shows sprint | Sprint info bar visible |
| 5 | Verify task count | Correct tasks in sprint |

---

#### TC-PROJ-008: Complete Sprint
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Sprint is active |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go to Sprints tab | Active sprint shown |
| 2 | Click "Complete Sprint" | Completion modal |
| 3 | Handle incomplete tasks | Move to backlog or next sprint |
| 4 | Confirm | Sprint completed |
| 5 | Verify sprint stats | Completed points shown |

---

#### TC-PROJ-009: Task Detail View
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Task exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on task card | Detail modal opens |
| 2 | Verify all fields | Title, description, type, priority, etc. |
| 3 | Verify assignee | Avatar and name |
| 4 | Verify story points | Points displayed |
| 5 | Add comment | Comment added |
| 6 | Change status | Status updated |
| 7 | Close modal | Modal closes |

---

#### TC-PROJ-010: Project Settings
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Project exists, user is lead/admin |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go to project Settings tab | Settings page |
| 2 | Edit project name | Name updated |
| 3 | Change project lead | Lead updated |
| 4 | Modify board columns | Columns updated |
| 5 | Add project member | Member added |
| 6 | Remove project member | Member removed |

---

### 3.10 Live Chat

#### TC-CHAT-001: Start New Conversation
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User logged in |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Chat | Chat interface |
| 2 | Click "New Conversation" | New chat modal |
| 3 | Select recipient(s) | Recipients selected |
| 4 | Enter initial message | Message typed |
| 5 | Send | Conversation created |

---

#### TC-CHAT-002: Send and Receive Messages
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Conversation exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open conversation | Chat history shown |
| 2 | Type message | Text in input |
| 3 | Press Enter or Send | Message sent |
| 4 | Verify message appears | Message in chat |
| 5 | Receive reply (from other user) | Reply appears in real-time |

---

#### TC-CHAT-003: Chat Notifications
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Two users logged in |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | User A sends message to User B | Message sent |
| 2 | User B (on different page) | Notification badge on Chat |
| 3 | User B opens Chat | Unread indicator on conversation |
| 4 | User B reads message | Unread cleared |

---

### 3.11 Reports

#### TC-RPT-001: View Dashboard Reports
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Data exists in system |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Reports | Reports page |
| 2 | Select report type | Report loads |
| 3 | Verify chart renders | Visual chart displayed |
| 4 | Verify data accuracy | Numbers match actual data |

---

#### TC-RPT-002: Generate Custom Report
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Data exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Reports | Reports page |
| 2 | Select date range | Range applied |
| 3 | Select filters | Filters applied |
| 4 | Generate report | Report generated |
| 5 | View results | Data displayed |

---

#### TC-RPT-003: Export Report
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Report generated |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate a report | Report displayed |
| 2 | Click "Export PDF" | PDF downloads |
| 3 | Open PDF | Report data in PDF |
| 4 | Click "Export Excel" | Excel downloads |
| 5 | Open Excel | Report data in spreadsheet |

---

#### TC-RPT-004: Schedule Report
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Report configuration exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Scheduled Reports | Schedules list |
| 2 | Click "Create Schedule" | Schedule form |
| 3 | Select report type | Type selected |
| 4 | Set frequency (daily/weekly/monthly) | Frequency set |
| 5 | Enter recipient emails | Emails entered |
| 6 | Save | Schedule created |
| 7 | Wait for scheduled time | Report email received |

---

### 3.12 Settings & Administration

#### TC-SET-001: Categories Management
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Admin access |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Settings → Categories | Categories page |
| 2 | Click "Add Category" | Create form |
| 3 | Enter category name | Name accepted |
| 4 | Add subcategories | Subcategories created |
| 5 | Edit existing category | Edit mode |
| 6 | Delete unused category | Category removed |

---

#### TC-SET-002: SLA Policies
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Admin access |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Settings → SLA Policies | SLA page |
| 2 | Click "Add Policy" | Policy form |
| 3 | Enter policy name | Name accepted |
| 4 | Set priority conditions | Conditions set |
| 5 | Set response time | Time set |
| 6 | Set resolution time | Time set |
| 7 | Save | Policy created |
| 8 | Create ticket matching conditions | SLA applied to ticket |

---

#### TC-SET-003: Service Request Templates
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Admin/Manager access |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Settings → Service Templates | Templates page |
| 2 | Click "Add Template" | Template form |
| 3 | Enter template name | Name accepted |
| 4 | Select icon | Icon selected |
| 5 | Enter description | Description accepted |
| 6 | Set estimated days | Days set |
| 7 | Toggle requires approval | Setting saved |
| 8 | Save | Template created |
| 9 | Verify in Service Catalog | Template appears |

---

#### TC-SET-004: Email Templates
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Admin access |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Settings → Email Templates | Templates list |
| 2 | Select template to edit | Editor opens |
| 3 | Modify subject | Subject updated |
| 4 | Modify body | Body updated |
| 5 | Use variables ({{ticket_number}}) | Variables accepted |
| 6 | Save | Template saved |
| 7 | Trigger email scenario | New template used |

---

#### TC-SET-005: Groups Management
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Admin access |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Settings → Groups | Groups page |
| 2 | Click "Add Group" | Create form |
| 3 | Enter group name | Name accepted |
| 4 | Add members | Members added |
| 5 | Save | Group created |
| 6 | Assign ticket to group | Group members can view |

---

#### TC-SET-006: System Settings
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Admin access |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Settings → System | System settings |
| 2 | Modify company name | Name updated |
| 3 | Change timezone | Timezone updated |
| 4 | Toggle features | Features enabled/disabled |
| 5 | Save | Settings saved |

---

### 3.13 User Management

#### TC-USER-001: Create User
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Admin access |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Settings → Users | Users list |
| 2 | Click "Add User" | Create form |
| 3 | Enter email | Email accepted |
| 4 | Enter full name | Name accepted |
| 5 | Select role | Role selected |
| 6 | Set password | Password set |
| 7 | Save | User created |
| 8 | New user logs in | Login successful |

---

#### TC-USER-002: Edit User
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | User exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Users | Users list |
| 2 | Click on user | User detail/edit |
| 3 | Modify name | Name updated |
| 4 | Change role | Role updated |
| 5 | Save | Changes saved |

---

#### TC-USER-003: Deactivate User
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | User exists |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Users | Users list |
| 2 | Click on user | User detail |
| 3 | Toggle "Active" off | User deactivated |
| 4 | Deactivated user tries to login | Login rejected |

---

#### TC-USER-004: Role Management
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Admin access |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Settings → Roles | Roles list |
| 2 | View existing roles | Roles displayed |
| 3 | Click "Add Role" | Create form |
| 4 | Enter role name | Name accepted |
| 5 | Set permissions | Permissions checked |
| 6 | Save | Role created |
| 7 | Assign user to new role | Role applied |
| 8 | Verify permissions | Access matches permissions |

---

#### TC-USER-005: Profile Management
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | User logged in |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click profile avatar | Profile menu |
| 2 | Click "Profile" | Profile page |
| 3 | Edit full name | Name updated |
| 4 | Upload avatar | Avatar uploaded |
| 5 | Change password | Password updated |
| 6 | Save | Changes saved |
| 7 | Verify avatar in header | New avatar shown |

---

### 3.14 Notifications

#### TC-NOTIF-001: In-App Notifications
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | User logged in |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Trigger notification event | (assign ticket to user) |
| 2 | Check notification bell | Badge shows count |
| 3 | Click notification bell | Dropdown with notifications |
| 4 | Click on notification | Navigate to related item |
| 5 | Mark as read | Notification marked |

---

#### TC-NOTIF-002: Email Notifications
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Email configured, user has email preferences on |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Assign ticket to user | Assignment made |
| 2 | Check user's email | Email notification received |
| 3 | Verify email content | Contains ticket details |
| 4 | Click link in email | Opens ticket in app |

---

#### TC-NOTIF-003: Notification Preferences
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | User logged in |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go to Profile → Notifications | Preferences page |
| 2 | Toggle "Email on ticket assigned" off | Preference saved |
| 3 | Assign ticket to user | Assignment made |
| 4 | Check email | No email received |
| 5 | Check in-app notification | Notification still received |

---

### 3.15 AI Chatbot

#### TC-AI-001: Open AI Assistant
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | AI chatbot enabled |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click AI Assistant button | Chat widget opens |
| 2 | Verify welcome message | Greeting displayed |
| 3 | Type question | Text entered |
| 4 | Send | Response generated |

---

#### TC-AI-002: KB Article Suggestions
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | KB articles exist |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open AI Assistant | Widget opens |
| 2 | Ask about common issue | - |
| 3 | Verify KB suggestions | Related articles shown |
| 4 | Click article link | Article opens |

---

#### TC-AI-003: Create Ticket via AI
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | AI chatbot enabled |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open AI Assistant | Widget opens |
| 2 | Describe an issue | - |
| 3 | AI suggests creating ticket | Option shown |
| 4 | Confirm ticket creation | Ticket created |
| 5 | Verify ticket details | AI-filled details correct |

---

## 4. Integration Tests

### TC-INT-001: Ticket to Asset Link
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create incident mentioning asset | Incident created |
| 2 | Link asset to incident | Asset linked |
| 3 | View asset detail | Incident appears in related |
| 4 | View incident detail | Asset appears in related |

---

### TC-INT-002: Problem to Incident Link
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create multiple related incidents | Incidents created |
| 2 | Create problem | Problem created |
| 3 | Link incidents to problem | Links established |
| 4 | Resolve problem | - |
| 5 | Verify incident notification | Linked incidents notified |

---

### TC-INT-003: Change to Ticket Link
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create change from incident | Change created with link |
| 2 | View change | Related incident shown |
| 3 | Complete change | - |
| 4 | Verify incident update | Incident reflects change |

---

### TC-INT-004: SLA Breach Workflow
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create high priority ticket | SLA timer starts |
| 2 | Wait for SLA warning threshold | Warning notification |
| 3 | Wait for SLA breach | Breach notification |
| 4 | Verify ticket flagged | SLA breach indicator |
| 5 | Check reports | Breach recorded in metrics |

---

## 5. Performance Tests

### TC-PERF-001: Page Load Times
| Page | Maximum Load Time |
|------|-------------------|
| Login | < 2 seconds |
| Dashboard | < 3 seconds |
| Incidents List | < 3 seconds |
| Incident Detail | < 2 seconds |
| Projects Board | < 3 seconds |
| Reports | < 5 seconds |

---

### TC-PERF-002: Search Performance
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Search with common term | Results < 2 seconds |
| 2 | Search with filters | Results < 2 seconds |
| 3 | Search across modules | Results < 3 seconds |

---

### TC-PERF-003: Bulk Operations
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Load 100+ tickets in list | Loads without hanging |
| 2 | Bulk update 50 tickets | Completes < 10 seconds |
| 3 | Export 1000 records | Export completes |

---

### TC-PERF-004: Concurrent Users
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 10 users access simultaneously | No errors |
| 2 | All perform CRUD operations | Operations complete |
| 3 | Verify no data corruption | Data integrity maintained |

---

## 6. Security Tests

### TC-SEC-001: SQL Injection
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter `'; DROP TABLE users; --` in search | No SQL executed |
| 2 | Enter SQL in form fields | Input sanitized |
| 3 | Check database | No damage |

---

### TC-SEC-002: XSS (Cross-Site Scripting)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter `<script>alert('XSS')</script>` in title | Script not executed |
| 2 | Enter script in description | Script sanitized |
| 3 | Enter script in comments | Script sanitized |

---

### TC-SEC-003: CSRF Protection
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Copy form from another site | - |
| 2 | Submit to API | Request rejected |

---

### TC-SEC-004: Authentication Bypass
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Access API without token | 401 Unauthorized |
| 2 | Access API with expired token | 401 Unauthorized |
| 3 | Access API with invalid token | 401 Unauthorized |
| 4 | Modify JWT token | Request rejected |

---

### TC-SEC-005: Authorization
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | User accesses admin endpoint | 403 Forbidden |
| 2 | Agent tries to delete user | 403 Forbidden |
| 3 | User A accesses User B's private data | 403 Forbidden |

---

### TC-SEC-006: Password Security
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set weak password "123" | Rejected |
| 2 | Set password without special char | Rejected (if policy) |
| 3 | View user in database | Password is hashed |

---

## 7. UI/UX Tests

### TC-UX-001: Form Validation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submit empty required field | Validation error shown |
| 2 | Enter invalid email format | Format error shown |
| 3 | Enter invalid date | Date error shown |
| 4 | Error messages are clear | User understands issue |

---

### TC-UX-002: Loading States
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Load any page | Loading spinner shown |
| 2 | Submit any form | Button shows loading state |
| 3 | Fetch data | Loading indicator visible |

---

### TC-UX-003: Error Handling
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Trigger API error | User-friendly error message |
| 2 | Network disconnection | Appropriate error shown |
| 3 | 404 page | Custom 404 page displayed |

---

### TC-UX-004: Toast Notifications
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create item successfully | Success toast appears |
| 2 | Update item successfully | Success toast appears |
| 3 | Error occurs | Error toast appears |
| 4 | Toast auto-dismisses | Dismisses after 3-5 seconds |

---

### TC-UX-005: Modal Behavior
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open modal | Modal centered, backdrop visible |
| 2 | Click outside modal | Modal closes (if dismissible) |
| 3 | Press Escape | Modal closes |
| 4 | Submit form in modal | Modal closes on success |

---

### TC-UX-006: Navigation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click sidebar menu item | Correct page loads |
| 2 | Active menu highlighted | Visual indicator on current page |
| 3 | Breadcrumbs clickable | Navigate correctly |
| 4 | Browser back button | Returns to previous page |

---

### TC-UX-007: Accessibility
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tab through form | Logical tab order |
| 2 | Screen reader test | Elements have labels |
| 3 | Color contrast | Meets WCAG standards |
| 4 | Focus indicators | Visible focus rings |

---

## 8. Mobile Responsiveness

### TC-MOB-001: Mobile Navigation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open on mobile | Hamburger menu visible |
| 2 | Click hamburger | Side menu slides in |
| 3 | Click menu item | Navigation works |
| 4 | Click outside menu | Menu closes |

---

### TC-MOB-002: Mobile Forms
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open create form | Form fits screen |
| 2 | Fields are full width | No horizontal scroll |
| 3 | Keyboard opens | Form scrolls appropriately |
| 4 | Submit form | Works correctly |

---

### TC-MOB-003: Mobile Tables
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View incidents list | Cards or scrollable table |
| 2 | Tap on item | Detail page opens |
| 3 | Horizontal scroll | Smooth scrolling |

---

### TC-MOB-004: Mobile Kanban
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View kanban on mobile | Horizontal scroll for columns |
| 2 | Tap card | Detail opens |
| 3 | Drag card | Works or alternative UI |

---

## 9. Bug Report Template

When reporting bugs, use this template:

```markdown
## Bug Report

**Bug ID:** BUG-XXX
**Date Found:** YYYY-MM-DD
**Reported By:** [Name]
**Severity:** Critical / High / Medium / Low
**Priority:** P1 / P2 / P3 / P4

### Environment
- Browser: Chrome 120
- OS: Windows 11
- Screen: 1920x1080
- User Role: Admin/Agent/User

### Description
Brief description of the bug

### Steps to Reproduce
1. Step one
2. Step two
3. Step three

### Expected Result
What should happen

### Actual Result
What actually happens

### Screenshots/Videos
[Attach files]

### Console Errors
```
Paste any console errors here
```

### Network Errors
[Include failed API calls if relevant]

### Additional Notes
Any other relevant information
```

---

## 10. Test Execution Checklist

### Pre-Release Checklist

#### Authentication
- [ ] TC-AUTH-001: Valid login
- [ ] TC-AUTH-002: Invalid login
- [ ] TC-AUTH-003: Empty fields
- [ ] TC-AUTH-004: Logout
- [ ] TC-AUTH-005: Password reset

#### Incidents
- [ ] TC-INC-001: Create incident
- [ ] TC-INC-004: View details
- [ ] TC-INC-005: Update status
- [ ] TC-INC-006: Assign
- [ ] TC-INC-007: Add comment
- [ ] TC-INC-008: Filter
- [ ] TC-INC-009: Search
- [ ] TC-INC-010: Kanban drag

#### Service Requests
- [ ] TC-SR-001: View catalog
- [ ] TC-SR-002: Create request
- [ ] TC-SR-004: Approval flow

#### Problems
- [ ] TC-PROB-001: Create problem
- [ ] TC-PROB-002: Link incident
- [ ] TC-PROB-003: Add RCA

#### Changes
- [ ] TC-CHG-001: Create change
- [ ] TC-CHG-002: Approval workflow
- [ ] TC-CHG-004: Implement

#### Assets
- [ ] TC-ASSET-001: Create asset
- [ ] TC-ASSET-002: View details
- [ ] TC-ASSET-003: Edit

#### Knowledge Base
- [ ] TC-KB-001: Create article
- [ ] TC-KB-002: Search

#### Projects
- [ ] TC-PROJ-001: Create project
- [ ] TC-PROJ-003: Board view
- [ ] TC-PROJ-004: Create task
- [ ] TC-PROJ-005: Drag task

#### Reports
- [ ] TC-RPT-001: View reports
- [ ] TC-RPT-003: Export

#### Settings
- [ ] TC-SET-001: Categories
- [ ] TC-SET-003: Service templates

#### Users
- [ ] TC-USER-001: Create user
- [ ] TC-USER-005: Profile

#### Security
- [ ] TC-SEC-001: SQL injection
- [ ] TC-SEC-002: XSS
- [ ] TC-SEC-004: Auth bypass
- [ ] TC-SEC-005: Authorization

#### UI/UX
- [ ] TC-UX-001: Form validation
- [ ] TC-UX-002: Loading states
- [ ] TC-UX-003: Error handling

#### Mobile
- [ ] TC-MOB-001: Navigation
- [ ] TC-MOB-002: Forms

---

## Appendix: API Endpoints Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/login | Login |
| POST | /api/v1/auth/logout | Logout |
| POST | /api/v1/auth/refresh | Refresh token |
| GET | /api/v1/auth/me | Get current user |

### Tickets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/tickets | List tickets |
| POST | /api/v1/tickets | Create ticket |
| GET | /api/v1/tickets/{id} | Get ticket |
| PUT | /api/v1/tickets/{id} | Update ticket |
| DELETE | /api/v1/tickets/{id} | Delete ticket |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/projects | List projects |
| POST | /api/v1/projects | Create project |
| GET | /api/v1/projects/{id} | Get project |
| GET | /api/v1/projects/{id}/tasks | Get tasks |
| POST | /api/v1/projects/{id}/tasks | Create task |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/users | List users |
| POST | /api/v1/users | Create user |
| GET | /api/v1/users/{id} | Get user |
| PUT | /api/v1/users/{id} | Update user |

---

**Document End**

*This document should be updated as new features are added to the platform.*
