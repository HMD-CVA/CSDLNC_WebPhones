import mongoose, { model } from "mongoose";
import sql from 'mssql';

// ==================== MONGODB MODELS ====================

const productDetailSchema = new mongoose.Schema({
  sql_product_id: { type: String, unique: true },
}, { 
  strict: false, // Cho phép lưu các trường không được định nghĩa
  timestamps: true 
});

// MongoDB Models
const Data_ProductDetail_Model = mongoose.model('ProductDetail', productDetailSchema);

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
        WHERE p.trang_thai = 1

      `);
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
  Data_ProductDetail_Model,
  
  // SQL Server Models
  SQLBrandModel,
  SQLCategoryModel,
  SQLProductModel,
  
  // Hoặc export theo nhóm để dễ sử dụng
  Mongo: {
    ProductDetail: Data_ProductDetail_Model,
  },
  
  SQL: {
    Brand: SQLBrandModel,
    Category: SQLCategoryModel,
    Product: SQLProductModel
  }
};