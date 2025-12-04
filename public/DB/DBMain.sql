-- XÓA DATABASE CŨ VÀ TẠO MỚI
USE master;
GO

-- Ngắt kết nối tất cả các session đang sử dụng DB
ALTER DATABASE DB_WEBPHONES SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
GO

-- Xóa database
DROP DATABASE IF EXISTS DB_WEBPHONES;
GO

-- Tạo database mới
CREATE DATABASE DB_WEBPHONES;
GO

USE DB_WEBPHONES;
GO

-- 1. BẢNG VÙNG MIỀN
CREATE TABLE regions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ma_vung NVARCHAR(10) UNIQUE NOT NULL CHECK (ma_vung IN (N'bac', N'trung', N'nam')),
    ten_vung NVARCHAR(50) NOT NULL,
    mo_ta NVARCHAR(500),
    trang_thai BIT DEFAULT 1,
    ngay_tao DATETIME2 DEFAULT GETDATE()
);
GO

-- Bảng tỉnh/thành phố
CREATE TABLE provinces (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ma_tinh NVARCHAR(10) UNIQUE NOT NULL,
    ten_tinh NVARCHAR(100) NOT NULL,
    vung_id NVARCHAR(10) NOT NULL,
    is_major_city BIT DEFAULT 0, -- TP lớn: HN, HCM, DN, HP, CT
    thu_tu_uu_tien INT DEFAULT 0, -- Sắp xếp hiển thị
    trang_thai BIT DEFAULT 1,
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (vung_id) REFERENCES regions(ma_vung)
);
GO

CREATE TABLE wards (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ma_phuong_xa NVARCHAR(20) UNIQUE NOT NULL,
    ten_phuong_xa NVARCHAR(150) NOT NULL,
    tinh_thanh_id UNIQUEIDENTIFIER NOT NULL,
    loai NVARCHAR(20) DEFAULT N'xa' CHECK (loai IN (N'phuong', N'xa', N'thi_tran')),
    is_inner_area BIT DEFAULT 0, -- Khu vực trung tâm (để tính phí ship)
    trang_thai BIT DEFAULT 1,
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (tinh_thanh_id) REFERENCES provinces(id) ON DELETE CASCADE
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
    link_anh VARCHAR(500),
    FOREIGN KEY (danh_muc_id) REFERENCES categories(id),
    FOREIGN KEY (thuong_hieu_id) REFERENCES brands(id),
    CHECK (gia_ban > 0),
    CHECK (gia_niem_yet >= gia_ban),
    CHECK (luot_xem >= 0),
    CHECK (so_luong_ban >= 0)
);
GO

-- 5. BẢNG NGƯỜI DÙNG (Bao gồm cả khách hàng và nhân viên)
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

-- ========== BẢNG ĐỊA CHỈ NGƯỜI DÙNG ==========
-- 1 user có thể có nhiều địa chỉ (nhà riêng, công ty, giao hàng...)
CREATE TABLE user_addresses (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    loai_dia_chi NVARCHAR(20) CHECK(loai_dia_chi IN (N'nha_rieng', N'cong_ty', N'giao_hang')) DEFAULT N'nha_rieng',
    is_default BIT DEFAULT 0, -- Địa chỉ mặc định
    
    -- Thông tin người nhận
    ten_nguoi_nhan NVARCHAR(100) NOT NULL,
    sdt_nguoi_nhan VARCHAR(15) NOT NULL,
    
    -- Địa chỉ hành chính (liên kết với bảng wards)
    phuong_xa_id UNIQUEIDENTIFIER NOT NULL,
    dia_chi_cu_the NVARCHAR(200) NOT NULL, -- Số nhà, tên đường, tòa nhà...
    
    -- Ghi chú bổ sung
    ghi_chu NVARCHAR(500),
    
    -- Metadata
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME2 DEFAULT GETDATE(),
    trang_thai BIT DEFAULT 1,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (phuong_xa_id) REFERENCES wards(id)
);
GO

-- Index để tăng tốc truy vấn
CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_default ON user_addresses(user_id, is_default) WHERE is_default = 1;
CREATE INDEX idx_user_addresses_phuong_xa ON user_addresses(phuong_xa_id);
GO

-- Trigger để đảm bảo chỉ 1 địa chỉ mặc định
CREATE TRIGGER trg_user_addresses_default
ON user_addresses
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Nếu có địa chỉ mới được set làm mặc định
    IF EXISTS (SELECT 1 FROM inserted WHERE is_default = 1)
    BEGIN
        -- Bỏ mặc định của tất cả địa chỉ khác của user đó
        UPDATE user_addresses
        SET is_default = 0
        WHERE user_id IN (SELECT user_id FROM inserted WHERE is_default = 1)
          AND id NOT IN (SELECT id FROM inserted WHERE is_default = 1)
          AND is_default = 1;
    END
END;
GO

-- 6. BẢNG KHO HÀNG
CREATE TABLE warehouses (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ten_kho NVARCHAR(100) NOT NULL,
    phuong_xa_id UNIQUEIDENTIFIER NOT NULL,
    dia_chi_chi_tiet NVARCHAR(255) NOT NULL,
    so_dien_thoai NVARCHAR(20),
    trang_thai BIT DEFAULT 1,
    ngay_tao DATETIME2 DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (phuong_xa_id) REFERENCES wards(id)
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

-- 8. BẢNG PHƯƠNG THỨC VẬN CHUYỂN
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

-- 9. BẢNG PHƯƠNG THỨC VẬN CHUYỂN THEO VÙNG
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

-- 10. BẢNG VOUCHER
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

-- 11. BẢNG VOUCHER ÁP DỤNG CHO SẢN PHẨM
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

-- 12. BẢNG FLASH SALE
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

-- 13. BẢNG SẢN PHẨM FLASH SALE
CREATE TABLE flash_sale_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    flash_sale_id UNIQUEIDENTIFIER NOT NULL,
    san_pham_id UNIQUEIDENTIFIER NOT NULL,  -- Lưu variant_id từ MongoDB (mọi sản phẩm đều có variant)
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
    -- Mỗi flash sale chỉ có duy nhất 1 variant (không duplicate)
    CONSTRAINT UQ_flash_sale_variant UNIQUE (flash_sale_id, san_pham_id),
    CHECK (gia_flash_sale < gia_goc),
    CHECK (gia_flash_sale > 0),
    CHECK (so_luong_ton >= 0),
    CHECK (da_ban >= 0 AND da_ban <= so_luong_ton),
    CHECK (gioi_han_mua IS NULL OR gioi_han_mua > 0),
    CHECK (thu_tu >= 0)
);
GO

-- 14. BẢNG ĐƠN HÀNG
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
    FOREIGN KEY (dia_chi_giao_hang_id) REFERENCES user_addresses(id),
    FOREIGN KEY (kho_giao_hang) REFERENCES warehouses(id),
    FOREIGN KEY (voucher_id) REFERENCES vouchers(id),
    CHECK (tong_tien_hang >= 0),
    CHECK (phi_van_chuyen >= 0),
    CHECK (gia_tri_giam_voucher >= 0),
    CHECK (tong_thanh_toan >= 0),
    CHECK (tong_thanh_toan = tong_tien_hang + phi_van_chuyen - gia_tri_giam_voucher)
);
GO

-- 15. BẢNG CHI TIẾT ĐƠN HÀNG
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

-- 16. BẢNG GIỎ HÀNG
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

-- 17. BẢNG SẢN PHẨM TRONG GIỎ HÀNG
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

-- 18. BẢNG ĐÁNH GIÁ
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

-- 19. BẢNG THANH TOÁN
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

-- 20. BẢNG VOUCHER ĐÃ SỬ DỤNG
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

-- 21. BẢNG LỊCH SỬ MUA FLASH SALE
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

-- 22. BẢNG MÃ OTP
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

-- 23. BẢNG THEO DÕI TRẠNG THÁI ĐƠN HÀNG
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

-- Index cho bảng regions
CREATE INDEX IX_regions_ma_vung ON regions(ma_vung);
CREATE INDEX IX_regions_trang_thai ON regions(trang_thai);

-- Index cho bảng provinces
CREATE INDEX IX_provinces_vung_id ON provinces(vung_id);
CREATE INDEX IX_provinces_trang_thai ON provinces(trang_thai);
CREATE INDEX IX_provinces_is_major_city ON provinces(is_major_city);

-- Index cho bảng wards
CREATE INDEX IX_wards_tinh_thanh_id ON wards(tinh_thanh_id);
CREATE INDEX IX_wards_loai ON wards(loai);
CREATE INDEX IX_wards_is_inner_area ON wards(is_inner_area);
CREATE INDEX IX_wards_trang_thai ON wards(trang_thai);

-- Index cho bảng warehouses
CREATE INDEX IX_warehouses_phuong_xa_id ON warehouses(phuong_xa_id);
CREATE INDEX IX_warehouses_trang_thai ON warehouses(trang_thai);

-- Index cho bảng categories
CREATE INDEX IX_categories_danh_muc_cha_id ON categories(danh_muc_cha_id);
CREATE INDEX IX_categories_trang_thai ON categories(trang_thai);
CREATE INDEX IX_categories_slug ON categories(slug);

-- Index cho bảng brands
CREATE INDEX IX_brands_slug ON brands(slug);
CREATE INDEX IX_brands_trang_thai ON brands(trang_thai);

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
CREATE INDEX IX_users_vai_tro ON users(vai_tro);
CREATE INDEX IX_users_ma_nhan_vien ON users(ma_nhan_vien) WHERE ma_nhan_vien IS NOT NULL;

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


-- Chèn dữ liệu vùng miền
INSERT INTO regions (ma_vung, ten_vung, mo_ta, trang_thai) VALUES
(N'bac', N'Miền Bắc', N'Bao gồm các tỉnh phía Bắc sông Gianh, trung tâm là Hà Nội và Hải Phòng', 1),
(N'trung', N'Miền Trung', N'Từ Thanh Hóa đến Bình Thuận, trung tâm là Đà Nẵng', 1),
(N'nam', N'Miền Nam', N'Từ Đồng Nai trở vào, trung tâm là TP Hồ Chí Minh và Cần Thơ', 1);
GO


-- Chèn dữ liệu tỉnh/thành phố (5 tỉnh đông dân nhất mỗi vùng)
INSERT INTO provinces (ma_tinh, ten_tinh, vung_id, is_major_city, thu_tu_uu_tien) VALUES
-- MIỀN BẮC (5 tỉnh đông dân nhất)
('HN', N'Hà Nội', 'bac', 1, 1),
('HP', N'Hải Phòng', 'bac', 1, 2),
('BN', N'Bắc Ninh', 'bac', 0, 3),
('HD', N'Hải Dương', 'bac', 0, 4),
('VPC', N'Vĩnh Phúc', 'bac', 0, 5),

-- MIỀN TRUNG (5 tỉnh đông dân nhất)
('DN', N'Đà Nẵng', 'trung', 1, 6),
('TH', N'Thanh Hóa', 'trung', 0, 7),
('NA', N'Nghệ An', 'trung', 0, 8),
('HT', N'Hà Tĩnh', 'trung', 0, 9),
('QNa', N'Quảng Nam', 'trung', 0, 10),

-- MIỀN NAM (5 tỉnh đông dân nhất)
('HCM', N'TP Hồ Chí Minh', 'nam', 1, 11),
('BD', N'Bình Dương', 'nam', 0, 12),
('DNA', N'Đồng Nai', 'nam', 0, 13),
('CT', N'Cần Thơ', 'nam', 1, 14),
('BRVT', N'Bà Rịa - Vũng Tàu', 'nam', 0, 15);
GO

-- ========== BƯỚC 4: CHÈN DỮ LIỆU PHƯỜNG/XÃ CHO 15 TỈNH THÀNH ==========

-- ===== MIỀN BẮC =====

-- HÀ NỘI (12 quận nội thành + 17 huyện ngoại thành = 584 phường/xã, chọn 30 đại diện)
DECLARE @HanoiId UNIQUEIDENTIFIER = (SELECT id FROM provinces WHERE ma_tinh = 'HN');

INSERT INTO wards (ma_phuong_xa, ten_phuong_xa, tinh_thanh_id, loai, is_inner_area) VALUES
-- Quận Ba Đình
('HN-BD-01', N'Phường Phúc Xá', @HanoiId, N'phuong', 1),
('HN-BD-02', N'Phường Trúc Bạch', @HanoiId, N'phuong', 1),
('HN-BD-03', N'Phường Điện Biên', @HanoiId, N'phuong', 1),
('HN-BD-04', N'Phường Quán Thánh', @HanoiId, N'phuong', 1),
-- Quận Hoàn Kiếm
('HN-HK-01', N'Phường Hàng Bạc', @HanoiId, N'phuong', 1),
('HN-HK-02', N'Phường Hàng Bài', @HanoiId, N'phuong', 1),
('HN-HK-03', N'Phường Hàng Trống', @HanoiId, N'phuong', 1),
('HN-HK-04', N'Phường Lý Thái Tổ', @HanoiId, N'phuong', 1),
-- Quận Đống Đa
('HN-DD-01', N'Phường Khương Thượng', @HanoiId, N'phuong', 1),
('HN-DD-02', N'Phường Ô Chợ Dừa', @HanoiId, N'phuong', 1),
('HN-DD-03', N'Phường Láng Hạ', @HanoiId, N'phuong', 1),
-- Quận Cầu Giấy
('HN-CG-01', N'Phường Nghĩa Đô', @HanoiId, N'phuong', 1),
('HN-CG-02', N'Phường Dịch Vọng', @HanoiId, N'phuong', 1),
('HN-CG-03', N'Phường Trung Hòa', @HanoiId, N'phuong', 1),
-- Quận Hai Bà Trưng
('HN-HBT-01', N'Phường Thanh Lương', @HanoiId, N'phuong', 1),
('HN-HBT-02', N'Phường Bạch Đằng', @HanoiId, N'phuong', 1),
-- Quận Thanh Xuân
('HN-TX-01', N'Phường Nhân Chính', @HanoiId, N'phuong', 1),
('HN-TX-02', N'Phường Khương Trung', @HanoiId, N'phuong', 1),
-- Huyện Đông Anh (ngoại thành)
('HN-DA-01', N'Xã Xuân Nộn', @HanoiId, N'xa', 0),
('HN-DA-02', N'Xã Đại Mạch', @HanoiId, N'xa', 0),
-- Huyện Gia Lâm (ngoại thành)
('HN-GL-01', N'Xã Yên Viên', @HanoiId, N'xa', 0),
('HN-GL-02', N'Xã Yên Thường', @HanoiId, N'xa', 0);
GO

-- HẢI PHÒNG (15 quận/huyện = 235 phường/xã, chọn 20 đại diện)
DECLARE @HaiPhongId UNIQUEIDENTIFIER = (SELECT id FROM provinces WHERE ma_tinh = 'HP');

INSERT INTO wards (ma_phuong_xa, ten_phuong_xa, tinh_thanh_id, loai, is_inner_area) VALUES
-- Quận Hồng Bàng
('HP-HB-01', N'Phường Quán Toan', @HaiPhongId, N'phuong', 1),
('HP-HB-02', N'Phường Hùng Vương', @HaiPhongId, N'phuong', 1),
('HP-HB-03', N'Phường Sở Dầu', @HaiPhongId, N'phuong', 1),
-- Quận Lê Chân
('HP-LC-01', N'Phường Cát Dài', @HaiPhongId, N'phuong', 1),
('HP-LC-02', N'Phường An Biên', @HaiPhongId, N'phuong', 1),
('HP-LC-03', N'Phường Lam Sơn', @HaiPhongId, N'phuong', 1),
-- Quận Ngô Quyền
('HP-NQ-01', N'Phường Máy Chai', @HaiPhongId, N'phuong', 1),
('HP-NQ-02', N'Phường Cầu Đất', @HaiPhongId, N'phuong', 1),
-- Quận Hải An
('HP-HA-01', N'Phường Đông Hải 1', @HaiPhongId, N'phuong', 1),
('HP-HA-02', N'Phường Đông Hải 2', @HaiPhongId, N'phuong', 1),
-- Huyện An Dương (ngoại thành)
('HP-AD-01', N'Xã An Hòa', @HaiPhongId, N'xa', 0),
('HP-AD-02', N'Xã An Hưng', @HaiPhongId, N'xa', 0);
GO

-- BẮC NINH (8 huyện/thành = 228 phường/xã, chọn 15 đại diện)
DECLARE @BacNinhId UNIQUEIDENTIFIER = (SELECT id FROM provinces WHERE ma_tinh = 'BN');

INSERT INTO wards (ma_phuong_xa, ten_phuong_xa, tinh_thanh_id, loai, is_inner_area) VALUES
-- Thành phố Bắc Ninh
('BN-TP-01', N'Phường Suối Hoa', @BacNinhId, N'phuong', 1),
('BN-TP-02', N'Phường Vũ Ninh', @BacNinhId, N'phuong', 1),
('BN-TP-03', N'Phường Đáp Cầu', @BacNinhId, N'phuong', 1),
('BN-TP-04', N'Phường Võ Cường', @BacNinhId, N'phuong', 1),
-- Huyện Từ Sơn
('BN-TS-01', N'Thị trấn Từ Sơn', @BacNinhId, N'thi_tran', 1),
('BN-TS-02', N'Xã Phù Khê', @BacNinhId, N'xa', 0),
-- Huyện Thuận Thành
('BN-TT-01', N'Xã Phương Liễu', @BacNinhId, N'xa', 0),
('BN-TT-02', N'Xã Minh Tân', @BacNinhId, N'xa', 0);
GO

-- HẢI DƯƠNG (12 huyện/thành = 281 phường/xã, chọn 15 đại diện)
DECLARE @HaiDuongId UNIQUEIDENTIFIER = (SELECT id FROM provinces WHERE ma_tinh = 'HD');

INSERT INTO wards (ma_phuong_xa, ten_phuong_xa, tinh_thanh_id, loai, is_inner_area) VALUES
-- Thành phố Hải Dương
('HD-TP-01', N'Phường Nguyễn Trãi', @HaiDuongId, N'phuong', 1),
('HD-TP-02', N'Phường Phan Bội Châu', @HaiDuongId, N'phuong', 1),
('HD-TP-03', N'Phường Quang Trung', @HaiDuongId, N'phuong', 1),
('HD-TP-04', N'Phường Ngọc Châu', @HaiDuongId, N'phuong', 1),
-- Thành phố Chí Linh
('HD-CL-01', N'Phường Sao Đỏ', @HaiDuongId, N'phuong', 1),
('HD-CL-02', N'Phường Cộng Hòa', @HaiDuongId, N'phuong', 1),
-- Huyện Gia Lộc
('HD-GL-01', N'Xã Thống Nhất', @HaiDuongId, N'xa', 0),
('HD-GL-02', N'Xã Yết Kiêu', @HaiDuongId, N'xa', 0);
GO

-- VĨNH PHÚC (9 huyện/thành = 159 phường/xã, chọn 12 đại diện)
DECLARE @VinhPhucId UNIQUEIDENTIFIER = (SELECT id FROM provinces WHERE ma_tinh = 'VPC');

INSERT INTO wards (ma_phuong_xa, ten_phuong_xa, tinh_thanh_id, loai, is_inner_area) VALUES
-- Thành phố Vĩnh Yên
('VPC-VY-01', N'Phường Khai Quang', @VinhPhucId, N'phuong', 1),
('VPC-VY-02', N'Phường Liên Bảo', @VinhPhucId, N'phuong', 1),
('VPC-VY-03', N'Phường Đồng Tâm', @VinhPhucId, N'phuong', 1),
-- Thành phố Phúc Yên
('VPC-PY-01', N'Phường Trưng Trắc', @VinhPhucId, N'phuong', 1),
('VPC-PY-02', N'Phường Hùng Vương', @VinhPhucId, N'phuong', 1),
-- Huyện Bình Xuyên
('VPC-BX-01', N'Xã Sơn Lôi', @VinhPhucId, N'xa', 0),
('VPC-BX-02', N'Xã Thiện Kế', @VinhPhucId, N'xa', 0);
GO

-- ===== MIỀN TRUNG =====

-- ĐÀ NẴNG (8 quận/huyện = 56 phường/xã, chọn tất cả phường trung tâm)
DECLARE @DaNangId UNIQUEIDENTIFIER = (SELECT id FROM provinces WHERE ma_tinh = 'DN');

INSERT INTO wards (ma_phuong_xa, ten_phuong_xa, tinh_thanh_id, loai, is_inner_area) VALUES
-- Quận Hải Châu
('DN-HC-01', N'Phường Thạch Thang', @DaNangId, N'phuong', 1),
('DN-HC-02', N'Phường Hải Châu I', @DaNangId, N'phuong', 1),
('DN-HC-03', N'Phường Hải Châu II', @DaNangId, N'phuong', 1),
('DN-HC-04', N'Phường Thuận Phước', @DaNangId, N'phuong', 1),
-- Quận Thanh Khê
('DN-TK-01', N'Phường Thanh Khê Tây', @DaNangId, N'phuong', 1),
('DN-TK-02', N'Phường Thanh Khê Đông', @DaNangId, N'phuong', 1),
('DN-TK-03', N'Phường Tân Chính', @DaNangId, N'phuong', 1),
-- Quận Sơn Trà
('DN-ST-01', N'Phường Thọ Quang', @DaNangId, N'phuong', 1),
('DN-ST-02', N'Phường Nại Hiên Đông', @DaNangId, N'phuong', 1),
('DN-ST-03', N'Phường Mân Thái', @DaNangId, N'phuong', 1),
-- Quận Cẩm Lệ
('DN-CL-01', N'Phường Khuê Trung', @DaNangId, N'phuong', 1),
('DN-CL-02', N'Phường Hòa Phát', @DaNangId, N'phuong', 1),
-- Huyện Hòa Vang
('DN-HV-01', N'Xã Hòa Liên', @DaNangId, N'xa', 0),
('DN-HV-02', N'Xã Hòa Ninh', @DaNangId, N'xa', 0);
GO

-- THANH HÓA (27 huyện/thành = 616 phường/xã, chọn 20 đại diện)
DECLARE @ThanhHoaId UNIQUEIDENTIFIER = (SELECT id FROM provinces WHERE ma_tinh = 'TH');

INSERT INTO wards (ma_phuong_xa, ten_phuong_xa, tinh_thanh_id, loai, is_inner_area) VALUES
-- Thành phố Thanh Hóa
('TH-TP-01', N'Phường Đông Thọ', @ThanhHoaId, N'phuong', 1),
('TH-TP-02', N'Phường Nam Ngạn', @ThanhHoaId, N'phuong', 1),
('TH-TP-03', N'Phường Trường Thi', @ThanhHoaId, N'phuong', 1),
('TH-TP-04', N'Phường Điện Biên', @ThanhHoaId, N'phuong', 1),
-- Thành phố Sầm Sơn
('TH-SS-01', N'Phường Trường Sơn', @ThanhHoaId, N'phuong', 1),
('TH-SS-02', N'Phường Quảng Cư', @ThanhHoaId, N'phuong', 1),
-- Huyện Đông Sơn
('TH-DS-01', N'Xã Đông Hoàng', @ThanhHoaId, N'xa', 0),
('TH-DS-02', N'Xã Đông Ninh', @ThanhHoaId, N'xa', 0);
GO

-- NGHỆ AN (21 huyện/thành = 460 phường/xã, chọn 20 đại diện)
DECLARE @NgheAnId UNIQUEIDENTIFIER = (SELECT id FROM provinces WHERE ma_tinh = 'NA');

INSERT INTO wards (ma_phuong_xa, ten_phuong_xa, tinh_thanh_id, loai, is_inner_area) VALUES
-- Thành phố Vinh
('NA-V-01', N'Phường Hà Huy Tập', @NgheAnId, N'phuong', 1),
('NA-V-02', N'Phường Lê Lợi', @NgheAnId, N'phuong', 1),
('NA-V-03', N'Phường Quang Trung', @NgheAnId, N'phuong', 1),
('NA-V-04', N'Phường Đội Cung', @NgheAnId, N'phuong', 1),
-- Thị xã Cửa Lò
('NA-CL-01', N'Phường Nghi Thuỷ', @NgheAnId, N'phuong', 1),
('NA-CL-02', N'Phường Nghi Hòa', @NgheAnId, N'phuong', 1),
-- Huyện Nghi Lộc
('NA-NL-01', N'Xã Nghi Kiều', @NgheAnId, N'xa', 0),
('NA-NL-02', N'Xã Nghi Đồng', @NgheAnId, N'xa', 0);
GO

-- HÀ TĨNH (13 huyện/thành = 240 phường/xã, chọn 15 đại diện)
DECLARE @HaTinhId UNIQUEIDENTIFIER = (SELECT id FROM provinces WHERE ma_tinh = 'HT');

INSERT INTO wards (ma_phuong_xa, ten_phuong_xa, tinh_thanh_id, loai, is_inner_area) VALUES
-- Thành phố Hà Tĩnh
('HT-TP-01', N'Phường Trần Phú', @HaTinhId, N'phuong', 1),
('HT-TP-02', N'Phường Nam Hà', @HaTinhId, N'phuong', 1),
('HT-TP-03', N'Phường Bắc Hà', @HaTinhId, N'phuong', 1),
('HT-TP-04', N'Phường Nguyễn Du', @HaTinhId, N'phuong', 1),
-- Thị xã Hồng Lĩnh
('HT-HL-01', N'Phường Bắc Hồng', @HaTinhId, N'phuong', 1),
('HT-HL-02', N'Phường Nam Hồng', @HaTinhId, N'phuong', 1),
-- Huyện Cẩm Xuyên
('HT-CX-01', N'Xã Cẩm Vĩnh', @HaTinhId, N'xa', 0),
('HT-CX-02', N'Xã Cẩm Thạch', @HaTinhId, N'xa', 0);
GO

-- QUẢNG NAM (18 huyện/thành = 244 phường/xã, chọn 18 đại diện)
DECLARE @QuangNamId UNIQUEIDENTIFIER = (SELECT id FROM provinces WHERE ma_tinh = 'QNa');

INSERT INTO wards (ma_phuong_xa, ten_phuong_xa, tinh_thanh_id, loai, is_inner_area) VALUES
-- Thành phố Tam Kỳ
('QNa-TK-01', N'Phường Tân Thạnh', @QuangNamId, N'phuong', 1),
('QNa-TK-02', N'Phường An Mỹ', @QuangNamId, N'phuong', 1),
('QNa-TK-03', N'Phường Hòa Hương', @QuangNamId, N'phuong', 1),
-- Thành phố Hội An
('QNa-HA-01', N'Phường Minh An', @QuangNamId, N'phuong', 1),
('QNa-HA-02', N'Phường Tân An', @QuangNamId, N'phuong', 1),
('QNa-HA-03', N'Phường Cẩm Phô', @QuangNamId, N'phuong', 1),
-- Huyện Điện Bàn
('QNa-DB-01', N'Xã Điện Ngọc', @QuangNamId, N'xa', 0),
('QNa-DB-02', N'Xã Điện Phương', @QuangNamId, N'xa', 0);
GO

-- ===== MIỀN NAM =====

-- TP HỒ CHÍ MINH (22 quận/huyện = 322 phường/xã, chọn 30 đại diện)
DECLARE @HCMId UNIQUEIDENTIFIER = (SELECT id FROM provinces WHERE ma_tinh = 'HCM');

INSERT INTO wards (ma_phuong_xa, ten_phuong_xa, tinh_thanh_id, loai, is_inner_area) VALUES
-- Quận 1
('HCM-Q1-01', N'Phường Bến Nghé', @HCMId, N'phuong', 1),
('HCM-Q1-02', N'Phường Bến Thành', @HCMId, N'phuong', 1),
('HCM-Q1-03', N'Phường Nguyễn Thái Bình', @HCMId, N'phuong', 1),
('HCM-Q1-04', N'Phường Phạm Ngũ Lão', @HCMId, N'phuong', 1),
-- Quận 3
('HCM-Q3-01', N'Phường Võ Thị Sáu', @HCMId, N'phuong', 1),
('HCM-Q3-02', N'Phường Phường 1', @HCMId, N'phuong', 1),
('HCM-Q3-03', N'Phường Phường 2', @HCMId, N'phuong', 1),
-- Quận 5
('HCM-Q5-01', N'Phường Phường 1', @HCMId, N'phuong', 1),
('HCM-Q5-02', N'Phường Phường 2', @HCMId, N'phuong', 1),
-- Quận 7
('HCM-Q7-01', N'Phường Tân Thuận Đông', @HCMId, N'phuong', 1),
('HCM-Q7-02', N'Phường Tân Thuận Tây', @HCMId, N'phuong', 1),
('HCM-Q7-03', N'Phường Phú Thuận', @HCMId, N'phuong', 1),
-- Quận Tân Bình
('HCM-TB-01', N'Phường 1', @HCMId, N'phuong', 1),
('HCM-TB-02', N'Phường 2', @HCMId, N'phuong', 1),
-- Thành phố Thủ Đức
('HCM-TD-01', N'Phường Linh Xuân', @HCMId, N'phuong', 1),
('HCM-TD-02', N'Phường Bình Thọ', @HCMId, N'phuong', 1),
('HCM-TD-03', N'Phường Linh Trung', @HCMId, N'phuong', 1),
-- Huyện Bình Chánh (ngoại thành)
('HCM-BC-01', N'Xã Phạm Văn Hai', @HCMId, N'xa', 0),
('HCM-BC-02', N'Xã Bình Lợi', @HCMId, N'xa', 0),
('HCM-BC-03', N'Xã Tân Nhựt', @HCMId, N'xa', 0),
-- Huyện Củ Chi
('HCM-CC-01', N'Xã Phú Mỹ Hưng', @HCMId, N'xa', 0),
('HCM-CC-02', N'Xã An Phú', @HCMId, N'xa', 0);
GO

-- BÌNH DƯƠNG (9 huyện/thành = 107 phường/xã, chọn 18 đại diện)
DECLARE @BinhDuongId UNIQUEIDENTIFIER = (SELECT id FROM provinces WHERE ma_tinh = 'BD');

INSERT INTO wards (ma_phuong_xa, ten_phuong_xa, tinh_thanh_id, loai, is_inner_area) VALUES
-- Thành phố Thủ Dầu Một
('BD-TDM-01', N'Phường Hiệp Thành', @BinhDuongId, N'phuong', 1),
('BD-TDM-02', N'Phường Phú Lợi', @BinhDuongId, N'phuong', 1),
('BD-TDM-03', N'Phường Phú Hòa', @BinhDuongId, N'phuong', 1),
-- Thành phố Thuận An
('BD-TA-01', N'Phường Bình Chuẩn', @BinhDuongId, N'phuong', 1),
('BD-TA-02', N'Phường Thuận Giao', @BinhDuongId, N'phuong', 1),
-- Thành phố Dĩ An
('BD-DA-01', N'Phường Dĩ An', @BinhDuongId, N'phuong', 1),
('BD-DA-02', N'Phường Tân Bình', @BinhDuongId, N'phuong', 1),
-- Huyện Bàu Bàng
('BD-BB-01', N'Xã Lai Uyên', @BinhDuongId, N'xa', 0),
('BD-BB-02', N'Xã Trừ Văn Thố', @BinhDuongId, N'xa', 0);
GO

-- ĐỒNG NAI (11 huyện/thành = 171 phường/xã, chọn 20 đại diện)
DECLARE @DongNaiId UNIQUEIDENTIFIER = (SELECT id FROM provinces WHERE ma_tinh = 'DNA');

INSERT INTO wards (ma_phuong_xa, ten_phuong_xa, tinh_thanh_id, loai, is_inner_area) VALUES
-- Thành phố Biên Hòa
('DNA-BH-01', N'Phường Trảng Dài', @DongNaiId, N'phuong', 1),
('DNA-BH-02', N'Phường Tân Phong', @DongNaiId, N'phuong', 1),
('DNA-BH-03', N'Phường Tân Biên', @DongNaiId, N'phuong', 1),
('DNA-BH-04', N'Phường Quyết Thắng', @DongNaiId, N'phuong', 1),
-- Thành phố Long Khánh
('DNA-LK-01', N'Phường Xuân Trung', @DongNaiId, N'phuong', 1),
('DNA-LK-02', N'Phường Xuân Thanh', @DongNaiId, N'phuong', 1),
-- Huyện Nhơn Trạch
('DNA-NT-01', N'Xã Phú Hữu', @DongNaiId, N'xa', 0),
('DNA-NT-02', N'Xã Phú Hội', @DongNaiId, N'xa', 0);
GO

-- CẦN THƠ (9 quận/huyện = 82 phường/xã, chọn 20 đại diện)
DECLARE @CanThoId UNIQUEIDENTIFIER = (SELECT id FROM provinces WHERE ma_tinh = 'CT');

INSERT INTO wards (ma_phuong_xa, ten_phuong_xa, tinh_thanh_id, loai, is_inner_area) VALUES
-- Quận Ninh Kiều
('CT-NK-01', N'Phường Cái Khế', @CanThoId, N'phuong', 1),
('CT-NK-02', N'Phường An Hòa', @CanThoId, N'phuong', 1),
('CT-NK-03', N'Phường Thới Bình', @CanThoId, N'phuong', 1),
('CT-NK-04', N'Phường An Nghiệp', @CanThoId, N'phuong', 1),
-- Quận Bình Thuỷ
('CT-BT-01', N'Phường Bình Thuỷ', @CanThoId, N'phuong', 1),
('CT-BT-02', N'Phường Trà An', @CanThoId, N'phuong', 1),
-- Quận Cái Răng
('CT-CR-01', N'Phường Lê Bình', @CanThoId, N'phuong', 1),
('CT-CR-02', N'Phường Hưng Phú', @CanThoId, N'phuong', 1),
-- Huyện Phong Điền
('CT-PD-01', N'Xã Nhơn Ái', @CanThoId, N'xa', 0),
('CT-PD-02', N'Xã Giai Xuân', @CanThoId, N'xa', 0);
GO

-- BÀ RỊA - VŨNG TÀU (8 huyện/thành = 82 phường/xã, chọn 15 đại diện)
DECLARE @BRVTId UNIQUEIDENTIFIER = (SELECT id FROM provinces WHERE ma_tinh = 'BRVT');

INSERT INTO wards (ma_phuong_xa, ten_phuong_xa, tinh_thanh_id, loai, is_inner_area) VALUES
-- Thành phố Vũng Tàu
('BRVT-VT-01', N'Phường 1', @BRVTId, N'phuong', 1),
('BRVT-VT-02', N'Phường 2', @BRVTId, N'phuong', 1),
('BRVT-VT-03', N'Phường Thắng Tam', @BRVTId, N'phuong', 1),
('BRVT-VT-04', N'Phường Thắng Nhì', @BRVTId, N'phuong', 1),
-- Thành phố Bà Rịa
('BRVT-BR-01', N'Phường Phước Hưng', @BRVTId, N'phuong', 1),
('BRVT-BR-02', N'Phường Phước Nguyên', @BRVTId, N'phuong', 1),
-- Huyện Châu Đức
('BRVT-CD-01', N'Xã Xuyên Mộc', @BRVTId, N'xa', 0),
('BRVT-CD-02', N'Xã Bông Trang', @BRVTId, N'xa', 0);
GO

-- ========== CHÈN DỮ LIỆU KHO HÀNG (3 KHO THEO 3 VÙNG) ==========

-- Kho Miền Bắc - Hà Nội
INSERT INTO warehouses (ten_kho, phuong_xa_id, dia_chi_chi_tiet, so_dien_thoai, trang_thai)
VALUES (
    N'Kho Miền Bắc - Hà Nội',
    (SELECT id FROM wards WHERE ma_phuong_xa = 'HN-CG-02'), -- Phường Dịch Vọng, Cầu Giấy
    N'Số 123, Đường Xuân Thủy, KCN Dịch Vọng',
    '0243 456 7890',
    1
);

-- Kho Miền Trung - Đà Nẵng
INSERT INTO warehouses (ten_kho, phuong_xa_id, dia_chi_chi_tiet, so_dien_thoai, trang_thai)
VALUES (
    N'Kho Miền Trung - Đà Nẵng',
    (SELECT id FROM wards WHERE ma_phuong_xa = 'DN-HC-01'), -- Phường Thạch Thang, Hải Châu
    N'Số 456, Đường Điện Biên Phủ, KCN Hòa Khánh',
    '0236 789 1234',
    1
);

-- Kho Miền Nam - TP.HCM
INSERT INTO warehouses (ten_kho, phuong_xa_id, dia_chi_chi_tiet, so_dien_thoai, trang_thai)
VALUES (
    N'Kho Miền Nam - TP.HCM',
    (SELECT id FROM wards WHERE ma_phuong_xa = 'HCM-Q7-01'), -- Phường Tân Thuận Đông, Quận 7
    N'Số 789, Đường Nguyễn Văn Linh, KCN Tân Thuận',
    '028 9012 3456',
    1
);
GO

SELECT * FROM products;

-- ========== CHÈN DỮ LIỆU TỒN KHO CHO CÁC SẢN PHẨM ==========

-- TỒN KHO - KHO HÀ NỘI (Miền Bắc)
INSERT INTO inventory (san_pham_id, kho_id, so_luong_kha_dung, so_luong_da_dat, muc_ton_kho_toi_thieu, so_luong_nhap_lai, lan_nhap_hang_cuoi)
SELECT 
    p.id,
    (SELECT id FROM warehouses WHERE ten_kho LIKE N'%Hà Nội%'),
    CASE 
        WHEN p.ma_sku = 'IP15PM256' THEN 85
        WHEN p.ma_sku = 'SSS23U512' THEN 120
        WHEN p.ma_sku = 'XM13T256' THEN 200
        WHEN p.ma_sku = 'OPRENO10' THEN 150
        WHEN p.ma_sku = 'IP14128' THEN 95
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Nokia%' THEN 180
        WHEN p.ma_sku = 'SSA54' THEN 140
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Poco%' THEN 165
        WHEN p.ma_sku = 'OPA78' THEN 190
        WHEN p.ma_sku = 'SSZFLIP4' THEN 45
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%iPhone 16%' THEN 75
        ELSE 100
    END AS so_luong_kha_dung,
    CASE 
        WHEN p.ma_sku = 'IP15PM256' THEN 15
        WHEN p.ma_sku = 'SSS23U512' THEN 10
        WHEN p.ma_sku = 'XM13T256' THEN 25
        WHEN p.ma_sku = 'OPRENO10' THEN 20
        WHEN p.ma_sku = 'IP14128' THEN 18
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Nokia%' THEN 12
        WHEN p.ma_sku = 'SSA54' THEN 22
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Poco%' THEN 18
        WHEN p.ma_sku = 'OPA78' THEN 15
        WHEN p.ma_sku = 'SSZFLIP4' THEN 8
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%iPhone 16%' THEN 12
        ELSE 10
    END AS so_luong_da_dat,
    CASE 
        WHEN p.ma_sku = 'IP15PM256' THEN 20
        WHEN p.ma_sku = 'SSS23U512' THEN 30
        WHEN p.ma_sku = 'XM13T256' THEN 40
        WHEN p.ma_sku = 'OPRENO10' THEN 35
        WHEN p.ma_sku = 'IP14128' THEN 25
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Nokia%' THEN 30
        WHEN p.ma_sku = 'SSA54' THEN 35
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Poco%' THEN 40
        WHEN p.ma_sku = 'OPA78' THEN 45
        WHEN p.ma_sku = 'SSZFLIP4' THEN 15
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%iPhone 16%' THEN 20
        ELSE 20
    END AS muc_ton_kho_toi_thieu,
    CASE 
        WHEN p.ma_sku = 'IP15PM256' THEN 50
        WHEN p.ma_sku = 'SSS23U512' THEN 80
        WHEN p.ma_sku = 'XM13T256' THEN 100
        WHEN p.ma_sku = 'OPRENO10' THEN 90
        WHEN p.ma_sku = 'IP14128' THEN 60
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Nokia%' THEN 80
        WHEN p.ma_sku = 'SSA54' THEN 85
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Poco%' THEN 95
        WHEN p.ma_sku = 'OPA78' THEN 100
        WHEN p.ma_sku = 'SSZFLIP4' THEN 40
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%iPhone 16%' THEN 55
        ELSE 50
    END AS so_luong_nhap_lai,
    DATEADD(day, -(ABS(CHECKSUM(NEWID())) % 10 + 1), GETDATE()) AS lan_nhap_hang_cuoi
FROM products p;

-- TỒN KHO - KHO ĐÀ NẴNG (Miền Trung)
INSERT INTO inventory (san_pham_id, kho_id, so_luong_kha_dung, so_luong_da_dat, muc_ton_kho_toi_thieu, so_luong_nhap_lai, lan_nhap_hang_cuoi)
SELECT 
    p.id,
    (SELECT id FROM warehouses WHERE ten_kho LIKE N'%Đà Nẵng%'),
    CASE 
        WHEN p.ma_sku = 'IP15PM256' THEN 65
        WHEN p.ma_sku = 'SSS23U512' THEN 90
        WHEN p.ma_sku = 'XM13T256' THEN 145
        WHEN p.ma_sku = 'OPRENO10' THEN 110
        WHEN p.ma_sku = 'IP14128' THEN 72
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Nokia%' THEN 130
        WHEN p.ma_sku = 'SSA54' THEN 105
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Poco%' THEN 125
        WHEN p.ma_sku = 'OPA78' THEN 155
        WHEN p.ma_sku = 'SSZFLIP4' THEN 38
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%iPhone 16%' THEN 60
        ELSE 80
    END AS so_luong_kha_dung,
    CASE 
        WHEN p.ma_sku = 'IP15PM256' THEN 12
        WHEN p.ma_sku = 'SSS23U512' THEN 8
        WHEN p.ma_sku = 'XM13T256' THEN 18
        WHEN p.ma_sku = 'OPRENO10' THEN 14
        WHEN p.ma_sku = 'IP14128' THEN 11
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Nokia%' THEN 9
        WHEN p.ma_sku = 'SSA54' THEN 16
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Poco%' THEN 13
        WHEN p.ma_sku = 'OPA78' THEN 11
        WHEN p.ma_sku = 'SSZFLIP4' THEN 6
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%iPhone 16%' THEN 10
        ELSE 8
    END AS so_luong_da_dat,
    CASE 
        WHEN p.ma_sku = 'IP15PM256' THEN 15
        WHEN p.ma_sku = 'SSS23U512' THEN 20
        WHEN p.ma_sku = 'XM13T256' THEN 30
        WHEN p.ma_sku = 'OPRENO10' THEN 25
        WHEN p.ma_sku = 'IP14128' THEN 18
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Nokia%' THEN 25
        WHEN p.ma_sku = 'SSA54' THEN 28
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Poco%' THEN 30
        WHEN p.ma_sku = 'OPA78' THEN 35
        WHEN p.ma_sku = 'SSZFLIP4' THEN 12
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%iPhone 16%' THEN 18
        ELSE 15
    END AS muc_ton_kho_toi_thieu,
    CASE 
        WHEN p.ma_sku = 'IP15PM256' THEN 40
        WHEN p.ma_sku = 'SSS23U512' THEN 60
        WHEN p.ma_sku = 'XM13T256' THEN 70
        WHEN p.ma_sku = 'OPRENO10' THEN 65
        WHEN p.ma_sku = 'IP14128' THEN 45
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Nokia%' THEN 60
        WHEN p.ma_sku = 'SSA54' THEN 70
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Poco%' THEN 75
        WHEN p.ma_sku = 'OPA78' THEN 80
        WHEN p.ma_sku = 'SSZFLIP4' THEN 30
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%iPhone 16%' THEN 45
        ELSE 40
    END AS so_luong_nhap_lai,
    DATEADD(day, -(ABS(CHECKSUM(NEWID())) % 10 + 1), GETDATE()) AS lan_nhap_hang_cuoi
FROM products p;

-- TỒN KHO - KHO TP.HCM (Miền Nam)
INSERT INTO inventory (san_pham_id, kho_id, so_luong_kha_dung, so_luong_da_dat, muc_ton_kho_toi_thieu, so_luong_nhap_lai, lan_nhap_hang_cuoi)
SELECT 
    p.id,
    (SELECT id FROM warehouses WHERE ten_kho LIKE N'%TP.HCM%'),
    CASE 
        WHEN p.ma_sku = 'IP15PM256' THEN 105
        WHEN p.ma_sku = 'SSS23U512' THEN 145
        WHEN p.ma_sku = 'XM13T256' THEN 235
        WHEN p.ma_sku = 'OPRENO10' THEN 175
        WHEN p.ma_sku = 'IP14128' THEN 118
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Nokia%' THEN 210
        WHEN p.ma_sku = 'SSA54' THEN 168
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Poco%' THEN 198
        WHEN p.ma_sku = 'OPA78' THEN 228
        WHEN p.ma_sku = 'SSZFLIP4' THEN 52
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%iPhone 16%' THEN 90
        ELSE 120
    END AS so_luong_kha_dung,
    CASE 
        WHEN p.ma_sku = 'IP15PM256' THEN 20
        WHEN p.ma_sku = 'SSS23U512' THEN 15
        WHEN p.ma_sku = 'XM13T256' THEN 30
        WHEN p.ma_sku = 'OPRENO10' THEN 25
        WHEN p.ma_sku = 'IP14128' THEN 22
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Nokia%' THEN 16
        WHEN p.ma_sku = 'SSA54' THEN 28
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Poco%' THEN 23
        WHEN p.ma_sku = 'OPA78' THEN 19
        WHEN p.ma_sku = 'SSZFLIP4' THEN 10
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%iPhone 16%' THEN 15
        ELSE 12
    END AS so_luong_da_dat,
    CASE 
        WHEN p.ma_sku = 'IP15PM256' THEN 25
        WHEN p.ma_sku = 'SSS23U512' THEN 35
        WHEN p.ma_sku = 'XM13T256' THEN 50
        WHEN p.ma_sku = 'OPRENO10' THEN 40
        WHEN p.ma_sku = 'IP14128' THEN 30
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Nokia%' THEN 40
        WHEN p.ma_sku = 'SSA54' THEN 42
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Poco%' THEN 48
        WHEN p.ma_sku = 'OPA78' THEN 55
        WHEN p.ma_sku = 'SSZFLIP4' THEN 18
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%iPhone 16%' THEN 25
        ELSE 25
    END AS muc_ton_kho_toi_thieu,
    CASE 
        WHEN p.ma_sku = 'IP15PM256' THEN 70
        WHEN p.ma_sku = 'SSS23U512' THEN 90
        WHEN p.ma_sku = 'XM13T256' THEN 120
        WHEN p.ma_sku = 'OPRENO10' THEN 100
        WHEN p.ma_sku = 'IP14128' THEN 75
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Nokia%' THEN 95
        WHEN p.ma_sku = 'SSA54' THEN 95
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%Poco%' THEN 110
        WHEN p.ma_sku = 'OPA78' THEN 120
        WHEN p.ma_sku = 'SSZFLIP4' THEN 50
        WHEN p.ma_sku LIKE 'SP%' AND p.ten_san_pham LIKE N'%iPhone 16%' THEN 65
        ELSE 60
    END AS so_luong_nhap_lai,
    DATEADD(day, -(ABS(CHECKSUM(NEWID())) % 10 + 1), GETDATE()) AS lan_nhap_hang_cuoi
FROM products p;
GO


[
  {
    "id": "2c4fea31-0570-4812-8554-433c4595006d",
    "ma_sku": "SP1764446294151",
    "ten_san_pham": "Xiaomi Poco X5 Pro",
    "danh_muc_id": "f5b79d05-21a1-4015-9c32-f8e767e27429",
    "thuong_hieu_id": "0534a2ad-0ea5-4b25-b9d8-5477cf1f670b",
    "gia_niem_yet": 749000000.0,
    "gia_ban": 649000000.0,
    "mongo_detail_id": "692b4c81f573133c3d9bbb55",
    "trang_thai": "1",
    "luot_xem": 380,
    "so_luong_ban": 34,
    "ngay_tao": "2025-11-29T19:00:30.1933333",
    "ngay_cap_nhat": "2025-11-29T19:58:14.29",
    "link_anh": "https://res.cloudinary.com/dpxuqgeix/image/upload/v1764445312/webPhone/products/xiaomi-poco-x5-pro1764445310359/images/elqusxxlegyn7kujtjkk.png"
  },
  {
    "id": "f9b69fd2-f9cd-40d5-a392-4548957f186f",
    "ma_sku": "SP1764445511101",
    "ten_san_pham": "Nokia G22",
    "danh_muc_id": "05fbd879-373b-4162-a21f-ad3616714f38",
    "thuong_hieu_id": "f51a2333-f561-4311-8d61-5b6020bad19e",
    "gia_niem_yet": 499000000.0,
    "gia_ban": 429000000.0,
    "mongo_detail_id": "692b4d47cd08a1004c142bf5",
    "trang_thai": "0",
    "luot_xem": 180,
    "so_luong_ban": 23,
    "ngay_tao": "2025-11-29T19:00:30.1933333",
    "ngay_cap_nhat": "2025-11-29T19:45:11.33",
    "link_anh": null
  },
  {
    "id": "b9c35097-5853-4f18-b336-58f4066cacef",
    "ma_sku": "SSA54",
    "ten_san_pham": "Samsung Galaxy A54",
    "danh_muc_id": "01d4eab0-efe3-43ec-b4e6-1ae5d3b8cd4b",
    "thuong_hieu_id": "a474c22c-fdcb-409b-aaef-e22981860a07",
    "gia_niem_yet": 899000000.0,
    "gia_ban": 799000000.0,
    "mongo_detail_id": null,
    "trang_thai": "1",
    "luot_xem": 420,
    "so_luong_ban": 56,
    "ngay_tao": "2025-11-29T19:00:30.1933333",
    "ngay_cap_nhat": "2025-11-29T19:00:30.1933333",
    "link_anh": null
  },
  {
    "id": "e3dee669-ac24-46e4-bc20-59ed123cc55d",
    "ma_sku": "IP15PM256",
    "ten_san_pham": "iPhone 15 Pro Max 256GB",
    "danh_muc_id": "f7e102de-320c-4a43-83f3-c227a6391144",
    "thuong_hieu_id": "293986fa-3ab9-4757-b82d-53e33abb5ab3",
    "gia_niem_yet": 3299000000.0,
    "gia_ban": 2999000000.0,
    "mongo_detail_id": null,
    "trang_thai": "1",
    "luot_xem": 1200,
    "so_luong_ban": 150,
    "ngay_tao": "2025-11-29T19:00:30.19",
    "ngay_cap_nhat": "2025-11-29T19:00:30.19",
    "link_anh": null
  },
  {
    "id": "ac5a9d4b-c52e-4159-8e4d-62211a385404",
    "ma_sku": "SP1764454004987",
    "ten_san_pham": "iPhone 16 Pro Max",
    "danh_muc_id": "f7e102de-320c-4a43-83f3-c227a6391144",
    "thuong_hieu_id": "293986fa-3ab9-4757-b82d-53e33abb5ab3",
    "gia_niem_yet": 3300000000.0,
    "gia_ban": 2900000000.0,
    "mongo_detail_id": "692b4e4dcd08a1004c142bfb",
    "trang_thai": "1",
    "luot_xem": 0,
    "so_luong_ban": 0,
    "ngay_tao": "2025-11-29T19:49:23.3866667",
    "ngay_cap_nhat": "2025-11-29T22:06:45.2",
    "link_anh": "https://res.cloudinary.com/dpxuqgeix/image/upload/v1764448695/webPhone/products/iphone-16-pro-max-ac5a9d4b-c52e-4159-8e4d-62211a385404/images/wfsgfvdxzaqbdh5ofm1d.png"
  },
  {
    "id": "31a89447-428b-4ad8-9a16-76faeb5d3ce8",
    "ma_sku": "XM13T256",
    "ten_san_pham": "Xiaomi 13T 256GB",
    "danh_muc_id": "f5b79d05-21a1-4015-9c32-f8e767e27429",
    "thuong_hieu_id": "0534a2ad-0ea5-4b25-b9d8-5477cf1f670b",
    "gia_niem_yet": 1299000000.0,
    "gia_ban": 1099000000.0,
    "mongo_detail_id": null,
    "trang_thai": "1",
    "luot_xem": 600,
    "so_luong_ban": 45,
    "ngay_tao": "2025-11-29T19:00:30.19",
    "ngay_cap_nhat": "2025-11-29T19:00:30.19",
    "link_anh": null
  },
  {
    "id": "28126e76-8a23-4786-8b1c-8d4777caa5f0",
    "ma_sku": "SSZFLIP4",
    "ten_san_pham": "Samsung Galaxy Z Flip4",
    "danh_muc_id": "01d4eab0-efe3-43ec-b4e6-1ae5d3b8cd4b",
    "thuong_hieu_id": "a474c22c-fdcb-409b-aaef-e22981860a07",
    "gia_niem_yet": 1999000000.0,
    "gia_ban": 1799000000.0,
    "mongo_detail_id": null,
    "trang_thai": "1",
    "luot_xem": 650,
    "so_luong_ban": 15,
    "ngay_tao": "2025-11-29T19:00:30.1933333",
    "ngay_cap_nhat": "2025-11-29T19:00:30.1933333",
    "link_anh": null
  },
  {
    "id": "f134b986-0cc2-402c-846d-9db1ae4d7b2e",
    "ma_sku": "OPA78",
    "ten_san_pham": "OPPO A78 5G",
    "danh_muc_id": "05fbd879-373b-4162-a21f-ad3616714f38",
    "thuong_hieu_id": "3f6fe59c-2e9d-4a87-9808-f6b6a19bce54",
    "gia_niem_yet": 629000000.0,
    "gia_ban": 549000000.0,
    "mongo_detail_id": null,
    "trang_thai": "1",
    "luot_xem": 290,
    "so_luong_ban": 41,
    "ngay_tao": "2025-11-29T19:00:30.1933333",
    "ngay_cap_nhat": "2025-11-29T19:00:30.1933333",
    "link_anh": null
  },
  {
    "id": "2c9ca700-524e-4c27-b388-beb7ef1a087c",
    "ma_sku": "SSS23U512",
    "ten_san_pham": "Samsung Galaxy S23 Ultra 512GB",
    "danh_muc_id": "01d4eab0-efe3-43ec-b4e6-1ae5d3b8cd4b",
    "thuong_hieu_id": "a474c22c-fdcb-409b-aaef-e22981860a07",
    "gia_niem_yet": 2499000000.0,
    "gia_ban": 2199000000.0,
    "mongo_detail_id": null,
    "trang_thai": "1",
    "luot_xem": 800,
    "so_luong_ban": 89,
    "ngay_tao": "2025-11-29T19:00:30.19",
    "ngay_cap_nhat": "2025-11-29T19:00:30.19",
    "link_anh": null
  },
  {
    "id": "9087f3d2-7b95-432c-9517-c163f3f1b45f",
    "ma_sku": "SP1764449265455",
    "ten_san_pham": "OKOK",
    "danh_muc_id": "f7e102de-320c-4a43-83f3-c227a6391144",
    "thuong_hieu_id": "293986fa-3ab9-4757-b82d-53e33abb5ab3",
    "gia_niem_yet": 33333300.0,
    "gia_ban": 1222200.0,
    "mongo_detail_id": "692b5bfa77b304edccf558e5",
    "trang_thai": "1",
    "luot_xem": 0,
    "so_luong_ban": 0,
    "ngay_tao": "2025-11-29T20:47:45.5966667",
    "ngay_cap_nhat": "2025-11-29T20:47:54.59",
    "link_anh": "https://res.cloudinary.com/dpxuqgeix/image/upload/v1764449268/webPhone/products/okok-sp1764449265455/images/sfwsdrz4jgnxaoo9a0is.png"
  },
  {
    "id": "bd7747b3-3cb2-4403-bdac-e3953efc352a",
    "ma_sku": "OPRENO10",
    "ten_san_pham": "OPPO Reno10 5G",
    "danh_muc_id": "05fbd879-373b-4162-a21f-ad3616714f38",
    "thuong_hieu_id": "3f6fe59c-2e9d-4a87-9808-f6b6a19bce54",
    "gia_niem_yet": 899000000.0,
    "gia_ban": 799000000.0,
    "mongo_detail_id": null,
    "trang_thai": "1",
    "luot_xem": 450,
    "so_luong_ban": 67,
    "ngay_tao": "2025-11-29T19:00:30.19",
    "ngay_cap_nhat": "2025-11-29T19:00:30.19",
    "link_anh": null
  },
  {
    "id": "cb77ea2e-2b35-4fbb-bfc8-f7b82fd8dd2c",
    "ma_sku": "SP1764448917608",
    "ten_san_pham": "Test Oke thì ngủ",
    "danh_muc_id": "05fbd879-373b-4162-a21f-ad3616714f38",
    "thuong_hieu_id": "0534a2ad-0ea5-4b25-b9d8-5477cf1f670b",
    "gia_niem_yet": 2222100.0,
    "gia_ban": 1200.0,
    "mongo_detail_id": "692b5a9d1514aa3f363db4bc",
    "trang_thai": "1",
    "luot_xem": 0,
    "so_luong_ban": 0,
    "ngay_tao": "2025-11-29T20:41:57.7366667",
    "ngay_cap_nhat": "2025-11-29T20:42:05.2033333",
    "link_anh": "https://res.cloudinary.com/dpxuqgeix/image/upload/v1764448920/webPhone/products/test-oke-thi-ngu-sp1764448917608/images/ilikfxyu4vvdthauzr6c.jpg"
  },
  {
    "id": "b65768cd-2919-41ff-b1c7-fe0c274d39bb",
    "ma_sku": "IP14128",
    "ten_san_pham": "iPhone 14 128GB",
    "danh_muc_id": "f7e102de-320c-4a43-83f3-c227a6391144",
    "thuong_hieu_id": "293986fa-3ab9-4757-b82d-53e33abb5ab3",
    "gia_niem_yet": 1999000000.0,
    "gia_ban": 1799000000.0,
    "mongo_detail_id": null,
    "trang_thai": "1",
    "luot_xem": 1500,
    "so_luong_ban": 120,
    "ngay_tao": "2025-11-29T19:00:30.19",
    "ngay_cap_nhat": "2025-11-29T19:00:30.19",
    "link_anh": null
  }
]


-- ========== DỮ LIỆU USERS MẪU ==========
-- Mật khẩu: 123456 (đã hash SHA256)
-- Hash: 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92

INSERT INTO users (email, mat_khau, ho_ten, so_dien_thoai, vung_id, trang_thai) VALUES
(N'admin@webphones.vn', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Quản Trị Viên', '0901234567', N'bac', 1),
(N'user@test.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Nguyễn Văn A', '0912345678', N'nam', 1),
(N'khachhang@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Trần Thị B', '0923456789', N'trung', 1);
GO

PRINT N'✅ Đã thêm 3 users mẫu (mật khẩu: 123456)';
GO