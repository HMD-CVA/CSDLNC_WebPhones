# KIẾN TRÚC DATABASE - WEBPHONES

## 📊 **THIẾT KẾ MỚI (Tối ưu theo CellphoneS)**

### **1. CẤU TRÚC CHÍNH**

```
products (Sản phẩm chung)
├── id
├── ma_san_pham (IP15PM)
├── ten_san_pham (iPhone 15 Pro Max)
├── danh_muc_id
├── thuong_hieu_id
├── mongo_specs_id ← Thông số kỹ thuật chi tiết (MongoDB)
└── ...

product_variants (Biến thể - MỖI BIẾN THỂ = 1 SKU)
├── id
├── san_pham_id → products.id
├── ma_sku (IP15PM256TN) ← UNIQUE
├── mau_sac (Titan Tự Nhiên)
├── dung_luong (256GB)
├── gia_niem_yet
├── gia_ban
├── so_luong_ban
└── mongo_variant_detail_id ← Dữ liệu thêm (nếu cần)

inventory (Tồn kho theo VARIANT)
├── id
├── variant_id → product_variants.id
├── kho_id → warehouses.id
├── so_luong_kha_dung
├── so_luong_da_dat
└── UNIQUE (variant_id, kho_id)

cart_items (Giỏ hàng theo VARIANT)
├── id
├── gio_hang_id
├── variant_id → product_variants.id
└── so_luong

order_details (Chi tiết đơn hàng theo VARIANT)
├── id
├── don_hang_id
├── variant_id → product_variants.id
├── so_luong
├── don_gia
└── thanh_tien

flash_sale_items (Flash sale theo VARIANT)
├── id
├── flash_sale_id
├── variant_id → product_variants.id
├── gia_flash_sale
└── so_luong_ton
```

---

## ✅ **ƯU ĐIỂM KIẾN TRÚC MỚI**

### **1. Giải quyết vấn đề CONSTRAINT**
```sql
-- ✅ ĐÚNG: Mỗi variant có tồn kho riêng tại mỗi kho
UNIQUE (variant_id, kho_id)

-- Có thể lưu:
INSERT (variant_256gb, kho_hanoi, 50);
INSERT (variant_512gb, kho_hanoi, 30);  -- ✅ OK!
INSERT (variant_1tb, kho_hanoi, 20);    -- ✅ OK!
```

### **2. JOIN dễ dàng - 1 query duy nhất**
```sql
-- Lấy đơn hàng với thông tin đầy đủ
SELECT 
    o.ma_don_hang,
    p.ten_san_pham,
    v.ma_sku,
    v.mau_sac,
    v.dung_luong,
    v.gia_ban,
    od.so_luong,
    od.thanh_tien,
    i.so_luong_kha_dung as ton_kho
FROM orders o
JOIN order_details od ON o.id = od.don_hang_id
JOIN product_variants v ON od.variant_id = v.id
JOIN products p ON v.san_pham_id = p.id
LEFT JOIN inventory i ON v.id = i.variant_id
WHERE o.nguoi_dung_id = @userId;

-- ✅ Chỉ 1 query, nhanh, đơn giản!
```

### **3. ACID Transaction khi đặt hàng**
```sql
BEGIN TRANSACTION
    -- Check và trừ stock trong 1 transaction
    DECLARE @stock INT;
    
    SELECT @stock = so_luong_kha_dung 
    FROM inventory WITH (UPDLOCK, ROWLOCK)
    WHERE variant_id = @variantId AND kho_id = @khoId;
    
    IF @stock >= @quantity
    BEGIN
        UPDATE inventory 
        SET so_luong_kha_dung = so_luong_kha_dung - @quantity
        WHERE variant_id = @variantId AND kho_id = @khoId;
        
        INSERT INTO orders (...) VALUES (...);
        INSERT INTO order_details (...) VALUES (...);
        
        COMMIT;
    END
    ELSE
    BEGIN
        ROLLBACK;
        THROW 50001, 'Không đủ hàng', 1;
    END
    
-- ✅ Không bao giờ overselling!
```

### **4. Tính năng filter, báo cáo dễ dàng**
```sql
-- Tìm sản phẩm theo màu, còn hàng
SELECT DISTINCT p.*, v.mau_sac, v.gia_ban
FROM products p
JOIN product_variants v ON p.id = v.san_pham_id
JOIN inventory i ON v.id = i.variant_id
WHERE v.mau_sac = N'Xanh'
  AND i.so_luong_kha_dung > 0;

-- Top variants bán chạy
SELECT 
    v.ma_sku,
    v.mau_sac,
    v.dung_luong,
    SUM(od.so_luong) as tong_ban
FROM order_details od
JOIN product_variants v ON od.variant_id = v.id
GROUP BY v.id, v.ma_sku, v.mau_sac, v.dung_luong
ORDER BY tong_ban DESC;

-- ✅ Tất cả đều dễ dàng!
```

### **5. Data Integrity với FK Constraints**
```sql
-- ✅ Không thể xóa variant đang có đơn hàng
DELETE FROM product_variants WHERE id = 'var123';
-- ERROR: FK constraint violation from order_details

-- ✅ Không thể xóa variant đang có tồn kho
DELETE FROM product_variants WHERE id = 'var123';
-- ERROR: FK constraint violation from inventory

-- → BẢO VỆ DỮ LIỆU TỰ ĐỘNG!
```

---

## 🔄 **MONGODB - Chỉ dùng cho dữ liệu PHI CẤU TRÚC**

### **1. Thông số kỹ thuật (product_specs)**
```javascript
// Mỗi loại sản phẩm có specs KHÁC NHAU
{
  "_id": "6759abc123",
  "product_id": "uuid-product",
  "category": "smartphone",
  "specs": {
    "cpu": "A17 Pro",
    "ram": "8GB",
    "screen": "6.7 inch Super Retina XDR",
    "camera_main": "48MP",
    "battery": "4422mAh",
    "os": "iOS 17"
  }
}

// Laptop có specs hoàn toàn khác
{
  "_id": "6759def456",
  "product_id": "uuid-laptop",
  "category": "laptop",
  "specs": {
    "cpu": "Intel i7-13700H",
    "ram": "16GB DDR5",
    "gpu": "RTX 4060",
    "storage": "512GB NVMe",
    "screen": "15.6 inch FHD",
    "weight": "2.1kg"
    // Không có camera, battery như phone!
  }
}
```

### **2. Reviews (đánh giá sản phẩm)**
```javascript
{
  "_id": "review123",
  "product_id": "uuid-product",
  "user_id": "uuid-user",
  "rating": 5,
  "title": "Sản phẩm tuyệt vời!",
  "content": "Nội dung đánh giá dài...",
  "images": ["url1", "url2"],
  "helpful_count": 15,
  "comments": [
    {
      "user": "Admin",
      "text": "Cảm ơn bạn!",
      "date": "..."
    }
  ]
}
```

### **3. User activity logs**
```javascript
{
  "_id": "log123",
  "user_id": "uuid-user",
  "action": "view_product",
  "product_id": "uuid-product",
  "metadata": {
    "referrer": "google",
    "device": "iPhone 15",
    "location": "Hanoi"
  },
  "timestamp": "2024-12-08T10:30:00Z"
}
```

---

## 📝 **VÍ DỤ THỰC TẾ**

### **Thêm sản phẩm mới: iPhone 15 Pro Max**

```sql
-- 1. Tạo sản phẩm chung
INSERT INTO products (id, ma_san_pham, ten_san_pham, danh_muc_id, thuong_hieu_id, mongo_specs_id)
VALUES (
    @productId,
    'IP15PM',
    N'iPhone 15 Pro Max',
    @categoryId,
    @brandId,
    'mongo-specs-id-123'  -- Lưu specs chi tiết trong MongoDB
);

-- 2. Tạo các variants
INSERT INTO product_variants (san_pham_id, ma_sku, mau_sac, dung_luong, gia_ban) VALUES
(@productId, 'IP15PM256TN', N'Titan Tự Nhiên', '256GB', 29990000),
(@productId, 'IP15PM256TX', N'Titan Xanh', '256GB', 29990000),
(@productId, 'IP15PM512TN', N'Titan Tự Nhiên', '512GB', 34990000),
(@productId, 'IP15PM512TX', N'Titan Xanh', '512GB', 34990000),
(@productId, 'IP15PM1TBTN', N'Titan Tự Nhiên', '1TB', 39990000);

-- 3. Nhập tồn kho cho từng variant tại các kho
INSERT INTO inventory (variant_id, kho_id, so_luong_kha_dung) VALUES
-- Variant 256GB Titan Tự Nhiên
((SELECT id FROM product_variants WHERE ma_sku='IP15PM256TN'), @khoHN, 50),
((SELECT id FROM product_variants WHERE ma_sku='IP15PM256TN'), @khoHCM, 45),
((SELECT id FROM product_variants WHERE ma_sku='IP15PM256TN'), @khoDN, 30),

-- Variant 256GB Titan Xanh
((SELECT id FROM product_variants WHERE ma_sku='IP15PM256TX'), @khoHN, 40),
((SELECT id FROM product_variants WHERE ma_sku='IP15PM256TX'), @khoHCM, 35),
...;
```

### **Khách đặt hàng**

```sql
-- Tìm kho có hàng gần nhất
DECLARE @selectedVariantId UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = 'IP15PM256TN');
DECLARE @userRegion NVARCHAR(10) = 'bac';

SELECT TOP 1 
    i.kho_id,
    k.ten_kho,
    i.so_luong_kha_dung,
    sm.chi_phi_co_ban + smr.chi_phi_van_chuyen as phi_ship
FROM inventory i
JOIN warehouses k ON i.kho_id = k.id
JOIN shipping_method_regions smr ON k.vung_id = smr.region_id
JOIN shipping_methods sm ON smr.shipping_method_id = sm.id
WHERE i.variant_id = @selectedVariantId
  AND i.so_luong_kha_dung > 0
  AND k.vung_id = @userRegion  -- Ưu tiên kho cùng vùng
ORDER BY smr.chi_phi_van_chuyen ASC, i.so_luong_kha_dung DESC;
```

---

## 🎯 **KẾT LUẬN**

| Tiêu chí | Thiết kế CŨ | Thiết kế MỚI |
|----------|-------------|--------------|
| **Lưu variants** | ❌ MongoDB (sai) | ✅ SQL (đúng) |
| **UNIQUE constraint** | ❌ (product, kho) | ✅ (variant, kho) |
| **JOIN queries** | ❌ Không thể | ✅ Dễ dàng |
| **ACID Transaction** | ❌ Không có | ✅ Đầy đủ |
| **Data Integrity** | ❌ Không đảm bảo | ✅ FK constraints |
| **Performance** | ❌ Chậm (N+1) | ✅ Nhanh (1 query) |
| **Overselling** | ❌ Có thể xảy ra | ✅ Không thể |
| **Báo cáo** | ❌ Khó | ✅ Dễ dàng |
| **Maintenance** | ❌ Phức tạp | ✅ Đơn giản |

**Thiết kế mới:**
- ✅ Giống CellphoneS (best practice)
- ✅ Giải quyết TẤT CẢ vấn đề của thiết kế cũ
- ✅ Dễ scale, dễ maintain
- ✅ Performance cao
- ✅ An toàn dữ liệu

**MongoDB chỉ dùng cho:**
- ✅ Thông số kỹ thuật chi tiết (specs)
- ✅ Reviews (đánh giá)
- ✅ Logs, activity tracking
- ✅ Dữ liệu thực sự PHI CẤU TRÚC
