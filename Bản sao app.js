import express from 'express';
import { engine } from 'express-handlebars';
import db from './config/server.js';
import DataModel from './app/model/index.js';
import { generateCode } from './app/utils/codeGenerator.js'

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

// Kiểm tra biến môi trường
console.log('🔧 Environment check:');
console.log('📁 GOOGLE_DRIVE_FOLDER_ID:', process.env.GOOGLE_DRIVE_FOLDER_ID);
console.log('🌐 NODE_ENV:', process.env.NODE_ENV);

db.connectDB();
const app = express();

// Middleware
// app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
const router = express.Router();  

// Handlebars setup
app.engine('handlebars', engine({
    defaultLayout: 'AdminMain',
    helpers: {
        // === COMPARISON HELPERS ===
        eq: (a, b) => a === b,
        neq: (a, b) => a !== b,
        gt: (a, b) => a > b,
        gte: (a, b) => a >= b,
        lt: (a, b) => a < b,
        lte: (a, b) => a <= b,
        unless: (a, b) => !a ? b.fn(this) : b.inverse(this),
        or: (a, b) => a || b,

        // === STRING & ARRAY HELPERS ===
        uppercase: (str) => typeof str === 'string' ? str.toUpperCase() : str,
        lowercase: (str) => typeof str === 'string' ? str.toLowerCase() : str,
        length: (array) => Array.isArray(array) ? array.length : 0,

        // === NUMBER & CURRENCY HELPERS ===
        formatNumber: (num) => {
            if (num === null || num === undefined || isNaN(num)) return '0';
            return new Intl.NumberFormat('vi-VN').format(num);
        },

        formatCurrency: (num, currency = 'VNĐ') => {
            if (num === null || num === undefined || isNaN(num)) return `0 ${currency}`;
            return `${new Intl.NumberFormat('vi-VN').format(num)} ${currency}`;
        },
        formatCurrency: (amount) => {
            if (amount === null || amount === undefined || isNaN(amount)) return '0 VNĐ';
            return new Intl.NumberFormat('vi-VN').format(amount) + ' VNĐ';
        },
        shortCurrency: (num) => {
            if (num === null || num === undefined || isNaN(num)) return '0';
            const abs = Math.abs(num);
            if (abs >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
            if (abs >= 1_000_000)     return (num / 1_000_000).toFixed(1) + 'M';
            if (abs >= 1_000)         return (num / 1_000).toFixed(1) + 'K';
            return new Intl.NumberFormat('vi-VN').format(num);
        },
        percent: (p) => {
            if (p === null || p === undefined || isNaN(p)) return '—';
            const sign = p > 0 ? '+' : '';
            // hiển thị tối đa 1 chữ số thập phân
            return `${sign}${Number(p).toFixed(Math.abs(p) < 10 ? 1 : 0)}%`;
        },
        trendClass: (p) => (p >= 0 ? 'text-success' : 'text-danger'),
        numberVN: (num) => new Intl.NumberFormat('vi-VN').format(num || 0),

        // === PRODUCT & STOCK HELPERS ===
        getStockStatus: (quantity) => {
            if (quantity === 0) return 'outOfStock';
            if (quantity <= 10) return 'lowStock';
            return 'inStock';
        },

        getStockStatusText: (quantity) => {
            if (quantity === 0) return '🔴 Hết hàng';
            if (quantity <= 10) return '🟡 Sắp hết';
            return '🟢 Còn hàng';
        },

        getStockStatusIcon: (quantity) => {
            if (quantity === 0) return 'fa-times-circle';
            if (quantity <= 10) return 'fa-exclamation-triangle';
            return 'fa-check-circle';
        },

        isLowStock: (quantity, threshold = 10) => {
            return quantity > 0 && quantity <= threshold;
        },

        isOutOfStock: (quantity) => {
            return quantity === 0;
        },

        isInStock: (quantity, threshold = 10) => {
            return quantity > threshold;
        },

        // === PRODUCT SPECIFIC HELPERS ===
        getProductStatus: (product) => {
            if (!product || product.SoLuongTon === undefined) return 'unknown';
            if (product.SoLuongTon === 0) return 'outOfStock';
            if (product.SoLuongTon <= 10) return 'lowStock';
            return 'inStock';
        },

        formatProductPrice: (price, unit) => {
            if (price === null || price === undefined || isNaN(price)) return 'Liên hệ';
            const formattedPrice = new Intl.NumberFormat('vi-VN').format(price);
            return unit ? `${formattedPrice} VNĐ/${unit}` : `${formattedPrice} VNĐ`;
        },

        getProductBadgeClass: (quantity) => {
            if (quantity === 0) return 'badge-danger';
            if (quantity <= 10) return 'badge-warning';
            return 'badge-success';
        },

        // === PRICE SPECIFIC HELPERS ===
        getGiaTheoGio: (bangGia, khungGio) => {
            if (!bangGia || !Array.isArray(bangGia)) return 0;
            const gia = bangGia.find(g => g.KhungGio === khungGio);
            return gia ? gia.GiaTien : 0;
        },

        showKhoangGia: (giaThapNhat, giaCaoNhat) => {
            if (!giaThapNhat && !giaCaoNhat) return 'Liên hệ';
            if (giaThapNhat === giaCaoNhat) {
                return new Intl.NumberFormat('vi-VN').format(giaThapNhat) + ' VNĐ/H';
            }
            return new Intl.NumberFormat('vi-VN').format(giaThapNhat) + ' - ' + 
                new Intl.NumberFormat('vi-VN').format(giaCaoNhat) + ' VNĐ/H';
        },

        showTatCaGia: (bangGia) => {
            if (!bangGia || !Array.isArray(bangGia)) return '';
            
            return bangGia.map(gia => 
                `${gia.KhungGio}: ${new Intl.NumberFormat('vi-VN').format(gia.GiaTien)} VNĐ`
            ).join(' | ');
        },

        getGiaThapNhat: (bangGia) => {
            if (!bangGia || !Array.isArray(bangGia) || bangGia.length === 0) return 0;
            return Math.min(...bangGia.map(g => g.GiaTien));
        },

        getGiaCaoNhat: (bangGia) => {
            if (!bangGia || !Array.isArray(bangGia) || bangGia.length === 0) return 0;
            return Math.max(...bangGia.map(g => g.GiaTien));
        },

        // === STATUS HELPERS ===
        getStatusText: (status) => {
            const statusMap = {
                'Trống': 'CÒN TRỐNG',
                'Đang sử dụng': 'ĐANG SỬ DỤNG',
                'Đang bảo trì': 'BẢO TRÌ',
                'Đã đặt trước': 'ĐÃ ĐẶT',
                'available': 'CÒN TRỐNG',
                'busy': 'ĐANG SỬ DỤNG',
                'maintenance': 'BẢO TRÌ',
                'reserved': 'ĐÃ ĐẶT',
                'inStock': 'CÒN HÀNG',
                'lowStock': 'SẮP HẾT',
                'outOfStock': 'HẾT HÀNG'
            };
            return statusMap[status] || status;
        },

        getStatusClass: (status) => {
            const classMap = {
                'Trống': 'status-available',
                'Đang sử dụng': 'status-busy',
                'Đang bảo trì': 'status-maintenance',
                'Đã đặt trước': 'status-reserved',
                'inStock': 'status-in-stock',
                'lowStock': 'status-low-stock',
                'outOfStock': 'status-out-of-stock'
            };
            return classMap[status] || 'status-unknown';
        },

        getStatusIcon: (status) => {
            const iconMap = {
                'Trống': 'fa-door-open',
                'Đang sử dụng': 'fa-microphone-alt',
                'Đang bảo trì': 'fa-tools',
                'Đã đặt trước': 'fa-calendar-check',
                'inStock': 'fa-check-circle',
                'lowStock': 'fa-exclamation-triangle',
                'outOfStock': 'fa-times-circle'
            };
            return iconMap[status] || 'fa-question-circle';
        },

        // === DATE HELPERS ===
        formatDate: (date) => {
            if (!date) return '';
            try {
                return new Date(date).toLocaleDateString('vi-VN');
            } catch {
                return '';
            }
        },

        formatDateTime: (date) => {
            if (!date) return '';
            try {
                return new Date(date).toLocaleString('vi-VN');
            } catch {
                return '';
            }
        },

        formatTime: (dateString) => {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleTimeString('vi-VN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        },

        // === UTILITY HELPERS ===
        json: (obj) => {
            try {
                return JSON.stringify(obj);
            } catch {
                return '{}';
            }
        },

        // === ARRAY & OBJECT HELPERS ===
        contains: (array, value) => {
            if (!Array.isArray(array)) return false;
            return array.includes(value);
        },

        first: (array) => {
            if (!Array.isArray(array) || array.length === 0) return null;
            return array[0];
        },

        last: (array) => {
            if (!Array.isArray(array) || array.length === 0) return null;
            return array[array.length - 1];
        },

        // === CONDITIONAL HELPERS ===
        ifCond: function (v1, operator, v2, options) {
            switch (operator) {
                case '==':
                    return (v1 == v2) ? options.fn(this) : options.inverse(this);
                case '===':
                    return (v1 === v2) ? options.fn(this) : options.inverse(this);
                case '!=':
                    return (v1 != v2) ? options.fn(this) : options.inverse(this);
                case '!==':
                    return (v1 !== v2) ? options.fn(this) : options.inverse(this);
                case '<':
                    return (v1 < v2) ? options.fn(this) : options.inverse(this);
                case '<=':
                    return (v1 <= v2) ? options.fn(this) : options.inverse(this);
                case '>':
                    return (v1 > v2) ? options.fn(this) : options.inverse(this);
                case '>=':
                    return (v1 >= v2) ? options.fn(this) : options.inverse(this);
                case '&&':
                    return (v1 && v2) ? options.fn(this) : options.inverse(this);
                case '||':
                    return (v1 || v2) ? options.fn(this) : options.inverse(this);
                default:
                    return options.inverse(this);
            }
        },

        // === MATH HELPERS ===
        add: (a, b) => {
            a = parseFloat(a) || 0;
            b = parseFloat(b) || 0;
            return a + b;
        },

        subtract: (a, b) => {
            a = parseFloat(a) || 0;
            b = parseFloat(b) || 0;
            return a - b;
        },

        multiply: (a, b) => {
            a = parseFloat(a) || 0;
            b = parseFloat(b) || 0;
            return a * b;
        },

        divide: (a, b) => {
            a = parseFloat(a) || 0;
            b = parseFloat(b) || 1;
            return a / b;
        },

        // === LOGICAL HELPERS ===
        and: function () {
            const args = Array.prototype.slice.call(arguments, 0, -1);
            return args.every(arg => !!arg);
        },

        or: function () {
            const args = Array.prototype.slice.call(arguments, 0, -1);
            return args.some(arg => !!arg);
        },

        not: (value) => !value,

        // === STRING MANIPULATION ===
        truncate: (str, length) => {
            if (typeof str !== 'string') return str;
            if (str.length <= length) return str;
            return str.substring(0, length) + '...';
        },

        capitalize: (str) => {
            if (typeof str !== 'string') return str;
            return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        },

        // === PRODUCT CATEGORY HELPERS ===
        getCategoryIcon: (category) => {
            const iconMap = {
                'Đồ uống': 'fa-wine-bottle',
                'Thức ăn': 'fa-utensils',
                'Đồ ăn nhẹ': 'fa-cookie',
                'Tráng miệng': 'fa-ice-cream',
                'Khác': 'fa-box'
            };
            return iconMap[category] || 'fa-box';
        },

        getCategoryColor: (category) => {
            const colorMap = {
                'Đồ uống': 'primary',
                'Thức ăn': 'success',
                'Đồ ăn nhẹ': 'warning',
                'Tráng miệng': 'info',
                'Khác': 'secondary'
            };
            return colorMap[category] || 'secondary';
        },
    }
}));

app.set('view engine', 'handlebars');
app.set('views', './views');

console.log('🔧 Checking Cloudinary environment variables...');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing');

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ CLOUDINARY environment variables are missing!');
  console.log('👉 Please check your .env file');
} else {
  // Cấu hình Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('✅ Cloudinary configured successfully');
}

// Cấu hình multer cho upload file
const uploadsDir = path.join(process.cwd(), 'temp_uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Cấu hình multer để lưu file tạm
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'temp-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh!'), false);
    }
  }
});


router.post('/api/upload/image', upload.single('image'), async (req, res) => {
  try {
    console.log('🖼️ Starting image upload...');

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Không có file ảnh được chọn'
      });
    }

    // 🔥 NHẬN THÔNG TIN ẢNH CŨ TỪ CLIENT
    const { oldImageUrl } = req.body;
    console.log('🗑️ Old image to delete:', oldImageUrl);

    // 🔥 XOÁ ẢNH CŨ TRƯỚC KHI UPLOAD ẢNH MỚI
    if (oldImageUrl) {
      try {
        await deleteOldImage(oldImageUrl);
      } catch (deleteError) {
        console.warn('⚠️ Could not delete old image:', deleteError.message);
        // KHÔNG throw error - tiếp tục upload ảnh mới
      }
    }

    // 🔥 UPLOAD ẢNH MỚI
    const imageUrl = await uploadNewImage(req.file);
    
    res.json({
      success: true,
      directLink: imageUrl,
      message: 'Upload ảnh thành công'
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi upload ảnh: ' + error.message
    });
  }
});

// 🔥 HÀM XOÁ ẢNH CŨ
async function deleteOldImage(oldImageUrl) {
  if (!oldImageUrl) return;

  console.log('🗑️ Deleting old image:', oldImageUrl);

  // Nếu là ảnh Cloudinary
  if (oldImageUrl.includes('cloudinary.com') && process.env.CLOUDINARY_CLOUD_NAME) {
    try {
      // Extract public_id từ URL
      const publicId = extractPublicIdFromUrl(oldImageUrl);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
        console.log('✅ Deleted old Cloudinary image:', publicId);
      }
    } catch (cloudinaryError) {
      console.warn('⚠️ Could not delete Cloudinary image:', cloudinaryError.message);
    }
  }
  
  // Nếu là ảnh local
  else if (oldImageUrl.includes('/uploads/')) {
    try {
      const oldFileName = oldImageUrl.split('/').pop();
      const oldFilePath = path.join('public', 'uploads', oldFileName);
      
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
        console.log('✅ Deleted old local image:', oldFileName);
      }
    } catch (localError) {
      console.warn('⚠️ Could not delete local image:', localError.message);
    }
  }
}

// 🔥 HÀM EXTRACT PUBLIC_ID TỪ CLOUDINARY URL
function extractPublicIdFromUrl(url) {
  try {
    // Ví dụ: https://res.cloudinary.com/cloudname/image/upload/v1234567/folder/image.jpg
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+)\.(?:jpg|jpeg|png|gif)/i);
    if (matches && matches[1]) {
      return matches[1];
    }
    return null;
  } catch (error) {
    console.error('Error extracting public_id:', error);
    return null;
  }
}

// 🔥 HÀM UPLOAD ẢNH MỚI
async function uploadNewImage(file) {
  // Upload lên Cloudinary nếu được config
  if (process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET) {
    
    console.log('☁️ Uploading to Cloudinary...');
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'karaoke-rooms',
      resource_type: 'image',
      quality: 'auto:good',
      fetch_format: 'auto'
    });

    // Xóa file tạm
    fs.unlinkSync(file.path);
    return result.secure_url;
  }
  
  // Fallback: upload local
  console.log('📁 Uploading locally...');
  const fileName = `room-${Date.now()}-${file.originalname}`;
  const filePath = path.join('public', 'uploads', fileName);
  
  fs.renameSync(file.path, filePath);
  return `/uploads/${fileName}`;
}

// API để lấy danh sách ảnh không sử dụng
router.get('/api/images/unused', async (req, res) => {
  try {
    // Lấy tất cả ảnh đang được sử dụng
    const rooms = await DataModel.PhongHat.find({}, 'LinkAnh');
    const usedImages = rooms.map(room => room.LinkAnh).filter(img => img);
    
    // Lấy tất cả file trong thư mục uploads
    const uploadsDir = path.join('public', 'uploads');
    const allFiles = fs.readdirSync(uploadsDir);
    
    const unusedFiles = allFiles.filter(file => {
      const fileUrl = `/uploads/${file}`;
      return !usedImages.includes(fileUrl);
    });
    
    res.json({
      success: true,
      unusedFiles: unusedFiles,
      totalUsed: usedImages.length,
      totalUnused: unusedFiles.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API để xóa ảnh không sử dụng
router.delete('/api/images/cleanup', async (req, res) => {
  try {
    const rooms = await DataModel.PhongHat.find({}, 'LinkAnh');
    const usedImages = rooms.map(room => room.LinkAnh).filter(img => img);
    
    const uploadsDir = path.join('public', 'uploads');
    const allFiles = fs.readdirSync(uploadsDir);
    
    let deletedCount = 0;
    const errors = [];
    
    for (const file of allFiles) {
      const fileUrl = `/uploads/${file}`;
      if (!usedImages.includes(fileUrl)) {
        try {
          fs.unlinkSync(path.join(uploadsDir, file));
          deletedCount++;
        } catch (deleteError) {
          errors.push(`Không thể xóa ${file}: ${deleteError.message}`);
        }
      }
    }
    
    res.json({
      success: true,
      deletedCount: deletedCount,
      errors: errors,
      message: `Đã xóa ${deletedCount} ảnh không sử dụng`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Thêm route này sau các route upload ảnh hiện tại
router.delete('/api/upload/image', async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu URL ảnh'
      });
    }

    console.log('🗑️ Nhận yêu cầu xoá ảnh:', imageUrl);

    // Gọi hàm xoá ảnh cũ (đã có sẵn trong code)
    await deleteOldImage(imageUrl);

    res.json({
      success: true,
      message: 'Đã xoá ảnh thành công'
    });

  } catch (error) {
    console.error('❌ Lỗi xoá ảnh:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi xoá ảnh: ' + error.message
    });
  }
});












app.use(router);




///////////////////////////////
//         GET ROUTES         //
///////////////////////////////

// Trang chủ
app.get('/', async (req, res) => {
    try {
        const [phonghats, banggiaphongs, roomTypes] = await Promise.all([
            DataModel.Data_PhongHat_Model.find({}).lean().exec(),
            DataModel.Data_BangGiaPhong_Model.find({}).lean().exec(),
            DataModel.Data_BangGiaPhong_Model.distinct('LoaiPhong')
        ]);

        // Gắn giá phòng - Lấy giá THẤP NHẤT để hiển thị
        const phonghatsWithPrice = phonghats.map(room => {
          const giaPhong = banggiaphongs.filter(bg => bg.LoaiPhong === room.LoaiPhong);
          
          // Tính giá thấp nhất, cao nhất và giá hiện tại
          const giaValues = giaPhong.map(g => g.GiaTien);
          const giaThapNhat = giaValues.length > 0 ? Math.min(...giaValues) : 0;
          const giaCaoNhat = giaValues.length > 0 ? Math.max(...giaValues) : 0;
          
          // Lấy giá hiện tại dựa trên thời gian thực (hoặc giá thấp nhất)

          const giaHienTai = giaPhong.find(g => {
              const [startTime, endTime] = g.KhungGio.split('-');
              const [startHour, startMinute] = startTime.split(':').map(Number);
              const [endHour, endMinute] = endTime.split(':').map(Number);
              
              const now = new Date();
              const currentHour = now.getHours();
              const currentMinute = now.getMinutes();
              
              const currentTotalMinutes = currentHour * 60 + currentMinute;
              const startTotalMinutes = startHour * 60 + startMinute;
              const endTotalMinutes = endHour * 60 + endMinute;
              
              return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes < endTotalMinutes;
          })?.GiaTien || giaCaoNhat;

          

          return {
              ...room,
              // Giá để hiển thị
              GiaHienTai: giaHienTai,
              GiaThapNhat: giaThapNhat,
              GiaCaoNhat: giaCaoNhat,
              // Toàn bộ bảng giá
              BangGia: giaPhong,
              // Compatible với template cũ
              GiaPhong: giaThapNhat, // Hiển thị giá thấp nhất
              GiaTien: giaHienTai,   // Backup
          };
        });

        const phonghatHome = phonghatsWithPrice.filter(phong => phong.TrangThai === 'Trống');


        res.render('home', { 
            layout: 'HomeMain.handlebars',
            phonghats: phonghatsWithPrice,
            roomTypes: roomTypes,
            phonghatsH: phonghatHome
        });

    } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        res.status(500).send("Lỗi khi tải dữ liệu: " + error.message);
    }
});

// About
app.get('/about', async (req, res) => {
    try {
        res.render('about', { 
            layout: 'HomeMain.handlebars',
        });

    } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        res.status(500).send("Lỗi khi tải dữ liệu: " + error.message);
    }
});

// Helper function để format thời gian
function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays === 1) return '1 ngày trước';
  return `${diffDays} ngày trước`;
}

// Helper function để lấy trạng thái phòng
async function getRoomStatusData() {
  const roomStatusData = await DataModel.Data_PhongHat_Model.aggregate([
    {
      $group: {
        _id: '$TrangThai',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return roomStatusData.map(item => ({
    label: item._id,
    count: item.count
  }));
}

// Thêm các route API mới cho biểu đồ
app.get('/api/dashboard/charts', async (req, res) => {
  try {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    // 1. Doanh thu theo tháng (12 tháng gần nhất)
    const monthlyRevenue = await DataModel.Data_HoaDon_Model.aggregate([
      {
        $match: {
          TrangThai: 'Đã thanh toán',
          createdAt: { $gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          total: { $sum: '$TongTien' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // 2. Phân loại doanh thu theo loại dịch vụ
    const revenueByCategory = await DataModel.Data_ChiTietHD_Model.aggregate([
      {
        $lookup: {
          from: 'hoadons',
          localField: 'MaHoaDon',
          foreignField: 'MaHoaDon',
          as: 'hoadon'
        }
      },
      { $unwind: '$hoadon' },
      { $match: { 'hoadon.TrangThai': 'Đã thanh toán' } },
      {
        $group: {
          _id: '$LoaiDichVu',
          total: { $sum: '$ThanhTien' }
        }
      }
    ]);

    // 3. Trạng thái phòng
    const roomStatus = await DataModel.Data_PhongHat_Model.aggregate([
      {
        $group: {
          _id: '$TrangThai',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      monthlyRevenue,
      revenueByCategory,
      roomStatus
    });
  } catch (error) {
    console.error('Lỗi API charts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Trang admin dashboard
app.get('/admin', async (req, res) => {
  try {
    const now = new Date();
    const startDate = new Date('2025-11-01'); // Ngày bắt đầu 01/11/2025
    
    // 1) Doanh thu theo ngày (từ 01/11/2025 đến nay)
    const [dailyRevenueAgg, prevPeriodRevenueAgg] = await Promise.all([
      // Doanh thu từ 01/11/2025 đến nay
      DataModel.Data_HoaDon_Model.aggregate([
        { 
          $match: { 
            TrangThai: 'Đã thanh toán', 
            createdAt: { $gte: startDate, $lte: now } 
          } 
        },
        { 
          $group: { 
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            total: { $sum: '$TongTien' },
            count: { $sum: 1 }
          } 
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),
      // Doanh thu kỳ trước (01/10/2025 - 31/10/2025) để so sánh
      DataModel.Data_HoaDon_Model.aggregate([
        { 
          $match: { 
            TrangThai: 'Đã thanh toán',
            createdAt: { 
              $gte: new Date('2025-10-01'), 
              $lte: new Date('2025-10-31') 
            } 
          } 
        },
        { $group: { _id: null, total: { $sum: '$TongTien' } } }
      ])
    ]);

    // Tính tổng doanh thu từ 01/11/2025
    const revenueThisPeriod = dailyRevenueAgg.reduce((sum, day) => sum + day.total, 0);
    const revenuePrevPeriod = prevPeriodRevenueAgg[0]?.total || 0;
    const revenueMoM = revenuePrevPeriod > 0 ? 
      ((revenueThisPeriod - revenuePrevPeriod) / revenuePrevPeriod) * 100 : 
      (revenueThisPeriod > 0 ? 100 : 0);

    // 2) Khách hàng theo ngày
    const [custTotal, custThisPeriod, custPrevPeriod] = await Promise.all([
      DataModel.Data_KhachHang_Model.estimatedDocumentCount(),
      DataModel.Data_KhachHang_Model.countDocuments({ 
        createdAt: { $gte: startDate, $lte: now } 
      }),
      DataModel.Data_KhachHang_Model.countDocuments({ 
        createdAt: { $gte: new Date('2025-10-01'), $lte: new Date('2025-10-31') } 
      })
    ]);
    const custMoM = custPrevPeriod > 0 ? 
      ((custThisPeriod - custPrevPeriod) / custPrevPeriod) * 100 : 
      (custThisPeriod > 0 ? 100 : 0);

    // 3) Đơn hàng theo ngày
    const [ordersThisPeriod, ordersPrevPeriod] = await Promise.all([
      DataModel.Data_HoaDon_Model.countDocuments({ 
        TrangThai: 'Đã thanh toán', 
        createdAt: { $gte: startDate, $lte: now } 
      }),
      DataModel.Data_HoaDon_Model.countDocuments({ 
        TrangThai: 'Đã thanh toán',
        createdAt: { $gte: new Date('2025-10-01'), $lte: new Date('2025-10-31') } 
      })
    ]);
    const ordersMoM = ordersPrevPeriod > 0 ? 
      ((ordersThisPeriod - ordersPrevPeriod) / ordersPrevPeriod) * 100 : 
      (ordersThisPeriod > 0 ? 100 : 0);

    // 4) Phòng hát
    const [roomsTotal, roomsActive] = await Promise.all([
      DataModel.Data_PhongHat_Model.estimatedDocumentCount(),
      DataModel.Data_PhongHat_Model.countDocuments({ TrangThai: 'Đang sử dụng' })
    ]);

    // 5) Dữ liệu biểu đồ doanh thu theo ngày
    const dailyRevenueData = await DataModel.Data_HoaDon_Model.aggregate([
      {
        $match: {
          TrangThai: 'Đã thanh toán',
          createdAt: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          total: { $sum: '$TongTien' },
          date: { $first: '$createdAt' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // 6) Dữ liệu biểu đồ phân loại doanh thu
    const revenueByCategoryData = await DataModel.Data_ChiTietHD_Model.aggregate([
      {
        $lookup: {
          from: 'hoadons',
          localField: 'MaHoaDon',
          foreignField: 'MaHoaDon',
          as: 'hoadonInfo'
        }
      },
      { $unwind: '$hoadonInfo' },
      { 
        $match: { 
          'hoadonInfo.TrangThai': 'Đã thanh toán',
          'hoadonInfo.createdAt': { $gte: startDate, $lte: now }
        } 
      },
      {
        $group: {
          _id: '$LoaiDichVu',
          total: { $sum: '$ThanhTien' }
        }
      }
    ]);

    // 7) Hoạt động gần đây
    const recentHoaDons = await DataModel.Data_HoaDon_Model.find({
      createdAt: { $gte: startDate, $lte: now }
    })
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();

    const activityData = recentHoaDons.map(activity => {
      let icon = 'shopping-cart';
      let iconColor = 'success';
      let title = 'Đơn hàng mới';
      
      const formatCurrencyTemp = (num) => {
        if (num === null || num === undefined || isNaN(num)) return '0 VNĐ';
        return new Intl.NumberFormat('vi-VN').format(num) + ' VNĐ';
      };

      let description = `Hóa đơn ${activity.MaHoaDon} - ${formatCurrencyTemp(activity.TongTien || 0)}`;

      if (activity.TrangThai === 'Chưa thanh toán') {
        icon = 'clock';
        iconColor = 'warning';
        title = 'Hóa đơn chờ thanh toán';
      } else if (activity.TrangThai === 'Đã thanh toán') {
        icon = 'check-circle';
        iconColor = 'success';
        title = 'Hóa đơn đã thanh toán';
      }

      return {
        icon,
        iconColor,
        title,
        description,
        time: formatTimeAgo(activity.createdAt)
      };
    });

    // 8) Sản phẩm phổ biến từ 01/11/2025
    const topProductsAgg = await DataModel.Data_ChiTietHD_Model.aggregate([
      {
        $lookup: {
          from: 'hoadons',
          localField: 'MaHoaDon',
          foreignField: 'MaHoaDon',
          as: 'hoadonInfo'
        }
      },
      { $unwind: '$hoadonInfo' },
      { 
        $match: { 
          'hoadonInfo.TrangThai': 'Đã thanh toán',
          'hoadonInfo.createdAt': { $gte: startDate, $lte: now },
          MaHang: { $ne: null }
        } 
      },
      {
        $group: {
          _id: '$MaHang',
          totalSold: { $sum: '$SoLuong' }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 3 }
    ]);

    const topProducts = await Promise.all(
      topProductsAgg.map(async (item) => {
        const product = await DataModel.Data_MatHang_Model.findOne({ MaHang: item._id }).lean();
        if (product) {
          return {
            ...product,
            soLuongBan: item.totalSold
          };
        }
        return null;
      })
    ).then(products => products.filter(p => p !== null));

    // Dữ liệu mặc định nếu không có sản phẩm
    const finalTopProducts = topProducts.length > 0 ? topProducts : [
      {
        TenHang: "Bia Tiger",
        LoaiHang: "Đồ uống",
        DonGia: 125000,
        LinkAnh: "https://via.placeholder.com/60x60/4361ee/ffffff?text=P1",
        soLuongBan: 284
      },
      {
        TenHang: "Snack",
        LoaiHang: "Đồ ăn nhẹ", 
        DonGia: 25000,
        LinkAnh: "https://via.placeholder.com/60x60/f72585/ffffff?text=P2",
        soLuongBan: 542
      },
      {
        TenHang: "Nước suối",
        LoaiHang: "Đồ uống",
        DonGia: 15000,
        LinkAnh: "https://via.placeholder.com/60x60/4cc9f0/ffffff?text=P3",
        soLuongBan: 892
      }
    ];

    // Chuẩn bị dữ liệu biểu đồ
    const chartData = {
      dailyRevenue: dailyRevenueData.map(item => ({
        label: `${item._id.day}/${item._id.month}/${item._id.year}`,
        value: item.total,
        date: item.date
      })),
      revenueByCategory: revenueByCategoryData.map(item => ({
        label: item._id,
        value: item.total
      })),
      roomStatus: await getRoomStatusData()
    };

    // Stats cho cards
    const stats = {
      // Doanh thu từ 01/11/2025
      totalRevenue: revenueThisPeriod,
      momPercent: revenueMoM,
      momIsUp: revenueMoM >= 0,

      // Khách hàng từ 01/11/2025
      totalCustomers: custTotal,
      customersThisPeriod: custThisPeriod,
      customersMoM: custMoM,
      customersIsUp: custMoM >= 0,

      // Đơn hàng từ 01/11/2025
      ordersThisPeriod: ordersThisPeriod,
      ordersMoM: ordersMoM,
      ordersIsUp: ordersMoM >= 0,

      // Phòng
      roomsTotal,
      roomsActive,

      // Thông tin period
      periodStart: '01/11/2025',
      periodEnd: formatDate(now)
    };

    res.render('AD_Dashboard', { 
      layout: 'AdminMain', 
      dashboardPage: true, 
      stats,
      recentActivities: activityData,
      topProducts: finalTopProducts,
      chartData: JSON.stringify(chartData)
    });

  } catch (err) {
    console.error('Lỗi dashboard:', err);
    res.status(500).send('Lỗi server!');
  }
});


// Helper function format date
function formatDate(date) {
  return new Date(date).toLocaleDateString('vi-VN');
}


// Admin logout
app.get('/logout', (req, res) => {
    res.redirect('/');
});


// Quản lý phòng hát
app.get('/admin/phonghat', async (req, res) => {
    try {
        const [phonghats, bangGiaList, roomTypes, roomStatus] = await Promise.all([
            DataModel.Data_PhongHat_Model.find({}).lean().exec(),
            DataModel.Data_BangGiaPhong_Model.find({}).lean().exec(),
            DataModel.Data_BangGiaPhong_Model.distinct('LoaiPhong'),
            DataModel.Data_PhongHat_Model.distinct('TrangThai')
        ]);

        // Tạo map để tra cứu nhanh bảng giá theo LoaiPhong
        const phonghatsWithPrice = phonghats.map(phong => {
            const bangGiaCungLoai = bangGiaList.filter(banggia => 
                banggia.LoaiPhong === phong.LoaiPhong
            );

            return {
                ...phong,
                BangGia: bangGiaCungLoai,
            };
        });
        
        // Chuẩn bị dữ liệu cho phần chỉnh sửa
        const editBangGia = bangGiaList.map(gia => {
            const [startTime = '', endTime = ''] = gia.KhungGio.split('-');
            return {
                ...gia,
                startTime,
                endTime
            };
        });

        // Tính toán thống kê
        const totalRooms = phonghats.length;
        const countAvailable = phonghats.filter(p => p.TrangThai === 'Trống').length;
        const countBusy = phonghats.filter(p => p.TrangThai === 'Đang sử dụng').length;
        const countReserved = phonghats.filter(p => p.TrangThai === 'Đã đặt trước').length;
        
        res.render('phonghat', { 
            layout: 'AdminMain', 
            title: 'Quản lý phòng hát & bảng giá', 
            phonghats: phonghatsWithPrice,
            roomTypes: roomTypes,
            currentBangGia: bangGiaList, // Dữ liệu hiện tại
            editBangGia: editBangGia,    // Dữ liệu để chỉnh sửa
            totalRooms: totalRooms,
            countAvailable: countAvailable,
            countBusy: countBusy,
            countReserved: countReserved,
            phonghatPage: true,
            roomStatus: roomStatus,
            helpers: {
                formatNumber: function(price) {
                    return new Intl.NumberFormat('vi-VN').format(price);
                },
                json: function(context) {
                    return JSON.stringify(context);
                },
                eq: function(a, b) {
                    return a === b;
                }
            }
        });

    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Lỗi server!');
    }
});

// Quản lý giá phong
app.get('/admin/loaiphong', async (req, res) => {
    try {
        const loaiphongs = await DataModel.Data_BangGiaPhong_Model.find({}).lean();
        res.render('loaiphong', { layout: 'AdminMain', title: 'Quản lý loại và giá phòng', loaiphongs });
    } catch (err) {
        res.status(500).send('Lỗi server!');
    }
});

app.get('/admin/thietbi', async (req, res) => {
    try {
        const thietbis = await DataModel.Data_ThietBi_Model.find({}).lean();
        
        // Lấy danh sách mã phòng duy nhất từ thiết bị
        const uniqueMaPhongs = [...new Set(thietbis.map(item => item.MaPhong))].sort((a, b) => {
            // Hàm trích xuất số từ mã phòng
            const extractNumber = (code) => {
                if (!code) return 0;
                // Tìm tất cả các số trong chuỗi và lấy số đầu tiên
                const matches = code.match(/\d+/);
                return matches ? parseInt(matches[0], 10) : 0;
            };

            const numA = extractNumber(a);
            const numB = extractNumber(b);

            // So sánh số học
            return numA - numB;
        });
        const loaiThietBis = [...new Set(thietbis.map(item => item.LoaiThietBi))];

        res.render('thietbi', { 
            layout: 'AdminMain', 
            title: 'Quản lý thiết bị', 
            thietbis,
            uniqueMaPhongs, // Truyền danh sách mã phòng duy nhất vào template
            loaiThietBis
        });
    } catch (err) {
        res.status(500).send('Lỗi server!');
    }
});

app.get('/api/thietbi/:maTB', async (req, res) => {
    try {
        const { maTB } = req.params;
        console.log('📦 Loại phòng nhận được:', maTB);

        const thietbis = await DataModel.Data_ThietBi_Model.findOne({
            MaThietBi: maTB
        }).lean();

        if (!thietbis) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thiết bị'
            });
        }
        
        res.json(thietbis);
    } catch (err) {
        res.status(500).send('Lỗi server!');
    }
});

app.get('/api/loaiphong/check-loai-phong/:loaiPhong', async (req, res) => {
    try {
        const { loaiPhong } = req.params;
        console.log('📦 Loại phòng nhận được:', loaiPhong);
        console.log('🔍 Kiểu dữ liệu:', typeof loaiPhong);
        
        // Kiểm tra xem có phòng nào đang sử dụng loại phòng này không
        const roomsUsingType = await DataModel.Data_BangGiaPhong_Model.find({ 
            LoaiPhong: loaiPhong 
        });
        
        res.json({ 
            isUsed: roomsUsingType.length > 0
        });
        
    } catch (err) {
        console.error('Lỗi kiểm tra loại phòng:', err);
        res.status(500).json({ error: err.message });
    }
});

// API kiểm tra loại phòng có đang được sử dụng không
app.get('/api/phonghat/check-loai-phong/:loaiPhong', async (req, res) => {
    try {
        const { loaiPhong } = req.params;
        
        // Kiểm tra xem có phòng nào đang sử dụng loại phòng này không
        const roomsUsingType = await DataModel.Data_PhongHat_Model.find({ 
            LoaiPhong: loaiPhong 
        });
        
        const roomDetails = roomsUsingType.map(room => ({
            TenPhong: room.TenPhong,
            MaPhong: room.MaPhong,
            TrangThai: room.TrangThai
        }));
        
        res.json({ 
            isUsed: roomsUsingType.length > 0,
            loaiPhong,
            count: roomsUsingType.length,
            rooms: roomDetails
        });
        
    } catch (err) {
        console.error('Lỗi kiểm tra loại phòng:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/hoadon/banggia/:maPhong', async (req, res) => {
    try {
        const { maPhong } = req.params;
        console.log('🔍 Bắt đầu tìm Bảng giá cho Mã phòng:', maPhong);

        // 1. TÌM KIẾM LOẠI PHÒNG: Tìm thông tin phòng để lấy LoaiPhong
        const phong = await DataModel.Data_PhongHat_Model.findOne({ 
            MaPhong: maPhong 
        }).select('LoaiPhong').lean().exec();

        if (!phong || !phong.LoaiPhong) {
            console.log(`⚠️ Không tìm thấy phòng hoặc Loại Phòng cho mã: ${maPhong}`);
            return res.status(404).json({ 
                success: false, 
                message: `Không tìm thấy loại phòng cho mã ${maPhong}` 
            });
        }
        
        const loaiPhong = phong.LoaiPhong;

        // 2. TRUY VẤN BẢNG GIÁ: Dùng LoaiPhong vừa tìm được
        const bangGia = await DataModel.Data_BangGiaPhong_Model.find({ 
            LoaiPhong: loaiPhong 
        }).lean().exec();

        console.log(`✅ Đã tải ${bangGia.length} mục giá cho Loại phòng: ${loaiPhong}`);
        
        res.json(bangGia); // Trả về mảng bảng giá
        
    } catch (err) {
        console.error('❌ Lỗi Server khi truy vấn bảng giá:', err);
        res.status(500).json({ 
            success: false,
            error: 'Lỗi server khi truy vấn bảng giá.' 
        });
    }
});


app.get('/api/banggia/:loaiPhong', async (req, res) => {
    try {
        const { loaiPhong } = req.params;
        const bangGia = await DataModel.Data_BangGiaPhong_Model.find({ 
            LoaiPhong: loaiPhong 
        }).lean().exec();
        
        res.json(bangGia);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Lỗi server!' });
    }
});




// Quản lý nhân viên
app.get('/admin/nhanvien', async (req, res) => {
    try {
        const nhanviens = await DataModel.Data_NhanVien_Model.find({}).lean();
        res.render('nhanvien', { layout: 'AdminMain', title: 'Quản lý nhân viên', nhanviens });
    } catch (err) {
        res.status(500).send('Lỗi server!');
    }
});

app.get('/api/nhanvien/:maNV', async (req, res) => {
    try {
        const { maNV } = req.params;
        console.log('🔍 Đang tìm nhân viên với mã:', maNV);
        const nhanVien = await DataModel.Data_NhanVien_Model.findOne({ 
            MaNV : maNV 
        }).lean().exec();
        
        res.json(nhanVien);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Lỗi server!' });
    }
});

app.get('/admin/hoadon', async (req, res) => {
    try {
        const [hoadons, chitiethoadons, khachhangs] = await Promise.all([
            DataModel.Data_HoaDon_Model.find({}).lean().exec(),
            DataModel.Data_ChiTietHD_Model.find({}).lean().exec(),
            DataModel.Data_KhachHang_Model.find({}).lean().exec()
        ]);
        
        // Tạo map để tra cứu nhanh
        const khachhangMap = {};
        khachhangs.forEach(kh => {
            khachhangMap[kh.MaKH] = kh;
        });

        const hoadonsWithDetails = hoadons.map(hoadon => {
            const chitietCuaHoadon = chitiethoadons.filter(ct => 
                ct.MaHoaDon.toString() === hoadon.MaHoaDon.toString()
            );
            
            // Lấy thông tin khách hàng
            const khachhang = khachhangMap[hoadon.MaKH];
            
            return {
                ...hoadon,
                ChiTiet: chitietCuaHoadon,
                KH: khachhang || {} // Đảm bảo KH luôn là object
            };
        });

        console.log(hoadonsWithDetails);

        res.render('hoadon', { 
            layout: 'AdminMain', 
            title: 'Quản lý hoá đơn', 
            hoadons: hoadonsWithDetails
        });
    } catch (err) {
        console.error('Lỗi server:', err);
        res.status(500).send('Lỗi server!');
    }
});

app.get('/admin/mathang', async (req, res) => {
    try {
        const mathangs = await DataModel.Data_MatHang_Model.find({}).lean();
        
        // Lấy danh sách loại hàng duy nhất
        const uniqueCategories = [...new Set(mathangs.map(item => item.LoaiHang))].filter(Boolean);
        console.log(uniqueCategories);
        
        res.render('mathang', { 
            layout: 'AdminMain', 
            title: 'Quản lý mặt hàng', 
            mathangs,
            uniqueCategories 
        });
    } catch (err) {
        console.error('Lỗi khi lấy dữ liệu mặt hàng:', err);
        res.status(500).send('Lỗi server!');
    }
});

app.get('/api/hoadon/mathang', async (req, res) => {
  try {
        const mathangs = await DataModel.Data_MatHang_Model.find({}).lean();
        
        // Lấy danh sách loại hàng duy nhất
        const uniqueCategories = [...new Set(mathangs.map(item => item.LoaiHang))].filter(Boolean);
        console.log(uniqueCategories);

        console.log(mathangs);

        res.json({
            success: true,
            data: mathangs,
            categories: uniqueCategories,
            count: mathangs.length
        });
        
    } catch (err) {
        console.error('Lỗi khi lấy dữ liệu mặt hàng:', err);
        res.status(500).send('Lỗi server!');
    }
});

app.get('/api/mathang/tonkho', async (req, res) => {
  try {
    const { search, loaiHang } = req.query;
    
    let filter = { SoLuongTon: { $gt: 0 } };
    
    // Tìm kiếm theo tên hàng
    if (search) {
      filter.TenHang = { $regex: search, $options: 'i' };
    }
    
    // Lọc theo loại hàng
    if (loaiHang) {
      filter.LoaiHang = loaiHang;
    }
    
    const mathangs = await DataModel.Data_MatHang_Model.find(filter)
      .select('MaHang TenHang LoaiHang DonGia DonViTinh SoLuongTon LinkAnh')
      .sort({ TenHang: 1 });
    
    res.json({
      success: true,
      data: mathangs,
      count: mathangs.length
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách mặt hàng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách mặt hàng',
      error: error.message
    });
  }
});


app.get('/admin/datphong', async (req, res) => {
  try {
    const [khachhangs, datphongs] = await Promise.all([
        DataModel.Data_KhachHang_Model.find({}).lean().exec(),
        DataModel.Data_DatPhong_Model.find({}).lean().exec()
    ]);

    const datPhongKH = datphongs.map(datphong => {
        const datPhongWithKH = khachhangs.filter(kh => 
            kh.MaKH.toString() === datphong.MaKH.toString()
        );

        return {
            ...datphong,
            ChiTiet: datPhongWithKH,
        };
    });

    console.log(datPhongKH);    
    
    res.render('datphong', { 
        layout: 'AdminMain', title: 'Quản lý đặt phòng', 
        datPhongKH
    });

  } catch (error) {
    console.error('Lỗi đặt phòng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi get đặt phòng',
      error: error.message
    });
  }
});

app.get('/api/datphong/:maDatPhong', async (req, res) => {
    try {
        const { maDatPhong } = req.params;
        console.log('🔍 Tìm đặt phòng với mã:', maDatPhong);

        // Tìm đặt phòng theo mã - SỬA: dùng findOne thay vì find
        const datphong = await DataModel.Data_DatPhong_Model.findOne({ 
            MaDatPhong: maDatPhong 
        }).lean().exec();

        if (!datphong) {
            return res.status(404).json({ error: 'Không tìm thấy đặt phòng' });
        }

        // Tìm khách hàng tương ứng
        const khachhang = await DataModel.Data_KhachHang_Model.findOne({
            MaKH: datphong.MaKH
        }).lean().exec();

        // Kết hợp dữ liệu
        const result = {
            ...datphong,
            KhachHang: khachhang // Thêm thông tin khách hàng
        };

        console.log('📊 Tìm thấy đặt phòng và thông tin khách hàng');
        console.log(result);

        res.json(result); // Trả về object thay vì array

    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Lỗi server!' });
    }
});

// Lấy danh sách phòng trống
app.get('/api/hoadon/phongtrong', async (req, res) => {
  try {
    const phongsWithPrice = await DataModel.Data_PhongHat_Model.aggregate([
      // 🔥 BƯỚC 1: Lọc chỉ lấy các phòng có TrangThai: "Trống"
      {
        $match: {
          TrangThai: "Trống"
        }
      },
      
      // 🔥 BƯỚC 2: Nối (JOIN) với Collection Bảng Giá Phòng
      {
        $lookup: {
          from: 'banggiaphongs', // Tên collection trong MongoDB (phải là số nhiều, chữ thường)
          localField: 'LoaiPhong', // Trường để nối trên model PhongHat (LoaiPhong)
          foreignField: 'LoaiPhong', // Trường để nối trên model BangGiaPhong (LoaiPhong)
          as: 'BangGiaChiTiet' // Đặt tên trường mới chứa kết quả nối
        }
      },
      
      // 🔥 BƯỚC 3: Dự chiếu (Project) và sắp xếp kết quả
      {
        $project: {
          // Chỉ chọn các trường cần thiết
          MaPhong: 1,
          TenPhong: 1,
          LoaiPhong: 1,
          SucChua: 1,
          TrangThai: 1,
          BangGia: '$BangGiaChiTiet', // Đổi tên BangGiaChiTiet thành BangGia
        }
      },
      
      // Sắp xếp theo TenPhong
      {
        $sort: {
          TenPhong: 1
        }
      }
    ]);
    console.log(phongsWithPrice);
    res.json({
      success: true,
      data: phongsWithPrice,
      count: phongsWithPrice.length
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách phòng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách phòng',
      error: error.message
    });
  }
});

app.get('/api/hoadon/:maHoaDon', async (req, res) => {
    try {
        const { maHoaDon } = req.params;
        console.log('🔍 Tìm hóa đơn với mã:', maHoaDon);

        const hoadons = await DataModel.Data_HoaDon_Model.findOne({ 
            MaHoaDon : maHoaDon 
        }).lean().exec();

        console.log(`📊 Tìm thấy ${hoadons.length} chi tiết`);
        console.log(hoadons);

        res.json(hoadons);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Lỗi server!');
    }
});

app.get('/api/hoadon/edit/:maHoaDon', async (req, res) => {
    try {   
        const { maHoaDon } = req.params;
        console.log('🔍 Tìm hóa đơn với mã:', maHoaDon);

        // Tìm hóa đơn
        const hoaDon = await DataModel.Data_HoaDon_Model.findOne({ MaHoaDon: maHoaDon }).lean();
        if (!hoaDon) {
            console.log('❌ Không tìm thấy hóa đơn');
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hóa đơn'
            });
        }

        // Tìm khách hàng
        const khachHang = await DataModel.Data_KhachHang_Model.findOne({ MaKH: hoaDon.MaKH }).lean();
        // Tìm chi tiết hóa đơn
        const chiTietHoaDon = await DataModel.Data_ChiTietHD_Model.find({ MaHoaDon: maHoaDon }).lean();
        // Tìm phòng hát
        const phongHat = await DataModel.Data_PhongHat_Model.findOne({ MaPhong: hoaDon.MaPhong }).lean();

        // Lấy tất cả bảng giá
        const bangGiaList = await DataModel.Data_BangGiaPhong_Model.find({}).lean();

        // Lọc bảng giá theo LoaiPhong của phòng hiện tại
        const bangGiaCuaPhong = bangGiaList.filter(banggia => 
            banggia.LoaiPhong === phongHat.LoaiPhong
        );

        // Lấy thông tin mặt hàng cho từng chi tiết
        const chiTietWithMatHang = await Promise.all(
            chiTietHoaDon.map(async (ct) => {
                const matHang = await DataModel.Data_MatHang_Model.findOne({ MaHang: ct.MaHang }).lean();
                return {
                    ...ct,
                    MatHang: matHang ? {
                        TenHang: matHang.TenHang,
                        DonGia: matHang.DonGia,
                        DonViTinh: matHang.DonViTinh,
                        SoLuongTon: matHang.SoLuongTon
                    } : null
                };
            })
        );

        // Kết hợp kết quả
        const result = {
            ...hoaDon,
            KH: khachHang ? {
                MaKH: khachHang.MaKH,
                TenKH: khachHang.TenKH,
                SDT: khachHang.SDT,
                Email: khachHang.Email
            } : null,
            PH: phongHat ? {
                MaPhong: phongHat.MaPhong,
                TenPhong: phongHat.TenPhong,
                LoaiPhong: phongHat.LoaiPhong,
                SucChua: phongHat.SucChua,
                TrangThai: phongHat.TrangThai
            } : null,
            BangGia: bangGiaCuaPhong, 
            ChiTietHoaDon: chiTietWithMatHang
        };

        console.log(`✅ Tìm thấy hóa đơn:`, result.MaHoaDon);
        console.log(`📊 Chi tiết dịch vụ:`, result.ChiTietHoaDon ? result.ChiTietHoaDon.length : 0);

        res.json(result);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server!',
            error: err.message
        });
    }
});

app.get('/api/chitiethoadon/:maHoaDon', async (req, res) => {
    try {
        const { maHoaDon } = req.params;
        console.log('🔍 Tìm chi tiết hóa đơn với mã:', maHoaDon);
        const ctHD = await DataModel.Data_ChiTietHD_Model.find({ 
            MaHoaDon : maHoaDon 
        }).lean().exec();

        const chiTietWithMatHang = await Promise.all(
            ctHD.map(async (chiTiet) => {
                const matHang = await DataModel.Data_MatHang_Model.findOne({
                    MaHang: chiTiet.MaHang
                }).lean().exec();

                return {
                    ...chiTiet,
                    TenHang: matHang?.TenHang || 'N/A',
                    DonViTinh: matHang?.DonViTinh || 'N/A',
                    SoLuongTon: matHang?.SoLuongTon || 0,
                    LinkAnh: matHang?.LinkAnh || ''
                };
            })
        );

        console.log(`📊 Tìm thấy ${chiTietWithMatHang.length} chi tiết`);
        console.log(chiTietWithMatHang);

        res.json(chiTietWithMatHang);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Lỗi server!');
    }
});

// GET /api/phong/:maPhong/banggia - Lấy bảng giá và khung giờ hoạt động của phòng
app.get('/api/phong/:maPhong/banggia', async (req, res) => {
    try {
        const { maPhong } = req.params;
        
        // Lấy thông tin phòng
        const phong = await DataModel.Data_PhongHat_Model.findOne({ MaPhong: maPhong });
        if (!phong) {
            return res.status(404).json({ error: 'Không tìm thấy phòng' });
        }
        
        // Lấy bảng giá cho loại phòng này
        const bangGia = await DataModel.Data_BangGiaPhong_Model.find({
            LoaiPhong: phong.LoaiPhong
        });
        
        // Xác định khung giờ hoạt động từ bảng giá
        let khungGioHoatDong = { start: '10:00', end: '22:00' }; // Mặc định
        
        if (bangGia.length > 0) {
            // Giả sử bảng giá có trường GioBatDau và GioKetThuc
            const gioBatDau = bangGia.map(g => g.GioBatDau).sort()[0];
            const gioKetThuc = bangGia.map(g => g.GioKetThuc).sort().reverse()[0];
            
            khungGioHoatDong = {
                start: gioBatDau || '10:00',
                end: gioKetThuc || '22:00'
            };
        }
        
        res.json({
            bangGia: bangGia,
            khungGioHoatDong: khungGioHoatDong,
            phong: {
                MaPhong: phong.MaPhong,
                TenPhong: phong.TenPhong,
                LoaiPhong: phong.LoaiPhong
            }
        });
        
    } catch (error) {
        console.error('❌ Lỗi API bảng giá phòng:', error);
        res.status(500).json({ error: error.message });
    }
});



// Admin login page
app.get('/admin-login', (req, res) => res.redirect('/'));

///////////////////////////////
//         POST ROUTES        //
///////////////////////////////

// Admin login
app.post('/admin-login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await DataModel.Data_Admin_Model.findOne({ username, password });
        if (admin) {
            req.session.isAdmin = true;
            return res.redirect('/admin');
        }
        res.send('Sai tài khoản hoặc mật khẩu!');
    } catch (err) {
        res.status(500).send('Lỗi server!');
    }
});

// Thêm khách hàng
app.post('/api/khachhang', async (req, res) => {
    try {
        const { name, phone, address } = req.body;
        const kh = await DataModel.Data_KhachHang_Model.create({ name, phone, address });
        res.status(200).json(kh);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Thêm nhân viên
app.post('/api/nhanvien', async (req, res) => {
  try {

    const maNV = await generateCode('NV', DataModel.Data_NhanVien_Model, 'MaNV');

    const newEmployee = new DataModel.Data_NhanVien_Model({
      ...req.body,
      MaNV: maNV  // Tự động gán mã mới
    });

    await newEmployee.save();
    res.status(201).json({ 
      message: 'Thêm nhân viên thành công', 
      data: newEmployee 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Thêm sản phẩm
app.post('/api/sanpham', async (req, res) => {
    try {
        const { name, price, description, image, sale } = req.body;
        const sp = await DataModel.Data_SanPham_Model.create({ name, price, description, image, sale });
        res.status(200).json(sp);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Thêm phòng hát
app.post('/api/phonghat', async (req, res) => {
    try {
        const { TenPhong, LoaiPhong, SucChua, TrangThai, GhiChu, LinkAnh } = req.body;      
        
        console.log('📥 Nhận dữ liệu phòng:', TenPhong);

        // Tạo mã phòng tự động sử dụng hàm generateCode
        const maPhong = await generateCode('P', DataModel.Data_PhongHat_Model, 'MaPhong');
        
        const ph = await DataModel.Data_PhongHat_Model.create({ 
            MaPhong: maPhong,
            TenPhong, 
            LoaiPhong,  
            SucChua, 
            TrangThai, 
            GhiChu, 
            LinkAnh,
            createdAt: new Date()
        });
        
        console.log('✅ Đã thêm phòng:', ph.TenPhong);
        console.log('📝 Mã phòng được tạo:', ph.MaPhong);
        
        res.status(200).json({
            success: true,
            message: `Thêm phòng "${ph.TenPhong}" thành công với mã ${ph.MaPhong}!`,
            data: ph
        });
        
    } catch (err) {
        console.error('❌ Lỗi thêm phòng:', err);
        res.status(400).json({ 
            success: false,
            error: err.message 
        });
    }
});

// API để lưu bảng giá
app.post('/api/banggia/:loaiPhong', async (req, res) => {
    try {
        const { loaiPhong, bangGia } = req.body;      
        
        console.log('📥 Nhận dữ liệu bảng giá:', {
            loaiPhong: loaiPhong,
            soKhungGio: bangGia ? bangGia.length : 0
        });

        // Validate dữ liệu đầu vào
        if (!loaiPhong || !bangGia || !Array.isArray(bangGia)) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ: thiếu loaiPhong hoặc bangGia'
            });
        }

        if (bangGia.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng thêm ít nhất một khung giờ'
            });
        }

        // Validate từng khung giờ
        for (let i = 0; i < bangGia.length; i++) {
            const gia = bangGia[i];
            if (!gia.KhungGio || gia.GiaTien === undefined || gia.GiaTien === null) {
                return res.status(400).json({
                    success: false,
                    message: `Khung giờ thứ ${i + 1} thiếu thông tin KhungGio hoặc GiaTien`
                });
            }
            if (gia.GiaTien < 1000) {
                return res.status(400).json({
                    success: false,
                    message: `Khung giờ "${gia.KhungGio}" có giá tiền không hợp lệ (phải từ 1,000 VNĐ)`
                });
            }
        }

        console.log('🗑️ Đang xóa khung giờ cũ cho loại phòng:', loaiPhong);
        
        // Xóa các khung giờ cũ - GIỮ NGUYÊN LOGIC CŨ
        const deleteResult = await DataModel.Data_BangGiaPhong_Model.deleteMany({ 
            LoaiPhong: loaiPhong 
        });
        
        console.log('✅ Đã xóa:', deleteResult.deletedCount, 'khung giờ cũ');

        // Tạo mã cho từng khung giờ - GIỮ NGUYÊN LOGIC CŨ
        const newBangGia = [];
        
        // Lấy mã cuối cùng một lần để tối ưu - GIỮ NGUYÊN LOGIC CŨ
        const lastMaGia = await generateCode('PG', DataModel.Data_BangGiaPhong_Model, 'MaGia');
        const lastNumber = parseInt(lastMaGia.replace('PG', '')) || 0;
        
        console.log('🔢 Mã cuối cùng:', lastMaGia, 'Số:', lastNumber);

        // Tạo dữ liệu mới - GIỮ NGUYÊN LOGIC CŨ
        for (let i = 0; i < bangGia.length; i++) {
            const gia = bangGia[i];
            const newNumber = lastNumber + i + 1;
            const maGia = `PG${newNumber.toString().padStart(3, '0')}`;
            
            newBangGia.push({
                MaGia: maGia,
                LoaiPhong: loaiPhong,
                KhungGio: gia.KhungGio,
                GiaTien: parseInt(gia.GiaTien),
                createdAt: new Date()
            });

            console.log(`📝 Tạo khung giờ ${i + 1}:`, {
                maGia: maGia,
                khungGio: gia.KhungGio,
                giaTien: gia.GiaTien
            });
        }

        console.log('💾 Đang lưu', newBangGia.length, 'khung giờ mới...');
        
        // Lưu dữ liệu mới - GIỮ NGUYÊN LOGIC CŨ
        const result = await DataModel.Data_BangGiaPhong_Model.insertMany(newBangGia);
        
        console.log('✅ Đã thêm thành công:', result.length, 'khung giờ');
        console.log('📋 Mã được tạo:', result.map(item => item.MaGia));
        
        // Response - GIỮ NGUYÊN LOGIC CŨ + THÊM THÔNG TIN
        res.json({
            success: true,
            message: `Cập nhật thành công ${result.length} khung giờ cho loại phòng "${loaiPhong}"!`,
            data: {
                soKhungGio: result.length,
                maGiaList: result.map(item => item.MaGia),
                bangGia: result
            }
        });

    } catch (error) {
        console.error('❌ Lỗi lưu bảng giá:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lưu bảng giá: ' + error.message,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

app.post('/api/loaiphong', async (req, res) => {
    try {
        console.log('=== 🚨 API /api/loaiphong ===');
        console.log('📦 Request body:', req.body);
        
        const { TenLoaiPhong, Action, OldRoomType } = req.body;
        
        // VALIDATION
        if (!TenLoaiPhong || !Action) {
            return res.status(400).json({ 
                error: 'Thiếu thông tin bắt buộc: TenLoaiPhong và Action' 
            });
        }

        if (Action === 'add') {
            console.log('🔍 Kiểm tra loại phòng tồn tại:', TenLoaiPhong);
            
            // Kiểm tra trùng
            const existing = await DataModel.Data_BangGiaPhong_Model.findOne({ 
                LoaiPhong: TenLoaiPhong 
            });
            
            if (existing) {
                console.log('❌ Loại phòng đã tồn tại');
                return res.status(400).json({ error: 'Loại phòng đã tồn tại!' });
            }

            console.log('💾 Đang tạo loại phòng mới...');

            const lastMaGia = await generateCode('PG', DataModel.Data_BangGiaPhong_Model, 'MaGia');
            const lastNumber = parseInt(lastMaGia.replace('PG', '')) || 0;
            
            const newNumber = lastNumber + 1;
            const maGia = `PG${newNumber.toString().padStart(3, '0')}`;
            
            // Tạo loại phòng mới với bảng giá rỗng
            const newRoomType = new DataModel.Data_BangGiaPhong_Model({
                MaGia: maGia,
                LoaiPhong: TenLoaiPhong,
                BangGia: [],
                CreatedAt: new Date(),
                UpdatedAt: new Date()
            });
            
            await newRoomType.save();
            console.log('✅ Đã lưu loại phòng mới thành công');
            
            res.json({ 
                success: true, 
                message: `Đã thêm loại phòng "${TenLoaiPhong}" thành công!`,
                data: newRoomType 
            });

        } else if (Action === 'edit') {
            // SỬA LOẠI PHÒNG - CẬP NHẬT TẤT CẢ DOCUMENTS
            if (!OldRoomType) {
                return res.status(400).json({ error: 'Thiếu thông tin loại phòng cũ!' });
            }

            console.log(`✏️ Đang đổi "${OldRoomType}" thành "${TenLoaiPhong}"`);

            // Kiểm tra trùng tên mới
            if (TenLoaiPhong !== OldRoomType) {
                const existing = await DataModel.Data_BangGiaPhong_Model.findOne({ 
                    LoaiPhong: TenLoaiPhong 
                });
                
                if (existing) {
                    return res.status(400).json({ error: 'Tên loại phòng mới đã tồn tại!' });
                }
            }

            // Cập nhật TRONG TẤT CẢ document có LoaiPhong cũ
            const bangGiaResult = await DataModel.Data_BangGiaPhong_Model.updateMany(
                { LoaiPhong: OldRoomType },
                { 
                    $set: { 
                        LoaiPhong: TenLoaiPhong,
                        UpdatedAt: new Date()
                    } 
                }
            );

            console.log(`📊 Đã cập nhật ${bangGiaResult.modifiedCount} document trong Data_BangGiaPhong_Model`);

            // Cập nhật trong collection phòng hát
            const phongHatResult = await DataModel.Data_PhongHat_Model.updateMany(
                { LoaiPhong: OldRoomType },
                { $set: { LoaiPhong: TenLoaiPhong } }
            );

            console.log(`📊 Đã cập nhật ${phongHatResult.modifiedCount} phòng trong Data_PhongHat_Model`);

            if (bangGiaResult.modifiedCount === 0 && phongHatResult.modifiedCount === 0) {
                return res.status(404).json({ error: 'Không tìm thấy loại phòng để sửa!' });
            }

            res.json({ 
                success: true, 
                message: `Đã đổi loại phòng "${OldRoomType}" thành "${TenLoaiPhong}"! (${bangGiaResult.modifiedCount} bảng giá, ${phongHatResult.modifiedCount} phòng)`,
                data: { 
                    old: OldRoomType, 
                    new: TenLoaiPhong,
                    bangGiaUpdated: bangGiaResult.modifiedCount,
                    phongHatUpdated: phongHatResult.modifiedCount
                }
            });

        } else if (Action === 'delete') {
            // XÓA LOẠI PHÒNG - XÓA TẤT CẢ DOCUMENTS
            console.log(`🗑️ Đang xóa loại phòng: ${TenLoaiPhong}`);

            // Kiểm tra xem loại phòng có đang được sử dụng không
            const usedRooms = await DataModel.Data_PhongHat_Model.find({ 
                LoaiPhong: TenLoaiPhong 
            });
            
            if (usedRooms.length > 0) {
                return res.status(400).json({ 
                    error: `Không thể xóa! Có ${usedRooms.length} phòng đang sử dụng loại phòng "${TenLoaiPhong}".` 
                });
            }

            // Xóa TẤT CẢ document có LoaiPhong này
            const result = await DataModel.Data_BangGiaPhong_Model.deleteMany({ 
                LoaiPhong: TenLoaiPhong 
            });

            console.log(`📊 Đã xóa ${result.deletedCount} document trong Data_BangGiaPhong_Model`);

            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Không tìm thấy loại phòng để xóa!' });
            }

            res.json({ 
                success: true, 
                message: `Đã xóa loại phòng "${TenLoaiPhong}" thành công! (${result.deletedCount} bảng giá)`,
                data: { deletedCount: result.deletedCount }
            });

        } else {
            return res.status(400).json({ error: 'Action không hợp lệ!' });
        }
        
    } catch (err) {
        console.error('💥 LỖI SERVER CHI TIẾT:');
        console.error('Message:', err.message);
        console.error('Stack:', err.stack);
        
        res.status(500).json({ 
            error: 'Lỗi server: ' + err.message 
        });
    }
});

app.post('/api/thietbi', async (req, res) => {
    try {
        console.log('🎯 API /api/thietbi ĐƯỢC GỌI!');
        console.log('📦 Body received:', req.body);
        
        const formData = req.body;
        console.log('💾 FormData:', formData);

        // VALIDATION
        if (!formData.TenThietBi || !formData.MaPhong || !formData.LoaiThietBi) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc: Tên thiết bị, Mã phòng, Loại thiết bị'
            });
        }

        // Tạo mã thiết bị tự động
        const maThietBi = await generateCode('TB', DataModel.Data_ThietBi_Model, 'MaThietBi');
        console.log('🔢 Mã thiết bị mới:', maThietBi);

        // Tạo thiết bị mới
        const newThietBi = new DataModel.Data_ThietBi_Model({
            MaThietBi: maThietBi,
            TenThietBi: formData.TenThietBi,
            MaPhong: formData.MaPhong,
            LoaiThietBi: formData.LoaiThietBi,
            TinhTrang: formData.TinhTrang || 'Tốt',
            NgayNhap: formData.NgayNhap || new Date(),
            LinkAnh: formData.LinkAnh || '',
            // Thêm các trường mặc định khác nếu cần
            // HangSanXuat: formData.HangSanXuat || '',
            // Model: formData.Model || '',
            // GiaTri: formData.GiaTri || 0,
            // ThoiGianBaoHanh: formData.ThoiGianBaoHanh || '',
            // GhiChu: formData.GhiChu || ''
        });

        console.log('💾 Đang lưu thiết bị:', newThietBi);

        // Lưu vào database
        const savedThietBi = await newThietBi.save();
        
        console.log('✅ Đã lưu thiết bị thành công:', savedThietBi);

        res.json({
            success: true,
            message: `Thiết bị "${formData.TenThietBi}" đã được thêm thành công với mã ${maThietBi}!`,
            data: savedThietBi
        });

    } catch (error) {
        console.error('❌ Lỗi lưu thiết bị:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lưu thiết bị: ' + error.message,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});


app.post('/api/datphong', async (req, res) => {
  try {
    const { 
      maKH, tenKH, sdt, email, 
      maDatPhong, maPhong, tenPhong, giaTien, loaiPhong,
      thoiGianBatDau, thoiGianKetThuc, songuoi, ghiChu, trangThai 
    } = req.body;

    // 1. Kiểm tra xem khách hàng đã tồn tại chưa (dựa vào SDT)
    let khachHang = await DataModel.Data_KhachHang_Model.findOne({ SDT: sdt });

    const maKHs = await generateCode('KH', DataModel.Data_KhachHang_Model, 'MaKH');
    const maDatPhongs = await generateCode('DP', DataModel.Data_DatPhong_Model, 'MaDatPhong');
    
    if (!khachHang) {
      // Tạo khách hàng mới nếu chưa tồn tại
      khachHang = new DataModel.Data_KhachHang_Model({
        MaKH: maKHs,
        TenKH: tenKH,
        SDT: sdt,
        Email: email || '',
        createdAt: new Date()
      });
      await khachHang.save();
    }

    // 2. Tạo đơn đặt phòng
    const datPhong = new DataModel.Data_DatPhong_Model({
      MaDatPhong: maDatPhongs,
      MaKH: khachHang.MaKH,
      MaPhong: maPhong,
      ThoiGianBatDau: new Date(thoiGianBatDau),
      ThoiGianKetThuc: new Date(thoiGianKetThuc),
      SoNguoi: songuoi,
      TrangThai: trangThai,
      GhiChu: ghiChu || '',
      createdAt: new Date()
    });

    await datPhong.save();

    const phongCapNhat = await DataModel.Data_PhongHat_Model.findOneAndUpdate(
      { MaPhong: maPhong },
      { 
        TrangThai: 'Đã đặt trước',
        updatedAt: new Date()
      },
      { new: true } // Trả về document đã được cập nhật
    );

    if (!phongCapNhat) {
      console.warn(`⚠️ Không tìm thấy phòng với mã: ${maPhong}`);
      // Không throw error ở đây vì đơn đặt phòng đã được tạo thành công
    } else {
      console.log(`✅ Đã cập nhật trạng thái phòng ${maPhong} thành "Đã đặt"`);
    }

    res.status(201).json({
      success: true,
      message: 'Đặt phòng thành công',
      data: {
        maDatPhong: datPhong.MaDatPhong,
        maKH: khachHang.MaKH,
        tenKH: khachHang.TenKH,
        sdt: khachHang.SDT,
        tenPhong: tenPhong,
        loaiPhong: loaiPhong,
        giaTien: giaTien,
        thoiGianBatDau: datPhong.ThoiGianBatDau,
        thoiGianKetThuc: datPhong.ThoiGianKetThuc,
        songuoi: datPhong.SoNguoi,
        trangThai: datPhong.TrangThai,
        phongDaCapNhat: !!phongCapNhat
      }
    });

  } catch (error) {
    console.error('Lỗi đặt phòng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đặt phòng',
      error: error.message
    });
  }
});

app.post('/api/mathang', async (req, res) => {
    try {
    const { 
      TenHang, LoaiHang, DonGia, DonViTinh, SoLuongTon, LinkAnh
    } = req.body;

    const maMH = await generateCode('MH', DataModel.Data_MatHang_Model, 'MaHang');

    // 2. Tạo đơn đặt phòng
    const matHang = new DataModel.Data_MatHang_Model({
      MaHang: maMH,
      TenHang: TenHang,
      LoaiHang: LoaiHang,
      DonGia: DonGia,
      DonViTinh: DonViTinh,
      SoLuongTon: SoLuongTon,
      LinkAnh: LinkAnh,
      createdAt: new Date()
    });

    await matHang.save();

    res.status(201).json({
      success: true,
      message: 'Thêm mặt hàng thành công',
    });

  } catch (error) {
    console.error('Lỗi thêm mặt hàng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi thêm mặt hàng',
      error: error.message
    });
  }
});

app.post('/api/hoadon', async (req, res) => {
    try {
        const { tenKH, sdtKH, emailKH, maPhong,  thoiGianBatDau, tienPhong, dichVu, tongTien } = req.body;       
        
        console.log('📥 Nhận dữ liệu hóa đơn:', { 
            tenKH, sdtKH, emailKH, maPhong, thoiGianBatDau, 
            tienPhong, tongTien, soDichVu: dichVu.length 
        });

        let khachHang = await DataModel.Data_KhachHang_Model.findOne({ SDT: sdtKH });
        if (!khachHang) {
            const maKH = await generateCode('KH', DataModel.Data_KhachHang_Model, 'MaKH');
            khachHang = new DataModel.Data_KhachHang_Model({
                MaKH: maKH,
                TenKH: tenKH,
                SDT: sdtKH,
                Email: emailKH || '',
                createdAt: new Date()
            });
            await khachHang.save();
            console.log('✅ Đã tạo khách hàng mới:', khachHang.TenKH);
        } else {
            console.log('✅ Đã tìm thấy khách hàng:', khachHang.TenKH);
        }

        // Tạo mã hoá đơn tự động sử dụng hàm generateCode
        const maHD = await generateCode('HD', DataModel.Data_HoaDon_Model, 'MaHoaDon');
        const hoaDon = new DataModel.Data_HoaDon_Model({
            MaHoaDon: maHD,
            MaDatPhong: null,
            MaKH: khachHang.MaKH,
            MaPhong: maPhong,
            TongTien: tongTien,
            ThoiGianBatDau: new Date(thoiGianBatDau),
            ThoiGianKetThuc: null,
            TrangThai: 'Chưa thanh toán',
            createdAt: new Date()
        });
        await hoaDon.save();
        console.log('✅ Đã tạo hóa đơn:', maHD);

        let chiTietHoaDons = [];
        for (const [index, dv] of dichVu.entries()) {
            // Kiểm tra tồn kho
            const matHang = await DataModel.Data_MatHang_Model.findOne({MaHang : dv.MaHang});
            if (!matHang) {
                throw new Error(`Mặt hàng ${dv.TenHang} không tồn tại`);
            }

            if (matHang.SoLuongTon < dv.SoLuong) {
                throw new Error(`Số lượng tồn kho không đủ cho ${dv.TenHang}. Chỉ còn ${matHang.SoLuongTon} ${matHang.DonViTinh}`);
            }

            // Tạo chi tiết hóa đơn
            const maCTHD = await generateCode('CTHD', DataModel.Data_ChiTietHD_Model, 'MaCTHD');
            const chiTiet = new DataModel.Data_ChiTietHD_Model({
                MaCTHD: maCTHD,
                MaHoaDon: hoaDon.MaHoaDon,
                MaHang: dv.MaHang,
                SoLuong: dv.SoLuong,
                DonGia: dv.DonGia,
                ThanhTien: dv.ThanhTien,
                LoaiDichVu: matHang.LoaiHang,
                createdAt: new Date()
            });
            await chiTiet.save();
            chiTietHoaDons.push(chiTiet.MaCTHD);

            // Cập nhật số lượng tồn kho
            await DataModel.Data_MatHang_Model.findOneAndUpdate(
                {MaHang : dv.MaHang},
                { $inc: { SoLuongTon: -dv.SoLuong } }
            );

            console.log(`✅ Đã thêm dịch vụ ${index + 1}: ${dv.TenHang} x${dv.SoLuong}`);
        }
        
        await DataModel.Data_PhongHat_Model.findOneAndUpdate(
            {MaPhong : maPhong},
            { 
                TrangThai: 'Đang sử dụng',
                updatedAt: new Date()
            }
        );
        console.log('✅ Đã cập nhật trạng thái phòng thành "Đang sử dụng"');
        
        res.status(200).json({
            success: true,
            message: `Thêm phòng "${maHD}" thành công với mã ${maHD}!`,
        });
        
    } catch (err) {
        console.error('❌ Lỗi thêm phòng:', err);
        res.status(400).json({ 
            success: false,
            error: err.message 
        });
    }
});


///////////////////////////////
//         PUT ROUTES         //
///////////////////////////////

// Cập nhật khách hàng
app.put('/api/khachhang/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, address } = req.body;
        const kh = await DataModel.Data_KhachHang_Model.findByIdAndUpdate(id, { name, phone, address }, { new: true });
        if (!kh) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
        res.json(kh);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Cập nhật sản phẩm
app.put('/api/sanpham/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, description, image, sale } = req.body;
        const sp = await DataModel.Data_SanPham_Model.findByIdAndUpdate(id, { name, price, description, image, sale }, { new: true });
        if (!sp) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
        res.json(sp);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Cập nhật phòng hát
app.put('/api/phonghat/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { TenPhong, LoaiPhong, SucChua, TrangThai, GhiChu, LinkAnh } = req.body;
        
        console.log('📥 Cập nhật phòng ID:', id);
        
        // KHÔNG cập nhật MaPhong khi sửa, chỉ cập nhật các trường khác
        const ph = await DataModel.Data_PhongHat_Model.findByIdAndUpdate(
            id,
            { 
                TenPhong, 
                LoaiPhong, 
                SucChua, 
                TrangThai, 
                GhiChu, 
                LinkAnh,
                createdAt: new Date()
            },
            { new: true, runValidators: true }
        );
        
        if (!ph) {
            return res.status(404).json({ 
                success: false,
                error: 'Không tìm thấy phòng' 
            });
        }
        
        console.log('✅ Đã cập nhật phòng:', ph.TenPhong);
        
        res.status(200).json({
            success: true,
            message: `Cập nhật phòng "${ph.TenPhong}" thành công!`,
            data: ph
        });
        
    } catch (err) {
        console.error('❌ Lỗi cập nhật phòng:', err);
        res.status(400).json({ 
            success: false,
            error: err.message 
        });
    }
});

app.put('/api/banggia/:loaiPhong', async (req, res) => {
    try {
        const { loaiPhong, bangGia } = req.body;      
        
        console.log('📥 Nhận dữ liệu bảng giá:', {
            loaiPhong: loaiPhong,
            soKhungGio: bangGia ? bangGia.length : 0
        });

        // Validate dữ liệu đầu vào
        if (!loaiPhong || !bangGia || !Array.isArray(bangGia)) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ: thiếu loaiPhong hoặc bangGia'
            });
        }

        if (bangGia.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng thêm ít nhất một khung giờ'
            });
        }

        // Validate từng khung giờ
        for (let i = 0; i < bangGia.length; i++) {
            const gia = bangGia[i];
            if (!gia.KhungGio || gia.GiaTien === undefined || gia.GiaTien === null) {
                return res.status(400).json({
                    success: false,
                    message: `Khung giờ thứ ${i + 1} thiếu thông tin KhungGio hoặc GiaTien`
                });
            }
            if (gia.GiaTien < 1000) {
                return res.status(400).json({
                    success: false,
                    message: `Khung giờ "${gia.KhungGio}" có giá tiền không hợp lệ (phải từ 1,000 VNĐ)`
                });
            }
        }

        console.log('🗑️ Đang xóa khung giờ cũ cho loại phòng:', loaiPhong);
        
        // Xóa các khung giờ cũ - GIỮ NGUYÊN LOGIC CŨ
        const deleteResult = await DataModel.Data_BangGiaPhong_Model.deleteMany({ 
            LoaiPhong: loaiPhong 
        });
        
        console.log('✅ Đã xóa:', deleteResult.deletedCount, 'khung giờ cũ');

        // Tạo mã cho từng khung giờ - GIỮ NGUYÊN LOGIC CŨ
        const newBangGia = [];
        
        // Lấy mã cuối cùng một lần để tối ưu - GIỮ NGUYÊN LOGIC CŨ
        const lastMaGia = await generateCode('PG', DataModel.Data_BangGiaPhong_Model, 'MaGia');
        const lastNumber = parseInt(lastMaGia.replace('PG', '')) || 0;
        
        console.log('🔢 Mã cuối cùng:', lastMaGia, 'Số:', lastNumber);

        // Tạo dữ liệu mới - GIỮ NGUYÊN LOGIC CŨ
        for (let i = 0; i < bangGia.length; i++) {
            const gia = bangGia[i];
            const newNumber = lastNumber + i + 1;
            const maGia = `PG${newNumber.toString().padStart(3, '0')}`;
            
            newBangGia.push({
                MaGia: maGia,
                LoaiPhong: loaiPhong,
                KhungGio: gia.KhungGio,
                GiaTien: parseInt(gia.GiaTien),
                createdAt: new Date()
            });

            console.log(`📝 Tạo khung giờ ${i + 1}:`, {
                maGia: maGia,
                khungGio: gia.KhungGio,
                giaTien: gia.GiaTien
            });
        }

        console.log('💾 Đang lưu', newBangGia.length, 'khung giờ mới...');
        
        // Lưu dữ liệu mới - GIỮ NGUYÊN LOGIC CŨ
        const result = await DataModel.Data_BangGiaPhong_Model.insertMany(newBangGia);
        
        console.log('✅ Đã thêm thành công:', result.length, 'khung giờ');
        console.log('📋 Mã được tạo:', result.map(item => item.MaGia));
        
        // Response - GIỮ NGUYÊN LOGIC CŨ + THÊM THÔNG TIN
        res.json({
            success: true,
            message: `Cập nhật thành công ${result.length} khung giờ cho loại phòng "${loaiPhong}"!`,
            data: {
                soKhungGio: result.length,
                maGiaList: result.map(item => item.MaGia),
                bangGia: result
            }
        });

    } catch (error) {
        console.error('❌ Lỗi lưu bảng giá:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lưu bảng giá: ' + error.message,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Thêm vào routes của bạn
app.put('/banggia/all', async (req, res) => {
    try {
        console.log('📥 NHẬN REQUEST TỪ CLIENT:', {
            body: req.body,
            headers: req.headers
        });

        const { bangGiaData } = req.body;
        
        if (!bangGiaData || !Array.isArray(bangGiaData)) {
            console.log('❌ Dữ liệu không hợp lệ - bangGiaData không phải mảng:', bangGiaData);
            return res.status(400).json({ 
                error: 'Dữ liệu bảng giá không hợp lệ',
                details: 'bangGiaData phải là mảng'
            });
        }

        console.log(`✅ Nhận ${bangGiaData.length} mục dữ liệu`);

        const results = [];
        
        // Nhóm dữ liệu theo loại phòng
        const groupedByRoomType = {};
        bangGiaData.forEach((item, index) => {
            console.log(`📊 Item ${index}:`, item);
            
            if (!item.LoaiPhong) {
                console.warn(`⚠️ Item ${index} thiếu LoaiPhong`);
                return;
            }
            
            if (!groupedByRoomType[item.LoaiPhong]) {
                groupedByRoomType[item.LoaiPhong] = [];
            }
            groupedByRoomType[item.LoaiPhong].push({
                KhungGio: item.KhungGio,
                GiaTien: item.GiaTien
            });
        });

        console.log('📦 Dữ liệu đã nhóm:', groupedByRoomType);

        // Lưu từng loại phòng
        for (const [loaiPhong, giaData] of Object.entries(groupedByRoomType)) {
            try {
                console.log(`🔄 Xử lý loại phòng: ${loaiPhong} với ${giaData.length} khung giờ`);
                
                // Xóa bảng giá cũ
                const deleteResult = await DataModel.Data_BangGiaPhong_Model.deleteMany({ LoaiPhong: loaiPhong });
                console.log(`🗑️ Đã xóa ${deleteResult.deletedCount} bản ghi cũ của ${loaiPhong}`);
                
                // Thêm bảng giá mới
                const newPrices = giaData.map(gia => ({
                    LoaiPhong: loaiPhong,
                    KhungGio: gia.KhungGio,
                    GiaTien: gia.GiaTien
                }));
                
                console.log(`💾 Đang lưu ${newPrices.length} bản ghi mới cho ${loaiPhong}`);
                const insertResult = await BangGia.insertMany(newPrices);
                
                results.push({
                    loaiPhong,
                    success: true,
                    count: newPrices.length
                });
                
                console.log(`✅ Đã lưu thành công ${newPrices.length} khung giờ cho ${loaiPhong}`);
                
            } catch (error) {
                console.error(`❌ Lỗi khi xử lý ${loaiPhong}:`, error);
                results.push({
                    loaiPhong,
                    success: false,
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        
        console.log(`🎯 Kết quả tổng: ${successCount}/${totalCount} loại phòng thành công`);

        res.json({
            message: `Đã lưu bảng giá cho ${successCount}/${totalCount} loại phòng`,
            results,
            successCount,
            totalCount
        });

    } catch (error) {
        console.error('💥 Lỗi tổng khi lưu bảng giá:', error);
        res.status(500).json({ 
            error: 'Lỗi server khi lưu bảng giá',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});


app.put('/api/nhanvien/:maNV', async (req, res) => {
  try {
    const { maNV } = req.params;
    const updateData = { ...req.body };
    delete updateData.MaNV; // Không cho phép cập nhật mã NV
    delete updateData._id; // Không cho phép cập nhật _id
    console.log(maNV);
    console.log(updateData);

    const employee = await DataModel.Data_NhanVien_Model.findOneAndUpdate(
      { MaNV: maNV }, // Điều kiện tìm kiếm
      updateData,     // Dữ liệu cập nhật
      { 
        new: true,    // Trả về document sau khi cập nhật
        runValidators: true // Chạy validation
      }
    );
    if (!employee) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    }
    
    res.json({ 
      message: 'Cập nhật nhân viên thành công', 
      data: employee 
    });
  } catch (error) {
    console.error('Lỗi cập nhật nhân viên:', error);
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/thietbi/:maTB', async (req, res) => {
  try {
    const { maTB } = req.params;
    const updateData = { ...req.body };
    delete updateData.MaThietBi;
    delete updateData._id;

    const application = await DataModel.Data_ThietBi_Model.findOneAndUpdate(
      { MaThietBi: maTB }, // Điều kiện tìm kiếm
      updateData,
      { 
        message: true,    // Trả về document sau khi cập nhật
        runValidators: true // Chạy validation
      }
    );
    if (!application) {
      return res.status(404).json({ error: 'Không tìm thấy thiết bị' });
    }
    
    res.json({ 
      message: 'Xoá thiết bị thành công', 
      data: application 
    });
  } catch (error) {
    console.error('Lỗi xoá thiết bị:', error);
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/thietbi/:id/status - Cập nhật trạng thái thiết bị
app.put('/api/thietbi/:maTB/status', async (req, res) => {
  try {
    const { maTB } = req.params;
    const { TinhTrang } = req.body;
    console.log(maTB, TinhTrang);
    // const { temp } = req.query;
    // console.log(temp);
    // Validate input
    if (!TinhTrang) {
      return res.status(400).json({
        success: false,
        error: 'Trạng thái là bắt buộc'
      });
    }

    // Danh sách trạng thái hợp lệ
    const validStatuses = ['Tốt', 'Đang bảo trì', 'Cần sửa chữa', 'Hỏng'];
    if (!validStatuses.includes(TinhTrang)) {
      return res.status(400).json({
        success: false,
        error: 'Trạng thái không hợp lệ'
      });
    }

    // Tìm và cập nhật thiết bị
    const updatedThietBi = await DataModel.Data_ThietBi_Model.findOneAndUpdate(
      { MaThietBi: maTB},
      { 
        TinhTrang: TinhTrang,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updatedThietBi) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thiết bị'
      });
    }

    // Ghi log lịch sử thay đổi trạng thái (tuỳ chọn)
    // await LichSuThayDoi.create({
    //   MaThietBi: updatedThietBi.MaThietBi,
    //   LoaiThayDoi: 'thay_doi_trang_thai',
    //   MoTa: `Thay đổi trạng thái từ ${updatedThietBi.TinhTrang} thành ${TinhTrang}`,
    //   ThoiGian: new Date(),
    //   NguoiThucHien: req.user?.userId || 'system' // Nếu có authentication
    // });

    res.json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      data: {
        TinhTrang: updatedThietBi.TinhTrang
      }
    });

  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái thiết bị:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi cập nhật trạng thái',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/datphong/:maDatPhong/checkin - Cập nhật
app.put('/api/datphong/:maDatPhong/checkin', async (req, res) => {
    try {
        const { maDatPhong } = req.params;
        
        // 1. Lấy thông tin đặt phòng
        const datPhong = await DataModel.Data_DatPhong_Model.findOne({ MaDatPhong: maDatPhong });
        if (!datPhong) {
            return res.status(404).json({ error: 'Không tìm thấy đặt phòng' });
        }
        
        // 2. Kiểm tra trạng thái và thời gian
        const now = new Date();
        const thoiGianBatDau = new Date(datPhong.ThoiGianBatDau);
        const thoiGianQuaHan = new Date(thoiGianBatDau.getTime() + 15 * 60000);
        
        // if (now > thoiGianQuaHan) {
        //     return res.status(400).json({ error: 'Đã quá thời gian cho phép check-in' });
        // }
        
        if (datPhong.TrangThai !== 'Đã đặt') {
            return res.status(400).json({ error: 'Chỉ có thể check-in đặt phòng đã đặt' });
        }

        // Tạo mã hoá đơn tự động
        const maHD = await generateCode('HD', DataModel.Data_HoaDon_Model, 'MaHoaDon');
        console.log('🔢 Mã hoá đơn mới:', maHD);

        // Lấy thông tin phòng để lấy giá
        // const phong = await DataModel.Data_BangGiaPhong_Model.findOne({ MaPhong: datPhong.MaPhong });
        const giaPhong = 10000; //phong ? phong.GiaPhong : 0;
        
        // 3. Tạo hóa đơn mới với trạng thái "Chưa thanh toán" (theo schema mặc định)
        const hoaDon = new DataModel.Data_HoaDon_Model({
            MaHoaDon: maHD,
            MaDatPhong: maDatPhong,
            MaKH: datPhong.MaKH, // Lưu ý: không cần ._id vì MaKH là String trong schema
            MaPhong: datPhong.MaPhong, // Tương tự
            ThoiGianBatDau: new Date(), // Bắt đầu từ thời điểm check-in
            ThoiGianKetThuc: null,
            TrangThai: "Chưa thanh toán", // Theo schema mặc định
            TongTien: 0, // Sẽ tính toán khi check-out
        });
        
        await hoaDon.save();

        // 4. Tạo chi tiết hóa đơn cho dịch vụ thuê phòng
        const maCTHD = await generateCode('CTHD', DataModel.Data_ChiTietHD_Model, 'MaCTHD');
        
        const chiTietThuePhong = new DataModel.Data_ChiTietHD_Model({
            MaCTHD: maCTHD,
            MaHoaDon: maHD,
            MaHang: datPhong.MaPhong, // Dịch vụ thuê phòng không có mã hàng
            SoLuong: 1, // 1 đơn vị là thuê phòng
            DonGia: giaPhong,
            ThanhTien: 0, // Sẽ tính khi check-out
            LoaiDichVu: "Thuê phòng"
        });

        await chiTietThuePhong.save();
        
        // 4. Cập nhật trạng thái đặt phòng thành "Đang sử dụng" (theo nghiệp vụ)
        await DataModel.Data_DatPhong_Model.findByIdAndUpdate(datPhong._id, { 
            TrangThai: 'Đang sử dụng',
            GhiChu: `Đã chuyển thành hóa đơn ${hoaDon.MaHoaDon}`
        });
        
        res.json({ 
            message: 'Check-in thành công và đã tạo hóa đơn',
            hoaDon: hoaDon 
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API hủy đặt phòng
app.put('/api/datphong/:maDatPhong/huy', async (req, res) => {
  try {
    const { maDatPhong } = req.params;

    // 1. Tìm đơn đặt phòng
    const datPhong = await DataModel.Data_DatPhong_Model.findOne({ MaDatPhong: maDatPhong });
    
    if (!datPhong) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn đặt phòng'
      });
    }

    // 2. Cập nhật trạng thái đơn đặt phòng thành "Đã hủy"
    datPhong.TrangThai = 'Đã hủy';
    datPhong.updatedAt = new Date();
    await datPhong.save();

    // 3. Cập nhật trạng thái phòng về "Trống"
    const phongCapNhat = await DataModel.Data_PhongHat_Model.findOneAndUpdate(
      { MaPhong: datPhong.MaPhong },
      { 
        TrangThai: 'Còn Trống',
        updatedAt: new Date()
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Hủy đặt phòng thành công',
      data: {
        maDatPhong: datPhong.MaDatPhong,
        maPhong: datPhong.MaPhong,
        trangThaiPhong: phongCapNhat ? 'Trống' : 'Không thể cập nhật'
      }
    });

  } catch (error) {
    console.error('Lỗi hủy đặt phòng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi hủy đặt phòng',
      error: error.message
    });
  }
});

app.put('/api/mathang/:maMH', async (req, res) => {
  try {
    const { maMH } = req.params;
    const { 
      TenHang, LoaiHang, DonGia, DonViTinh, SoLuongTon, LinkAnh
    } = req.body;

    console.log('Nhận: ', maMH, TenHang, LoaiHang, DonGia, DonViTinh, SoLuongTon, LinkAnh);

    const mh = await DataModel.Data_MatHang_Model.findOneAndUpdate(
        { MaHang: maMH },
        { 
            TenHang, 
            LoaiHang, 
            DonGia, 
            DonViTinh, 
            SoLuongTon, 
            LinkAnh,
            createdAt: new Date()
        },
        { new: true, runValidators: true }
    );
    
    if (!mh) {
        return res.status(404).json({ 
            success: false,
            error: 'Không tìm thấy mặt hàng' 
        });
    }
    

    res.status(201).json({
      success: true,
      message: 'Cập nhật mặt hàng thành công',
    });

  } catch (error) {
    console.error('Lỗi thêm mặt hàng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi thêm mặt hàng',
      error: error.message
    });
  }
});

// Cập nhật số lượng tồn kho
app.put('/api/mathang/:maHang/tonkho', async (req, res) => {
  try {
    const { soLuong } = req.body;
    
    const mathang = await DataModel.Data_MatHang_Model.findOneAndUpdate(
      { MaHang: req.params.maHang },
      { SoLuongTon: soLuong },
      { new: true }
    );
    
    if (!mathang) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy mặt hàng'
      });
    }
    
    res.json({
      success: true,
      data: mathang,
      message: 'Cập nhật tồn kho thành công'
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật tồn kho:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật tồn kho',
      error: error.message
    });
  }
});

app.put('/api/hoadon/edit/:maHoaDon', async (req, res) => {
  try {
    const { maHoaDon } = req.params;
    const {maKH, tenKH, sdtKH, emailKH, maPhong,  thoiGianBatDau, tienPhong, dichVu, tongTien } = req.body;           
    console.log('📥 Nhận dữ liệu hóa đơn:', {
        maHoaDon, maKH, tenKH, sdtKH, emailKH, maPhong, thoiGianBatDau, 
        tienPhong, tongTien, dichVu
    });

    const KH = await DataModel.Data_KhachHang_Model.findOneAndUpdate(
        { MaKH: maKH },
        { 
            TenKH: tenKH, 
            SDT: sdtKH, 
            Email: emailKH, 
            createdAt: new Date()
        },
        { new: true, runValidators: true }
    );

    if (!KH) {
        return res.status(404).json({ 
            success: false,
            error: 'Không tìm thấy khách hàng' 
        });
    }

    // Cập nhật trạng thái phòng khi đổi (Chưa Code)
    const PH_HD_Old = await DataModel.Data_HoaDon_Model.findOne({ MaHoaDon: maHoaDon });
    if (!PH_HD_Old) {
        return res.status(404).json({ 
            success: false,
            error: 'Không tìm thấy hoá đơn chứa phòng' 
        });
    }
    const PH_Update_Status = await DataModel.Data_PhongHat_Model.findOne({ MaPhong: PH_HD_Old.MaPhong });
    if (PH_Update_Status) {
        PH_Update_Status.TrangThai = "Trống";
        await PH_Update_Status.save();
    }

    const PH_HD_New = await DataModel.Data_PhongHat_Model.findOne({ MaPhong: maPhong });
    if (!PH_HD_New) {
        return res.status(404).json({ 
            success: false,
            error: 'Không tìm thấy phòng trong hoá đơn' 
        });
    }
    PH_HD_New.TrangThai = "Đang sử dụng";   
    await PH_HD_New.save();
    
    const HD = await DataModel.Data_HoaDon_Model.findOneAndUpdate(
        {MaHoaDon: maHoaDon},
        {
            MaPhong: maPhong,
            TongTien: tongTien,
            ThoiGianBatDau: thoiGianBatDau,
            createdAt: new Date()
        },
        { new: true, runValidators: true }
    );
    if (!HD) {
        return res.status(404).json({ 
            success: false,
            error: 'Không tìm thấy hoá đơn' 
        });
    }

    const existingChiTiet = await DataModel.Data_ChiTietHD_Model.find({ MaHoaDon: maHoaDon });
    console.log('📋 Chi tiết hiện tại trong DB:', existingChiTiet.length);

    const existingChiTietMap = new Map();
    existingChiTiet.forEach(ct => { existingChiTietMap.set(ct.MaHang, ct); });

    const dichVuMap = new Map();
    dichVu.forEach(dv => { dichVuMap.set(dv.MaHang, dv); });

    // Xử lý từng dịch vụ mới
    for (const dv of dichVu) {
      const existingCT = existingChiTietMap.get(dv.MaHang);

      if (existingCT) {
        // Dịch vụ đã tồn tại - CẬP NHẬT
        console.log(`🔄 Cập nhật dịch vụ: ${dv.TenHang}`);

        // Kiểm tra số lượng thay đổi
        const soLuongThayDoi = dv.SoLuong - existingCT.SoLuong;

        if (soLuongThayDoi !== 0) {
          // Kiểm tra tồn kho
          const matHang = await DataModel.Data_MatHang_Model.findOne({ MaHang: dv.MaHang });
          if (!matHang) {
            throw new Error(`Mặt hàng ${dv.TenHang} không tồn tại`);
          }

          if (soLuongThayDoi > 0 && matHang.SoLuongTon < soLuongThayDoi) {
            throw new Error(`Số lượng tồn kho không đủ cho ${dv.TenHang}. Chỉ còn ${matHang.SoLuongTon} ${matHang.DonViTinh}`);
          }

          // Cập nhật tồn kho
          await DataModel.Data_MatHang_Model.findOneAndUpdate(
            { MaHang: dv.MaHang },
            { $inc: { SoLuongTon: -soLuongThayDoi } }
          );
        }

        // Cập nhật chi tiết hóa đơn
        await DataModel.Data_ChiTietHD_Model.findOneAndUpdate(
          { MaHang: dv.MaHang, MaHoaDon: maHoaDon },
          {
            SoLuong: dv.SoLuong,
            DonGia: dv.DonGia,
            ThanhTien: dv.ThanhTien,
            LoaiDichVu: dv.LoaiDichVu,
            createdAt: new Date()
          },
          { new: true, runValidators: true }
        );

      } else {
        // Dịch vụ mới - THÊM MỚI
        console.log(`➕ Thêm mới dịch vụ: ${dv.TenHang}`);

        // Kiểm tra tồn kho
        const matHang = await DataModel.Data_MatHang_Model.findOne({ MaHang: dv.MaHang });
        if (!matHang) {
          throw new Error(`Mặt hàng ${dv.TenHang} không tồn tại`);
        }

        if (matHang.SoLuongTon < dv.SoLuong) {
          throw new Error(`Số lượng tồn kho không đủ cho ${dv.TenHang}. Chỉ còn ${matHang.SoLuongTon} ${matHang.DonViTinh}`);
        }

        // Tạo mã chi tiết hóa đơn mới
        const maCTHD = await generateCode('CTHD', DataModel.Data_ChiTietHD_Model, 'MaCTHD');

        // Thêm chi tiết hóa đơn mới
        const newChiTiet = new DataModel.Data_ChiTietHD_Model({
          MaCTHD: maCTHD,
          MaHoaDon: maHoaDon,
          MaHang: dv.MaHang,
          SoLuong: dv.SoLuong,
          DonGia: dv.DonGia,
          ThanhTien: dv.ThanhTien,
          LoaiDichVu: dv.LoaiDichVu || matHang.LoaiHang,
          createdAt: new Date()
        });
        await newChiTiet.save();

        // Cập nhật tồn kho
        await DataModel.Data_MatHang_Model.findOneAndUpdate(
          { MaHang: dv.MaHang },
          { $inc: { SoLuongTon: -dv.SoLuong } }
        );
      }
    }

    for (const existingCT of existingChiTiet) {
      if (!dichVuMap.has(existingCT.MaHang)) {
        console.log(`🗑️ Xóa dịch vụ: ${existingCT.MaHang}`);

        // Hoàn trả tồn kho
        await DataModel.Data_MatHang_Model.findOneAndUpdate(
          { MaHang: existingCT.MaHang },
          { $inc: { SoLuongTon: existingCT.SoLuong } }
        );

        // Xóa chi tiết hóa đơn
        await DataModel.Data_ChiTietHD_Model.findByIdAndDelete(existingCT._id);
      }
    }

    console.log('✅ Cập nhật hóa đơn thành công');

    res.status(200).json({
      success: true,
      message: 'Cập nhật hóa đơn thành công',
      data: {
        maHoaDon: HD.MaHoaDon,
        tongTien: HD.TongTien,
        soDichVu: dichVu.length
      }
    });

  } catch (error) {
        console.error('❌ Lỗi cập nhật hóa đơn:', error);
        res.status(500).json({
        success: false,
        message: 'Lỗi cập nhật hóa đơn',
        error: error.message
        });
  }
});

// Thêm route mới trong Express
app.put('/api/hoadon/thanhtoan/:maHoaDon', async (req, res) => {
    try {
        const { maHoaDon } = req.params;
        const { thoiGianKetThuc, tienPhong, tongTien, trangThai } = req.body;

        console.log('💰 Nhận yêu cầu thanh toán:', {
            maHoaDon, thoiGianKetThuc, tienPhong, tongTien, trangThai
        });

        // 1. Cập nhật hóa đơn
        const updatedHoaDon = await DataModel.Data_HoaDon_Model.findOneAndUpdate(
            { MaHoaDon: maHoaDon },
            {
                ThoiGianKetThuc: thoiGianKetThuc,
                TienPhong: tienPhong,
                TongTien: tongTien,
                TrangThai: trangThai,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        if (!updatedHoaDon) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy hóa đơn'
            });
        }

        // 2. Cập nhật trạng thái phòng về "Trống"
        await DataModel.Data_PhongHat_Model.findOneAndUpdate(
            { MaPhong: updatedHoaDon.MaPhong },
            { 
                TrangThai: 'Trống',
                updatedAt: new Date()
            }
        );

        // 3. Ghi log thanh toán
        console.log(`✅ Đã thanh toán hóa đơn ${maHoaDon}, phòng ${updatedHoaDon.MaPhong} đã trống`);

        res.json({
            success: true,
            message: 'Thanh toán thành công',
            data: {
                MaHoaDon: updatedHoaDon.MaHoaDon,
                TongTien: updatedHoaDon.TongTien,
                TrangThai: updatedHoaDon.TrangThai,
                ThoiGianKetThuc: updatedHoaDon.ThoiGianKetThuc
            }
        });

    } catch (error) {
        console.error('❌ Lỗi khi thanh toán hóa đơn:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi thanh toán hóa đơn',
            error: error.message
        });
    }
});


///////////////////////////////
//        DELETE ROUTES       //
///////////////////////////////

// Xóa khách hàng
app.delete('/api/khachhang/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const kh = await DataModel.Data_KhachHang_Model.findByIdAndDelete(id);
        if (!kh) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
        res.json({ message: 'Xóa khách hàng thành công' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Xóa sản phẩm
app.delete('/api/sanpham/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sp = await DataModel.Data_SanPham_Model.findByIdAndDelete(id);
        if (!sp) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
        res.json({ message: 'Xóa sản phẩm thành công' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});


// Xóa loại phòng
app.delete('/api/banggia/:loaiPhong', async (req, res) => {
    try {
        const { loaiPhong } = req.params;
        
        console.log('🗑️ Đang xóa bảng giá cho:', loaiPhong);

        const roomsUsingType = await DataModel.Data_PhongHat_Model.find({ 
            LoaiPhong: loaiPhong 
        });
        
        if (roomsUsingType.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Không thể xóa loại phòng "${loaiPhong}"! Có ${roomsUsingType.length} phòng đang sử dụng loại phòng này.`
            });
        }
        
        const deleteResult = await DataModel.Data_BangGiaPhong_Model.deleteMany({ 
            LoaiPhong: loaiPhong 
        });
        
        console.log('✅ Đã xóa:', deleteResult.deletedCount, 'khung giờ');
        
        res.json({
            success: true,
            message: `Đã xóa ${deleteResult.deletedCount} khung giờ`,
            deletedCount: deleteResult.deletedCount
        });

    } catch (error) {
        console.error('❌ Lỗi xóa bảng giá:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa bảng giá: ' + error.message
        });
    }
});

app.delete('/api/banggiaphong/:loaiPhong', async (req, res) => {
    try {
        const { loaiPhong } = req.params;
        
        const deleteResult = await DataModel.Data_BangGiaPhong_Model.deleteMany({ 
            LoaiPhong: loaiPhong 
        });
        
        console.log('✅ Đã xóa:', deleteResult.deletedCount, 'khung giờ');
        
        res.json({
            success: true,
            message: `Đã xóa ${deleteResult.deletedCount} khung giờ`,
            deletedCount: deleteResult.deletedCount
        });

    } catch (error) {
        console.error('❌ Lỗi xóa bảng giá:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa bảng giá: ' + error.message
        });
    }
});


app.delete('/api/phonghatt', async (req, res) => {
    try {
        
        const deleteResult = await DataModel.Data_BangGiaPhong_Model.deleteMany({ 
            GiaTien: null,
            KhungGio: null,
        });
        
        console.log('✅ Đã xóa:', deleteResult.deletedCount, 'khung giờ');
        
        res.json({
            success: true,
            message: `Đã xóa ${deleteResult.deletedCount} khung giờ`,
            deletedCount: deleteResult.deletedCount
        });

    } catch (error) {
        console.error('❌ Lỗi xóa bảng giá:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa bảng giá: ' + error.message
        });
    }
});

// Xóa phòng hát
app.delete('/api/phonghat/:id', async (req, res) => {
  try {
      const { id } = req.params;
      const ph = await DataModel.Data_PhongHat_Model.findOneAndDelete({
        _id: id,
        trangThai: 'Trống'
      });
      if (!ph) return res.status(404).json({ error: 'Phòng hát đang được sử dụng!' });
      res.json({ message: 'Xóa phòng hát thành công' });
  } catch (err) {
      res.status(400).json({ error: err.message });
  }
});

app.delete('/api/nhanvien/:maNV', async (req, res) => {
  try {
    const { maNV } = req.params;

    const employee = await DataModel.Data_NhanVien_Model.findOneAndDelete(
      { MaNV: maNV }, // Điều kiện tìm kiếm
      { 
        message: true,    // Trả về document sau khi cập nhật
        runValidators: true // Chạy validation
      }
    );
    if (!employee) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    }
    
    res.json({ 
      message: 'Xoá nhân viên thành công', 
      data: employee 
    });
  } catch (error) {
    console.error('Lỗi xoá nhân viên:', error);
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/thietbi/:maTB', async (req, res) => {
  try {
    const { maTB } = req.params;

    const application = await DataModel.Data_ThietBi_Model.findOneAndDelete(
      { MaThietBi: maTB }, // Điều kiện tìm kiếm
      { 
        message: true,    // Trả về document sau khi cập nhật
        runValidators: true // Chạy validation
      }
    );
    if (!application) {
      return res.status(404).json({ error: 'Không tìm thấy thiết bị' });
    }
    
    res.json({ 
      message: 'Xoá thiết bị thành công', 
      data: application 
    });
  } catch (error) {
    console.error('Lỗi xoá thiết bị:', error);
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/mathang/:mhID', async (req, res) => {
  try {
    const { mhID } = req.params;

    const mh = await DataModel.Data_MatHang_Model.findByIdAndDelete(
      mhID, // Điều kiện tìm kiếm
      { 
        message: true,    // Trả về document sau khi cập nhật
        runValidators: true // Chạy validation
      }
    );
    if (!mh) {
      return res.status(404).json({ error: 'Không tìm thấy mặt hàng' });
    }
    
    res.json({ 
      message: 'Xoá mặt hàng thành công', 
      data: mh 
    });
  } catch (error) {
    console.error('Lỗi xoá mặt hàng:', error);
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/delete/hoadon/:maHoaDon', async (req, res) => {
  try {
    const { maHoaDon } = req.params;

    console.log(`🗑️ Nhận yêu cầu xóa hóa đơn: ${maHoaDon}`);

    // 1. Tìm hóa đơn cần xóa
    const hoaDon = await DataModel.Data_HoaDon_Model.findOne({ MaHoaDon: maHoaDon });
    if (!hoaDon) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy hóa đơn'
      });
    }

    // 2. Kiểm tra trạng thái hóa đơn - chỉ cho phép xóa hóa đơn chưa thanh toán
    // if (hoaDon.TrangThai === 'Đã thanh toán') {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Không thể xóa hóa đơn đã thanh toán'
    //   });
    // }

    const maPhong = hoaDon.MaPhong;

    // 3. Lấy danh sách chi tiết hóa đơn để hoàn trả tồn kho
    const chiTietHoaDons = await DataModel.Data_ChiTietHD_Model.find({ MaHoaDon: maHoaDon });

    // 4. Hoàn trả tồn kho cho các mặt hàng đã sử dụng
    for (const chiTiet of chiTietHoaDons) {
      if (chiTiet.MaHang && chiTiet.LoaiDichVu !== 'Thuê phòng') {
        // Hoàn trả số lượng tồn kho
        await DataModel.Data_MatHang_Model.findOneAndUpdate(
          { MaHang: chiTiet.MaHang },
          { $inc: { SoLuongTon: chiTiet.SoLuong } }
        );
        console.log(`🔄 Đã hoàn trả tồn kho cho mặt hàng ${chiTiet.MaHang}: +${chiTiet.SoLuong}`);
      }
    }

    // 5. Xóa tất cả chi tiết hóa đơn
    await DataModel.Data_ChiTietHD_Model.deleteMany({ MaHoaDon: maHoaDon });
    console.log(`✅ Đã xóa ${chiTietHoaDons.length} chi tiết hóa đơn`);

    // 6. Xóa hóa đơn chính
    await DataModel.Data_HoaDon_Model.findOneAndDelete({ MaHoaDon: maHoaDon });
    console.log(`✅ Đã xóa hóa đơn ${maHoaDon}`);

    // 7. Cập nhật trạng thái phòng về "Trống" (nếu hóa đơn đang giữ phòng)
    if (maPhong) {
      const updatedPhong = await DataModel.Data_PhongHat_Model.findOneAndUpdate(
        { MaPhong: maPhong },
        { 
          TrangThai: 'Trống',
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      if (updatedPhong) {
        console.log(`✅ Đã cập nhật trạng thái phòng ${maPhong} thành: ${updatedPhong.TrangThai}`);
      } else {
        console.warn(`⚠️ Không tìm thấy phòng ${maPhong} để cập nhật trạng thái`);
      }
    }

    res.json({
      success: true,
      message: 'Xóa hóa đơn thành công',
      data: {
        maHoaDon: maHoaDon,
        soChiTietDaXoa: chiTietHoaDons.length,
        maPhong: maPhong
      }
    });

  } catch (error) {
    console.error('❌ Lỗi khi xóa hóa đơn:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa hóa đơn',
      error: error.message
    });
  }
});


// PUT /api/phonghat/:id/image - Cập nhật chỉ trường ảnh của phòng
app.put('/api/phonghat/:id/image', async (req, res) => {
  try {
    const { id } = req.params;
    const { LinkAnh } = req.body;

    console.log('🔄 Cập nhật ảnh phòng:', { id, LinkAnh });

    // Chỉ cập nhật trường LinkAnh
    const phong = await DataModel.Data_PhongHat_Model.findByIdAndUpdate(
      id,
      { 
        LinkAnh: LinkAnh,
        updatedAt: new Date()
      },
      { 
        new: true, 
        runValidators: true,
        // Chỉ cập nhật trường LinkAnh, không ảnh hưởng trường khác
        fields: { LinkAnh: 1 } 
      }
    );

    if (!phong) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy phòng'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật ảnh phòng thành công',
      data: {
        _id: phong._id,
        LinkAnh: phong.LinkAnh
      }
    });

  } catch (error) {
    console.error('❌ Lỗi cập nhật ảnh phòng:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi cập nhật ảnh phòng'
    });
  }
});


///////////////////////////////
//        START SERVER        //
///////////////////////////////
app.listen(3000, () => console.log('Server running on port 3000'));