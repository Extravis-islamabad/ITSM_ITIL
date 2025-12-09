from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# ==================== Asset Type Schemas ====================

class AssetTypeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    icon: Optional[str] = "📦"
    color: Optional[str] = "#6366f1"
    parent_id: Optional[int] = None
    is_hardware: bool = True
    requires_serial: bool = True
    is_active: bool = True


class AssetTypeCreate(AssetTypeBase):
    pass


class AssetTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[int] = None
    is_hardware: Optional[bool] = None
    requires_serial: Optional[bool] = None
    is_active: Optional[bool] = None


class AssetTypeResponse(AssetTypeBase):
    id: int
    asset_count: Optional[int] = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==================== Asset Schemas ====================

class AssetBase(BaseModel):
    asset_tag: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    asset_type_id: int
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    status: str = "NEW"
    condition: Optional[str] = "GOOD"
    location: Optional[str] = None
    department_id: Optional[int] = None
    assigned_to_id: Optional[int] = None

    # Financial
    purchase_date: Optional[datetime] = None
    purchase_cost: Optional[Decimal] = None
    current_value: Optional[Decimal] = None
    supplier: Optional[str] = None
    po_number: Optional[str] = None

    # Warranty
    warranty_start_date: Optional[datetime] = None
    warranty_end_date: Optional[datetime] = None
    warranty_provider: Optional[str] = None

    # Technical
    specifications: Optional[str] = None  # JSON string
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    hostname: Optional[str] = None

    # Software license
    license_key: Optional[str] = None
    license_expiry: Optional[datetime] = None
    license_seats: Optional[int] = None

    # Lifecycle
    deployment_date: Optional[datetime] = None
    retirement_date: Optional[datetime] = None
    disposal_date: Optional[datetime] = None

    notes: Optional[str] = None
    barcode: Optional[str] = None


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    asset_tag: Optional[str] = Field(None, min_length=1, max_length=100)
    name: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    asset_type_id: Optional[int] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    status: Optional[str] = None
    condition: Optional[str] = None
    location: Optional[str] = None
    department_id: Optional[int] = None
    assigned_to_id: Optional[int] = None

    # Financial
    purchase_date: Optional[datetime] = None
    purchase_cost: Optional[Decimal] = None
    current_value: Optional[Decimal] = None
    supplier: Optional[str] = None
    po_number: Optional[str] = None

    # Warranty
    warranty_start_date: Optional[datetime] = None
    warranty_end_date: Optional[datetime] = None
    warranty_provider: Optional[str] = None

    # Technical
    specifications: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    hostname: Optional[str] = None

    # Software license
    license_key: Optional[str] = None
    license_expiry: Optional[datetime] = None
    license_seats: Optional[int] = None

    # Lifecycle
    deployment_date: Optional[datetime] = None
    retirement_date: Optional[datetime] = None
    disposal_date: Optional[datetime] = None

    notes: Optional[str] = None
    barcode: Optional[str] = None


class AssetResponse(AssetBase):
    id: int
    qr_code: Optional[str] = None
    assigned_date: Optional[datetime] = None

    # Computed fields
    asset_type_name: Optional[str] = None
    department_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_to_email: Optional[str] = None
    created_by_name: Optional[str] = None

    # Counts
    assignment_count: Optional[int] = 0
    contract_count: Optional[int] = 0
    relationship_count: Optional[int] = 0

    created_by_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AssetDetailResponse(AssetResponse):
    """Detailed asset response with relationships"""
    assignments: Optional[List['AssetAssignmentResponse']] = []
    contracts: Optional[List['AssetContractResponse']] = []
    history: Optional[List['AssetHistoryResponse']] = []
    parent_relationships: Optional[List['AssetRelationshipResponse']] = []
    child_relationships: Optional[List['AssetRelationshipResponse']] = []


# ==================== Asset Assignment Schemas ====================

class AssetAssignmentBase(BaseModel):
    asset_id: int
    user_id: int
    notes: Optional[str] = None


class AssetAssignmentCreate(AssetAssignmentBase):
    pass


class AssetAssignmentReturn(BaseModel):
    notes: Optional[str] = None


class AssetAssignmentResponse(AssetAssignmentBase):
    id: int
    assigned_by_id: int
    assigned_date: datetime
    returned_date: Optional[datetime] = None
    is_current: bool

    # Computed fields
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    assigned_by_name: Optional[str] = None
    asset_name: Optional[str] = None
    asset_tag: Optional[str] = None

    class Config:
        from_attributes = True


# ==================== Asset Relationship Schemas ====================

class AssetRelationshipBase(BaseModel):
    parent_asset_id: int
    child_asset_id: int
    relationship_type: str  # DEPENDS_ON, PART_OF, etc.
    description: Optional[str] = None


class AssetRelationshipCreate(AssetRelationshipBase):
    pass


class AssetRelationshipResponse(AssetRelationshipBase):
    id: int
    created_by_id: int
    created_at: datetime

    # Computed fields
    parent_asset_name: Optional[str] = None
    parent_asset_tag: Optional[str] = None
    child_asset_name: Optional[str] = None
    child_asset_tag: Optional[str] = None
    created_by_name: Optional[str] = None

    class Config:
        from_attributes = True


# ==================== Asset History Schemas ====================

class AssetHistoryResponse(BaseModel):
    id: int
    asset_id: int
    action: str
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    description: Optional[str] = None
    user_id: int
    user_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== Asset Contract Schemas ====================

class AssetContractBase(BaseModel):
    asset_id: int
    contract_type: str  # WARRANTY, MAINTENANCE, SUPPORT, LEASE
    provider: str = Field(..., min_length=1, max_length=200)
    contract_number: Optional[str] = None
    start_date: datetime
    end_date: datetime
    cost: Optional[Decimal] = None
    renewal_date: Optional[datetime] = None
    auto_renew: bool = False
    terms: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class AssetContractCreate(AssetContractBase):
    pass


class AssetContractUpdate(BaseModel):
    contract_type: Optional[str] = None
    provider: Optional[str] = Field(None, min_length=1, max_length=200)
    contract_number: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    cost: Optional[Decimal] = None
    renewal_date: Optional[datetime] = None
    auto_renew: Optional[bool] = None
    terms: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class AssetContractResponse(AssetContractBase):
    id: int
    created_by_id: int
    created_by_name: Optional[str] = None
    asset_name: Optional[str] = None
    asset_tag: Optional[str] = None
    days_until_expiry: Optional[int] = None
    is_expired: Optional[bool] = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==================== Analytics and Reports ====================

class AssetAnalytics(BaseModel):
    total_assets: int = 0
    total_value: Decimal = Decimal('0.00')
    by_status: dict = {}
    by_type: dict = {}
    by_condition: dict = {}
    by_department: dict = {}
    assigned_count: int = 0
    unassigned_count: int = 0
    expiring_warranties: List[AssetResponse] = []
    expiring_contracts: List[AssetContractResponse] = []
    recent_acquisitions: List[AssetResponse] = []


# ==================== QR Code ====================

class AssetQRCodeResponse(BaseModel):
    asset_id: int
    asset_tag: str
    qr_code_url: str
    qr_code_data: str  # Base64 encoded image


# Update forward references
AssetDetailResponse.model_rebuild()
