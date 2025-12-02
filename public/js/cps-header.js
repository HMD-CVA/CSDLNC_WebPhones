// CellphoneS Style Header JavaScript
document.addEventListener('DOMContentLoaded', function() {
    
    // Search Box Functionality
    const searchInput = document.getElementById('searchInput');
    const searchSuggestions = document.getElementById('searchSuggestions');
    const searchBtn = document.querySelector('.cps-search-btn');
    
    if (searchInput && searchSuggestions) {
        // Show suggestions on focus
        searchInput.addEventListener('focus', function() {
            searchSuggestions.style.display = 'block';
        });
        
        // Hide suggestions on blur (with delay for click)
        searchInput.addEventListener('blur', function() {
            setTimeout(() => {
                searchSuggestions.style.display = 'none';
            }, 200);
        });
        
        // Search on input
        searchInput.addEventListener('input', function() {
            const query = this.value.trim();
            if (query.length > 0) {
                // TODO: Fetch search results from API
                console.log('🔍 Searching for:', query);
            }
        });
        
        // Search button click
        if (searchBtn) {
            searchBtn.addEventListener('click', function() {
                const query = searchInput.value.trim();
                if (query.length > 0) {
                    console.log('🔍 Search submitted:', query);
                    // TODO: Redirect to search results page
                    // window.location.href = `/search?q=${encodeURIComponent(query)}`;
                }
            });
        }
        
        // Enter key to search
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                if (query.length > 0) {
                    console.log('🔍 Search submitted:', query);
                    // TODO: Redirect to search results page
                }
            }
        });
    }
    
    // Click on history/trending items
    const historyItems = document.querySelectorAll('.cps-history-item');
    const trendingItems = document.querySelectorAll('.cps-trending-item');
    
    [...historyItems, ...trendingItems].forEach(item => {
        item.addEventListener('click', function() {
            const keyword = this.textContent.trim();
            if (searchInput) {
                searchInput.value = keyword;
                searchInput.focus();
            }
        });
    });
    
    // Location Selection
    const locationSelect = document.getElementById('locationSelect');
    if (locationSelect) {
        // Hàm lọc sản phẩm theo vùng miền
        async function filterProductsByRegion(regionId) {
            const locationName = locationSelect.options[locationSelect.selectedIndex]?.text || '';
            
            try {
                // Gọi API lấy sản phẩm theo vùng miền
                const response = await fetch(`/api/products/by-region/${regionId}`);
                const result = await response.json();
                
                if (result.success) {
                    updateProductList(result.data);
                    Swal.fire({
                        icon: 'success',
                        title: 'Lọc thành công!',
                        text: `Đã lọc ${result.count} sản phẩm tại ${locationName}`,
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000,
                        timerProgressBar: true
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Lỗi!',
                        text: 'Không thể lọc sản phẩm theo vùng miền'
                    });
                }
            } catch (error) {
                console.error('Error filtering products by region:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Lỗi!',
                    text: 'Lỗi khi lọc sản phẩm'
                });
            }
        }
        
        // Khôi phục vùng đã chọn từ localStorage khi load trang
        const savedRegion = localStorage.getItem('selectedRegion');
        if (savedRegion && savedRegion !== 'null' && savedRegion !== '') {
            locationSelect.value = savedRegion;
            console.log('📍 Restored region from localStorage:', savedRegion);
            
            // Tự động lọc sản phẩm theo vùng đã lưu (chỉ trên trang home)
            const productGrid = document.getElementById('productGrid');
            if (productGrid) {
                console.log('🔄 Auto-filtering products by saved region...');
                filterProductsByRegion(savedRegion);
            }
        }
        
        locationSelect.addEventListener('change', async function() {
            const selectedLocation = this.value;
            const locationName = this.options[this.selectedIndex].text;
            console.log('📍 Location changed to:', locationName);
            
            // Lưu vùng đã chọn vào localStorage
            if (selectedLocation) {
                localStorage.setItem('selectedRegion', selectedLocation);
            } else {
                localStorage.removeItem('selectedRegion');
            }
            
            if (!selectedLocation) {
                // Nếu chọn "Chọn vùng miền" thì load tất cả sản phẩm
                location.reload();
                return;
            }
            
            filterProductsByRegion(selectedLocation);
        });
    }
    
    // Cập nhật danh sách sản phẩm
    function updateProductList(products) {
        const productGrid = document.getElementById('productGrid');
        if (!productGrid) {
            console.warn('Product grid not found on this page');
            return;
        }
        
        if (products.length === 0) {
            productGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                    <h3 style="color: #666; font-size: 18px; margin-bottom: 10px;">Không tìm thấy sản phẩm</h3>
                    <p style="color: #999; font-size: 14px;">Vùng miền này hiện chưa có sản phẩm trong kho</p>
                </div>
            `;
            return;
        }
        
        // Render sản phẩm theo cấu trúc của product.handlebars (cps-product-card)
        productGrid.innerHTML = products.map(product => {
            const isDiscount = product.gia_niem_yet && product.gia_niem_yet > product.gia_ban;
            
            return `
            <div class="cps-product-card">
                <a href="/product/${product.id}" class="cps-product-link">
                    <div class="cps-product-image">
                        <img src="${product.link_anh || '/image/default-product.png'}" 
                             alt="${product.ten_san_pham}" 
                             loading="lazy">
                        
                        ${isDiscount ? `
                        <div class="cps-discount-badge">
                            Giảm ${product.phan_tram_giam}%
                        </div>
                        ` : ''}
                    </div>

                    <h3 class="cps-product-name">${product.ten_san_pham}</h3>

                    <div class="cps-price-wrapper">
                        <div class="cps-current-price">${product.gia_ban_formatted}₫</div>
                        ${isDiscount ? `
                        <div class="cps-original-price">${product.gia_khuyen_mai_formatted}₫</div>
                        ` : ''}
                    </div>

                    <div class="cps-product-meta">
                        <div class="cps-rating">
                            <i class="fas fa-star"></i>
                            <span>4.5</span>
                            <span class="cps-reviews">(${product.luot_xem || 0})</span>
                        </div>
                        <div class="cps-sold">
                            <i class="fas fa-box"></i>
                            <span>Đã bán ${product.so_luong_ban || 0}</span>
                        </div>
                    </div>
                </a>

                <div class="cps-actions">
                    <button class="cps-btn-cart" data-product-id="${product.id}" title="Thêm vào giỏ">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                    <a href="/product/${product.id}" class="cps-btn-buy">
                        MUA NGAY
                    </a>
                </div>
            </div>
            `;
        }).join('');
        
        // Re-attach event listeners cho các nút vừa tạo
        attachProductEventListeners();
    }
    
    // Gắn lại event listeners cho product cards
    function attachProductEventListeners() {
        const cpsCartButtons = document.querySelectorAll('.cps-btn-cart');
        cpsCartButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const productId = this.getAttribute('data-product-id');
                console.log('🛒 Thêm vào giỏ:', productId);
                
                // Animation hiệu ứng
                const originalHTML = this.innerHTML;
                this.innerHTML = '<i class="fas fa-check"></i>';
                this.style.background = '#28a745';
                this.style.borderColor = '#28a745';
                this.style.color = '#fff';
                
                setTimeout(() => {
                    this.innerHTML = originalHTML;
                    this.style.background = '';
                    this.style.borderColor = '';
                    this.style.color = '';
                }, 1500);
                
                // TODO: Gọi API thêm vào giỏ hàng
            });
        });
    }
    
    // Login/Register Buttons
    const btnLogin = document.querySelector('.cps-btn-login');
    const btnRegister = document.querySelector('.cps-btn-register');
    const btnLogout = document.querySelector('.cps-btn-logout');
    
    if (btnLogin) {
        btnLogin.addEventListener('click', function() {
            console.log('🔐 Login clicked');
            // TODO: Show login modal or redirect to login page
            // showLoginModal();
            Swal.fire({
                icon: 'info',
                title: 'Thông báo',
                text: 'Chức năng đăng nhập đang được phát triển'
            });
        });
    }
    
    if (btnRegister) {
        btnRegister.addEventListener('click', function() {
            console.log('📝 Register clicked');
            // TODO: Show register modal or redirect to register page
            Swal.fire({
                icon: 'info',
                title: 'Thông báo',
                text: 'Chức năng đăng ký đang được phát triển'
            });
        });
    }
    
    if (btnLogout) {
        btnLogout.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('👋 Logout clicked');
            
            // TODO: Call logout API
            // Clear user data
            localStorage.removeItem('userToken');
            localStorage.removeItem('userData');
            
            // Update UI
            document.querySelector('.cps-user-not-logged').style.display = 'block';
            document.querySelector('.cps-user-logged').style.display = 'none';
            document.getElementById('userDisplayName').textContent = 'Đăng nhập';
            
            Swal.fire({
                icon: 'success',
                title: 'Thành công!',
                text: 'Đăng xuất thành công!',
                timer: 2000,
                showConfirmButton: false
            });
        });
    }
    
    // Cart Badge Update
    function updateCartBadge() {
        const cartBadge = document.getElementById('cartBadge');
        if (cartBadge) {
            // TODO: Fetch cart count from API or localStorage
            const cartCount = localStorage.getItem('cartCount') || 0;
            cartBadge.textContent = cartCount;
            
            if (cartCount > 0) {
                cartBadge.style.display = 'block';
            } else {
                cartBadge.style.display = 'none';
            }
        }
    }
    
    updateCartBadge();
    
    // Mobile Menu Button
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            console.log('📱 Mobile menu clicked');
            // TODO: Show mobile menu modal
            Swal.fire({
                icon: 'info',
                title: 'Thông báo',
                text: 'Mobile menu đang được phát triển'
            });
        });
    }
    
    // Sticky Header on Scroll
    let lastScroll = 0;
    const header = document.querySelector('.cps-header');
    
    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            header.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        } else {
            header.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
        }
        
        lastScroll = currentScroll;
    });
    
    // Check user login status
    function checkUserLogin() {
        const userToken = localStorage.getItem('userToken');
        const userData = localStorage.getItem('userData');
        
        if (userToken && userData) {
            try {
                const user = JSON.parse(userData);
                
                // Show logged in UI
                document.querySelector('.cps-user-not-logged').style.display = 'none';
                document.querySelector('.cps-user-logged').style.display = 'block';
                document.getElementById('userDisplayName').textContent = user.name || 'Tài khoản';
                
                console.log('✅ User is logged in:', user.name);
            } catch (error) {
                console.error('Error parsing user data:', error);
            }
        } else {
            // Show not logged in UI
            document.querySelector('.cps-user-not-logged').style.display = 'block';
            document.querySelector('.cps-user-logged').style.display = 'none';
            document.getElementById('userDisplayName').textContent = 'Đăng nhập';
        }
    }
    
    checkUserLogin();
    
    // Global functions for cart management
    window.addToCart = function(productId, quantity = 1) {
        console.log('🛒 Adding to cart:', productId, 'x', quantity);
        
        // TODO: Call API to add to cart
        // For now, update local count
        let cartCount = parseInt(localStorage.getItem('cartCount') || '0');
        cartCount += quantity;
        localStorage.setItem('cartCount', cartCount);
        
        updateCartBadge();
        
        // Show success notification
        Swal.fire({
            icon: 'success',
            title: 'Thành công!',
            text: 'Đã thêm sản phẩm vào giỏ hàng!',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        });
    };
    
    window.removeFromCart = function(productId) {
        console.log('🗑️ Removing from cart:', productId);
        
        // TODO: Call API to remove from cart
        let cartCount = parseInt(localStorage.getItem('cartCount') || '0');
        if (cartCount > 0) cartCount--;
        localStorage.setItem('cartCount', cartCount);
        
        updateCartBadge();
    };
    
    // SweetAlert2 is now used for all notifications
});
