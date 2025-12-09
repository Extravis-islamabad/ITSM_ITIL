import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def send_email(to_emails: List[str], subject: str, body: str, html_body: str = None):
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = settings.SMTP_FROM
            msg['To'] = ', '.join(to_emails)
            msg['Subject'] = subject
            
            part1 = MIMEText(body, 'plain')
            msg.attach(part1)
            
            if html_body:
                part2 = MIMEText(html_body, 'html')
                msg.attach(part2)
            
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                if settings.SMTP_USER:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
            
            return True
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False
    
    @staticmethod
    def send_ticket_assigned_notification(ticket, assignee):
        subject = f"Ticket Assigned: {ticket.ticket_number}"
        
        body = f"""Hello {assignee.full_name},

A ticket has been assigned to you:

Ticket Number: {ticket.ticket_number}
Title: {ticket.title}
Priority: {ticket.priority}

Please log in to the ITSM platform to view the ticket details.

Best regards,
ITSM Support Team"""
        
        html_body = f"""<html>
<body style="font-family: Arial, sans-serif;">
<h2>Ticket Assigned</h2>
<p>Hello {assignee.full_name},</p>
<p>A ticket has been assigned to you:</p>
<table style="border-collapse: collapse; margin: 20px 0;">
<tr><td style="padding: 8px; font-weight: bold;">Ticket Number:</td><td style="padding: 8px;">{ticket.ticket_number}</td></tr>
<tr><td style="padding: 8px; font-weight: bold;">Title:</td><td style="padding: 8px;">{ticket.title}</td></tr>
<tr><td style="padding: 8px; font-weight: bold;">Priority:</td><td style="padding: 8px;"><span style="background-color: #fef3c7; padding: 4px 8px; border-radius: 4px;">{ticket.priority}</span></td></tr>
</table>
<p><a href="{settings.FRONTEND_URL}/incidents/{ticket.id}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Ticket</a></p>
<p>Best regards,<br>ITSM Support Team</p>
</body>
</html>"""
        
        EmailService.send_email([assignee.email], subject, body, html_body)