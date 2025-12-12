-- =============================================
-- DỮ LIỆU MẪU CHO DATABASE QUẢN LÝ BÁN ĐIỆN THOẠI
-- Hỗ trợ 3 vùng: Bắc, Trung, Nam
-- =============================================

USE DB_WebPhone;
GO

-- =============================================
-- NHÓM 1: ĐỊA LÝ & HÀNH CHÍNH
-- =============================================

-- 1. Dữ liệu vùng miền
INSERT INTO regions (ma_vung, ten_vung, mo_ta, trang_thai) VALUES
(N'bac', N'Miền Bắc', N'Khu vực miền Bắc Việt Nam', 1),
(N'trung', N'Miền Trung', N'Khu vực miền Trung Việt Nam', 1),
(N'nam', N'Miền Nam', N'Khu vực miền Nam Việt Nam', 1);
GO

-- 2. Dữ liệu tỉnh/thành phố
INSERT INTO provinces (ma_tinh, ten_tinh, vung_id, is_major_city, thu_tu_uu_tien, trang_thai) VALUES
-- Miền Bắc
(N'HN', N'Hà Nội', N'bac', 1, 1, 1),
(N'HP', N'Hải Phòng', N'bac', 1, 2, 1),
(N'QN', N'Quảng Ninh', N'bac', 0, 3, 1),
(N'BN', N'Bắc Ninh', N'bac', 0, 4, 1),
(N'HD', N'Hải Dương', N'bac', 0, 5, 1),
-- Miền Trung
(N'DN', N'Đà Nẵng', N'trung', 1, 1, 1),
(N'HUE', N'Huế', N'trung', 1, 2, 1),
(N'QNM', N'Quảng Nam', N'trung', 0, 3, 1),
(N'QNG', N'Quảng Ngãi', N'trung', 0, 4, 1),
(N'KH', N'Khánh Hòa', N'trung', 0, 5, 1),
-- Miền Nam
(N'SG', N'TP. Hồ Chí Minh', N'nam', 1, 1, 1),
(N'BTH', N'Bình Dương', N'nam', 1, 2, 1),
(N'DNA', N'Đồng Nai', N'nam', 0, 3, 1),
(N'VT', N'Vũng Tàu', N'nam', 0, 4, 1),
(N'CT', N'Cần Thơ', N'nam', 1, 5, 1);
GO

-- 3. Dữ liệu phường/xã (Mẫu cho mỗi tỉnh)
DECLARE @hn_id UNIQUEIDENTIFIER = (SELECT id FROM provinces WHERE ma_tinh = N'HN');
DECLARE @dn_id UNIQUEIDENTIFIER = (SELECT id FROM provinces WHERE ma_tinh = N'DN');
DECLARE @sg_id UNIQUEIDENTIFIER = (SELECT id FROM provinces WHERE ma_tinh = N'SG');

INSERT INTO wards (ma_phuong_xa, ten_phuong_xa, tinh_thanh_id, loai, is_inner_area, trang_thai) VALUES
-- Hà Nội
(N'HN-HK', N'Hoàn Kiếm', @hn_id, N'phuong', 1, 1),
(N'HN-BD', N'Ba Đình', @hn_id, N'phuong', 1, 1),
(N'HN-CG', N'Cầu Giấy', @hn_id, N'phuong', 1, 1),
(N'HN-DD', N'Đống Đa', @hn_id, N'phuong', 1, 1),
(N'HN-HBT', N'Hai Bà Trưng', @hn_id, N'phuong', 1, 1),
-- Đà Nẵng
(N'DN-HC', N'Hải Châu', @dn_id, N'phuong', 1, 1),
(N'DN-TK', N'Thanh Khê', @dn_id, N'phuong', 1, 1),
(N'DN-SN', N'Sơn Trà', @dn_id, N'phuong', 1, 1),
(N'DN-NC', N'Ngũ Hành Sơn', @dn_id, N'phuong', 1, 1),
(N'DN-LC', N'Liên Chiểu', @dn_id, N'phuong', 0, 1),
-- TP.HCM
(N'SG-Q1', N'Quận 1', @sg_id, N'phuong', 1, 1),
(N'SG-Q3', N'Quận 3', @sg_id, N'phuong', 1, 1),
(N'SG-Q5', N'Quận 5', @sg_id, N'phuong', 1, 1),
(N'SG-PN', N'Phú Nhuận', @sg_id, N'phuong', 1, 1),
(N'SG-BT', N'Bình Thạnh', @sg_id, N'phuong', 1, 1);
GO

-- =============================================
-- NHÓM 2: SẢN PHẨM
-- =============================================

-- 4. Dữ liệu thương hiệu
INSERT INTO brands (ten_thuong_hieu, mo_ta, logo_url, slug, trang_thai) VALUES
(N'Apple', N'Thương hiệu điện thoại cao cấp từ Mỹ', N'/images/brands/apple.png', N'apple', 1),
(N'Samsung', N'Thương hiệu điện thoại hàng đầu Hàn Quốc', N'/images/brands/samsung.png', N'samsung', 1),
(N'Xiaomi', N'Thương hiệu điện thoại phổ biến từ Trung Quốc', N'/images/brands/xiaomi.png', N'xiaomi', 1),
(N'OPPO', N'Thương hiệu điện thoại trẻ trung', N'/images/brands/oppo.png', N'oppo', 1),
(N'Vivo', N'Thương hiệu điện thoại với camera đẹp', N'/images/brands/vivo.png', N'vivo', 1),
(N'Realme', N'Thương hiệu điện thoại giá rẻ chất lượng', N'/images/brands/realme.png', N'realme', 1);
GO

-- 5. Dữ liệu danh mục sản phẩm
INSERT INTO categories (ten_danh_muc, danh_muc_cha_id, mo_ta, slug, anh_url, thu_tu, trang_thai) VALUES
(N'Điện thoại', NULL, N'Điện thoại thông minh', N'dien-thoai', N'/images/categories/phones.png', 1, 1),
(N'Tai nghe', NULL, N'Tai nghe không dây và có dây', N'tai-nghe', N'/images/categories/headphones.png', 2, 1),
(N'Sạc dự phòng', NULL, N'Pin sạc dự phòng các loại', N'sac-du-phong', N'/images/categories/powerbank.png', 3, 1),
(N'Ốp lưng', NULL, N'Ốp lưng bảo vệ điện thoại', N'op-lung', N'/images/categories/cases.png', 4, 1),
(N'Cáp sạc', NULL, N'Cáp sạc và truyền dữ liệu', N'cap-sac', N'/images/categories/cables.png', 5, 1);
GO

-- 6. Dữ liệu sản phẩm
DECLARE @apple_id UNIQUEIDENTIFIER = (SELECT id FROM brands WHERE ten_thuong_hieu = N'Apple');
DECLARE @samsung_id UNIQUEIDENTIFIER = (SELECT id FROM brands WHERE ten_thuong_hieu = N'Samsung');
DECLARE @xiaomi_id UNIQUEIDENTIFIER = (SELECT id FROM brands WHERE ten_thuong_hieu = N'Xiaomi');
DECLARE @dienthoai_id UNIQUEIDENTIFIER = (SELECT id FROM categories WHERE ten_danh_muc = N'Điện thoại');
DECLARE @tainghe_id UNIQUEIDENTIFIER = (SELECT id FROM categories WHERE ten_danh_muc = N'Tai nghe');

INSERT INTO products (ma_san_pham, ten_san_pham, danh_muc_id, thuong_hieu_id, mo_ta_ngan, link_anh_dai_dien, mongo_detail_id, site_created, luot_xem, trang_thai) VALUES
-- Sản phẩm từ Miền Bắc (sẽ replicate sang Trung & Nam)
(N'IP15PM-001', N'iPhone 15 Pro Max', @dienthoai_id, @apple_id, N'Flagship cao cấp nhất của Apple 2024', N'/images/products/iphone15promax.jpg', NULL, N'bac', 1250, 1),
(N'IP15P-001', N'iPhone 15 Pro', @dienthoai_id, @apple_id, N'iPhone Pro với chip A17 Pro', N'/images/products/iphone15pro.jpg', NULL, N'bac', 980, 1),
(N'IP15-001', N'iPhone 15', @dienthoai_id, @apple_id, N'iPhone 15 thế hệ mới', N'/images/products/iphone15.jpg', NULL, N'bac', 1500, 1),
(N'SS-S24U-001', N'Samsung Galaxy S24 Ultra', @dienthoai_id, @samsung_id, N'Flagship Android cao cấp nhất', N'/images/products/s24ultra.jpg', NULL, N'bac', 890, 1),
(N'SS-S24-001', N'Samsung Galaxy S24', @dienthoai_id, @samsung_id, N'Galaxy S24 chip Snapdragon 8 Gen 3', N'/images/products/s24.jpg', NULL, N'bac', 760, 1),
-- Sản phẩm từ Miền Trung (sẽ replicate sang Bắc & Nam)
(N'XM-14-001', N'Xiaomi 14', @dienthoai_id, @xiaomi_id, N'Flagship Xiaomi với camera Leica', N'/images/products/xiaomi14.jpg', NULL, N'trung', 650, 1),
(N'XM-14P-001', N'Xiaomi 14 Pro', @dienthoai_id, @xiaomi_id, N'Xiaomi 14 Pro màn hình 2K', N'/images/products/xiaomi14pro.jpg', NULL, N'trung', 520, 1),
(N'SS-A54-001', N'Samsung Galaxy A54', @dienthoai_id, @samsung_id, N'Điện thoại tầm trung Samsung', N'/images/products/a54.jpg', NULL, N'trung', 1100, 1),
(N'XM-RN13-001', N'Xiaomi Redmi Note 13 Pro', @dienthoai_id, @xiaomi_id, N'Note 13 Pro camera 200MP', N'/images/products/redminote13.jpg', NULL, N'trung', 980, 1),
-- Sản phẩm từ Miền Nam (sẽ replicate sang Bắc & Trung)
(N'AP-PODS-001', N'Apple AirPods Pro 2', @tainghe_id, @apple_id, N'Tai nghe cao cấp Apple', N'/images/products/airpodspro2.jpg', NULL, N'nam', 450, 1),
(N'SS-BUDS-001', N'Samsung Galaxy Buds2 Pro', @tainghe_id, @samsung_id, N'Tai nghe Samsung chống ồn chủ động', N'/images/products/buds2pro.jpg', NULL, N'nam', 320, 1),
(N'XM-BUDS-001', N'Xiaomi Buds 4 Pro', @tainghe_id, @xiaomi_id, N'Tai nghe Xiaomi cao cấp', N'/images/products/xibuds4.jpg', NULL, N'nam', 280, 1);
GO

-- 7. Dữ liệu biến thể sản phẩm (Regional Variants - mỗi vùng tự thêm variants)
DECLARE @ip15pm_id UNIQUEIDENTIFIER = (SELECT id FROM products WHERE ma_san_pham = N'IP15PM-001');
DECLARE @ip15p_id UNIQUEIDENTIFIER = (SELECT id FROM products WHERE ma_san_pham = N'IP15P-001');
DECLARE @ip15_id UNIQUEIDENTIFIER = (SELECT id FROM products WHERE ma_san_pham = N'IP15-001');
DECLARE @s24u_id UNIQUEIDENTIFIER = (SELECT id FROM products WHERE ma_san_pham = N'SS-S24U-001');
DECLARE @s24_id UNIQUEIDENTIFIER = (SELECT id FROM products WHERE ma_san_pham = N'SS-S24-001');
DECLARE @xiaomi14_id UNIQUEIDENTIFIER = (SELECT id FROM products WHERE ma_san_pham = N'XM-14-001');
DECLARE @xiaomi14p_id UNIQUEIDENTIFIER = (SELECT id FROM products WHERE ma_san_pham = N'XM-14P-001');

INSERT INTO product_variants (san_pham_id, ma_sku, ten_hien_thi, gia_niem_yet, gia_ban, so_luong_ban, anh_dai_dien, site_origin, trang_thai) VALUES
-- Variants Miền Bắc (products từ Bắc + một số từ Trung/Nam nhập về)
(@ip15pm_id, N'IP15PM-256-TIT-BAC', N'iPhone 15 Pro Max 256GB Titan Tự Nhiên', 34990000, 33990000, 45, N'/images/variants/ip15pm-titan.jpg', N'bac', 1),
(@ip15pm_id, N'IP15PM-512-TIT-BAC', N'iPhone 15 Pro Max 512GB Titan Tự Nhiên', 40990000, 39990000, 28, N'/images/variants/ip15pm-512-titan.jpg', N'bac', 1),
(@ip15pm_id, N'IP15PM-256-BLU-BAC', N'iPhone 15 Pro Max 256GB Titan Xanh', 34990000, 33990000, 52, N'/images/variants/ip15pm-blue.jpg', N'bac', 1),
(@ip15p_id, N'IP15P-128-TIT-BAC', N'iPhone 15 Pro 128GB Titan Tự Nhiên', 28990000, 27990000, 38, N'/images/variants/ip15p-titan.jpg', N'bac', 1),
(@ip15p_id, N'IP15P-256-TIT-BAC', N'iPhone 15 Pro 256GB Titan Tự Nhiên', 31990000, 30990000, 42, N'/images/variants/ip15p-256-titan.jpg', N'bac', 1),
(@ip15_id, N'IP15-128-BLK-BAC', N'iPhone 15 128GB Đen', 22990000, 21990000, 68, N'/images/variants/ip15-black.jpg', N'bac', 1),
(@ip15_id, N'IP15-256-BLK-BAC', N'iPhone 15 256GB Đen', 25990000, 24990000, 55, N'/images/variants/ip15-256-black.jpg', N'bac', 1),
(@ip15_id, N'IP15-128-BLU-BAC', N'iPhone 15 128GB Xanh', 22990000, 21990000, 72, N'/images/variants/ip15-blue.jpg', N'bac', 1),
(@s24u_id, N'S24U-256-BLK-BAC', N'Galaxy S24 Ultra 256GB Đen', 29990000, 28490000, 35, N'/images/variants/s24u-black.jpg', N'bac', 1),
(@s24u_id, N'S24U-512-BLK-BAC', N'Galaxy S24 Ultra 512GB Đen', 33990000, 32490000, 22, N'/images/variants/s24u-512-black.jpg', N'bac', 1),
(@s24u_id, N'S24U-256-GRY-BAC', N'Galaxy S24 Ultra 256GB Xám', 29990000, 28490000, 40, N'/images/variants/s24u-gray.jpg', N'bac', 1),
-- Variants Miền Trung (products từ Trung + một số từ Bắc/Nam nhập về)
(@xiaomi14_id, N'XM14-256-BLK-TRG', N'Xiaomi 14 256GB Đen', 16990000, 15990000, 48, N'/images/variants/xm14-black.jpg', N'trung', 1),
(@xiaomi14_id, N'XM14-512-BLK-TRG', N'Xiaomi 14 512GB Đen', 18990000, 17990000, 32, N'/images/variants/xm14-512-black.jpg', N'trung', 1),
(@xiaomi14_id, N'XM14-256-WHT-TRG', N'Xiaomi 14 256GB Trắng', 16990000, 15990000, 55, N'/images/variants/xm14-white.jpg', N'trung', 1),
(@xiaomi14p_id, N'XM14P-512-BLK-TRG', N'Xiaomi 14 Pro 512GB Đen', 21990000, 20990000, 30, N'/images/variants/xm14p-black.jpg', N'trung', 1),
(@ip15pm_id, N'IP15PM-256-TIT-TRG', N'iPhone 15 Pro Max 256GB Titan (Trung)', 35490000, 34490000, 25, N'/images/variants/ip15pm-titan.jpg', N'trung', 1),
(@s24u_id, N'S24U-256-BLK-TRG', N'Galaxy S24 Ultra 256GB Đen (Trung)', 29490000, 27990000, 20, N'/images/variants/s24u-black.jpg', N'trung', 1),
-- Variants Miền Nam (products từ Nam + một số từ Bắc/Trung nhập về)
(@ip15pm_id, N'IP15PM-256-TIT-NAM', N'iPhone 15 Pro Max 256GB Titan (Nam)', 34490000, 33490000, 40, N'/images/variants/ip15pm-titan.jpg', N'nam', 1),
(@ip15p_id, N'IP15P-128-TIT-NAM', N'iPhone 15 Pro 128GB Titan (Nam)', 28490000, 27490000, 35, N'/images/variants/ip15p-titan.jpg', N'nam', 1),
(@s24u_id, N'S24U-256-BLK-NAM', N'Galaxy S24 Ultra 256GB Đen (Nam)', 29990000, 28990000, 45, N'/images/variants/s24u-black.jpg', N'nam', 1),
(@s24_id, N'S24-256-BLK-NAM', N'Galaxy S24 256GB Đen', 22990000, 21990000, 50, N'/images/variants/s24-black.jpg', N'nam', 1),
(@xiaomi14_id, N'XM14-256-BLK-NAM', N'Xiaomi 14 256GB Đen (Nam)', 17490000, 16490000, 30, N'/images/variants/xm14-black.jpg', N'nam', 1);
GO

-- =============================================
-- NHÓM 3: NGƯỜI DÙNG
-- =============================================

-- 8. Dữ liệu người dùng
INSERT INTO users (email, mat_khau, ho_ten, so_dien_thoai, vai_tro, vung_id, site_registered, mongo_profile_id, trang_thai) VALUES
-- Super Admin (quản lý cả 3 sites)
(N'superadmin@webphones.vn', N'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92d', N'Super Admin', N'0900000000', N'super_admin', N'bac', N'bac', NULL, 1),
-- Admin Miền Bắc
(N'admin.bac@webphones.vn', N'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Quản Trị Miền Bắc', N'0901234567', N'admin', N'bac', N'bac', NULL, 1),
-- Customer Miền Bắc
(N'nguyen.vana@gmail.com', N'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Nguyễn Văn A', N'0912345678', N'customer', N'bac', N'bac', NULL, 1),
(N'tran.thib@gmail.com', N'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Trần Thị B', N'0923456789', N'customer', N'bac', N'bac', NULL, 1),
(N'le.vanc@gmail.com', N'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Lê Văn C', N'0934567890', N'customer', N'bac', N'bac', NULL, 1),
-- Admin Miền Trung
(N'admin.trung@webphones.vn', N'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Quản Trị Miền Trung', N'0905678901', N'admin', N'trung', N'trung', NULL, 1),
-- Customer Miền Trung
(N'pham.thid@gmail.com', N'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Phạm Thị D', N'0945678901', N'customer', N'trung', N'trung', NULL, 1),
(N'hoang.vane@gmail.com', N'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Hoàng Văn E', N'0956789012', N'customer', N'trung', N'trung', NULL, 1),
-- Admin Miền Nam
(N'admin.nam@webphones.vn', N'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Quản Trị Miền Nam', N'0909876543', N'admin', N'nam', N'nam', NULL, 1),
-- Customer Miền Nam
(N'vu.thif@gmail.com', N'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Vũ Thị F', N'0967890123', N'customer', N'nam', N'nam', NULL, 1),
(N'do.vang@gmail.com', N'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Đỗ Văn G', N'0978901234', N'customer', N'nam', N'nam', NULL, 1),
(N'bui.thih@gmail.com', N'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Bùi Thị H', N'0989012345', N'customer', N'nam', N'nam', NULL, 1);
GO

-- 9. Dữ liệu địa chỉ người dùng
DECLARE @user1_id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'nguyen.vana@gmail.com');
DECLARE @user2_id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'tran.thib@gmail.com');
DECLARE @user6_id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'pham.thid@gmail.com');
DECLARE @user9_id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'vu.thif@gmail.com');

DECLARE @ward_hnhk UNIQUEIDENTIFIER = (SELECT id FROM wards WHERE ma_phuong_xa = N'HN-HK');
DECLARE @ward_hnbd UNIQUEIDENTIFIER = (SELECT id FROM wards WHERE ma_phuong_xa = N'HN-BD');
DECLARE @ward_dnhc UNIQUEIDENTIFIER = (SELECT id FROM wards WHERE ma_phuong_xa = N'DN-HC');
DECLARE @ward_sgq1 UNIQUEIDENTIFIER = (SELECT id FROM wards WHERE ma_phuong_xa = N'SG-Q1');
DECLARE @ward_sgq3 UNIQUEIDENTIFIER = (SELECT id FROM wards WHERE ma_phuong_xa = N'SG-Q3');

INSERT INTO user_addresses (user_id, loai_dia_chi, is_default, ten_nguoi_nhan, sdt_nguoi_nhan, phuong_xa_id, dia_chi_cu_the, ghi_chu, trang_thai) VALUES
-- User 1 - Nguyễn Văn A
(@user1_id, N'nha_rieng', 1, N'Nguyễn Văn A', N'0912345678', @ward_hnhk, N'Số 15 Phố Hàng Bài', N'Gọi trước khi giao', 1),
(@user1_id, N'cong_ty', 0, N'Nguyễn Văn A', N'0912345678', @ward_hnbd, N'Tòa nhà ABC, Đường Láng', N'Giao giờ hành chính', 1),
-- User 2 - Trần Thị B
(@user2_id, N'nha_rieng', 1, N'Trần Thị B', N'0923456789', @ward_hnbd, N'Số 25 Nguyễn Chí Thanh', NULL, 1),
-- User 6 - Phạm Thị D
(@user6_id, N'nha_rieng', 1, N'Phạm Thị D', N'0945678901', @ward_dnhc, N'Số 108 Trần Phú', N'Nhà màu vàng', 1),
-- User 9 - Vũ Thị F
(@user9_id, N'nha_rieng', 1, N'Vũ Thị F', N'0967890123', @ward_sgq1, N'Số 88 Đồng Khởi', NULL, 1),
(@user9_id, N'giao_hang', 0, N'Vũ Thị F', N'0967890123', @ward_sgq3, N'Căn hộ 502 Chung cư XYZ', N'Để hàng với bảo vệ', 1);

-- =============================================
-- NHÓM 4: KHO & TỒN KHO
-- =============================================

-- 10. Dữ liệu kho hàng (dùng lại biến @ward)
DECLARE @ward_hnhk UNIQUEIDENTIFIER = (SELECT id FROM wards WHERE ma_phuong_xa = N'HN-HK');
DECLARE @ward_hnbd UNIQUEIDENTIFIER = (SELECT id FROM wards WHERE ma_phuong_xa = N'HN-BD');
DECLARE @ward_dnhc UNIQUEIDENTIFIER = (SELECT id FROM wards WHERE ma_phuong_xa = N'DN-HC');
DECLARE @ward_sgq1 UNIQUEIDENTIFIER = (SELECT id FROM wards WHERE ma_phuong_xa = N'SG-Q1');
DECLARE @ward_sgq3 UNIQUEIDENTIFIER = (SELECT id FROM wards WHERE ma_phuong_xa = N'SG-Q3');

INSERT INTO warehouses (ten_kho, vung_id, phuong_xa_id, dia_chi_chi_tiet, so_dien_thoai, trang_thai) VALUES
(N'Kho Miền Bắc', N'bac', @ward_hnhk, N'Khu công nghiệp Thăng Long, Hà Nội', N'0241234567', 1),
(N'Kho Miền Trung', N'trung', @ward_dnhc, N'Khu công nghiệp Hòa Khánh, Đà Nẵng', N'0236234567', 1),
(N'Kho Miền Nam', N'nam', @ward_sgq1, N'Khu công nghiệp Tân Thuận, TP.HCM', N'0287654321', 1);
GO

-- 11. Dữ liệu tồn kho
DECLARE @kho_bac UNIQUEIDENTIFIER = (SELECT id FROM warehouses WHERE vung_id = N'bac');
DECLARE @kho_trung UNIQUEIDENTIFIER = (SELECT id FROM warehouses WHERE vung_id = N'trung');
DECLARE @kho_nam UNIQUEIDENTIFIER = (SELECT id FROM warehouses WHERE vung_id = N'nam');

DECLARE @var_ip15pm_256_bac UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'IP15PM-256-TIT-BAC');
DECLARE @var_ip15pm_512_bac UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'IP15PM-512-TIT-BAC');
DECLARE @var_ip15p_128_bac UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'IP15P-128-TIT-BAC');
DECLARE @var_s24u_256_bac UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'S24U-256-BLK-BAC');
DECLARE @var_xm14_256_trg UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'XM14-256-BLK-TRG');
DECLARE @var_ip15pm_256_trg UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'IP15PM-256-TIT-TRG');
DECLARE @var_s24u_256_trg UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'S24U-256-BLK-TRG');
DECLARE @var_ip15pm_256_nam UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'IP15PM-256-TIT-NAM');
DECLARE @var_ip15p_128_nam UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'IP15P-128-TIT-NAM');
DECLARE @var_s24u_256_nam UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'S24U-256-BLK-NAM');
DECLARE @var_xm14_256_nam UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'XM14-256-BLK-NAM');

INSERT INTO inventory (variant_id, kho_id, so_luong_kha_dung, so_luong_da_dat, muc_ton_kho_toi_thieu, so_luong_nhap_lai, lan_nhap_hang_cuoi) VALUES
-- Kho Miền Bắc (chỉ lưu variants có site_origin='bac')
(@var_ip15pm_256_bac, @kho_bac, 150, 15, 20, 50, DATEADD(DAY, -10, GETDATE())),
(@var_ip15pm_512_bac, @kho_bac, 80, 8, 15, 30, DATEADD(DAY, -10, GETDATE())),
(@var_ip15p_128_bac, @kho_bac, 120, 12, 20, 50, DATEADD(DAY, -8, GETDATE())),
(@var_s24u_256_bac, @kho_bac, 100, 10, 15, 40, DATEADD(DAY, -7, GETDATE())),
-- Kho Miền Trung (chỉ lưu variants có site_origin='trung')
(@var_xm14_256_trg, @kho_trung, 200, 20, 30, 100, DATEADD(DAY, -5, GETDATE())),
(@var_ip15pm_256_trg, @kho_trung, 80, 8, 15, 30, DATEADD(DAY, -12, GETDATE())),
(@var_s24u_256_trg, @kho_trung, 90, 9, 15, 35, DATEADD(DAY, -9, GETDATE())),
-- Kho Miền Nam (chỉ lưu variants có site_origin='nam')
(@var_ip15pm_256_nam, @kho_nam, 120, 12, 20, 50, DATEADD(DAY, -6, GETDATE())),
(@var_ip15p_128_nam, @kho_nam, 100, 10, 15, 40, DATEADD(DAY, -8, GETDATE())),
(@var_s24u_256_nam, @kho_nam, 110, 11, 20, 45, DATEADD(DAY, -7, GETDATE())),
(@var_xm14_256_nam, @kho_nam, 150, 15, 25, 80, DATEADD(DAY, -10, GETDATE()));
GO

-- =============================================
-- NHÓM 5: VẬN CHUYỂN
-- =============================================

-- 12. Dữ liệu phương thức vận chuyển
INSERT INTO shipping_methods (ten_phuong_thuc, mo_ta, chi_phi_co_ban, mongo_config_id, trang_thai) VALUES
(N'Giao hàng tiêu chuẩn', N'Giao hàng trong 3-5 ngày', 30000, NULL, 1),
(N'Giao hàng nhanh', N'Giao hàng trong 1-2 ngày', 50000, NULL, 1),
(N'Giao hàng hỏa tốc', N'Giao hàng trong 2-4 giờ (nội thành)', 100000, NULL, 1);
GO

-- 13. Dữ liệu chi phí vận chuyển theo vùng
DECLARE @ship_standard UNIQUEIDENTIFIER = (SELECT id FROM shipping_methods WHERE ten_phuong_thuc = N'Giao hàng tiêu chuẩn');
DECLARE @ship_fast UNIQUEIDENTIFIER = (SELECT id FROM shipping_methods WHERE ten_phuong_thuc = N'Giao hàng nhanh');
DECLARE @ship_express UNIQUEIDENTIFIER = (SELECT id FROM shipping_methods WHERE ten_phuong_thuc = N'Giao hàng hỏa tốc');

INSERT INTO shipping_method_regions (shipping_method_id, region_id, chi_phi_van_chuyen, thoi_gian_giao_du_kien, mongo_region_config_id, trang_thai) VALUES
-- Giao hàng tiêu chuẩn
(@ship_standard, N'bac', 30000, 72, NULL, 1),
(@ship_standard, N'trung', 35000, 96, NULL, 1),
(@ship_standard, N'nam', 32000, 72, NULL, 1),
-- Giao hàng nhanh
(@ship_fast, N'bac', 50000, 36, NULL, 1),
(@ship_fast, N'trung', 60000, 48, NULL, 1),
(@ship_fast, N'nam', 55000, 36, NULL, 1),
-- Giao hàng hỏa tốc
(@ship_express, N'bac', 100000, 4, NULL, 1),
(@ship_express, N'trung', 120000, 6, NULL, 1),
(@ship_express, N'nam', 110000, 4, NULL, 1);
GO

-- =============================================
-- NHÓM 6: VOUCHER
-- =============================================

-- 14. Dữ liệu voucher
DECLARE @superadmin_id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'superadmin@webphones.vn');
DECLARE @admin_bac UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'admin.bac@webphones.vn');
DECLARE @admin_trung UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'admin.trung@webphones.vn');
DECLARE @admin_nam UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'admin.nam@webphones.vn');

INSERT INTO vouchers (ma_voucher, ten_voucher, mo_ta, loai_giam_gia, gia_tri_giam, gia_tri_toi_da, don_hang_toi_thieu, so_luong, da_su_dung, ngay_bat_dau, ngay_ket_thuc, mongo_voucher_detail_id, nguoi_tao, vung_id, pham_vi, loai_voucher, trang_thai) VALUES
-- Voucher Miền Bắc
(N'WELCOM2024', N'Voucher Chào Mừng', N'Giảm 10% cho đơn hàng đầu tiên', N'phantram', 10, 500000, 1000000, 1000, 125, DATEADD(DAY, -30, GETDATE()), DATEADD(DAY, 30, GETDATE()), NULL, @admin_bac, N'bac', N'toan_cuc', N'new_customer', 1),
(N'IPHONE500K', N'Giảm 500K iPhone', N'Giảm 500K cho iPhone 15 series', N'tiengiam', 500000, 500000, 20000000, 500, 78, DATEADD(DAY, -15, GETDATE()), DATEADD(DAY, 15, GETDATE()), NULL, @admin_bac, N'bac', N'theo_san_pham', N'product_specific', 1),
-- Voucher Miền Trung
(N'FREESHIP100', N'Miễn Phí Vận Chuyển', N'Miễn phí ship cho đơn từ 5 triệu', N'mienphi', 100000, 100000, 5000000, 800, 234, DATEADD(DAY, -20, GETDATE()), DATEADD(DAY, 20, GETDATE()), NULL, @admin_trung, N'trung', N'toan_cuc', N'shipping', 1),
(N'XIAOMI200K', N'Giảm 200K Xiaomi', N'Giảm 200K cho Xiaomi 14 series', N'tiengiam', 200000, 200000, 10000000, 300, 45, DATEADD(DAY, -10, GETDATE()), DATEADD(DAY, 25, GETDATE()), NULL, @admin_trung, N'trung', N'theo_san_pham', N'product_specific', 1),
-- Voucher Miền Nam
(N'SUMMER15', N'Giảm 15% Mùa Hè', N'Giảm 15% toàn bộ sản phẩm', N'phantram', 15, 1000000, 5000000, 2000, 567, DATEADD(DAY, -25, GETDATE()), DATEADD(DAY, 35, GETDATE()), NULL, @admin_nam, N'nam', N'toan_cuc', N'seasonal', 1),
(N'SAMSUNG300K', N'Giảm 300K Samsung', N'Giảm 300K cho Samsung Galaxy S24', N'tiengiam', 300000, 300000, 15000000, 400, 92, DATEADD(DAY, -12, GETDATE()), DATEADD(DAY, 18, GETDATE()), NULL, @admin_nam, N'nam', N'theo_san_pham', N'product_specific', 1);
GO

-- 15. Áp dụng voucher cho sản phẩm
DECLARE @voucher_iphone UNIQUEIDENTIFIER = (SELECT id FROM vouchers WHERE ma_voucher = N'IPHONE500K');
DECLARE @voucher_xiaomi UNIQUEIDENTIFIER = (SELECT id FROM vouchers WHERE ma_voucher = N'XIAOMI200K');
DECLARE @voucher_samsung UNIQUEIDENTIFIER = (SELECT id FROM vouchers WHERE ma_voucher = N'SAMSUNG300K');
DECLARE @ip15pm_id UNIQUEIDENTIFIER = (SELECT id FROM products WHERE ma_san_pham = N'IP15PM-001');
DECLARE @ip15p_id UNIQUEIDENTIFIER = (SELECT id FROM products WHERE ma_san_pham = N'IP15P-001');
DECLARE @ip15_id UNIQUEIDENTIFIER = (SELECT id FROM products WHERE ma_san_pham = N'IP15-001');
DECLARE @xiaomi14_id UNIQUEIDENTIFIER = (SELECT id FROM products WHERE ma_san_pham = N'XM-14-001');
DECLARE @s24u_id UNIQUEIDENTIFIER = (SELECT id FROM products WHERE ma_san_pham = N'SS-S24U-001');

INSERT INTO voucher_products (voucher_id, san_pham_id) VALUES
-- Voucher iPhone
(@voucher_iphone, @ip15pm_id),
(@voucher_iphone, @ip15p_id),
(@voucher_iphone, @ip15_id),
-- Voucher Xiaomi
(@voucher_xiaomi, @xiaomi14_id),
-- Voucher Samsung
(@voucher_samsung, @s24u_id);

-- =============================================
-- NHÓM 7: FLASH SALE
-- =============================================

-- 17. Dữ liệu flash sale
DECLARE @superadmin_id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'superadmin@webphones.vn');
DECLARE @admin_bac UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'admin.bac@webphones.vn');
DECLARE @admin_trung UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'admin.trung@webphones.vn');
DECLARE @admin_nam UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'admin.nam@webphones.vn');

INSERT INTO flash_sales (ten_flash_sale, mo_ta, ngay_bat_dau, ngay_ket_thuc, mongo_flash_sale_detail_id, vung_id, trang_thai, nguoi_tao) VALUES
-- Flash sale Miền Bắc
(N'Flash Sale 12.12 Miền Bắc', N'Giảm giá sốc ngày 12/12', DATEADD(DAY, -2, GETDATE()), DATEADD(DAY, 2, GETDATE()), NULL, N'bac', N'dang_dien_ra', @admin_bac),
-- Flash sale Miền Trung
(N'Flash Sale Tuần Lễ Vàng', N'Tuần lễ vàng giảm giá', DATEADD(DAY, -5, GETDATE()), DATEADD(DAY, 5, GETDATE()), NULL, N'trung', N'dang_dien_ra', @admin_trung),
-- Flash sale Miền Nam
(N'Flash Sale Cuối Năm', N'Săn deal cuối năm', DATEADD(DAY, -3, GETDATE()), DATEADD(DAY, 7, GETDATE()), NULL, N'nam', N'dang_dien_ra', @admin_nam);

-- 18. Dữ liệu sản phẩm flash sale
DECLARE @flash_bac UNIQUEIDENTIFIER = (SELECT id FROM flash_sales WHERE ten_flash_sale = N'Flash Sale 12.12 Miền Bắc');
DECLARE @flash_trung UNIQUEIDENTIFIER = (SELECT id FROM flash_sales WHERE ten_flash_sale = N'Flash Sale Tuần Lễ Vàng');
DECLARE @flash_nam UNIQUEIDENTIFIER = (SELECT id FROM flash_sales WHERE ten_flash_sale = N'Flash Sale Cuối Năm');
DECLARE @var_ip15pm_256_bac UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'IP15PM-256-TIT-BAC');
DECLARE @var_s24u_256_bac UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'S24U-256-BLK-BAC');
DECLARE @var_ip15p_128_bac UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'IP15P-128-TIT-BAC');
DECLARE @var_xm14_256_trg UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'XM14-256-BLK-TRG');
DECLARE @var_ip15pm_256_trg UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'IP15PM-256-TIT-TRG');
DECLARE @var_s24u_256_nam UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'S24U-256-BLK-NAM');
DECLARE @var_ip15pm_256_nam UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'IP15PM-256-TIT-NAM');

INSERT INTO flash_sale_items (flash_sale_id, variant_id, gia_goc, gia_flash_sale, so_luong_ton, da_ban, gioi_han_mua, thu_tu, trang_thai) VALUES
-- Flash sale Miền Bắc (chỉ variants của Bắc)
(@flash_bac, @var_ip15pm_256_bac, 33990000, 31990000, 50, 18, 2, 1, N'dang_ban'),
(@flash_bac, @var_s24u_256_bac, 28490000, 26490000, 40, 22, 2, 2, N'dang_ban'),
(@flash_bac, @var_ip15p_128_bac, 27990000, 25990000, 30, 15, 2, 3, N'dang_ban'),
-- Flash sale Miền Trung (chỉ variants của Trung)
(@flash_trung, @var_xm14_256_trg, 15990000, 13990000, 80, 45, 3, 1, N'dang_ban'),
(@flash_trung, @var_ip15pm_256_trg, 34490000, 32490000, 30, 12, 1, 2, N'dang_ban'),
-- Flash sale Miền Nam (chỉ variants của Nam)
(@flash_nam, @var_s24u_256_nam, 28990000, 26990000, 50, 28, 2, 1, N'dang_ban'),
(@flash_nam, @var_ip15pm_256_nam, 33490000, 31990000, 40, 20, 2, 2, N'dang_ban');
GO

-- =============================================
-- NHÓM 8: ĐƠN HÀNG (Tạo sau khi có địa chỉ)
-- =============================================

-- 20. Dữ liệu đơn hàng
DECLARE @user1_id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'nguyen.vana@gmail.com');
DECLARE @user2_id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'tran.thib@gmail.com');
DECLARE @user6_id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'pham.thid@gmail.com');
DECLARE @user9_id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'vu.thif@gmail.com');
DECLARE @addr_user1 UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM user_addresses WHERE user_id = @user1_id AND is_default = 1);
DECLARE @addr_user2 UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM user_addresses WHERE user_id = @user2_id AND is_default = 1);
DECLARE @addr_user6 UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM user_addresses WHERE user_id = @user6_id AND is_default = 1);
DECLARE @addr_user9 UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM user_addresses WHERE user_id = @user9_id AND is_default = 1);

DECLARE @ship_fast UNIQUEIDENTIFIER = (SELECT id FROM shipping_methods WHERE ten_phuong_thuc = N'Giao hàng nhanh');
DECLARE @ship_standard UNIQUEIDENTIFIER = (SELECT id FROM shipping_methods WHERE ten_phuong_thuc = N'Giao hàng tiêu chuẩn');
DECLARE @ship_express UNIQUEIDENTIFIER = (SELECT id FROM shipping_methods WHERE ten_phuong_thuc = N'Giao hàng hỏa tốc');
DECLARE @ship_bac_fast UNIQUEIDENTIFIER = (SELECT id FROM shipping_method_regions WHERE shipping_method_id = @ship_fast AND region_id = N'bac');
DECLARE @ship_trung_standard UNIQUEIDENTIFIER = (SELECT id FROM shipping_method_regions WHERE shipping_method_id = @ship_standard AND region_id = N'trung');
DECLARE @ship_nam_express UNIQUEIDENTIFIER = (SELECT id FROM shipping_method_regions WHERE shipping_method_id = @ship_express AND region_id = N'nam');

DECLARE @kho_bac UNIQUEIDENTIFIER = (SELECT id FROM warehouses WHERE vung_id = N'bac');
DECLARE @kho_trung UNIQUEIDENTIFIER = (SELECT id FROM warehouses WHERE vung_id = N'trung');
DECLARE @kho_nam UNIQUEIDENTIFIER = (SELECT id FROM warehouses WHERE vung_id = N'nam');
DECLARE @voucher_welcome UNIQUEIDENTIFIER = (SELECT id FROM vouchers WHERE ma_voucher = N'WELCOM2024');

INSERT INTO orders (ma_don_hang, nguoi_dung_id, vung_don_hang, site_processed, shipping_method_region_id, dia_chi_giao_hang_id, kho_giao_hang, voucher_id, tong_tien_hang, phi_van_chuyen, gia_tri_giam_voucher, tong_thanh_toan, mongo_order_detail_id, trang_thai) VALUES
-- Đơn hàng Miền Bắc
(N'ORD-BAC-2024120001', @user1_id, N'bac', N'bac', @ship_bac_fast, @addr_user1, @kho_bac, NULL, 31990000, 50000, 0, 32040000, NULL, N'dang_xu_ly'),
(N'ORD-BAC-2024120002', @user2_id, N'bac', N'bac', @ship_bac_fast, @addr_user2, @kho_bac, @voucher_welcome, 21990000, 50000, 500000, 21540000, NULL, N'hoan_thanh'),
-- Đơn hàng Miền Trung
(N'ORD-TRG-2024120001', @user6_id, N'trung', N'trung', @ship_trung_standard, @addr_user6, @kho_trung, NULL, 15990000, 35000, 0, 16025000, NULL, N'dang_giao'),
-- Đơn hàng Miền Nam
(N'ORD-NAM-2024120001', @user9_id, N'nam', N'nam', @ship_nam_express, @addr_user9, @kho_nam, NULL, 28990000, 110000, 0, 29100000, NULL, N'cho_xac_nhan');
GO

-- 21. Dữ liệu chi tiết đơn hàng
DECLARE @order1 UNIQUEIDENTIFIER = (SELECT id FROM orders WHERE ma_don_hang = N'ORD-BAC-2024120001');
DECLARE @order2 UNIQUEIDENTIFIER = (SELECT id FROM orders WHERE ma_don_hang = N'ORD-BAC-2024120002');
DECLARE @order3 UNIQUEIDENTIFIER = (SELECT id FROM orders WHERE ma_don_hang = N'ORD-TRG-2024120001');
DECLARE @order4 UNIQUEIDENTIFIER = (SELECT id FROM orders WHERE ma_don_hang = N'ORD-NAM-2024120001');

DECLARE @var_ip15pm_256_bac UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'IP15PM-256-TIT-BAC');
DECLARE @var_ip15_128_bac UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'IP15-128-BLK-BAC');
DECLARE @var_xm14_256_trg UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'XM14-256-BLK-TRG');
DECLARE @var_s24u_256_nam UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'S24U-256-BLK-NAM');
DECLARE @flash_bac UNIQUEIDENTIFIER = (SELECT id FROM flash_sales WHERE ten_flash_sale = N'Flash Sale 12.12 Miền Bắc');
DECLARE @flash_item1 UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM flash_sale_items WHERE flash_sale_id = @flash_bac AND variant_id = @var_ip15pm_256_bac);

INSERT INTO order_details (don_hang_id, variant_id, flash_sale_item_id, so_luong, don_gia, thanh_tien) VALUES
-- Đơn hàng 1 (Miền Bắc - mua flash sale)
(@order1, @var_ip15pm_256_bac, @flash_item1, 1, 31990000, 31990000),
-- Đơn hàng 2 (Miền Bắc - mua bình thường)
(@order2, @var_ip15_128_bac, NULL, 1, 21990000, 21990000),
-- Đơn hàng 3 (Miền Trung)
(@order3, @var_xm14_256_trg, NULL, 1, 15990000, 15990000),
-- Đơn hàng 4 (Miền Nam)
(@order4, @var_s24u_256_nam, NULL, 1, 28990000, 28990000);

-- 22. Dữ liệu thanh toán
INSERT INTO payments (don_hang_id, phuong_thuc, so_tien, mongo_payment_detail_id, trang_thai, ma_giao_dich) VALUES
(@order1, N'vnpay', 32040000, NULL, N'success', N'VNPAY20241208001'),
(@order2, N'momo', 21540000, NULL, N'success', N'MOMO20241208002'),
(@order3, N'cod', 16025000, NULL, N'pending', NULL),
(@order4, N'cod', 29100000, NULL, N'pending', NULL);

-- 23. Dữ liệu lịch sử trạng thái đơn hàng
DECLARE @superadmin_id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'superadmin@webphones.vn');
DECLARE @admin_bac UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'admin.bac@webphones.vn');
DECLARE @admin_trung UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'admin.trung@webphones.vn');

INSERT INTO order_status_history (don_hang_id, trang_thai_cu, trang_thai_moi, ghi_chu, nguoi_thao_tac) VALUES
(@order1, NULL, N'cho_xac_nhan', N'Đơn hàng được tạo', @user1_id),
(@order1, N'cho_xac_nhan', N'dang_xu_ly', N'Đã xác nhận đơn hàng', @admin_bac),
(@order2, NULL, N'cho_xac_nhan', N'Đơn hàng được tạo', @user2_id),
(@order2, N'cho_xac_nhan', N'dang_xu_ly', N'Đã xác nhận đơn hàng', @admin_bac),
(@order2, N'dang_xu_ly', N'dang_giao', N'Đơn hàng đang giao', @admin_bac),
(@order2, N'dang_giao', N'hoan_thanh', N'Giao hàng thành công', @admin_bac),
(@order3, NULL, N'cho_xac_nhan', N'Đơn hàng được tạo', @user6_id),
(@order3, N'cho_xac_nhan', N'dang_xu_ly', N'Đã xác nhận đơn hàng', @admin_trung),
(@order3, N'dang_xu_ly', N'dang_giao', N'Đơn vị vận chuyển đã nhận hàng', @admin_trung),
(@order4, NULL, N'cho_xac_nhan', N'Đơn hàng được tạo', @user9_id);
GO

-- =============================================
-- QUAY LẠI NHÓM 6: VOUCHER ĐÃ SỬ DỤNG
-- =============================================

-- 16. Dữ liệu voucher đã sử dụng (cần orders đã tạo)
DECLARE @voucher_welcome UNIQUEIDENTIFIER = (SELECT id FROM vouchers WHERE ma_voucher = N'WELCOM2024');
DECLARE @user2_id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'tran.thib@gmail.com');
DECLARE @order2 UNIQUEIDENTIFIER = (SELECT id FROM orders WHERE ma_don_hang = N'ORD-BAC-2024120002');
INSERT INTO used_vouchers (voucher_id, nguoi_dung_id, don_hang_id, gia_tri_giam) VALUES
(@voucher_welcome, @user2_id, @order2, 500000);
GO

-- =============================================
-- QUAY LẠI NHÓM 7: LỊCH SỬ MUA FLASH SALE
-- =============================================

-- 19. Dữ liệu lịch sử mua flash sale (cần orders đã tạo)
DECLARE @flash_bac UNIQUEIDENTIFIER = (SELECT id FROM flash_sales WHERE ten_flash_sale = N'Flash Sale 12.12 Miền Bắc');
DECLARE @var_ip15pm_256_bac UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'IP15PM-256-TIT-BAC');
DECLARE @flash_item1 UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM flash_sale_items WHERE flash_sale_id = @flash_bac AND variant_id = @var_ip15pm_256_bac);
DECLARE @user1_id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'nguyen.vana@gmail.com');
DECLARE @order1 UNIQUEIDENTIFIER = (SELECT id FROM orders WHERE ma_don_hang = N'ORD-BAC-2024120001');
INSERT INTO flash_sale_orders (flash_sale_item_id, nguoi_dung_id, don_hang_id, so_luong, gia_flash_sale) VALUES
(@flash_item1, @user1_id, @order1, 1, 31990000);
GO
-- =============================================
-- NHÓM 9: GIỎ HÀNG
-- =============================================

-- 24. Dữ liệu giỏ hàng
DECLARE @user3_id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'le.vanc@gmail.com');
DECLARE @user7_id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'hoang.vane@gmail.com');
DECLARE @user10_id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'do.vang@gmail.com');

INSERT INTO carts (nguoi_dung_id, vung_id) VALUES
(@user3_id, N'bac'),
(@user7_id, N'trung'),
(@user10_id, N'nam');

-- 25. Dữ liệu sản phẩm trong giỏ hàng
DECLARE @cart1 UNIQUEIDENTIFIER = (SELECT id FROM carts WHERE nguoi_dung_id = @user3_id);
DECLARE @cart2 UNIQUEIDENTIFIER = (SELECT id FROM carts WHERE nguoi_dung_id = @user7_id);
DECLARE @cart3 UNIQUEIDENTIFIER = (SELECT id FROM carts WHERE nguoi_dung_id = @user10_id);
DECLARE @var_ip15p_128 UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'IP15P-128-TIT-BAC');
DECLARE @var_xm14_256 UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'XM14-256-BLK-TRG');
DECLARE @var_s24u_256 UNIQUEIDENTIFIER = (SELECT id FROM product_variants WHERE ma_sku = N'S24U-256-BLK-NAM');

INSERT INTO cart_items (gio_hang_id, variant_id, so_luong) VALUES
-- Giỏ hàng user 3
(@cart1, @var_ip15p_128, 1),
-- Giỏ hàng user 7
(@cart2, @var_xm14_256, 2),
-- Giỏ hàng user 10
(@cart3, @var_s24u_256, 1);
GO
-- =============================================
-- NHÓM 10: ĐÁNH GIÁ
-- =============================================

-- 26. Dữ liệu đánh giá sản phẩm
DECLARE @ip15_id UNIQUEIDENTIFIER = (SELECT id FROM products WHERE ma_san_pham = N'IP15-001');
DECLARE @xiaomi14_id UNIQUEIDENTIFIER = (SELECT id FROM products WHERE ma_san_pham = N'XM-14-001');
DECLARE @user2_id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'tran.thib@gmail.com');
DECLARE @user6_id UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = N'pham.thid@gmail.com');
DECLARE @order2 UNIQUEIDENTIFIER = (SELECT id FROM orders WHERE ma_don_hang = N'ORD-BAC-2024120002');
DECLARE @order3 UNIQUEIDENTIFIER = (SELECT id FROM orders WHERE ma_don_hang = N'ORD-TRG-2024120001');

INSERT INTO reviews (san_pham_id, nguoi_dung_id, don_hang_id, diem_danh_gia, tieu_de, mongo_review_content_id, trang_thai) VALUES
-- Review cho đơn hàng hoàn thành
(@ip15_id, @user2_id, @order2, 5, N'Sản phẩm tuyệt vời, giao hàng nhanh!', NULL, 1),
(@xiaomi14_id, @user6_id, @order3, 4, N'Máy đẹp, pin trâu, camera tốt', NULL, 1);
GO
-- 27. Dữ liệu mã OTP
INSERT INTO otp_codes (email, ma_otp, loai_otp, ngay_het_han, da_su_dung) VALUES
-- OTP đã sử dụng
(N'nguyen.vana@gmail.com', N'123456', N'register', DATEADD(MINUTE, 5, GETDATE()), 1),
(N'tran.thib@gmail.com', N'234567', N'register', DATEADD(MINUTE, 10, GETDATE()), 1),
-- OTP chưa sử dụng (còn hạn)
(N'test.user@gmail.com', N'345678', N'register', DATEADD(MINUTE, 15, GETDATE()), 0),
(N'reset.pass@gmail.com', N'456789', N'forgot_password', DATEADD(MINUTE, 20, GETDATE()), 0),
-- OTP chưa dùng, sắp hết hạn
(N'expired.user@gmail.com', N'567890', N'verify_email', DATEADD(MINUTE, 2, GETDATE()), 0);
GO

-- =============================================
-- HOÀN TẤT IMPORT DỮ LIỆU MẪU
-- =============================================

PRINT N'=================================================';
PRINT N'ĐÃ IMPORT THÀNH CÔNG DỮ LIỆU MẪU';
PRINT N'=================================================';
PRINT N'Tổng kết:';
PRINT N'- 3 vùng miền (Bắc, Trung, Nam)';
PRINT N'- 15 tỉnh/thành phố';
PRINT N'- 15 phường/xã';
PRINT N'- 6 thương hiệu';
PRINT N'- 5 danh mục';
PRINT N'- 12 sản phẩm';
PRINT N'- 14 biến thể sản phẩm';
PRINT N'- 11 người dùng (3 admin + 8 khách hàng)';
PRINT N'- 6 địa chỉ giao hàng';
PRINT N'- 3 kho hàng';
PRINT N'- 11 bản ghi tồn kho';
PRINT N'- 3 phương thức vận chuyển';
PRINT N'- 9 cấu hình vận chuyển theo vùng';
PRINT N'- 6 voucher';
PRINT N'- 5 áp dụng voucher cho sản phẩm';
PRINT N'- 3 chương trình flash sale';
PRINT N'- 7 sản phẩm flash sale';
PRINT N'- 4 đơn hàng';
PRINT N'- 4 chi tiết đơn hàng';
PRINT N'- 4 thanh toán';
PRINT N'- 10 lịch sử trạng thái';
PRINT N'- 1 voucher đã sử dụng';
PRINT N'- 1 lịch sử mua flash sale';
PRINT N'- 3 giỏ hàng';
PRINT N'- 5 sản phẩm trong giỏ';
PRINT N'- 2 đánh giá';
PRINT N'- 5 mã OTP';
PRINT N'=================================================';
GO
