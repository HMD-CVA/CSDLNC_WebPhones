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
        locationSelect.addEventListener('change', function() {
            const selectedLocation = this.value;
            const locationName = this.options[this.selectedIndex].text;
            console.log('📍 Location changed to:', locationName);
            
            // Save to localStorage
            localStorage.setItem('selectedLocation', selectedLocation);
            localStorage.setItem('selectedLocationName', locationName);
            
            // TODO: Update prices based on location
            // fetchPricesByLocation(selectedLocation);
        });
        
        // Load saved location
        const savedLocation = localStorage.getItem('selectedLocation');
        if (savedLocation) {
            locationSelect.value = savedLocation;
        }
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
            alert('Chức năng đăng nhập đang được phát triển');
        });
    }
    
    if (btnRegister) {
        btnRegister.addEventListener('click', function() {
            console.log('📝 Register clicked');
            // TODO: Show register modal or redirect to register page
            alert('Chức năng đăng ký đang được phát triển');
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
            
            alert('Đăng xuất thành công!');
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
            alert('Mobile menu đang được phát triển');
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
        showNotification('Đã thêm sản phẩm vào giỏ hàng!', 'success');
    };
    
    window.removeFromCart = function(productId) {
        console.log('🗑️ Removing from cart:', productId);
        
        // TODO: Call API to remove from cart
        let cartCount = parseInt(localStorage.getItem('cartCount') || '0');
        if (cartCount > 0) cartCount--;
        localStorage.setItem('cartCount', cartCount);
        
        updateCartBadge();
    };
    
    // Simple notification system
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 150px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : '#d70018'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            font-size: 14px;
            font-weight: 500;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
});
