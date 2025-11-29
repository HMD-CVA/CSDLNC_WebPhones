import mongoose, { model } from "mongoose";
import sql from 'mssql';

// ==================== MONGODB MODELS ====================

const productDetailSchema = new mongoose.Schema({
  sql_product_id: { type: String, required: true, unique: true },
}, { 
  strict: false, // Cho phép lưu các trường không được định nghĩa
  timestamps: true 
});
const Data_ProductDetail_Model = mongoose.model('ProductDetail', productDetailSchema);

const flashSaleDetailSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // UUID từ SQL flash_sales.id
  banner_images: [{ type: String }], // Mảng URL ảnh banner
  promotional_videos: [{ 
    url: String,
    title: String,
    thumbnail: String,
    duration: Number
  }],
  rules: {
    max_quantity_per_user: Number,
    min_purchase_amount: Number,
    eligible_user_groups: [String],
    payment_methods: [String]
  },
  marketing: {
    seo_title: String,
    seo_description: String,
    seo_keywords: [String],
    social_share_image: String,
    hashtags: [String]
  },
  notification_settings: {
    send_email: { type: Boolean, default: true },
    send_sms: { type: Boolean, default: false },
    send_push: { type: Boolean, default: true },
    notify_before_start: Number, // phút trước khi bắt đầu
    notify_when_sold_out: { type: Boolean, default: true }
  },
  analytics: {
    total_views: { type: Number, default: 0 },
    total_clicks: { type: Number, default: 0 },
    conversion_rate: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 }
  },
  ui_settings: {
    theme_color: String,
    background_color: String,
    countdown_style: String,
    layout_type: String
  },
  custom_data: mongoose.Schema.Types.Mixed, // Dữ liệu tùy chỉnh bất kỳ
  notes: String,
  tags: [String]
}, { 
  _id: false, // Tắt auto-generate _id vì đã tự định nghĩa
  strict: false, // Cho phép lưu các trường không được định nghĩa
  timestamps: true 
});

// Thêm static methods trước khi tạo model
flashSaleDetailSchema.statics.findByFlashSaleId = async function(flashSaleId) {
  return await this.findById(flashSaleId);
};

flashSaleDetailSchema.statics.createOrUpdate = async function(flashSaleId, detailData) {
  return await this.findByIdAndUpdate(
    flashSaleId,
    { $set: { ...detailData, _id: flashSaleId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

flashSaleDetailSchema.statics.deleteByFlashSaleId = async function(flashSaleId) {
  return await this.findByIdAndDelete(flashSaleId);
};

// MongoDB Models (tạo sau khi đã định nghĩa methods)
const Data_FlashSaleDetail_Model = mongoose.model('FlashSaleDetail', flashSaleDetailSchema);

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
  static async findOne(conditions = {}) {
      try {
          const request = new sql.Request();
          let whereClause = '';
          const params = [];

          // Xử lý điều kiện where
          if (conditions.where && Object.keys(conditions.where).length > 0) {
              const whereConditions = [];
              let paramIndex = 0;

              Object.entries(conditions.where).forEach(([key, value]) => {
                  paramIndex++;
                  const paramName = `param${paramIndex}`;
                  
                  whereConditions.push(`${key} = @${paramName}`);
                  request.input(paramName, value);
                  
                  params.push({ name: paramName, value });
              });

              whereClause = `WHERE ${whereConditions.join(' AND ')}`;
          }

          const query = `
              SELECT TOP 1 * 
              FROM brands 
              ${whereClause}
              ORDER BY ngay_tao DESC
          `;

          console.log('🔍 Executing findOne Query:', query);
          if (params.length > 0) {
              console.log('📋 Query Parameters:', params);
          }

          const result = await request.query(query);
          
          return result.recordset[0] || null;
          
      } catch (error) {
          console.error('❌ SQL Brand findOne Error:', error);
          throw error;
      }
  }

  static async findById(id) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('id', sql.UniqueIdentifier, id)
        .query('SELECT * FROM brands WHERE id = @id');
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

  static async update(brandId, updateData) {
      try {
          const request = new sql.Request();
          
          // Thêm các parameters
          request.input('id', sql.UniqueIdentifier, brandId);
          request.input('ten_thuong_hieu', sql.NVarChar(100), updateData.ten_thuong_hieu);
          request.input('mo_ta', sql.NVarChar(500), updateData.mo_ta || null);
          request.input('logo_url', sql.NVarChar(500), updateData.logo_url || null);
          request.input('trang_thai', sql.Int, updateData.trang_thai);
          request.input('updated_at', sql.DateTime, new Date());

          let slugCondition = '';
          let slugJoin = '';
          
          // Nếu có slug mới thì thêm vào cập nhật
          if (updateData.slug) {
              request.input('slug', sql.NVarChar(255), updateData.slug);
              slugCondition = ', slug = @slug';
          }

          const query = `
              UPDATE brands 
              SET ten_thuong_hieu = @ten_thuong_hieu,
                  mo_ta = @mo_ta,
                  logo_url = @logo_url,
                  trang_thai = @trang_thai,
                  ngay_tao = @updated_at
                  ${slugCondition}
              WHERE id = @id;
              
              SELECT * FROM brands WHERE id = @id;
          `;

          console.log('🔄 Executing SQL Update Query:', query);
          
          const result = await request.query(query);
          
          if (!result.recordset || result.recordset.length === 0) {
              throw new Error('Không tìm thấy thương hiệu sau khi cập nhật');
          }

          return result.recordset[0];
          
      } catch (error) {
          console.error('❌ SQL Brand Update Error:', error);
          
          // Xử lý lỗi trùng slug (violation of unique constraint)
          if (error.message && error.message.includes('UNIQUE') || error.message.includes('slug')) {
              throw new Error('Slug đã tồn tại, vui lòng chọn tên khác');
          }
          
          throw error;
      }
  }

  static async destroy(conditions = {}) {
    try {
        const request = new sql.Request();
        let whereClause = '';
        const params = [];

        // Xử lý điều kiện where
        if (conditions.where && Object.keys(conditions.where).length > 0) {
            const whereConditions = [];
            let paramIndex = 0;

            Object.entries(conditions.where).forEach(([key, value]) => {
                paramIndex++;
                const paramName = `param${paramIndex}`;
                
                whereConditions.push(`${key} = @${paramName}`);
                request.input(paramName, value);
                
                params.push({ name: paramName, value });
            });

            whereClause = `WHERE ${whereConditions.join(' AND ')}`;
        }

        // 1. Kiểm tra xem thương hiệu có tồn tại không
        const checkBrandQuery = `
            SELECT id, ten_thuong_hieu 
            FROM brands 
            ${whereClause}
        `;

        console.log('🔍 Checking brand existence:', checkBrandQuery);
        const brandResult = await request.query(checkBrandQuery);
        
        if (!brandResult.recordset || brandResult.recordset.length === 0) {
            throw new Error('Không tìm thấy thương hiệu');
        }

        const brand = brandResult.recordset[0];
        const brandId = brand.id;

        // 2. Kiểm tra xem có sản phẩm nào thuộc thương hiệu này không
        const checkProductsQuery = `
            SELECT COUNT(*) as product_count 
            FROM products 
            WHERE thuong_hieu_id = @brandId AND trang_thai = 1
        `;

        const productRequest = new sql.Request();
        productRequest.input('brandId', sql.UniqueIdentifier, brandId);
        
        const productResult = await productRequest.query(checkProductsQuery);
        const productCount = productResult.recordset[0].product_count;

        if (productCount > 0) {
            throw new Error(`Không thể xóa thương hiệu "${brand.ten_thuong_hieu}" vì còn ${productCount} sản phẩm đang hoạt động thuộc thương hiệu này. Vui lòng chuyển hoặc xóa các sản phẩm trước.`);
        }

        // 3. Thực hiện xóa thương hiệu (soft delete - cập nhật trạng thái)
        const deleteQuery = `
            UPDATE brands 
            SET 
                trang_thai = 0,
                ngay_tao = GETDATE()
            ${whereClause};
            
            SELECT * FROM brands ${whereClause};
        `;

        console.log('🗑️ Executing soft delete query:', deleteQuery);
        const deleteResult = await request.query(deleteQuery);

        if (!deleteResult.recordset || deleteResult.recordset.length === 0) {
            throw new Error('Không tìm thấy thương hiệu sau khi xóa');
        }

        console.log(`✅ Đã vô hiệu hóa thương hiệu: ${brand.ten_thuong_hieu}`);
        return deleteResult.recordset[0];

    } catch (error) {
        console.error('❌ SQL Brand Destroy Error:', error);
        
        // Xử lý các lỗi cụ thể
        if (error.message.includes('Không thể xóa thương hiệu')) {
            throw error; // Giữ nguyên thông báo lỗi về sản phẩm
        }
        
        if (error.message.includes('Không tìm thấy thương hiệu')) {
            throw new Error('Không tìm thấy thương hiệu để xóa');
        }
        
        throw new Error('Lỗi khi xóa thương hiệu: ' + error.message);
    }
  }
}

// Model cho Category trong SQL Server
class SQLCategoryModel {
    static async findAll() {
        try {
            const request = new sql.Request();
            const result = await request.query(`
                SELECT * FROM categories 
                WHERE trang_thai = 1 
                ORDER BY thu_tu ASC, ten_danh_muc ASC
            `);
            return result.recordset;
        } catch (error) {
            console.error('SQL Category Error:', error);
            throw error;
        }
    }

    static async findOne(conditions = {}) {
        try {
            const request = new sql.Request();
            let whereClause = '';
            const params = [];

            if (conditions.where && Object.keys(conditions.where).length > 0) {
                const whereConditions = [];
                let paramIndex = 0;

                Object.entries(conditions.where).forEach(([key, value]) => {
                    paramIndex++;
                    const paramName = `param${paramIndex}`;
                    
                    whereConditions.push(`${key} = @${paramName}`);
                    request.input(paramName, value);
                    
                    params.push({ name: paramName, value });
                });

                whereClause = `WHERE ${whereConditions.join(' AND ')}`;
            }

            const query = `
                SELECT TOP 1 * 
                FROM categories 
                ${whereClause}
                ORDER BY thu_tu ASC, ten_danh_muc ASC
            `;

            console.log('🔍 Executing Category findOne Query:', query);
            if (params.length > 0) {
                console.log('📋 Query Parameters:', params);
            }

            const result = await request.query(query);
            
            return result.recordset[0] || null;
            
        } catch (error) {
            console.error('❌ SQL Category findOne Error:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const request = new sql.Request();
            const result = await request
                .input('id', sql.UniqueIdentifier, id)
                .query('SELECT * FROM categories WHERE id = @id');
            return result.recordset[0];
        } catch (error) {
            console.error('SQL Category Error:', error);
            throw error;
        }
    }

    static async create(categoryData) {
        try {
            const request = new sql.Request();
            const result = await request
                .input('ten_danh_muc', sql.NVarChar(100), categoryData.ten_danh_muc)
                .input('mo_ta', sql.NVarChar(500), categoryData.mo_ta)
                .input('anh_url', sql.NVarChar(500), categoryData.anh_url)
                .input('thu_tu', sql.Int, categoryData.thu_tu !== undefined ? categoryData.thu_tu : 0)
                .input('danh_muc_cha_id', sql.UniqueIdentifier, categoryData.danh_muc_cha_id)
                .input('slug', sql.NVarChar(255), categoryData.slug)
                .query(`
                    INSERT INTO categories (ten_danh_muc, mo_ta, anh_url, thu_tu, danh_muc_cha_id, slug)
                    OUTPUT INSERTED.*
                    VALUES (@ten_danh_muc, @mo_ta, @anh_url, @thu_tu, @danh_muc_cha_id, @slug)
                `);
            return result.recordset[0];
        } catch (error) {
            console.error('SQL Category Error:', error);
            throw error;
        }
    }

    static async update(categoryId, updateData) {
        try {
            const request = new sql.Request();
            
            request.input('id', sql.UniqueIdentifier, categoryId);
            request.input('ten_danh_muc', sql.NVarChar(100), updateData.ten_danh_muc);
            request.input('mo_ta', sql.NVarChar(500), updateData.mo_ta || null);
            request.input('anh_url', sql.NVarChar(500), updateData.anh_url || null);
            request.input('thu_tu', sql.Int, updateData.thu_tu !== undefined ? updateData.thu_tu : 0);
            request.input('danh_muc_cha_id', sql.UniqueIdentifier, updateData.danh_muc_cha_id);
            request.input('trang_thai', sql.Int, updateData.trang_thai);
            request.input('updated_at', sql.DateTime, new Date());

            let slugCondition = '';
            
            if (updateData.slug) {
                request.input('slug', sql.NVarChar(255), updateData.slug);
                slugCondition = ', slug = @slug';
            }

            const query = `
                UPDATE categories 
                SET ten_danh_muc = @ten_danh_muc,
                    mo_ta = @mo_ta,
                    anh_url = @anh_url,
                    thu_tu = @thu_tu,
                    danh_muc_cha_id = @danh_muc_cha_id,
                    trang_thai = @trang_thai,
                    ngay_tao = @updated_at
                    ${slugCondition}
                WHERE id = @id;
                
                SELECT * FROM categories WHERE id = @id;
            `;

            console.log('🔄 Executing Category SQL Update Query:', query);
            
            const result = await request.query(query);
            
            if (!result.recordset || result.recordset.length === 0) {
                throw new Error('Không tìm thấy danh mục sau khi cập nhật');
            }

            return result.recordset[0];
            
        } catch (error) {
            console.error('❌ SQL Category Update Error:', error);
            
            if (error.message && error.message.includes('UNIQUE') || error.message.includes('slug')) {
                throw new Error('Slug đã tồn tại, vui lòng chọn tên khác');
            }
            
            throw error;
        }
    }

    static async destroy(conditions = {}) {
      try {
          const request = new sql.Request();
          let whereClause = '';
          const params = [];

          if (conditions.where && Object.keys(conditions.where).length > 0) {
              const whereConditions = [];
              let paramIndex = 0;

              Object.entries(conditions.where).forEach(([key, value]) => {
                  paramIndex++;
                  const paramName = `param${paramIndex}`;
                  
                  whereConditions.push(`${key} = @${paramName}`);
                  request.input(paramName, value);
                  
                  params.push({ name: paramName, value });
              });

              whereClause = `WHERE ${whereConditions.join(' AND ')}`;
          }

          // 1. Kiểm tra danh mục tồn tại
          const checkCategoryQuery = `
              SELECT id, ten_danh_muc 
              FROM categories 
              ${whereClause}
          `;

          console.log('🔍 Checking category existence:', checkCategoryQuery);
          const categoryResult = await request.query(checkCategoryQuery);
          
          if (!categoryResult.recordset || categoryResult.recordset.length === 0) {
              throw new Error('Không tìm thấy danh mục');
          }

          const category = categoryResult.recordset[0];
          const categoryId = category.id;

          // 2. Kiểm tra có sản phẩm nào thuộc danh mục này không
          const checkProductsQuery = `
              SELECT COUNT(*) as product_count 
              FROM products 
              WHERE danh_muc_id = @categoryId AND trang_thai = 1
          `;

          const productRequest = new sql.Request();
          productRequest.input('categoryId', sql.UniqueIdentifier, categoryId);
          
          const productResult = await productRequest.query(checkProductsQuery);
          const productCount = productResult.recordset[0].product_count;

          if (productCount > 0) {
              throw new Error(`Không thể xóa danh mục "${category.ten_danh_muc}" vì còn ${productCount} sản phẩm đang hoạt động thuộc danh mục này.`);
          }

          // 3. KIỂM TRA CÓ DANH MỤC CON KHÔNG (QUAN TRỌNG)
          const checkChildrenQuery = `
              SELECT COUNT(*) as children_count 
              FROM categories 
              WHERE danh_muc_cha_id = @categoryId AND trang_thai = 1
          `;

          const childrenRequest = new sql.Request();
          childrenRequest.input('categoryId', sql.UniqueIdentifier, categoryId);
          
          const childrenResult = await childrenRequest.query(checkChildrenQuery);
          const childrenCount = childrenResult.recordset[0].children_count;

          if (childrenCount > 0) {
              // Lấy thông tin chi tiết về các danh mục con
              const childrenDetailsQuery = `
                  SELECT ten_danh_muc, thu_tu 
                  FROM categories 
                  WHERE danh_muc_cha_id = @categoryId AND trang_thai = 1
                  ORDER BY thu_tu ASC
              `;
              
              const childrenDetailsRequest = new sql.Request();
              childrenDetailsRequest.input('categoryId', sql.UniqueIdentifier, categoryId);
              const childrenDetails = await childrenDetailsRequest.query(childrenDetailsQuery);
              
              const childrenNames = childrenDetails.recordset.map(child => child.ten_danh_muc).join(', ');
              
              throw new Error(`Không thể xóa danh mục "${category.ten_danh_muc}" vì còn ${childrenCount} danh mục con: ${childrenNames}. Vui lòng xóa hoặc chuyển các danh mục con trước.`);
          }

          // 4. Thực hiện xóa (soft delete)
          const deleteQuery = `
              UPDATE categories 
              SET 
                  trang_thai = 0,
                  ngay_tao = GETDATE()
              ${whereClause};
              
              SELECT * FROM categories ${whereClause};
          `;

          console.log('🗑️ Executing category soft delete query:', deleteQuery);
          const deleteResult = await request.query(deleteQuery);

          if (!deleteResult.recordset || deleteResult.recordset.length === 0) {
              throw new Error('Không tìm thấy danh mục sau khi xóa');
          }

          console.log(`✅ Đã vô hiệu hóa danh mục: ${category.ten_danh_muc}`);
          return deleteResult.recordset[0];

      } catch (error) {
          console.error('❌ SQL Category Destroy Error:', error);
          
          if (error.message.includes('Không thể xóa danh mục')) {
              throw error;
          }
          
          if (error.message.includes('Không tìm thấy danh mục')) {
              throw new Error('Không tìm thấy danh mục để xóa');
          }
          
          throw new Error('Lỗi khi xóa danh mục: ' + error.message);
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
        

      `);
      // WHERE p.trang_thai = 1
      // ORDER BY p.ngay_tao DESC
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
        .input('link_anh', sql.NVarChar(500), productData.link_anh)
        .query(`
          INSERT INTO products (ma_sku, ten_san_pham, danh_muc_id, thuong_hieu_id, gia_niem_yet, gia_ban, mongo_detail_id, link_anh)
          OUTPUT INSERTED.*
          VALUES (@ma_sku, @ten_san_pham, @danh_muc_id, @thuong_hieu_id, @gia_niem_yet, @gia_ban, @mongo_detail_id, @link_anh)
        `);
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Product Error:', error);
      throw error;
    }
  }
  static async update(productData, id) {
    try {
        console.log('🔍 Updating Product ID:', id);
        console.log('📦 Product Data:', JSON.stringify(productData, null, 2));
        const request = new sql.Request();
        
        // Thêm id vào parameters
        request.input('id', sql.UniqueIdentifier, id);
        
        // Xây dựng SET clause đơn giản
        const setClauses = [];
        const params = {};
          
        // Chỉ cần duyệt qua các field trong productData
        Object.keys(productData).forEach(key => {
            if (productData[key] !== undefined && productData[key] !== null) {
                setClauses.push(`${key} = @${key}`);
                
                // Xử lý kiểu dữ liệu cơ bản
                if (key === 'danh_muc_id' || key === 'thuong_hieu_id') {
                    request.input(key, sql.UniqueIdentifier, productData[key]);
                } else if (key.includes('gia')) {
                    request.input(key, sql.Decimal(15, 2), productData[key]);
                } else if (key === 'trang_thai' || key === 'so_luong_ton' || key === 'luot_xem' || key === 'so_luong_ban') {
                    request.input(key, sql.Int, productData[key]);
                } else if (key === 'san_pham_noi_bat') {
                    request.input(key, sql.Bit, productData[key] ? 1 : 0);
                } else {
                    request.input(key, sql.NVarChar(sql.MAX), productData[key]);
                }
            }
        });
        
        // Thêm ngày cập nhật
        setClauses.push('ngay_cap_nhat = GETDATE()');
        
        const sqlQuery = `
            UPDATE products 
            SET ${setClauses.join(', ')}
            WHERE id = @id
        `;
        
        console.log('📝 Update Query:', sqlQuery);
        
        const result = await request.query(sqlQuery);
        
        // Trả về sản phẩm đã được cập nhật
        return await this.findById(id);
        
    } catch (error) {
        console.error('❌ SQL Product Update Error:', error);
        throw error;
    }
  }
}

// Model cho Flash Sale trong SQL Server
class SQLFlashSaleModel {
  static async findAll(filters = {}) {
    try {
      const request = new sql.Request();
      let whereClause = 'WHERE 1=1';
      
      if (filters.trang_thai) {
        request.input('trang_thai', sql.NVarChar(20), filters.trang_thai);
        whereClause += ' AND fs.trang_thai = @trang_thai';
      }
      
      if (filters.search) {
        request.input('search', sql.NVarChar(255), `%${filters.search}%`);
        whereClause += ' AND fs.ten_flash_sale LIKE @search';
      }
      
      const query = `
        SELECT 
          fs.*,
          (SELECT COUNT(*) FROM flash_sale_items WHERE flash_sale_id = fs.id) as so_san_pham,
          (SELECT ISNULL(SUM(da_ban), 0) FROM flash_sale_items WHERE flash_sale_id = fs.id) as tong_da_ban,
          (SELECT ISNULL(SUM(da_ban * gia_flash_sale), 0) FROM flash_sale_items WHERE flash_sale_id = fs.id) as doanh_thu
        FROM flash_sales fs
        ${whereClause}
        ORDER BY fs.ngay_tao DESC
      `;
      
      const result = await request.query(query);
      return result.recordset;
    } catch (error) {
      console.error('SQL Flash Sale Error:', error);
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
            fs.*,
            (SELECT COUNT(*) FROM flash_sale_items WHERE flash_sale_id = fs.id) as so_san_pham,
            (SELECT ISNULL(SUM(da_ban), 0) FROM flash_sale_items WHERE flash_sale_id = fs.id) as tong_da_ban,
            (SELECT ISNULL(SUM(da_ban * gia_flash_sale), 0) FROM flash_sale_items WHERE flash_sale_id = fs.id) as doanh_thu
          FROM flash_sales fs
          WHERE fs.id = @id
        `);
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Flash Sale Error:', error);
      throw error;
    }
  }

  static async create(flashSaleData) {
    try {
      const request = new sql.Request();
      request
        .input('ten_flash_sale', sql.NVarChar(255), flashSaleData.ten_flash_sale)
        .input('mo_ta', sql.NVarChar(500), flashSaleData.mo_ta || null)
        .input('ngay_bat_dau', sql.DateTime2, new Date(flashSaleData.ngay_bat_dau))
        .input('ngay_ket_thuc', sql.DateTime2, new Date(flashSaleData.ngay_ket_thuc))
        .input('trang_thai', sql.NVarChar(20), flashSaleData.trang_thai || 'cho');
      
      // Chỉ thêm nguoi_tao nếu có giá trị hợp lệ
      if (flashSaleData.nguoi_tao) {
        request.input('nguoi_tao', sql.UniqueIdentifier, flashSaleData.nguoi_tao);
      }
      
      const query = flashSaleData.nguoi_tao
        ? `INSERT INTO flash_sales (ten_flash_sale, mo_ta, ngay_bat_dau, ngay_ket_thuc, trang_thai, nguoi_tao)
           OUTPUT INSERTED.*
           VALUES (@ten_flash_sale, @mo_ta, @ngay_bat_dau, @ngay_ket_thuc, @trang_thai, @nguoi_tao)`
        : `INSERT INTO flash_sales (ten_flash_sale, mo_ta, ngay_bat_dau, ngay_ket_thuc, trang_thai)
           OUTPUT INSERTED.*
           VALUES (@ten_flash_sale, @mo_ta, @ngay_bat_dau, @ngay_ket_thuc, @trang_thai)`;
      
      const result = await request.query(query);
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Flash Sale Create Error:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const request = new sql.Request();
      request.input('id', sql.UniqueIdentifier, id);
      
      // Build dynamic UPDATE query
      const updates = [];
      
      if (updateData.ten_flash_sale !== undefined) {
        request.input('ten_flash_sale', sql.NVarChar(255), updateData.ten_flash_sale);
        updates.push('ten_flash_sale = @ten_flash_sale');
      }
      
      if (updateData.mo_ta !== undefined) {
        request.input('mo_ta', sql.NVarChar(500), updateData.mo_ta || null);
        updates.push('mo_ta = @mo_ta');
      }
      
      if (updateData.ngay_bat_dau !== undefined) {
        request.input('ngay_bat_dau', sql.DateTime2, new Date(updateData.ngay_bat_dau));
        updates.push('ngay_bat_dau = @ngay_bat_dau');
      }
      
      if (updateData.ngay_ket_thuc !== undefined) {
        request.input('ngay_ket_thuc', sql.DateTime2, new Date(updateData.ngay_ket_thuc));
        updates.push('ngay_ket_thuc = @ngay_ket_thuc');
      }
      
      if (updateData.trang_thai !== undefined) {
        request.input('trang_thai', sql.NVarChar(20), updateData.trang_thai);
        updates.push('trang_thai = @trang_thai');
      }
      
      if (updateData.mongo_flash_sale_detail_id !== undefined) {
        request.input('mongo_flash_sale_detail_id', sql.NVarChar(255), updateData.mongo_flash_sale_detail_id);
        updates.push('mongo_flash_sale_detail_id = @mongo_flash_sale_detail_id');
      }
      
      if (updates.length === 0) {
        throw new Error('No fields to update');
      }
      
      updates.push('ngay_cap_nhat = GETDATE()');
      
      const result = await request.query(`
        UPDATE flash_sales 
        SET ${updates.join(', ')}
        WHERE id = @id;
        
        SELECT * FROM flash_sales WHERE id = @id;
      `);
      
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Flash Sale Update Error:', error);
      throw error;
    }
  }

  static async destroy(id) {
    try {
      const request = new sql.Request();
      await request
        .input('id', sql.UniqueIdentifier, id)
        .query('DELETE FROM flash_sales WHERE id = @id');
      return { success: true };
    } catch (error) {
      console.error('SQL Flash Sale Delete Error:', error);
      throw error;
    }
  }
}

// Model cho Flash Sale Items
class SQLFlashSaleItemModel {
  static async findByFlashSaleId(flashSaleId) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('flashSaleId', sql.UniqueIdentifier, flashSaleId)
        .query(`
          SELECT 
            fsi.*,
            p.ten_san_pham,
            p.link_anh
          FROM flash_sale_items fsi
          INNER JOIN products p ON fsi.san_pham_id = p.id
          WHERE fsi.flash_sale_id = @flashSaleId
          ORDER BY fsi.thu_tu ASC, fsi.ngay_tao DESC
        `);
      return result.recordset;
    } catch (error) {
      console.error('SQL Flash Sale Items Error:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('id', sql.UniqueIdentifier, id)
        .query('SELECT * FROM flash_sale_items WHERE id = @id');
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Flash Sale Item Error:', error);
      throw error;
    }
  }

  static async create(itemData) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('flash_sale_id', sql.UniqueIdentifier, itemData.flash_sale_id)
        .input('san_pham_id', sql.UniqueIdentifier, itemData.san_pham_id)
        .input('gia_goc', sql.Decimal(15, 2), itemData.gia_goc)
        .input('gia_flash_sale', sql.Decimal(15, 2), itemData.gia_flash_sale)
        .input('so_luong_ton', sql.Int, itemData.so_luong_ton)
        .input('gioi_han_mua', sql.Int, itemData.gioi_han_mua || null)
        .input('thu_tu', sql.Int, itemData.thu_tu || 0)
        .input('trang_thai', sql.NVarChar(20), itemData.trang_thai || 'dang_ban')
        .query(`
          INSERT INTO flash_sale_items 
          (flash_sale_id, san_pham_id, gia_goc, gia_flash_sale, so_luong_ton, gioi_han_mua, thu_tu, trang_thai)
          OUTPUT INSERTED.*
          VALUES (@flash_sale_id, @san_pham_id, @gia_goc, @gia_flash_sale, @so_luong_ton, @gioi_han_mua, @thu_tu, @trang_thai)
        `);
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Flash Sale Item Create Error:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const request = new sql.Request();
      request.input('id', sql.UniqueIdentifier, id);
      request.input('gia_goc', sql.Decimal(15, 2), updateData.gia_goc);
      request.input('gia_flash_sale', sql.Decimal(15, 2), updateData.gia_flash_sale);
      request.input('so_luong_ton', sql.Int, updateData.so_luong_ton);
      request.input('gioi_han_mua', sql.Int, updateData.gioi_han_mua || null);
      request.input('thu_tu', sql.Int, updateData.thu_tu || 0);
      request.input('trang_thai', sql.NVarChar(20), updateData.trang_thai);
      
      const result = await request.query(`
        UPDATE flash_sale_items 
        SET 
          gia_goc = @gia_goc,
          gia_flash_sale = @gia_flash_sale,
          so_luong_ton = @so_luong_ton,
          gioi_han_mua = @gioi_han_mua,
          thu_tu = @thu_tu,
          trang_thai = @trang_thai,
          ngay_cap_nhat = GETDATE()
        WHERE id = @id;
        
        SELECT * FROM flash_sale_items WHERE id = @id;
      `);
      
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Flash Sale Item Update Error:', error);
      throw error;
    }
  }

  static async destroy(id) {
    try {
      const request = new sql.Request();
      await request
        .input('id', sql.UniqueIdentifier, id)
        .query('DELETE FROM flash_sale_items WHERE id = @id');
      return { success: true };
    } catch (error) {
      console.error('SQL Flash Sale Item Delete Error:', error);
      throw error;
    }
  }
}

// ==================== EXPORT ALL MODELS ====================

export default {
  // MongoDB Models
  Data_ProductDetail_Model,
  
  // SQL Server Models
  SQLBrandModel,
  SQLCategoryModel,
  SQLProductModel,
  SQLFlashSaleModel,
  SQLFlashSaleItemModel,
  
  // Hoặc export theo nhóm để dễ sử dụng
  Mongo: {
    ProductDetail: Data_ProductDetail_Model, 
    FlashSaleDetail: Data_FlashSaleDetail_Model
  },
  
  SQL: {
    Brand: SQLBrandModel,
    Category: SQLCategoryModel,
    Product: SQLProductModel,
    FlashSale: SQLFlashSaleModel,
    FlashSaleItem: SQLFlashSaleItemModel
  }
};