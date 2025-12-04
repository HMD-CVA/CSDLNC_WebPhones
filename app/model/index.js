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

const userDetailSchema = new mongoose.Schema({
  sql_user_id: { type: String, required: true, unique: true },
}, {
  strict: false, // Cho phép lưu các trường không được định nghĩa
  timestamps: true
});
const Data_UserDetail_Model = mongoose.model('UserDetail', userDetailSchema);

// Voucher Detail Schema
const voucherDetailSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // UUID từ SQL vouchers.id
  usage_history: [{
    user_id: String,
    order_id: String,
    used_at: Date,
    discount_amount: Number,
    order_amount: Number
  }],
  user_restrictions: {
    eligible_user_groups: { type: [String], default: ['all'] },
    excluded_users: [String],
    max_uses_per_user: { type: Number, default: 1 },
    first_order_only: { type: Boolean, default: false }
  },
  combination_rules: {
    can_combine_with_other_vouchers: { type: Boolean, default: false },
    can_combine_with_flash_sale: { type: Boolean, default: true },
    can_combine_with_promotions: { type: Boolean, default: false },
    priority: { type: Number, default: 0 }
  },
  analytics: {
    total_views: { type: Number, default: 0 },
    total_uses: { type: Number, default: 0 },
    total_revenue_impact: { type: Number, default: 0 },
    total_discount_given: { type: Number, default: 0 },
    conversion_rate: { type: Number, default: 0 },
    average_order_value: { type: Number, default: 0 }
  },
  notification_settings: {
    notify_when_near_expiry: { type: Boolean, default: true },
    days_before_expiry: { type: Number, default: 3 },
    notify_when_limited_stock: { type: Boolean, default: true },
    stock_threshold: { type: Number, default: 10 },
    send_email_on_use: { type: Boolean, default: false }
  },
  marketing: {
    campaign_name: String,
    campaign_id: String,
    affiliate_code: String,
    source: String
  },
  custom_data: mongoose.Schema.Types.Mixed,
  notes: String,
  tags: [String]
}, { 
  _id: false, // Tắt auto-generate _id vì đã tự định nghĩa
  strict: false, // Cho phép lưu các trường không được định nghĩa
  timestamps: true 
});

// Thêm static methods cho VoucherDetail
voucherDetailSchema.statics.findByVoucherId = async function(voucherId) {
  return await this.findById(voucherId);
};

voucherDetailSchema.statics.createOrUpdate = async function(voucherId, detailData) {
  return await this.findByIdAndUpdate(
    voucherId,
    { $set: { ...detailData, _id: voucherId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

voucherDetailSchema.statics.deleteById = async function(voucherId) {
  return await this.findByIdAndDelete(voucherId);
};

voucherDetailSchema.statics.trackUsage = async function(voucherId, usageData) {
  return await this.findByIdAndUpdate(
    voucherId,
    { 
      $push: { usage_history: usageData },
      $inc: { 
        'analytics.total_uses': 1,
        'analytics.total_discount_given': usageData.discount_amount || 0,
        'analytics.total_revenue_impact': usageData.order_amount || 0
      }
    },
    { new: true }
  );
};

const Data_VoucherDetail_Model = mongoose.model('VoucherDetail', voucherDetailSchema);

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
  // Lấy flash sale items theo flash_sale_id
  static async findByFlashSaleId(flashSaleId) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('flashSaleId', sql.UniqueIdentifier, flashSaleId)
        .query(`
          SELECT 
            id,
            flash_sale_id,
            san_pham_id,
            gia_goc,
            gia_flash_sale,
            so_luong_ton,
            da_ban,
            gioi_han_mua
          FROM flash_sale_items
          WHERE flash_sale_id = @flashSaleId
          ORDER BY id
        `);
      return result.recordset;
    } catch (error) {
      console.error('SQL Flash Sale Items Error:', error);
      throw error;
    }
  }

  // Tìm tất cả flash sale items đang active của 1 sản phẩm (có thể nhiều variants)
  static async findActiveByProductId(productId) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('productId', sql.UniqueIdentifier, productId)
        .query(`
          SELECT 
            fsi.*,
            fs.ten_flash_sale,
            fs.ngay_bat_dau,
            fs.ngay_ket_thuc,
            i.mau_sac,
            i.dung_luong,
            i.so_luong_kha_dung as ton_kho_variant
          FROM flash_sale_items fsi
          INNER JOIN flash_sales fs ON fsi.flash_sale_id = fs.id
          INNER JOIN inventory i ON fsi.inventory_id = i.id
          WHERE i.san_pham_id = @productId
            AND fs.trang_thai = 'dang_dien_ra'
            AND fs.ngay_bat_dau <= GETDATE()
            AND fs.ngay_ket_thuc > GETDATE()
            AND fsi.trang_thai = 'dang_ban'
            AND (fsi.so_luong_ton - fsi.da_ban) > 0
          ORDER BY fs.ngay_bat_dau DESC, i.mau_sac, i.dung_luong
        `);
      return result.recordset; // Trả về array thay vì 1 item
    } catch (error) {
      console.error('SQL Flash Sale Item findActiveByProductId Error:', error);
      throw error;
    }
  }

  // Tìm flash sale item theo inventory_id cụ thể
  static async findActiveByInventoryId(inventoryId) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('inventoryId', sql.UniqueIdentifier, inventoryId)
        .query(`
          SELECT TOP 1
            fsi.*,
            fs.ten_flash_sale,
            fs.ngay_bat_dau,
            fs.ngay_ket_thuc
          FROM flash_sale_items fsi
          INNER JOIN flash_sales fs ON fsi.flash_sale_id = fs.id
          WHERE fsi.inventory_id = @inventoryId
            AND fs.trang_thai = 'dang_dien_ra'
            AND fs.ngay_bat_dau <= GETDATE()
            AND fs.ngay_ket_thuc > GETDATE()
            AND fsi.trang_thai = 'dang_ban'
            AND (fsi.so_luong_ton - fsi.da_ban) > 0
          ORDER BY fs.ngay_bat_dau DESC
        `);
      return result.recordset[0] || null;
    } catch (error) {
      console.error('SQL Flash Sale Item findActiveByInventoryId Error:', error);
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
      
      // Lấy san_pham_id từ inventory_id
      const inventoryResult = await request
        .input('inventory_id', sql.UniqueIdentifier, itemData.inventory_id)
        .query('SELECT san_pham_id FROM inventory WHERE id = @inventory_id');
      
      if (!inventoryResult.recordset || inventoryResult.recordset.length === 0) {
        throw new Error('Không tìm thấy inventory');
      }
      
      const sanPhamId = inventoryResult.recordset[0].san_pham_id;
      
      const request2 = new sql.Request();
      const result = await request2
        .input('flash_sale_id', sql.UniqueIdentifier, itemData.flash_sale_id)
        .input('san_pham_id', sql.UniqueIdentifier, sanPhamId)
        .input('inventory_id', sql.UniqueIdentifier, itemData.inventory_id)
        .input('gia_goc', sql.Decimal(15, 2), itemData.gia_goc)
        .input('gia_flash_sale', sql.Decimal(15, 2), itemData.gia_flash_sale)
        .input('so_luong_ton', sql.Int, itemData.so_luong_ton)
        .input('gioi_han_mua', sql.Int, itemData.gioi_han_mua || null)
        .input('thu_tu', sql.Int, itemData.thu_tu || 0)
        .input('trang_thai', sql.NVarChar(20), itemData.trang_thai || 'dang_ban')
        .query(`
          INSERT INTO flash_sale_items 
          (flash_sale_id, san_pham_id, inventory_id, gia_goc, gia_flash_sale, so_luong_ton, gioi_han_mua, thu_tu, trang_thai)
          OUTPUT INSERTED.*
          VALUES (@flash_sale_id, @san_pham_id, @inventory_id, @gia_goc, @gia_flash_sale, @so_luong_ton, @gioi_han_mua, @thu_tu, @trang_thai)
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

  static async increaseSold(id, quantity) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('id', sql.UniqueIdentifier, id)
        .input('quantity', sql.Int, quantity)
        .query(`
          UPDATE flash_sale_items
          SET da_ban = da_ban + @quantity,
              ngay_cap_nhat = GETDATE()
          WHERE id = @id AND (so_luong_ton - da_ban) >= @quantity;
          
          SELECT * FROM flash_sale_items WHERE id = @id;
        `);
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Flash Sale Item increaseSold Error:', error);
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

// Model cho Region trong SQL Server
class SQLRegionModel {
  static async findAll() {
    try {
      const request = new sql.Request();
      const result = await request.query(`
        SELECT 
          r.*,
          (SELECT COUNT(*) FROM provinces WHERE vung_id = r.ma_vung AND trang_thai = 1) as so_tinh
        FROM regions r
        ORDER BY r.ma_vung ASC
      `);
      return result.recordset;
    } catch (error) {
      console.error('SQL Region Error:', error);
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
            r.*,
            (SELECT COUNT(*) FROM provinces WHERE vung_id = r.ma_vung AND trang_thai = 1) as so_tinh
          FROM regions r
          WHERE r.id = @id
        `);
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Region Error:', error);
      throw error;
    }
  }

  static async create(regionData) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('ma_vung', sql.NVarChar(50), regionData.ma_vung)
        .input('ten_vung', sql.NVarChar(100), regionData.ten_vung)
        .input('mo_ta', sql.NVarChar(500), regionData.mo_ta || null)
        .input('trang_thai', sql.Int, regionData.trang_thai !== undefined ? regionData.trang_thai : 1)
        .query(`
          INSERT INTO regions (ma_vung, ten_vung, mo_ta, trang_thai)
          OUTPUT INSERTED.*
          VALUES (@ma_vung, @ten_vung, @mo_ta, @trang_thai)
        `);
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Region Create Error:', error);
      if (error.message && error.message.includes('UNIQUE')) {
        throw new Error('Mã vùng đã tồn tại');
      }
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const request = new sql.Request();
      request.input('id', sql.UniqueIdentifier, id);
      request.input('ma_vung', sql.NVarChar(50), updateData.ma_vung);
      request.input('ten_vung', sql.NVarChar(100), updateData.ten_vung);
      request.input('mo_ta', sql.NVarChar(500), updateData.mo_ta || null);
      request.input('trang_thai', sql.Int, updateData.trang_thai);

      const result = await request.query(`
        UPDATE regions 
        SET 
          ma_vung = @ma_vung,
          ten_vung = @ten_vung,
          mo_ta = @mo_ta,
          trang_thai = @trang_thai
        WHERE id = @id;
        
        SELECT 
          r.*,
          (SELECT COUNT(*) FROM provinces WHERE vung_id = r.ma_vung AND trang_thai = 1) as so_tinh
        FROM regions r
        WHERE r.id = @id;
      `);

      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('Không tìm thấy vùng miền');
      }

      return result.recordset[0];
    } catch (error) {
      console.error('SQL Region Update Error:', error);
      if (error.message && error.message.includes('UNIQUE')) {
        throw new Error('Mã vùng đã tồn tại');
      }
      throw error;
    }
  }

  static async delete(id) {
    try {
      const request = new sql.Request();
      
      // Lấy ma_vung từ id
      const regionResult = await request
        .input('id', sql.UniqueIdentifier, id)
        .query('SELECT ma_vung FROM regions WHERE id = @id');
      
      if (!regionResult.recordset || regionResult.recordset.length === 0) {
        throw new Error('Không tìm thấy vùng miền');
      }
      
      const maVung = regionResult.recordset[0].ma_vung;
      
      // Kiểm tra có tỉnh/thành thuộc vùng này không
      const checkRequest = new sql.Request();
      const checkProvinces = await checkRequest
        .input('ma_vung', sql.NVarChar(10), maVung)
        .query(`
          SELECT COUNT(*) as count 
          FROM provinces 
          WHERE vung_id = @ma_vung AND trang_thai = 1
        `);

      if (checkProvinces.recordset[0].count > 0) {
        throw new Error('Không thể xóa vùng miền vì còn tỉnh/thành thuộc vùng này');
      }

      // Xóa vùng miền
      const deleteRequest = new sql.Request();
      await deleteRequest
        .input('id', sql.UniqueIdentifier, id)
        .query('DELETE FROM regions WHERE id = @id');

      return { success: true };
    } catch (error) {
      console.error('SQL Region Delete Error:', error);
      throw error;
    }
  }
}

// Model cho Province trong SQL Server
class SQLProvinceModel {
  static async findAll(filters = {}) {
    try {
      const request = new sql.Request();
      let whereClause = 'WHERE p.trang_thai = 1';

      if (filters.vung_id) {
        request.input('vung_id', sql.UniqueIdentifier, filters.vung_id);
        whereClause += ' AND p.vung_id = @vung_id';
      }

      if (filters.trang_thai !== undefined) {
        whereClause = whereClause.replace('WHERE p.trang_thai = 1', 'WHERE 1=1');
        request.input('trang_thai', sql.Int, filters.trang_thai);
        whereClause += ' AND p.trang_thai = @trang_thai';
      }

      const result = await request.query(`
        SELECT 
          p.*,
          r.ten_vung,
          (SELECT COUNT(*) FROM wards WHERE tinh_thanh_id = p.id AND trang_thai = 1) as so_phuong_xa
        FROM provinces p
        INNER JOIN regions r ON p.vung_id = r.ma_vung
        ${whereClause}
        ORDER BY p.thu_tu_uu_tien DESC, p.ten_tinh ASC
      `);
      return result.recordset;
    } catch (error) {
      console.error('SQL Province Error:', error);
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
            r.ten_vung,
            (SELECT COUNT(*) FROM wards WHERE tinh_thanh_id = p.id AND trang_thai = 1) as so_phuong_xa
          FROM provinces p
          INNER JOIN regions r ON p.vung_id = r.ma_vung
          WHERE p.id = @id
        `);
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Province Error:', error);
      throw error;
    }
  }

  static async create(provinceData) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('ma_tinh', sql.NVarChar(50), provinceData.ma_tinh)
        .input('ten_tinh', sql.NVarChar(100), provinceData.ten_tinh)
        .input('vung_id', sql.NVarChar(10), provinceData.vung_id)
        .input('is_major_city', sql.Bit, provinceData.is_major_city || 0)
        .input('thu_tu_uu_tien', sql.Int, provinceData.thu_tu_uu_tien || 0)
        .input('trang_thai', sql.Bit, provinceData.trang_thai !== undefined ? provinceData.trang_thai : 1)
        .query(`
          INSERT INTO provinces (ma_tinh, ten_tinh, vung_id, is_major_city, thu_tu_uu_tien, trang_thai)
          OUTPUT INSERTED.*
          VALUES (@ma_tinh, @ten_tinh, @vung_id, @is_major_city, @thu_tu_uu_tien, @trang_thai)
        `);
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Province Create Error:', error);
      if (error.message && error.message.includes('UNIQUE')) {
        throw new Error('Mã tỉnh đã tồn tại');
      }
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const request = new sql.Request();
      request.input('id', sql.UniqueIdentifier, id);
      request.input('ma_tinh', sql.NVarChar(50), updateData.ma_tinh);
      request.input('ten_tinh', sql.NVarChar(100), updateData.ten_tinh);
      request.input('vung_id', sql.NVarChar(10), updateData.vung_id);
      request.input('is_major_city', sql.Bit, updateData.is_major_city || 0);
      request.input('thu_tu_uu_tien', sql.Int, updateData.thu_tu_uu_tien || 0);
      request.input('trang_thai', sql.Bit, updateData.trang_thai);

      const result = await request.query(`
        UPDATE provinces 
        SET 
          ma_tinh = @ma_tinh,
          ten_tinh = @ten_tinh,
          vung_id = @vung_id,
          is_major_city = @is_major_city,
          thu_tu_uu_tien = @thu_tu_uu_tien,
          trang_thai = @trang_thai
        WHERE id = @id;
        
        SELECT 
          p.*,
          r.ten_vung,
          (SELECT COUNT(*) FROM wards WHERE tinh_thanh_id = p.id AND trang_thai = 1) as so_phuong_xa
        FROM provinces p
        INNER JOIN regions r ON p.vung_id = r.ma_vung
        WHERE p.id = @id;
      `);

      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('Không tìm thấy tỉnh/thành');
      }

      return result.recordset[0];
    } catch (error) {
      console.error('SQL Province Update Error:', error);
      if (error.message && error.message.includes('UNIQUE')) {
        throw new Error('Mã tỉnh đã tồn tại');
      }
      throw error;
    }
  }

  static async delete(id) {
    try {
      const request = new sql.Request();
      
      // Kiểm tra có phường/xã thuộc tỉnh này không
      const checkWards = await request
        .input('id', sql.UniqueIdentifier, id)
        .query(`
          SELECT COUNT(*) as count 
          FROM wards 
          WHERE tinh_thanh_id = @id AND trang_thai = 1
        `);

      if (checkWards.recordset[0].count > 0) {
        throw new Error('Không thể xóa tỉnh/thành vì còn phường/xã thuộc tỉnh này');
      }

      // Xóa tỉnh/thành
      const deleteRequest = new sql.Request();
      await deleteRequest
        .input('id', sql.UniqueIdentifier, id)
        .query('DELETE FROM provinces WHERE id = @id');

      return { success: true };
    } catch (error) {
      console.error('SQL Province Delete Error:', error);
      throw error;
    }
  }
}

// Model cho Ward trong SQL Server
class SQLWardModel {
  static async findAll(filters = {}) {
    try {
      const request = new sql.Request();
      let whereClause = 'WHERE w.trang_thai = 1';

      if (filters.tinh_thanh_id) {
        request.input('tinh_thanh_id', sql.UniqueIdentifier, filters.tinh_thanh_id);
        whereClause += ' AND w.tinh_thanh_id = @tinh_thanh_id';
      }

      if (filters.loai) {
        request.input('loai', sql.NVarChar(50), filters.loai);
        whereClause += ' AND w.loai = @loai';
      }

      if (filters.trang_thai !== undefined) {
        whereClause = whereClause.replace('WHERE w.trang_thai = 1', 'WHERE 1=1');
        request.input('trang_thai', sql.Int, filters.trang_thai);
        whereClause += ' AND w.trang_thai = @trang_thai';
      }

      const result = await request.query(`
        SELECT 
          w.*,
          p.ten_tinh,
          r.ten_vung
        FROM wards w
        INNER JOIN provinces p ON w.tinh_thanh_id = p.id
        INNER JOIN regions r ON p.vung_id = r.ma_vung
        ${whereClause}
        ORDER BY p.ten_tinh ASC, w.ten_phuong_xa ASC
      `);
      return result.recordset;
    } catch (error) {
      console.error('SQL Ward Error:', error);
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
            w.*,
            p.ten_tinh,
            r.ten_vung
          FROM wards w
          INNER JOIN provinces p ON w.tinh_thanh_id = p.id
          INNER JOIN regions r ON p.vung_id = r.ma_vung
          WHERE w.id = @id
        `);
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Ward Error:', error);
      throw error;
    }
  }

  static async create(wardData) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('ma_phuong_xa', sql.NVarChar(50), wardData.ma_phuong_xa)
        .input('ten_phuong_xa', sql.NVarChar(100), wardData.ten_phuong_xa)
        .input('tinh_thanh_id', sql.UniqueIdentifier, wardData.tinh_thanh_id)
        .input('loai', sql.NVarChar(50), wardData.loai)
        .input('is_inner_area', sql.Bit, wardData.is_inner_area || 0)
        .input('trang_thai', sql.Bit, wardData.trang_thai !== undefined ? wardData.trang_thai : 1)
        .query(`
          INSERT INTO wards (ma_phuong_xa, ten_phuong_xa, tinh_thanh_id, loai, is_inner_area, trang_thai)
          OUTPUT INSERTED.*
          VALUES (@ma_phuong_xa, @ten_phuong_xa, @tinh_thanh_id, @loai, @is_inner_area, @trang_thai)
        `);
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Ward Create Error:', error);
      if (error.message && error.message.includes('UNIQUE')) {
        throw new Error('Mã phường/xã đã tồn tại');
      }
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const request = new sql.Request();
      request.input('id', sql.UniqueIdentifier, id);
      request.input('ma_phuong_xa', sql.NVarChar(50), updateData.ma_phuong_xa);
      request.input('ten_phuong_xa', sql.NVarChar(100), updateData.ten_phuong_xa);
      request.input('tinh_thanh_id', sql.UniqueIdentifier, updateData.tinh_thanh_id);
      request.input('loai', sql.NVarChar(50), updateData.loai);
      request.input('is_inner_area', sql.Bit, updateData.is_inner_area || 0);
      request.input('trang_thai', sql.Bit, updateData.trang_thai);

      const result = await request.query(`
        UPDATE wards 
        SET 
          ma_phuong_xa = @ma_phuong_xa,
          ten_phuong_xa = @ten_phuong_xa,
          tinh_thanh_id = @tinh_thanh_id,
          loai = @loai,
          is_inner_area = @is_inner_area,
          trang_thai = @trang_thai
        WHERE id = @id;
        
        SELECT 
          w.*,
          p.ten_tinh,
          r.ten_vung
        FROM wards w
        INNER JOIN provinces p ON w.tinh_thanh_id = p.id
        INNER JOIN regions r ON p.vung_id = r.ma_vung
        WHERE w.id = @id;
      `);

      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('Không tìm thấy phường/xã');
      }

      return result.recordset[0];
    } catch (error) {
      console.error('SQL Ward Update Error:', error);
      if (error.message && error.message.includes('UNIQUE')) {
        throw new Error('Mã phường/xã đã tồn tại');
      }
      throw error;
    }
  }

  static async delete(id) {
    try {
      const request = new sql.Request();
      await request
        .input('id', sql.UniqueIdentifier, id)
        .query('DELETE FROM wards WHERE id = @id');

      return { success: true };
    } catch (error) {
      console.error('SQL Ward Delete Error:', error);
      throw error;
    }
  }
}

// Model cho User trong SQL Server
class SQLUserModel {
  static async findAll(filters = {}) {
    try {
      const request = new sql.Request();
      let whereConditions = [];
      
      if (filters.status !== undefined) {
        request.input('status', sql.Bit, filters.status);
        whereConditions.push('u.trang_thai = @status');
      }
      
      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
      
      const query = `
        SELECT 
          u.id,
          u.ho_ten as name,
          u.email,
          u.so_dien_thoai as phone,
          u.vung_id,
          u.mongo_profile_id,
          u.trang_thai as status,
          u.ngay_dang_ky as created_at,
          u.ngay_cap_nhat as updated_at
        FROM users u
        ${whereClause}
        ORDER BY u.ngay_dang_ky DESC
      `;
      
      const result = await request.query(query);
      return result.recordset;
    } catch (error) {
      console.error('SQL User findAll Error:', error);
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
            u.id,
            u.ho_ten as name,
            u.email,
            u.so_dien_thoai as phone,
            u.vung_id,
            u.mongo_profile_id,
            u.trang_thai as status,
            u.ngay_dang_ky as created_at,
            u.ngay_cap_nhat as updated_at
          FROM users u
          WHERE u.id = @id
        `);
      return result.recordset[0];
    } catch (error) {
      console.error('SQL User findById Error:', error);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('email', sql.NVarChar(255), email)
        .query(`
          SELECT 
            u.id,
            u.ho_ten as name,
            u.email,
            u.so_dien_thoai as phone,
            u.vung_id,
            u.trang_thai as status,
            u.ngay_dang_ky as created_at,
            u.ngay_cap_nhat as updated_at
          FROM users u
          WHERE u.email = @email
        `);
      return result.recordset[0];
    } catch (error) {
      console.error('SQL User findByEmail Error:', error);
      throw error;
    }
  }

  static async create(userData) {
    try {
      const request = new sql.Request();
      
      request.input('ho_ten', sql.NVarChar(100), userData.name);
      request.input('email', sql.NVarChar(255), userData.email);
      request.input('so_dien_thoai', sql.NVarChar(20), userData.phone || null);
      request.input('mat_khau', sql.NVarChar(255), userData.password); // Should be hashed
      request.input('vung_id', sql.NVarChar(10), userData.vung_id || 'bac');
      request.input('trang_thai', sql.Bit, userData.status !== undefined ? userData.status : 1);
      
      const result = await request.query(`
        INSERT INTO users (ho_ten, email, so_dien_thoai, mat_khau, vung_id, trang_thai)
        OUTPUT INSERTED.id, INSERTED.ho_ten as name, INSERTED.email, 
               INSERTED.so_dien_thoai as phone, INSERTED.vung_id,
               INSERTED.trang_thai as status, INSERTED.ngay_dang_ky as created_at
        VALUES (@ho_ten, @email, @so_dien_thoai, @mat_khau, @vung_id, @trang_thai)
      `);
      return result.recordset[0];
    } catch (error) {
      console.error('SQL User create Error:', error);
      if (error.message && error.message.includes('UNIQUE')) {
        throw new Error('Email đã tồn tại');
      }
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const request = new sql.Request();
      
      request.input('id', sql.UniqueIdentifier, id);
      request.input('ho_ten', sql.NVarChar(100), updateData.name);
      request.input('email', sql.NVarChar(255), updateData.email);
      request.input('so_dien_thoai', sql.NVarChar(20), updateData.phone || null);
      request.input('vung_id', sql.NVarChar(10), updateData.vung_id || 'bac');
      request.input('trang_thai', sql.Bit, updateData.status);
      request.input('updated_at', sql.DateTime2, new Date());
      
      let passwordUpdate = '';
      if (updateData.password) {
        request.input('mat_khau', sql.NVarChar(255), updateData.password);
        passwordUpdate = ', mat_khau = @mat_khau';
      }
      
      let mongoProfileUpdate = '';
      if (updateData.mongo_profile_id) {
        request.input('mongo_profile_id', sql.NVarChar(50), updateData.mongo_profile_id);
        mongoProfileUpdate = ', mongo_profile_id = @mongo_profile_id';
      }
      
      const query = `
        UPDATE users 
        SET ho_ten = @ho_ten,
            email = @email,
            so_dien_thoai = @so_dien_thoai,
            vung_id = @vung_id,
            trang_thai = @trang_thai,
            ngay_cap_nhat = @updated_at
            ${passwordUpdate}
            ${mongoProfileUpdate}
        WHERE id = @id;
        
        SELECT 
          id,
          ho_ten as name,
          email,
          so_dien_thoai as phone,
          vung_id,
          mongo_profile_id,
          trang_thai as status,
          ngay_dang_ky as created_at,
          ngay_cap_nhat as updated_at
        FROM users WHERE id = @id;
      `;
      
      const result = await request.query(query);
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('Không tìm thấy người dùng');
      }
      
      return result.recordset[0];
    } catch (error) {
      console.error('SQL User update Error:', error);
      if (error.message && error.message.includes('UNIQUE')) {
        throw new Error('Email đã tồn tại');
      }
      throw error;
    }
  }

  static async updateStatus(id, status) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('id', sql.UniqueIdentifier, id)
        .input('status', sql.Bit, status)
        .input('updated_at', sql.DateTime2, new Date())
        .query(`
          UPDATE users 
          SET trang_thai = @status,
              ngay_cap_nhat = @updated_at
          WHERE id = @id;
          
          SELECT 
            id,
            ho_ten as name,
            email,
            so_dien_thoai as phone,
            vai_tro as role,
            trang_thai as status,
            ngay_dang_ky as created_at,
            ngay_cap_nhat as updated_at
          FROM users WHERE id = @id;
        `);
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('Không tìm thấy người dùng');
      }
      
      return result.recordset[0];
    } catch (error) {
      console.error('SQL User updateStatus Error:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const request = new sql.Request();
      
      // Soft delete - set status to 0
      const result = await request
        .input('id', sql.UniqueIdentifier, id)
        .input('updated_at', sql.DateTime2, new Date())
        .query(`
          UPDATE users 
          SET trang_thai = 0,
              ngay_cap_nhat = @updated_at
          WHERE id = @id;
          
          SELECT @@ROWCOUNT as affected;
        `);
      
      return result.recordset[0].affected > 0;
    } catch (error) {
      console.error('SQL User delete Error:', error);
      throw error;
    }
  }
}

// ==================== INVENTORY MODEL ====================

class SQLInventoryModel {
  static async findAll() {
    try {
      const request = new sql.Request();
      const result = await request.query(`
        SELECT 
          i.*,
          p.ten_san_pham,
          p.ma_sku,
          p.gia_ban,
          p.gia_niem_yet,
          w.ten_kho,
          w.dia_chi_chi_tiet as dia_chi_kho
        FROM inventory i
        LEFT JOIN products p ON i.san_pham_id = p.id
        LEFT JOIN warehouses w ON i.kho_id = w.id
        ORDER BY i.ngay_tao DESC
      `);
      
      return result.recordset;
    } catch (error) {
      console.error('SQL Inventory findAll Error:', error);
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
            i.*,
            p.ten_san_pham,
            p.ma_sku,
            w.ten_kho,
            w.dia_chi_chi_tiet as dia_chi_kho
          FROM inventory i
          LEFT JOIN products p ON i.san_pham_id = p.id
          LEFT JOIN warehouses w ON i.kho_id = w.id
          WHERE i.id = @id
        `);
      
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Inventory findById Error:', error);
      throw error;
    }
  }

  static async findByProduct(productId) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('product_id', sql.UniqueIdentifier, productId)
        .query(`
          SELECT 
            i.*,
            w.ten_kho,
            w.dia_chi_chi_tiet as dia_chi_kho
          FROM inventory i
          LEFT JOIN warehouses w ON i.kho_id = w.id
          WHERE i.san_pham_id = @product_id
        `);
      
      return result.recordset;
    } catch (error) {
      console.error('SQL Inventory findByProduct Error:', error);
      throw error;
    }
  }

  static async getTotalStockByProduct(productId) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('product_id', sql.UniqueIdentifier, productId)
        .query(`
          SELECT 
            ISNULL(SUM(so_luong_kha_dung), 0) as tong_ton_kho
          FROM inventory
          WHERE san_pham_id = @product_id
        `);
      
      return result.recordset[0]?.tong_ton_kho || 0;
    } catch (error) {
      console.error('SQL Inventory getTotalStockByProduct Error:', error);
      throw error;
    }
  }

  static async decreaseStock(inventoryId, quantity, options = {}) {
    try {
      const request = options.transaction ? new sql.Request(options.transaction) : new sql.Request();
      const result = await request
        .input('id', sql.UniqueIdentifier, inventoryId)
        .input('quantity', sql.Int, quantity)
        .query(`
          UPDATE inventory
          SET so_luong_kha_dung = so_luong_kha_dung - @quantity,
              ngay_cap_nhat = GETDATE()
          WHERE id = @id AND so_luong_kha_dung >= @quantity;
          
          SELECT * FROM inventory WHERE id = @id;
        `);
      
      if (!result.recordset[0]) {
        throw new Error('Không đủ tồn kho');
      }
      
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Inventory decreaseStock Error:', error);
      throw error;
    }
  }

  static async findByWarehouse(warehouseId) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('warehouse_id', sql.UniqueIdentifier, warehouseId)
        .query(`
          SELECT 
            i.*,
            p.ten_san_pham,
            p.ma_sku
          FROM inventory i
          LEFT JOIN products p ON i.san_pham_id = p.id
          WHERE i.kho_id = @warehouse_id
        `);
      
      return result.recordset;
    } catch (error) {
      console.error('SQL Inventory findByWarehouse Error:', error);
      throw error;
    }
  }

  static async countByWarehouse(warehouseId) {
    try {
      const request = new sql.Request();
      const result = await request
        .input('warehouse_id', sql.UniqueIdentifier, warehouseId)
        .query(`
          SELECT COUNT(*) as count
          FROM inventory
          WHERE kho_id = @warehouse_id
        `);
      
      return result.recordset[0].count;
    } catch (error) {
      console.error('SQL Inventory countByWarehouse Error:', error);
      throw error;
    }
  }

  static async create(inventoryData) {
    try {
      const request = new sql.Request();
      const id = inventoryData.id || sql.UniqueIdentifier.newGuid();
      
      const result = await request
        .input('id', sql.UniqueIdentifier, id)
        .input('san_pham_id', sql.UniqueIdentifier, inventoryData.san_pham_id)
        .input('kho_id', sql.UniqueIdentifier, inventoryData.kho_id)
        .input('so_luong_kha_dung', sql.Int, inventoryData.so_luong_kha_dung || 0)
        .input('so_luong_da_dat', sql.Int, inventoryData.so_luong_da_dat || 0)
        .input('muc_ton_kho_toi_thieu', sql.Int, inventoryData.muc_ton_kho_toi_thieu || 0)
        .input('so_luong_nhap_lai', sql.Int, inventoryData.so_luong_nhap_lai || 0)
        .input('lan_nhap_hang_cuoi', sql.DateTime2, inventoryData.lan_nhap_hang_cuoi || new Date())
        .input('ngay_tao', sql.DateTime2, new Date())
        .input('ngay_cap_nhat', sql.DateTime2, new Date())
        .query(`
          INSERT INTO inventory (
            id, san_pham_id, kho_id, so_luong_kha_dung, so_luong_da_dat,
            muc_ton_kho_toi_thieu, so_luong_nhap_lai, lan_nhap_hang_cuoi,
            ngay_tao, ngay_cap_nhat
          )
          VALUES (
            @id, @san_pham_id, @kho_id, @so_luong_kha_dung, @so_luong_da_dat,
            @muc_ton_kho_toi_thieu, @so_luong_nhap_lai, @lan_nhap_hang_cuoi,
            @ngay_tao, @ngay_cap_nhat
          );
          
          SELECT 
            i.*,
            p.ten_san_pham,
            w.ten_kho
          FROM inventory i
          LEFT JOIN products p ON i.san_pham_id = p.id
          LEFT JOIN warehouses w ON i.kho_id = w.id
          WHERE i.id = @id;
        `);
      
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Inventory create Error:', error);
      throw error;
    }
  }

  static async update(id, inventoryData) {
    try {
      const request = new sql.Request();
      
      let updateFields = [];
      
      if (inventoryData.san_pham_id !== undefined) {
        request.input('san_pham_id', sql.UniqueIdentifier, inventoryData.san_pham_id);
        updateFields.push('san_pham_id = @san_pham_id');
      }
      
      if (inventoryData.kho_id !== undefined) {
        request.input('kho_id', sql.UniqueIdentifier, inventoryData.kho_id);
        updateFields.push('kho_id = @kho_id');
      }
      
      if (inventoryData.so_luong_kha_dung !== undefined) {
        request.input('so_luong_kha_dung', sql.Int, inventoryData.so_luong_kha_dung);
        updateFields.push('so_luong_kha_dung = @so_luong_kha_dung');
      }
      
      if (inventoryData.so_luong_da_dat !== undefined) {
        request.input('so_luong_da_dat', sql.Int, inventoryData.so_luong_da_dat);
        updateFields.push('so_luong_da_dat = @so_luong_da_dat');
      }
      
      if (inventoryData.muc_ton_kho_toi_thieu !== undefined) {
        request.input('muc_ton_kho_toi_thieu', sql.Int, inventoryData.muc_ton_kho_toi_thieu);
        updateFields.push('muc_ton_kho_toi_thieu = @muc_ton_kho_toi_thieu');
      }
      
      if (inventoryData.so_luong_nhap_lai !== undefined) {
        request.input('so_luong_nhap_lai', sql.Int, inventoryData.so_luong_nhap_lai);
        updateFields.push('so_luong_nhap_lai = @so_luong_nhap_lai');
      }
      
      if (inventoryData.lan_nhap_hang_cuoi !== undefined) {
        request.input('lan_nhap_hang_cuoi', sql.DateTime2, inventoryData.lan_nhap_hang_cuoi);
        updateFields.push('lan_nhap_hang_cuoi = @lan_nhap_hang_cuoi');
      }
      
      updateFields.push('ngay_cap_nhat = @ngay_cap_nhat');
      request.input('ngay_cap_nhat', sql.DateTime2, new Date());
      request.input('id', sql.UniqueIdentifier, id);
      
      const result = await request.query(`
        UPDATE inventory 
        SET ${updateFields.join(', ')}
        WHERE id = @id;
        
        SELECT 
          i.*,
          p.ten_san_pham,
          w.ten_kho
        FROM inventory i
        LEFT JOIN products p ON i.san_pham_id = p.id
        LEFT JOIN warehouses w ON i.kho_id = w.id
        WHERE i.id = @id;
      `);
      
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Inventory update Error:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const request = new sql.Request();
      
      const result = await request
        .input('id', sql.UniqueIdentifier, id)
        .query(`
          DELETE FROM inventory WHERE id = @id;
          SELECT @@ROWCOUNT as affected;
        `);
      
      return result.recordset[0].affected > 0;
    } catch (error) {
      console.error('SQL Inventory delete Error:', error);
      throw error;
    }
  }
}

// ==================== WAREHOUSE MODEL ====================

class SQLWarehouseModel {
  static async findAll() {
    try {
      const request = new sql.Request();
      const result = await request.query(`
        SELECT 
          w.*,
          COUNT(i.id) as so_luong_san_pham
        FROM warehouses w
        LEFT JOIN inventory i ON w.id = i.kho_id
        GROUP BY w.id, w.ten_kho, w.phuong_xa_id, w.dia_chi_chi_tiet, 
                 w.so_dien_thoai, w.trang_thai, w.ngay_tao, w.ngay_cap_nhat
        ORDER BY w.ngay_tao DESC
      `);
      
      return result.recordset;
    } catch (error) {
      console.error('SQL Warehouse findAll Error:', error);
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
            w.*,
            COUNT(i.id) as so_luong_san_pham
          FROM warehouses w
          LEFT JOIN inventory i ON w.id = i.kho_id
          WHERE w.id = @id
          GROUP BY w.id, w.ten_kho, w.phuong_xa_id, w.dia_chi_chi_tiet, 
                   w.so_dien_thoai, w.trang_thai, w.ngay_tao, w.ngay_cap_nhat
        `);
      
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Warehouse findById Error:', error);
      throw error;
    }
  }

  static async create(warehouseData) {
    try {
      const request = new sql.Request();
      const id = warehouseData.id || sql.UniqueIdentifier.newGuid();
      
      const result = await request
        .input('id', sql.UniqueIdentifier, id)
        .input('ten_kho', sql.NVarChar(200), warehouseData.ten_kho)
        .input('phuong_xa_id', sql.UniqueIdentifier, warehouseData.phuong_xa_id || null)
        .input('dia_chi_chi_tiet', sql.NVarChar(500), warehouseData.dia_chi_chi_tiet)
        .input('so_dien_thoai', sql.VarChar(15), warehouseData.so_dien_thoai)
        .input('trang_thai', sql.Bit, warehouseData.trang_thai !== undefined ? warehouseData.trang_thai : 1)
        .input('ngay_tao', sql.DateTime2, new Date())
        .input('ngay_cap_nhat', sql.DateTime2, new Date())
        .query(`
          INSERT INTO warehouses (
            id, ten_kho, phuong_xa_id, dia_chi_chi_tiet, 
            so_dien_thoai, trang_thai, ngay_tao, ngay_cap_nhat
          )
          VALUES (
            @id, @ten_kho, @phuong_xa_id, @dia_chi_chi_tiet,
            @so_dien_thoai, @trang_thai, @ngay_tao, @ngay_cap_nhat
          );
          
          SELECT * FROM warehouses WHERE id = @id;
        `);
      
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Warehouse create Error:', error);
      throw error;
    }
  }

  static async update(id, warehouseData) {
    try {
      const request = new sql.Request();
      
      let updateFields = [];
      
      if (warehouseData.ten_kho !== undefined) {
        request.input('ten_kho', sql.NVarChar(200), warehouseData.ten_kho);
        updateFields.push('ten_kho = @ten_kho');
      }
      
      if (warehouseData.phuong_xa_id !== undefined) {
        request.input('phuong_xa_id', sql.UniqueIdentifier, warehouseData.phuong_xa_id);
        updateFields.push('phuong_xa_id = @phuong_xa_id');
      }
      
      if (warehouseData.dia_chi_chi_tiet !== undefined) {
        request.input('dia_chi_chi_tiet', sql.NVarChar(500), warehouseData.dia_chi_chi_tiet);
        updateFields.push('dia_chi_chi_tiet = @dia_chi_chi_tiet');
      }
      
      if (warehouseData.so_dien_thoai !== undefined) {
        request.input('so_dien_thoai', sql.VarChar(15), warehouseData.so_dien_thoai);
        updateFields.push('so_dien_thoai = @so_dien_thoai');
      }
      
      if (warehouseData.trang_thai !== undefined) {
        request.input('trang_thai', sql.Bit, warehouseData.trang_thai);
        updateFields.push('trang_thai = @trang_thai');
      }
      
      updateFields.push('ngay_cap_nhat = @ngay_cap_nhat');
      request.input('ngay_cap_nhat', sql.DateTime2, new Date());
      request.input('id', sql.UniqueIdentifier, id);
      
      const result = await request.query(`
        UPDATE warehouses 
        SET ${updateFields.join(', ')}
        WHERE id = @id;
        
        SELECT * FROM warehouses WHERE id = @id;
      `);
      
      return result.recordset[0];
    } catch (error) {
      console.error('SQL Warehouse update Error:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const request = new sql.Request();
      
      const result = await request
        .input('id', sql.UniqueIdentifier, id)
        .query(`
          DELETE FROM warehouses WHERE id = @id;
          SELECT @@ROWCOUNT as affected;
        `);
      
      return result.recordset[0].affected > 0;
    } catch (error) {
      console.error('SQL Warehouse delete Error:', error);
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
  SQLRegionModel,
  SQLProvinceModel,
  SQLWardModel,
  SQLUserModel,
  SQLInventoryModel,
  SQLWarehouseModel,
  
  // Hoặc export theo nhóm để dễ sử dụng
  Mongo: {
    ProductDetail: Data_ProductDetail_Model, 
    FlashSaleDetail: Data_FlashSaleDetail_Model,
    UserDetail: Data_UserDetail_Model,
    VoucherDetail: Data_VoucherDetail_Model
  },
  
  SQL: {
    Brand: SQLBrandModel,
    Category: SQLCategoryModel,
    Product: SQLProductModel,
    FlashSale: SQLFlashSaleModel,
    FlashSaleItem: SQLFlashSaleItemModel,
    Region: SQLRegionModel,
    Province: SQLProvinceModel,
    Ward: SQLWardModel,
    User: SQLUserModel,
    Inventory: SQLInventoryModel,
    Warehouse: SQLWarehouseModel
  }
};