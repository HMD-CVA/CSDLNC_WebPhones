-- =============================================
-- SCRIPT: Thêm các cột còn thiếu vào bảng vouchers
-- Mục đích: Bổ sung vung_id, so_lan_su_dung, mongo_voucher_detail_id
-- =============================================

USE DB_WebPhone;
GO

-- Kiểm tra và thêm cột vung_id (partition key - voucher thuộc vùng nào)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('vouchers') AND name = 'vung_id')
BEGIN
    ALTER TABLE vouchers
    ADD vung_id NVARCHAR(10) NULL;
    
    PRINT '✅ Đã thêm cột vung_id vào bảng vouchers';
END
ELSE
BEGIN
    PRINT 'ℹ️ Cột vung_id đã tồn tại trong bảng vouchers';
END
GO

-- Cập nhật giá trị mặc định cho vung_id (nếu NULL)
UPDATE vouchers
SET vung_id = N'bac'
WHERE vung_id IS NULL;
GO

-- Thêm constraint cho vung_id
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_vouchers_vung_id')
BEGIN
    ALTER TABLE vouchers
    ADD CONSTRAINT CK_vouchers_vung_id CHECK (vung_id IN (N'bac', N'trung', N'nam'));
    
    PRINT '✅ Đã thêm constraint CK_vouchers_vung_id';
END
ELSE
BEGIN
    PRINT 'ℹ️ Constraint CK_vouchers_vung_id đã tồn tại';
END
GO

-- Thêm foreign key cho vung_id
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_vouchers_vung_id')
BEGIN
    ALTER TABLE vouchers
    ADD CONSTRAINT FK_vouchers_vung_id FOREIGN KEY (vung_id) REFERENCES regions(ma_vung);
    
    PRINT '✅ Đã thêm foreign key FK_vouchers_vung_id';
END
ELSE
BEGIN
    PRINT 'ℹ️ Foreign key FK_vouchers_vung_id đã tồn tại';
END
GO

-- Kiểm tra và thêm cột so_lan_su_dung (đếm số lần đã dùng)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('vouchers') AND name = 'so_lan_su_dung')
BEGIN
    ALTER TABLE vouchers
    ADD so_lan_su_dung INT DEFAULT 0 NOT NULL;
    
    PRINT '✅ Đã thêm cột so_lan_su_dung vào bảng vouchers';
END
ELSE
BEGIN
    PRINT 'ℹ️ Cột so_lan_su_dung đã tồn tại trong bảng vouchers';
END
GO

-- Thêm constraint check cho so_lan_su_dung
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_vouchers_so_lan_su_dung')
BEGIN
    ALTER TABLE vouchers
    ADD CONSTRAINT CK_vouchers_so_lan_su_dung CHECK (so_lan_su_dung >= 0 AND so_lan_su_dung <= so_luong);
    
    PRINT '✅ Đã thêm constraint CK_vouchers_so_lan_su_dung';
END
ELSE
BEGIN
    PRINT 'ℹ️ Constraint CK_vouchers_so_lan_su_dung đã tồn tại';
END
GO

-- Kiểm tra và thêm cột mongo_voucher_detail_id (link tới MongoDB)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('vouchers') AND name = 'mongo_voucher_detail_id')
BEGIN
    ALTER TABLE vouchers
    ADD mongo_voucher_detail_id NVARCHAR(50) NULL;
    
    PRINT '✅ Đã thêm cột mongo_voucher_detail_id vào bảng vouchers';
END
ELSE
BEGIN
    PRINT 'ℹ️ Cột mongo_voucher_detail_id đã tồn tại trong bảng vouchers';
END
GO

-- Tạo index partition theo vung_id (KEY cho replication filter)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_vouchers_vung_id' AND object_id = OBJECT_ID('vouchers'))
BEGIN
    CREATE INDEX IDX_vouchers_vung_id 
    ON vouchers(vung_id, trang_thai, ngay_bat_dau, ngay_ket_thuc);
    
    PRINT '✅ Đã tạo index IDX_vouchers_vung_id';
END
ELSE
BEGIN
    PRINT 'ℹ️ Index IDX_vouchers_vung_id đã tồn tại';
END
GO

-- Tạo index cho so_lan_su_dung (theo dõi voucher gần hết)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_vouchers_usage' AND object_id = OBJECT_ID('vouchers'))
BEGIN
    CREATE INDEX IDX_vouchers_usage 
    ON vouchers(so_lan_su_dung, so_luong)
    WHERE trang_thai = 1;
    
    PRINT '✅ Đã tạo index IDX_vouchers_usage';
END
ELSE
BEGIN
    PRINT 'ℹ️ Index IDX_vouchers_usage đã tồn tại';
END
GO

-- Tạo computed column cho so_luong_con_lai (số lượng voucher còn lại)
IF NOT EXISTS (SELECT * FROM sys.computed_columns WHERE object_id = OBJECT_ID('vouchers') AND name = 'so_luong_con_lai')
BEGIN
    ALTER TABLE vouchers
    ADD so_luong_con_lai AS (so_luong - so_lan_su_dung) PERSISTED;
    
    PRINT '✅ Đã thêm computed column so_luong_con_lai';
END
ELSE
BEGIN
    PRINT 'ℹ️ Computed column so_luong_con_lai đã tồn tại';
END
GO

PRINT '';
PRINT '========================================';
PRINT '✅ HOÀN TẤT: Đã bổ sung các cột cho bảng vouchers';
PRINT '   - vung_id: Partition theo vùng';
PRINT '   - so_lan_su_dung: Đếm số lần sử dụng';
PRINT '   - mongo_voucher_detail_id: Link MongoDB';
PRINT '   - so_luong_con_lai: Computed column';
PRINT '========================================';
GO
