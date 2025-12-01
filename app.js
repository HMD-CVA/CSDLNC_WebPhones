import express from 'express';
import { engine } from 'express-handlebars';
import db from './server.js';
import DataModel from './app/model/index.js';
import sql from 'mssql';

import mongoose, { mongo } from 'mongoose';

import multer from 'multer';
import path from 'path';

import { v2 as cloudinary } from 'cloudinary';
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

import fs from 'fs';
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
    const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/webm'];
    
    // Cho phép cả ảnh và video
    if (allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Định dạng file không được hỗ trợ: ${file.mimetype}. Chỉ chấp nhận JPG, PNG, GIF, WebP, MP4, MOV, AVI, WebM`), false);
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
            const isVideo = req.originalUrl.includes('video');
            const maxSize = isVideo ? '100MB' : '10MB';
            return res.status(400).json({
                success: false,
                message: `Kích thước file quá lớn. Tối đa ${maxSize}`
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Quá nhiều file được chọn'
            });
        }
    }
    
    // Xử lý lỗi file filter
    if (err.message.includes('Định dạng file không được hỗ trợ')) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
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
        // Hoặc: https://res.cloudinary.com/cloudname/video/upload/v1234567/karaoke/products/video.mp4
        const matches = url.match(/\/upload\/(?:v\d+\/)?(.+)\.(?:jpg|jpeg|png|gif|webp|mp4|mov|avi|webm)/i);
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

        // Lấy thông tin sản phẩm để tạo folder
        const { productSlug, oldImageUrl } = req.body;
        
        console.log('📦 Product info received:', { productSlug });
        
        // Tạo tên folder: products/slug/images
        let folderPath = 'products';
        if (productSlug) {
            folderPath = `products/${productSlug}/images`;
            console.log(`📁 Using folder path: ${folderPath}`);
        } else {
            console.warn('⚠️ Missing productSlug, using default folder: products');
        }

        // Kiểm tra nếu có oldImageUrl trong body thì xóa ảnh cũ
        if (oldImageUrl) {
            try {
                await deleteFromCloudinary(oldImageUrl);
            } catch (deleteError) {
                console.warn('⚠️ Could not delete old image:', deleteError.message);
            }
        }

        // Upload ảnh mới lên Cloudinary
        const result = await uploadToCloudinary(req.file.path, folderPath);
        
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

        // Lấy thông tin sản phẩm để tạo folder
        const { productSlug } = req.body;
        
        console.log('📦 Product info received:', { productSlug });
        
        // Tạo tên folder: products/slug/images
        let folderPath = 'products/images';
        if (productSlug) {
            folderPath = `products/${productSlug}/images`;
            console.log(`📁 Using folder path: ${folderPath}`);
        } else {
            console.warn('⚠️ Missing productSlug, using default folder: products/images');
        }

        const uploadPromises = req.files.map(file => 
            uploadToCloudinary(file.path, folderPath)
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
    
    // Lấy danh mục và thương hiệu
    const categories = await DataModel.SQL.Category.findAll();
    const brands = await DataModel.SQL.Brand.findAll();
    
    // Lấy vùng miền và tỉnh thành
    const regions = await DataModel.SQL.Region.findAll();
    const provinces = await DataModel.SQL.Province.findAll();
    
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
      iphoneProducts,
      categories,
      brands,
      regions,
      provinces
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

// Trang giỏ hàng
app.get('/cart', (req, res) => {
    try {
        // Lấy giỏ hàng từ localStorage sẽ được xử lý ở client-side
        res.render('cart', { 
            layout: 'HomeMain.handlebars',
            cartItems: null, // Sẽ load từ localStorage
            cartCount: 0
        });
    } catch (err) {
        console.error('Error loading cart page:', err);
        res.status(500).send('Lỗi server!');
    }
});

// Trang đăng nhập
app.get('/login', (req, res) => {
    try {
        res.render('login', { 
            layout: false // Không dùng layout vì login có design riêng
        });
    } catch (err) {
        console.error('Error loading login page:', err);
        res.status(500).send('Lỗi server!');
    }
});

// Trang đăng ký
app.get('/register', (req, res) => {
    try {
        res.render('register', { 
            layout: false // Không dùng layout vì register có design riêng
        });
    } catch (err) {
        console.error('Error loading register page:', err);
        res.status(500).send('Lỗi server!');
    }
});

// Trang chi tiết sản phẩm
app.get('/product/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        console.log('🔍 Loading product detail:', productId);

        // Lấy thông tin sản phẩm từ SQL Server
        const product = await DataModel.SQL.Product.findById(productId);
        
        if (!product) {
            return res.status(404).send('Không tìm thấy sản phẩm');
        }

        // Lấy thông tin chi tiết từ MongoDB
        let mongoDetail = null;
        let thongSoKyThuat = [];
        let hinhAnhPhu = [];
        let moTaChiTiet = '';
        let variants = null;
        let videos = [];
        let videoLinks = [];
        
        try {
            // Ưu tiên query bằng mongo_detail_id nếu có (nhanh hơn vì query theo _id)
            if (product.mongo_detail_id) {
                console.log('🔍 Fetching MongoDB by mongo_detail_id:', product.mongo_detail_id);
                mongoDetail = await DataModel.Mongo.ProductDetail.findById(product.mongo_detail_id).lean();
            } else {
                // Fallback: query bằng sql_product_id
                console.log('🔍 Fetching MongoDB by sql_product_id:', productId);
                mongoDetail = await DataModel.Mongo.ProductDetail.findOne({ 
                    sql_product_id: productId 
                }).lean();
            }
            
            if (mongoDetail) {
                console.log('✅ Found MongoDB detail:', mongoDetail._id);
                console.log('📋 MongoDB fields:', Object.keys(mongoDetail));
                
                // Lấy thông số kỹ thuật từ MongoDB
                if (mongoDetail.thong_so_ky_thuat && Array.isArray(mongoDetail.thong_so_ky_thuat)) {
                    thongSoKyThuat = mongoDetail.thong_so_ky_thuat.map(spec => ({
                        ten: spec.ten ? spec.ten.replace(/\n/g, '<br>') : spec.ten,
                        gia_tri: spec.gia_tri ? spec.gia_tri.replace(/\n/g, '<br>') : spec.gia_tri
                    }));
                    console.log(`📋 Specs count: ${thongSoKyThuat.length}`);
                }
                
                // Lấy variants (phiên bản sản phẩm)
                if (mongoDetail.variants) {
                    variants = mongoDetail.variants;
                    console.log(`🎨 Variants:`, variants);
                }
                
                // Lấy hình ảnh phụ
                if (mongoDetail.hinh_anh && Array.isArray(mongoDetail.hinh_anh)) {
                    hinhAnhPhu = mongoDetail.hinh_anh;
                    console.log(`🖼️ Additional images: ${hinhAnhPhu.length}`);
                }
                
                // Lấy videos
                if (mongoDetail.videos && Array.isArray(mongoDetail.videos)) {
                    videos = mongoDetail.videos;
                    console.log(`🎬 Videos: ${videos.length}`);
                }
                
                // Lấy video links (YouTube, Vimeo, etc.)
                if (mongoDetail.video_links && Array.isArray(mongoDetail.video_links)) {
                    videoLinks = mongoDetail.video_links;
                    console.log(`🔗 Video links: ${videoLinks.length}`);
                }
                
                // Lấy mô tả chi tiết
                if (mongoDetail.mo_ta_chi_tiet) {
                    moTaChiTiet = mongoDetail.mo_ta_chi_tiet;
                }
            } else {
                console.log('⚠️ No MongoDB detail found for product:', productId);
            }
        } catch (mongoError) {
            console.error('❌ Error fetching MongoDB detail:', mongoError);
        }

        // Format giá tiền
        const formattedProduct = {
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
            tiet_kiem_formatted: product.gia_niem_yet ? new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(product.gia_niem_yet - product.gia_ban) : null,
            is_discount: product.gia_niem_yet && product.gia_niem_yet > product.gia_ban,
            phan_tram_giam: product.gia_niem_yet ? 
                Math.round((1 - product.gia_ban / product.gia_niem_yet) * 100) : 0,
            // Thêm dữ liệu từ MongoDB
            thong_so_ky_thuat: thongSoKyThuat,
            hinh_anh_phu: hinhAnhPhu,
            mo_ta_chi_tiet: moTaChiTiet || product.mo_ta || '',
            variants: variants,
            videos: videos,
            video_links: videoLinks,
            // Thêm giá gốc từ SQL để dùng cho variants
            sql_gia_niem_yet: product.gia_niem_yet
        };

        console.log('📦 Product detail loaded:', {
            id: formattedProduct.id,
            name: formattedProduct.ten_san_pham,
            specs: thongSoKyThuat.length,
            images: hinhAnhPhu.length,
            hasDescription: !!moTaChiTiet
        });

        res.render('productDetail', {
            layout: 'HomeMain.handlebars',
            product: formattedProduct
        });
    } catch (err) {
        console.error('Error loading product detail:', err);
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
        res.status(500).send(`
            <html>
                <head><title>Lỗi</title></head>
                <body>
                    <h1>Đã xảy ra lỗi</h1>
                    <p>Không thể tải trang quản lý sản phẩm: ${err.message}</p>
                    <a href="/admin">Quay lại trang chủ</a>
                </body>
            </html>
        `);
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
        const { sql_product_id, thong_so_ky_thuat, hinh_anh, videos, video_links, variants, thong_tin_khac, link_avatar, mo_ta_chi_tiet, trang_thai, san_pham_noi_bat, slug, chi_tiet } = req.body;

        console.log('🔄 API: Tạo document MongoDB mới');
        console.log('📝 Request data:', {
            sql_product_id,
            has_specs: !!thong_so_ky_thuat,
            has_images: !!hinh_anh,
            has_videos: !!videos,
            has_video_links: !!video_links,
            has_variants: !!variants,
            has_link_avatar: !!link_avatar,
            has_description: !!mo_ta_chi_tiet,
            trang_thai,
            san_pham_noi_bat,
            has_chi_tiet: !!chi_tiet,
            slug
        });

        // Kiểm tra kết nối MongoDB
        const dbState = mongoose.connection.readyState;
        console.log('🔌 MongoDB connection state:', dbState);
        
        if (dbState !== 1) {
            throw new Error(`MongoDB connection is not ready. State: ${dbState}`);
        }

        // Tạo document data - với strict: false, chúng ta có thể thêm bất kỳ trường nào
        const documentData = {
            sql_product_id: sql_product_id.toLowerCase() || null,
            slug: slug || `temp-${Date.now()}`
        };

        // Function to aggregate specs with variant values
        function aggregateSpecsWithVariants(specs, variants) {
            if (!specs || typeof specs !== 'object') return [];
            
            // Convert specs to array format
            let specsArray = Object.entries(specs).map(([ten, gia_tri]) => ({
                ten: ten.trim(),
                gia_tri: gia_tri
            }));
            
            // If no variants, return specs as-is
            if (!variants || !variants.variant_options || !Array.isArray(variants.variant_options)) {
                return specsArray;
            }
            
            // Build mapping of spec keys to variant values
            const variantValuesBySpec = {};
            
            variants.variant_options.forEach(option => {
                if (!option.name || !option.values || !Array.isArray(option.values)) return;
                
                const optionName = option.name.trim();
                const uniqueValues = [...new Set(option.values)]; // Remove duplicates
                
                // Try to find matching spec by name (case-insensitive)
                const matchingSpecIndex = specsArray.findIndex(spec => 
                    spec.ten.toLowerCase() === optionName.toLowerCase() ||
                    spec.ten.toLowerCase().includes(optionName.toLowerCase()) ||
                    optionName.toLowerCase().includes(spec.ten.toLowerCase())
                );
                
                if (matchingSpecIndex !== -1) {
                    // Store variant values for this spec
                    variantValuesBySpec[specsArray[matchingSpecIndex].ten] = uniqueValues.join('/');
                    console.log(`📊 Aggregated spec "${specsArray[matchingSpecIndex].ten}": ${uniqueValues.join('/')}`);
                }
            });
            
            // Update specs with aggregated values
            specsArray = specsArray.map(spec => {
                if (variantValuesBySpec[spec.ten]) {
                    return {
                        ten: spec.ten,
                        gia_tri: variantValuesBySpec[spec.ten]
                    };
                }
                return spec;
            });
            
            return specsArray;
        }
        
        // Thêm thông số kỹ thuật nếu có (tự động tổng hợp từ variants)
        documentData.thong_so_ky_thuat = aggregateSpecsWithVariants(thong_so_ky_thuat, variants);

        // Thêm hình ảnh nếu có
        if (hinh_anh && Array.isArray(hinh_anh)) {
            documentData.hinh_anh = hinh_anh;
        } else {
            documentData.hinh_anh = [];
        }

        // Thêm videos nếu có
        if (videos && Array.isArray(videos)) {
            documentData.videos = videos;
        } else {
            documentData.videos = [];
        }

        // Thêm video links nếu có (từ YouTube, Vimeo, etc.)
        if (video_links && Array.isArray(video_links)) {
            documentData.video_links = video_links;
        } else {
            documentData.video_links = [];
        }

        // Thêm variants (biến thể) nếu có
        let minPrice = null;
        let minOriginalPrice = null;
        if (variants && typeof variants === 'object') {
            // Variants có cấu trúc: {variant_options: [], variant_combinations: []}
            documentData.variants = variants;
            console.log('✅ Variants data saved:', JSON.stringify(variants, null, 2));
            
            // Tính giá rẻ nhất từ variant_combinations
            if (variants.variant_combinations && Array.isArray(variants.variant_combinations)) {
                variants.variant_combinations.forEach(combo => {
                    if (combo.price) {
                        const price = parseFloat(combo.price);
                        const originalPrice = combo.original_price ? parseFloat(combo.original_price) : null;
                        
                        if (minPrice === null || price < minPrice) {
                            minPrice = price;
                            // Lấy giá niêm yết tương ứng với giá bán rẻ nhất
                            minOriginalPrice = originalPrice;
                        }
                    }
                });
                console.log('💰 Min price from variants:', {
                    gia_ban: minPrice,
                    gia_niem_yet: minOriginalPrice
                });
            }
        } else {
            documentData.variants = {
                variant_options: [],
                variant_combinations: []
            };
        }
        
        // Lưu giá vào documentData để update SQL sau
        documentData.calculated_price = minPrice;
        documentData.calculated_original_price = minOriginalPrice;

        // Thêm chi tiết bổ sung nếu có (object tự do)
        if (chi_tiet && typeof chi_tiet === 'object') {
            documentData.chi_tiet = chi_tiet;
        }

        // Thêm link_avatar nếu có
        if (link_avatar) {
            documentData.link_avatar = link_avatar;
        }

        // Thêm mô tả chi tiết nếu có
        if (mo_ta_chi_tiet) {
            documentData.mo_ta_chi_tiet = mo_ta_chi_tiet;
        }

        // Thêm trạng thái và sản phẩm nổi bật
        if (trang_thai !== undefined) {
            documentData.trang_thai = trang_thai;
        }

        if (san_pham_noi_bat !== undefined) {
            documentData.san_pham_noi_bat = san_pham_noi_bat;
        }

        // Thêm thông tin khác (key-value pairs tự do)
        if (thong_tin_khac && typeof thong_tin_khac === 'object') {
            documentData.thong_tin_khac = thong_tin_khac;
            console.log('✅ Thong_tin_khac data saved:', JSON.stringify(thong_tin_khac, null, 2));
        } else {
            documentData.thong_tin_khac = {};
        }

        console.log('📊 Document data to save:', {
            sql_product_id: documentData.sql_product_id,
            slug: documentData.slug,
            specs_count: documentData.thong_so_ky_thuat.length,
            images_count: documentData.hinh_anh.length,
            videos_count: documentData.videos ? documentData.videos.length : 0,
            video_links_count: documentData.video_links ? documentData.video_links.length : 0,
            variants_count: documentData.variants ? documentData.variants.length : 0,
            trang_thai: documentData.trang_thai,
            san_pham_noi_bat: documentData.san_pham_noi_bat,
            has_link_avatar: !!documentData.link_avatar,
            has_description: !!documentData.mo_ta_chi_tiet,
            has_chi_tiet: !!documentData.chi_tiet
        });

        // Tạo và lưu document
        const newProductDetail = new DataModel.Mongo.ProductDetail(documentData);
        const savedDetail = await newProductDetail.save();
        
        console.log('✅ MongoDB document created successfully:', savedDetail._id);
        
        // Cập nhật giá trong SQL Server nếu có variants
        if (minPrice !== null && sql_product_id) {
            try {
                const sqlProduct = await DataModel.SQL.Product.findById(sql_product_id);
                if (sqlProduct) {
                    const updatePriceData = {
                        gia_ban: minPrice,
                        mongo_detail_id: savedDetail._id.toString()
                    };
                    
                    // Chỉ cập nhật gia_niem_yet nếu có giá trị
                    if (minOriginalPrice !== null && minOriginalPrice > minPrice) {
                        updatePriceData.gia_niem_yet = minOriginalPrice;
                    } else {
                        updatePriceData.gia_niem_yet = null; // Không có giảm giá
                    }
                    
                    await DataModel.SQL.Product.update(updatePriceData, sql_product_id);
                    console.log('✅ Updated SQL product prices:', {
                        gia_ban: minPrice,
                        gia_niem_yet: updatePriceData.gia_niem_yet
                    });
                }
            } catch (sqlError) {
                console.error('⚠️ Failed to update SQL price:', sqlError);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Tạo document MongoDB thành công',
            data: savedDetail,
            calculated_prices: {
                gia_ban: minPrice,
                gia_niem_yet: minOriginalPrice
            }
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


// PUT /api/mongo/sanpham/:id - Cập nhật document MongoDB bằng _id (hỗ trợ videos và link_avatar)
app.put('/api/mongo/sanpham/:id', async (req, res) => {
    try {
        const mongoId = req.params.id;
        const { sql_product_id, thong_so_ky_thuat, hinh_anh, videos, video_links, variants, thong_tin_khac, link_avatar, mo_ta_chi_tiet, trang_thai, san_pham_noi_bat, slug, chi_tiet } = req.body;

        console.log(`🔄 API: Cập nhật document MongoDB ${mongoId}`);
        console.log('📝 Update data:', { 
            sql_product_id, 
            slug, 
            thong_so_ky_thuat: thong_so_ky_thuat ? Object.keys(thong_so_ky_thuat).length : 0, 
            hinh_anh: hinh_anh ? hinh_anh.length : 0,
            videos: videos ? videos.length : 0,
            video_links: video_links ? video_links.length : 0,
            variants: variants ? (typeof variants === 'object' ? JSON.stringify(variants) : variants.length) : 0,
            thong_tin_khac: thong_tin_khac ? Object.keys(thong_tin_khac).length : 0,
            trang_thai,
            san_pham_noi_bat,
            link_avatar: link_avatar ? 'yes' : 'no',
            chi_tiet: chi_tiet ? 'yes' : 'no'
        });

        // Function to aggregate specs with variant values
        function aggregateSpecsWithVariants(specs, variants) {
            if (!specs || typeof specs !== 'object') return [];
            
            // Convert specs to array format
            let specsArray = Object.entries(specs).map(([ten, gia_tri]) => ({
                ten: ten.trim(),
                gia_tri: gia_tri
            }));
            
            // If no variants, return specs as-is
            if (!variants || !variants.variant_options || !Array.isArray(variants.variant_options)) {
                return specsArray;
            }
            
            // Build mapping of spec keys to variant values
            const variantValuesBySpec = {};
            
            variants.variant_options.forEach(option => {
                if (!option.name || !option.values || !Array.isArray(option.values)) return;
                
                const optionName = option.name.trim();
                const uniqueValues = [...new Set(option.values)]; // Remove duplicates
                
                // Try to find matching spec by name (case-insensitive)
                const matchingSpecIndex = specsArray.findIndex(spec => 
                    spec.ten.toLowerCase() === optionName.toLowerCase() ||
                    spec.ten.toLowerCase().includes(optionName.toLowerCase()) ||
                    optionName.toLowerCase().includes(spec.ten.toLowerCase())
                );
                
                if (matchingSpecIndex !== -1) {
                    // Store variant values for this spec
                    variantValuesBySpec[specsArray[matchingSpecIndex].ten] = uniqueValues.join('/');
                    console.log(`📊 Aggregated spec "${specsArray[matchingSpecIndex].ten}": ${uniqueValues.join('/')}`);
                }
            });
            
            // Update specs with aggregated values
            specsArray = specsArray.map(spec => {
                if (variantValuesBySpec[spec.ten]) {
                    return {
                        ten: spec.ten,
                        gia_tri: variantValuesBySpec[spec.ten]
                    };
                }
                return spec;
            });
            
            return specsArray;
        }
        
        // Chuyển đổi thông số kỹ thuật từ object sang array và tổng hợp từ variants
        const thongSoKyThuatArray = aggregateSpecsWithVariants(thong_so_ky_thuat, variants);

        const updateData = {
            updatedAt: new Date()
        };

        if (sql_product_id !== undefined) updateData.sql_product_id = sql_product_id;
        if (thong_so_ky_thuat !== undefined) updateData.thong_so_ky_thuat = thongSoKyThuatArray;
        if (hinh_anh !== undefined) updateData.hinh_anh = hinh_anh;
        // Xử lý variants và tính giá
        let minPrice = null;
        let minOriginalPrice = null;
        if (variants !== undefined) {
            updateData.variants = variants;
            
            // Tính giá rẻ nhất từ variant_combinations
            if (variants.variant_combinations && Array.isArray(variants.variant_combinations)) {
                variants.variant_combinations.forEach(combo => {
                    if (combo.price) {
                        const price = parseFloat(combo.price);
                        const originalPrice = combo.original_price ? parseFloat(combo.original_price) : null;
                        
                        if (minPrice === null || price < minPrice) {
                            minPrice = price;
                            minOriginalPrice = originalPrice;
                        }
                    }
                });
                console.log('💰 Updated min prices from variants:', {
                    gia_ban: minPrice,
                    gia_niem_yet: minOriginalPrice
                });
            }
        }
        
        if (chi_tiet !== undefined) updateData.chi_tiet = chi_tiet;
        if (link_avatar !== undefined) updateData.link_avatar = link_avatar;
        if (mo_ta_chi_tiet !== undefined) updateData.mo_ta_chi_tiet = mo_ta_chi_tiet;
        if (trang_thai !== undefined) updateData.trang_thai = trang_thai;
        if (san_pham_noi_bat !== undefined) updateData.san_pham_noi_bat = san_pham_noi_bat;
        if (slug !== undefined) updateData.slug = slug;
        if (thong_tin_khac !== undefined) updateData.thong_tin_khac = thong_tin_khac;

        const updatedDetail = await DataModel.Mongo.ProductDetail.findByIdAndUpdate(
            mongoId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedDetail) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy document MongoDB'
            });
        }

        console.log('✅ MongoDB document updated:', mongoId);
        
        // Cập nhật giá trong SQL Server nếu có variants
        if (minPrice !== null && updatedDetail.sql_product_id) {
            try {
                const sqlProduct = await DataModel.SQL.Product.findById(updatedDetail.sql_product_id);
                if (sqlProduct) {
                    const updatePriceData = {
                        gia_ban: minPrice
                    };
                    
                    // Chỉ cập nhật gia_niem_yet nếu có giá trị và lớn hơn giá bán
                    if (minOriginalPrice !== null && minOriginalPrice > minPrice) {
                        updatePriceData.gia_niem_yet = minOriginalPrice;
                    } else {
                        updatePriceData.gia_niem_yet = null; // Không có giảm giá
                    }
                    
                    await DataModel.SQL.Product.update(updatePriceData, updatedDetail.sql_product_id);
                    console.log('✅ Updated SQL product prices:', {
                        gia_ban: minPrice,
                        gia_niem_yet: updatePriceData.gia_niem_yet
                    });
                }
            } catch (sqlError) {
                console.error('⚠️ Failed to update SQL price:', sqlError);
            }
        }

        res.json({
            success: true,
            message: 'Cập nhật document MongoDB thành công',
            data: updatedDetail,
            calculated_prices: {
                gia_ban: minPrice,
                gia_niem_yet: minOriginalPrice
            }
        });

    } catch (error) {
        console.error('❌ Lỗi khi cập nhật document MongoDB:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật document MongoDB',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
            videos: productDetail.videos || [],
            video_links: productDetail.video_links || [],
            variants: productDetail.variants || [],
            thong_tin_khac: productDetail.thong_tin_khac || {},
            chi_tiet: productDetail.chi_tiet || {},
            link_avatar: productDetail.link_avatar || '',
            mo_ta_chi_tiet: productDetail.mo_ta_chi_tiet || '',
            trang_thai: productDetail.trang_thai !== undefined ? productDetail.trang_thai : 1,
            san_pham_noi_bat: productDetail.san_pham_noi_bat || false,
            createdAt: productDetail.createdAt,
            updatedAt: productDetail.updatedAt
        };

        console.log('✅ Returning MongoDB data:', {
            videos_count: responseData.videos.length,
            video_links_count: responseData.video_links.length,
            variants_count: responseData.variants.length,
            thong_tin_khac_count: Object.keys(responseData.thong_tin_khac).length,
            trang_thai: responseData.trang_thai,
            san_pham_noi_bat: responseData.san_pham_noi_bat,
            has_link_avatar: !!responseData.link_avatar,
            has_chi_tiet: !!responseData.chi_tiet,
            has_mo_ta: !!responseData.mo_ta_chi_tiet
        });

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














// =============================================
// MULTER CONFIGURATION FOR VIDEOS (Must be before routes)
// =============================================

// File filter hỗ trợ cả video
const fileFilterWithVideos = (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/webm'];
    
    if (allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Định dạng file không được hỗ trợ: ${file.mimetype}. Chỉ chấp nhận JPG, PNG, GIF, WebP, MP4, MOV, AVI, WebM`), false);
    }
};

// Multer instance cho video
const uploadWithVideos = multer({
    storage: storage,
    fileFilter: fileFilterWithVideos,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB cho video
    }
});

// Middleware xử lý lỗi upload video
const handleVideoUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'Kích thước file video quá lớn. Tối đa 50MB'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Quá nhiều file video được chọn'
            });
        }
    }
    res.status(400).json({
        success: false,
        message: err.message
    });
};

// =============================================
// VIDEO UPLOAD ROUTES
// =============================================

// Upload multiple product videos
app.post('/api/upload/product-videos', uploadWithVideos.array('productVideos', 5), handleVideoUploadError, async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn file video'
            });
        }

        console.log(`⬆️ Starting upload for ${req.files.length} videos...`);

        // Lấy thông tin sản phẩm để tạo folder
        const { productSlug } = req.body;
        
        console.log('📦 Product info received:', { productSlug });
        
        // Tạo tên folder: products/slug/videos
        let folderPath = 'products/videos';
        if (productSlug) {
            folderPath = `products/${productSlug}/videos`;
            console.log(`📁 Using folder path: ${folderPath}`);
        } else {
            console.warn('⚠️ Missing productSlug, using default folder: products/videos');
        }

        const uploadPromises = req.files.map(file => 
            uploadVideoToCloudinary(file.path, folderPath)
        );

        const results = await Promise.all(uploadPromises);
        
        const uploadedVideos = results.map(result => ({
            url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            bytes: result.bytes,
            duration: result.duration,
            resource_type: result.resource_type
        }));

        console.log(`✅ Uploaded ${uploadedVideos.length} videos successfully`);

        res.json({
            success: true,
            message: `Upload ${uploadedVideos.length} video thành công`,
            data: uploadedVideos
        });

    } catch (error) {
        console.error('❌ Product videos upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi upload video: ' + error.message
        });
    }
});

// Upload single product video (nếu cần)
app.post('/api/upload/product-video', uploadWithVideos.single('productVideo'), handleVideoUploadError, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn file video'
            });
        }

        console.log('⬆️ Starting single video upload...');

        // Lấy thông tin sản phẩm để tạo folder
        const { productSlug, oldVideoUrl } = req.body;
        
        // Tạo tên folder: products/slug/videos
        let folderPath = 'products/videos';
        if (productSlug) {
            folderPath = `products/${productSlug}/videos`;
        }

        // Kiểm tra nếu có oldVideoUrl trong body thì xóa video cũ
        if (oldVideoUrl) {
            try {
                await deleteVideoFromCloudinary(oldVideoUrl);
            } catch (deleteError) {
                console.warn('⚠️ Could not delete old video:', deleteError.message);
            }
        }

        // Upload video mới lên Cloudinary
        const result = await uploadVideoToCloudinary(req.file.path, folderPath);
        
        res.json({
            success: true,
            message: 'Upload video thành công',
            data: {
                url: result.secure_url,
                public_id: result.public_id,
                format: result.format,
                bytes: result.bytes,
                duration: result.duration,
                resource_type: result.resource_type
            }
        });

    } catch (error) {
        console.error('❌ Product video upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi upload video: ' + error.message
        });
    }
});

// API để xóa video từ Cloudinary
app.delete('/api/upload/video', async (req, res) => {
    try {
        const { videoUrl } = req.body;

        if (!videoUrl) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu URL video'
            });
        }

        console.log('🗑️ Received delete request for video:', videoUrl);
        const result = await deleteVideoFromCloudinary(videoUrl);

        res.json({
            success: true,
            message: 'Xóa video thành công',
            data: result
        });

    } catch (error) {
        console.error('❌ Video delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa video: ' + error.message
        });
    }
});

// =============================================
// CLOUDINARY VIDEO UTILITY FUNCTIONS
// =============================================

// Hàm upload video lên Cloudinary
const uploadVideoToCloudinary = async (filePath, folder = 'products/videos') => {
    try {
        console.log(`🎬 Uploading video to Cloudinary folder: ${folder}`);
        
        const result = await cloudinary.uploader.upload(filePath, {
            folder: `webPhone/${folder}`,
            resource_type: 'video',
            chunk_size: 6000000, // 6MB chunks for better upload
            eager: [
                { 
                    format: 'mp4',
                    quality: 'auto'
                },
            ],
            eager_async: true
        });

        // Xóa file tạm sau khi upload
        fs.unlinkSync(filePath);
        
        console.log(`✅ Video upload successful: ${result.secure_url}`);
        console.log(`📊 Video details: ${result.duration}s, ${result.bytes} bytes`);
        return result;
    } catch (error) {
        // Vẫn xóa file tạm dù upload thất bại
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        throw new Error(`Cloudinary video upload failed: ${error.message}`);
    }
};

// Hàm xóa video từ Cloudinary
const deleteVideoFromCloudinary = async (videoUrl) => {
    try {
        if (!videoUrl || !videoUrl.includes('cloudinary.com')) {
            return { result: 'not_cloudinary' };
        }

        // Extract public_id từ URL Cloudinary
        const publicId = extractPublicIdFromUrl(videoUrl);
        if (!publicId) {
            throw new Error('Could not extract public_id from video URL');
        }

        console.log(`🗑️ Deleting video from Cloudinary: ${publicId}`);
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: 'video'
        });
        return result;
    } catch (error) {
        console.error('❌ Cloudinary video delete failed:', error);
        throw error;
    }
};

// =============================================
// CẬP NHẬT MONGODB PRODUCT DETAILS API ĐỂ HỖ TRỢ VIDEO
// =============================================

// Cập nhật POST /api/mongo/sanpham để hỗ trợ video
app.post('/api/mongo/sanpham', async (req, res) => {
    try {
        // THÊM videos vào destructuring
        const { sql_product_id, thong_so_ky_thuat, hinh_anh, videos, mo_ta_chi_tiet, slug, link_avatar } = req.body;

        console.log('🔄 API: Tạo document MongoDB mới với video support');
        console.log('📝 Request data:', {
            sql_product_id,
            has_specs: !!thong_so_ky_thuat,
            has_images: !!hinh_anh,
            has_videos: !!videos, // THÊM DÒNG NÀY
            has_description: !!mo_ta_chi_tiet,
            slug,
            link_avatar
        });

        // ... existing MongoDB connection check ...

        // Tạo document data - THÊM videos
        const documentData = {
            sql_product_id: sql_product_id.toLowerCase() || null,
            slug: slug || `temp-${Date.now()}`
        };

        // ... existing specs and images processing ...

        // Thêm video nếu có - THÊM PHẦN NÀY
        if (videos && Array.isArray(videos)) {
            documentData.videos = videos;
        } else {
            documentData.videos = [];
        }

        // ... existing description and link_avatar processing ...

        console.log('📊 Document data to save:', {
            sql_product_id: documentData.sql_product_id,
            slug: documentData.slug,
            specs_count: documentData.thong_so_ky_thuat.length,
            images_count: documentData.hinh_anh.length,
            videos_count: documentData.videos.length, // THÊM DÒNG NÀY
            has_description: !!documentData.mo_ta_chi_tiet,
            link_avatar: documentData.link_avatar
        });

        // ... existing save logic ...

    } catch (error) {
        // ... existing error handling ...
    }
});



// =============================================
// UTILITY FUNCTION ĐỂ XÓA VIDEO KHI XÓA SẢN PHẨM
// =============================================

// Hàm utility để xóa tất cả video của sản phẩm
const deleteProductVideos = async (productId) => {
    try {
        console.log(`🎬 Deleting all videos for product: ${productId}`);
        
        // Tìm document MongoDB để lấy danh sách video
        const productDetail = await DataModel.Mongo.ProductDetail.findOne({ 
            sql_product_id: productId 
        });

        if (!productDetail || !productDetail.videos || productDetail.videos.length === 0) {
            console.log('ℹ️ No videos found for product');
            return;
        }

        // Xóa từng video từ Cloudinary
        const deletePromises = productDetail.videos.map(videoUrl => 
            deleteVideoFromCloudinary(videoUrl)
        );

        const results = await Promise.allSettled(deletePromises);
        
        // Log kết quả xóa
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                console.log(`✅ Deleted video: ${productDetail.videos[index]}`);
            } else {
                console.error(`❌ Failed to delete video: ${productDetail.videos[index]}`, result.reason);
            }
        });

        console.log(`✅ Completed deleting ${productDetail.videos.length} videos for product ${productId}`);
        
    } catch (error) {
        console.error('❌ Error deleting product videos:', error);
        throw error;
    }
};

// =============================================
// CẬP NHẬT API XÓA SẢN PHẨM ĐỂ XÓA VIDEO
// =============================================

// Cập nhật DELETE /api/sanpham/:id để xóa video
app.delete('/api/sanpham/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        
        console.log(`🗑️ API: Xóa sản phẩm ${productId} (with video support)`);

        // ... existing validation ...

        // Tìm sản phẩm để lấy thông tin
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
                // Xóa ảnh phụ từ Cloudinary
                const mongoDoc = await DataModel.Mongo.ProductDetail.findOne({ 
                    sql_product_id: productId 
                });
                
                if (mongoDoc) {
                    // Xóa ảnh phụ
                    if (mongoDoc.hinh_anh && Array.isArray(mongoDoc.hinh_anh)) {
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

                    // THÊM: Xóa video từ Cloudinary
                    if (mongoDoc.videos && Array.isArray(mongoDoc.videos)) {
                        for (const videoUrl of mongoDoc.videos) {
                            if (videoUrl && videoUrl.includes('cloudinary.com')) {
                                try {
                                    await deleteVideoFromCloudinary(videoUrl);
                                    console.log('🎬 Deleted video:', videoUrl);
                                } catch (videoErr) {
                                    console.warn('⚠️ Failed to delete video:', videoErr.message);
                                }
                            }
                        }
                    }

                    // Xóa document MongoDB
                    await DataModel.Mongo.ProductDetail.findByIdAndDelete(product.mongo_detail_id);
                    console.log('✅ MongoDB document deleted:', product.mongo_detail_id);
                }
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

// =============================================
// API ĐỂ LẤY THÔNG TIN VIDEO (Nếu cần)
// =============================================

// GET /api/sanpham/:id/videos - Lấy danh sách video của sản phẩm
app.get('/api/sanpham/:id/videos', async (req, res) => {
    try {
        const productId = req.params.id;
        console.log(`🎬 API: Lấy danh sách video sản phẩm ${productId}`);

        const productDetail = await DataModel.Mongo.ProductDetail.findOne({ 
            sql_product_id: productId 
        });

        if (!productDetail) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin sản phẩm'
            });
        }

        const videos = productDetail.videos || [];

        res.json({
            success: true,
            data: {
                product_id: productId,
                videos: videos,
                total_videos: videos.length
            }
        });

    } catch (error) {
        console.error('❌ Lỗi khi lấy danh sách video:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách video',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// =============================================
// CẬP NHẬT MULTER CONFIG CHÍNH ĐỂ HỖ TRỢ VIDEO
// =============================================

// Cập nhật file filter chính để hỗ trợ cả video
const updatedFileFilter = (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/webm'];
    
    if (allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Định dạng file không được hỗ trợ: ${file.mimetype}. Chỉ chấp nhận JPG, PNG, GIF, WebP, MP4, MOV, AVI, WebM`), false);
    }
};

// Cập nhật multer instance chính
const updatedUpload = multer({
    storage: storage,
    fileFilter: updatedFileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB cho cả ảnh và video
    }
});

// =============================================
// FLASH SALE API ROUTES
// =============================================

// GET /admin/flashsale - Trang quản lý flash sale
app.get('/admin/flashsale', async (req, res) => {
    try {
        res.render('flashsale', {
            layout: 'AdminMain',
            title: 'Quản Lý Flash Sale'
        });
    } catch (error) {
        console.error('Flash Sale Page Error:', error);
        res.status(500).send('Lỗi server');
    }
});

// GET /api/flashsales - Lấy danh sách flash sales
app.get('/api/flashsales', async (req, res) => {
    try {
        const { page = 1, limit = 10, trang_thai, search } = req.query;
        
        const filters = {};
        if (trang_thai) filters.trang_thai = trang_thai;
        if (search) filters.search = search;
        
        const flashSales = await DataModel.SQL.FlashSale.findAll(filters);
        
        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedData = flashSales.slice(startIndex, endIndex);
        
        res.json({
            success: true,
            data: paginatedData,
            currentPage: parseInt(page),
            totalPages: Math.ceil(flashSales.length / limit),
            total: flashSales.length
        });
    } catch (error) {
        console.error('Flash Sales API Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách flash sale'
        });
    }
});

// GET /api/flashsales/:id - Lấy thông tin flash sale
app.get('/api/flashsales/:id', async (req, res) => {
    try {
        const flashSale = await DataModel.SQL.FlashSale.findById(req.params.id);
        
        if (!flashSale) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy flash sale'
            });
        }
        
        res.json({
            success: true,
            data: flashSale
        });
    } catch (error) {
        console.error('Flash Sale API Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin flash sale'
        });
    }
});

// GET /api/flashsales/:id/details - Lấy chi tiết đầy đủ
app.get('/api/flashsales/:id/details', async (req, res) => {
    try {
        const flashSale = await DataModel.SQL.FlashSale.findById(req.params.id);
        
        if (!flashSale) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy flash sale'
            });
        }
        
        res.json({
            success: true,
            data: flashSale
        });
    } catch (error) {
        console.error('Flash Sale Details API Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy chi tiết flash sale'
        });
    }
});

// POST /api/flashsales - Tạo flash sale mới
app.post('/api/flashsales', async (req, res) => {
    try {
        console.log('📝 Creating new flash sale...', req.body);
        
        const flashSaleData = {
            ten_flash_sale: req.body.ten_flash_sale,
            mo_ta: req.body.mo_ta,
            ngay_bat_dau: req.body.ngay_bat_dau,
            ngay_ket_thuc: req.body.ngay_ket_thuc,
            trang_thai: req.body.trang_thai || 'cho',
            nguoi_tao: req.session?.user?.id || req.body.nguoi_tao || null
        };
        
        // Bước 1: Tạo flash sale trong SQL
        const newFlashSale = await DataModel.SQL.FlashSale.create(flashSaleData);
        console.log('✅ SQL created with ID:', newFlashSale.id);
        
        // Bước 2: Tạo MongoDB document với _id = SQL flash sale id
        const mongoData = {
            banner_images: [],
            promotional_videos: [],
            rules: {
                max_quantity_per_user: null,
                min_purchase_amount: 0,
                eligible_user_groups: ['all'],
                payment_methods: ['all']
            },
            marketing: {
                seo_title: req.body.ten_flash_sale,
                seo_description: req.body.mo_ta || '',
                seo_keywords: [],
                hashtags: []
            },
            notification_settings: {
                send_email: true,
                send_sms: false,
                send_push: true,
                notify_before_start: 30,
                notify_when_sold_out: true
            },
            analytics: {
                total_views: 0,
                total_clicks: 0,
                conversion_rate: 0,
                revenue: 0
            },
            ui_settings: {
                theme_color: '#f59e0b',
                background_color: '#ffffff',
                countdown_style: 'digital',
                layout_type: 'grid'
            },
            tags: [],
            notes: ''
        };
        
        const mongoDoc = await DataModel.Mongo.FlashSaleDetail.createOrUpdate(newFlashSale.id, mongoData);
        console.log('✅ MongoDB created with _id:', mongoDoc._id);
        
        // Bước 3: Update SQL để lưu mongo_flash_sale_detail_id
        const updatedFlashSale = await DataModel.SQL.FlashSale.update(newFlashSale.id, {
            mongo_flash_sale_detail_id: mongoDoc._id.toString()
        });
        console.log('✅ SQL updated with mongo_flash_sale_detail_id');
        
        res.json({
            success: true,
            message: 'Tạo flash sale thành công',
            data: updatedFlashSale
        });
    } catch (error) {
        console.error('❌ Create Flash Sale Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo flash sale: ' + error.message
        });
    }
});

// PUT /api/flashsales/:id - Cập nhật flash sale
app.put('/api/flashsales/:id', async (req, res) => {
    try {
        const updateData = {
            ten_flash_sale: req.body.ten_flash_sale,
            mo_ta: req.body.mo_ta,
            ngay_bat_dau: req.body.ngay_bat_dau,
            ngay_ket_thuc: req.body.ngay_ket_thuc,
            trang_thai: req.body.trang_thai
        };
        
        const updatedFlashSale = await DataModel.SQL.FlashSale.update(req.params.id, updateData);
        
        if (!updatedFlashSale) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy flash sale'
            });
        }
        
        res.json({
            success: true,
            message: 'Cập nhật flash sale thành công',
            data: updatedFlashSale
        });
    } catch (error) {
        console.error('Update Flash Sale Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật flash sale: ' + error.message
        });
    }
});

// DELETE /api/flashsales/:id - Xóa flash sale
app.delete('/api/flashsales/:id', async (req, res) => {
    try {
        // Xóa từ SQL
        await DataModel.SQL.FlashSale.destroy(req.params.id);
        
        // Xóa từ MongoDB
        await DataModel.Mongo.FlashSaleDetail.deleteByFlashSaleId(req.params.id);
        
        res.json({
            success: true,
            message: 'Xóa flash sale thành công'
        });
    } catch (error) {
        console.error('Delete Flash Sale Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa flash sale: ' + error.message
        });
    }
});

// =============================================
// FLASH SALE ITEMS API ROUTES
// =============================================

// GET /api/flashsales/:id/items - Lấy danh sách sản phẩm trong flash sale
app.get('/api/flashsales/:id/items', async (req, res) => {
    try {
        const items = await DataModel.SQL.FlashSaleItem.findByFlashSaleId(req.params.id);
        
        res.json({
            success: true,
            data: items
        });
    } catch (error) {
        console.error('Flash Sale Items API Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách sản phẩm'
        });
    }
});

// GET /api/flashsales/:flashSaleId/items/:itemId - Lấy thông tin 1 item
app.get('/api/flashsales/:flashSaleId/items/:itemId', async (req, res) => {
    try {
        const item = await DataModel.SQL.FlashSaleItem.findById(req.params.itemId);
        
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }
        
        res.json({
            success: true,
            data: item
        });
    } catch (error) {
        console.error('Flash Sale Item API Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin sản phẩm'
        });
    }
});

// POST /api/flashsales/:id/items - Thêm sản phẩm vào flash sale
app.post('/api/flashsales/:id/items', async (req, res) => {
    try {
        const itemData = {
            flash_sale_id: req.params.id,
            san_pham_id: req.body.san_pham_id,
            gia_goc: req.body.gia_goc,
            gia_flash_sale: req.body.gia_flash_sale,
            so_luong_ton: req.body.so_luong_ton,
            gioi_han_mua: req.body.gioi_han_mua,
            thu_tu: req.body.thu_tu,
            trang_thai: req.body.trang_thai || 'dang_ban'
        };
        
        const newItem = await DataModel.SQL.FlashSaleItem.create(itemData);
        
        res.json({
            success: true,
            message: 'Thêm sản phẩm thành công',
            data: newItem
        });
    } catch (error) {
        console.error('Create Flash Sale Item Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi thêm sản phẩm: ' + error.message
        });
    }
});

// PUT /api/flashsales/:flashSaleId/items/:itemId - Cập nhật sản phẩm
app.put('/api/flashsales/:flashSaleId/items/:itemId', async (req, res) => {
    try {
        const updateData = {
            gia_goc: req.body.gia_goc,
            gia_flash_sale: req.body.gia_flash_sale,
            so_luong_ton: req.body.so_luong_ton,
            gioi_han_mua: req.body.gioi_han_mua,
            thu_tu: req.body.thu_tu,
            trang_thai: req.body.trang_thai
        };
        
        const updatedItem = await DataModel.SQL.FlashSaleItem.update(req.params.itemId, updateData);
        
        if (!updatedItem) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }
        
        res.json({
            success: true,
            message: 'Cập nhật sản phẩm thành công',
            data: updatedItem
        });
    } catch (error) {
        console.error('Update Flash Sale Item Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật sản phẩm: ' + error.message
        });
    }
});

// DELETE /api/flashsales/:flashSaleId/items/:itemId - Xóa sản phẩm
app.delete('/api/flashsales/:flashSaleId/items/:itemId', async (req, res) => {
    try {
        await DataModel.SQL.FlashSaleItem.destroy(req.params.itemId);
        
        res.json({
            success: true,
            message: 'Xóa sản phẩm thành công'
        });
    } catch (error) {
        console.error('Delete Flash Sale Item Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa sản phẩm: ' + error.message
        });
    }
});

// =============================================
// FLASH SALE MONGODB DETAIL API ROUTES
// =============================================

// GET /api/flashsales/:id/detail - Lấy dữ liệu MongoDB của flash sale
app.get('/api/flashsales/:id/detail', async (req, res) => {
    try {
        const detail = await DataModel.Mongo.FlashSaleDetail.findByFlashSaleId(req.params.id);
        
        if (!detail) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy chi tiết flash sale'
            });
        }
        
        res.json({
            success: true,
            data: detail
        });
    } catch (error) {
        console.error('Flash Sale Detail API Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy chi tiết flash sale'
        });
    }
});

// PUT /api/flashsales/:id/detail - Cập nhật dữ liệu MongoDB
app.put('/api/flashsales/:id/detail', async (req, res) => {
    try {
        const updateData = req.body;
        
        const updatedDetail = await DataModel.Mongo.FlashSaleDetail.createOrUpdate(
            req.params.id,
            updateData
        );
        
        res.json({
            success: true,
            message: 'Cập nhật chi tiết flash sale thành công',
            data: updatedDetail
        });
    } catch (error) {
        console.error('Update Flash Sale Detail Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật chi tiết: ' + error.message
        });
    }
});

// PATCH /api/flashsales/:id/detail/analytics - Cập nhật analytics
app.patch('/api/flashsales/:id/detail/analytics', async (req, res) => {
    try {
        const { total_views, total_clicks, conversion_rate, revenue } = req.body;
        
        const detail = await DataModel.Mongo.FlashSaleDetail.findByFlashSaleId(req.params.id);
        
        if (!detail) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy flash sale'
            });
        }
        
        const updatedAnalytics = {
            ...detail.analytics,
            ...(total_views !== undefined && { total_views }),
            ...(total_clicks !== undefined && { total_clicks }),
            ...(conversion_rate !== undefined && { conversion_rate }),
            ...(revenue !== undefined && { revenue })
        };
        
        const updated = await DataModel.Mongo.FlashSaleDetail.createOrUpdate(req.params.id, {
            analytics: updatedAnalytics
        });
        
        res.json({
            success: true,
            message: 'Cập nhật analytics thành công',
            data: updated.analytics
        });
    } catch (error) {
        console.error('Update Analytics Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật analytics'
        });
    }
});

// PATCH /api/flashsales/:id/detail/banners - Cập nhật banner images
app.patch('/api/flashsales/:id/detail/banners', async (req, res) => {
    try {
        const { banner_images } = req.body;
        
        if (!Array.isArray(banner_images)) {
            return res.status(400).json({
                success: false,
                message: 'banner_images phải là mảng'
            });
        }
        
        const updated = await DataModel.Mongo.FlashSaleDetail.createOrUpdate(req.params.id, {
            banner_images
        });
        
        res.json({
            success: true,
            message: 'Cập nhật banner thành công',
            data: updated.banner_images
        });
    } catch (error) {
        console.error('Update Banners Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật banner'
        });
    }
});

// PATCH /api/flashsales/:id/detail/marketing - Cập nhật marketing data
app.patch('/api/flashsales/:id/detail/marketing', async (req, res) => {
    try {
        const marketingData = req.body;
        
        const detail = await DataModel.Mongo.FlashSaleDetail.findByFlashSaleId(req.params.id);
        
        const updatedMarketing = {
            ...detail?.marketing,
            ...marketingData
        };
        
        const updated = await DataModel.Mongo.FlashSaleDetail.createOrUpdate(req.params.id, {
            marketing: updatedMarketing
        });
        
        res.json({
            success: true,
            message: 'Cập nhật marketing thành công',
            data: updated.marketing
        });
    } catch (error) {
        console.error('Update Marketing Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật marketing'
        });
    }
});

// =============================================
// ADDRESS MANAGEMENT ROUTES (REGIONS, PROVINCES, WARDS)
// =============================================

// ===== RENDER PAGE =====
app.get('/admin/diachi', async (req, res) => {
    try {
        res.render('diachi', {
            layout: 'AdminMain',
            title: 'Quản Lý Địa Chỉ'
        });
    } catch (error) {
        console.error('Address Page Error:', error);
        res.status(500).send('Lỗi server');
    }
});

// ===== REGIONS API =====

// GET /api/regions - Lấy danh sách vùng miền
app.get('/api/regions', async (req, res) => {
    try {
        const regions = await DataModel.SQL.Region.findAll();
        
        res.json({
            success: true,
            data: regions
        });
    } catch (error) {
        console.error('Regions API Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách vùng miền'
        });
    }
});

// GET /api/regions/:id - Lấy thông tin vùng miền
app.get('/api/regions/:id', async (req, res) => {
    try {
        const region = await DataModel.SQL.Region.findById(req.params.id);
        
        if (!region) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy vùng miền'
            });
        }
        
        res.json({
            success: true,
            data: region
        });
    } catch (error) {
        console.error('Region API Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin vùng miền'
        });
    }
});

// POST /api/regions - Tạo vùng miền mới
app.post('/api/regions', async (req, res) => {
    try {
        const regionData = {
            ma_vung: req.body.ma_vung,
            ten_vung: req.body.ten_vung,
            mo_ta: req.body.mo_ta || null,
            trang_thai: req.body.trang_thai !== undefined ? req.body.trang_thai : 1
        };

        // Validate required fields
        if (!regionData.ma_vung || !regionData.ten_vung) {
            return res.status(400).json({
                success: false,
                message: 'Mã vùng và tên vùng là bắt buộc'
            });
        }

        const newRegion = await DataModel.SQL.Region.create(regionData);
        
        res.status(201).json({
            success: true,
            message: 'Tạo vùng miền thành công',
            data: newRegion
        });
    } catch (error) {
        console.error('Create Region Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi khi tạo vùng miền'
        });
    }
});

// PUT /api/regions/:id - Cập nhật vùng miền
app.put('/api/regions/:id', async (req, res) => {
    try {
        const updateData = {
            ma_vung: req.body.ma_vung,
            ten_vung: req.body.ten_vung,
            mo_ta: req.body.mo_ta,
            trang_thai: req.body.trang_thai
        };

        const updated = await DataModel.SQL.Region.update(req.params.id, updateData);
        
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy vùng miền'
            });
        }

        res.json({
            success: true,
            message: 'Cập nhật vùng miền thành công',
            data: updated
        });
    } catch (error) {
        console.error('Update Region Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi khi cập nhật vùng miền'
        });
    }
});

// DELETE /api/regions/:id - Xóa vùng miền
app.delete('/api/regions/:id', async (req, res) => {
    try {
        const deleted = await DataModel.SQL.Region.delete(req.params.id);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy vùng miền'
            });
        }

        res.json({
            success: true,
            message: 'Xóa vùng miền thành công'
        });
    } catch (error) {
        console.error('Delete Region Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi khi xóa vùng miền'
        });
    }
});

// ===== PROVINCES API =====

// GET /api/provinces - Lấy danh sách tỉnh/thành
app.get('/api/provinces', async (req, res) => {
    try {
        const { vung_id, trang_thai } = req.query;
        
        const filters = {};
        if (vung_id) filters.vung_id = vung_id;
        if (trang_thai !== undefined) filters.trang_thai = parseInt(trang_thai);
        
        const provinces = await DataModel.SQL.Province.findAll(filters);
        
        res.json({
            success: true,
            data: provinces
        });
    } catch (error) {
        console.error('Provinces API Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách tỉnh/thành'
        });
    }
});

// GET /api/provinces/:id - Lấy thông tin tỉnh/thành
app.get('/api/provinces/:id', async (req, res) => {
    try {
        const province = await DataModel.SQL.Province.findById(req.params.id);
        
        if (!province) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy tỉnh/thành'
            });
        }
        
        res.json({
            success: true,
            data: province
        });
    } catch (error) {
        console.error('Province API Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin tỉnh/thành'
        });
    }
});

// POST /api/provinces - Tạo tỉnh/thành mới
app.post('/api/provinces', async (req, res) => {
    try {
        const provinceData = {
            ma_tinh: req.body.ma_tinh,
            ten_tinh: req.body.ten_tinh,
            vung_id: req.body.vung_id,
            is_major_city: req.body.is_major_city || 0,
            thu_tu_uu_tien: req.body.thu_tu_uu_tien || 0,
            trang_thai: req.body.trang_thai !== undefined ? req.body.trang_thai : 1
        };

        // Validate required fields
        if (!provinceData.ma_tinh || !provinceData.ten_tinh || !provinceData.vung_id) {
            return res.status(400).json({
                success: false,
                message: 'Mã tỉnh, tên tỉnh và vùng miền là bắt buộc'
            });
        }

        const newProvince = await DataModel.SQL.Province.create(provinceData);
        
        res.status(201).json({
            success: true,
            message: 'Tạo tỉnh/thành thành công',
            data: newProvince
        });
    } catch (error) {
        console.error('Create Province Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi khi tạo tỉnh/thành'
        });
    }
});

// PUT /api/provinces/:id - Cập nhật tỉnh/thành
app.put('/api/provinces/:id', async (req, res) => {
    try {
        const updateData = {
            ma_tinh: req.body.ma_tinh,
            ten_tinh: req.body.ten_tinh,
            vung_id: req.body.vung_id,
            is_major_city: req.body.is_major_city,
            thu_tu_uu_tien: req.body.thu_tu_uu_tien,
            trang_thai: req.body.trang_thai
        };

        const updated = await DataModel.SQL.Province.update(req.params.id, updateData);
        
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy tỉnh/thành'
            });
        }

        res.json({
            success: true,
            message: 'Cập nhật tỉnh/thành thành công',
            data: updated
        });
    } catch (error) {
        console.error('Update Province Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi khi cập nhật tỉnh/thành'
        });
    }
});

// DELETE /api/provinces/:id - Xóa tỉnh/thành
app.delete('/api/provinces/:id', async (req, res) => {
    try {
        const deleted = await DataModel.SQL.Province.delete(req.params.id);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy tỉnh/thành'
            });
        }

        res.json({
            success: true,
            message: 'Xóa tỉnh/thành thành công'
        });
    } catch (error) {
        console.error('Delete Province Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi khi xóa tỉnh/thành'
        });
    }
});

// GET /api/products/by-region/:regionId - Lấy sản phẩm theo vùng miền
app.get('/api/products/by-region/:regionId', async (req, res) => {
    try {
        const { regionId } = req.params;
        console.log('🔍 Fetching products for region:', regionId);
        
        // Lấy tất cả sản phẩm có trong kho thuộc vùng miền này
        const query = `
            SELECT 
                p.id,
                p.ten_san_pham,
                p.ma_sku,
                p.gia_ban,
                p.gia_niem_yet,
                p.link_anh,
                p.trang_thai,
                p.ngay_tao,
                ISNULL(SUM(inv.so_luong_kha_dung), 0) as tong_ton_kho
            FROM products p
            LEFT JOIN inventory inv ON p.id = inv.san_pham_id AND inv.so_luong_kha_dung > 0
            LEFT JOIN warehouses w ON inv.kho_id = w.id
            LEFT JOIN wards wd ON w.phuong_xa_id = wd.id
            LEFT JOIN provinces prov ON wd.tinh_thanh_id = prov.id
            LEFT JOIN regions r ON prov.vung_id = r.ma_vung
            WHERE p.trang_thai = 1
                AND (r.id = @regionId OR r.id IS NULL)
            GROUP BY 
                p.id, p.ten_san_pham, p.ma_sku, 
                p.gia_ban, p.gia_niem_yet, p.link_anh, p.trang_thai, p.ngay_tao
            HAVING ISNULL(SUM(inv.so_luong_kha_dung), 0) > 0
            ORDER BY p.ngay_tao DESC
        `;
        
        const request = new sql.Request();
        const result = await request
            .input('regionId', sql.UniqueIdentifier, regionId)
            .query(query);
        
        console.log('📦 Found products:', result.recordset.length);
        
        const products = result.recordset.map(product => ({
            ...product,
            gia_ban_formatted: new Intl.NumberFormat('vi-VN').format(product.gia_ban),
            gia_khuyen_mai_formatted: product.gia_niem_yet 
                ? new Intl.NumberFormat('vi-VN').format(product.gia_niem_yet)
                : null,
            tiet_kiem: product.gia_niem_yet && product.gia_niem_yet > product.gia_ban
                ? product.gia_niem_yet - product.gia_ban
                : 0,
            tiet_kiem_formatted: product.gia_niem_yet && product.gia_niem_yet > product.gia_ban
                ? new Intl.NumberFormat('vi-VN').format(product.gia_niem_yet - product.gia_ban)
                : null,
            phan_tram_giam: product.gia_niem_yet && product.gia_niem_yet > product.gia_ban
                ? Math.round(((product.gia_niem_yet - product.gia_ban) / product.gia_niem_yet) * 100)
                : 0,
            ten_kho: 'Kho có sẵn' // Placeholder, có thể query riêng nếu cần
        }));
        
        res.json({
            success: true,
            data: products,
            count: products.length
        });
    } catch (error) {
        console.error('❌ Products by region API Error:', error);
        console.error('Error details:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy sản phẩm theo vùng miền',
            error: error.message
        });
    }
});

// ===== WARDS API =====

// GET /api/wards - Lấy danh sách phường/xã
app.get('/api/wards', async (req, res) => {
    try {
        const { tinh_thanh_id, loai, trang_thai } = req.query;
        
        const filters = {};
        if (tinh_thanh_id) filters.tinh_thanh_id = tinh_thanh_id;
        if (loai) filters.loai = loai;
        if (trang_thai !== undefined) filters.trang_thai = parseInt(trang_thai);
        
        const wards = await DataModel.SQL.Ward.findAll(filters);
        
        res.json({
            success: true,
            data: wards
        });
    } catch (error) {
        console.error('Wards API Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách phường/xã'
        });
    }
});

// GET /api/wards/:id - Lấy thông tin phường/xã
app.get('/api/wards/:id', async (req, res) => {
    try {
        const ward = await DataModel.SQL.Ward.findById(req.params.id);
        
        if (!ward) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phường/xã'
            });
        }
        
        res.json({
            success: true,
            data: ward
        });
    } catch (error) {
        console.error('Ward API Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin phường/xã'
        });
    }
});

// POST /api/wards - Tạo phường/xã mới
app.post('/api/wards', async (req, res) => {
    try {
        const wardData = {
            ma_phuong_xa: req.body.ma_phuong_xa,
            ten_phuong_xa: req.body.ten_phuong_xa,
            tinh_thanh_id: req.body.tinh_thanh_id,
            loai: req.body.loai,
            is_inner_area: req.body.is_inner_area || 0,
            trang_thai: req.body.trang_thai !== undefined ? req.body.trang_thai : 1
        };

        // Validate required fields
        if (!wardData.ma_phuong_xa || !wardData.ten_phuong_xa || !wardData.tinh_thanh_id || !wardData.loai) {
            return res.status(400).json({
                success: false,
                message: 'Mã phường/xã, tên, tỉnh/thành và loại là bắt buộc'
            });
        }

        const newWard = await DataModel.SQL.Ward.create(wardData);
        
        res.status(201).json({
            success: true,
            message: 'Tạo phường/xã thành công',
            data: newWard
        });
    } catch (error) {
        console.error('Create Ward Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi khi tạo phường/xã'
        });
    }
});

// PUT /api/wards/:id - Cập nhật phường/xã
app.put('/api/wards/:id', async (req, res) => {
    try {
        const updateData = {
            ma_phuong_xa: req.body.ma_phuong_xa,
            ten_phuong_xa: req.body.ten_phuong_xa,
            tinh_thanh_id: req.body.tinh_thanh_id,
            loai: req.body.loai,
            is_inner_area: req.body.is_inner_area,
            trang_thai: req.body.trang_thai
        };

        const updated = await DataModel.SQL.Ward.update(req.params.id, updateData);
        
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phường/xã'
            });
        }

        res.json({
            success: true,
            message: 'Cập nhật phường/xã thành công',
            data: updated
        });
    } catch (error) {
        console.error('Update Ward Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi khi cập nhật phường/xã'
        });
    }
});

// DELETE /api/wards/:id - Xóa phường/xã
app.delete('/api/wards/:id', async (req, res) => {
    try {
        const deleted = await DataModel.SQL.Ward.delete(req.params.id);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phường/xã'
            });
        }

        res.json({
            success: true,
            message: 'Xóa phường/xã thành công'
        });
    } catch (error) {
        console.error('Delete Ward Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi khi xóa phường/xã'
        });
    }
});

// ===== USERS MANAGEMENT =====

// Admin render route for Users management page
app.get('/admin/nguoidung', async (req, res) => {
    try {
        // Lấy danh sách users từ SQL
        const users = await DataModel.SQL.User.findAll();
        
        res.render('nguoidung', {
            layout: 'AdminMain',
            users: users || []
        });
    } catch (error) {
        console.error('Render Users Page Error:', error);
        res.status(500).send('Lỗi khi tải trang người dùng');
    }
});

// GET /api/users - list users with filters
app.get('/api/users', async (req, res) => {
    try {
        const { search, status } = req.query;

        // Lấy dữ liệu từ SQL với filters
        const filters = {};
        if (status !== undefined) filters.status = parseInt(status);
        
        let users = await DataModel.SQL.User.findAll(filters);

        // Apply search filter if provided
        if (search) {
            const searchLower = search.toLowerCase();
            users = users.filter(u =>
                (u.name && u.name.toLowerCase().includes(searchLower)) ||
                (u.email && u.email.toLowerCase().includes(searchLower)) ||
                (u.phone && u.phone.toLowerCase().includes(searchLower))
            );
        }

        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Users GET Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách người dùng' });
    }
});

// POST /api/users - create user
app.post('/api/users', async (req, res) => {
    try {
        const { name, email, phone, vung_id, status, password, additionalFields } = req.body;

        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tên và email là bắt buộc' 
            });
        }

        // Check if email already exists
        const existingUser = await DataModel.SQL.User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ 
                success: false, 
                message: 'Email đã tồn tại' 
            });
        }

        // Hash password (in production, use bcrypt)
        const hashedPassword = password; // TODO: Implement proper password hashing

        // Create user in SQL
        const newUser = await DataModel.SQL.User.create({
            name,
            email,
            phone: phone || null,
            vung_id: vung_id || 'bac',
            status: status !== undefined ? parseInt(status) : 1,
            password: hashedPassword
        });

        // Create corresponding MongoDB profile and update SQL with mongo_profile_id
        try {
            const mongoData = {
                sql_user_id: newUser.id,
                ...additionalFields
            };
            
            const mongoProfile = await DataModel.Mongo.UserDetail.create(mongoData);
            
            // Update SQL user with MongoDB profile ID
            await DataModel.SQL.User.update(newUser.id, {
                ...newUser,
                mongo_profile_id: mongoProfile._id.toString()
            });
            
            // Add mongo_profile_id to response
            newUser.mongo_profile_id = mongoProfile._id.toString();
        } catch (mongoError) {
            console.warn('⚠️ MongoDB UserDetail creation failed:', mongoError);
            // Continue even if MongoDB fails
        }

        res.status(201).json({ 
            success: true, 
            message: 'Tạo người dùng thành công', 
            data: newUser 
        });
    } catch (error) {
        console.error('Users CREATE Error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Lỗi khi tạo người dùng' 
        });
    }
});

// GET /api/users/:id/profile - get MongoDB profile
app.get('/api/users/:id/profile', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get user from SQL to get mongo_profile_id
        const user = await DataModel.SQL.User.findById(id);
        if (!user || !user.mongo_profile_id) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy profile' 
            });
        }
        
        // Get profile from MongoDB
        const profile = await DataModel.Mongo.UserDetail.findById(user.mongo_profile_id);
        if (!profile) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy profile trong MongoDB' 
            });
        }
        
        // Convert to plain object and remove internal fields
        const profileData = profile.toObject();
        delete profileData.__v;
        
        // Convert additionalFields array back to object for frontend
        if (profileData.additionalFields && Array.isArray(profileData.additionalFields)) {
            const fieldsObject = {};
            profileData.additionalFields.forEach(item => {
                if (item.key) {
                    fieldsObject[item.key] = item.value || '';
                }
            });
            // Replace array with object
            Object.keys(profileData).forEach(key => {
                if (key !== '_id' && key !== 'sql_user_id' && key !== 'createdAt' && key !== 'updatedAt' && key !== 'additionalFields') {
                    delete profileData[key];
                }
            });
            Object.assign(profileData, fieldsObject);
            delete profileData.additionalFields;
        }
        
        res.json(profileData);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// PUT /api/users/:id - update user
app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, vung_id, status, password, additionalFields } = req.body;
        
        console.log('📝 PUT /api/users/:id received:', { id, additionalFields });

        // Check if user exists
        const existingUser = await DataModel.SQL.User.findById(id);
        if (!existingUser) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy người dùng' 
            });
        }

        // Check email collision if email changed
        if (email && email !== existingUser.email) {
            const userWithSameEmail = await DataModel.SQL.User.findByEmail(email);
            if (userWithSameEmail && userWithSameEmail.id !== id) {
                return res.status(409).json({ 
                    success: false, 
                    message: 'Email đã tồn tại' 
                });
            }
        }

        const updateData = {
            name: name || existingUser.name,
            email: email || existingUser.email,
            phone: phone !== undefined ? phone : existingUser.phone,
            vung_id: vung_id || existingUser.vung_id,
            status: status !== undefined ? parseInt(status) : existingUser.status
        };

        // Only update password if provided
        if (password && password.length >= 8) {
            updateData.password = password; // TODO: Implement proper password hashing
        }

        const updatedUser = await DataModel.SQL.User.update(id, updateData);

        // Update MongoDB additional fields (convert object to array)
        if (existingUser.mongo_profile_id) {
            try {
                console.log('🔍 MongoDB update attempt for profile:', existingUser.mongo_profile_id);
                console.log('📦 additionalFields received (object):', additionalFields);
                
                // Convert object to array of {key, value}
                const fieldsArray = [];
                if (additionalFields && typeof additionalFields === 'object') {
                    Object.entries(additionalFields).forEach(([key, value]) => {
                        fieldsArray.push({ key, value: String(value || '') });
                    });
                }
                
                console.log('📋 Converted to array:', fieldsArray);
                
                // Update MongoDB with array structure
                const result = await DataModel.Mongo.UserDetail.findByIdAndUpdate(
                    existingUser.mongo_profile_id,
                    { 
                        $set: { additionalFields: fieldsArray }
                    },
                    { new: true, runValidators: false }
                );
                
                console.log('✅ MongoDB update result:', result?.toObject());
            } catch (mongoError) {
                console.error('❌ MongoDB update failed:', mongoError);
            }
        } else {
            console.log('⚠️ User has no mongo_profile_id');
        }

        res.json({ 
            success: true, 
            message: 'Cập nhật người dùng thành công', 
            data: updatedUser 
        });
    } catch (error) {
        console.error('Users UPDATE Error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Lỗi khi cập nhật người dùng' 
        });
    }
});

// DELETE /api/users/:id - delete user (soft delete)
app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const deleted = await DataModel.SQL.User.delete(id);
        
        if (!deleted) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy người dùng' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Xóa người dùng thành công' 
        });
    } catch (error) {
        console.error('Users DELETE Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi xóa người dùng' 
        });
    }
});

// PUT /api/users/:id/status - toggle/update status
app.put('/api/users/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const existingUser = await DataModel.SQL.User.findById(id);
        if (!existingUser) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy người dùng' 
            });
        }

        const newStatus = status !== undefined ? parseInt(status) : (existingUser.status ? 0 : 1);
        
        const updatedUser = await DataModel.SQL.User.updateStatus(id, newStatus);

        res.json({ 
            success: true, 
            message: 'Cập nhật trạng thái thành công', 
            data: updatedUser 
        });
    } catch (error) {
        console.error('Users STATUS Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi cập nhật trạng thái' 
        });
    }
});

// GET /api/users/:id/detail - Get MongoDB extended user details
app.get('/api/users/:id/detail', async (req, res) => {
    try {
        const { id } = req.params;
        
        const userDetail = await DataModel.Mongo.UserDetail.findOne({ sql_user_id: id });
        
        if (!userDetail) {
            return res.json({ 
                success: true, 
                data: null 
            });
        }

        res.json({ 
            success: true, 
            data: userDetail 
        });
    } catch (error) {
        console.error('User Detail GET Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi lấy chi tiết người dùng' 
        });
    }
});

// PUT /api/users/:id/detail - Update MongoDB extended user details
app.put('/api/users/:id/detail', async (req, res) => {
    try {
        const { id } = req.params;
        const detailData = req.body;

        const updatedDetail = await DataModel.Mongo.UserDetail.findOneAndUpdate(
            { sql_user_id: id },
            { $set: detailData },
            { upsert: true, new: true }
        );

        res.json({ 
            success: true, 
            message: 'Cập nhật chi tiết người dùng thành công',
            data: updatedDetail 
        });
    } catch (error) {
        console.error('User Detail UPDATE Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi cập nhật chi tiết người dùng' 
        });
    }
});

// ==================== INVENTORY & WAREHOUSE ROUTES ====================

// GET /admin/inventory - Render inventory management page
app.get('/admin/inventory', async (req, res) => {
    try {
        console.log('🚀 Loading admin inventory page...');
        
        const [inventory, products, warehouses] = await Promise.all([
            DataModel.SQL.Inventory.findAll(),
            DataModel.SQL.Product.findAll(),
            DataModel.SQL.Warehouse.findAll()
        ]);
        
        console.log('📊 Data loaded:');
        console.log('  - Inventory items:', inventory.length);
        console.log('  - Products:', products.length);
        console.log('  - Warehouses:', warehouses.length);

        res.render('inventory', { 
            layout: 'AdminMain', 
            title: 'Quản lý Tồn kho', 
            inventory,
            products,
            warehouses
        });
        
    } catch (err) {
        console.error('❌ Lỗi trong route /admin/inventory:', err);
        res.status(500).send(`
            <html>
                <head><title>Lỗi</title></head>
                <body>
                    <h1>Đã xảy ra lỗi</h1>
                    <p>Không thể tải trang quản lý tồn kho: ${err.message}</p>
                    <a href="/admin">Quay lại trang chủ</a>
                </body>
            </html>
        `);
    }
});

// API ENDPOINTS FOR INVENTORY

// GET /api/inventory - Get all inventory items
app.get('/api/inventory', async (req, res) => {
    try {
        console.log('🔄 API /api/inventory called');
        
        const inventory = await DataModel.SQL.Inventory.findAll();

        res.json({ 
            success: true, 
            data: { inventory } 
        });
        
    } catch (error) {
        console.error('Inventory GET Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi lấy danh sách tồn kho' 
        });
    }
});

// GET /api/inventory/:id - Get single inventory item
app.get('/api/inventory/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const inventoryItem = await DataModel.SQL.Inventory.findById(id);
        
        if (!inventoryItem) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy tồn kho' 
            });
        }

        res.json({ 
            success: true, 
            data: inventoryItem 
        });
    } catch (error) {
        console.error('Inventory GET by ID Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi lấy thông tin tồn kho' 
        });
    }
});

// POST /api/inventory - Create new inventory item
app.post('/api/inventory', async (req, res) => {
    try {
        const inventoryData = req.body;
        
        console.log('📥 Creating inventory item:', inventoryData);

        // Validate required fields
        if (!inventoryData.san_pham_id || !inventoryData.kho_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu thông tin sản phẩm hoặc kho' 
            });
        }

        const newInventory = await DataModel.SQL.Inventory.create(inventoryData);

        console.log('✅ Inventory item created:', newInventory.id);

        res.status(201).json({ 
            success: true, 
            message: 'Thêm tồn kho thành công', 
            data: newInventory 
        });
    } catch (error) {
        console.error('Inventory CREATE Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi thêm tồn kho: ' + error.message 
        });
    }
});

// PUT /api/inventory/:id - Update inventory item
app.put('/api/inventory/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const inventoryData = req.body;
        
        console.log('📝 Updating inventory item:', id, inventoryData);

        const existingInventory = await DataModel.SQL.Inventory.findById(id);
        if (!existingInventory) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy tồn kho' 
            });
        }

        const updatedInventory = await DataModel.SQL.Inventory.update(id, inventoryData);

        console.log('✅ Inventory item updated:', id);

        res.json({ 
            success: true, 
            message: 'Cập nhật tồn kho thành công', 
            data: updatedInventory 
        });
    } catch (error) {
        console.error('Inventory UPDATE Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi cập nhật tồn kho: ' + error.message 
        });
    }
});

// PUT /api/inventory/:id/adjust - Adjust stock quantity
app.put('/api/inventory/:id/adjust', async (req, res) => {
    try {
        const { id } = req.params;
        const { type, quantity, note } = req.body;
        
        console.log('📊 Adjusting stock:', { id, type, quantity, note });

        if (!type || quantity === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu loại điều chỉnh hoặc số lượng' 
            });
        }

        const existingInventory = await DataModel.SQL.Inventory.findById(id);
        if (!existingInventory) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy tồn kho' 
            });
        }

        let newQuantity = existingInventory.so_luong_kha_dung;
        
        switch(type) {
            case 'increase':
                newQuantity += parseInt(quantity);
                break;
            case 'decrease':
                newQuantity -= parseInt(quantity);
                if (newQuantity < 0) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Số lượng không đủ để xuất kho' 
                    });
                }
                break;
            case 'set':
                newQuantity = parseInt(quantity);
                break;
            default:
                return res.status(400).json({ 
                    success: false, 
                    message: 'Loại điều chỉnh không hợp lệ' 
                });
        }

        const updatedInventory = await DataModel.SQL.Inventory.update(id, {
            so_luong_kha_dung: newQuantity,
            lan_nhap_hang_cuoi: new Date()
        });

        console.log('✅ Stock adjusted:', id, 'New quantity:', newQuantity);

        res.json({ 
            success: true, 
            message: 'Điều chỉnh tồn kho thành công', 
            data: updatedInventory 
        });
    } catch (error) {
        console.error('Inventory ADJUST Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi điều chỉnh tồn kho: ' + error.message 
        });
    }
});

// DELETE /api/inventory/:id - Delete inventory item
app.delete('/api/inventory/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('🗑️ Deleting inventory item:', id);

        const existingInventory = await DataModel.SQL.Inventory.findById(id);
        if (!existingInventory) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy tồn kho' 
            });
        }

        await DataModel.SQL.Inventory.delete(id);

        console.log('✅ Inventory item deleted:', id);

        res.json({ 
            success: true, 
            message: 'Xóa tồn kho thành công' 
        });
    } catch (error) {
        console.error('Inventory DELETE Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi xóa tồn kho' 
        });
    }
});

// API ENDPOINTS FOR WAREHOUSES

// GET /api/warehouses - Get all warehouses
app.get('/api/warehouses', async (req, res) => {
    try {
        console.log('🔄 API /api/warehouses called');
        
        const warehouses = await DataModel.SQL.Warehouse.findAll();

        res.json({ 
            success: true, 
            data: { warehouses } 
        });
        
    } catch (error) {
        console.error('Warehouse GET Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi lấy danh sách kho' 
        });
    }
});

// GET /api/warehouses/:id - Get single warehouse
app.get('/api/warehouses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const warehouse = await DataModel.SQL.Warehouse.findById(id);
        
        if (!warehouse) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy kho' 
            });
        }

        res.json({ 
            success: true, 
            data: warehouse 
        });
    } catch (error) {
        console.error('Warehouse GET by ID Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi lấy thông tin kho' 
        });
    }
});

// POST /api/warehouses - Create new warehouse
app.post('/api/warehouses', async (req, res) => {
    try {
        const warehouseData = req.body;
        
        console.log('📥 Creating warehouse:', warehouseData);

        // Validate required fields
        if (!warehouseData.ten_kho || !warehouseData.so_dien_thoai || !warehouseData.dia_chi_chi_tiet) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu thông tin bắt buộc (tên kho, số điện thoại, địa chỉ)' 
            });
        }

        const newWarehouse = await DataModel.SQL.Warehouse.create(warehouseData);

        console.log('✅ Warehouse created:', newWarehouse.id);

        res.status(201).json({ 
            success: true, 
            message: 'Thêm kho thành công', 
            data: newWarehouse 
        });
    } catch (error) {
        console.error('Warehouse CREATE Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi thêm kho: ' + error.message 
        });
    }
});

// PUT /api/warehouses/:id - Update warehouse
app.put('/api/warehouses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const warehouseData = req.body;
        
        console.log('📝 Updating warehouse:', id, warehouseData);

        const existingWarehouse = await DataModel.SQL.Warehouse.findById(id);
        if (!existingWarehouse) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy kho' 
            });
        }

        const updatedWarehouse = await DataModel.SQL.Warehouse.update(id, warehouseData);

        console.log('✅ Warehouse updated:', id);

        res.json({ 
            success: true, 
            message: 'Cập nhật kho thành công', 
            data: updatedWarehouse 
        });
    } catch (error) {
        console.error('Warehouse UPDATE Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi cập nhật kho: ' + error.message 
        });
    }
});

// DELETE /api/warehouses/:id - Delete warehouse
app.delete('/api/warehouses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('🗑️ Deleting warehouse:', id);

        const existingWarehouse = await DataModel.SQL.Warehouse.findById(id);
        if (!existingWarehouse) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy kho' 
            });
        }

        // Check if warehouse has inventory items
        const inventoryCount = await DataModel.SQL.Inventory.countByWarehouse(id);
        if (inventoryCount > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Không thể xóa kho đang có tồn kho sản phẩm' 
            });
        }

        await DataModel.SQL.Warehouse.delete(id);

        console.log('✅ Warehouse deleted:', id);

        res.json({ 
            success: true, 
            message: 'Xóa kho thành công' 
        });
    } catch (error) {
        console.error('Warehouse DELETE Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi xóa kho' 
        });
    }
});

// Start server
app.listen(3000, () => console.log('Server running on port 3000'));