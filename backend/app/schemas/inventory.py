from __future__ import annotations
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from app.models.inventory import MovementType


# ─── Category ───────────────────────────────────────────────────────────────

class CategoryBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    parent_id: Optional[UUID] = None
    is_active: bool = True

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[UUID] = None
    is_active: Optional[bool] = None

class CategoryOut(CategoryBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Supplier ───────────────────────────────────────────────────────────────

class SupplierBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    lead_time_days: int = 7
    reliability_score: float = 1.0
    is_active: bool = True

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    lead_time_days: Optional[int] = None
    reliability_score: Optional[float] = None
    is_active: Optional[bool] = None

class SupplierOut(SupplierBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Product ────────────────────────────────────────────────────────────────

class ProductBase(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    barcode: Optional[str] = None
    category_id: Optional[UUID] = None
    supplier_id: Optional[UUID] = None
    unit_cost: float = 0.0
    selling_price: float = 0.0
    reorder_point: int = 10
    reorder_qty: int = 50
    unit_of_measure: str = "unit"
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    barcode: Optional[str] = None
    category_id: Optional[UUID] = None
    supplier_id: Optional[UUID] = None
    unit_cost: Optional[float] = None
    selling_price: Optional[float] = None
    reorder_point: Optional[int] = None
    reorder_qty: Optional[int] = None
    unit_of_measure: Optional[str] = None
    is_active: Optional[bool] = None

class ProductOut(ProductBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryOut] = None
    supplier: Optional[SupplierOut] = None

    class Config:
        from_attributes = True


# ─── InventoryItem ───────────────────────────────────────────────────────────

class InventoryItemBase(BaseModel):
    product_id: UUID
    warehouse: str = "main"
    quantity: int = 0
    reserved_qty: int = 0
    lot_number: Optional[str] = None
    expiry_date: Optional[datetime] = None

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(BaseModel):
    warehouse: Optional[str] = None
    quantity: Optional[int] = None
    reserved_qty: Optional[int] = None
    lot_number: Optional[str] = None
    expiry_date: Optional[datetime] = None

class InventoryItemOut(InventoryItemBase):
    id: UUID
    updated_at: datetime
    product: Optional[ProductOut] = None

    class Config:
        from_attributes = True


# ─── StockMovement ───────────────────────────────────────────────────────────

class StockMovementBase(BaseModel):
    product_id: UUID
    movement_type: MovementType
    quantity: int
    unit_cost: Optional[float] = None
    reference_no: Optional[str] = None
    notes: Optional[str] = None

class StockMovementCreate(StockMovementBase):
    pass

class StockMovementOut(StockMovementBase):
    id: UUID
    created_by: Optional[str] = None
    created_at: datetime
    product: Optional[ProductOut] = None

    class Config:
        from_attributes = True


# ─── Paginated responses ─────────────────────────────────────────────────────

class PaginatedProducts(BaseModel):
    items: List[ProductOut]
    total: int
    page: int
    size: int
    pages: int

class PaginatedInventory(BaseModel):
    items: List[InventoryItemOut]
    total: int
    page: int
    size: int
    pages: int