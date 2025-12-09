-- ========================================
-- FILE DỮ LIỆU TEST CHO DB_WEBPHONES
-- ========================================
-- Mật khẩu mẫu: 123456
-- Hash SHA256: 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92

USE DB_WEBPHONES;
GO

PRINT N'🚀 Bắt đầu thêm dữ liệu test...';
GO

-- ========================================
-- 1. THÊM USERS MẪU
-- ========================================

INSERT INTO users (email, mat_khau, ho_ten, so_dien_thoai, vung_id, trang_thai) VALUES
-- Khách hàng miền Bắc
(N'nguyenvana@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Nguyễn Văn An', '0981234001', N'bac', 1),
(N'tranvanbinh@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Trần Văn Bình', '0981234002', N'bac', 1),
(N'lehoangcuong@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Lê Hoàng Cường', '0981234003', N'bac', 1),

-- Khách hàng miền Trung
(N'phamthidung@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Phạm Thị Dung', '0981234004', N'trung', 1),
(N'vothiemail@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Võ Thị Em', '0981234005', N'trung', 1),

-- Khách hàng miền Nam
(N'hoangvanphuc@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Hoàng Văn Phúc', '0981234006', N'nam', 1),
(N'ngothigiang@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Ngô Thị Giang', '0981234007', N'nam', 1),
(N'dovanhanh@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Đỗ Văn Hạnh', '0981234008', N'nam', 1),
(N'buithiyen@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Bùi Thị Yến', '0981234009', N'nam', 1),
(N'truongvankhanh@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Trương Văn Khánh', '0981234010', N'nam', 1);
GO

PRINT N'✅ Đã thêm 10 users test';
GO

-- ========================================
-- 2. THÊM ĐỊA CHỈ CHO USERS
-- ========================================

-- Địa chỉ cho user Nguyễn Văn An (Hà Nội)
DECLARE @UserAnId UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'nguyenvana@gmail.com');
INSERT INTO user_addresses (user_id, loai_dia_chi, is_default, ten_nguoi_nhan, sdt_nguoi_nhan, phuong_xa_id, dia_chi_cu_the, ghi_chu) VALUES
(@UserAnId, N'nha_rieng', 1, N'Nguyễn Văn An', '0981234001', 
 (SELECT id FROM wards WHERE ma_phuong_xa = 'HN-HK-01'), 
 N'Số 45 Hàng Bạc', N'Gọi trước khi giao 15 phút'),
(@UserAnId, N'cong_ty', 0, N'Nguyễn Văn An', '0981234001', 
 (SELECT id FROM wards WHERE ma_phuong_xa = 'HN-CG-02'), 
 N'Tòa nhà FPT, Duy Tân', N'Giao giờ hành chính');

-- Địa chỉ cho user Trần Văn Bình (Hải Phòng)
DECLARE @UserBinhId UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'tranvanbinh@gmail.com');
INSERT INTO user_addresses (user_id, loai_dia_chi, is_default, ten_nguoi_nhan, sdt_nguoi_nhan, phuong_xa_id, dia_chi_cu_the) VALUES
(@UserBinhId, N'nha_rieng', 1, N'Trần Văn Bình', '0981234002', 
 (SELECT id FROM wards WHERE ma_phuong_xa = 'HP-HB-01'), 
 N'123 Quán Toan');

-- Địa chỉ cho user Lê Hoàng Cường (Bắc Ninh)
DECLARE @UserCuongId UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'lehoangcuong@gmail.com');
INSERT INTO user_addresses (user_id, loai_dia_chi, is_default, ten_nguoi_nhan, sdt_nguoi_nhan, phuong_xa_id, dia_chi_cu_the) VALUES
(@UserCuongId, N'nha_rieng', 1, N'Lê Hoàng Cường', '0981234003', 
 (SELECT id FROM wards WHERE ma_phuong_xa = 'BN-TP-01'), 
 N'78 Suối Hoa');

-- Địa chỉ cho user Phạm Thị Dung (Đà Nẵng)
DECLARE @UserDungId UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'phamthidung@gmail.com');
INSERT INTO user_addresses (user_id, loai_dia_chi, is_default, ten_nguoi_nhan, sdt_nguoi_nhan, phuong_xa_id, dia_chi_cu_the) VALUES
(@UserDungId, N'nha_rieng', 1, N'Phạm Thị Dung', '0981234004', 
 (SELECT id FROM wards WHERE ma_phuong_xa = 'DN-HC-01'), 
 N'234 Thạch Thang'),
(@UserDungId, N'giao_hang', 0, N'Phạm Thị Dung', '0981234004', 
 (SELECT id FROM wards WHERE ma_phuong_xa = 'DN-TK-01'), 
 N'Chung cư Indochina, Thanh Khê');

-- Địa chỉ cho user Võ Thị Em (Nghệ An)
DECLARE @UserEmId UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'vothiemail@gmail.com');
INSERT INTO user_addresses (user_id, loai_dia_chi, is_default, ten_nguoi_nhan, sdt_nguoi_nhan, phuong_xa_id, dia_chi_cu_the) VALUES
(@UserEmId, N'nha_rieng', 1, N'Võ Thị Em', '0981234005', 
 (SELECT id FROM wards WHERE ma_phuong_xa = 'NA-V-01'), 
 N'56 Hà Huy Tập');

-- Địa chỉ cho user Hoàng Văn Phúc (TP.HCM)
DECLARE @UserPhucId UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'hoangvanphuc@gmail.com');
INSERT INTO user_addresses (user_id, loai_dia_chi, is_default, ten_nguoi_nhan, sdt_nguoi_nhan, phuong_xa_id, dia_chi_cu_the, ghi_chu) VALUES
(@UserPhucId, N'nha_rieng', 1, N'Hoàng Văn Phúc', '0981234006', 
 (SELECT id FROM wards WHERE ma_phuong_xa = 'HCM-Q1-01'), 
 N'189 Nguyễn Huệ', N'Nhà màu vàng'),
(@UserPhucId, N'cong_ty', 0, N'Hoàng Văn Phúc', '0981234006', 
 (SELECT id FROM wards WHERE ma_phuong_xa = 'HCM-Q7-01'), 
 N'Lotte Mart, Tân Thuận Đông', NULL);

-- Địa chỉ cho user Ngô Thị Giang (Bình Dương)
DECLARE @UserGiangId UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'ngothigiang@gmail.com');
INSERT INTO user_addresses (user_id, loai_dia_chi, is_default, ten_nguoi_nhan, sdt_nguoi_nhan, phuong_xa_id, dia_chi_cu_the) VALUES
(@UserGiangId, N'nha_rieng', 1, N'Ngô Thị Giang', '0981234007', 
 (SELECT id FROM wards WHERE ma_phuong_xa = 'BD-TDM-01'), 
 N'345 Hiệp Thành');

-- Địa chỉ cho user Đỗ Văn Hạnh (Đồng Nai)
DECLARE @UserHanhId UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'dovanhanh@gmail.com');
INSERT INTO user_addresses (user_id, loai_dia_chi, is_default, ten_nguoi_nhan, sdt_nguoi_nhan, phuong_xa_id, dia_chi_cu_the) VALUES
(@UserHanhId, N'nha_rieng', 1, N'Đỗ Văn Hạnh', '0981234008', 
 (SELECT id FROM wards WHERE ma_phuong_xa = 'DNA-BH-01'), 
 N'67 Trảng Dài');

-- Địa chỉ cho user Bùi Thị Yến (Cần Thơ)
DECLARE @UserYenId UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'buithiyen@gmail.com');
INSERT INTO user_addresses (user_id, loai_dia_chi, is_default, ten_nguoi_nhan, sdt_nguoi_nhan, phuong_xa_id, dia_chi_cu_the) VALUES
(@UserYenId, N'nha_rieng', 1, N'Bùi Thị Yến', '0981234009', 
 (SELECT id FROM wards WHERE ma_phuong_xa = 'CT-NK-01'), 
 N'89 Cái Khế');

-- Địa chỉ cho user Trương Văn Khánh (TP.HCM)
DECLARE @UserKhanhId UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'truongvankhanh@gmail.com');
INSERT INTO user_addresses (user_id, loai_dia_chi, is_default, ten_nguoi_nhan, sdt_nguoi_nhan, phuong_xa_id, dia_chi_cu_the) VALUES
(@UserKhanhId, N'nha_rieng', 1, N'Trương Văn Khánh', '0981234010', 
 (SELECT id FROM wards WHERE ma_phuong_xa = 'HCM-TD-01'), 
 N'123 Linh Xuân');
GO

PRINT N'✅ Đã thêm địa chỉ cho users';
GO

-- ========================================
-- 3. THÊM VOUCHERS
-- ========================================

-- Admin user để tạo voucher
DECLARE @AdminId UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM users WHERE email LIKE N'%admin%');

INSERT INTO vouchers (ma_voucher, ten_voucher, mo_ta, loai_giam_gia, gia_tri_giam, gia_tri_toi_da, don_hang_toi_thieu, so_luong, da_su_dung, ngay_bat_dau, ngay_ket_thuc, nguoi_tao, pham_vi, loai_voucher, trang_thai) VALUES
-- Voucher giảm phần trăm
(N'WELCOME10', N'Giảm 10% cho đơn hàng đầu tiên', N'Dành cho khách hàng mới', N'phantram', 10, 500000, 1000000, 100, 15, 
 DATEADD(day, -10, GETDATE()), DATEADD(day, 20, GETDATE()), @AdminId, N'toan_cuc', N'newbie', 1),

(N'SALE20', N'Giảm 20% mùa Black Friday', N'Giảm tối đa 1 triệu', N'phantram', 20, 1000000, 5000000, 500, 87, 
 DATEADD(day, -5, GETDATE()), DATEADD(day, 15, GETDATE()), @AdminId, N'toan_cuc', N'special', 1),

(N'VIP30', N'Giảm 30% cho khách VIP', N'Áp dụng đơn từ 10 triệu', N'phantram', 30, 3000000, 10000000, 50, 8, 
 DATEADD(day, -3, GETDATE()), DATEADD(day, 30, GETDATE()), @AdminId, N'toan_cuc', N'vip', 1),

-- Voucher giảm tiền
(N'GIAM500K', N'Giảm 500K cho đơn từ 10 triệu', N'Voucher giảm giá trực tiếp', N'tiengiam', 500000, NULL, 10000000, 200, 45, 
 DATEADD(day, -7, GETDATE()), DATEADD(day, 25, GETDATE()), @AdminId, N'toan_cuc', N'promotion', 1),

(N'FREESHIP', N'Miễn phí vận chuyển', N'Áp dụng toàn quốc', N'mienphi', 50000, NULL, 2000000, 1000, 234, 
 DATEADD(day, -15, GETDATE()), DATEADD(day, 45, GETDATE()), @AdminId, N'toan_cuc', N'shipping', 1),

-- Voucher theo sản phẩm
(N'IPHONE15', N'Giảm 1 triệu cho iPhone 15', N'Chỉ áp dụng iPhone 15 series', N'tiengiam', 1000000, NULL, 20000000, 30, 5, 
 DATEADD(day, -2, GETDATE()), DATEADD(day, 10, GETDATE()), @AdminId, N'theo_san_pham', N'product', 1),

-- Voucher hết hạn (để test)
(N'EXPIRED', N'Voucher đã hết hạn', N'Đã hết hạn sử dụng', N'phantram', 15, 500000, 1000000, 100, 100, 
 DATEADD(day, -30, GETDATE()), DATEADD(day, -5, GETDATE()), @AdminId, N'toan_cuc', N'expired', 0);
GO

PRINT N'✅ Đã thêm vouchers';
GO

-- ========================================
-- 4. THÊM FLASH SALES
-- ========================================

INSERT INTO flash_sales (ten_flash_sale, mo_ta, ngay_bat_dau, ngay_ket_thuc, trang_thai, nguoi_tao) VALUES
-- Flash sale đang diễn ra
(N'Flash Sale Cuối Tuần', N'Giảm giá sốc cuối tuần', 
 DATEADD(day, -1, GETDATE()), DATEADD(day, 2, GETDATE()), 
 N'dang_dien_ra', @AdminId),

-- Flash sale sắp diễn ra
(N'Flash Sale Tết 2025', N'Chào năm mới giảm giá khủng', 
 DATEADD(day, 5, GETDATE()), DATEADD(day, 10, GETDATE()), 
 N'cho', @AdminId),

-- Flash sale đã kết thúc
(N'Flash Sale Black Friday', N'Đã kết thúc', 
 DATEADD(day, -20, GETDATE()), DATEADD(day, -15, GETDATE()), 
 N'da_ket_thuc', @AdminId);
GO

PRINT N'✅ Đã thêm flash sales';
GO

-- ========================================
-- 5. THÊM SẢN PHẨM FLASH SALE
-- ========================================

-- Flash sale đang diễn ra
DECLARE @FlashSaleId UNIQUEIDENTIFIER = (SELECT id FROM flash_sales WHERE ten_flash_sale = N'Flash Sale Cuối Tuần');

INSERT INTO flash_sale_items (flash_sale_id, san_pham_id, gia_goc, gia_flash_sale, so_luong_ton, da_ban, gioi_han_mua, thu_tu, trang_thai) VALUES
(@FlashSaleId, (SELECT id FROM products WHERE ma_sku = 'IP15PM256'), 29990000, 27990000, 50, 23, 2, 1, N'dang_ban'),
(@FlashSaleId, (SELECT id FROM products WHERE ma_sku = 'SSS23U512'), 21990000, 19990000, 80, 45, 3, 2, N'dang_ban'),
(@FlashSaleId, (SELECT id FROM products WHERE ma_sku = 'XM13T256'), 10990000, 8990000, 100, 67, 5, 3, N'dang_ban'),
(@FlashSaleId, (SELECT id FROM products WHERE ma_sku = 'IP14128'), 17990000, 15990000, 30, 28, 2, 4, N'het_hang'),
(@FlashSaleId, (SELECT id FROM products WHERE ma_sku = 'SSA54'), 7990000, 6490000, 120, 89, 4, 5, N'dang_ban');
GO

PRINT N'✅ Đã thêm flash sale items';
GO

-- ========================================
-- 6. THÊM GIỎ HÀNG
-- ========================================

-- Giỏ hàng cho các users
INSERT INTO carts (nguoi_dung_id, vung_id) VALUES
((SELECT id FROM users WHERE email = N'nguyenvana@gmail.com'), N'bac'),
((SELECT id FROM users WHERE email = N'tranvanbinh@gmail.com'), N'bac'),
((SELECT id FROM users WHERE email = N'phamthidung@gmail.com'), N'trung'),
((SELECT id FROM users WHERE email = N'hoangvanphuc@gmail.com'), N'nam'),
((SELECT id FROM users WHERE email = N'ngothigiang@gmail.com'), N'nam');
GO

-- Sản phẩm trong giỏ hàng
INSERT INTO cart_items (gio_hang_id, san_pham_id, so_luong) VALUES
-- Giỏ hàng user An
((SELECT id FROM carts WHERE nguoi_dung_id = (SELECT id FROM users WHERE email = N'nguyenvana@gmail.com')),
 (SELECT id FROM products WHERE ma_sku = 'IP15PM256'), 1),
((SELECT id FROM carts WHERE nguoi_dung_id = (SELECT id FROM users WHERE email = N'nguyenvana@gmail.com')),
 (SELECT id FROM products WHERE ma_sku = 'SSA54'), 2),

-- Giỏ hàng user Bình
((SELECT id FROM carts WHERE nguoi_dung_id = (SELECT id FROM users WHERE email = N'tranvanbinh@gmail.com')),
 (SELECT id FROM products WHERE ma_sku = 'XM13T256'), 1),

-- Giỏ hàng user Dung
((SELECT id FROM carts WHERE nguoi_dung_id = (SELECT id FROM users WHERE email = N'phamthidung@gmail.com')),
 (SELECT id FROM products WHERE ma_sku = 'OPRENO10'), 1),
((SELECT id FROM carts WHERE nguoi_dung_id = (SELECT id FROM users WHERE email = N'phamthidung@gmail.com')),
 (SELECT id FROM products WHERE ma_sku = 'NKG22'), 1),

-- Giỏ hàng user Phúc
((SELECT id FROM carts WHERE nguoi_dung_id = (SELECT id FROM users WHERE email = N'hoangvanphuc@gmail.com')),
 (SELECT id FROM products WHERE ma_sku = 'SSS23U512'), 1),
((SELECT id FROM carts WHERE nguoi_dung_id = (SELECT id FROM users WHERE email = N'hoangvanphuc@gmail.com')),
 (SELECT id FROM products WHERE ma_sku = 'SSZFLIP4'), 1);
GO

PRINT N'✅ Đã thêm giỏ hàng';
GO

-- ========================================
-- 6A. THÊM PHƯƠNG THỨC VẬN CHUYỂN
-- ========================================

-- Thêm shipping methods
INSERT INTO shipping_methods (ten_phuong_thuc, chi_phi_co_ban, trang_thai) VALUES
(N'Giao hàng tiêu chuẩn', 20000, 1),  -- Phương thức rẻ nhất, giao 3-5 ngày
(N'Giao hàng nhanh', 40000, 1),       -- Giao 1-2 ngày
(N'Giao hàng hỏa tốc', 80000, 1);     -- Giao trong 24h
GO

PRINT N'✅ Đã thêm shipping methods';
GO

-- Thêm chi phí vận chuyển theo vùng cho từng phương thức
-- Giao hàng tiêu chuẩn
DECLARE @ShipStandardId UNIQUEIDENTIFIER = (SELECT id FROM shipping_methods WHERE ten_phuong_thuc = N'Giao hàng tiêu chuẩn');
INSERT INTO shipping_method_regions (shipping_method_id, region_id, chi_phi_van_chuyen, thoi_gian_giao_du_kien, trang_thai) VALUES
(@ShipStandardId, 'bac', 10000, 3, 1),    -- Miền Bắc: 20k + 10k = 30k, 3 ngày
(@ShipStandardId, 'trung', 15000, 4, 1),  -- Miền Trung: 20k + 15k = 35k, 4 ngày
(@ShipStandardId, 'nam', 15000, 4, 1);    -- Miền Nam: 20k + 15k = 35k, 4 ngày

-- Giao hàng nhanh
DECLARE @ShipFastId UNIQUEIDENTIFIER = (SELECT id FROM shipping_methods WHERE ten_phuong_thuc = N'Giao hàng nhanh');
INSERT INTO shipping_method_regions (shipping_method_id, region_id, chi_phi_van_chuyen, thoi_gian_giao_du_kien, trang_thai) VALUES
(@ShipFastId, 'bac', 10000, 1, 1),        -- Miền Bắc: 40k + 10k = 50k, 1-2 ngày
(@ShipFastId, 'trung', 20000, 2, 1),      -- Miền Trung: 40k + 20k = 60k, 2 ngày
(@ShipFastId, 'nam', 20000, 2, 1);        -- Miền Nam: 40k + 20k = 60k, 2 ngày

-- Giao hàng hỏa tốc
DECLARE @ShipExpressId UNIQUEIDENTIFIER = (SELECT id FROM shipping_methods WHERE ten_phuong_thuc = N'Giao hàng hỏa tốc');
INSERT INTO shipping_method_regions (shipping_method_id, region_id, chi_phi_van_chuyen, thoi_gian_giao_du_kien, trang_thai) VALUES
(@ShipExpressId, 'bac', 30000, 0, 1),     -- Miền Bắc: 80k + 30k = 110k, trong 24h
(@ShipExpressId, 'trung', 40000, 1, 1),   -- Miền Trung: 80k + 40k = 120k, 1 ngày
(@ShipExpressId, 'nam', 40000, 1, 1);     -- Miền Nam: 80k + 40k = 120k, 1 ngày
GO

PRINT N'✅ Đã thêm shipping method regions';
GO

-- ========================================
-- 7. THÊM ĐƠN HÀNG
-- ========================================

-- Đơn hàng 1: User An - Hà Nội (Hoàn thành)
DECLARE @Order1Id UNIQUEIDENTIFIER = NEWID();
DECLARE @User1Id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'nguyenvana@gmail.com');
DECLARE @Addr1Id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM user_addresses WHERE user_id = @User1Id AND is_default = 1);
DECLARE @Kho1Id UNIQUEIDENTIFIER = (SELECT id FROM warehouses WHERE ten_kho LIKE N'%Hà Nội%');
DECLARE @Ship1Id UNIQUEIDENTIFIER = (SELECT id FROM shipping_method_regions WHERE region_id = 'bac' AND shipping_method_id = (SELECT id FROM shipping_methods WHERE ten_phuong_thuc = N'Giao hàng nhanh'));

INSERT INTO orders (id, ma_don_hang, nguoi_dung_id, vung_don_hang, shipping_method_region_id, dia_chi_giao_hang_id, kho_giao_hang, voucher_id, tong_tien_hang, phi_van_chuyen, gia_tri_giam_voucher, tong_thanh_toan, trang_thai, ngay_tao, ngay_cap_nhat) VALUES
(@Order1Id, N'DH2024120001', @User1Id, N'bac', @Ship1Id, @Addr1Id, @Kho1Id, 
 NULL, 29990000, 50000, 0, 30040000, N'hoan_thanh', DATEADD(day, -10, GETDATE()), DATEADD(day, -3, GETDATE()));

INSERT INTO order_details (don_hang_id, san_pham_id, flash_sale_item_id, so_luong, don_gia, thanh_tien) VALUES
(@Order1Id, (SELECT id FROM products WHERE ma_sku = 'IP15PM256'), NULL, 1, 29990000, 29990000);

-- Đơn hàng 2: User Phúc - TP.HCM (Đang giao)
DECLARE @Order2Id UNIQUEIDENTIFIER = NEWID();
DECLARE @User2Id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'hoangvanphuc@gmail.com');
DECLARE @Addr2Id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM user_addresses WHERE user_id = @User2Id AND is_default = 1);
DECLARE @Kho2Id UNIQUEIDENTIFIER = (SELECT id FROM warehouses WHERE ten_kho LIKE N'%TP.HCM%');
DECLARE @Ship2Id UNIQUEIDENTIFIER = (SELECT id FROM shipping_method_regions WHERE region_id = 'nam' AND shipping_method_id = (SELECT id FROM shipping_methods WHERE ten_phuong_thuc = N'Giao hàng tiêu chuẩn'));
DECLARE @Voucher1Id UNIQUEIDENTIFIER = (SELECT id FROM vouchers WHERE ma_voucher = N'SALE20');

INSERT INTO orders (id, ma_don_hang, nguoi_dung_id, vung_don_hang, shipping_method_region_id, dia_chi_giao_hang_id, kho_giao_hang, voucher_id, tong_tien_hang, phi_van_chuyen, gia_tri_giam_voucher, tong_thanh_toan, trang_thai, ngay_tao) VALUES
(@Order2Id, N'DH2024120002', @User2Id, N'nam', @Ship2Id, @Addr2Id, @Kho2Id, 
 @Voucher1Id, 39980000, 35000, 1000000, 39015000, N'dang_giao', DATEADD(day, -2, GETDATE()));

INSERT INTO order_details (don_hang_id, san_pham_id, flash_sale_item_id, so_luong, don_gia, thanh_tien) VALUES
(@Order2Id, (SELECT id FROM products WHERE ma_sku = 'SSS23U512'), NULL, 1, 21990000, 21990000),
(@Order2Id, (SELECT id FROM products WHERE ma_sku = 'SSZFLIP4'), NULL, 1, 17990000, 17990000);

-- Đơn hàng 3: User Dung - Đà Nẵng (Chờ xác nhận)
DECLARE @Order3Id UNIQUEIDENTIFIER = NEWID();
DECLARE @User3Id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'phamthidung@gmail.com');
DECLARE @Addr3Id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM user_addresses WHERE user_id = @User3Id AND is_default = 1);
DECLARE @Kho3Id UNIQUEIDENTIFIER = (SELECT id FROM warehouses WHERE ten_kho LIKE N'%Đà Nẵng%');
DECLARE @Ship3Id UNIQUEIDENTIFIER = (SELECT id FROM shipping_method_regions WHERE region_id = 'trung' AND shipping_method_id = (SELECT id FROM shipping_methods WHERE ten_phuong_thuc = N'Giao hàng hỏa tốc'));

INSERT INTO orders (id, ma_don_hang, nguoi_dung_id, vung_don_hang, shipping_method_region_id, dia_chi_giao_hang_id, kho_giao_hang, voucher_id, tong_tien_hang, phi_van_chuyen, gia_tri_giam_voucher, tong_thanh_toan, trang_thai, ngay_tao) VALUES
(@Order3Id, N'DH2024120003', @User3Id, N'trung', @Ship3Id, @Addr3Id, @Kho3Id, 
 NULL, 12280000, 110000, 0, 12390000, N'cho_xac_nhan', DATEADD(hour, -5, GETDATE()));

INSERT INTO order_details (don_hang_id, san_pham_id, flash_sale_item_id, so_luong, don_gia, thanh_tien) VALUES
(@Order3Id, (SELECT id FROM products WHERE ma_sku = 'OPRENO10'), NULL, 1, 7990000, 7990000),
(@Order3Id, (SELECT id FROM products WHERE ma_sku = 'NKG22'), NULL, 1, 4290000, 4290000);

-- Đơn hàng 4: User Bình - Flash Sale (Đang xử lý)
DECLARE @Order4Id UNIQUEIDENTIFIER = NEWID();
DECLARE @User4Id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'tranvanbinh@gmail.com');
DECLARE @Addr4Id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM user_addresses WHERE user_id = @User4Id);
DECLARE @Kho4Id UNIQUEIDENTIFIER = (SELECT id FROM warehouses WHERE ten_kho LIKE N'%Hà Nội%');
DECLARE @Ship4Id UNIQUEIDENTIFIER = (SELECT id FROM shipping_method_regions WHERE region_id = 'bac' AND shipping_method_id = (SELECT id FROM shipping_methods WHERE ten_phuong_thuc = N'Giao hàng tiêu chuẩn'));
DECLARE @FlashItem1 UNIQUEIDENTIFIER = (SELECT id FROM flash_sale_items WHERE san_pham_id = (SELECT id FROM products WHERE ma_sku = 'XM13T256'));

INSERT INTO orders (id, ma_don_hang, nguoi_dung_id, vung_don_hang, shipping_method_region_id, dia_chi_giao_hang_id, kho_giao_hang, voucher_id, tong_tien_hang, phi_van_chuyen, gia_tri_giam_voucher, tong_thanh_toan, trang_thai, ngay_tao) VALUES
(@Order4Id, N'DH2024120004', @User4Id, N'bac', @Ship4Id, @Addr4Id, @Kho4Id, 
 NULL, 17980000, 30000, 0, 18010000, N'dang_xu_ly', DATEADD(hour, -12, GETDATE()));

INSERT INTO order_details (don_hang_id, san_pham_id, flash_sale_item_id, so_luong, don_gia, thanh_tien) VALUES
(@Order4Id, (SELECT id FROM products WHERE ma_sku = 'XM13T256'), @FlashItem1, 2, 8990000, 17980000);

-- Đơn hàng 5: User Giang - Bình Dương (Đã hủy)
DECLARE @Order5Id UNIQUEIDENTIFIER = NEWID();
DECLARE @User5Id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'ngothigiang@gmail.com');
DECLARE @Addr5Id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM user_addresses WHERE user_id = @User5Id);
DECLARE @Kho5Id UNIQUEIDENTIFIER = (SELECT id FROM warehouses WHERE ten_kho LIKE N'%TP.HCM%');
DECLARE @Ship5Id UNIQUEIDENTIFIER = (SELECT id FROM shipping_method_regions WHERE region_id = 'nam' AND shipping_method_id = (SELECT id FROM shipping_methods WHERE ten_phuong_thuc = N'Giao hàng nhanh'));

INSERT INTO orders (id, ma_don_hang, nguoi_dung_id, vung_don_hang, shipping_method_region_id, dia_chi_giao_hang_id, kho_giao_hang, voucher_id, tong_tien_hang, phi_van_chuyen, gia_tri_giam_voucher, tong_thanh_toan, trang_thai, ngay_tao, ngay_cap_nhat) VALUES
(@Order5Id, N'DH2024120005', @User5Id, N'nam', @Ship5Id, @Addr5Id, @Kho5Id, 
 NULL, 7990000, 60000, 0, 8050000, N'huy', DATEADD(day, -7, GETDATE()), DATEADD(day, -6, GETDATE()));

INSERT INTO order_details (don_hang_id, san_pham_id, flash_sale_item_id, so_luong, don_gia, thanh_tien) VALUES
(@Order5Id, (SELECT id FROM products WHERE ma_sku = 'SSA54'), NULL, 1, 7990000, 7990000);

GO

PRINT N'✅ Đã thêm đơn hàng';
GO

-- ========================================
-- 8. THÊM THANH TOÁN
-- ========================================

INSERT INTO payments (don_hang_id, phuong_thuc, so_tien, trang_thai, ma_giao_dich, ngay_tao) VALUES
-- Đơn 1: Đã thanh toán thành công qua VNPAY
((SELECT id FROM orders WHERE ma_don_hang = N'DH2024120001'), N'vnpay', 30040000, N'success', N'VNPAY20241201001234', DATEADD(day, -10, GETDATE())),

-- Đơn 2: Đã thanh toán qua MoMo
((SELECT id FROM orders WHERE ma_don_hang = N'DH2024120002'), N'momo', 39015000, N'success', N'MOMO20241206123456', DATEADD(day, -2, GETDATE())),

-- Đơn 3: Thanh toán COD (chưa thanh toán)
((SELECT id FROM orders WHERE ma_don_hang = N'DH2024120003'), N'cod', 12390000, N'pending', NULL, DATEADD(hour, -5, GETDATE())),

-- Đơn 4: Thanh toán thẻ
((SELECT id FROM orders WHERE ma_don_hang = N'DH2024120004'), N'credit_card', 18010000, N'success', N'CARD20241207098765', DATEADD(hour, -12, GETDATE())),

-- Đơn 5: Đã hủy, hoàn tiền
((SELECT id FROM orders WHERE ma_don_hang = N'DH2024120005'), N'momo', 8050000, N'refunded', N'MOMO20241201777888', DATEADD(day, -6, GETDATE()));
GO

PRINT N'✅ Đã thêm thanh toán';
GO

-- ========================================
-- 9. THÊM LỊCH SỬ TRẠNG THÁI ĐƠN HÀNG
-- ========================================

-- Đơn hàng 1 (Hoàn thành)
INSERT INTO order_status_history (don_hang_id, trang_thai_cu, trang_thai_moi, ghi_chu, nguoi_thao_tac, ngay_tao) VALUES
((SELECT id FROM orders WHERE ma_don_hang = N'DH2024120001'), NULL, N'cho_xac_nhan', N'Đơn hàng được tạo', NULL, DATEADD(day, -10, GETDATE())),
((SELECT id FROM orders WHERE ma_don_hang = N'DH2024120001'), N'cho_xac_nhan', N'dang_xu_ly', N'Đang chuẩn bị hàng', @AdminId, DATEADD(day, -9, GETDATE())),
((SELECT id FROM orders WHERE ma_don_hang = N'DH2024120001'), N'dang_xu_ly', N'dang_giao', N'Đã giao cho đơn vị vận chuyển', @AdminId, DATEADD(day, -8, GETDATE())),
((SELECT id FROM orders WHERE ma_don_hang = N'DH2024120001'), N'dang_giao', N'hoan_thanh', N'Giao hàng thành công', NULL, DATEADD(day, -3, GETDATE()));

-- Đơn hàng 2 (Đang giao)
INSERT INTO order_status_history (don_hang_id, trang_thai_cu, trang_thai_moi, ghi_chu, nguoi_thao_tac, ngay_tao) VALUES
((SELECT id FROM orders WHERE ma_don_hang = N'DH2024120002'), NULL, N'cho_xac_nhan', N'Đơn hàng được tạo', NULL, DATEADD(day, -2, GETDATE())),
((SELECT id FROM orders WHERE ma_don_hang = N'DH2024120002'), N'cho_xac_nhan', N'dang_xu_ly', N'Đã xác nhận', @AdminId, DATEADD(day, -1, GETDATE())),
((SELECT id FROM orders WHERE ma_don_hang = N'DH2024120002'), N'dang_xu_ly', N'dang_giao', N'Đang trên đường giao', @AdminId, DATEADD(hour, -6, GETDATE()));

-- Đơn hàng 3 (Chờ xác nhận)
INSERT INTO order_status_history (don_hang_id, trang_thai_cu, trang_thai_moi, ghi_chu, nguoi_thao_tac, ngay_tao) VALUES
((SELECT id FROM orders WHERE ma_don_hang = N'DH2024120003'), NULL, N'cho_xac_nhan', N'Đơn hàng mới', NULL, DATEADD(hour, -5, GETDATE()));

-- Đơn hàng 5 (Đã hủy)
INSERT INTO order_status_history (don_hang_id, trang_thai_cu, trang_thai_moi, ghi_chu, nguoi_thao_tac, ngay_tao) VALUES
((SELECT id FROM orders WHERE ma_don_hang = N'DH2024120005'), NULL, N'cho_xac_nhan', N'Đơn hàng được tạo', NULL, DATEADD(day, -7, GETDATE())),
((SELECT id FROM orders WHERE ma_don_hang = N'DH2024120005'), N'cho_xac_nhan', N'huy', N'Khách hàng yêu cầu hủy', NULL, DATEADD(day, -6, GETDATE()));
GO

PRINT N'✅ Đã thêm lịch sử đơn hàng';
GO

-- ========================================
-- 10. THÊM ĐÁNH GIÁ
-- ========================================

-- Đánh giá cho đơn hàng đã hoàn thành
INSERT INTO reviews (san_pham_id, nguoi_dung_id, don_hang_id, diem_danh_gia, tieu_de, trang_thai, ngay_tao) VALUES
((SELECT id FROM products WHERE ma_sku = 'IP15PM256'), 
 (SELECT id FROM users WHERE email = N'nguyenvana@gmail.com'),
 (SELECT id FROM orders WHERE ma_don_hang = N'DH2024120001'),
 5, N'Sản phẩm tuyệt vời, giao hàng nhanh!', 1, DATEADD(day, -2, GETDATE())),

((SELECT id FROM products WHERE ma_sku = 'SSS23U512'), 
 (SELECT id FROM users WHERE email = N'hoangvanphuc@gmail.com'),
 (SELECT id FROM orders WHERE ma_don_hang = N'DH2024120002'),
 4, N'Máy đẹp, camera chụp đẹp', 1, DATEADD(hour, -3, GETDATE())),

((SELECT id FROM products WHERE ma_sku = 'SSZFLIP4'), 
 (SELECT id FROM users WHERE email = N'hoangvanphuc@gmail.com'),
 (SELECT id FROM orders WHERE ma_don_hang = N'DH2024120002'),
 5, N'Máy gập rất thú vị, đáng tiền!', 1, DATEADD(hour, -3, GETDATE()));
GO

PRINT N'✅ Đã thêm đánh giá';
GO

-- ========================================
-- 11. THÊM VOUCHER ĐÃ SỬ DỤNG
-- ========================================

INSERT INTO used_vouchers (voucher_id, nguoi_dung_id, don_hang_id, gia_tri_giam, ngay_su_dung) VALUES
((SELECT id FROM vouchers WHERE ma_voucher = N'SALE20'),
 (SELECT id FROM users WHERE email = N'hoangvanphuc@gmail.com'),
 (SELECT id FROM orders WHERE ma_don_hang = N'DH2024120002'),
 1000000, DATEADD(day, -2, GETDATE()));
GO

PRINT N'✅ Đã thêm voucher đã sử dụng';
GO

-- ========================================
-- 12. THÊM LỊCH SỬ MUA FLASH SALE
-- ========================================

INSERT INTO flash_sale_orders (flash_sale_item_id, nguoi_dung_id, don_hang_id, so_luong, gia_flash_sale, ngay_mua) VALUES
((SELECT id FROM flash_sale_items WHERE san_pham_id = (SELECT id FROM products WHERE ma_sku = 'XM13T256')),
 (SELECT id FROM users WHERE email = N'tranvanbinh@gmail.com'),
 (SELECT id FROM orders WHERE ma_don_hang = N'DH2024120004'),
 2, 8990000, DATEADD(hour, -12, GETDATE()));
GO

PRINT N'✅ Đã thêm lịch sử flash sale';
GO

-- ========================================
-- KIỂM TRA DỮ LIỆU
-- ========================================

PRINT N'';
PRINT N'📊 TỔNG KẾT DỮ LIỆU:';
PRINT N'====================================';

DECLARE @CountUsers INT = (SELECT COUNT(*) FROM users);
DECLARE @CountAddresses INT = (SELECT COUNT(*) FROM user_addresses);
DECLARE @CountProducts INT = (SELECT COUNT(*) FROM products);
DECLARE @CountWarehouses INT = (SELECT COUNT(*) FROM warehouses);
DECLARE @CountInventory INT = (SELECT COUNT(*) FROM inventory);
DECLARE @CountVouchers INT = (SELECT COUNT(*) FROM vouchers);
DECLARE @CountFlashSales INT = (SELECT COUNT(*) FROM flash_sales);
DECLARE @CountFlashItems INT = (SELECT COUNT(*) FROM flash_sale_items);
DECLARE @CountCarts INT = (SELECT COUNT(*) FROM carts);
DECLARE @CountCartItems INT = (SELECT COUNT(*) FROM cart_items);
DECLARE @CountOrders INT = (SELECT COUNT(*) FROM orders);
DECLARE @CountOrderDetails INT = (SELECT COUNT(*) FROM order_details);
DECLARE @CountPayments INT = (SELECT COUNT(*) FROM payments);
DECLARE @CountReviews INT = (SELECT COUNT(*) FROM reviews);

PRINT N'Users: ' + CAST(@CountUsers AS NVARCHAR(10));
PRINT N'Địa chỉ: ' + CAST(@CountAddresses AS NVARCHAR(10));
PRINT N'Sản phẩm: ' + CAST(@CountProducts AS NVARCHAR(10));
PRINT N'Kho hàng: ' + CAST(@CountWarehouses AS NVARCHAR(10));
PRINT N'Tồn kho: ' + CAST(@CountInventory AS NVARCHAR(10));
PRINT N'Vouchers: ' + CAST(@CountVouchers AS NVARCHAR(10));
PRINT N'Flash Sales: ' + CAST(@CountFlashSales AS NVARCHAR(10));
PRINT N'Flash Sale Items: ' + CAST(@CountFlashItems AS NVARCHAR(10));
PRINT N'Giỏ hàng: ' + CAST(@CountCarts AS NVARCHAR(10));
PRINT N'Sản phẩm trong giỏ: ' + CAST(@CountCartItems AS NVARCHAR(10));
PRINT N'Đơn hàng: ' + CAST(@CountOrders AS NVARCHAR(10));
PRINT N'Chi tiết đơn: ' + CAST(@CountOrderDetails AS NVARCHAR(10));
PRINT N'Thanh toán: ' + CAST(@CountPayments AS NVARCHAR(10));
PRINT N'Đánh giá: ' + CAST(@CountReviews AS NVARCHAR(10));

PRINT N'';
PRINT N'✅ HOÀN TẤT THÊM DỮ LIỆU TEST!';
PRINT N'';
PRINT N'📝 THÔNG TIN ĐĂNG NHẬP:';
PRINT N'====================================';
PRINT N'Email: admin@webphones.vn';
PRINT N'Email: nguyenvana@gmail.com';
PRINT N'Email: hoangvanphuc@gmail.com';
PRINT N'Mật khẩu tất cả: 123456';
PRINT N'';
