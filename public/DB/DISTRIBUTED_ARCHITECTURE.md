# KIẾN TRÚC PHÂN TÁN DATABASE - 3 CLIENT (BẮC, TRUNG, NAM)

## 🎯 TỔNG QUAN

Database được thiết kế để phân tán đến **3 clients** theo vùng địa lý:
- **Client Bắc**: Hà Nội (miền Bắc)
- **Client Trung**: Đà Nẵng (miền Trung)  
- **Client Nam**: TP.HCM (miền Nam)

## ✅ CÁC CẢI TIẾN ĐÃ THỰC HIỆN

### 1. **GUID Generation Strategy**
✅ **Tất cả bảng đã chuyển sang NEWSEQUENTIALID()**
- Tránh GUID collision khi merge data từ 3 sites
- Sequential GUID tốt hơn cho index performance
- Hỗ trợ SQL Server Replication/Merge

### 2. **Conflict Detection với ROWVERSION**
✅ **Thêm cột `row_version ROWVERSION`** vào các bảng quan trọng:
- `regions`, `provinces`, `wards`
- `products`, `product_variants`
- `users`, `user_addresses`
- `warehouses`, `inventory`
- `shipping_methods`, `shipping_method_regions`
- `vouchers`, `flash_sales`, `flash_sale_items`
- `orders`, `carts`
- `reviews`, `payments`

**Lợi ích**:
- Phát hiện conflict khi merge replication
- Timestamp tự động tăng mỗi khi update
- SQL Server dùng để resolve conflicts

### 3. **Site Tracking Columns**
✅ **Thêm các cột tracking**:
- `site_origin`: Site tạo record (bac/trung/nam)
- `site_registered`: Site user đăng ký
- `site_processed`: Site xử lý đơn hàng
- `site_created`: Site tạo voucher/flash sale

**Mục đích**:
- Biết data từ site nào
- Routing queries về đúng site
- Audit trail cho distributed system

### 4. **Partitioning Strategy**

#### 📊 **REFERENCE DATA** (Replicate to all sites)
Các bảng này được **replicate đến cả 3 sites**:
```
✅ regions
✅ provinces  
✅ wards
✅ brands
✅ categories
✅ products
✅ product_variants
✅ shipping_methods
✅ shipping_method_regions
✅ vouchers
✅ flash_sales
✅ flash_sale_items
```

**Chiến lược**:
- **Merge Replication**: Bi-directional sync
- **Conflict Resolution**: Last-write-wins hoặc custom resolver
- **Frequency**: Every 5-15 minutes

---

#### 🔒 **TRANSACTIONAL DATA** (Partitioned - NO replication)
Các bảng này **KHÔNG replicate**, mỗi site chỉ lưu data của site mình:

**Partition by `vung_id` / `site_registered` / `site_processed`:**
```
❌ users (partitioned by site_registered)
❌ user_addresses (follows user)
❌ warehouses (each site has own warehouse)
❌ inventory (partitioned by warehouse's vung_id)
❌ orders (partitioned by site_processed)
❌ order_details (follows orders)
❌ carts (partitioned by user's vung_id)
❌ cart_items (follows carts)
❌ reviews (follows orders)
❌ payments (follows orders)
❌ used_vouchers (local tracking)
❌ flash_sale_orders (local tracking)
❌ otp_codes (local only)
❌ order_status_history (follows orders)
```

**Chiến lược**:
- **Horizontal Partitioning**: Mỗi site chỉ lưu data của vùng mình
- **No Replication**: Giảm network traffic, tăng performance
- **Cross-site queries**: Dùng Linked Server hoặc API khi cần

---

## 🏗️ REPLICATION TOPOLOGY

### **Merge Replication (for Reference Data)**

```
┌─────────────────┐
│   CLIENT BẮC    │ 
│   (Hà Nội)      │◄─────┐
└────────┬────────┘       │
         │                │
         │    MERGE       │
         ▼  REPLICATION   │
┌─────────────────┐       │
│  CLIENT TRUNG   │       │
│   (Đà Nẵng)     │◄──────┤
└────────┬────────┘       │
         │                │
         │                │
         ▼                │
┌─────────────────┐       │
│   CLIENT NAM    │       │
│   (TP.HCM)      │───────┘
└─────────────────┘
```

**Cấu hình Merge Replication**:
1. **Publisher**: Tất cả 3 sites đều là Publisher
2. **Subscriber**: Mỗi site subscribe từ 2 sites còn lại
3. **Conflict Resolution**: 
   - Dùng `row_version` để detect
   - Priority: Bắc (3) > Trung (2) > Nam (1)
   - Hoặc Last-Write-Wins

---

## 📍 DATA OWNERSHIP & ROUTING

### **Quy tắc Ownership**

| Data Type | Owner Site | Rule |
|-----------|-----------|------|
| **Products** | Bất kỳ site nào tạo | Replicate to all |
| **Users** | Site đăng ký (`site_registered`) | Stay at registration site |
| **Orders** | Site xử lý (`site_processed`) | Stay at processing site |
| **Inventory** | Site có warehouse | Local only |
| **Vouchers** | Site tạo (`site_created`) | Replicate to all |

### **Query Routing Strategy**

#### ✅ **Scenario 1: User ở Bắc mua hàng**
```
User (vung_id=bac) → Client Bắc
├── Create Order (site_processed=bac) → Lưu tại Client Bắc
├── Check Inventory → Query warehouse Bắc
├── Apply Voucher → Query local (đã replicate)
└── Payment → Lưu tại Client Bắc
```

#### ✅ **Scenario 2: Admin xem tổng doanh thu toàn quốc**
```
Admin → Send query to all 3 sites
├── Query Client Bắc → SUM(orders WHERE site_processed='bac')
├── Query Client Trung → SUM(orders WHERE site_processed='trung')
├── Query Client Nam → SUM(orders WHERE site_processed='nam')
└── Aggregate results → Total revenue
```

---

## 🔧 IMPLEMENTATION STEPS

### **Bước 1: Setup SQL Server Replication**

```sql
-- Trên mỗi SQL Server instance (3 servers)

-- 1. Enable Distributor
EXEC sp_adddistributor @distributor = @@SERVERNAME;

-- 2. Create Distribution Database
EXEC sp_adddistributiondb 
    @database = 'distribution',
    @security_mode = 1;

-- 3. Create Publication (cho Reference Data)
EXEC sp_addmergepublication
    @publication = 'ReferenceDataPublication',
    @database = 'DB_WEBPHONES',
    @sync_mode = 'native',
    @centralized_conflicts = 'false';

-- 4. Add Articles (tables to replicate)
EXEC sp_addmergearticle
    @publication = 'ReferenceDataPublication',
    @article = 'products',
    @source_object = 'products',
    @type = 'table',
    @column_tracking = 'true',
    @vertical_partition = 'false';

-- Lặp lại cho: brands, categories, product_variants, vouchers...
```

### **Bước 2: Create Subscriptions**

```sql
-- Trên Client Bắc: Subscribe từ Client Trung và Nam
EXEC sp_addmergesubscription
    @publication = 'ReferenceDataPublication',
    @subscriber = 'SERVER_TRUNG',
    @subscriber_db = 'DB_WEBPHONES',
    @subscription_type = 'pull';

EXEC sp_addmergesubscription
    @publication = 'ReferenceDataPublication',
    @subscriber = 'SERVER_NAM',
    @subscriber_db = 'DB_WEBPHONES',
    @subscription_type = 'pull';
```

### **Bước 3: Setup Partitioned Views (Optional)**

Nếu cần query cross-site từ 1 điểm:

```sql
-- Tại Central Server (hoặc bất kỳ site nào)
CREATE VIEW vw_AllOrders AS
SELECT *, 'bac' AS source_site 
FROM LINKEDSERVER_BAC.DB_WEBPHONES.dbo.orders
UNION ALL
SELECT *, 'trung' AS source_site 
FROM LINKEDSERVER_TRUNG.DB_WEBPHONES.dbo.orders
UNION ALL
SELECT *, 'nam' AS source_site 
FROM LINKEDSERVER_NAM.DB_WEBPHONES.dbo.orders;
```

---

## 🚨 CONFLICT RESOLUTION RULES

### **Rule 1: Product Updates**
- **Conflict**: 2 sites cập nhật cùng 1 product
- **Resolution**: Priority by site (Bắc > Trung > Nam)
- **Detect**: Dùng `row_version`

### **Rule 2: Inventory Updates**
- **Conflict**: KHÔNG XẢY RA (mỗi site chỉ update inventory của warehouse mình)

### **Rule 3: Voucher Usage**
- **Conflict**: 2 sites cùng dùng voucher (nếu voucher toàn quốc)
- **Resolution**: 
  - Check `da_su_dung` counter
  - Atomic increment with lock
  - Nếu exceed `so_luong` → Rollback transaction tại site thứ 2

---

## 📊 MONITORING & MAINTENANCE

### **Replication Health Check**

```sql
-- Check replication status
EXEC sp_helpmergepublication;
EXEC sp_helpmergearticle;

-- Monitor conflicts
SELECT * FROM MSmerge_conflicts_info;

-- Check sync status
SELECT * FROM MSmerge_sessions;
```

### **Performance Optimization**

1. **Indexes for Partitioned Queries**:
```sql
-- Index on partition key
CREATE INDEX IDX_orders_site_processed 
ON orders(site_processed) INCLUDE (ngay_tao, tong_thanh_toan);

CREATE INDEX IDX_users_site_registered 
ON users(site_registered) INCLUDE (email, vung_id);
```

2. **Compression** (giảm network traffic):
```sql
ALTER TABLE products REBUILD WITH (DATA_COMPRESSION = PAGE);
```

---

## ✅ CHECKLIST TRIỂN KHAI

- [x] Tất cả bảng dùng NEWSEQUENTIALID()
- [x] Thêm `row_version` vào bảng quan trọng
- [x] Thêm `site_*` tracking columns
- [x] Phân loại Reference Data vs Transactional Data
- [x] Fix `warehouses.vung_id` từ UNIQUEIDENTIFIER → NVARCHAR(10)
- [ ] Setup Merge Replication cho Reference Data
- [ ] Setup Linked Servers (nếu cần cross-site query)
- [ ] Tạo Partitioned Views cho reporting
- [ ] Config conflict resolution policies
- [ ] Testing với concurrent updates
- [ ] Monitoring dashboard

---

## 🎓 KẾT LUẬN

Database **ĐÃ SẴN SÀNG** cho distributed deployment với:

✅ **No GUID Conflicts**: NEWSEQUENTIALID() trên tất cả bảng
✅ **Conflict Detection**: ROWVERSION cho merge replication  
✅ **Clear Ownership**: Site tracking columns
✅ **Optimized Partitioning**: Reference vs Transactional separation
✅ **Scalable**: Mỗi site handle traffic của vùng mình

**Next Steps**:
1. Test merge replication với 2-3 servers
2. Benchmark cross-site query performance
3. Setup monitoring alerts
4. Document disaster recovery procedures
