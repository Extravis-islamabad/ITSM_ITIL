from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Numeric, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class AssetStatus(str, enum.Enum):
    """Asset lifecycle status"""
    NEW = "NEW"
    ACTIVE = "ACTIVE"
    IN_MAINTENANCE = "IN_MAINTENANCE"
    RETIRED = "RETIRED"
    DISPOSED = "DISPOSED"
    LOST = "LOST"
    STOLEN = "STOLEN"


class AssetCondition(str, enum.Enum):
    """Physical condition of asset"""
    EXCELLENT = "EXCELLENT"
    GOOD = "GOOD"
    FAIR = "FAIR"
    POOR = "POOR"
    DAMAGED = "DAMAGED"


class RelationshipType(str, enum.Enum):
    """Types of relationships between assets"""
    DEPENDS_ON = "DEPENDS_ON"
    PART_OF = "PART_OF"
    CONNECTED_TO = "CONNECTED_TO"
    INSTALLED_ON = "INSTALLED_ON"
    USES = "USES"


class AssetType(Base):
    """Asset types/categories (Laptop, Server, Software License, etc.)"""
    __tablename__ = "asset_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    icon = Column(String(100), nullable=True)
    color = Column(String(50), nullable=True)
    parent_id = Column(Integer, ForeignKey("asset_types.id"), nullable=True)
    is_hardware = Column(Boolean, default=True)  # Hardware vs Software
    requires_serial = Column(Boolean, default=True)  # Requires serial number
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    parent = relationship("AssetType", remote_side=[id], backref="children")
    assets = relationship("Asset", back_populates="asset_type")


class Asset(Base):
    """Main asset table - Configuration Items"""
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_tag = Column(String(100), unique=True, nullable=False, index=True)  # Unique identifier
    name = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)

    # Classification
    asset_type_id = Column(Integer, ForeignKey("asset_types.id"), nullable=False)
    manufacturer = Column(String(200), nullable=True)
    model = Column(String(200), nullable=True)
    serial_number = Column(String(200), nullable=True, index=True)

    # Status and condition
    status = Column(SQLEnum(AssetStatus), default=AssetStatus.NEW, nullable=False, index=True)
    condition = Column(SQLEnum(AssetCondition), default=AssetCondition.GOOD, nullable=True)

    # Location and assignment
    location = Column(String(500), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_date = Column(DateTime(timezone=True), nullable=True)

    # Financial information
    purchase_date = Column(DateTime(timezone=True), nullable=True)
    purchase_cost = Column(Numeric(10, 2), nullable=True)
    current_value = Column(Numeric(10, 2), nullable=True)
    supplier = Column(String(200), nullable=True)
    po_number = Column(String(100), nullable=True)  # Purchase Order number

    # Warranty information
    warranty_start_date = Column(DateTime(timezone=True), nullable=True)
    warranty_end_date = Column(DateTime(timezone=True), nullable=True)
    warranty_provider = Column(String(200), nullable=True)

    # Technical details (stored as JSON-like text)
    specifications = Column(Text, nullable=True)  # JSON string for flexible specs
    ip_address = Column(String(100), nullable=True)
    mac_address = Column(String(100), nullable=True)
    hostname = Column(String(200), nullable=True)

    # Software license specific
    license_key = Column(String(500), nullable=True)
    license_expiry = Column(DateTime(timezone=True), nullable=True)
    license_seats = Column(Integer, nullable=True)

    # Lifecycle dates
    deployment_date = Column(DateTime(timezone=True), nullable=True)
    retirement_date = Column(DateTime(timezone=True), nullable=True)
    disposal_date = Column(DateTime(timezone=True), nullable=True)

    # Notes and tracking
    notes = Column(Text, nullable=True)
    qr_code = Column(String(500), nullable=True)  # Path to QR code image
    barcode = Column(String(200), nullable=True)

    # Metadata
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    asset_type = relationship("AssetType", back_populates="assets")
    department = relationship("Department")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    created_by = relationship("User", foreign_keys=[created_by_id])

    assignments = relationship("AssetAssignment", back_populates="asset", cascade="all, delete-orphan")
    history = relationship("AssetHistory", back_populates="asset", cascade="all, delete-orphan")
    contracts = relationship("AssetContract", back_populates="asset", cascade="all, delete-orphan")

    # Relationships between assets
    parent_relationships = relationship(
        "AssetRelationship",
        foreign_keys="AssetRelationship.parent_asset_id",
        back_populates="parent_asset",
        cascade="all, delete-orphan"
    )
    child_relationships = relationship(
        "AssetRelationship",
        foreign_keys="AssetRelationship.child_asset_id",
        back_populates="child_asset",
        cascade="all, delete-orphan"
    )


class AssetAssignment(Base):
    """Track assignment history of assets to users"""
    __tablename__ = "asset_assignments"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    returned_date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    is_current = Column(Boolean, default=True)

    # Relationships
    asset = relationship("Asset", back_populates="assignments")
    user = relationship("User", foreign_keys=[user_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])


class AssetRelationship(Base):
    """Relationships between assets (dependencies, components, etc.)"""
    __tablename__ = "asset_relationships"

    id = Column(Integer, primary_key=True, index=True)
    parent_asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    child_asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    relationship_type = Column(SQLEnum(RelationshipType), nullable=False)
    description = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    parent_asset = relationship("Asset", foreign_keys=[parent_asset_id], back_populates="parent_relationships")
    child_asset = relationship("Asset", foreign_keys=[child_asset_id], back_populates="child_relationships")
    created_by = relationship("User")


class AssetHistory(Base):
    """Audit trail for asset changes"""
    __tablename__ = "asset_history"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(100), nullable=False)  # CREATED, UPDATED, ASSIGNED, etc.
    field_name = Column(String(200), nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    asset = relationship("Asset", back_populates="history")
    user = relationship("User")


class AssetContract(Base):
    """Contracts, warranties, and maintenance agreements"""
    __tablename__ = "asset_contracts"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    contract_type = Column(String(100), nullable=False)  # WARRANTY, MAINTENANCE, SUPPORT, LEASE
    provider = Column(String(200), nullable=False)
    contract_number = Column(String(100), nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    cost = Column(Numeric(10, 2), nullable=True)
    renewal_date = Column(DateTime(timezone=True), nullable=True)
    auto_renew = Column(Boolean, default=False)
    terms = Column(Text, nullable=True)
    contact_name = Column(String(200), nullable=True)
    contact_email = Column(String(200), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    asset = relationship("Asset", back_populates="contracts")
    created_by = relationship("User")
