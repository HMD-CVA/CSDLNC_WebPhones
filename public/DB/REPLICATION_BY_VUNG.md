# REPLICATION THEO MA_VUNG (BẮC, TRUNG, NAM)

## ✅ ĐÁNH GIÁ: DATABASE ĐÃ SẴN SÀNG CHO REPLICATION

Database của bạn **ĐÃ ĐÁP ỨNG** yêu cầu replication theo `ma_vung` với các cải tiến sau:

---

## 🎯 CHIẾN LƯỢC REPLICATION

### **Mô hình: Merge Replication với Partition theo ma_vung**

```
┌─────────────────┐
│   PUBLISHER     │
│  (Central DB)   │
└────────┬────────┘
         │
    ┌────┴────┬──────────┐
    │         │          │
┌───▼───┐ ┌──▼───┐ ┌────▼──┐
│ BẮC   │ │ TRUNG│ │ NAM   │
│(HN)   │ │(ĐN)  │ │(HCM)  │
└───────┘ └──────┘ └───────┘
```

---

## 📊 PHÂN LOẠI DỮ LIỆU THEO CHIẾN LƯỢC REPLICATION

### **1. REFERENCE DATA - Replicate toàn cục (Tất cả sites đồng bộ)**

Các bảng này được **REPLICATE** đến cả 3 vùng:

| STT | Bảng | Lý do |
|-----|------|-------|
| 1 | `regions` | Danh sách 3 vùng (bac, trung, nam) |
| 2 | `provinces` | Tất cả tỉnh/thành phố VN |
| 3 | `wards` | Tất cả phường/xã VN |
| 4 | `brands` | Thương hiệu (Apple, Samsung...) |
| 5 | `categories` | Danh mục sản phẩm |
| 6 | `shipping_methods` | Phương thức vận chuyển |

**Cách thức:**
- Sử dụng **Snapshot Replication** hoặc **Transactional Replication**
- Cập nhật 1 chiều từ Central → 3 sites
- Đọc local, ghi central

---

### **2. PARTITIONED DATA - Partition theo vùng (Mỗi vùng chỉ replicate data của mình)**

#### **A. Partition theo `vung_id` (User thuộc vùng nào)**

| STT | Bảng | Partition Key | Filter |
|-----|------|---------------|--------|
| 8 | `users` | `vung_id` | `WHERE vung_id = 'bac'` |
| 9 | `user_addresses` | user → `vung_id` | Join với users |
| 10 | `warehouses` | `vung_id` | `WHERE vung_id = 'bac'` + UNIQUE constraint |
| 11 | `inventory` | warehouse → `vung_id` | Join với warehouses |
| 24 | `carts` | `vung_id` | `WHERE vung_id = 'bac'` |
| 25 | `cart_items` | cart → `vung_id` | Join với carts |

**Ví dụ Bắc:**
```sql
-- Chỉ replicate users thuộc vùng Bắc
WHERE vung_id = 'bac'
```

#### **B. Partition theo `site_origin` (Sản phẩm do site nào tạo)**

| STT | Bảng | Partition Key | Filter |
|-----|------|---------------|--------|
| 6 | `products` | `site_origin` | `WHERE site_origin = 'bac'` |
| 7 | `product_variants` | `site_origin` | `WHERE site_origin = 'bac'` |

**Lý do:**
- Mỗi vùng quản lý sản phẩm riêng
- Có thể có cùng sản phẩm nhưng khác giá theo vùng

#### **C. Partition theo `vung_don_hang` (Đơn hàng thuộc vùng nào)**

| STT | Bảng | Partition Key | Filter |
|-----|------|---------------|--------|
| 20 | `orders` | `vung_don_hang` | `WHERE vung_don_hang = 'bac'` |
| 21 | `order_details` | order → `vung_don_hang` | Join với orders |
| 22 | `payments` | order → `vung_don_hang` | Join với orders |
| 23 | `order_status_history` | order → `vung_don_hang` | Join với orders |
| 26 | `reviews` | order → `vung_don_hang` | Join với orders |

#### **D. Partition theo `site_created` (Khuyến mãi do site nào tạo)**

| STT | Bảng | Partition Key | Filter |
|-----|------|---------------|--------|
| 14 | `vouchers` | `site_created` | `WHERE site_created = 'bac'` |
| 15 | `voucher_products` | voucher → `site_created` | Join với vouchers |
| 16 | `used_vouchers` | voucher → `site_created` | Join với vouchers |
| 17 | `flash_sales` | `site_created` | `WHERE site_created = 'bac'` |
| 18 | `flash_sale_items` | flash_sale → `site_created` | Join với flash_sales |
| 19 | `flash_sale_orders` | flash_sale → `site_created` | Join với flash_sales |

---

### **3. SHARED DATA - Partition Filter lồng ghép**

| STT | Bảng | Filter Strategy |
|-----|------|-----------------|
| 13 | `shipping_method_regions` | `WHERE region_id = 'bac'` |
| 27 | `otp_codes` | Replicate toàn cục (expire nhanh) |

---

## 🔧 CẤU HÌNH MERGE REPLICATION

### **Bước 1: Tạo Publication tại Central Server**

```sql
USE DB_WEBPHONES;
GO

-- 1. Enable database for replication
EXEC sp_replicationdboption 
    @dbname = N'DB_WEBPHONES',
    @optname = N'merge publish',
    @value = N'true';
GO

-- 2. Tạo Publication cho vùng BẮC
EXEC sp_addmergepublication 
    @publication = N'WebPhones_BAC',
    @description = N'Replication cho vùng Bắc',
    @retention = 14,
    @sync_mode = N'native',
    @allow_push = N'true',
    @allow_pull = N'true',
    @allow_anonymous = N'false',
    @enabled_for_internet = N'false',
    @snapshot_in_defaultfolder = N'true',
    @compress_snapshot = N'false',
    @ftp_port = 21,
    @ftp_login = N'anonymous',
    @allow_subscription_copy = N'false',
    @add_to_active_directory = N'false',
    @dynamic_filters = N'true',
    @conflict_retention = 14,
    @keep_partition_changes = N'false',
    @allow_synctoalternate = N'false',
    @max_concurrent_merge = 0,
    @max_concurrent_dynamic_snapshots = 0,
    @use_partition_groups = N'true',
    @publication_compatibility_level = N'100RTM',
    @replicate_ddl = 1,
    @allow_subscriber_initiated_snapshot = N'false',
    @allow_web_synchronization = N'false',
    @allow_partition_realignment = N'true',
    @retention_period_unit = N'days',
    @conflict_logging = N'both',
    @automatic_reinitialization_policy = 0;
GO
```

---

### **Bước 2: Thêm Articles với Partition Filter**

#### **A. Reference Data (Replicate toàn bộ)**

```sql
-- Bảng regions (toàn bộ)
EXEC sp_addmergearticle 
    @publication = N'WebPhones_BAC',
    @article = N'regions',
    @source_owner = N'dbo',
    @source_object = N'regions',
    @type = N'table',
    @description = N'Bảng vùng miền',
    @column_tracking = N'true',
    @schema_option = 0x000000000803509F,
    @identityrangemanagementoption = N'auto',
    @destination_owner = N'dbo',
    @force_invalidate_snapshot = 1,
    @force_reinit_subscription = 1;
GO

-- Tương tự cho: provinces, wards, brands, categories, shipping_methods
```

#### **B. Partitioned Data - Filter theo vung_id**

```sql
-- Bảng users - CHỈ replicate users thuộc vùng BẮC
EXEC sp_addmergearticle 
    @publication = N'WebPhones_BAC',
    @article = N'users',
    @source_owner = N'dbo',
    @source_object = N'users',
    @type = N'table',
    @description = N'Người dùng vùng Bắc',
    @column_tracking = N'true',
    @schema_option = 0x000000000803509F,
    @identityrangemanagementoption = N'auto',
    @destination_owner = N'dbo',
    @subset_filterclause = N'vung_id = N''bac''',  -- ← FILTER KEY
    @force_invalidate_snapshot = 1,
    @force_reinit_subscription = 1;
GO

-- Bảng warehouses - CHỈ kho Bắc (có UNIQUE constraint)
EXEC sp_addmergearticle 
    @publication = N'WebPhones_BAC',
    @article = N'warehouses',
    @source_owner = N'dbo',
    @source_object = N'warehouses',
    @type = N'table',
    @description = N'Kho vùng Bắc',
    @column_tracking = N'true',
    @schema_option = 0x000000000803509F,
    @identityrangemanagementoption = N'auto',
    @destination_owner = N'dbo',
    @subset_filterclause = N'vung_id = N''bac''',  -- ← FILTER KEY
    @force_invalidate_snapshot = 1,
    @force_reinit_subscription = 1;
GO
```

#### **C. Partitioned Data - Filter theo site_origin**

```sql
-- Bảng products - Sản phẩm do Bắc tạo
EXEC sp_addmergearticle 
    @publication = N'WebPhones_BAC',
    @article = N'products',
    @source_owner = N'dbo',
    @source_object = N'products',
    @type = N'table',
    @description = N'Sản phẩm vùng Bắc',
    @column_tracking = N'true',
    @schema_option = 0x000000000803509F,
    @identityrangemanagementoption = N'auto',
    @destination_owner = N'dbo',
    @subset_filterclause = N'site_origin = N''bac''',  -- ← FILTER KEY
    @force_invalidate_snapshot = 1,
    @force_reinit_subscription = 1;
GO
```

#### **D. Partitioned Data - Filter theo vung_don_hang**

```sql
-- Bảng orders - Đơn hàng thuộc vùng Bắc
EXEC sp_addmergearticle 
    @publication = N'WebPhones_BAC',
    @article = N'orders',
    @source_owner = N'dbo',
    @source_object = N'orders',
    @type = N'table',
    @description = N'Đơn hàng vùng Bắc',
    @column_tracking = N'true',
    @schema_option = 0x000000000803509F,
    @identityrangemanagementoption = N'auto',
    @destination_owner = N'dbo',
    @subset_filterclause = N'vung_don_hang = N''bac''',  -- ← FILTER KEY
    @force_invalidate_snapshot = 1,
    @force_reinit_subscription = 1;
GO
```

#### **E. Join Filter - Bảng con theo bảng cha**

```sql
-- user_addresses filter theo users (JOIN)
EXEC sp_addmergefilter 
    @publication = N'WebPhones_BAC',
    @article = N'user_addresses',
    @filtername = N'user_addresses_users_filter',
    @join_articlename = N'users',
    @join_filterclause = N'[users].[id] = [user_addresses].[user_id]',
    @join_unique_key = 1,
    @filter_type = 1,
    @force_invalidate_snapshot = 1,
    @force_reinit_subscription = 1;
GO

-- order_details filter theo orders (JOIN)
EXEC sp_addmergefilter 
    @publication = N'WebPhones_BAC',
    @article = N'order_details',
    @filtername = N'order_details_orders_filter',
    @join_articlename = N'orders',
    @join_filterclause = N'[orders].[id] = [order_details].[don_hang_id]',
    @join_unique_key = 1,
    @filter_type = 1,
    @force_invalidate_snapshot = 1,
    @force_reinit_subscription = 1;
GO

-- Tương tự cho: payments, order_status_history, reviews (join orders)
-- cart_items (join carts), inventory (join warehouses)
-- voucher_products, used_vouchers (join vouchers)
-- flash_sale_items, flash_sale_orders (join flash_sales)
```

---

### **Bước 3: Tạo Subscription tại Site BẮC**

```sql
-- Tại server vùng BẮC
USE DB_WEBPHONES;
GO

EXEC sp_addmergepullsubscription 
    @publication = N'WebPhones_BAC',
    @publisher = N'CENTRAL_SERVER',
    @publisher_db = N'DB_WEBPHONES',
    @subscriber_type = N'local',
    @subscription_priority = 75.0,  -- Priority cho conflict resolution
    @sync_type = N'automatic',
    @description = N'Pull subscription vùng Bắc';
GO

EXEC sp_addmergepullsubscription_agent 
    @publication = N'WebPhones_BAC',
    @publisher = N'CENTRAL_SERVER',
    @publisher_db = N'DB_WEBPHONES',
    @distributor = N'CENTRAL_SERVER',
    @subscriber_security_mode = 1,
    @frequency_type = 4,  -- Daily
    @frequency_interval = 1,
    @frequency_relative_interval = 0,
    @frequency_recurrence_factor = 0,
    @frequency_subday = 8,  -- Every 1 hour
    @frequency_subday_interval = 1,
    @active_start_time_of_day = 0,
    @active_end_time_of_day = 235959,
    @active_start_date = 0,
    @active_end_date = 0;
GO
```

---

### **Bước 4: Lặp lại cho vùng TRUNG và NAM**

Tạo 2 publication khác:
- `WebPhones_TRUNG` với filter `vung_id = N'trung'`
- `WebPhones_NAM` với filter `vung_id = N'nam'`

---

## 🔍 INDEX TỐI ỮU CHO REPLICATION

Database đã có các index sau để tối ưu partition query:

```sql
-- Products
CREATE INDEX IDX_products_site_origin ON products(site_origin) 
WHERE site_origin IS NOT NULL;

-- Product Variants
CREATE INDEX IDX_product_variants_site_origin ON product_variants(site_origin) 
WHERE site_origin IS NOT NULL;

-- Users
CREATE INDEX IDX_users_vung_id ON users(vung_id);
CREATE INDEX IDX_users_site_registered ON users(site_registered);

-- Warehouses
CREATE INDEX IDX_warehouses_vung_id ON warehouses(vung_id);

-- Orders (QUAN TRỌNG - partition key chính)
CREATE INDEX IDX_orders_vung_don_hang ON orders(vung_don_hang);
CREATE INDEX IDX_orders_site_processed ON orders(site_processed);

-- Vouchers
CREATE INDEX IDX_vouchers_site_created ON vouchers(site_created) 
WHERE site_created IS NOT NULL;

-- Flash Sales
CREATE INDEX IDX_flash_sales_site_created ON flash_sales(site_created) 
WHERE site_created IS NOT NULL;

-- Carts
CREATE INDEX IDX_carts_vung_id ON carts(vung_id);
```

---

## ⚡ CONFLICT RESOLUTION STRATEGY

### **1. Priority-based Resolution**

```sql
-- Priority theo vùng:
-- Bắc: 75.0
-- Trung: 75.0
-- Nam: 75.0

-- Nếu conflict, SQL Server chọn theo:
1. Subscription priority (cao hơn thắng)
2. Nếu bằng nhau → row thay đổi gần nhất thắng
3. Nếu vẫn bằng → Publisher thắng
```

### **2. Custom Conflict Resolver**

Sử dụng **Business Logic Handler** cho các rule phức tạp:

```csharp
// Ví dụ: Conflict trong inventory
if (conflict.ConflictType == ConflictType.UpdateUpdate)
{
    // Priority: Số lượng inventory nhiều hơn thắng
    int subscriberQty = (int)conflict.SubscriberRow["so_luong_kha_dung"];
    int publisherQty = (int)conflict.PublisherRow["so_luong_kha_dung"];
    
    if (subscriberQty > publisherQty)
        return ActionOnUpdateConflict.AcceptCustomConflictData;
    else
        return ActionOnUpdateConflict.AcceptPublisherData;
}
```

---

## 📊 MONITORING & MAINTENANCE

### **Kiểm tra Replication Status**

```sql
-- Tại Publisher
SELECT 
    publication_name = p.name,
    subscriber = s.name,
    last_sync = mh.time,
    status = CASE mh.runstatus
        WHEN 1 THEN 'Start'
        WHEN 2 THEN 'Succeed'
        WHEN 3 THEN 'In Progress'
        WHEN 4 THEN 'Idle'
        WHEN 5 THEN 'Retry'
        WHEN 6 THEN 'Fail'
    END,
    delivery_rate = mh.delivery_rate,
    download_inserts = mh.download_inserts,
    download_updates = mh.download_updates,
    download_deletes = mh.download_deletes,
    conflicts = mh.conflicts
FROM 
    dbo.sysmergepublications p
    INNER JOIN dbo.sysmergesubscriptions s ON p.pubid = s.pubid
    LEFT JOIN dbo.MSmerge_history mh ON s.subscriber_id = mh.subscriber_id
WHERE 
    mh.time = (
        SELECT MAX(time) 
        FROM dbo.MSmerge_history 
        WHERE subscriber_id = s.subscriber_id
    )
ORDER BY p.name, s.name;
```

### **Xem Conflicts**

```sql
-- Xem conflict details
SELECT 
    article_name = a.name,
    conflict_table = ct.name,
    conflict_time = c.conflict_time,
    reason = c.reason_text,
    origin_datasource = c.origin_datasource
FROM 
    MSmerge_conflicts c
    INNER JOIN sysmergearticles a ON c.article = a.article
    INNER JOIN MSmerge_conflict_tables ct ON a.article = ct.article
ORDER BY 
    c.conflict_time DESC;
```

---

## ✅ KẾT LUẬN

### **✅ ƯU ĐIỂM**

1. **Partition rõ ràng**: Mỗi vùng chỉ replicate data của mình
2. **Index tối ưu**: Đã có index theo partition key (vung_id, site_origin, vung_don_hang)
3. **Constraint đầy đủ**: CHECK constraint đảm bảo data integrity
4. **GUID an toàn**: NEWSEQUENTIALID() tránh collision
5. **Unique warehouse**: Mỗi vùng chỉ 1 kho (UNIQUE constraint)

### **✅ DATABASE ĐÃ SẴN SÀNG**

Database của bạn **ĐÃ ĐẦY ĐỦ** các yếu tố cần thiết cho replication theo ma_vung:

✅ Partition key (`vung_id`, `site_origin`, `vung_don_hang`)  
✅ Index tối ưu cho filter  
✅ Constraint đảm bảo data hợp lệ  
✅ NEWSEQUENTIALID() cho merge replication  
✅ Foreign key relationships rõ ràng  

### **🚀 TRIỂN KHAI**

Bạn có thể tiến hành cấu hình Merge Replication ngay bằng script ở trên!

---

## 📚 TÀI LIỆU THAM KHẢO

- [SQL Server Merge Replication](https://docs.microsoft.com/en-us/sql/relational-databases/replication/merge/merge-replication)
- [Parameterized Row Filters](https://docs.microsoft.com/en-us/sql/relational-databases/replication/merge/parameterized-filters-parameterized-row-filters)
- [Conflict Detection and Resolution](https://docs.microsoft.com/en-us/sql/relational-databases/replication/merge/advanced-merge-replication-conflict-detection-and-resolution)
