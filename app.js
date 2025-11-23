import express from 'express';
import { engine } from 'express-handlebars';
import db from './server.js';
import DataModel from './app/model/index.js';
import Op from 'sequelize'

db.connectAllDB();
const app = express();


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Handlebars setup
app.engine('handlebars', engine({
    defaultLayout: 'AdminMain',
    helpers: {
        eq: (a, b) => a===b,
        json: (context) => {
            return JSON.stringify(context);
        },
        formatNumber: (price) => {
            return new Intl.NumberFormat('vi-VN').format(price);
        },
        formatDate: (dateString) => {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN');
        },
        getCategoryNameById: (categoryId, categories) => {
            const category = categories.find(cat => cat._id.toString() === categoryId.toString());
            return category ? category.ten_danh_muc : 'Không tìm thấy';
        },
        formatCurrency: (amount) => {
          if (typeof amount !== 'number') {
            amount = parseFloat(amount) || 0;
          }
          return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
          }).format(amount);
        },
        countProperties: (obj) => {
          if (!obj) return 0;
          return Object.keys(obj).length;
        },
    }
}));
app.set('view engine', 'handlebars');
app.set('views', './views');

///////////////////////////////
//         GET ROUTES         //
///////////////////////////////

//Trang chủ
app.get('/', async (req, res) => {
  try {
    // Lấy tất cả sản phẩm từ SQL Server
    const sanphams = await DataModel.SQL.Product.findAll();
    
    // Format dữ liệu sản phẩm
    const formattedProducts = sanphams.map(product => ({
      ...product,
      id: product.id,
      gia_ban_formatted: new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
      }).format(product.gia_ban),
      gia_niem_yet_formatted: product.gia_niem_yet ? new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
      }).format(product.gia_niem_yet) : null,
      giam_gia_formatted: product.gia_niem_yet ? new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
      }).format(product.gia_niem_yet - product.gia_ban) : null,
      is_discount: product.gia_niem_yet && product.gia_niem_yet > product.gia_ban,
      phan_tram_giam: product.gia_niem_yet ? 
        Math.round((1 - product.gia_ban / product.gia_niem_yet) * 100) : 0,
      anh_dai_dien: product.anh_dai_dien || '/images/default-product.jpg',
      mo_ta: product.mo_ta || 'Sản phẩm chất lượng cao với giá cả hợp lý'
    }));

    // Lọc sản phẩm flash sale (ví dụ: giảm giá > 10%)
    const flashSaleProducts = formattedProducts.filter(product => product.phan_tram_giam > 10);

    // Lọc sản phẩm iPhone
    const iphoneProducts = formattedProducts.filter(product => 
      product.ten_thuong_hieu.toLowerCase().includes('apple') || 
      product.ten_san_pham.toLowerCase().includes('iphone')
    );

    res.render('home', { 
      layout: 'HomeMain.handlebars', 
      sanphams: formattedProducts,
      flashSaleProducts,
      iphoneProducts
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Server error');
  }
});

// Trang admin dashboard
app.get('/admin', (req, res) => {
    try {
        res.render('AD_Dashboard', { layout: 'AdminMain' , dashboardPage: true});
    } catch (err) {
        res.status(500).send('Lỗi server!');
    }
});

// Admin logout
app.get('/logout', (req, res) => {
    res.redirect('/');
});

// Hàm đệ quy để xử lý nested objects
function extractTechnicalSpecs(obj) {
  const result = {};
  
  function processValue(currentObj) {
    for (const [key, value] of Object.entries(currentObj)) {
      // Chỉ xử lý thong_so_ky_thuat
      if (key === 'thong_so_ky_thuat' && Array.isArray(value)) {
        console.log('🔧 Processing thong_so_ky_thuat array with', value.length, 'items');
        
        value.forEach((item, index) => {
          if (item && typeof item === 'object' && item.ten && item.gia_tri !== undefined) {
            // Sử dụng trực tiếp tên từ trường 'ten' làm key
            const displayKey = item.ten.trim();
            result[displayKey] = item.gia_tri;
            // console.log(`Extracted: "${displayKey}" = "${item.gia_tri}"`);
          } else if (item && typeof item === 'object') {
            // Nếu có nested object trong thong_so_ky_thuat, xử lý tiếp
            processValue(item);
          }
        });
      }
      // Nếu có nested object, tiếp tục tìm thong_so_ky_thuat
      else if (value && typeof value === 'object' && !Array.isArray(value)) {
        processValue(value);
      }
      // Nếu là array (không phải thong_so_ky_thuat), tìm trong từng phần tử
      else if (Array.isArray(value)) {
        value.forEach(item => {
          if (item && typeof item === 'object') {
            processValue(item);
          }
        });
      }
    }
  }
  
  processValue(obj);
  return result;
}

// Route GET /admin/sanpham - Hiển thị trang quản lý sản phẩm
app.get('/admin/sanpham', async (req, res) => {
    try {
        console.log('🚀 Loading admin products page...');
        
        const [sanphams, categories, brands, productDetails] = await Promise.all([
            DataModel.SQL.Product.findAll(),
            DataModel.SQL.Category.findAll(),
            DataModel.SQL.Brand.findAll(),
            DataModel.Mongo.ProductDetail.find({}).lean()
        ]);
        
        console.log('📊 Data loaded:');
        console.log('  - SQL Products:', sanphams.length);
        console.log('  - Categories:', categories.length);
        console.log('  - Brands:', brands.length);
        console.log('  - MongoDB Details:', productDetails.length);

        // Tạo set các product ID từ SQL để matching với MongoDB
        const sqlProductIds = new Set(sanphams.map(sp => String(sp.id).toLowerCase()));
        console.log('🆔 SQL Product IDs count:', sqlProductIds.size);

        const detailMap = new Map();
        
        // Xử lý và kết hợp dữ liệu từ MongoDB - CHỈ lấy thông số kỹ thuật
        let totalMongoMatches = 0;
        let totalSpecsExtracted = 0;
        
        productDetails.forEach(detail => {
            const detailId = String(detail.sql_product_id).toLowerCase();
            if (sqlProductIds.has(detailId)) {
                totalMongoMatches++;
                console.log(`\n🔍 Processing MongoDB details for product: ${detailId}`);
                
                // CHỈ extract thông số kỹ thuật
                const technicalSpecs = extractTechnicalSpecs(detail);
                const specsCount = Object.keys(technicalSpecs).length;
                totalSpecsExtracted += specsCount;
                
                // console.log(`Extracted ${specsCount} technical specs`);
                
                // Hiển thị tất cả các thông số đã extract
                Object.entries(technicalSpecs).forEach(([key, value]) => {
                    console.log(`   📝 "${key}": "${value}"`);
                });
                
                detailMap.set(detailId, technicalSpecs);
            }
        });
      
        // Kết hợp dữ liệu từ SQL và MongoDB
        const combinedSanphams = sanphams.map(sp => {
            const productId = String(sp.id).toLowerCase();
            const technicalSpecs = detailMap.get(productId) || {};
            const specsCount = Object.keys(technicalSpecs).length;
            
            if (specsCount > 0) {
                console.log(`📦 Product "${sp.ten_san_pham}": ${specsCount} technical specs`);
            }
            
            return {
                id: productId,
                ma_sku: sp.ma_sku,
                ten_san_pham: sp.ten_san_pham,
                danh_muc_id: sp.danh_muc_id,
                thuong_hieu_id: sp.thuong_hieu_id,
                ten_danh_muc: sp.ten_danh_muc,
                ten_thuong_hieu: sp.ten_thuong_hieu,
                gia_niem_yet: sp.gia_niem_yet,
                gia_ban: sp.gia_ban,
                giam_gia: sp.giam_gia,
                trang_thai: sp.trang_thai,
                luot_xem: sp.luot_xem,
                so_luong_ban: sp.so_luong_ban,
                ngay_tao: sp.ngay_tao,
                ngay_cap_nhat: sp.ngay_cap_nhat,
                link_anh: sp.link_anh,
                mo_ta: sp.mo_ta,
                san_pham_noi_bat: sp.san_pham_noi_bat,
                slug: sp.slug,
                mo_ta_ngan: sp.mo_ta_ngan,
                // CHỈ có thông số kỹ thuật
                chi_tiet: technicalSpecs
            };
        });

        // Render template với dữ liệu đã xử lý
        res.render('sanpham', { 
            layout: 'AdminMain', 
            title: 'Quản lý sản phẩm', 
            sanphams: combinedSanphams, 
            categories, 
            brands,
        });
        
    } catch (err) {
        console.error('❌ Lỗi trong route /admin/sanpham:', err);
        res.status(500).render('error', {
            layout: 'AdminMain',
            title: 'Lỗi',
            message: 'Đã xảy ra lỗi khi tải trang quản lý sản phẩm'
        });
    }
});

// API để frontend gọi (trả về JSON)
app.get('/api/sanpham', async (req, res) => {
    try {
        console.log('🔄 API /api/sanpham called');
        
        const [sanphams, categories, brands, productDetails] = await Promise.all([
            DataModel.SQL.Product.findAll(),
            DataModel.SQL.Category.findAll(),
            DataModel.SQL.Brand.findAll(),
            DataModel.Mongo.ProductDetail.find({}).lean()
        ]);

        // Xử lý dữ liệu tương tự route trên - CHỈ lấy thông số kỹ thuật
        const sqlProductIds = new Set(sanphams.map(sp => String(sp.id).toLowerCase()));
        const detailMap = new Map();
        
        // Xử lý dữ liệu MongoDB - CHỈ lấy thông số kỹ thuật
        productDetails.forEach(detail => {
            const detailId = String(detail.sql_product_id).toLowerCase();
            if (sqlProductIds.has(detailId)) {
                const technicalSpecs = extractTechnicalSpecs(detail);
                detailMap.set(detailId, technicalSpecs);
            }
        });

        // Kết hợp dữ liệu
        const combinedSanphams = sanphams.map(sp => {
            const productId = String(sp.id).toLowerCase();
            return {
                id: productId,
                ma_sku: sp.ma_sku,
                ten_san_pham: sp.ten_san_pham,
                danh_muc_id: sp.danh_muc_id,
                thuong_hieu_id: sp.thuong_hieu_id,
                ten_danh_muc: sp.ten_danh_muc,
                ten_thuong_hieu: sp.ten_thuong_hieu,
                gia_niem_yet: sp.gia_niem_yet,
                gia_ban: sp.gia_ban,
                giam_gia: sp.giam_gia,
                trang_thai: sp.trang_thai,
                luot_xem: sp.luot_xem,
                so_luong_ban: sp.so_luong_ban,
                ngay_tao: sp.ngay_tao,
                ngay_cap_nhat: sp.ngay_cap_nhat,
                link_anh: sp.link_anh,
                mo_ta: sp.mo_ta,
                san_pham_noi_bat: sp.san_pham_noi_bat,
                slug: sp.slug,
                mo_ta_ngan: sp.mo_ta_ngan,
                // CHỈ có thông số kỹ thuật
                chi_tiet: detailMap.get(productId) || {}
            };
        });

        // Trả về JSON cho API
        res.json({
            success: true,
            data: {
                sanphams: combinedSanphams,
                categories: categories,
                brands: brands
            },
            meta: {
                totalProducts: combinedSanphams.length,
                totalWithTechnicalSpecs: combinedSanphams.filter(sp => Object.keys(sp.chi_tiet).length > 0).length,
                totalTechnicalSpecs: combinedSanphams.reduce((sum, sp) => sum + Object.keys(sp.chi_tiet).length, 0),
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (err) {
        console.error('❌ Lỗi trong API /api/sanpham:', err);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy dữ liệu sản phẩm',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});


// API cập nhật thông số kỹ thuật - Phiên bản cho schema hiện tại
app.put('/admin/sanpham/:id/chitiet', async (req, res) => {
    try {
        const productId = req.params.id;
        const specsData = req.body;

        console.log(`🔄 API: Cập nhật thông số cho sản phẩm ${productId}`);

        // Chuyển đổi dữ liệu
        const thongSoKyThuatArray = Object.entries(specsData).map(([ten, gia_tri]) => ({
            ten: ten,
            gia_tri: gia_tri
        }));

        console.log(`📝 Sẽ cập nhật ${thongSoKyThuatArray.length} thông số`);

        // Sử dụng updateOne với $set
        const result = await DataModel.Mongo.ProductDetail.updateOne(
            { sql_product_id: productId },
            { 
                $set: { 
                    thong_so_ky_thuat: thongSoKyThuatArray,
                    updatedAt: new Date()
                } 
            }
        );

        console.log('✅ Kết quả updateOne:', result);

        if (result.modifiedCount === 0 && result.matchedCount === 0) {
            // Nếu không tìm thấy document, tạo mới
            const newDoc = new DataModel.Mongo.ProductDetail({
                sql_product_id: productId,
                thong_so_ky_thuat: thongSoKyThuatArray,
                updatedAt: new Date(),
                createdAt: new Date()
            });
            await newDoc.save();
            console.log('📝 Đã tạo document mới');
        }

        // Kiểm tra lại
        const updatedDoc = await DataModel.Mongo.ProductDetail.findOne({ 
            sql_product_id: productId 
        });

        res.json({
            success: true,
            message: 'Cập nhật thông số kỹ thuật thành công',
            data: {
                id: productId,
                thong_so_ky_thuat: updatedDoc?.thong_so_ky_thuat || [],
                specs_count: thongSoKyThuatArray.length
            }
        });

    } catch (error) {
        console.error('❌ Lỗi khi cập nhật thông số kỹ thuật:', error);
        
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật thông số kỹ thuật',
            error: error.message
        });
    }
});



// Thêm các API endpoints khác
app.post('/api/sanpham', async (req, res) => {
    try {
        const productData = req.body;
        // Logic thêm sản phẩm
        const newProduct = await DataModel.SQL.Product.create(productData);
        res.json({ success: true, product: newProduct });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/sanpham/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const updateData = req.body;
        await DataModel.SQL.Product.update(updateData, { where: { id: productId } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/sanpham/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        await DataModel.SQL.Product.destroy({ where: { id: productId } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


///////////////////////////////
//      BRAND API ROUTES     //
///////////////////////////////

// GET /api/thuonghieu - Lấy tất cả thương hiệu
app.get('/api/thuonghieu', async (req, res) => {
    try {
        console.log('🔄 API: Lấy danh sách thương hiệu');
        
        const brands = await DataModel.SQL.Brand.findAll({
            order: [['ten_thuong_hieu', 'ASC']]
        });

        console.log(`✅ Lấy được ${brands.length} thương hiệu`);

        res.json(brands);
        
    } catch (error) {
        console.error('❌ Lỗi khi lấy danh sách thương hiệu:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách thương hiệu',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/thuonghieu/:id - Lấy thông tin chi tiết thương hiệu
app.get('/api/thuonghieu/:id', async (req, res) => {
    try {
        const brandId = req.params.id;
        console.log(`🔄 API: Lấy thông tin thương hiệu ${brandId}`);

        const brand = await DataModel.SQL.Brand.findById(brandId);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thương hiệu'
            });
        }

        res.json(brand);
        
    } catch (error) {
        console.error('❌ Lỗi khi lấy thông tin thương hiệu:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông tin thương hiệu',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Thêm hàm generateSlug (có thể đặt trong utils hoặc cùng file)
function generateSlug(text) {
    if (!text) return '';
    
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')                   // Tách ký tự có dấu thành ký tự gốc + dấu
        .replace(/[\u0300-\u036f]/g, '')   // Xóa các dấu
        .replace(/[đĐ]/g, 'd')             // Chuyển đ, Đ thành d
        .replace(/[^a-z0-9 -]/g, '')       // Xóa ký tự đặc biệt, giữ khoảng trắng và gạch ngang
        .replace(/\s+/g, '-')              // Thay khoảng trắng bằng gạch ngang
        .replace(/-+/g, '-')               // Xóa nhiều gạch ngang liên tiếp
        .replace(/^-+/, '')                // Xóa gạch ngang ở đầu
        .replace(/-+$/, '');               // Xóa gạch ngang ở cuối
}

// POST /api/thuonghieu - Thêm thương hiệu mới
app.post('/api/thuonghieu', async (req, res) => {
    try {
        const brandData = req.body;
        console.log('🔄 API: Thêm thương hiệu mới', brandData);

        // Validate dữ liệu
        if (!brandData.ten_thuong_hieu) {
            return res.status(400).json({
                success: false,
                message: 'Tên thương hiệu là bắt buộc'
            });
        }

        // Tạo slug từ tên thương hiệu
        const slug = generateSlug(brandData.ten_thuong_hieu);

        // Kiểm tra slug trùng lặp
        const existingBrand = await DataModel.SQL.Brand.findOne({ where: { slug } });
        if (existingBrand) {
            return res.status(400).json({
                success: false,
                message: 'Slug đã tồn tại, vui lòng chọn tên khác'
            });
        }

        const newBrand = await DataModel.SQL.Brand.create({
            ten_thuong_hieu: brandData.ten_thuong_hieu,
            mo_ta: brandData.mo_ta || '',
            logo_url: brandData.logo_url || '',
            slug: slug,
            trang_thai: brandData.trang_thai !== undefined ? brandData.trang_thai : 1,
            ngay_tao: new Date()
        });

        console.log(`✅ Đã thêm thương hiệu: ${newBrand.ten_thuong_hieu}`);

        res.status(201).json({
            success: true,
            message: 'Thêm thương hiệu thành công',
            data: newBrand
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi thêm thương hiệu:', error);
        
        // Xử lý lỗi duplicate
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                message: 'Tên thương hiệu hoặc slug đã tồn tại'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi thêm thương hiệu',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// PUT /api/thuonghieu/:id - Cập nhật thương hiệu
app.put('/api/thuonghieu/:id', async (req, res) => {
    try {
        const brandId = req.params.id;
        const brandData = req.body;
        
        console.log(`🔄 API: Cập nhật thương hiệu ${brandId}`, brandData);

        // Validate dữ liệu đầu vào
        if (!brandData.ten_thuong_hieu || brandData.ten_thuong_hieu.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Tên thương hiệu là bắt buộc'
            });
        }

        // Tìm thương hiệu hiện tại
        const existingBrand = await DataModel.SQL.Brand.findById(brandId);
        if (!existingBrand) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thương hiệu'
            });
        }

        // Tạo slug mới nếu tên thay đổi
        let newSlug = existingBrand.slug;
        let hasNameChanged = false;

        if (brandData.ten_thuong_hieu.trim() !== existingBrand.ten_thuong_hieu) {
            hasNameChanged = true;
            newSlug = generateSlug(brandData.ten_thuong_hieu);
            
            console.log(`📝 Tên thay đổi, slug mới: ${newSlug}`);
            
            // Kiểm tra slug trùng lặp
            const allBrands = await DataModel.SQL.Brand.findAll();
            const duplicateBrand = allBrands.find(brand => 
                brand.slug === newSlug && brand.id != brandId
            );
            
            if (duplicateBrand) {
                console.log(`⚠️ Tìm thấy brand trùng: ${duplicateBrand.ten_thuong_hieu}`);
                return res.status(400).json({
                    success: false,
                    message: 'Tên thương hiệu đã tồn tại, vui lòng chọn tên khác'
                });
            }
        }

        // Chuẩn bị dữ liệu cập nhật
        const updateData = {
            ten_thuong_hieu: brandData.ten_thuong_hieu.trim(),
            mo_ta: brandData.mo_ta || existingBrand.mo_ta,
            logo_url: brandData.logo_url || existingBrand.logo_url,
            trang_thai: brandData.trang_thai !== undefined ? parseInt(brandData.trang_thai) : existingBrand.trang_thai,
            updated_at: new Date()
        };

        // Chỉ cập nhật slug nếu tên thay đổi
        if (hasNameChanged) {
            updateData.slug = newSlug;
        }

        console.log('📤 Dữ liệu cập nhật:', updateData);

        // Gọi update - SỬA LẠI CÁCH GỌI
        const updatedBrand = await DataModel.SQL.Brand.update(brandId, updateData);

        console.log(`✅ Đã cập nhật thương hiệu: ${updatedBrand.ten_thuong_hieu}`);

        res.json({
            success: true,
            message: 'Cập nhật thương hiệu thành công',
            data: updatedBrand
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi cập nhật thương hiệu:', error);
        
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật thương hiệu',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});


// DELETE /api/thuonghieu/:id - Xóa thương hiệu
app.delete('/api/thuonghieu/:id', async (req, res) => {
    try {
        const brandId = req.params.id;
        
        console.log(`🗑️ API: Xóa thương hiệu ${brandId}`);

        // Validate brandId
        if (!brandId) {
            return res.status(400).json({
                success: false,
                message: 'ID thương hiệu là bắt buộc'
            });
        }

        // Gọi phương thức destroy với điều kiện where
        const result = await DataModel.SQL.Brand.destroy({
            where: { id: brandId }
        });

        console.log(`✅ Đã xóa thương hiệu: ${result.ten_thuong_hieu}`);

        res.json({
            success: true,
            message: 'Xóa thương hiệu thành công',
            data: result
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi xóa thương hiệu:', error);
        
        // Phân loại lỗi để trả về status code phù hợp
        if (error.message.includes('Không thể xóa thương hiệu') || 
            error.message.includes('còn sản phẩm')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        if (error.message.includes('Không tìm thấy thương hiệu')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa thương hiệu',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});


// Thêm vào file server routes
///////////////////////////////
//      CATEGORY API ROUTES  //
///////////////////////////////

// GET /api/danhmuc - Lấy tất cả danh mục
app.get('/api/danhmuc', async (req, res) => {
    try {
        console.log('🔄 API: Lấy danh sách danh mục');
        
        const categories = await DataModel.SQL.Category.findAll({
            order: [['thu_tu', 'ASC'], ['ten_danh_muc', 'ASC']]
        });

        console.log(`✅ Lấy được ${categories.length} danh mục`);

        res.json(categories);
        
    } catch (error) {
        console.error('❌ Lỗi khi lấy danh sách danh mục:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách danh mục',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/danhmuc/:id - Lấy thông tin chi tiết danh mục
app.get('/api/danhmuc/:id', async (req, res) => {
    try {
        const categoryId = req.params.id;
        console.log(`🔄 API: Lấy thông tin danh mục ${categoryId}`);

        const category = await DataModel.SQL.Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy danh mục'
            });
        }

        res.json(category);
        
    } catch (error) {
        console.error('❌ Lỗi khi lấy thông tin danh mục:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông tin danh mục',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/danhmuc - Thêm danh mục mới
app.post('/api/danhmuc', async (req, res) => {
    try {
        const categoryData = req.body;
        console.log('🔄 API: Thêm danh mục mới', categoryData);

        // Validate dữ liệu
        if (!categoryData.ten_danh_muc) {
            return res.status(400).json({
                success: false,
                message: 'Tên danh mục là bắt buộc'
            });
        }

        // Tạo slug từ tên danh mục
        const slug = generateSlug(categoryData.ten_danh_muc);

        // Kiểm tra slug trùng lặp
        const existingCategory = await DataModel.SQL.Category.findOne({ where: { slug } });
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Slug đã tồn tại, vui lòng chọn tên khác'
            });
        }

        const newCategory = await DataModel.SQL.Category.create({
            ten_danh_muc: categoryData.ten_danh_muc,
            mo_ta: categoryData.mo_ta || '',
            anh_url: categoryData.anh_url || '',
            thu_tu: categoryData.thu_tu !== undefined ? parseInt(categoryData.thu_tu) : 0,
            danh_muc_cha_id: categoryData.danh_muc_cha_id || null,
            slug: slug,
            trang_thai: categoryData.trang_thai !== undefined ? categoryData.trang_thai : 1,
            ngay_tao: new Date()
        });

        console.log(`✅ Đã thêm danh mục: ${newCategory.ten_danh_muc}`);

        res.status(201).json({
            success: true,
            message: 'Thêm danh mục thành công',
            data: newCategory
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi thêm danh mục:', error);
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                message: 'Tên danh mục hoặc slug đã tồn tại'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi thêm danh mục',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// PUT /api/danhmuc/:id - Cập nhật danh mục
app.put('/api/danhmuc/:id', async (req, res) => {
    try {
        const categoryId = req.params.id;
        const categoryData = req.body;
        
        console.log(`🔄 API: Cập nhật danh mục ${categoryId}`, categoryData);

        if (!categoryData.ten_danh_muc || categoryData.ten_danh_muc.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Tên danh mục là bắt buộc'
            });
        }

        const existingCategory = await DataModel.SQL.Category.findById(categoryId);
        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy danh mục'
            });
        }

        let newSlug = existingCategory.slug;
        let hasNameChanged = false;

        if (categoryData.ten_danh_muc.trim() !== existingCategory.ten_danh_muc) {
            hasNameChanged = true;
            newSlug = generateSlug(categoryData.ten_danh_muc);
            
            console.log(`📝 Tên thay đổi, slug mới: ${newSlug}`);
            
            const allCategories = await DataModel.SQL.Category.findAll();
            const duplicateCategory = allCategories.find(cat => 
                cat.slug === newSlug && cat.id != categoryId
            );
            
            if (duplicateCategory) {
                console.log(`⚠️ Tìm thấy category trùng: ${duplicateCategory.ten_danh_muc}`);
                return res.status(400).json({
                    success: false,
                    message: 'Tên danh mục đã tồn tại, vui lòng chọn tên khác'
                });
            }
        }

        // Kiểm tra không được chọn chính nó làm danh mục cha
        if (categoryData.danh_muc_cha_id === categoryId) {
            return res.status(400).json({
                success: false,
                message: 'Không thể chọn chính danh mục này làm danh mục cha'
            });
        }

        const updateData = {
            ten_danh_muc: categoryData.ten_danh_muc.trim(),
            mo_ta: categoryData.mo_ta || existingCategory.mo_ta,
            anh_url: categoryData.anh_url || existingCategory.anh_url,
            thu_tu: categoryData.thu_tu !== undefined ? parseInt(categoryData.thu_tu) : existingCategory.thu_tu,
            danh_muc_cha_id: categoryData.danh_muc_cha_id || existingCategory.danh_muc_cha_id,
            trang_thai: categoryData.trang_thai !== undefined ? parseInt(categoryData.trang_thai) : existingCategory.trang_thai,
            updated_at: new Date()
        };

        if (hasNameChanged) {
            updateData.slug = newSlug;
        }

        console.log('📤 Dữ liệu cập nhật:', updateData);

        const updatedCategory = await DataModel.SQL.Category.update(categoryId, updateData);

        console.log(`✅ Đã cập nhật danh mục: ${updatedCategory.ten_danh_muc}`);

        res.json({
            success: true,
            message: 'Cập nhật danh mục thành công',
            data: updatedCategory
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi cập nhật danh mục:', error);
        
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật danh mục',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// DELETE /api/danhmuc/:id - Xóa danh mục
app.delete('/api/danhmuc/:id', async (req, res) => {
    try {
        const categoryId = req.params.id;
        
        console.log(`🗑️ API: Xóa danh mục ${categoryId}`);

        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: 'ID danh mục là bắt buộc'
            });
        }

        const result = await DataModel.SQL.Category.destroy({
            where: { id: categoryId }
        });

        console.log(`✅ Đã xóa danh mục: ${result.ten_danh_muc}`);

        res.json({
            success: true,
            message: 'Xóa danh mục thành công',
            data: result
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi xóa danh mục:', error);
        
        if (error.message.includes('Không thể xóa danh mục') || 
            error.message.includes('còn sản phẩm') ||
            error.message.includes('còn danh mục con')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        if (error.message.includes('Không tìm thấy danh mục')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa danh mục',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});






// // Quản lý phòng hát
// app.get('/admin/phonghat', async (req, res) => {
//     try {
//         const phonghats = await DataModel.Data_PhongHat_Model.find({}).lean();
//         const phonghatsWithStatus = phonghats.map(room => ({
//             ...room,
//             statusText: room.TrangThai === 1 ? 'CÒN TRỐNG' : 
//                         room.TrangThai === 0 ? 'ĐANG SỬ DỤNG' : 
//                         room.TrangThai === 2 ? 'ĐÃ ĐẶT' : 
//                         room.TrangThai === -1 ? 'ĐÃ XOÁ': 'KHÔNG XÁC ĐỊNH'
//         }));
//         res.render('dienthoai', { layout: 'AdminMain', title: 'Quản lý phòng hát', phonghats: phonghatsWithStatus,phonghatPage: true });
//     } catch (err) {
//         console.error('Error:', err);
//         res.status(500).send('Lỗi server!');
//     }
// });

// // Quản lý khách hàng
// app.get('/admin/khachhang', async (req, res) => {
//     try {
//         const khachhangs = await DataModel.Data_KhachHang_Model.find({}).lean();
//         res.render('khachhang', { layout: 'AdminMain', title: 'Quản lý khách hàng', khachhangs });
//     } catch (err) {
//         res.status(500).send('Lỗi server!');
//     }
// });

// // Admin login page
// app.get('/admin-login', (req, res) => res.redirect('/'));

// ///////////////////////////////
// //         POST ROUTES        //
// ///////////////////////////////

// // Admin login
// app.post('/admin-login', async (req, res) => {
//     const { username, password } = req.body;
//     try {
//         const admin = await DataModel.Data_Admin_Model.findOne({ username, password });
//         if (admin) {
//             req.session.isAdmin = true;
//             return res.redirect('/admin');
//         }
//         res.send('Sai tài khoản hoặc mật khẩu!');
//     } catch (err) {
//         res.status(500).send('Lỗi server!');
//     }
// });

// // Thêm khách hàng
// app.post('/api/khachhang', async (req, res) => {
//     try {
//         const { name, phone, address } = req.body;
//         const kh = await DataModel.Data_KhachHang_Model.create({ name, phone, address });
//         res.status(200).json(kh);
//     } catch (err) {
//         res.status(400).json({ error: err.message });
//     }
// });

// // Thêm nhân viên
// app.post('/api/nhanvien', async (req, res) => {
//     try {
//         const { name, email, age } = req.body;
//         const nv = await DataModel.Data_NhanVien_Model.create({ name, email, age });
//         res.status(200).json(nv);
//     } catch (err) {
//         res.status(400).json({ error: err.message });
//     }
// });

// // API thêm sản phẩm
// app.post('/api/sanpham', async (req, res) => {
//     try {
//         console.log('📨 Nhận request thêm sản phẩm:', req.body);
        
//         // Kiểm tra dữ liệu đầu vào
//         if (!req.body.ten_san_pham || !req.body.ma_sku || !req.body.danh_muc_id || !req.body.thuong_hieu_id) {
//             console.log('❌ Thiếu thông tin bắt buộc');
//             return res.status(400).json({ 
//                 error: 'Thiếu thông tin bắt buộc: tên sản phẩm, mã SKU, danh mục và thương hiệu' 
//             });
//         }

//         const productData = {
//             ten_san_pham: req.body.ten_san_pham,
//             ma_sku: req.body.ma_sku,
//             danh_muc_id: req.body.danh_muc_id,
//             thuong_hieu_id: req.body.thuong_hieu_id,
//             gia_niem_yet: req.body.gia_niem_yet || req.body.gia_ban || 0,
//             gia_ban: req.body.gia_ban || 0,
//             trong_luong: req.body.trong_luong || null,
//             kich_thuoc: req.body.kich_thuoc || '',
//             mo_ta: req.body.mo_ta || '',
//             mo_ta_ngan: req.body.mo_ta_ngan || (req.body.mo_ta ? req.body.mo_ta.substring(0, 100) : ''),
//             slug: req.body.slug || (req.body.ten_san_pham ? req.body.ten_san_pham.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '') : ''),
//             san_pham_noi_bat: req.body.san_pham_noi_bat || false,
//             trang_thai: req.body.trang_thai || 1,
//             luot_xem: 0,
//             link_anh: req.body.link_anh || '',
//             ngay_tao: new Date(),
//             ngay_cap_nhat: new Date()
//         };

//         console.log('💾 Dữ liệu sẽ lưu:', productData);
        
//         const newProduct = await DataModel.Data_SanPham_Model.create(productData);
        
//         // Populate để trả về đầy đủ thông tin
//         const populatedProduct = await DataModel.Data_SanPham_Model.findById(newProduct._id)
//             .populate('danh_muc_id')
//             .populate('thuong_hieu_id')
//             .lean();
        
//         console.log('✅ Thêm sản phẩm thành công:', populatedProduct._id);
        
//         res.status(201).json(populatedProduct);
        
//     } catch (err) {
//         console.error('❌ Lỗi thêm sản phẩm:', err);
//         res.status(500).json({ 
//             error: 'Lỗi khi thêm sản phẩm',
//             details: err.message
//         });
//     }
// });

// // API Thêm danh mục
// app.post('/api/danhmuc', async (req, res) => {
//   try {
//     const { ten_danh_muc, mo_ta, danh_muc_cha_id, anh_url, thu_tu, trang_thai } = req.body;
    
//     // Tạo slug từ tên danh mục
//     const slug = ten_danh_muc
//       .toLowerCase()
//       .normalize('NFD')
//       .replace(/[\u0300-\u036f]/g, '')
//       .replace(/[đĐ]/g, 'd')
//       .replace(/[^a-z0-9 -]/g, '')
//       .replace(/\s+/g, '-')
//       .replace(/-+/g, '-');

//     const newCategory = new DataModel.Data_Category_Model({
//       ten_danh_muc,
//       mo_ta,
//       danh_muc_cha_id: danh_muc_cha_id || null,
//       anh_url,
//       thu_tu: thu_tu || 0,
//       trang_thai: trang_thai !== undefined ? trang_thai : 1,
//       slug
//     });

//     await newCategory.save();
//     res.status(201).json(newCategory);
//   } catch (error) {
//     console.error('Lỗi thêm danh mục:', error);
//     if (error.code === 11000) {
//       res.status(400).json({ error: 'Slug đã tồn tại!' });
//     } else {
//       res.status(500).json({ error: 'Lỗi server!' });
//     }
//   }
// });

// // API Thêm thương hiệu
// app.post('/api/thuonghieu', async (req, res) => {
//   try {
//     const { ten_thuong_hieu, mo_ta, logo_url, trang_thai } = req.body;
    
//     // Tạo slug từ tên thương hiệu
//     const slug = ten_thuong_hieu
//       .toLowerCase()
//       .normalize('NFD')
//       .replace(/[\u0300-\u036f]/g, '')
//       .replace(/[đĐ]/g, 'd')
//       .replace(/[^a-z0-9 -]/g, '')
//       .replace(/\s+/g, '-')
//       .replace(/-+/g, '-');

//     const newBrand = new DataModel.Data_Brand_Model({
//       ten_thuong_hieu,
//       mo_ta,
//       logo_url,
//       trang_thai: trang_thai !== undefined ? trang_thai : 1,
//       slug
//     });

//     await newBrand.save();
//     res.status(201).json(newBrand);
//   } catch (error) {
//     console.error('Lỗi thêm thương hiệu:', error);
//     if (error.code === 11000) {
//       res.status(400).json({ error: 'Slug đã tồn tại!' });
//     } else {
//       res.status(500).json({ error: 'Lỗi server!' });
//     }
//   }
// });

// ///////////////////////////////
// //         PUT ROUTES         //
// ///////////////////////////////

// // Cập nhật khách hàng
// app.put('/api/khachhang/:id', async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { name, phone, address } = req.body;
//         const kh = await DataModel.Data_KhachHang_Model.findByIdAndUpdate(id, { name, phone, address }, { new: true });
//         if (!kh) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
//         res.json(kh);
//     } catch (err) {
//         res.status(400).json({ error: err.message });
//     }
// });

// // API cập nhật sản phẩm
// app.put('/api/sanpham/:id', async (req, res) => {
//     try {
//         const updateData = {
//             ...req.body,
//             ngay_cap_nhat: new Date()
//         };
        
//         const updatedProduct = await DataModel.Data_SanPham_Model.findByIdAndUpdate(
//             req.params.id,
//             updateData,
//             { new: true }
//         ).populate('danh_muc_id').populate('thuong_hieu_id').lean();
        
//         if (!updatedProduct) {
//             return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
//         }
        
//         res.json(updatedProduct);
        
//     } catch (err) {
//         res.status(500).json({ error: 'Lỗi khi cập nhật sản phẩm' });
//     }
// });

// // API Cập nhật danh mục
// app.put('/api/danhmuc/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { ten_danh_muc, mo_ta, danh_muc_cha_id, anh_url, thu_tu, trang_thai } = req.body;

//     const updateData = {
//       ten_danh_muc,
//       mo_ta,
//       danh_muc_cha_id: danh_muc_cha_id || null,
//       anh_url,
//       thu_tu,
//       trang_thai,
//       ngay_cap_nhat: Date.now()
//     };

//     const updatedCategory = await DataModel.Data_Category_Model.findByIdAndUpdate(
//       id,
//       updateData,
//       { new: true, runValidators: true }
//     );

//     if (!updatedCategory) {
//       return res.status(404).json({ error: 'Không tìm thấy danh mục!' });
//     }

//     res.json(updatedCategory);
//   } catch (error) {
//     console.error('Lỗi cập nhật danh mục:', error);
//     res.status(500).json({ error: 'Lỗi server!' });
//   }
// });

// // API Cập nhật thương hiệu
// app.put('/api/thuonghieu/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { ten_thuong_hieu, mo_ta, logo_url, trang_thai } = req.body;

//     const updateData = {
//       ten_thuong_hieu,
//       mo_ta,
//       logo_url,
//       trang_thai,
//       ngay_cap_nhat: Date.now()
//     };

//     const updatedBrand = await DataModel.Data_Brand_Model.findByIdAndUpdate(
//       id,
//       updateData,
//       { new: true, runValidators: true }
//     );

//     if (!updatedBrand) {
//       return res.status(404).json({ error: 'Không tìm thấy thương hiệu!' });
//     }

//     res.json(updatedBrand);
//   } catch (error) {
//     console.error('Lỗi cập nhật thương hiệu:', error);
//     res.status(500).json({ error: 'Lỗi server!' });
//   }
// });

// // Cập nhật phòng hát
// app.put('/api/phonghat/:id', async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { TenPhong, LoaiPhong, GiaPhong, SucChua, TrangThai, MoTa, AnhPhong } = req.body;
//         const ph = await DataModel.Data_PhongHat_Model.findByIdAndUpdate(id, { TenPhong, LoaiPhong, GiaPhong, SucChua, TrangThai, MoTa, AnhPhong }, { new: true });
//         if (!ph) return res.status(404).json({ error: 'Không tìm thấy phòng hát' });
//         res.json(ph);
//     } catch (err) {
//         res.status(400).json({ error: err.message });
//     }
// });

// ///////////////////////////////
// //        DELETE ROUTES       //
// ///////////////////////////////

// // Xóa khách hàng
// app.delete('/api/khachhang/:id', async (req, res) => {
//     try {
//         const { id } = req.params;
//         const kh = await DataModel.Data_KhachHang_Model.findByIdAndDelete(id);
//         if (!kh) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
//         res.json({ message: 'Xóa khách hàng thành công' });
//     } catch (err) {
//         res.status(400).json({ error: err.message });
//     }
// });

// // API xóa sản phẩm
// app.delete('/api/sanpham/:id', async (req, res) => {
//     try {
//         await DataModel.Data_SanPham_Model.findByIdAndDelete(req.params.id);
//         res.json({ success: true });
//     } catch (err) {
//         res.status(500).json({ error: 'Lỗi khi xóa sản phẩm' });
//     }
// });

// // API Xoá danh mục
// app.delete('/api/danhmuc/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
    
//     // Kiểm tra xem danh mục có sản phẩm không
//     const productCount = await DataModel.Data_SanPham_Model.countDocuments({ danh_muc_id: id });
//     if (productCount > 0) {
//       return res.status(400).json('Không thể xóa danh mục này vì có sản phẩm đang sử dụng!');
//     }

//     const deletedCategory = await DataModel.Data_Category_Model.findByIdAndDelete(id);
    
//     if (!deletedCategory) {
//       return res.status(404).json({ error: 'Không tìm thấy danh mục!' });
//     }

//     res.json({ message: 'Xóa danh mục thành công!' });
//   } catch (error) {
//     console.error('Lỗi xóa danh mục:', error);
//     res.status(500).json({ error: 'Lỗi server!' });
//   }
// });

// // API Xoá thương hiệu
// app.delete('/api/thuonghieu/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
    
//     // Kiểm tra xem thương hiệu có sản phẩm không
//     const productCount = await DataModel.Data_SanPham_Model.countDocuments({ thuong_hieu_id: id });
//     if (productCount > 0) {
//       return res.status(400).json('Không thể xóa thương hiệu này vì có sản phẩm đang sử dụng!' );
//     }

//     const deletedBrand = await DataModel.Data_Brand_Model.findByIdAndDelete(id);
    
//     if (!deletedBrand) {
//       return res.status(404).json({ error: 'Không tìm thấy thương hiệu!' });
//     }

//     res.json({ message: 'Xóa thương hiệu thành công!' });
//   } catch (error) {
//     console.error('Lỗi xóa thương hiệu:', error);
//     res.status(500).json({ error: 'Lỗi server!' });
//   }
// });

// // Xóa phòng hát
// app.delete('/api/phonghat/:id', async (req, res) => {
//     try {
//         const { id } = req.params;
//         const ph = await DataModel.Data_PhongHat_Model.findByIdAndDelete(id);
//         if (!ph) return res.status(404).json({ error: 'Không tìm thấy phòng hát' });
//         res.json({ message: 'Xóa phòng hát thành công' });
//     } catch (err) {
//         res.status(400).json({ error: err.message });
//     }
// });




///////////////////////////////
//        START SERVER        //
///////////////////////////////
app.listen(3000, () => console.log('Server running on port 3000'));