from typing import Optional

class EmailTemplates:
    
    @staticmethod
    def get_base_template(content: str, title: str) -> str:
        """Base email template with SupportX branding"""
        return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f3f4f6;
        }}
        .email-container {{
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
        }}
        .logo {{
            max-width: 180px;
            height: auto;
            margin-bottom: 10px;
        }}
        .header-title {{
            color: #ffffff;
            font-size: 28px;
            font-weight: bold;
            margin: 15px 0 5px 0;
        }}
        .header-subtitle {{
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            margin: 0;
        }}
        .content {{
            padding: 40px 30px;
            color: #1f2937;
            line-height: 1.6;
        }}
        .content h2 {{
            color: #667eea;
            font-size: 22px;
            margin-top: 0;
            margin-bottom: 20px;
        }}
        .content p {{
            margin: 15px 0;
            font-size: 15px;
            color: #4b5563;
        }}
        .info-box {{
            background-color: #f9fafb;
            border-left: 4px solid #667eea;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .info-box-label {{
            font-weight: 600;
            color: #374151;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }}
        .info-box-value {{
            color: #1f2937;
            font-size: 15px;
            margin: 5px 0;
        }}
        .button {{
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            padding: 14px 35px;
            text-decoration: none;
            border-radius: 8px;
            margin: 25px 0;
            font-weight: 600;
            font-size: 15px;
            box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
            transition: all 0.3s ease;
        }}
        .button:hover {{
            box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
            transform: translateY(-2px);
        }}
        .divider {{
            height: 1px;
            background: linear-gradient(to right, transparent, #e5e7eb, transparent);
            margin: 30px 0;
        }}
        .footer {{
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }}
        .footer-text {{
            font-size: 13px;
            color: #6b7280;
            margin: 8px 0;
        }}
        .footer-links {{
            margin: 15px 0;
        }}
        .footer-link {{
            color: #667eea;
            text-decoration: none;
            margin: 0 10px;
            font-size: 13px;
        }}
        .social-icons {{
            margin: 20px 0 10px 0;
        }}
        .social-icon {{
            display: inline-block;
            width: 32px;
            height: 32px;
            margin: 0 5px;
            background-color: #667eea;
            border-radius: 50%;
            line-height: 32px;
            color: white;
            text-decoration: none;
        }}
        .badge {{
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin: 5px 0;
        }}
        .badge-high {{
            background-color: #fee2e2;
            color: #991b1b;
        }}
        .badge-medium {{
            background-color: #fef3c7;
            color: #92400e;
        }}
        .badge-low {{
            background-color: #d1fae5;
            color: #065f46;
        }}
        .badge-critical {{
            background-color: #fecaca;
            color: #7f1d1d;
        }}
        @media only screen and (max-width: 600px) {{
            .email-container {{
                margin: 0;
                border-radius: 0;
            }}
            .header {{
                padding: 30px 20px;
            }}
            .content {{
                padding: 30px 20px;
            }}
            .button {{
                display: block;
                text-align: center;
            }}
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1 class="header-title">🎫 SupportX</h1>
            <p class="header-subtitle">IT Service Management Platform</p>
        </div>
        <div class="content">
            {content}
        </div>
        <div class="footer">
            <p class="footer-text"><strong>SupportX</strong> - Enterprise IT Service Management</p>
            <p class="footer-text">Streamlining your IT operations with intelligent automation</p>
            <div class="footer-links">
                <a href="http://localhost:5173" class="footer-link">Dashboard</a>
                <a href="http://localhost:5173/help" class="footer-link">Help Center</a>
                <a href="http://localhost:5173/settings" class="footer-link">Settings</a>
            </div>
            <div class="divider"></div>
            <p class="footer-text">
                You're receiving this email because you're a user of SupportX.<br>
                To manage your notification preferences, <a href="http://localhost:5173/settings/notifications" class="footer-link">click here</a>.
            </p>
            <p class="footer-text" style="margin-top: 20px; font-size: 11px; color: #9ca3af;">
                © 2025 SupportX. All rights reserved.<br>
                This is an automated message, please do not reply to this email.
            </p>
        </div>
    </div>
</body>
</html>
"""
    
    @staticmethod
    def ticket_assigned(ticket_number: str, title: str, priority: str, assignee_name: str, action_url: str) -> str:
        """Email template for ticket assignment"""
        priority_badge = {
            'CRITICAL': '<span class="badge badge-critical">Critical Priority</span>',
            'HIGH': '<span class="badge badge-high">High Priority</span>',
            'MEDIUM': '<span class="badge badge-medium">Medium Priority</span>',
            'LOW': '<span class="badge badge-low">Low Priority</span>',
        }.get(priority, '<span class="badge badge-medium">Medium Priority</span>')
        
        content = f"""
            <h2>🎯 New Ticket Assigned to You</h2>
            <p>Hi {assignee_name},</p>
            <p>A new ticket has been assigned to you and requires your attention.</p>
            
            <div class="info-box">
                <div class="info-box-label">Ticket Number</div>
                <div class="info-box-value"><strong>{ticket_number}</strong></div>
                
                <div class="info-box-label" style="margin-top: 15px;">Title</div>
                <div class="info-box-value">{title}</div>
                
                <div class="info-box-label" style="margin-top: 15px;">Priority</div>
                <div class="info-box-value">{priority_badge}</div>
            </div>
            
            <p>Please review the ticket details and take necessary action.</p>
            
            <a href="{action_url}" class="button">View Ticket Details →</a>
            
            <div class="divider"></div>
            <p style="font-size: 13px; color: #6b7280;">
                <strong>Quick Tip:</strong> You can update the ticket status, add comments, or reassign it from the ticket detail page.
            </p>
        """
        return EmailTemplates.get_base_template(content, f"Ticket Assigned: {ticket_number}")
    
    @staticmethod
    def ticket_status_changed(ticket_number: str, title: str, old_status: str, new_status: str, user_name: str, action_url: str) -> str:
        """Email template for ticket status change"""
        content = f"""
            <h2>🔄 Ticket Status Updated</h2>
            <p>Hello,</p>
            <p>The status of your ticket has been updated by <strong>{user_name}</strong>.</p>
            
            <div class="info-box">
                <div class="info-box-label">Ticket Number</div>
                <div class="info-box-value"><strong>{ticket_number}</strong></div>
                
                <div class="info-box-label" style="margin-top: 15px;">Title</div>
                <div class="info-box-value">{title}</div>
                
                <div class="info-box-label" style="margin-top: 15px;">Status Change</div>
                <div class="info-box-value">
                    <span style="color: #9ca3af;">{old_status}</span> 
                    <span style="margin: 0 10px;">→</span> 
                    <strong style="color: #667eea;">{new_status}</strong>
                </div>
            </div>
            
            <a href="{action_url}" class="button">View Ticket →</a>
            
            <div class="divider"></div>
            <p style="font-size: 13px; color: #6b7280;">
                Stay updated with your ticket progress through real-time notifications.
            </p>
        """
        return EmailTemplates.get_base_template(content, f"Ticket Status Updated: {ticket_number}")
    
    @staticmethod
    def ticket_comment(ticket_number: str, title: str, commenter_name: str, comment_preview: str, action_url: str) -> str:
        """Email template for new ticket comment"""
        content = f"""
            <h2>💬 New Comment on Your Ticket</h2>
            <p>Hello,</p>
            <p><strong>{commenter_name}</strong> has added a comment to your ticket.</p>
            
            <div class="info-box">
                <div class="info-box-label">Ticket Number</div>
                <div class="info-box-value"><strong>{ticket_number}</strong></div>
                
                <div class="info-box-label" style="margin-top: 15px;">Title</div>
                <div class="info-box-value">{title}</div>
                
                <div class="info-box-label" style="margin-top: 15px;">Comment Preview</div>
                <div class="info-box-value" style="font-style: italic; color: #4b5563;">
                    "{comment_preview}"
                </div>
            </div>
            
            <a href="{action_url}" class="button">View Full Comment →</a>
            
            <div class="divider"></div>
            <p style="font-size: 13px; color: #6b7280;">
                Click the button above to read the full comment and reply if needed.
            </p>
        """
        return EmailTemplates.get_base_template(content, f"New Comment: {ticket_number}")
    
    @staticmethod
    def change_approval_needed(change_number: str, title: str, risk: str, planned_start: str, action_url: str) -> str:
        """Email template for change approval request"""
        risk_badge = {
            'CRITICAL': '<span class="badge badge-critical">Critical Risk</span>',
            'HIGH': '<span class="badge badge-high">High Risk</span>',
            'MEDIUM': '<span class="badge badge-medium">Medium Risk</span>',
            'LOW': '<span class="badge badge-low">Low Risk</span>',
        }.get(risk, '<span class="badge badge-medium">Medium Risk</span>')
        
        content = f"""
            <h2>⚠️ Change Approval Required</h2>
            <p>Hello,</p>
            <p>A change request requires your approval as a CAB (Change Advisory Board) member.</p>
            
            <div class="info-box">
                <div class="info-box-label">Change Number</div>
                <div class="info-box-value"><strong>{change_number}</strong></div>
                
                <div class="info-box-label" style="margin-top: 15px;">Title</div>
                <div class="info-box-value">{title}</div>
                
                <div class="info-box-label" style="margin-top: 15px;">Risk Level</div>
                <div class="info-box-value">{risk_badge}</div>
                
                <div class="info-box-label" style="margin-top: 15px;">Planned Start</div>
                <div class="info-box-value">{planned_start}</div>
            </div>
            
            <p><strong>Action Required:</strong> Please review the change details and provide your approval decision.</p>
            
            <a href="{action_url}" class="button">Review & Approve →</a>
            
            <div class="divider"></div>
            <p style="font-size: 13px; color: #6b7280;">
                <strong>Important:</strong> Timely approval helps maintain our change management SLAs and ensures smooth implementation.
            </p>
        """
        return EmailTemplates.get_base_template(content, f"Approval Required: {change_number}")
    
    @staticmethod
    def change_approved(change_number: str, title: str, approved_by: str, action_url: str) -> str:
        """Email template for change approval"""
        content = f"""
            <h2>✅ Change Request Approved</h2>
            <p>Good news!</p>
            <p>Your change request has been approved by <strong>{approved_by}</strong>.</p>
            
            <div class="info-box" style="border-left-color: #10b981; background-color: #d1fae5;">
                <div class="info-box-label">Change Number</div>
                <div class="info-box-value"><strong>{change_number}</strong></div>
                
                <div class="info-box-label" style="margin-top: 15px;">Title</div>
                <div class="info-box-value">{title}</div>
                
                <div class="info-box-label" style="margin-top: 15px;">Status</div>
                <div class="info-box-value"><strong style="color: #10b981;">✓ Approved</strong></div>
            </div>
            
            <p>You can now proceed with scheduling and implementing the change.</p>
            
            <a href="{action_url}" class="button">View Change Details →</a>
            
            <div class="divider"></div>
            <p style="font-size: 13px; color: #6b7280;">
                Next steps: Schedule the change and coordinate with your implementation team.
            </p>
        """
        return EmailTemplates.get_base_template(content, f"Change Approved: {change_number}")
    
    @staticmethod
    def change_rejected(change_number: str, title: str, rejected_by: str, reason: str, action_url: str) -> str:
        """Email template for change rejection"""
        content = f"""
            <h2>❌ Change Request Rejected</h2>
            <p>Hello,</p>
            <p>Your change request has been rejected by <strong>{rejected_by}</strong>.</p>
            
            <div class="info-box" style="border-left-color: #ef4444; background-color: #fee2e2;">
                <div class="info-box-label">Change Number</div>
                <div class="info-box-value"><strong>{change_number}</strong></div>
                
                <div class="info-box-label" style="margin-top: 15px;">Title</div>
                <div class="info-box-value">{title}</div>
                
                <div class="info-box-label" style="margin-top: 15px;">Rejection Reason</div>
                <div class="info-box-value" style="color: #7f1d1d;">{reason or 'No reason provided'}</div>
            </div>
            
            <p>Please review the rejection reason and make necessary adjustments before resubmitting.</p>
            
            <a href="{action_url}" class="button">View Change Details →</a>
            
            <div class="divider"></div>
            <p style="font-size: 13px; color: #6b7280;">
                You can modify the change request and resubmit for approval after addressing the concerns.
            </p>
        """
        return EmailTemplates.get_base_template(content, f"Change Rejected: {change_number}")