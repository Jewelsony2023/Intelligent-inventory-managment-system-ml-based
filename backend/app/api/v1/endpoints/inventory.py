from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.db.session import get_db
from app.core.rbac import require_permission
from app.models.inventory import Category, Supplier, Product, InventoryItem, StockMovement
from app.schemas.inventory import (
    CategoryCreate, CategoryUpdate, CategoryOut,
    SupplierCreate, SupplierUpdate, SupplierOut,
    ProductCreate, ProductUpdate, ProductOut, PaginatedProducts,
    InventoryItemCreate, InventoryItemUpdate, InventoryItemOut, PaginatedInventory,
    StockMovementCreate, StockMovementOut,
)

router = APIRouter()


# ─── Categories ──────────────────────────────────────────────────────────────

@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_permission("inventory:read")),
):
    result = await db.execute(select(Category).where(Category.is_active == True))
    return result.scalars().all()


@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_permission("inventory:write")),
):
    category = Category(**payload.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.get("/categories/{category_id}", response_model=CategoryOut)
async def get_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_permission("inventory:read")),
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.patch("/categories/{category_id}", response_model=CategoryOut)
async def update_category(
    category_id: UUID,
    payload: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_permission("inventory:write")),
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    await db.commit()
    await db.refresh(category)
    return category


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_permission("inventory:delete")),
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    category.is_active = False
    await db.commit()


# ─── Suppliers ───────────────────────────────────────────────────────────────

@router.get("/suppliers", response_model=list[SupplierOut])
async def list_suppliers(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_permission("inventory:read")),
):
    result = await db.execute(select(Supplier).where(Supplier.is_active == True))
    return result.scalars().all()


@router.post("/suppliers", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    payload: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_permission("inventory:write")),
):
    supplier = Supplier(**payload.model_dump())
    db.add(supplier)
    await db.commit()
    await db.refresh(supplier)
    return supplier


@router.get("/suppliers/{supplier_id}", response_model=SupplierOut)
async def get_supplier(
    supplier_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_permission("inventory:read")),
):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@router.patch("/suppliers/{supplier_id}", response_model=SupplierOut)
async def update_supplier(
    supplier_id: UUID,
    payload: SupplierUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_permission("inventory:write")),
):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)
    await db.commit()
    await db.refresh(supplier)
    return supplier


@router.delete("/suppliers/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supplier(
    supplier_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_permission("inventory:delete")),
):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    supplier.is_active = False
    await db.commit()


# ─── Products ────────────────────────────────────────────────────────────────

@router.get("/products", response_model=PaginatedProducts)
async def list_products(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    category_id: Optional[UUID] = Query(None),
    supplier_id: Optional[UUID] = Query(None),
    low_stock: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_permission("inventory:read")),
):
    query = select(Product).where(Product.is_active == True)

    if search:
        query = query.where(
            or_(
                Product.name.ilike(f"%{search}%"),
                Product.sku.ilike(f"%{search}%"),
                Product.barcode.ilike(f"%{search}%"),
            )
        )
    if category_id:
        query = query.where(Product.category_id == category_id)
    if supplier_id:
        query = query.where(Product.supplier_id == supplier_id)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    products = result.scalars().all()

    return {
        "items": products,
        "total": total,
        "page": page,
        "size": size,
        "pages": -(-total // size),
    }


@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission("inventory:write")),
):
    existing = await db.execute(select(Product).where(Product.sku == payload.sku))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="SKU already exists")

    product = Product(**payload.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


@router.get("/products/{product_id}", response_model=ProductOut)
async def get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_permission("inventory:read")),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.patch("/products/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: UUID,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_permission("inventory:write")),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await db.commit()
    await db.refresh(product)
    return product


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_permission("inventory:delete")),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = False
    await db.commit()


# ─── Inventory Items ─────────────────────────────────────────────────────────

@router.get("/inventory", response_model=PaginatedInventory)
async def list_inventory(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    warehouse: Optional[str] = Query(None),
    product_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_permission("inventory:read")),
):
    query = select(InventoryItem)
    if warehouse:
        query = query.where(InventoryItem.warehouse == warehouse)
    if product_id:
        query = query.where(InventoryItem.product_id == product_id)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)

    return {
        "items": result.scalars().all(),
        "total": total,
        "page": page,
        "size": size,
        "pages": -(-total // size),
    }


@router.post("/inventory", response_model=InventoryItemOut, status_code=status.HTTP_201_CREATED)
async def create_inventory_item(
    payload: InventoryItemCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_permission("inventory:write")),
):
    item = InventoryItem(**payload.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.patch("/inventory/{item_id}", response_model=InventoryItemOut)
async def update_inventory_item(
    item_id: UUID,
    payload: InventoryItemUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_permission("inventory:write")),
):
    result = await db.execute(select(InventoryItem).where(InventoryItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


# ─── Stock Movements ─────────────────────────────────────────────────────────

@router.get("/movements", response_model=list[StockMovementOut])
async def list_movements(
    product_id: Optional[UUID] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_permission("inventory:read")),
):
    query = select(StockMovement).order_by(StockMovement.created_at.desc()).limit(limit)
    if product_id:
        query = query.where(StockMovement.product_id == product_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/movements", response_model=StockMovementOut, status_code=status.HTTP_201_CREATED)
async def create_movement(
    payload: StockMovementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission("inventory:write")),
):
    movement = StockMovement(**payload.model_dump(), created_by=current_user["id"])
    db.add(movement)

    # Update inventory quantity automatically
    inv_result = await db.execute(
        select(InventoryItem).where(InventoryItem.product_id == payload.product_id)
    )
    inv_item = inv_result.scalar_one_or_none()

    if inv_item:
        if payload.movement_type.value in ("IN", "TRANSFER"):
            inv_item.quantity += payload.quantity
        elif payload.movement_type.value == "OUT":
            if inv_item.quantity < payload.quantity:
                raise HTTPException(status_code=400, detail="Insufficient stock")
            inv_item.quantity -= payload.quantity
    else:
        # Auto-create inventory record on first IN movement
        if payload.movement_type.value == "IN":
            new_item = InventoryItem(product_id=payload.product_id, quantity=payload.quantity)
            db.add(new_item)

    await db.commit()
    await db.refresh(movement)
    return movement