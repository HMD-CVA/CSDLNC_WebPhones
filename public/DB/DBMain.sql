-- TẠO DATABASE
CREATE DATABASE DB_WEBPHONES;
GO

USE DB_WEBPHONES;
GO

-- 1. BẢNG VÙNG MIỀN
CREATE TABLE regions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ma_vung NVARCHAR(10) UNIQUE NOT NULL CHECK (ma_vung IN (N'bac', N'trung', N'nam')),
    ten_vung NVARCHAR(50) NOT NULL,
    trang_thai BIT DEFAULT 1,
    ngay_tao DATETIME2 DEFAULT GETDATE()
);
GO

-- 2. BẢNG THƯƠNG HIỆU
CREATE TABLE brands (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ten_thuong_hieu NVARCHAR(100) NOT NULL,
    mo_ta NVARCHAR(500),
    logo_url NVARCHAR(500),
    slug NVARCHAR(255) UNIQUE,
    trang_thai BIT DEFAULT 1,
    ngay_tao DATETIME2 DEFAULT GETDATE()
);
GO

-- 3. BẢNG DANH MỤC
CREATE TABLE categories (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ten_danh_muc NVARCHAR(100) NOT NULL,
    danh_muc_cha_id UNIQUEIDENTIFIER NULL,
    mo_ta NVARCHAR(500),
    slug NVARCHAR(255) UNIQUE,
    anh_url NVARCHAR(500),
    thu_tu INT DEFAULT 0,
    trang_thai BIT DEFAULT 1,
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (danh_muc_cha_id) REFERENCES categories(id),
    CHECK (thu_tu >= 0)
);
GO

-- 4. BẢNG SẢN PHẨM
CREATE TABLE products (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ma_sku NVARCHAR(100) UNIQUE NOT NULL,
    ten_san_pham NVARCHAR(255) NOT NULL,
    danh_muc_id UNIQUEIDENTIFIER NOT NULL,
    thuong_hieu_id UNIQUEIDENTIFIER NOT NULL,
    gia_niem_yet DECIMAL(15,2) NOT NULL,
    gia_ban DECIMAL(15,2) NOT NULL,
    mongo_detail_id NVARCHAR(50) NULL,
    trang_thai BIT DEFAULT 1,
    luot_xem INT DEFAULT 0,
    so_luong_ban INT DEFAULT 0,
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (danh_muc_id) REFERENCES categories(id),
    FOREIGN KEY (thuong_hieu_id) REFERENCES brands(id),
    CHECK (gia_ban > 0),
    CHECK (gia_niem_yet >= gia_ban),
    CHECK (luot_xem >= 0),
    CHECK (so_luong_ban >= 0)
);
GO

-- 5. BẢNG NGƯỜI DÙNG
CREATE TABLE users (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255) UNIQUE NOT NULL,
    mat_khau NVARCHAR(255) NOT NULL,
    ho_ten NVARCHAR(100),
    so_dien_thoai NVARCHAR(20),
    vung_id NVARCHAR(10) NOT NULL DEFAULT N'bac' CHECK (vung_id IN (N'bac', N'trung', N'nam')),
    mongo_profile_id NVARCHAR(50) NULL,
    trang_thai BIT DEFAULT 1,
    ngay_dang_ky DATETIME2 DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (vung_id) REFERENCES regions(ma_vung)
);
GO

-- 6. BẢNG KHO HÀNG
CREATE TABLE warehouses (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ten_kho NVARCHAR(100) NOT NULL,
    dia_chi_chi_tiet NVARCHAR(255),
    phuong_xa NVARCHAR(100),
    quan_huyen NVARCHAR(100),
    thanh_pho NVARCHAR(100),
    so_dien_thoai NVARCHAR(20),
    vung_id NVARCHAR(10) NOT NULL DEFAULT N'bac' CHECK (vung_id IN (N'bac', N'trung', N'nam')),
    trang_thai BIT DEFAULT 1,
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (vung_id) REFERENCES regions(ma_vung)
);
GO

-- 7. BẢNG TỒN KHO
CREATE TABLE inventory (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    san_pham_id UNIQUEIDENTIFIER NOT NULL,
    kho_id UNIQUEIDENTIFIER NOT NULL,
    so_luong_kha_dung INT NOT NULL DEFAULT 0,
    so_luong_da_dat INT NOT NULL DEFAULT 0,
    muc_ton_kho_toi_thieu INT DEFAULT 10,
    so_luong_nhap_lai INT DEFAULT 50,
    lan_nhap_hang_cuoi DATETIME2 NULL,
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (san_pham_id) REFERENCES products(id),
    FOREIGN KEY (kho_id) REFERENCES warehouses(id),
    CONSTRAINT UQ_inventory_sanpham_kho UNIQUE (san_pham_id, kho_id),
    CHECK (so_luong_kha_dung >= 0),
    CHECK (so_luong_da_dat >= 0),
    CHECK (muc_ton_kho_toi_thieu >= 0),
    CHECK (so_luong_nhap_lai >= 0)
);
GO

-- 8. BẢNG ĐỊA CHỈ GIAO HÀNG
CREATE TABLE shipping_addresses (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nguoi_dung_id UNIQUEIDENTIFIER NOT NULL,
    ho_ten NVARCHAR(100) NOT NULL,
    so_dien_thoai NVARCHAR(20) NOT NULL,
    dia_chi_chi_tiet NVARCHAR(255) NOT NULL,
    phuong_xa NVARCHAR(100) NOT NULL,
    quan_huyen NVARCHAR(100) NOT NULL,
    thanh_pho NVARCHAR(100) NOT NULL,
    vung_id NVARCHAR(10) NOT NULL DEFAULT N'bac' CHECK (vung_id IN (N'bac', N'trung', N'nam')),
    dia_chi_mac_dinh BIT DEFAULT 0,
    loai_dia_chi NVARCHAR(20) DEFAULT N'nha_rieng' CHECK (loai_dia_chi IN (N'nha_rieng', N'van_phong', N'khac')),
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (nguoi_dung_id) REFERENCES users(id),
    FOREIGN KEY (vung_id) REFERENCES regions(ma_vung)
);
GO

-- 9. BẢNG PHƯƠNG THỨC VẬN CHUYỂN
CREATE TABLE shipping_methods (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ten_phuong_thuc NVARCHAR(100) NOT NULL,
    chi_phi_co_ban DECIMAL(15,2) NOT NULL,
    mongo_config_id NVARCHAR(50) NULL,
    trang_thai BIT DEFAULT 1,
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    CHECK (chi_phi_co_ban >= 0)
);
GO

-- 10. BẢNG PHƯƠNG THỨC VẬN CHUYỂN THEO VÙNG
CREATE TABLE shipping_method_regions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    shipping_method_id UNIQUEIDENTIFIER NOT NULL,
    region_id NVARCHAR(10) NOT NULL,
    chi_phi_van_chuyen DECIMAL(15,2) NOT NULL DEFAULT 0,
    thoi_gian_giao_du_kien INT NULL,
    mongo_region_config_id NVARCHAR(50) NULL,
    trang_thai BIT DEFAULT 1,
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (shipping_method_id) REFERENCES shipping_methods(id) ON DELETE CASCADE,
    FOREIGN KEY (region_id) REFERENCES regions(ma_vung),
    CONSTRAINT UQ_shipping_method_region UNIQUE (shipping_method_id, region_id),
    CHECK (chi_phi_van_chuyen >= 0),
    CHECK (thoi_gian_giao_du_kien IS NULL OR thoi_gian_giao_du_kien > 0)
);
GO

-- 11. BẢNG VOUCHER
CREATE TABLE vouchers (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ma_voucher NVARCHAR(50) UNIQUE NOT NULL,
    ten_voucher NVARCHAR(255) NOT NULL,
    mo_ta NVARCHAR(500),
    loai_giam_gia NVARCHAR(20) NOT NULL CHECK (loai_giam_gia IN (N'phantram', N'tiengiam', N'mienphi')),
    gia_tri_giam DECIMAL(15,2) NOT NULL,
    gia_tri_toi_da DECIMAL(15,2) NULL,
    don_hang_toi_thieu DECIMAL(15,2) DEFAULT 0,
    so_luong INT NOT NULL,
    da_su_dung INT DEFAULT 0,
    ngay_bat_dau DATETIME2 NOT NULL,
    ngay_ket_thuc DATETIME2 NOT NULL,
    mongo_voucher_detail_id NVARCHAR(50) NULL,
    nguoi_tao UNIQUEIDENTIFIER NOT NULL,
    pham_vi NVARCHAR(20) DEFAULT N'toan_cuc' CHECK (pham_vi IN (N'toan_cuc', N'theo_san_pham', N'theo_danh_muc')),
    loai_voucher NVARCHAR(50) NULL,
    trang_thai BIT DEFAULT 1,
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (nguoi_tao) REFERENCES users(id),
    CHECK (gia_tri_giam > 0),
    CHECK (don_hang_toi_thieu >= 0),
    CHECK (so_luong > 0),
    CHECK (da_su_dung >= 0 AND da_su_dung <= so_luong),
    CHECK (ngay_bat_dau < ngay_ket_thuc),
    CHECK ((loai_giam_gia = N'phantram' AND gia_tri_giam <= 100) OR loai_giam_gia != N'phantram')
);
GO

-- 12. BẢNG VOUCHER ÁP DỤNG CHO SẢN PHẨM
CREATE TABLE voucher_products (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    voucher_id UNIQUEIDENTIFIER NOT NULL,
    san_pham_id UNIQUEIDENTIFIER NOT NULL,
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE,
    FOREIGN KEY (san_pham_id) REFERENCES products(id),
    CONSTRAINT UQ_voucher_products_voucher_sanpham UNIQUE (voucher_id, san_pham_id)
);
GO

-- 13. BẢNG FLASH SALE
CREATE TABLE flash_sales (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ten_flash_sale NVARCHAR(255) NOT NULL,
    mo_ta NVARCHAR(500),
    ngay_bat_dau DATETIME2 NOT NULL,
    ngay_ket_thuc DATETIME2 NOT NULL,
    mongo_flash_sale_detail_id NVARCHAR(50) NULL,
    trang_thai NVARCHAR(20) DEFAULT N'cho' CHECK (trang_thai IN (N'cho', N'dang_dien_ra', N'da_ket_thuc', N'huy')),
    nguoi_tao UNIQUEIDENTIFIER NOT NULL,
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (nguoi_tao) REFERENCES users(id),
    CHECK (ngay_bat_dau < ngay_ket_thuc)
);
GO

-- 14. BẢNG SẢN PHẨM FLASH SALE
CREATE TABLE flash_sale_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    flash_sale_id UNIQUEIDENTIFIER NOT NULL,
    san_pham_id UNIQUEIDENTIFIER NOT NULL,
    gia_goc DECIMAL(15,2) NOT NULL,
    gia_flash_sale DECIMAL(15,2) NOT NULL,
    so_luong_ton INT NOT NULL,
    da_ban INT DEFAULT 0,
    gioi_han_mua INT NULL,
    thu_tu INT DEFAULT 0,
    trang_thai NVARCHAR(20) DEFAULT N'dang_ban' CHECK (trang_thai IN (N'dang_ban', N'het_hang', N'tam_dung')),
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (flash_sale_id) REFERENCES flash_sales(id) ON DELETE CASCADE,
    FOREIGN KEY (san_pham_id) REFERENCES products(id),
    CONSTRAINT UQ_flash_sale_items_flash_sale_san_pham UNIQUE (flash_sale_id, san_pham_id),
    CHECK (gia_flash_sale < gia_goc),
    CHECK (gia_flash_sale > 0),
    CHECK (so_luong_ton >= 0),
    CHECK (da_ban >= 0 AND da_ban <= so_luong_ton),
    CHECK (gioi_han_mua IS NULL OR gioi_han_mua > 0),
    CHECK (thu_tu >= 0)
);
GO

-- 15. BẢNG ĐƠN HÀNG
CREATE TABLE orders (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ma_don_hang NVARCHAR(50) UNIQUE NOT NULL,
    nguoi_dung_id UNIQUEIDENTIFIER NOT NULL,
    vung_don_hang NVARCHAR(10) NOT NULL DEFAULT N'bac' CHECK (vung_don_hang IN (N'bac', N'trung', N'nam')),
    shipping_method_region_id UNIQUEIDENTIFIER NOT NULL,
    dia_chi_giao_hang_id UNIQUEIDENTIFIER NOT NULL,
    kho_giao_hang UNIQUEIDENTIFIER NOT NULL,
    voucher_id UNIQUEIDENTIFIER NULL,
    tong_tien_hang DECIMAL(15,2) NOT NULL,
    phi_van_chuyen DECIMAL(15,2) DEFAULT 0,
    gia_tri_giam_voucher DECIMAL(15,2) DEFAULT 0,
    tong_thanh_toan DECIMAL(15,2) NOT NULL,
    mongo_order_detail_id NVARCHAR(50) NULL,
    trang_thai NVARCHAR(20) DEFAULT N'cho_xac_nhan' CHECK (trang_thai IN (N'cho_xac_nhan', N'dang_xu_ly', N'dang_giao', N'hoan_thanh', N'huy')),
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (nguoi_dung_id) REFERENCES users(id),
    FOREIGN KEY (vung_don_hang) REFERENCES regions(ma_vung),
    FOREIGN KEY (shipping_method_region_id) REFERENCES shipping_method_regions(id),
    FOREIGN KEY (dia_chi_giao_hang_id) REFERENCES shipping_addresses(id),
    FOREIGN KEY (kho_giao_hang) REFERENCES warehouses(id),
    FOREIGN KEY (voucher_id) REFERENCES vouchers(id),
    CHECK (tong_tien_hang >= 0),
    CHECK (phi_van_chuyen >= 0),
    CHECK (gia_tri_giam_voucher >= 0),
    CHECK (tong_thanh_toan >= 0),
    CHECK (tong_thanh_toan = tong_tien_hang + phi_van_chuyen - gia_tri_giam_voucher)
);
GO

-- 16. BẢNG CHI TIẾT ĐƠN HÀNG
CREATE TABLE order_details (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    don_hang_id UNIQUEIDENTIFIER NOT NULL,
    san_pham_id UNIQUEIDENTIFIER NOT NULL,
    flash_sale_item_id UNIQUEIDENTIFIER NULL,
    so_luong INT NOT NULL,
    don_gia DECIMAL(15,2) NOT NULL,
    thanh_tien DECIMAL(15,2) NOT NULL,
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (don_hang_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (san_pham_id) REFERENCES products(id),
    FOREIGN KEY (flash_sale_item_id) REFERENCES flash_sale_items(id),
    CHECK (so_luong > 0),
    CHECK (don_gia >= 0),
    CHECK (thanh_tien = so_luong * don_gia)
);
GO

-- 17. BẢNG GIỎ HÀNG
CREATE TABLE carts (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nguoi_dung_id UNIQUEIDENTIFIER NOT NULL,
    vung_id NVARCHAR(10) NOT NULL DEFAULT N'bac' CHECK (vung_id IN (N'bac', N'trung', N'nam')),
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (nguoi_dung_id) REFERENCES users(id),
    FOREIGN KEY (vung_id) REFERENCES regions(ma_vung)
);
GO

-- 18. BẢNG SẢN PHẨM TRONG GIỎ HÀNG
CREATE TABLE cart_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    gio_hang_id UNIQUEIDENTIFIER NOT NULL,
    san_pham_id UNIQUEIDENTIFIER NOT NULL,
    so_luong INT NOT NULL DEFAULT 1,
    ngay_them DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (gio_hang_id) REFERENCES carts(id) ON DELETE CASCADE,
    FOREIGN KEY (san_pham_id) REFERENCES products(id),
    CONSTRAINT UQ_cart_items_gio_hang_san_pham UNIQUE (gio_hang_id, san_pham_id),
    CHECK (so_luong > 0)
);
GO

-- 19. BẢNG ĐÁNH GIÁ
CREATE TABLE reviews (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    san_pham_id UNIQUEIDENTIFIER NOT NULL,
    nguoi_dung_id UNIQUEIDENTIFIER NOT NULL,
    don_hang_id UNIQUEIDENTIFIER NOT NULL,
    diem_danh_gia INT NOT NULL CHECK (diem_danh_gia BETWEEN 1 AND 5),
    tieu_de NVARCHAR(255),
    mongo_review_content_id NVARCHAR(50) NULL,
    trang_thai BIT DEFAULT 1,
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (san_pham_id) REFERENCES products(id),
    FOREIGN KEY (nguoi_dung_id) REFERENCES users(id),
    FOREIGN KEY (don_hang_id) REFERENCES orders(id)
);
GO

-- 20. BẢNG THANH TOÁN
CREATE TABLE payments (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    don_hang_id UNIQUEIDENTIFIER NOT NULL,
    phuong_thuc NVARCHAR(20) NOT NULL CHECK (phuong_thuc IN (N'cod', N'credit_card', N'momo', N'vnpay')),
    so_tien DECIMAL(15,2) NOT NULL,
    mongo_payment_detail_id NVARCHAR(50) NULL,
    trang_thai NVARCHAR(20) DEFAULT N'pending' CHECK (trang_thai IN (N'pending', N'success', N'failed', N'refunded')),
    ma_giao_dich NVARCHAR(100) NULL,
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (don_hang_id) REFERENCES orders(id),
    CHECK (so_tien > 0)
);
GO

-- 21. BẢNG VOUCHER ĐÃ SỬ DỤNG
CREATE TABLE used_vouchers (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    voucher_id UNIQUEIDENTIFIER NOT NULL,
    nguoi_dung_id UNIQUEIDENTIFIER NOT NULL,
    don_hang_id UNIQUEIDENTIFIER NOT NULL,
    gia_tri_giam DECIMAL(15,2) NOT NULL,
    ngay_su_dung DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (voucher_id) REFERENCES vouchers(id),
    FOREIGN KEY (nguoi_dung_id) REFERENCES users(id),
    FOREIGN KEY (don_hang_id) REFERENCES orders(id),
    CONSTRAINT UQ_used_vouchers_voucher_nguoidung UNIQUE (voucher_id, nguoi_dung_id),
    CHECK (gia_tri_giam > 0)
);
GO

-- 22. BẢNG LỊCH SỬ MUA FLASH SALE
CREATE TABLE flash_sale_orders (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    flash_sale_item_id UNIQUEIDENTIFIER NOT NULL,
    nguoi_dung_id UNIQUEIDENTIFIER NOT NULL,
    don_hang_id UNIQUEIDENTIFIER NOT NULL,
    so_luong INT NOT NULL,
    gia_flash_sale DECIMAL(15,2) NOT NULL,
    ngay_mua DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (flash_sale_item_id) REFERENCES flash_sale_items(id),
    FOREIGN KEY (nguoi_dung_id) REFERENCES users(id),
    FOREIGN KEY (don_hang_id) REFERENCES orders(id),
    CHECK (so_luong > 0),
    CHECK (gia_flash_sale > 0)
);
GO

-- 23. BẢNG MÃ OTP
CREATE TABLE otp_codes (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255) NOT NULL,
    ma_otp NVARCHAR(10) NOT NULL,
    loai_otp NVARCHAR(20) DEFAULT N'register' CHECK (loai_otp IN (N'register', N'forgot_password', N'verify_email')),
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    ngay_het_han DATETIME2 NOT NULL,
    da_su_dung BIT DEFAULT 0,
    CHECK (ngay_het_han > ngay_tao)
);
GO

-- 24. BẢNG THEO DÕI TRẠNG THÁI ĐƠN HÀNG
CREATE TABLE order_status_history (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    don_hang_id UNIQUEIDENTIFIER NOT NULL,
    trang_thai_cu NVARCHAR(20),
    trang_thai_moi NVARCHAR(20) NOT NULL,
    ghi_chu NVARCHAR(500),
    nguoi_thao_tac UNIQUEIDENTIFIER NULL,
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (don_hang_id) REFERENCES orders(id),
    FOREIGN KEY (nguoi_thao_tac) REFERENCES users(id)
);
GO

-- TẠO INDEX SAU KHI TẠO XONG TẤT CẢ BẢNG

-- Index cho bảng products
CREATE INDEX IX_products_danh_muc_id ON products(danh_muc_id);
CREATE INDEX IX_products_thuong_hieu_id ON products(thuong_hieu_id);
CREATE INDEX IX_products_gia_ban ON products(gia_ban);
CREATE INDEX IX_products_ten_san_pham ON products(ten_san_pham);
CREATE INDEX IX_products_trang_thai ON products(trang_thai);
CREATE INDEX IX_products_ngay_tao ON products(ngay_tao);

-- Index cho bảng users
CREATE INDEX IX_users_email ON users(email);
CREATE INDEX IX_users_vung_id ON users(vung_id);
CREATE INDEX IX_users_trang_thai ON users(trang_thai);

-- Index cho bảng inventory
CREATE INDEX IX_inventory_san_pham_id ON inventory(san_pham_id);
CREATE INDEX IX_inventory_kho_id ON inventory(kho_id);
CREATE INDEX IX_inventory_so_luong_kha_dung ON inventory(so_luong_kha_dung);

-- Index cho bảng orders
CREATE INDEX IX_orders_nguoi_dung_id ON orders(nguoi_dung_id);
CREATE INDEX IX_orders_trang_thai ON orders(trang_thai);
CREATE INDEX IX_orders_ngay_tao ON orders(ngay_tao);
CREATE INDEX IX_orders_ma_don_hang ON orders(ma_don_hang);
CREATE INDEX IX_orders_vung_don_hang ON orders(vung_don_hang);

-- Index cho bảng order_details
CREATE INDEX IX_order_details_don_hang_id ON order_details(don_hang_id);
CREATE INDEX IX_order_details_san_pham_id ON order_details(san_pham_id);

-- Index cho bảng vouchers
CREATE INDEX IX_vouchers_ma_voucher ON vouchers(ma_voucher);
CREATE INDEX IX_vouchers_ngay_ket_thuc ON vouchers(ngay_ket_thuc);
CREATE INDEX IX_vouchers_trang_thai ON vouchers(trang_thai);
CREATE INDEX IX_vouchers_loai_voucher ON vouchers(loai_voucher);

-- Index cho bảng flash_sales
CREATE INDEX IX_flash_sales_ngay_bat_dau ON flash_sales(ngay_bat_dau);
CREATE INDEX IX_flash_sales_ngay_ket_thuc ON flash_sales(ngay_ket_thuc);
CREATE INDEX IX_flash_sales_trang_thai ON flash_sales(trang_thai);

-- Index cho bảng flash_sale_items
CREATE INDEX IX_flash_sale_items_san_pham_id ON flash_sale_items(san_pham_id);
CREATE INDEX IX_flash_sale_items_trang_thai ON flash_sale_items(trang_thai);

-- Index cho bảng payments
CREATE INDEX IX_payments_don_hang_id ON payments(don_hang_id);
CREATE INDEX IX_payments_trang_thai ON payments(trang_thai);
CREATE INDEX IX_payments_ma_giao_dich ON payments(ma_giao_dich);

-- Index cho bảng cart_items
CREATE INDEX IX_cart_items_san_pham_id ON cart_items(san_pham_id);

-- Index cho bảng reviews
CREATE INDEX IX_reviews_san_pham_id ON reviews(san_pham_id);
CREATE INDEX IX_reviews_nguoi_dung_id ON reviews(nguoi_dung_id);
CREATE INDEX IX_reviews_diem_danh_gia ON reviews(diem_danh_gia);

-- Index cho bảng order_status_history
CREATE INDEX IX_order_status_history_don_hang_id ON order_status_history(don_hang_id);
CREATE INDEX IX_order_status_history_ngay_tao ON order_status_history(ngay_tao);

-- Index cho bảng otp_codes
CREATE INDEX IX_otp_codes_email ON otp_codes(email);
CREATE INDEX IX_otp_codes_ngay_het_han ON otp_codes(ngay_het_han);
CREATE INDEX IX_otp_codes_da_su_dung ON otp_codes(da_su_dung);
GO

-- Chèn dữ liệu vào bảng brands
INSERT INTO brands (ten_thuong_hieu, mo_ta, logo_url, slug) VALUES
(N'Apple', N'Thương hiệu điện thoại cao cấp đến từ Mỹ', '/images/logo/apple.png', 'apple'),
(N'Samsung', N'Thương hiệu điện thoại Hàn Quốc đa dạng phân khúc', '/images/logo/samsung.png', 'samsung'),
(N'Xiaomi', N'Thương hiệu điện thoại Trung Quốc giá tốt', '/images/logo/xiaomi.png', 'xiaomi'),
(N'OPPO', N'Thương hiệu điện thoại chụp ảnh đẹp', '/images/logo/oppo.png', 'oppo'),
(N'Nokia', N'Thương hiệu điện thoại bền bỉ', '/images/logo/nokia.png', 'nokia');
GO

-- Chèn dữ liệu vào bảng categories
INSERT INTO categories (ten_danh_muc, danh_muc_cha_id, mo_ta, slug, thu_tu) VALUES
(N'Điện thoại', NULL, N'Các dòng điện thoại smartphone', 'dien-thoai', 1),
(N'Máy tính bảng', NULL, N'Tablet và máy tính bảng', 'may-tinh-bang', 2),
(N'iPhone', (SELECT id FROM categories WHERE ten_danh_muc = N'Điện thoại'), N'Điện thoại iPhone', 'iphone', 1),
(N'Samsung', (SELECT id FROM categories WHERE ten_danh_muc = N'Điện thoại'), N'Điện thoại Samsung', 'samsung', 2),
(N'Xiaomi', (SELECT id FROM categories WHERE ten_danh_muc = N'Điện thoại'), N'Điện thoại Xiaomi', 'xiaomi', 3);
GO

-- Chèn dữ liệu vào bảng products
INSERT INTO products (ma_sku, ten_san_pham, danh_muc_id, thuong_hieu_id, gia_niem_yet, gia_ban, mongo_detail_id, so_luong_ban, luot_xem) VALUES
('IP15PM256', N'iPhone 15 Pro Max 256GB', 
 (SELECT id FROM categories WHERE ten_danh_muc = N'iPhone'),
 (SELECT id FROM brands WHERE ten_thuong_hieu = N'Apple'),
 32990000, 29990000, '667a8b1e5f4d3c2a1b9c8d7e', 150, 1200),

('SSS23U512', N'Samsung Galaxy S23 Ultra 512GB',
 (SELECT id FROM categories WHERE ten_danh_muc = N'Samsung'),
 (SELECT id FROM brands WHERE ten_thuong_hieu = N'Samsung'),
 24990000, 21990000, '667a8b1e5f4d3c2a1b9c8d7f', 89, 800),

('XM13T256', N'Xiaomi 13T 256GB',
 (SELECT id FROM categories WHERE ten_danh_muc = N'Xiaomi'),
 (SELECT id FROM brands WHERE ten_thuong_hieu = N'Xiaomi'),
 12990000, 10990000, '667a8b1e5f4d3c2a1b9c8d80', 45, 600),

('OPRENO10', N'OPPO Reno10 5G',
 (SELECT id FROM categories WHERE ten_danh_muc = N'Điện thoại'),
 (SELECT id FROM brands WHERE ten_thuong_hieu = N'OPPO'),
 8990000, 7990000, '667a8b1e5f4d3c2a1b9c8d81', 67, 450),

('IP14128', N'iPhone 14 128GB',
 (SELECT id FROM categories WHERE ten_danh_muc = N'iPhone'),
 (SELECT id FROM brands WHERE ten_thuong_hieu = N'Apple'),
 19990000, 17990000, '667a8b1e5f4d3c2a1b9c8d82', 120, 1500);
 


-- Thêm 5 sản phẩm mới vào bảng products
INSERT INTO products (ma_sku, ten_san_pham, danh_muc_id, thuong_hieu_id, gia_niem_yet, gia_ban, mongo_detail_id, so_luong_ban, luot_xem) VALUES
('NKG22', N'Nokia G22',
 (SELECT id FROM categories WHERE ten_danh_muc = N'Điện thoại'),
 (SELECT id FROM brands WHERE ten_thuong_hieu = N'Nokia'),
 4990000, 4290000, '667a8b1e5f4d3c2a1b9c8d83', 23, 180),

('SSA54', N'Samsung Galaxy A54',
 (SELECT id FROM categories WHERE ten_danh_muc = N'Samsung'),
 (SELECT id FROM brands WHERE ten_thuong_hieu = N'Samsung'),
 8990000, 7990000, '667a8b1e5f4d3c2a1b9c8d84', 56, 420),

('XMPOCOX5', N'Xiaomi Poco X5 Pro',
 (SELECT id FROM categories WHERE ten_danh_muc = N'Xiaomi'),
 (SELECT id FROM brands WHERE ten_thuong_hieu = N'Xiaomi'),
 7490000, 6490000, '667a8b1e5f4d3c2a1b9c8d85', 34, 380),

('OPA78', N'OPPO A78 5G',
 (SELECT id FROM categories WHERE ten_danh_muc = N'Điện thoại'),
 (SELECT id FROM brands WHERE ten_thuong_hieu = N'OPPO'),
 6290000, 5490000, '667a8b1e5f4d3c2a1b9c8d86', 41, 290),

('SSZFLIP4', N'Samsung Galaxy Z Flip4',
 (SELECT id FROM categories WHERE ten_danh_muc = N'Samsung'),
 (SELECT id FROM brands WHERE ten_thuong_hieu = N'Samsung'),
 19990000, 17990000, '667a8b1e5f4d3c2a1b9c8d87', 15, 650);
GO