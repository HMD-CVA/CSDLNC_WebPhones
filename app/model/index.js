import mongoose, { model } from "mongoose";
import sql from 'mssql';

// ==================== MONGODB MODELS ====================

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true },
  mat_khau: { type: String, required: true },
  ho_ten: { type: String, trim: true },
  so_dien_thoai: { type: String, trim: true },
  anh_dai_dien: { type: String },
  khu_vuc_mac_dinh: { 
    type: String, 
    enum: ['bac', 'trung', 'nam'], 
  },
  khu_vuc_dang_ky: { 
    type: String, 
    enum: ['bac', 'trung', 'nam'], 
    required: true 
  },
  vai_tro: { 
    type: String, 
    enum: ['khach_hang', 'quan_tri', 'nhan_vien'], 
    default: 'khach_hang' 
  },
  trang_thai: { type: Number, default: 1 },
  ngay_dang_ky: { type: Date, default: Date.now },
  ngay_cap_nhat: { type: Date, default: Date.now }
}, {
  timestamps: { createdAt: 'ngay_dang_ky', updatedAt: 'ngay_cap_nhat' }
});

const BrandSchema = new mongoose.Schema({
  ten_thuong_hieu: { type: String, required: true, trim: true },
  mo_ta: { type: String },
  logo_url: { type: String },
  slug: { type: String, unique: true, trim: true },
  trang_thai: { type: Number, default: 1 },
  ngay_tao: { type: Date, default: Date.now }
});

const CategorySchema = new mongoose.Schema({
  ten_danh_muc: { type: String, required: true, trim: true },
  mo_ta: { type: String },
  danh_muc_cha_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  slug: { type: String, unique: true, trim: true },
  anh_url: { type: String },
  thu_tu: { type: Number, default: 0 },
  trang_thai: { type: Number, default: 1 },
  ngay_tao: { type: Date, default: Date.now }
});

// MongoDB Models
const Data_User_Model = mongoose.model('User', UserSchema);
const Data_Brand_Model = mongoose.model('Brand', BrandSchema);
const Data_Category_Model = mongoose.model('Category', CategorySchema);

// ==================== SQL SERVER MODELS ====================

// Model cho Brand trong SQL Server
class SQLBrandModel {
  static async findAll() {
    try {
      const request = new sql.Request();
      const result = await request.query(`
        SELECT * FROM brands 
        WHERE trang_thai = 1 
        ORDER BY ngay_tao DESC
      `);
      return result.recordset;
    } catch (error) {
      console.error('SQL Brand Error:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('id', sql.UniqueIdentifier, id)
        .query('SELECT * FROM brands WHERE id = @id AND trang_thai = 1');
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Brand Error:', error);
      throw error;
    }
  }

  static async create(brandData) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('ten_thuong_hieu', sql.NVarChar(100), brandData.ten_thuong_hieu)
        .input('mo_ta', sql.NVarChar(500), brandData.mo_ta)
        .input('logo_url', sql.NVarChar(500), brandData.logo_url)
        .input('slug', sql.NVarChar(255), brandData.slug)
        .query(`
          INSERT INTO brands (ten_thuong_hieu, mo_ta, logo_url, slug)
          OUTPUT INSERTED.*
          VALUES (@ten_thuong_hieu, @mo_ta, @logo_url, @slug)
        `);
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Brand Error:', error);
      throw error;
    }
  }
}

// Model cho Category trong SQL Server
class SQLCategoryModel {
  static async findAll() {
    try {
      const request = new sql.Request();
      const result = await request.query(`
        SELECT c.*, p.ten_danh_muc as ten_danh_muc_cha 
        FROM categories c 
        LEFT JOIN categories p ON c.danh_muc_cha_id = p.id 
        WHERE c.trang_thai = 1 
        ORDER BY c.thu_tu ASC, c.ngay_tao DESC
      `);
      return result.recordset;
    } catch (error) {
      console.error('SQL Category Error:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('id', sql.UniqueIdentifier, id)
        .query(`
          SELECT c.*, p.ten_danh_muc as ten_danh_muc_cha 
          FROM categories c 
          LEFT JOIN categories p ON c.danh_muc_cha_id = p.id 
          WHERE c.id = @id AND c.trang_thai = 1
        `);
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Category Error:', error);
      throw error;
    }
  }

  static async create(categoryData) {
    try {
      const request = new sql.Request();
      let query = `
        INSERT INTO categories (ten_danh_muc, mo_ta, danh_muc_cha_id, slug, anh_url, thu_tu)
        OUTPUT INSERTED.*
        VALUES (@ten_danh_muc, @mo_ta, @danh_muc_cha_id, @slug, @anh_url, @thu_tu)
      `;
      
      const result = await request
        .input('ten_danh_muc', sql.NVarChar(100), categoryData.ten_danh_muc)
        .input('mo_ta', sql.NVarChar(500), categoryData.mo_ta)
        .input('danh_muc_cha_id', categoryData.danh_muc_cha_id ? sql.UniqueIdentifier : sql.NVarChar, categoryData.danh_muc_cha_id || null)
        .input('slug', sql.NVarChar(255), categoryData.slug)
        .input('anh_url', sql.NVarChar(500), categoryData.anh_url)
        .input('thu_tu', sql.Int, categoryData.thu_tu || 0)
        .query(query);
      
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Category Error:', error);
      throw error;
    }
  }
}

// Model cho Product trong SQL Server
class SQLProductModel {
  static async findAll() {
    try {
      const request = new sql.Request();
      const result = await request.query(`
        SELECT 
          p.*, 
          c.ten_danh_muc, 
          b.ten_thuong_hieu,
          (p.gia_niem_yet - p.gia_ban) as giam_gia
        FROM products p
        INNER JOIN categories c ON p.danh_muc_id = c.id
        INNER JOIN brands b ON p.thuong_hieu_id = b.id
        WHERE p.trang_thai = 1
        ORDER BY p.ngay_tao DESC
      `);
      return result.recordset;
    } catch (error) {
      console.error('SQL Product Error:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('id', sql.UniqueIdentifier, id)
        .query(`
          SELECT 
            p.*, 
            c.ten_danh_muc, 
            b.ten_thuong_hieu,
            (p.gia_niem_yet - p.gia_ban) as giam_gia
          FROM products p
          INNER JOIN categories c ON p.danh_muc_id = c.id
          INNER JOIN brands b ON p.thuong_hieu_id = b.id
          WHERE p.id = @id AND p.trang_thai = 1
        `);
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Product Error:', error);
      throw error;
    }
  }

  static async findByCategory(categoryId) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('categoryId', sql.UniqueIdentifier, categoryId)
        .query(`
          SELECT 
            p.*, 
            c.ten_danh_muc, 
            b.ten_thuong_hieu
          FROM products p
          INNER JOIN categories c ON p.danh_muc_id = c.id
          INNER JOIN brands b ON p.thuong_hieu_id = b.id
          WHERE p.danh_muc_id = @categoryId AND p.trang_thai = 1
          ORDER BY p.ngay_tao DESC
        `);
      return result.recordset;
    } catch (error) {
      console.error('SQL Product Error:', error);
      throw error;
    }
  }

  static async create(productData) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('ma_sku', sql.NVarChar(100), productData.ma_sku)
        .input('ten_san_pham', sql.NVarChar(255), productData.ten_san_pham)
        .input('danh_muc_id', sql.UniqueIdentifier, productData.danh_muc_id)
        .input('thuong_hieu_id', sql.UniqueIdentifier, productData.thuong_hieu_id)
        .input('gia_niem_yet', sql.Decimal(15, 2), productData.gia_niem_yet)
        .input('gia_ban', sql.Decimal(15, 2), productData.gia_ban)
        .input('mongo_detail_id', sql.NVarChar(50), productData.mongo_detail_id)
        .query(`
          INSERT INTO products (ma_sku, ten_san_pham, danh_muc_id, thuong_hieu_id, gia_niem_yet, gia_ban, mongo_detail_id)
          OUTPUT INSERTED.*
          VALUES (@ma_sku, @ten_san_pham, @danh_muc_id, @thuong_hieu_id, @gia_niem_yet, @gia_ban, @mongo_detail_id)
        `);
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Product Error:', error);
      throw error;
    }
  }
}

// ==================== EXPORT ALL MODELS ====================

export default {
  // MongoDB Models
  Data_User_Model,
  Data_Brand_Model, 
  Data_Category_Model,
  
  // SQL Server Models
  SQLBrandModel,
  SQLCategoryModel,
  SQLProductModel,
  
  // Hoặc export theo nhóm để dễ sử dụng
  Mongo: {
    User: Data_User_Model,
    Brand: Data_Brand_Model,
    Category: Data_Category_Model
  },
  
  SQL: {
    Brand: SQLBrandModel,
    Category: SQLCategoryModel,
    Product: SQLProductModel
  }
};