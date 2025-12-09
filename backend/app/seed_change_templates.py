from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.change_template import ChangeTemplate
from app.models.change import ChangeType, ChangeRisk, ChangeImpact

def seed_change_templates():
    db = SessionLocal()
    
    try:
        existing = db.query(ChangeTemplate).first()
        if existing:
            print("✅ Change templates already exist")
            return
        
        print("🌱 Seeding Change Templates...")
        
        templates = [
            {
                "name": "Monthly Windows Server Patching",
                "description": "Standard template for monthly Windows security updates",
                "change_type": ChangeType.STANDARD,
                "risk": ChangeRisk.LOW,
                "impact": ChangeImpact.LOW,
                "title_template": "Monthly Windows Server Security Updates - {month} {year}",
                "description_template": """Deploy Microsoft Windows Server security updates for {month} {year}.

This is a standard, pre-approved change following our established patch management process.

Affected Servers:
- Production web servers
- Database servers
- Application servers

Total Servers: {server_count}""",
                "implementation_plan_template": """1. Deploy to development servers (Week 1 Monday)
2. Monitor for 48 hours
3. Deploy to production servers in rolling fashion (Week 1 Thursday)
4. Each server rebooted during off-peak hours (11 PM - 2 AM)
5. Automatic rollback if health checks fail

Estimated Duration: 3 hours
Downtime: None (rolling restart)""",
                "rollback_plan_template": """Windows System Restore to pre-patch snapshot.
Automated via WSUS.

Rollback Time: 30 minutes per server""",
                "testing_plan_template": """1. Automated health checks post-reboot
2. Application smoke tests
3. Service availability verification
4. Performance monitoring for 24 hours""",
                "requires_cab_approval": False,
            },
            {
                "name": "Database Version Upgrade",
                "description": "Template for upgrading database versions",
                "change_type": ChangeType.NORMAL,
                "risk": ChangeRisk.HIGH,
                "impact": ChangeImpact.MEDIUM,
                "title_template": "Upgrade {database_name} from version {old_version} to {new_version}",
                "description_template": """Upgrade {database_name} database server from version {old_version} to {new_version}.

Reason: {reason}

Benefits:
- Performance improvements
- Security patches
- New features
- Extended support

Affected Services: {affected_services}
Affected Users: {user_count}""",
                "implementation_plan_template": """Preparation Phase:
1. Full database backup
2. Test environment setup
3. Application compatibility testing
4. Performance benchmarking

Implementation Phase:
1. Enable maintenance mode
2. Create final backup
3. Stop application services
4. Upgrade database
5. Run migration scripts
6. Update connection strings
7. Start services
8. Smoke tests
9. Disable maintenance mode

Timeline: {timeline}
Maintenance Window: {maintenance_window}""",
                "rollback_plan_template": """1. Enable maintenance mode
2. Stop all application services
3. Restore from backup
4. Verify data integrity
5. Restart services
6. Smoke tests

Estimated Rollback Time: 2 hours

Backup Location: {backup_location}
Backup Verification: Completed {verification_date}""",
                "testing_plan_template": """Pre-Production Testing:
- Unit tests: All tests must pass
- Integration tests: Complete API test suite
- Load testing: Simulate production traffic
- Performance testing: Query response times
- Security testing: Authentication and authorization

Post-Production Testing:
- Critical user journeys
- Database connection monitoring
- Query performance validation
- Replication verification
- Backup and restore validation""",
                "requires_cab_approval": True,
            },
            {
                "name": "Emergency Security Patch",
                "description": "Template for critical security patches",
                "change_type": ChangeType.EMERGENCY,
                "risk": ChangeRisk.CRITICAL,
                "impact": ChangeImpact.LOW,
                "title_template": "Emergency Security Patch - {vulnerability_id}",
                "description_template": """EMERGENCY: Apply critical security patch for {vulnerability_id}

Vulnerability Description:
{vulnerability_description}

Severity: {severity}
CVSS Score: {cvss_score}

Affected Systems: {affected_systems}
Patch Version: {patch_version}

This is an emergency change requiring immediate action to prevent potential security breach.""",
                "implementation_plan_template": """Emergency Deployment Process:
1. Download and verify patch ({patch_version})
2. Test in isolated environment (30 minutes)
3. Deploy to production during emergency window
4. Restart affected services
5. Validate security fix
6. Monitor for issues

Total Time: 1-2 hours
Coordination: Security team + Operations""",
                "rollback_plan_template": """Quick Rollback Procedure:
1. Revert to previous version
2. Restart services
3. Verify functionality

Estimated Time: 15 minutes

Note: Only rollback if patch causes service disruption.
Security vulnerability will remain if rolled back.""",
                "testing_plan_template": """Rapid Testing:
- Vulnerability scan to verify fix
- Basic functionality test
- Authentication verification
- Critical path testing
- 24-hour monitoring""",
                "requires_cab_approval": True,
            },
            {
                "name": "Application Deployment",
                "description": "Standard application release deployment",
                "change_type": ChangeType.NORMAL,
                "risk": ChangeRisk.MEDIUM,
                "impact": ChangeImpact.MEDIUM,
                "title_template": "{application_name} Release {version}",
                "description_template": """Deploy {application_name} version {version} to production.

Release Type: {release_type}
Features Included:
{features}

Bug Fixes:
{bug_fixes}

Breaking Changes: {breaking_changes}""",
                "implementation_plan_template": """1. Code freeze and final testing
2. Create deployment package
3. Deploy to staging (validate)
4. Schedule production deployment
5. Enable maintenance mode
6. Deploy to production servers
7. Run database migrations
8. Clear caches
9. Smoke tests
10. Disable maintenance mode
11. Monitor for 1 hour""",
                "rollback_plan_template": """1. Enable maintenance mode
2. Revert code to previous version
3. Restore database if needed
4. Clear caches
5. Restart services
6. Smoke tests
7. Disable maintenance mode

Previous Version: {previous_version}
Rollback Time: 20-30 minutes""",
                "testing_plan_template": """Pre-Deployment:
- All automated tests passing
- Manual QA sign-off
- Performance testing
- Security scan

Post-Deployment:
- Critical path verification
- User acceptance testing
- Performance monitoring
- Error rate monitoring""",
                "requires_cab_approval": True,
            },
        ]
        
        for template_data in templates:
            template = ChangeTemplate(**template_data)
            db.add(template)
        
        db.commit()
        print(f"✅ Seeded {len(templates)} change templates successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding templates: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_change_templates()