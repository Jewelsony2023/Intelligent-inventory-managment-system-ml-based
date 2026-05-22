from enum import Enum
from typing import Set


class Role(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    WAREHOUSE_STAFF = "warehouse_staff"
    VIEWER = "viewer"


class Permission(str, Enum):
    # Inventory
    INVENTORY_READ = "inventory:read"
    INVENTORY_WRITE = "inventory:write"
    INVENTORY_DELETE = "inventory:delete"

    # Products
    PRODUCT_READ = "product:read"
    PRODUCT_WRITE = "product:write"
    PRODUCT_DELETE = "product:delete"

    # Orders / Purchase Orders
    ORDER_READ = "order:read"
    ORDER_WRITE = "order:write"
    ORDER_APPROVE = "order:approve"

    # Suppliers
    SUPPLIER_READ = "supplier:read"
    SUPPLIER_WRITE = "supplier:write"

    # Analytics & Forecasting
    ANALYTICS_READ = "analytics:read"
    FORECAST_READ = "forecast:read"
    FORECAST_CONFIGURE = "forecast:configure"

    # Alerts
    ALERT_READ = "alert:read"
    ALERT_MANAGE = "alert:manage"

    # Users / Roles (admin only)
    USER_READ = "user:read"
    USER_WRITE = "user:write"
    USER_DELETE = "user:delete"
    ROLE_MANAGE = "role:manage"

    # Audit log
    AUDIT_READ = "audit:read"

    # Settings
    SETTINGS_READ = "settings:read"
    SETTINGS_WRITE = "settings:write"


# Role → Permission mapping
ROLE_PERMISSIONS: dict[Role, Set[Permission]] = {
    Role.ADMIN: set(Permission),  # All permissions

    Role.MANAGER: {
        Permission.INVENTORY_READ,
        Permission.INVENTORY_WRITE,
        Permission.PRODUCT_READ,
        Permission.PRODUCT_WRITE,
        Permission.ORDER_READ,
        Permission.ORDER_WRITE,
        Permission.ORDER_APPROVE,
        Permission.SUPPLIER_READ,
        Permission.SUPPLIER_WRITE,
        Permission.ANALYTICS_READ,
        Permission.FORECAST_READ,
        Permission.FORECAST_CONFIGURE,
        Permission.ALERT_READ,
        Permission.ALERT_MANAGE,
        Permission.USER_READ,
        Permission.AUDIT_READ,
        Permission.SETTINGS_READ,
    },

    Role.WAREHOUSE_STAFF: {
        Permission.INVENTORY_READ,
        Permission.INVENTORY_WRITE,
        Permission.PRODUCT_READ,
        Permission.ORDER_READ,
        Permission.ORDER_WRITE,
        Permission.SUPPLIER_READ,
        Permission.ALERT_READ,
        Permission.ANALYTICS_READ,
        Permission.FORECAST_READ,
    },

    Role.VIEWER: {
        Permission.INVENTORY_READ,
        Permission.PRODUCT_READ,
        Permission.ORDER_READ,
        Permission.SUPPLIER_READ,
        Permission.ANALYTICS_READ,
        Permission.FORECAST_READ,
        Permission.ALERT_READ,
    },
}


def get_permissions(role: Role) -> Set[Permission]:
    return ROLE_PERMISSIONS.get(role, set())


def has_permission(role: Role, permission: Permission) -> bool:
    return permission in get_permissions(role)
