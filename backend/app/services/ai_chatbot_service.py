import os
import json
import re
import logging
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from datetime import datetime
from app.models.chat_conversation import ChatConversation, ChatMessage
from app.models.knowledge import KnowledgeArticle, ArticleStatus, KnowledgeCategory
from app.models.ticket import Ticket
from app.models.category import Category
from app.models.user import User

logger = logging.getLogger(__name__)

# OpenAI integration
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class AIChatbotService:
    """
    Advanced AI Chatbot Service for IT Support
    Provides intelligent issue analysis, knowledge base search, and ticket escalation
    """

    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", "")
        self.client = None
        if OPENAI_AVAILABLE and self.api_key:
            self.client = OpenAI(api_key=self.api_key)

        self.system_prompt = """You are SupportX AI, an intelligent IT support assistant for an ITSM platform. Your role is to:

1. **Understand Issues**: Listen carefully to user problems and ask clarifying questions
2. **Provide Solutions**: Offer step-by-step remediation based on knowledge base articles and best practices
3. **Be Interactive**: Engage in multi-turn conversations to fully resolve issues
4. **Escalate When Needed**: If you cannot resolve the issue, suggest creating a support ticket

**Guidelines**:
- Be professional, empathetic, and concise
- Ask ONE clarifying question at a time
- Provide actionable, step-by-step solutions
- Use simple language, avoid jargon unless necessary
- If suggesting multiple steps, number them clearly
- Always confirm if the solution worked before closing
- Reference knowledge base articles when available

**When to Suggest Creating a Ticket**:
- Issue is complex and requires hands-on technical support
- User has tried suggested solutions without success
- Issue requires access/permissions you cannot provide
- User explicitly requests to create a ticket

**Response Format**:
- Keep responses under 250 words
- Use bullet points or numbered lists for clarity
- End with a question or next step
- Be encouraging and supportive"""

    async def get_ai_response(
        self,
        messages: List[Dict[str, str]],
        knowledge_context: Optional[str] = None,
        knowledge_articles: Optional[List[Dict]] = None
    ) -> Tuple[str, Dict]:
        """
        Get AI response using OpenAI or fallback to rule-based
        Returns: (response_text, metadata)
        """
        # First, check if we have relevant knowledge base articles
        kb_response = None
        if knowledge_articles and len(knowledge_articles) > 0:
            # Check if knowledge base has a highly relevant answer
            best_article = knowledge_articles[0]
            if best_article.get('relevance_score', 0) > 0.7:
                kb_response = self._format_kb_response(best_article, knowledge_articles)

        # If we have a strong KB match, use it directly
        if kb_response:
            metadata = {
                "source": "knowledge_base",
                "has_solution": True,
                "article_id": knowledge_articles[0].get('id'),
                "article_title": knowledge_articles[0].get('title'),
                "confidence": "high"
            }
            return kb_response, metadata

        # Try OpenAI if available
        if self.client and self.api_key:
            try:
                return await self._get_openai_response(messages, knowledge_context)
            except Exception as e:
                logger.warning(f"OpenAI API Error: {e}")
                # Fall through to fallback response

        # Fallback to rule-based response
        return self._get_fallback_response(messages, knowledge_context)

    def _format_kb_response(self, best_article: Dict, all_articles: List[Dict]) -> str:
        """Format a response using knowledge base article content"""
        response = f"I found a helpful article that addresses your issue:\n\n"
        response += f"**{best_article['title']}**\n\n"

        # Extract key content (first 500 chars or until a natural break)
        content = best_article.get('content', '')
        # Strip HTML tags
        content = re.sub(r'<[^>]+>', '', content)
        # Get first meaningful paragraph
        paragraphs = content.split('\n')
        summary = ''
        for p in paragraphs:
            p = p.strip()
            if len(p) > 50:
                summary = p[:500]
                if len(p) > 500:
                    summary += '...'
                break

        if summary:
            response += f"{summary}\n\n"

        response += "Would you like me to explain any of these steps in more detail, or do you need additional help?"

        # Add related articles if available
        if len(all_articles) > 1:
            response += "\n\n**Related Articles:**\n"
            for article in all_articles[1:3]:
                response += f"- {article['title']}\n"

        return response

    async def _get_openai_response(
        self,
        messages: List[Dict[str, str]],
        knowledge_context: Optional[str] = None
    ) -> Tuple[str, Dict]:
        """Get response from OpenAI API"""
        context_messages = [{"role": "system", "content": self.system_prompt}]

        if knowledge_context:
            context_messages.append({
                "role": "system",
                "content": f"Here are relevant knowledge base articles to reference:\n{knowledge_context}"
            })

        context_messages.extend(messages)

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",  # Cost-effective model
            messages=context_messages,
            temperature=0.7,
            max_tokens=500,
            presence_penalty=0.6,
            frequency_penalty=0.3
        )

        ai_message = response.choices[0].message.content

        # Analyze response for metadata
        metadata = self._extract_metadata(ai_message, messages)
        metadata["source"] = "openai"

        return ai_message, metadata

    def _get_fallback_response(
        self,
        messages: List[Dict[str, str]],
        knowledge_context: Optional[str] = None
    ) -> Tuple[str, Dict]:
        """
        Fallback response when AI is not available
        Uses conversation history and knowledge context to provide responses
        """
        current_message = messages[-1]["content"] if messages else ""
        current_message_lower = current_message.lower()
        all_user_messages = " ".join([msg["content"] for msg in messages if msg["role"] == "user"]).lower()
        user_message_count = len([msg for msg in messages if msg["role"] == "user"])

        # Check if this is the first message (greeting)
        if user_message_count == 1 and any(greeting in current_message_lower for greeting in ["hi", "hello", "hey", "greetings"]):
            response = """Hello! I'm SupportX AI, your IT support assistant.

I can help you with:
- Password resets and login issues
- Software and application problems
- Hardware troubleshooting
- Network connectivity issues
- Email and communication tools

What can I help you with today?"""
            return response, {"category": "General", "confidence": "high", "is_greeting": True}

        # If we have knowledge context, use it
        if knowledge_context:
            response = f"""Based on our knowledge base, here's what I found:\n\n{knowledge_context}\n\nDoes this help resolve your issue? If not, please provide more details and I can either search for more solutions or help you create a support ticket."""
            return response, {"category": "Knowledge Base", "confidence": "medium", "source": "knowledge_base"}

        # Pattern-based responses for common issues
        if any(word in all_user_messages for word in ["password", "reset", "login", "access", "locked"]):
            response = """I can help you with password/access issues!

**Password Reset Steps:**
1. Go to the login page
2. Click "Forgot Password"
3. Enter your email address
4. Check your email for the reset link
5. Follow the link to set a new password

**If your account is locked:**
- Wait 15 minutes and try again
- Or contact IT support for immediate unlock

Did this help, or do you need further assistance?"""
            return response, {"category": "Access & Authentication", "confidence": "high", "has_solution": True}

        elif any(word in all_user_messages for word in ["slow", "performance", "freeze", "lag", "hang", "stuck"]):
            response = """Let me help you with this performance issue.

**Quick Fixes:**
1. Close unnecessary applications and browser tabs
2. Restart your computer
3. Check for pending Windows/system updates
4. Clear browser cache if it's a web application
5. Check available disk space (should have at least 10% free)

**If the issue persists:**
- Note which application is slow
- Check if it happens at specific times
- Monitor CPU/memory usage in Task Manager

Which step are you currently on, or would you like more detailed instructions?"""
            return response, {"category": "Performance", "confidence": "medium", "has_solution": True}

        elif any(word in all_user_messages for word in ["email", "outlook", "mail", "inbox"]):
            response = """I can help with your email issue!

**Common Email Fixes:**
1. Check your internet connection
2. Verify you're using the correct credentials
3. Try signing out and back in
4. Clear Outlook cache (if using Outlook)
5. Check if the issue occurs on webmail too

**For Outlook specifically:**
- File > Account Settings > Repair
- Create a new Outlook profile if issues persist

What specific email problem are you experiencing?"""
            return response, {"category": "Email & Communication", "confidence": "medium", "has_solution": True}

        elif any(word in all_user_messages for word in ["network", "internet", "wifi", "connection", "vpn", "connect"]):
            response = """Let me help you with connectivity issues.

**Network Troubleshooting:**
1. Check if WiFi is enabled on your device
2. Disconnect and reconnect to the network
3. Restart your router/modem
4. Run Windows Network Troubleshooter
5. Try forgetting the network and reconnecting

**For VPN Issues:**
- Disconnect and reconnect to VPN
- Try a different VPN server
- Check if your VPN client needs updating

Can you see available networks? What error message do you see?"""
            return response, {"category": "Network", "confidence": "medium", "has_solution": True}

        elif any(word in all_user_messages for word in ["printer", "print", "printing", "scan"]):
            response = """I can help with printing issues!

**Printer Troubleshooting:**
1. Check if printer is powered on and connected
2. Verify printer is set as default
3. Check for paper jams or low ink
4. Restart the Print Spooler service:
   - Open Services (services.msc)
   - Find "Print Spooler", right-click, Restart
5. Update printer drivers

**If still not working:**
- Try printing a test page
- Check if other users can print to it

What specific issue are you facing?"""
            return response, {"category": "Hardware", "confidence": "medium", "has_solution": True}

        elif any(word in all_user_messages for word in ["install", "software", "application", "app", "program", "update"]):
            response = """I can help with software issues!

**For Installation Problems:**
1. Run installer as Administrator
2. Check system requirements
3. Temporarily disable antivirus
4. Clear temp files and retry
5. Check available disk space

**For Application Crashes:**
1. Update the application to latest version
2. Run in compatibility mode
3. Reinstall the application
4. Check Windows Event Viewer for errors

What software are you trying to install or having issues with?"""
            return response, {"category": "Software", "confidence": "medium", "has_solution": True}

        elif any(word in all_user_messages for word in ["blue screen", "bsod", "crash", "restart", "shutdown"]):
            response = """Blue screen errors require careful troubleshooting.

**Immediate Steps:**
1. Note the error code displayed (e.g., STOP code)
2. Force restart by holding power button for 10 seconds
3. If it boots normally, check Windows Event Viewer

**If it keeps crashing:**
- Boot into Safe Mode (F8 during startup)
- Uninstall recent software or driver updates
- Run System File Checker: `sfc /scannow`

**This may require hands-on support.** Would you like me to help you create a support ticket for our technical team?"""
            return response, {"category": "Hardware", "confidence": "high", "escalation_suggested": True, "has_solution": True}

        # Default response for unclear issues
        if user_message_count <= 2:
            response = """Thank you for reaching out! I want to make sure I understand your issue correctly.

Could you please provide more details:
- What exactly is happening?
- When did this start?
- Any error messages you're seeing?
- What have you tried so far?

The more details you provide, the better I can assist you!"""
            return response, {"category": "General", "confidence": "low"}
        else:
            response = """I want to help resolve your issue. Based on our conversation, it seems this might need specialized attention.

**I can help you in two ways:**

1. **Continue troubleshooting** - Provide specific error messages or more details about what's happening

2. **Create a support ticket** - Our technical team can provide hands-on assistance

Which would you prefer? You can click "Create a support ticket" below for faster resolution."""
            return response, {"category": "General", "confidence": "low", "escalation_suggested": True}

    def _extract_metadata(self, ai_response: str, conversation_history: List[Dict]) -> Dict:
        """Extract metadata from AI response for analytics"""
        ai_response_lower = ai_response.lower()
        return {
            "has_solution": any(word in ai_response_lower for word in ["step", "try", "follow", "check", "click", "open"]),
            "needs_clarification": ai_response.count("?") > 0,
            "escalation_suggested": any(word in ai_response_lower for word in ["ticket", "escalate", "support team", "technical team"]),
            "sentiment": "helpful",
            "turn_count": len([m for m in conversation_history if m["role"] == "user"])
        }

    def search_knowledge_base(
        self,
        query: str,
        db: Session,
        limit: int = 5
    ) -> Tuple[str, List[Dict]]:
        """
        Enhanced knowledge base search with relevance scoring
        Returns: (context_string, list_of_articles)
        """
        # Clean and tokenize query
        query_words = set(query.lower().split())
        stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
                      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
                      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'to', 'of',
                      'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
                      'my', 'i', 'me', 'we', 'you', 'your', 'it', 'not', 'and', 'or', 'but',
                      'how', 'what', 'when', 'where', 'why', 'which', 'who'}
        query_keywords = query_words - stop_words

        if not query_keywords:
            query_keywords = query_words

        # Build search conditions for each keyword
        search_conditions = []
        for keyword in query_keywords:
            search_conditions.append(
                or_(
                    KnowledgeArticle.title.ilike(f"%{keyword}%"),
                    KnowledgeArticle.content.ilike(f"%{keyword}%"),
                    KnowledgeArticle.tags.ilike(f"%{keyword}%"),
                    KnowledgeArticle.summary.ilike(f"%{keyword}%")
                )
            )

        if not search_conditions:
            return "", []

        # Query articles
        articles = db.query(KnowledgeArticle).filter(
            KnowledgeArticle.status == ArticleStatus.PUBLISHED,
            or_(*search_conditions)
        ).limit(limit * 2).all()  # Get more to filter by relevance

        if not articles:
            return "", []

        # Score articles by relevance
        scored_articles = []
        for article in articles:
            score = 0
            title_lower = article.title.lower()
            content_lower = article.content.lower() if article.content else ""
            tags_lower = (article.tags or "").lower()

            for keyword in query_keywords:
                # Title matches are worth more
                if keyword in title_lower:
                    score += 3
                if keyword in tags_lower:
                    score += 2
                if keyword in content_lower:
                    score += 1

            # Boost featured and FAQ articles
            if article.is_featured:
                score += 1
            if article.is_faq:
                score += 1

            # Boost by view count (popular articles)
            if article.view_count > 100:
                score += 0.5

            relevance_score = min(score / (len(query_keywords) * 4), 1.0)  # Normalize to 0-1

            scored_articles.append({
                'id': article.id,
                'title': article.title,
                'content': article.content,
                'summary': article.summary,
                'slug': article.slug,
                'tags': article.tags,
                'category_id': article.category_id,
                'relevance_score': relevance_score,
                'view_count': article.view_count
            })

        # Sort by relevance and take top results
        scored_articles.sort(key=lambda x: x['relevance_score'], reverse=True)
        top_articles = scored_articles[:limit]

        if not top_articles:
            return "", []

        # Build context string for AI
        context = "Relevant Knowledge Base Articles:\n\n"
        for i, article in enumerate(top_articles, 1):
            content = article.get('content', '')
            # Strip HTML tags
            content = re.sub(r'<[^>]+>', '', content)
            # Truncate
            content = content[:300] + "..." if len(content) > 300 else content

            context += f"{i}. **{article['title']}**\n"
            if article.get('summary'):
                context += f"   Summary: {article['summary'][:200]}\n"
            context += f"   {content}\n\n"

        return context, top_articles

    def get_suggestions(self, query: str, db: Session, limit: int = 5) -> List[Dict]:
        """
        Get typing suggestions from knowledge base
        Used for autocomplete while user is typing
        """
        if len(query) < 2:
            return []

        # Search for matching articles
        articles = db.query(KnowledgeArticle).filter(
            KnowledgeArticle.status == ArticleStatus.PUBLISHED,
            or_(
                KnowledgeArticle.title.ilike(f"%{query}%"),
                KnowledgeArticle.tags.ilike(f"%{query}%")
            )
        ).order_by(
            KnowledgeArticle.view_count.desc()
        ).limit(limit).all()

        suggestions = []
        for article in articles:
            suggestions.append({
                'id': article.id,
                'title': article.title,
                'slug': article.slug,
                'summary': article.summary[:100] if article.summary else None,
                'type': 'article'
            })

        # Also add common issue patterns as suggestions
        common_issues = [
            {"text": "Password reset", "type": "common"},
            {"text": "Cannot connect to WiFi", "type": "common"},
            {"text": "Email not working", "type": "common"},
            {"text": "Printer not printing", "type": "common"},
            {"text": "Computer running slow", "type": "common"},
            {"text": "Software installation issue", "type": "common"},
            {"text": "VPN connection problem", "type": "common"},
            {"text": "Blue screen error", "type": "common"},
        ]

        for issue in common_issues:
            if query.lower() in issue["text"].lower() and len(suggestions) < limit:
                suggestions.append({
                    'id': None,
                    'title': issue["text"],
                    'slug': None,
                    'summary': None,
                    'type': issue["type"]
                })

        return suggestions[:limit]

    def suggest_category(self, conversation_messages: List[ChatMessage], db: Session) -> Optional[int]:
        """Suggest appropriate ticket category based on conversation"""
        user_text = " ".join([msg.content for msg in conversation_messages if msg.role == "user"]).lower()

        category_keywords = {
            "hardware": ["laptop", "desktop", "monitor", "keyboard", "mouse", "printer", "blue screen",
                        "bsod", "noise", "clicking", "beeping", "grinding", "screen", "battery", "charger"],
            "software": ["application", "program", "install", "software", "app", "crash", "freeze",
                        "update", "license", "activation"],
            "network": ["internet", "wifi", "network", "connection", "vpn", "firewall", "proxy"],
            "email": ["email", "outlook", "mail", "inbox", "calendar", "teams", "zoom"],
            "access": ["password", "reset", "login", "access", "locked", "account", "permission"],
        }

        for category_name, keywords in category_keywords.items():
            if any(keyword in user_text for keyword in keywords):
                category = db.query(Category).filter(
                    Category.name.ilike(f"%{category_name}%")
                ).first()
                if category:
                    return category.id

        return None

    def generate_ticket_summary(self, conversation: ChatConversation) -> Dict:
        """Generate ticket details from conversation"""
        user_messages = [msg.content for msg in conversation.messages if msg.role == "user"]
        assistant_messages = [msg.content for msg in conversation.messages if msg.role == "assistant"]

        # Generate title from first message
        title = user_messages[0][:100] if user_messages else "Issue reported via chatbot"

        # Clean up title
        title = title.replace('\n', ' ').strip()
        if not title.endswith(('.', '!', '?')):
            title = title.rstrip('.,!?:;')

        # Build description
        description = "## Issue Summary\n"
        description += user_messages[0] if user_messages else "No description provided"

        if len(user_messages) > 1:
            description += "\n\n## Additional Details\n"
            for i, msg in enumerate(user_messages[1:], 1):
                description += f"- {msg}\n"

        description += "\n\n## Troubleshooting Attempted\n"
        if assistant_messages:
            # Summarize what was suggested
            description += "AI assistant provided the following guidance:\n"
            description += assistant_messages[-1][:500]
            if len(assistant_messages[-1]) > 500:
                description += "..."
        else:
            description += "No troubleshooting steps were attempted before escalation."

        description += "\n\n---\n*This ticket was created from an AI chatbot conversation.*"

        return {
            "title": title,
            "description": description,
            "source": "chatbot",
            "conversation_id": conversation.id
        }

    def analyze_sentiment(self, message: str) -> str:
        """Analyze message sentiment"""
        message_lower = message.lower()

        negative_words = ["frustrated", "angry", "terrible", "awful", "hate", "worst",
                         "useless", "broken", "stupid", "annoying", "urgent", "critical",
                         "asap", "emergency", "help", "please"]
        positive_words = ["thank", "great", "helpful", "perfect", "excellent", "appreciate",
                         "awesome", "wonderful", "solved", "fixed", "working"]

        negative_count = sum(1 for word in negative_words if word in message_lower)
        positive_count = sum(1 for word in positive_words if word in message_lower)

        if negative_count > positive_count and negative_count >= 2:
            return "negative"
        elif positive_count > negative_count:
            return "positive"
        return "neutral"

    def get_ticket_categories(self, db: Session) -> List[Dict]:
        """Get available ticket categories for selection"""
        categories = db.query(Category).filter(
            Category.is_active == True
        ).order_by(Category.name).all()

        return [
            {
                'id': cat.id,
                'name': cat.name,
                'description': cat.description
            }
            for cat in categories
        ]
