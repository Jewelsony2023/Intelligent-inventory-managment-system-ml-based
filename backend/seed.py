"""
Run: python seed.py
Creates the initial admin user for the system.
"""
import asyncio
import uuid
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from app.core.security import hash_password
from app.core.rbac import Role
from app.models.user import User
from app.db.session import Base


async def seed():
    engine = create_async_engine(settings.DATABASE_URL)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with Session() as session:
        existing = await session.execute(select(User).where(User.email == "admin@inventory-iq.com"))
        if existing.scalar_one_or_none():
            print("✅ Admin user already exists")
            return

        admin = User(
            id=str(uuid.uuid4()),
            email="admin@inventory-iq.com",
            full_name="System Admin",
            hashed_password=hash_password("Admin1234!"),
            role=Role.ADMIN,
            is_active=True,
            is_verified=True,
        )
        session.add(admin)
        await session.commit()
        print("✅ Admin user created: admin@inventory-iq.com / Admin1234!")
        print("⚠️  Change this password immediately after first login!")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
