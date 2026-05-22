import asyncio
import sys
sys.path.insert(0, '/app')

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.inventory import Category, Supplier, Product, InventoryItem, StockMovement, MovementType

engine = create_async_engine(settings.DATABASE_URL)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def seed():
    async with AsyncSessionLocal() as db:

        # Categories
        categories = [
            Category(name="Electronics", slug="electronics", description="Electronic components and devices"),
            Category(name="Office Supplies", slug="office-supplies", description="Office consumables and equipment"),
            Category(name="Packaging", slug="packaging", description="Boxes, tape, and packing materials"),
            Category(name="Furniture", slug="furniture", description="Office and warehouse furniture"),
            Category(name="Safety Equipment", slug="safety", description="PPE and safety gear"),
        ]
        for c in categories:
            db.add(c)
        await db.commit()
        for c in categories:
            await db.refresh(c)
        print(f"✓ {len(categories)} categories created")

        # Suppliers
        suppliers = [
            Supplier(name="TechSource Ltd", email="orders@techsource.com", phone="+1-555-0101", lead_time_days=5, reliability_score=0.97),
            Supplier(name="OfficeWorld Inc", email="supply@officeworld.com", phone="+1-555-0102", lead_time_days=3, reliability_score=0.92),
            Supplier(name="PackPro Solutions", email="info@packpro.com", phone="+1-555-0103", lead_time_days=7, reliability_score=0.88),
            Supplier(name="SafetyFirst Co", email="orders@safetyfirst.com", phone="+1-555-0104", lead_time_days=4, reliability_score=0.95),
        ]
        for s in suppliers:
            db.add(s)
        await db.commit()
        for s in suppliers:
            await db.refresh(s)
        print(f"✓ {len(suppliers)} suppliers created")

        # Products
        products = [
            Product(sku="ELEC-001", name="USB-C Hub 7-Port", category_id=categories[0].id, supplier_id=suppliers[0].id, unit_cost=18.50, selling_price=34.99, reorder_point=20, reorder_qty=100, unit_of_measure="unit"),
            Product(sku="ELEC-002", name="Wireless Keyboard", category_id=categories[0].id, supplier_id=suppliers[0].id, unit_cost=22.00, selling_price=49.99, reorder_point=15, reorder_qty=60, unit_of_measure="unit"),
            Product(sku="ELEC-003", name="24-inch Monitor", category_id=categories[0].id, supplier_id=suppliers[0].id, unit_cost=120.00, selling_price=229.99, reorder_point=5, reorder_qty=20, unit_of_measure="unit"),
            Product(sku="ELEC-004", name="Webcam HD 1080p", category_id=categories[0].id, supplier_id=suppliers[0].id, unit_cost=35.00, selling_price=79.99, reorder_point=10, reorder_qty=40, unit_of_measure="unit"),
            Product(sku="OFF-001", name="A4 Paper Ream 500s", category_id=categories[1].id, supplier_id=suppliers[1].id, unit_cost=3.20, selling_price=6.99, reorder_point=50, reorder_qty=200, unit_of_measure="ream"),
            Product(sku="OFF-002", name="Ballpoint Pens Box", category_id=categories[1].id, supplier_id=suppliers[1].id, unit_cost=2.10, selling_price=5.49, reorder_point=30, reorder_qty=150, unit_of_measure="box"),
            Product(sku="OFF-003", name="Stapler Heavy Duty", category_id=categories[1].id, supplier_id=suppliers[1].id, unit_cost=8.00, selling_price=18.99, reorder_point=10, reorder_qty=50, unit_of_measure="unit"),
            Product(sku="PACK-001", name="Cardboard Box 30x20x20", category_id=categories[2].id, supplier_id=suppliers[2].id, unit_cost=0.85, selling_price=1.99, reorder_point=100, reorder_qty=500, unit_of_measure="unit"),
            Product(sku="PACK-002", name="Bubble Wrap Roll 50m", category_id=categories[2].id, supplier_id=suppliers[2].id, unit_cost=12.00, selling_price=24.99, reorder_point=20, reorder_qty=80, unit_of_measure="roll"),
            Product(sku="PACK-003", name="Packing Tape 48mm", category_id=categories[2].id, supplier_id=suppliers[2].id, unit_cost=1.50, selling_price=3.49, reorder_point=40, reorder_qty=200, unit_of_measure="roll"),
            Product(sku="SAFE-001", name="Safety Helmet Class A", category_id=categories[4].id, supplier_id=suppliers[3].id, unit_cost=14.00, selling_price=29.99, reorder_point=15, reorder_qty=60, unit_of_measure="unit"),
            Product(sku="SAFE-002", name="Hi-Vis Vest XL", category_id=categories[4].id, supplier_id=suppliers[3].id, unit_cost=6.50, selling_price=14.99, reorder_point=20, reorder_qty=80, unit_of_measure="unit"),
        ]
        for p in products:
            db.add(p)
        await db.commit()
        for p in products:
            await db.refresh(p)
        print(f"✓ {len(products)} products created")

        # Inventory items with varied stock levels (some low to trigger alerts later)
        quantities = [87, 12, 4, 23, 143, 67, 8, 312, 45, 98, 11, 34]
        inventory_items = []
        for i, product in enumerate(products):
            item = InventoryItem(
                product_id=product.id,
                warehouse="main",
                quantity=quantities[i],
                reserved_qty=0,
            )
            db.add(item)
            inventory_items.append(item)
        await db.commit()
        print(f"✓ {len(inventory_items)} inventory items created")

        # Stock movements (history)
        movements = [
            StockMovement(product_id=products[0].id, movement_type=MovementType.IN, quantity=100, unit_cost=18.50, reference_no="PO-2024-001", notes="Initial stock"),
            StockMovement(product_id=products[0].id, movement_type=MovementType.OUT, quantity=13, reference_no="SO-2024-045"),
            StockMovement(product_id=products[1].id, movement_type=MovementType.IN, quantity=60, unit_cost=22.00, reference_no="PO-2024-002"),
            StockMovement(product_id=products[1].id, movement_type=MovementType.OUT, quantity=48, reference_no="SO-2024-089"),
            StockMovement(product_id=products[2].id, movement_type=MovementType.IN, quantity=20, unit_cost=120.00, reference_no="PO-2024-003"),
            StockMovement(product_id=products[2].id, movement_type=MovementType.OUT, quantity=16, reference_no="SO-2024-102"),
            StockMovement(product_id=products[4].id, movement_type=MovementType.IN, quantity=200, unit_cost=3.20, reference_no="PO-2024-010"),
            StockMovement(product_id=products[4].id, movement_type=MovementType.OUT, quantity=57, reference_no="SO-2024-201"),
            StockMovement(product_id=products[7].id, movement_type=MovementType.IN, quantity=500, unit_cost=0.85, reference_no="PO-2024-015"),
            StockMovement(product_id=products[7].id, movement_type=MovementType.OUT, quantity=188, reference_no="SO-2024-310"),
        ]
        for m in movements:
            db.add(m)
        await db.commit()
        print(f"✓ {len(movements)} stock movements created")

        print("\n✅ Seed complete! Summary:")
        print(f"   - {len(categories)} categories")
        print(f"   - {len(suppliers)} suppliers")
        print(f"   - {len(products)} products")
        print(f"   - {len(inventory_items)} inventory items")
        print(f"   - {len(movements)} stock movements")
        print("\n   Low stock items (below reorder point):")
        for i, p in enumerate(products):
            if quantities[i] <= p.reorder_point:
                print(f"   ⚠️  {p.name}: {quantities[i]} units (reorder at {p.reorder_point})")


if __name__ == "__main__":
    asyncio.run(seed())