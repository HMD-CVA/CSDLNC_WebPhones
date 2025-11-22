import express from 'express';
import { engine } from 'express-handlebars';
import db from './server.js';
import DataModel from './app/model/index.js';

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
function extractKeyValuePairs(obj, parentKey = '') {
  const result = {};
  const excludeFields = ['_id', '__v', 'sql_product_id'];
  
  function recurse(currentObj, currentPath) {
    for (const [key, value] of Object.entries(currentObj)) {
      if (excludeFields.includes(key)) continue;
      
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Nested object - tiếp tục đệ quy
        recurse(value, newPath);
      } else if (Array.isArray(value)) {
        // Array - xử lý từng phần tử
        value.forEach((item, index) => {
          if (item && typeof item === 'object') {
            recurse(item, `${newPath}[${index}]`);
          } else {
            result[`${newPath}[${index}]`] = item;
          }
        });
      } else {
        // Primitive value
        result[newPath] = value;
      }
    }
  }
  
  recurse(obj, parentKey);
  return result;
}

// Route GET /admin/sanpham
app.get('/admin/sanpham', async (req, res) => {
    try {
        const [sanphams, categories, brands, productDetails] = await Promise.all([
            DataModel.SQL.Product.findAll(),
            DataModel.SQL.Category.findAll(),
            DataModel.SQL.Brand.findAll(),
            DataModel.Mongo.ProductDetail.find({}).lean()
        ]);
        
        console.log('📦 SQL Products count:', sanphams.length);
        console.log('🗂️ MongoDB Details count:', productDetails.length);

        // Xử lý dữ liệu giống như route hiện tại
        const lowercaseIds = sanphams.map(sp => String(sp.id).toLowerCase());
        const sqlProductIds = new Set(lowercaseIds);
        console.log('🆔 SQL Product IDs:', sqlProductIds);

        const detailMap = new Map();
        
        // Sử dụng hàm extractKeyValuePairs để xử lý nested objects
        productDetails.forEach(detail => {
            const detailId = String(detail.sql_product_id).toLowerCase();
            if (sqlProductIds.has(detailId)) {
                console.log('🔍 Processing detail for product:', detailId);
                
                const keyValueData = extractKeyValuePairs(detail);
                console.log('✅ Extracted key-value pairs:', Object.keys(keyValueData).length);
                
                detailMap.set(detailId, keyValueData);
            }
        });

        const combinedSanphams = sanphams.map(sp => {
            const productId = String(sp.id).toLowerCase();
            const chiTiet = detailMap.get(productId) || {};
            
            console.log(`📊 Product ${productId}: ${Object.keys(chiTiet).length} key-value pairs`);
            
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
                ngay_tao: sp.ngay_tao,
                chi_tiet: chiTiet
            };
        });

        // Thống kê
        const totalExtractedPairs = combinedSanphams.reduce((sum, sp) => sum + Object.keys(sp.chi_tiet).length, 0);
        console.log(`🎯 Total extracted key-value pairs: ${totalExtractedPairs}`);

        // Render template
        res.render('sanpham', { 
            layout: 'AdminMain', 
            title: 'Quản lý sản phẩm', 
            sanphams: combinedSanphams, 
            categories, 
            brands 
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
        const [sanphams, categories, brands, productDetails] = await Promise.all([
            DataModel.SQL.Product.findAll(),
            DataModel.SQL.Category.findAll(),
            DataModel.SQL.Brand.findAll(),
            DataModel.Mongo.ProductDetail.find({}).lean()
        ]);

        // Xử lý dữ liệu tương tự
        const lowercaseIds = sanphams.map(sp => String(sp.id).toLowerCase());
        const sqlProductIds = new Set(lowercaseIds);

        const detailMap = new Map();
        
        // Sử dụng hàm extractKeyValuePairs để xử lý nested objects
        productDetails.forEach(detail => {
            const detailId = String(detail.sql_product_id).toLowerCase();
            if (sqlProductIds.has(detailId)) {
                const keyValueData = extractKeyValuePairs(detail);
                detailMap.set(detailId, keyValueData);
            }
        });

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
                ngay_tao: sp.ngay_tao,
                chi_tiet: detailMap.get(productId) || {}
            };
        });

        // Trả về JSON cho API
        res.json({
            success: true,
            sanphams: combinedSanphams,
            categories: categories,
            brands: brands
        });
    } catch (err) {
        console.error('❌ Lỗi trong API /api/sanpham:', err);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy dữ liệu sản phẩm'
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
// // API lấy sản phẩm
// app.get('/api/sanpham', async (req, res) => {
//     try {
//         const sanphams = await DataModel.Data_SanPham_Model.find({})
//             .populate('danh_muc_id')
//             .populate('thuong_hieu_id')
//             .lean();
//         res.json(sanphams);
//     } catch (err) {
//         res.status(500).json({ error: 'Lỗi server!' });
//     }
// });

// // API Lấy danh mục
// app.get('/api/danhmuc', async (req, res) => {
//   try {
//     const categories = await DataModel.Data_Category_Model.find({})
//       .populate('danh_muc_cha_id', 'ten_danh_muc')
//       .sort({ thu_tu: 1, ngay_tao: -1 })
//       .lean();
//     res.json(categories);
//   } catch (err) {
//     console.error('Lỗi lấy danh mục:', err);
//     res.status(500).json({ error: 'Lỗi server!' });
//   }
// });

// // API Lấy thương hiệu
// app.get('/api/thuonghieu', async (req, res) => {
//   try {
//     const brands = await DataModel.Data_Brand_Model.find({})
//       .sort({ ngay_tao: -1 })
//       .lean();
//     res.json(brands);
//   } catch (err) {
//     console.error('Lỗi lấy thương hiệu:', err);
//     res.status(500).json({ error: 'Lỗi server!' });
//   }
// });

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