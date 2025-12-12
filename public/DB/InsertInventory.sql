-- =============================================
-- SCRIPT: INSERT VARIANTS VÀO INVENTORY
-- Nguồn: Results.json
-- Mục đích: Tạo inventory records cho các variants đã có
-- =============================================

USE DB_WebPhone;
GO

-- Khai báo biến để lưu kho_id
DECLARE @kho_bac UNIQUEIDENTIFIER;

-- Lấy kho primary của vùng Bắc
SELECT @kho_bac = id 
FROM warehouses 
WHERE vung_id = N'bac' 
  AND is_primary = 1 
  AND trang_thai = 1;

-- Kiểm tra xem có kho không
IF @kho_bac IS NULL
BEGIN
    PRINT N'❌ KHÔNG TÌM THẤY KHO PRIMARY CHO VÙNG BẮC!';
    PRINT N'Vui lòng tạo kho trước khi chạy script này.';
    PRINT N'';
    PRINT N'VÍ DỤ TẠO KHO:';
    PRINT N'INSERT INTO warehouses (ten_kho, vung_id, phuong_xa_id, dia_chi_chi_tiet, is_primary, trang_thai)';
    PRINT N'VALUES (N''Kho Miền Bắc'', N''bac'', <phuong_xa_id>, N''Địa chỉ kho'', 1, 1);';
    RETURN;
END
ELSE
BEGIN
    PRINT N'✅ Tìm thấy kho: ' + CAST(@kho_bac AS NVARCHAR(50));
    PRINT N'';
END

-- =============================================
-- INSERT INVENTORY CHO TỪNG VARIANT
-- =============================================

PRINT N'📦 Bắt đầu insert inventory...';
PRINT N'';

-- Variant 1: iPhone 17 Pro Max
INSERT INTO inventory (variant_id, kho_id, so_luong_kha_dung, so_luong_da_dat, muc_ton_kho_toi_thieu, so_luong_nhap_lai, trang_thai, ngay_tao, ngay_cap_nhat)
VALUES (
    '62f0d5ee-d0d6-f011-b89e-f8fe5e879f8c',
    @kho_bac,
    1,    -- so_luong_kha_dung (từ so_luong_ton_kho)
    0,    -- so_luong_da_dat
    10,   -- muc_ton_kho_toi_thieu
    50,   -- so_luong_nhap_lai
    1,    -- trang_thai
    GETDATE(),
    GETDATE()
);
PRINT N'✅ Inserted: iPhone 17 Pro Max - Stock: 1';

-- Variant 2: iPhone 17 Pro Max Vàng cam
INSERT INTO inventory (variant_id, kho_id, so_luong_kha_dung, so_luong_da_dat, muc_ton_kho_toi_thieu, so_luong_nhap_lai, trang_thai, ngay_tao, ngay_cap_nhat)
VALUES (
    '30ed601a-d5d6-f011-b89e-f8fe5e879f8c',
    @kho_bac,
    100,
    0,
    10,
    50,
    1,
    GETDATE(),
    GETDATE()
);
PRINT N'✅ Inserted: iPhone 17 Pro Max Vàng cam - Stock: 100';

-- Variant 3: Trắng
INSERT INTO inventory (variant_id, kho_id, so_luong_kha_dung, so_luong_da_dat, muc_ton_kho_toi_thieu, so_luong_nhap_lai, trang_thai, ngay_tao, ngay_cap_nhat)
VALUES (
    '2ce3e1f6-d9d6-f011-b89e-f8fe5e879f8c',
    @kho_bac,
    20,
    0,
    10,
    50,
    1,
    GETDATE(),
    GETDATE()
);
PRINT N'✅ Inserted: Trắng - Stock: 20';

-- Variant 4: Đen
INSERT INTO inventory (variant_id, kho_id, so_luong_kha_dung, so_luong_da_dat, muc_ton_kho_toi_thieu, so_luong_nhap_lai, trang_thai, ngay_tao, ngay_cap_nhat)
VALUES (
    '2ee3e1f6-d9d6-f011-b89e-f8fe5e879f8c',
    @kho_bac,
    30,
    0,
    10,
    50,
    1,
    GETDATE(),
    GETDATE()
);
PRINT N'✅ Inserted: Đen - Stock: 30';

-- Variant 5: Red Magic 8 Pro
INSERT INTO inventory (variant_id, kho_id, so_luong_kha_dung, so_luong_da_dat, muc_ton_kho_toi_thieu, so_luong_nhap_lai, trang_thai, ngay_tao, ngay_cap_nhat)
VALUES (
    'cbe0ce1e-ddd6-f011-b89e-f8fe5e879f8c',
    @kho_bac,
    200,
    0,
    10,
    50,
    1,
    GETDATE(),
    GETDATE()
);
PRINT N'✅ Inserted: Red Magic 8 Pro - Stock: 200';

-- Variant 6: Red Magic 8 Pro +
INSERT INTO inventory (variant_id, kho_id, so_luong_kha_dung, so_luong_da_dat, muc_ton_kho_toi_thieu, so_luong_nhap_lai, trang_thai, ngay_tao, ngay_cap_nhat)
VALUES (
    'cde0ce1e-ddd6-f011-b89e-f8fe5e879f8c',
    @kho_bac,
    150,
    0,
    10,
    50,
    1,
    GETDATE(),
    GETDATE()
);
PRINT N'✅ Inserted: Red Magic 8 Pro + - Stock: 150';

-- Variant 7: Test Đen
INSERT INTO inventory (variant_id, kho_id, so_luong_kha_dung, so_luong_da_dat, muc_ton_kho_toi_thieu, so_luong_nhap_lai, trang_thai, ngay_tao, ngay_cap_nhat)
VALUES (
    'd7eb6b2c-51d7-f011-b89e-f8fe5e879f8c',
    @kho_bac,
    20,
    0,
    10,
    50,
    1,
    GETDATE(),
    GETDATE()
);
PRINT N'✅ Inserted: Test Đen - Stock: 20';

-- Variant 8: Eatttt 128GB
INSERT INTO inventory (variant_id, kho_id, so_luong_kha_dung, so_luong_da_dat, muc_ton_kho_toi_thieu, so_luong_nhap_lai, trang_thai, ngay_tao, ngay_cap_nhat)
VALUES (
    'f334f616-54d7-f011-b89e-f8fe5e879f8c',
    @kho_bac,
    210,
    0,
    10,
    50,
    1,
    GETDATE(),
    GETDATE()
);
PRINT N'✅ Inserted: Eatttt 128GB - Stock: 210';

-- Variant 9: iPhone 16 Pro Max Titan natural
INSERT INTO inventory (variant_id, kho_id, so_luong_kha_dung, so_luong_da_dat, muc_ton_kho_toi_thieu, so_luong_nhap_lai, trang_thai, ngay_tao, ngay_cap_nhat)
VALUES (
    '6d3086bd-54d7-f011-b89e-f8fe5e879f8c',
    @kho_bac,
    30,
    0,
    10,
    50,
    1,
    GETDATE(),
    GETDATE()
);
PRINT N'✅ Inserted: iPhone 16 Pro Max Titan natural - Stock: 30';

-- Variant 10: Hủ tiếu Đen Titans - 128GB
INSERT INTO inventory (variant_id, kho_id, so_luong_kha_dung, so_luong_da_dat, muc_ton_kho_toi_thieu, so_luong_nhap_lai, trang_thai, ngay_tao, ngay_cap_nhat)
VALUES (
    '40511b8b-58d7-f011-b89e-f8fe5e879f8c',
    @kho_bac,
    100,
    0,
    10,
    50,
    1,
    GETDATE(),
    GETDATE()
);
PRINT N'✅ Inserted: Hủ tiếu Đen Titans - 128GB - Stock: 100';

-- Variant 11: Hủ tiếu Trắng Titan - 128GB
INSERT INTO inventory (variant_id, kho_id, so_luong_kha_dung, so_luong_da_dat, muc_ton_kho_toi_thieu, so_luong_nhap_lai, trang_thai, ngay_tao, ngay_cap_nhat)
VALUES (
    '7235cc19-5bd7-f011-b89e-f8fe5e879f8c',
    @kho_bac,
    250,
    0,
    10,
    50,
    1,
    GETDATE(),
    GETDATE()
);
PRINT N'✅ Inserted: Hủ tiếu Trắng Titan - 128GB - Stock: 250';

PRINT N'';
PRINT N'🎉 HOÀN THÀNH! Đã insert 11 inventory records.';
PRINT N'';

-- =============================================
-- KIỂM TRA KẾT QUẢ
-- =============================================
PRINT N'📊 Kiểm tra inventory đã tạo:';
PRINT N'';

SELECT 
    i.variant_id,
    pv.ten_hien_thi AS [Tên Variant],
    pv.ma_sku AS [SKU],
    w.ten_kho AS [Kho],
    i.so_luong_kha_dung AS [Tồn Kho],
    i.so_luong_da_dat AS [Đã Đặt],
    i.muc_ton_kho_toi_thieu AS [Tồn Tối Thiểu],
    i.trang_thai AS [Trạng Thái]
FROM inventory i
INNER JOIN product_variants pv ON i.variant_id = pv.id
INNER JOIN warehouses w ON i.kho_id = w.id
WHERE i.kho_id = @kho_bac
ORDER BY pv.ten_hien_thi;

GO
