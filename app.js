import express from 'express';
import { engine } from 'express-handlebars';
import db from './server.js';
import DataModel from './app/model/index.js';

import mongoose, { mongo } from 'mongoose';

import multer from 'multer';
import path from 'path';

import { v2 as cloudinary } from 'cloudinary';
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

import fs, { link } from 'fs';
// import cors from 'cors';

import dotenv from 'dotenv';
dotenv.config();

db.connectAllDB();
const app = express();


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
// Map legacy `/images` URL path to actual `public/image` folder
app.use('/images', express.static(path.join(process.cwd(), 'public', 'image')));

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



// =============================================
// MULTER CONFIGURATION FOR FILE UPLOAD
// =============================================

// Tạo thư mục upload tạm
const tempUploadDir = path.join(process.cwd(), 'temp_uploads');
if (!fs.existsSync(tempUploadDir)) {
    fs.mkdirSync(tempUploadDir, { recursive: true });
}

// Cấu hình storage cho multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, name + '-' + uniqueSuffix + ext);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedImageTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Định dạng file không được hỗ trợ: ${file.mimetype}. Chỉ chấp nhận JPG, PNG, GIF, WebP`), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    }
});

// Middleware xử lý lỗi upload
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'Kích thước file quá lớn. Tối đa 10MB'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Quá nhiều file được chọn'
            });
        }
    }
    res.status(400).json({
        success: false,
        message: err.message
    });
};



// =============================================
// CLOUDINARY UTILITY FUNCTIONS
// =============================================

// Hàm upload ảnh lên Cloudinary
const uploadToCloudinary = async (filePath, folder = 'products') => {
    try {
        console.log(`☁️ Uploading to Cloudinary folder: ${folder}`);
        
        const result = await cloudinary.uploader.upload(filePath, {
            folder: `webPhone/${folder}`,
            resource_type: 'image',
            quality: 'auto:good',
            fetch_format: 'auto'
        });

        // Xóa file tạm sau khi upload
        fs.unlinkSync(filePath);
        
        console.log(`✅ Upload successful: ${result.secure_url}`);
        return result;
    } catch (error) {
        // Vẫn xóa file tạm dù upload thất bại
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
};

// Hàm xóa ảnh từ Cloudinary
const deleteFromCloudinary = async (imageUrl) => {
    try {
        if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
            return { result: 'not_cloudinary' };
        }

        // Extract public_id từ URL Cloudinary
        const publicId = extractPublicIdFromUrl(imageUrl);
        if (!publicId) {
            throw new Error('Could not extract public_id from URL');
        }

        console.log(`🗑️ Deleting from Cloudinary: ${publicId}`);
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('❌ Cloudinary delete failed:', error);
        throw error;
    }
};

// Hàm extract public_id từ Cloudinary URL
const extractPublicIdFromUrl = (url) => {
    try {
        // Ví dụ: https://res.cloudinary.com/cloudname/image/upload/v1234567/karaoke/products/image.jpg
        const matches = url.match(/\/upload\/(?:v\d+\/)?(.+)\.(?:jpg|jpeg|png|gif|webp)/i);
        return matches ? matches[1] : null;
    } catch (error) {
        console.error('Error extracting public_id:', error);
        return null;
    }
};

// =============================================
// UPLOAD ROUTES FOR BRAND, CATEGORY, PRODUCT
// =============================================

// Upload brand logo
app.post('/api/upload/brand-logo', upload.single('brandLogo'), handleUploadError, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn file logo'
            });
        }

        // Kiểm tra nếu có oldImageUrl trong body thì xóa ảnh cũ
        const { oldImageUrl } = req.body;
        if (oldImageUrl) {
            try {
                await deleteFromCloudinary(oldImageUrl);
            } catch (deleteError) {
                console.warn('⚠️ Could not delete old image:', deleteError.message);
            }
        }

        // Upload ảnh mới lên Cloudinary
        const result = await uploadToCloudinary(req.file.path, 'brands');
        
        res.json({
            success: true,
            message: 'Upload logo thành công',
            data: {
                url: result.secure_url,
                public_id: result.public_id,
                format: result.format,
                bytes: result.bytes
            }
        });

    } catch (error) {
        console.error('❌ Brand logo upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi upload logo: ' + error.message
        });
    }
});

// Upload category image
app.post('/api/upload/category-image', upload.single('categoryImage'), handleUploadError, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn file ảnh'
            });
        }

        // Kiểm tra nếu có oldImageUrl trong body thì xóa ảnh cũ
        const { oldImageUrl } = req.body;
        if (oldImageUrl) {
            try {
                await deleteFromCloudinary(oldImageUrl);
            } catch (deleteError) {
                console.warn('⚠️ Could not delete old image:', deleteError.message);
            }
        }

        // Upload ảnh mới lên Cloudinary
        const result = await uploadToCloudinary(req.file.path, 'categories');
        
        res.json({
            success: true,
            message: 'Upload ảnh danh mục thành công',
            data: {
                url: result.secure_url,
                public_id: result.public_id,
                format: result.format,
                bytes: result.bytes
            }
        });

    } catch (error) {
        console.error('❌ Category image upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi upload ảnh danh mục: ' + error.message
        });
    }
});

// Upload product main image
app.post('/api/upload/product-main-image', upload.single('productMainImage'), handleUploadError, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn file ảnh chính'
            });
        }

        // Kiểm tra nếu có oldImageUrl trong body thì xóa ảnh cũ
        const { oldImageUrl } = req.body;
        if (oldImageUrl) {
            try {
                await deleteFromCloudinary(oldImageUrl);
            } catch (deleteError) {
                console.warn('⚠️ Could not delete old image:', deleteError.message);
            }
        }

        // Upload ảnh mới lên Cloudinary
        const result = await uploadToCloudinary(req.file.path, 'products');
        
        res.json({
            success: true,
            message: 'Upload ảnh chính thành công',
            data: {
                url: result.secure_url,
                public_id: result.public_id,
                format: result.format,
                bytes: result.bytes
            }
        });

    } catch (error) {
        console.error('❌ Product main image upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi upload ảnh chính: ' + error.message
        });
    }
});

// Upload multiple product additional images
app.post('/api/upload/product-additional-images', upload.array('productAdditionalImages', 10), handleUploadError, async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn file ảnh'
            });
        }

        const uploadPromises = req.files.map(file => 
            uploadToCloudinary(file.path, 'products/additional')
        );

        const results = await Promise.all(uploadPromises);
        
        const uploadedImages = results.map(result => ({
            url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            bytes: result.bytes
        }));

        res.json({
            success: true,
            message: `Upload ${uploadedImages.length} ảnh thành công`,
            data: uploadedImages
        });

    } catch (error) {
        console.error('❌ Product additional images upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi upload ảnh phụ: ' + error.message
        });
    }
});

// API để xóa ảnh từ Cloudinary
app.delete('/api/upload/image', async (req, res) => {
    try {
        const { imageUrl } = req.body;

        if (!imageUrl) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu URL ảnh'
            });
        }

        console.log('🗑️ Received delete request for:', imageUrl);
        const result = await deleteFromCloudinary(imageUrl);

        res.json({
            success: true,
            message: 'Xóa ảnh thành công',
            data: result
        });

    } catch (error) {
        console.error('❌ Image delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa ảnh: ' + error.message
        });
    }
});



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
                mongo_detail_id: sp.mongo_detail_id,
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
        await DataModel.SQL.Product.update(updateData, productId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Cập nhật API xóa sản phẩm trong app.js
app.delete('/api/sanpham/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        
        console.log(`🗑️ API: Xóa sản phẩm ${productId}`);

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'ID sản phẩm là bắt buộc'
            });
        }

        // Tìm sản phẩm để lấy thông tin ảnh và mongo_detail_id
        const product = await DataModel.SQL.Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }

        // Xóa ảnh chính từ Cloudinary nếu có
        if (product.link_anh && product.link_anh.includes('cloudinary.com')) {
            try {
                console.log('🗑️ Deleting product main image from Cloudinary:', product.link_anh);
                await deleteFromCloudinary(product.link_anh);
            } catch (delErr) {
                console.warn('⚠️ Failed to delete product main image:', delErr.message);
            }
        }

        // Xóa document MongoDB nếu có
        if (product.mongo_detail_id) {
            try {
                // Xóa ảnh phụ từ Cloudinary trước
                const mongoDoc = await DataModel.Mongo.ProductDetail.findOne({ 
                    sql_product_id: productId 
                });
                
                if (mongoDoc && mongoDoc.hinh_anh && Array.isArray(mongoDoc.hinh_anh)) {
                    for (const imageUrl of mongoDoc.hinh_anh) {
                        if (imageUrl && imageUrl.includes('cloudinary.com')) {
                            try {
                                await deleteFromCloudinary(imageUrl);
                                console.log('🗑️ Deleted additional image:', imageUrl);
                            } catch (imgErr) {
                                console.warn('⚠️ Failed to delete additional image:', imgErr.message);
                            }
                        }
                    }
                }

                // Xóa document MongoDB
                await DataModel.Mongo.ProductDetail.findByIdAndDelete(product.mongo_detail_id);
                console.log('✅ MongoDB document deleted:', product.mongo_detail_id);
            } catch (mongoError) {
                console.warn('⚠️ Could not delete MongoDB document:', mongoError.message);
            }
        }

        // Xóa sản phẩm từ SQL
        const result = await DataModel.SQL.Product.destroy({
            where: { id: productId }
        });

        console.log(`✅ Đã xóa sản phẩm: ${product.ten_san_pham}`);

        res.json({
            success: true,
            message: 'Xóa sản phẩm thành công',
            data: result
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi xóa sản phẩm:', error);
        
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa sản phẩm',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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

        // If the image URL changed, attempt to delete the old image from Cloudinary
        if (categoryData.anh_url && categoryData.anh_url !== existingCategory.anh_url) {
            try {
                if (existingCategory.anh_url && existingCategory.anh_url.includes('cloudinary.com')) {
                    console.log('🗑️ Deleting old category image from Cloudinary:', existingCategory.anh_url);
                    await deleteFromCloudinary(existingCategory.anh_url);
                }
            } catch (delErr) {
                console.warn('⚠️ Failed to delete old category image:', delErr.message);
            }
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




// =============================================
// PRODUCT API ROUTES
// =============================================

// POST /api/sanpham - Thêm sản phẩm mới
app.post('/api/sanpham', async (req, res) => {
    try {
        const productData = req.body;
        console.log('🔄 API: Thêm sản phẩm mới', productData);

        // Validate dữ liệu
        if (!productData.ten_san_pham || !productData.ma_sku) {
            return res.status(400).json({
                success: false,
                message: 'Tên sản phẩm và mã SKU là bắt buộc'
            });
        }

        // Kiểm tra SKU trùng
        const existingProduct = await DataModel.SQL.Product.findOne({ 
            where: { ma_sku: productData.ma_sku } 
        });
        
        if (existingProduct) {
            return res.status(400).json({
                success: false,
                message: 'Mã SKU đã tồn tại'
            });
        }

        const newProduct = await DataModel.SQL.Product.create({
            ten_san_pham: productData.ten_san_pham,
            ma_sku: productData.ma_sku,
            danh_muc_id: productData.danh_muc_id,
            thuong_hieu_id: productData.thuong_hieu_id,
            gia_niem_yet: productData.gia_niem_yet || null,
            gia_ban: productData.gia_ban,
            giam_gia: productData.giam_gia || 0,
            trang_thai: productData.trang_thai !== undefined ? productData.trang_thai : 1,
            slug: productData.slug,
            so_luong_ton: productData.so_luong_ton || 0,
            luot_xem: productData.luot_xem || 0,
            so_luong_ban: productData.so_luong_ban || 0,
            ngay_tao: new Date(),
            ngay_cap_nhat: new Date()
        });

        console.log(`✅ Đã thêm sản phẩm: ${newProduct.ten_san_pham}`);

        res.status(201).json({
            success: true,
            message: 'Thêm sản phẩm thành công',
            product: newProduct
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi thêm sản phẩm:', error);
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                message: 'Mã SKU đã tồn tại'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi thêm sản phẩm',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// PUT /api/sanpham/:id - Cập nhật sản phẩm
app.put('/api/sanpham/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const productData = req.body;
        
        console.log(`🔄 API: Cập nhật sản phẩm ${productId}`, productData);

        // Validate dữ liệu
        if (!productData.ten_san_pham) {
            return res.status(400).json({
                success: false,
                message: 'Tên sản phẩm là bắt buộc'
            });
        }

        // Tìm sản phẩm hiện tại
        const existingProduct = await DataModel.SQL.Product.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }

        // Kiểm tra SKU trùng (nếu thay đổi)
        if (productData.ma_sku && productData.ma_sku !== existingProduct.ma_sku) {
            const duplicateProduct = await DataModel.SQL.Product.findOne({ 
                where: { ma_sku: productData.ma_sku } 
            });
            
            if (duplicateProduct && duplicateProduct.id != productId) {
                return res.status(400).json({
                    success: false,
                    message: 'Mã SKU đã tồn tại'
                });
            }
        }

        const updateData = {
            ten_san_pham: productData.ten_san_pham,
            ma_sku: productData.ma_sku || existingProduct.ma_sku,
            danh_muc_id: productData.danh_muc_id || existingProduct.danh_muc_id,
            thuong_hieu_id: productData.thuong_hieu_id || existingProduct.thuong_hieu_id,
            gia_niem_yet: productData.gia_niem_yet || existingProduct.gia_niem_yet,
            gia_ban: productData.gia_ban || existingProduct.gia_ban,
            giam_gia: productData.giam_gia !== undefined ? productData.giam_gia : existingProduct.giam_gia,
            trang_thai: productData.trang_thai !== undefined ? productData.trang_thai : existingProduct.trang_thai,
            link_anh: productData.link_anh || existingProduct.link_anh,
            mo_ta: productData.mo_ta || existingProduct.mo_ta,
            mo_ta_ngan: productData.mo_ta_ngan || existingProduct.mo_ta_ngan,
            san_pham_noi_bat: productData.san_pham_noi_bat !== undefined ? productData.san_pham_noi_bat : existingProduct.san_pham_noi_bat,
            slug: productData.slug || existingProduct.slug,
            ngay_cap_nhat: new Date()
        };

        // Nếu URL ảnh thay đổi, xóa ảnh cũ khỏi Cloudinary
        if (productData.link_anh && productData.link_anh !== existingProduct.link_anh) {
            try {
                if (existingProduct.link_anh && existingProduct.link_anh.includes('cloudinary.com')) {
                    console.log('🗑️ Deleting old product image from Cloudinary:', existingProduct.link_anh);
                    await deleteFromCloudinary(existingProduct.link_anh);
                }
            } catch (delErr) {
                console.warn('⚠️ Failed to delete old product image:', delErr.message);
            }
        }

        console.log('📤 Dữ liệu cập nhật:', updateData);

        const updatedProduct = await DataModel.SQL.Product.update(productId, updateData);

        console.log(`✅ Đã cập nhật sản phẩm: ${updatedProduct.ten_san_pham}`);

        res.json({
            success: true,
            message: 'Cập nhật sản phẩm thành công',
            product: updatedProduct
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi cập nhật sản phẩm:', error);
        
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật sản phẩm',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// DELETE /api/sanpham/:id - Xóa sản phẩm
app.delete('/api/sanpham/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        
        console.log(`🗑️ API: Xóa sản phẩm ${productId}`);

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'ID sản phẩm là bắt buộc'
            });
        }

        // Tìm sản phẩm để lấy thông tin ảnh
        const product = await DataModel.SQL.Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }

        // Xóa ảnh từ Cloudinary nếu có
        if (product.link_anh && product.link_anh.includes('cloudinary.com')) {
            try {
                console.log('🗑️ Deleting product image from Cloudinary:', product.link_anh);
                await deleteFromCloudinary(product.link_anh);
            } catch (delErr) {
                console.warn('⚠️ Failed to delete product image:', delErr.message);
            }
        }

        // Xóa thông số kỹ thuật từ MongoDB
        try {
            await DataModel.Mongo.ProductDetail.deleteOne({ sql_product_id: productId });
            console.log('✅ Đã xóa thông số kỹ thuật từ MongoDB');
        } catch (mongoError) {
            console.warn('⚠️ Could not delete MongoDB specs:', mongoError.message);
        }

        const result = await DataModel.SQL.Product.destroy({
            where: { id: productId }
        });

        console.log(`✅ Đã xóa sản phẩm: ${product.ten_san_pham}`);

        res.json({
            success: true,
            message: 'Xóa sản phẩm thành công',
            data: result
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi xóa sản phẩm:', error);
        
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa sản phẩm',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// PUT /api/sanpham/:id/status - Cập nhật trạng thái sản phẩm
app.put('/api/sanpham/:id/status', async (req, res) => {
    try {
        const productId = req.params.id;
        const { trang_thai } = req.body;

        console.log(`🔄 API: Cập nhật trạng thái sản phẩm ${productId} -> ${trang_thai}`);

        if (trang_thai === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái là bắt buộc'
            });
        }

        const product = await DataModel.SQL.Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }

        const updatedProduct = await DataModel.SQL.Product.update(productId, {
            trang_thai: trang_thai,
            ngay_cap_nhat: new Date()
        });

        const statusText = trang_thai ? 'kích hoạt' : 'ngừng bán';
        
        res.json({
            success: true,
            message: `Đã ${statusText} sản phẩm thành công`,
            product: updatedProduct
        });

    } catch (error) {
        console.error('❌ Lỗi khi cập nhật trạng thái sản phẩm:', error);
        
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật trạng thái',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// =============================================
// MONGODB PRODUCT DETAILS API ROUTES - FIXED FOR strict: false
// =============================================

// POST /api/mongo/sanpham - Tạo document mới trong MongoDB
app.post('/api/mongo/sanpham', async (req, res) => {
    try {
        // THÊM link_avatar vào destructuring
        const { sql_product_id, thong_so_ky_thuat, hinh_anh, mo_ta_chi_tiet, slug, link_avatar } = req.body;

        console.log('🔄 API: Tạo document MongoDB mới');
        console.log('📝 Request data:', {
            sql_product_id,
            has_specs: !!thong_so_ky_thuat,
            has_images: !!hinh_anh,
            has_description: !!mo_ta_chi_tiet,
            slug,
            link_avatar // THÊM VÀO LOG
        });

        // Kiểm tra kết nối MongoDB
        const dbState = mongoose.connection.readyState;
        console.log('🔌 MongoDB connection state:', dbState);
        
        if (dbState !== 1) {
            throw new Error(`MongoDB connection is not ready. State: ${dbState}`);
        }

        // Tạo document data - THÊM link_avatar
        const documentData = {
            sql_product_id: sql_product_id.toLowerCase() || null,
            slug: slug || `temp-${Date.now()}`
        };

        // Thêm thông số kỹ thuật nếu có
        if (thong_so_ky_thuat && typeof thong_so_ky_thuat === 'object') {
            // Chuyển đổi từ object sang array format
            documentData.thong_so_ky_thuat = Object.entries(thong_so_ky_thuat).map(([ten, gia_tri]) => ({
                ten: ten.trim(),
                gia_tri: gia_tri
            }));
        } else {
            documentData.thong_so_ky_thuat = [];
        }

        // Thêm hình ảnh nếu có
        if (hinh_anh && Array.isArray(hinh_anh)) {
            documentData.hinh_anh = hinh_anh;
        } else {
            documentData.hinh_anh = [];
        }

        // Thêm mô tả chi tiết nếu có
        if (mo_ta_chi_tiet) {
            documentData.mo_ta_chi_tiet = mo_ta_chi_tiet;
        }

        // QUAN TRỌNG: THÊM link_avatar vào document
        if (link_avatar) {
            documentData.link_avatar = link_avatar;
            console.log('✅ Added link_avatar to document:', link_avatar);
        } else if (hinh_anh && hinh_anh.length > 0) {
            // Fallback: nếu không có link_avatar nhưng có hình ảnh, dùng ảnh đầu tiên
            documentData.link_avatar = hinh_anh[0];
            console.log('🔄 Using first image as link_avatar:', hinh_anh[0]);
        } else {
            documentData.link_avatar = '';
            console.log('⚠️ No link_avatar provided and no images available');
        }

        console.log('📊 Document data to save:', {
            sql_product_id: documentData.sql_product_id,
            slug: documentData.slug,
            specs_count: documentData.thong_so_ky_thuat.length,
            images_count: documentData.hinh_anh.length,
            has_description: !!documentData.mo_ta_chi_tiet,
            link_avatar: documentData.link_avatar // THÊM VÀO LOG
        });

        // Tạo và lưu document
        const newProductDetail = new DataModel.Mongo.ProductDetail(documentData);
        const savedDetail = await newProductDetail.save();
        
        console.log('✅ MongoDB document created successfully:', savedDetail._id);
        console.log('✅ link_avatar saved:', savedDetail.link_avatar);

        res.status(201).json({
            success: true,
            message: 'Tạo document MongoDB thành công',
            data: savedDetail
        });

    } catch (error) {
        console.error('❌ Lỗi khi tạo document MongoDB:', error);
        
        // Log chi tiết lỗi
        console.error('📛 Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            keyPattern: error.keyPattern,
            keyValue: error.keyValue
        });

        // Xử lý các loại lỗi cụ thể
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Lỗi validation: ' + errors.join(', '),
                errors: errors
            });
        }
        
        if (error.name === 'MongoError' && error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Lỗi trùng lặp: sql_product_id đã tồn tại trong MongoDB',
                errorCode: error.code
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo document MongoDB: ' + error.message,
            error: process.env.NODE_ENV === 'development' ? {
                name: error.name,
                message: error.message
            } : undefined
        });
    }
});


// GET /api/check-mongodb - Kiểm tra kết nối MongoDB
app.get('/api/check-mongodb', async (req, res) => {
    try {
        const dbState = mongoose.connection.readyState;
        const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
        
        console.log('🔌 MongoDB connection state:', states[dbState]);
        
        // Thử thực hiện một truy vấn đơn giản
        const count = await DataModel.Mongo.ProductDetail.countDocuments();
        
        res.json({
            success: true,
            message: `MongoDB connection is ${states[dbState]}`,
            state: states[dbState],
            documentCount: count
        });
    } catch (error) {
        console.error('❌ MongoDB check failed:', error);
        res.status(500).json({
            success: false,
            message: 'MongoDB connection failed: ' + error.message
        });
    }
});


// PUT /api/mongo/sanpham/:id - Cập nhật document MongoDB bằng _id
app.put('/api/mongo/sanpham/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // THÊM link_avatar vào destructuring
        const { sql_product_id, thong_so_ky_thuat, hinh_anh, mo_ta_chi_tiet, slug, link_avatar } = req.body;

        console.log('🔄 API: Cập nhật document MongoDB');
        console.log('📝 Request data:', {
            id,
            sql_product_id,
            has_specs: !!thong_so_ky_thuat,
            has_images: !!hinh_anh,
            has_description: !!mo_ta_chi_tiet,
            slug,
            link_avatar // THÊM VÀO LOG
        });

        // Kiểm tra kết nối MongoDB
        const dbState = mongoose.connection.readyState;
        console.log('🔌 MongoDB connection state:', dbState);
        
        if (dbState !== 1) {
            throw new Error(`MongoDB connection is not ready. State: ${dbState}`);
        }

        // Tạo object cập nhật
        const updateData = {};

        // Cập nhật sql_product_id nếu có
        if (sql_product_id) {
            updateData.sql_product_id = sql_product_id.toLowerCase();
        }

        // Cập nhật thông số kỹ thuật nếu có
        if (thong_so_ky_thuat && typeof thong_so_ky_thuat === 'object') {
            // Chuyển đổi từ object sang array format
            updateData.thong_so_ky_thuat = Object.entries(thong_so_ky_thuat).map(([ten, gia_tri]) => ({
                ten: ten.trim(),
                gia_tri: gia_tri
            }));
        }

        // Cập nhật hình ảnh nếu có
        if (hinh_anh && Array.isArray(hinh_anh)) {
            updateData.hinh_anh = hinh_anh;
        }

        // Cập nhật mô tả chi tiết nếu có
        if (mo_ta_chi_tiet !== undefined) {
            updateData.mo_ta_chi_tiet = mo_ta_chi_tiet;
        }

        // Cập nhật slug nếu có
        if (slug) {
            updateData.slug = slug;
        }

        // QUAN TRỌNG: Cập nhật link_avatar
        if (link_avatar !== undefined) {
            updateData.link_avatar = link_avatar;
            console.log('✅ Updating link_avatar:', link_avatar);
        } else if (hinh_anh && hinh_anh.length > 0) {
            // Fallback: nếu không có link_avatar nhưng có hình ảnh, dùng ảnh đầu tiên
            updateData.link_avatar = hinh_anh[0];
            console.log('🔄 Using first image as link_avatar:', hinh_anh[0]);
        }

        console.log('📊 Update data to save:', updateData);

        // Tìm và cập nhật document
        const updatedDetail = await DataModel.Mongo.ProductDetail.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedDetail) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy document MongoDB để cập nhật'
            });
        }

        console.log('✅ MongoDB document updated successfully:', updatedDetail._id);
        console.log('✅ link_avatar after update:', updatedDetail.link_avatar);

        res.json({
            success: true,
            message: 'Cập nhật document MongoDB thành công',
            data: updatedDetail
        });

    } catch (error) {
        console.error('❌ Lỗi khi cập nhật document MongoDB:', error);
        
        // Log chi tiết lỗi
        console.error('📛 Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            keyPattern: error.keyPattern,
            keyValue: error.keyValue
        });

        // Xử lý các loại lỗi cụ thể
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Lỗi validation: ' + errors.join(', '),
                errors: errors
            });
        }
        
        if (error.name === 'MongoError' && error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Lỗi trùng lặp: sql_product_id đã tồn tại trong MongoDB',
                errorCode: error.code
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật document MongoDB: ' + error.message,
            error: process.env.NODE_ENV === 'development' ? {
                name: error.name,
                message: error.message
            } : undefined
        });
    }
});

// GET /api/mongo/sanpham/sql/:sql_product_id - Lấy document MongoDB bằng sql_product_id
app.get('/api/mongo/sanpham/sql/:sql_product_id', async (req, res) => {
    try {
        const sqlProductId = req.params.sql_product_id;
        console.log(`🔍 API: Lấy document MongoDB bằng sql_product_id ${sqlProductId}`);

        const productDetail = await DataModel.Mongo.ProductDetail.findOne({ 
            sql_product_id: sqlProductId
        });

        if (!productDetail) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy document MongoDB'
            });
        }

        // Chuyển đổi thông số kỹ thuật từ array sang object
        const thongSoKyThuatObject = {};
        if (productDetail.thong_so_ky_thuat && Array.isArray(productDetail.thong_so_ky_thuat)) {
            productDetail.thong_so_ky_thuat.forEach(spec => {
                if (spec.ten && spec.gia_tri !== undefined) {
                    thongSoKyThuatObject[spec.ten] = spec.gia_tri;
                }
            });
        }

        const responseData = {
            _id: productDetail._id,
            sql_product_id: productDetail.sql_product_id,
            slug: productDetail.slug,
            thong_so_ky_thuat: thongSoKyThuatObject,
            hinh_anh: productDetail.hinh_anh || [],
            mo_ta_chi_tiet: productDetail.mo_ta_chi_tiet,
            createdAt: productDetail.createdAt,
            updatedAt: productDetail.updatedAt
        };

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('❌ Lỗi khi lấy document MongoDB:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy document MongoDB',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// DELETE /api/mongo/sanpham/:id - Xóa document MongoDB
app.delete('/api/mongo/sanpham/:id', async (req, res) => {
    try {
        const mongoId = req.params.id;
        console.log(`🗑️ API: Xóa document MongoDB ${mongoId}`);

        const result = await DataModel.Mongo.ProductDetail.findByIdAndDelete(mongoId);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy document MongoDB'
            });
        }

        console.log('✅ MongoDB document deleted:', mongoId);

        res.json({
            success: true,
            message: 'Xóa document MongoDB thành công',
            data: result
        });

    } catch (error) {
        console.error('❌ Lỗi khi xóa document MongoDB:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa document MongoDB',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});














app.listen(3000, () => console.log('Server running on port 3000'));