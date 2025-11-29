// ========== ADDRESS MANAGEMENT JAVASCRIPT ==========

// Utility Functions
const Utils = {
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    showError(message) {
        Swal.fire({
            icon: 'error',
            title: 'Lỗi!',
            text: message,
            confirmButtonText: 'Đóng',
            confirmButtonColor: '#ef4444'
        });
    },

    showSuccess(message) {
        Swal.fire({
            icon: 'success',
            title: 'Thành công!',
            text: message,
            confirmButtonText: 'OK',
            confirmButtonColor: '#10b981',
            timer: 2000
        });
    },

    showLoading(message = 'Đang xử lý...') {
        Swal.fire({
            title: message,
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    },

    closeLoading() {
        Swal.close();
    }
};

// ========== ADDRESS MANAGER CLASS ==========
class AddressManager {
    constructor() {
        this.regions = [];
        this.provinces = [];
        this.wards = [];
        this.filteredRegions = [];
        this.filteredProvinces = [];
        this.filteredWards = [];
        this.currentPageRegions = 1;
        this.currentPageProvinces = 1;
        this.currentPageWards = 1;
        this.itemsPerPage = 7;
        this.currentEditId = null;
        this.regionModal = null;
        this.provinceModal = null;
        this.wardModal = null;
        this.init();
    }

    async init() {
        // Initialize Bootstrap modals
        this.regionModal = new bootstrap.Modal(document.getElementById('regionModal'));
        this.provinceModal = new bootstrap.Modal(document.getElementById('provinceModal'));
        this.wardModal = new bootstrap.Modal(document.getElementById('wardModal'));

        await this.loadAllData();
        this.bindEvents();
        this.updateStats();
        this.renderAllTables();
    }

    // ========== DATA LOADING ==========
    async loadAllData() {
        try {
            Utils.showLoading('Đang tải dữ liệu...');
            
            await Promise.all([
                this.loadRegions(),
                this.loadProvinces(),
                this.loadWards()
            ]);
            
            Utils.closeLoading();
        } catch (error) {
            Utils.closeLoading();
            Utils.showError('Không thể tải dữ liệu: ' + error.message);
        }
    }

    async loadRegions() {
        try {
            const response = await fetch('/api/regions');
            if (!response.ok) throw new Error('Failed to load regions');
            const data = await response.json();
            this.regions = data.data || [];
        } catch (error) {
            console.error('Error loading regions:', error);
            this.regions = [];
        }
    }

    async loadProvinces() {
        try {
            const response = await fetch('/api/provinces');
            if (!response.ok) throw new Error('Failed to load provinces');
            const data = await response.json();
            this.provinces = data.data || [];
        } catch (error) {
            console.error('Error loading provinces:', error);
            this.provinces = [];
        }
    }

    async loadWards() {
        try {
            const response = await fetch('/api/wards');
            if (!response.ok) throw new Error('Failed to load wards');
            const data = await response.json();
            this.wards = data.data || [];
            this.filteredWards = [...this.wards];
            this.filteredRegions = [...this.regions];
            this.filteredProvinces = [...this.provinces];
        } catch (error) {
            console.error('Error loading wards:', error);
            this.wards = [];
            this.filteredWards = [];
        }
    }

    // ========== EVENT BINDING ==========
    bindEvents() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.closest('.tab-btn').dataset.tab));
        });

        // Refresh button
        document.getElementById('refreshBtn')?.addEventListener('click', () => this.refreshAll());

        // Region events
        document.getElementById('addRegionBtn')?.addEventListener('click', () => this.openRegionModal());
        document.getElementById('saveRegionBtn')?.addEventListener('click', () => this.saveRegion());
        document.getElementById('regionSearch')?.addEventListener('input', 
            Utils.debounce((e) => this.filterRegions(e.target.value), 300)
        );

        // Province events
        document.getElementById('addProvinceBtn')?.addEventListener('click', () => this.openProvinceModal());
        document.getElementById('saveProvinceBtn')?.addEventListener('click', () => this.saveProvince());
        document.getElementById('provinceSearch')?.addEventListener('input',
            Utils.debounce((e) => this.filterProvinces(e.target.value), 300)
        );
        document.getElementById('provinceRegionFilter')?.addEventListener('change', () => this.filterProvinces());

        // Ward events
        document.getElementById('addWardBtn')?.addEventListener('click', () => this.openWardModal());
        document.getElementById('saveWardBtn')?.addEventListener('click', () => this.saveWard());
        document.getElementById('wardSearch')?.addEventListener('input',
            Utils.debounce((e) => this.filterWards(e.target.value), 300)
        );
        document.getElementById('wardProvinceFilter')?.addEventListener('change', () => this.filterWards());
        document.getElementById('wardTypeFilter')?.addEventListener('change', () => this.filterWards());

        // Event delegation for action buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-edit-region')) {
                this.editRegion(e.target.closest('.btn-edit-region').dataset.id);
            }
            if (e.target.closest('.btn-delete-region')) {
                this.deleteRegion(e.target.closest('.btn-delete-region').dataset.id);
            }
            if (e.target.closest('.btn-edit-province')) {
                this.editProvince(e.target.closest('.btn-edit-province').dataset.id);
            }
            if (e.target.closest('.btn-delete-province')) {
                this.deleteProvince(e.target.closest('.btn-delete-province').dataset.id);
            }
            if (e.target.closest('.btn-edit-ward')) {
                this.editWard(e.target.closest('.btn-edit-ward').dataset.id);
            }
            if (e.target.closest('.btn-delete-ward')) {
                this.deleteWard(e.target.closest('.btn-delete-ward').dataset.id);
            }
        });
    }

    // ========== TAB SWITCHING ==========
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`)?.classList.add('active');
    }

    // ========== STATS UPDATE ==========
    updateStats() {
        document.getElementById('totalRegions').textContent = this.regions.length;
        document.getElementById('totalProvinces').textContent = this.provinces.length;
        document.getElementById('totalWards').textContent = this.wards.length;
        document.getElementById('totalAddresses').textContent = 
            this.regions.length + this.provinces.length + this.wards.length;
    }

    // ========== RENDER TABLES ==========
    renderAllTables() {
        this.renderRegionsTable();
        this.renderProvincesTable();
        this.renderWardsTable();
        this.populateFilters();
    }

    renderRegionsTable(searchTerm = '') {
        const tbody = document.getElementById('regionsTableBody');
        if (!tbody) return;

        let filtered = this.regions;
        if (searchTerm) {
            filtered = this.regions.filter(r => 
                r.ma_vung?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.ten_vung?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.mo_ta?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        this.filteredRegions = filtered;

        // Pagination
        const totalPages = Math.ceil(filtered.length / this.itemsPerPage);
        const start = (this.currentPageRegions - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginatedRegions = filtered.slice(start, end);

        // Update counts
        const displayStart = filtered.length > 0 ? start + 1 : 0;
        const displayEnd = Math.min(end, filtered.length);
        document.getElementById('regionDisplayCount').textContent = displayStart + '-' + displayEnd;
        document.getElementById('regionTotalCount').textContent = filtered.length;

        if (paginatedRegions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Không có dữ liệu</td></tr>';
            document.getElementById('regionPagination').innerHTML = '';
            return;
        }

        tbody.innerHTML = paginatedRegions.map(region => `
            <tr>
                <td><strong>${region.ma_vung}</strong></td>
                <td>${region.ten_vung}</td>
                <td>${region.mo_ta || '-'}</td>
                <td><span class="badge bg-info">${region.so_tinh || 0}</span></td>
                <td>
                    ${region.trang_thai == 1 
                        ? '<span class="badge bg-success">Hoạt động</span>' 
                        : '<span class="badge bg-danger">Không hoạt động</span>'}
                </td>
                <td>
                    <button class="btn-action btn-edit btn-edit-region" data-id="${region.id}" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete btn-delete-region" data-id="${region.id}" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Render pagination
        this.renderRegionPagination(totalPages);
    }

    renderProvincesTable(searchTerm = '') {
        const tbody = document.getElementById('provincesTableBody');
        if (!tbody) return;

        let filtered = this.provinces;

        // Filter by region
        const regionFilter = document.getElementById('provinceRegionFilter')?.value;
        if (regionFilter) {
            filtered = filtered.filter(p => p.vung_id === regionFilter);
        }

        // Filter by search
        if (searchTerm) {
            filtered = filtered.filter(p => 
                p.ma_tinh?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.ten_tinh?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        this.filteredProvinces = filtered;

        // Pagination
        const totalPages = Math.ceil(filtered.length / this.itemsPerPage);
        const start = (this.currentPageProvinces - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginatedProvinces = filtered.slice(start, end);

        // Update counts
        const displayStart = filtered.length > 0 ? start + 1 : 0;
        const displayEnd = Math.min(end, filtered.length);
        document.getElementById('provinceDisplayCount').textContent = displayStart + '-' + displayEnd;
        document.getElementById('provinceTotalCount').textContent = filtered.length;

        if (paginatedProvinces.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Không có dữ liệu</td></tr>';
            document.getElementById('provincePagination').innerHTML = '';
            return;
        }

        tbody.innerHTML = paginatedProvinces.map(province => `
            <tr>
                <td><strong>${province.ma_tinh}</strong></td>
                <td>${province.ten_tinh}</td>
                <td>${province.ten_vung || '-'}</td>
                <td>
                    ${province.is_major_city 
                        ? '<span class="badge bg-warning">Có</span>' 
                        : '<span class="badge bg-secondary">Không</span>'}
                </td>
                <td>${province.thu_tu_uu_tien || 0}</td>
                <td><span class="badge bg-info">${province.so_phuong_xa || 0}</span></td>
                <td>
                    ${province.trang_thai == 1 
                        ? '<span class="badge bg-success">Hoạt động</span>' 
                        : '<span class="badge bg-danger">Không hoạt động</span>'}
                </td>
                <td>
                    <button class="btn-action btn-edit btn-edit-province" data-id="${province.id}" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete btn-delete-province" data-id="${province.id}" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Render pagination
        this.renderProvincePagination(totalPages);
    }

    renderWardsTable(searchTerm = '') {
        const tbody = document.getElementById('wardsTableBody');
        if (!tbody) return;

        let filtered = this.wards;

        // Filter by province
        const provinceFilter = document.getElementById('wardProvinceFilter')?.value;
        if (provinceFilter) {
            filtered = filtered.filter(w => w.tinh_thanh_id === provinceFilter);
        }

        // Filter by type
        const typeFilter = document.getElementById('wardTypeFilter')?.value;
        if (typeFilter) {
            filtered = filtered.filter(w => w.loai === typeFilter);
        }

        // Filter by search
        if (searchTerm) {
            filtered = filtered.filter(w => 
                w.ma_phuong_xa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                w.ten_phuong_xa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                w.ten_tinh?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        this.filteredWards = filtered;

        // Pagination
        const totalPages = Math.ceil(filtered.length / this.itemsPerPage);
        const start = (this.currentPageWards - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginatedWards = filtered.slice(start, end);

        // Update counts
        const displayStart = filtered.length > 0 ? start + 1 : 0;
        const displayEnd = Math.min(end, filtered.length);
        document.getElementById('wardDisplayCount').textContent = displayStart + '-' + displayEnd;
        document.getElementById('wardTotalCount').textContent = filtered.length;

        if (paginatedWards.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Không có dữ liệu</td></tr>';
            document.getElementById('wardPagination').innerHTML = '';
            return;
        }

        tbody.innerHTML = paginatedWards.map(ward => `
            <tr>
                <td><strong>${ward.ma_phuong_xa}</strong></td>
                <td>${ward.ten_phuong_xa}</td>
                <td>${ward.ten_tinh}</td>
                <td>${ward.ten_vung || '-'}</td>
                <td>
                    ${ward.loai === 'phuong' ? '<span class="badge bg-primary">Phường</span>' : 
                      ward.loai === 'xa' ? '<span class="badge bg-success">Xã</span>' :
                      '<span class="badge bg-info">Thị trấn</span>'}
                </td>
                <td>
                    ${ward.is_inner_area 
                        ? '<span class="badge bg-warning">Nội thành</span>' 
                        : '<span class="badge bg-secondary">Ngoại thành</span>'}
                </td>
                <td>
                    ${ward.trang_thai == 1 
                        ? '<span class="badge bg-success">Hoạt động</span>' 
                        : '<span class="badge bg-danger">Không hoạt động</span>'}
                </td>
                <td>
                    <button class="btn-action btn-edit btn-edit-ward" data-id="${ward.id}" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete btn-delete-ward" data-id="${ward.id}" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Render pagination
        this.renderWardPagination(totalPages);
    }

    renderRegionPagination(totalPages) {
        const container = document.getElementById('regionPagination');
        if (!container) return;

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '<button ' + (this.currentPageRegions === 1 ? 'disabled' : '') + ' onclick="manager.changePageRegions(' + (this.currentPageRegions - 1) + ')">‹</button>';
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPageRegions - 1 && i <= this.currentPageRegions + 1)) {
                html += '<button class="' + (i === this.currentPageRegions ? 'active' : '') + '" onclick="manager.changePageRegions(' + i + ')">' + i + '</button>';
            } else if (i === this.currentPageRegions - 2 || i === this.currentPageRegions + 2) {
                html += '<button disabled>...</button>';
            }
        }

        html += '<button ' + (this.currentPageRegions === totalPages ? 'disabled' : '') + ' onclick="manager.changePageRegions(' + (this.currentPageRegions + 1) + ')">›</button>';
        
        container.innerHTML = html;
    }

    renderProvincePagination(totalPages) {
        const container = document.getElementById('provincePagination');
        if (!container) return;

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '<button ' + (this.currentPageProvinces === 1 ? 'disabled' : '') + ' onclick="manager.changePageProvinces(' + (this.currentPageProvinces - 1) + ')">‹</button>';
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPageProvinces - 1 && i <= this.currentPageProvinces + 1)) {
                html += '<button class="' + (i === this.currentPageProvinces ? 'active' : '') + '" onclick="manager.changePageProvinces(' + i + ')">' + i + '</button>';
            } else if (i === this.currentPageProvinces - 2 || i === this.currentPageProvinces + 2) {
                html += '<button disabled>...</button>';
            }
        }

        html += '<button ' + (this.currentPageProvinces === totalPages ? 'disabled' : '') + ' onclick="manager.changePageProvinces(' + (this.currentPageProvinces + 1) + ')">›</button>';
        
        container.innerHTML = html;
    }

    renderWardPagination(totalPages) {
        const container = document.getElementById('wardPagination');
        if (!container) return;

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '<button ' + (this.currentPageWards === 1 ? 'disabled' : '') + ' onclick="manager.changePageWards(' + (this.currentPageWards - 1) + ')">‹</button>';
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPageWards - 1 && i <= this.currentPageWards + 1)) {
                html += '<button class="' + (i === this.currentPageWards ? 'active' : '') + '" onclick="manager.changePageWards(' + i + ')">' + i + '</button>';
            } else if (i === this.currentPageWards - 2 || i === this.currentPageWards + 2) {
                html += '<button disabled>...</button>';
            }
        }

        html += '<button ' + (this.currentPageWards === totalPages ? 'disabled' : '') + ' onclick="manager.changePageWards(' + (this.currentPageWards + 1) + ')">›</button>';
        
        container.innerHTML = html;
    }

    changePageRegions(page) {
        this.currentPageRegions = page;
        this.renderRegionsTable();
    }

    changePageProvinces(page) {
        this.currentPageProvinces = page;
        this.renderProvincesTable();
    }

    changePageWards(page) {
        this.currentPageWards = page;
        this.renderWardsTable();
    }

    // ========== POPULATE FILTERS ==========
    populateFilters() {
        // Province region filter
        const provinceRegionFilter = document.getElementById('provinceRegionFilter');
        if (provinceRegionFilter) {
            provinceRegionFilter.innerHTML = '<option value="">Tất cả vùng</option>' +
                this.regions.map(r => `<option value="${r.ma_vung}">${r.ten_vung}</option>`).join('');
        }

        // Province select in modals
        const provinceVungId = document.getElementById('provinceVungId');
        if (provinceVungId) {
            provinceVungId.innerHTML = '<option value="">Chọn vùng</option>' +
                this.regions.map(r => `<option value="${r.ma_vung}">${r.ten_vung}</option>`).join('');
        }

        // Ward province filter
        const wardProvinceFilter = document.getElementById('wardProvinceFilter');
        if (wardProvinceFilter) {
            wardProvinceFilter.innerHTML = '<option value="">Tất cả tỉnh/thành</option>' +
                this.provinces.map(p => `<option value="${p.id}">${p.ten_tinh}</option>`).join('');
        }

        // Ward province select in modal
        const wardTinhThanhId = document.getElementById('wardTinhThanhId');
        if (wardTinhThanhId) {
            wardTinhThanhId.innerHTML = '<option value="">Chọn tỉnh/thành</option>' +
                this.provinces.map(p => `<option value="${p.id}">${p.ten_tinh}</option>`).join('');
        }
    }

    // ========== FILTER FUNCTIONS ==========
    filterRegions(searchTerm) {
        this.currentPageRegions = 1;
        this.renderRegionsTable(searchTerm);
    }

    filterProvinces(searchTerm = '') {
        const search = searchTerm || document.getElementById('provinceSearch')?.value || '';
        this.currentPageProvinces = 1;
        this.renderProvincesTable(search);
    }

    filterWards(searchTerm = '') {
        const search = searchTerm || document.getElementById('wardSearch')?.value || '';
        this.currentPageWards = 1;
        this.renderWardsTable(search);
    }

    // ========== REFRESH ==========
    async refreshAll() {
        await this.loadAllData();
        this.updateStats();
        this.renderAllTables();
        Utils.showSuccess('Đã làm mới dữ liệu!');
    }

    // ========== REGION CRUD ==========
    openRegionModal(region = null) {
        this.currentEditId = region?.id || null;
        document.getElementById('regionModalTitle').textContent = region ? 'Sửa Vùng miền' : 'Thêm Vùng miền';
        
        if (region) {
            document.getElementById('regionId').value = region.id;
            document.getElementById('regionMaVung').value = region.ma_vung;
            document.getElementById('regionTenVung').value = region.ten_vung;
            document.getElementById('regionMoTa').value = region.mo_ta || '';
            document.getElementById('regionTrangThai').value = region.trang_thai;
        } else {
            document.getElementById('regionForm').reset();
            document.getElementById('regionId').value = '';
        }
        
        this.regionModal.show();
    }

    async saveRegion() {
        const id = document.getElementById('regionId').value;
        const data = {
            ma_vung: document.getElementById('regionMaVung').value,
            ten_vung: document.getElementById('regionTenVung').value,
            mo_ta: document.getElementById('regionMoTa').value,
            trang_thai: parseInt(document.getElementById('regionTrangThai').value)
        };

        if (!data.ma_vung || !data.ten_vung) {
            Utils.showError('Vui lòng điền đầy đủ thông tin!');
            return;
        }

        try {
            Utils.showLoading();
            const url = id ? `/api/regions/${id}` : '/api/regions';
            const method = id ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            Utils.closeLoading();

            if (result.success) {
                Utils.showSuccess(result.message || (id ? 'Cập nhật thành công!' : 'Thêm mới thành công!'));
                this.regionModal.hide();
                await this.loadRegions();
                this.renderRegionsTable();
                this.updateStats();
            } else {
                Utils.showError(result.message || 'Có lỗi xảy ra!');
            }
        } catch (error) {
            Utils.closeLoading();
            Utils.showError('Lỗi: ' + error.message);
        }
    }

    async editRegion(id) {
        const region = this.regions.find(r => r.id === id);
        if (region) {
            this.openRegionModal(region);
        }
    }

    async deleteRegion(id) {
        const result = await Swal.fire({
            title: 'Xác nhận xóa?',
            text: 'Bạn có chắc chắn muốn xóa vùng miền này?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy'
        });

        if (!result.isConfirmed) return;

        try {
            Utils.showLoading();
            const response = await fetch(`/api/regions/${id}`, { method: 'DELETE' });
            const data = await response.json();
            Utils.closeLoading();

            if (data.success) {
                Utils.showSuccess('Xóa thành công!');
                await this.loadRegions();
                this.renderRegionsTable();
                this.updateStats();
            } else {
                Utils.showError(data.message || 'Không thể xóa!');
            }
        } catch (error) {
            Utils.closeLoading();
            Utils.showError('Lỗi: ' + error.message);
        }
    }

    // ========== PROVINCE CRUD ==========
    openProvinceModal(province = null) {
        this.currentEditId = province?.id || null;
        document.getElementById('provinceModalTitle').textContent = province ? 'Sửa Tỉnh/Thành' : 'Thêm Tỉnh/Thành';
        
        if (province) {
            document.getElementById('provinceId').value = province.id;
            document.getElementById('provinceMaTinh').value = province.ma_tinh;
            document.getElementById('provinceTenTinh').value = province.ten_tinh;
            document.getElementById('provinceVungId').value = province.vung_id;
            document.getElementById('provinceThuTu').value = province.thu_tu_uu_tien || 0;
            document.getElementById('provinceTrangThai').value = province.trang_thai;
            document.getElementById('provinceIsMajorCity').checked = province.is_major_city == 1;
        } else {
            document.getElementById('provinceForm').reset();
            document.getElementById('provinceId').value = '';
        }
        
        this.provinceModal.show();
    }

    async saveProvince() {
        const id = document.getElementById('provinceId').value;
        const data = {
            ma_tinh: document.getElementById('provinceMaTinh').value,
            ten_tinh: document.getElementById('provinceTenTinh').value,
            vung_id: document.getElementById('provinceVungId').value,
            thu_tu_uu_tien: parseInt(document.getElementById('provinceThuTu').value) || 0,
            trang_thai: parseInt(document.getElementById('provinceTrangThai').value),
            is_major_city: document.getElementById('provinceIsMajorCity').checked ? 1 : 0
        };

        if (!data.ma_tinh || !data.ten_tinh || !data.vung_id) {
            Utils.showError('Vui lòng điền đầy đủ thông tin!');
            return;
        }

        try {
            Utils.showLoading();
            const url = id ? `/api/provinces/${id}` : '/api/provinces';
            const method = id ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            Utils.closeLoading();

            if (result.success) {
                Utils.showSuccess(result.message || (id ? 'Cập nhật thành công!' : 'Thêm mới thành công!'));
                this.provinceModal.hide();
                await this.loadProvinces();
                this.renderProvincesTable();
                this.updateStats();
            } else {
                Utils.showError(result.message || 'Có lỗi xảy ra!');
            }
        } catch (error) {
            Utils.closeLoading();
            Utils.showError('Lỗi: ' + error.message);
        }
    }

    async editProvince(id) {
        const province = this.provinces.find(p => p.id === id);
        if (province) {
            this.openProvinceModal(province);
        }
    }

    async deleteProvince(id) {
        const result = await Swal.fire({
            title: 'Xác nhận xóa?',
            text: 'Bạn có chắc chắn muốn xóa tỉnh/thành này?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy'
        });

        if (!result.isConfirmed) return;

        try {
            Utils.showLoading();
            const response = await fetch(`/api/provinces/${id}`, { method: 'DELETE' });
            const data = await response.json();
            Utils.closeLoading();

            if (data.success) {
                Utils.showSuccess('Xóa thành công!');
                await this.loadProvinces();
                this.renderProvincesTable();
                this.updateStats();
            } else {
                Utils.showError(data.message || 'Không thể xóa!');
            }
        } catch (error) {
            Utils.closeLoading();
            Utils.showError('Lỗi: ' + error.message);
        }
    }

    // ========== WARD CRUD ==========
    openWardModal(ward = null) {
        this.currentEditId = ward?.id || null;
        document.getElementById('wardModalTitle').textContent = ward ? 'Sửa Phường/Xã' : 'Thêm Phường/Xã';
        
        if (ward) {
            document.getElementById('wardId').value = ward.id;
            document.getElementById('wardMaPhuongXa').value = ward.ma_phuong_xa;
            document.getElementById('wardTenPhuongXa').value = ward.ten_phuong_xa;
            document.getElementById('wardTinhThanhId').value = ward.tinh_thanh_id;
            document.getElementById('wardLoai').value = ward.loai;
            document.getElementById('wardTrangThai').value = ward.trang_thai;
            document.getElementById('wardIsInnerArea').checked = ward.is_inner_area == 1;
        } else {
            document.getElementById('wardForm').reset();
            document.getElementById('wardId').value = '';
        }
        
        this.wardModal.show();
    }

    async saveWard() {
        const id = document.getElementById('wardId').value;
        const data = {
            ma_phuong_xa: document.getElementById('wardMaPhuongXa').value,
            ten_phuong_xa: document.getElementById('wardTenPhuongXa').value,
            tinh_thanh_id: document.getElementById('wardTinhThanhId').value,
            loai: document.getElementById('wardLoai').value,
            trang_thai: parseInt(document.getElementById('wardTrangThai').value),
            is_inner_area: document.getElementById('wardIsInnerArea').checked ? 1 : 0
        };

        if (!data.ma_phuong_xa || !data.ten_phuong_xa || !data.tinh_thanh_id || !data.loai) {
            Utils.showError('Vui lòng điền đầy đủ thông tin!');
            return;
        }

        try {
            Utils.showLoading();
            const url = id ? `/api/wards/${id}` : '/api/wards';
            const method = id ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            Utils.closeLoading();

            if (result.success) {
                Utils.showSuccess(result.message || (id ? 'Cập nhật thành công!' : 'Thêm mới thành công!'));
                this.wardModal.hide();
                await this.loadWards();
                this.renderWardsTable();
                this.updateStats();
            } else {
                Utils.showError(result.message || 'Có lỗi xảy ra!');
            }
        } catch (error) {
            Utils.closeLoading();
            Utils.showError('Lỗi: ' + error.message);
        }
    }

    async editWard(id) {
        const ward = this.wards.find(w => w.id === id);
        if (ward) {
            this.openWardModal(ward);
        }
    }

    async deleteWard(id) {
        const result = await Swal.fire({
            title: 'Xác nhận xóa?',
            text: 'Bạn có chắc chắn muốn xóa phường/xã này?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy'
        });

        if (!result.isConfirmed) return;

        try {
            Utils.showLoading();
            const response = await fetch(`/api/wards/${id}`, { method: 'DELETE' });
            const data = await response.json();
            Utils.closeLoading();

            if (data.success) {
                Utils.showSuccess('Xóa thành công!');
                await this.loadWards();
                this.renderWardsTable();
                this.updateStats();
            } else {
                Utils.showError(data.message || 'Không thể xóa!');
            }
        } catch (error) {
            Utils.closeLoading();
            Utils.showError('Lỗi: ' + error.message);
        }
    }
}

// Initialize when DOM is ready
let manager;
document.addEventListener('DOMContentLoaded', () => {
    manager = new AddressManager();
});
