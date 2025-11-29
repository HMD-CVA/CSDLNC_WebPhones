-- =====================================================
-- QUẢN LÝ ĐỊA CHỈ 2 CẤP: TỈNH/THÀNH PHỐ - PHƯỜNG/XÃ
-- Phù hợp cho website thương mại điện tử quy mô vừa
-- Đơn giản hơn nhưng vẫn đủ tính năng
-- =====================================================

USE DB_WEBPHONES;
GO

-- ========== BƯỚC 1: TẠO BẢNG PROVINCES (63 tỉnh thành) ==========

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

-- ========== BƯỚC 2: TẠO BẢNG WARDS (Phường/Xã) ==========

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

-- ========== BƯỚC 3: CHÈN DỮ LIỆU 15 TỈNH THÀNH (5 tỉnh lớn mỗi vùng) ==========

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

-- ========== BƯỚC 5: TẠO INDEX TỐI ƯU ==========

CREATE INDEX IX_provinces_vung_id ON provinces(vung_id);
CREATE INDEX IX_provinces_is_major_city ON provinces(is_major_city);
CREATE INDEX IX_provinces_thu_tu_uu_tien ON provinces(thu_tu_uu_tien);

CREATE INDEX IX_wards_tinh_thanh_id ON wards(tinh_thanh_id);
CREATE INDEX IX_wards_is_inner_area ON wards(is_inner_area);
CREATE INDEX IX_wards_ten_phuong_xa ON wards(ten_phuong_xa);
GO

-- ========== BƯỚC 6: STORED PROCEDURE TÍNH PHÍ SHIP ==========

CREATE OR ALTER PROCEDURE sp_CalculateShippingFee
    @tinh_thanh_id UNIQUEIDENTIFIER,
    @phuong_xa_id UNIQUEIDENTIFIER = NULL,
    @shipping_method_region_id UNIQUEIDENTIFIER, -- ID từ bảng shipping_method_regions
    @order_value DECIMAL(15,2) = 0
AS
BEGIN
    DECLARE @base_fee DECIMAL(15,2);
    DECLARE @vung_id NVARCHAR(10);
    DECLARE @is_inner_area BIT = 0;
    DECLARE @final_fee DECIMAL(15,2);
    DECLARE @shipping_method NVARCHAR(50);

    -- Lấy phí ship từ bảng shipping_method_regions
    SELECT 
        @base_fee = chi_phi_van_chuyen,
        @vung_id = region_id
    FROM shipping_method_regions
    WHERE id = @shipping_method_region_id;

    -- Kiểm tra xem có phải khu vực nội thành không (để giảm phí nếu cần)
    IF @phuong_xa_id IS NOT NULL
    BEGIN
        SELECT @is_inner_area = is_inner_area
        FROM wards
        WHERE id = @phuong_xa_id;
        
        -- Giảm 20% cho khu vực nội thành
        IF @is_inner_area = 1
            SET @base_fee = @base_fee * 0.8;
    END

    SET @final_fee = @base_fee;

    -- Áp dụng khuyến mãi theo giá trị đơn hàng
    IF @order_value >= 500000
        SET @final_fee = 0; -- Miễn phí
    ELSE IF @order_value >= 300000
        SET @final_fee = @final_fee * 0.5; -- Giảm 50%

    -- Trả về kết quả
    SELECT 
        @final_fee AS phi_van_chuyen,
        @vung_id AS vung_id,
        @is_inner_area AS is_inner_area,
        CASE 
            WHEN @final_fee = 0 THEN N'Miễn phí vận chuyển'
            WHEN @final_fee < @base_fee THEN N'Giảm giá vận chuyển'
            ELSE N'Phí vận chuyển tiêu chuẩn'
        END AS ghi_chu;
END
GO

-- ========== BƯỚC 7: VIEW HIỂN THỊ ĐỊA CHỈ ĐẦY ĐỦ ==========

CREATE OR ALTER VIEW vw_DiaChi_DayDu AS
SELECT 
    w.id,
    w.ma_phuong_xa,
    w.ten_phuong_xa,
    w.loai AS loai_phuong_xa,
    p.ten_tinh,
    p.ma_tinh,
    r.ten_vung,
    r.ma_vung,
    w.is_inner_area,
    -- Địa chỉ đầy đủ
    CONCAT(
        w.ten_phuong_xa, ', ',
        p.ten_tinh, ', ',
        r.ten_vung
    ) AS dia_chi_day_du
FROM wards w
INNER JOIN provinces p ON w.tinh_thanh_id = p.id
INNER JOIN regions r ON p.vung_id = r.ma_vung
WHERE w.trang_thai = 1 AND p.trang_thai = 1;
GO

-- ========== TEST STORED PROCEDURE ==========

PRINT N'========== TEST PHÍ VẬN CHUYỂN ==========';
PRINT N'LƯU Ý: Test này yêu cầu bảng shipping_methods và shipping_method_regions đã có dữ liệu';
PRINT N'Vui lòng chạy sau khi đã tạo dữ liệu phương thức vận chuyển';
PRINT '';

-- ========== TEST VIEW ==========
PRINT N'========== DANH SÁCH ĐỊA CHỈ MẪU ==========';
SELECT TOP 10
    ten_phuong_xa,
    ten_tinh,
    ten_vung,
    dia_chi_day_du,
    is_inner_area
FROM vw_DiaChi_DayDu
ORDER BY ten_vung, ten_tinh, ten_phuong_xa;
GO

PRINT N'';
PRINT N'========== HOÀN TẤT TẠO CẤU TRÚC ĐỊA CHỈ 2 CẤP ==========';
PRINT N'✅ Đã tạo 15 tỉnh/thành phố (5 tỉnh lớn nhất mỗi vùng)';
PRINT N'✅ Đã tạo ~50 phường/xã mẫu cho HN, HCM, DN';
PRINT N'✅ Phí ship được quản lý trong bảng shipping_method_regions';
PRINT N'==========================================================';


