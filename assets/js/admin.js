'use strict';

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const icon = (name) => `<svg class="icon"><use href="#i-${name}"/></svg>`;

const pageNames = {
    dashboard: 'Tổng quan',
    pos: 'Bán hàng',
    orders: 'Đơn hàng',
    invoices: 'Hóa đơn',
    products: 'Sản phẩm & Danh mục',
    inventory: 'Kho & Nhập hàng',
    customers: 'Khách hàng',
    employees: 'Nhân viên & Tài khoản',
    appointments: 'Dịch vụ & Lịch hẹn',
    reports: 'Báo cáo thống kê',
    notifications: 'Thông báo',
    account: 'Hồ sơ cá nhân',
    ai: 'Trợ lý AI',
    'store-info': 'Thông tin cửa hàng',
    settings: 'Cài đặt hệ thống',
};

const state = {
    user: null,
    categories: [],
    products: [],
    orders: [],
    invoices: [],
    invoiceSummary: null,
    suppliers: [],
    inventorySummary: null,
    importRequests: [],
    importReceipts: [],
    invTab: 'stock',
    editingSupplierId: null,
    customers: [],
    employees: [],
    services: [],
    appointments: [],
    notifications: [],
    unreadNotifications: 0,
    report: null,
    settings: {},
    aiStatus: null,
    chartDays: 7,
    aiConversationId: 0,
    editingProductId: null,
    pendingProductImageFile: null,
    productImageObjectUrl: '',
    productOriginalImage: '',
    productImageRemoved: false,
    editingServiceId: null,
    posCart: [],
    posPayMethod: 'cod',
    posVariantProduct: null,
};

function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 2900);
}

function statusHtml(status, map = ORDER_STATUS_LABEL) {
    return `<span class="status ${safe(status)}">${safe(map[status] || status)}</span>`;
}

function tableEmpty(msg = 'Chưa có dữ liệu phù hợp.') {
    return `<div class="empty">${uiIcon('pet', 'm-ico-empty')}${safe(msg)}</div>`;
}

function isAdmin() {
    return state.user?.role === 'admin';
}

function go(view) {
    if (!pageNames[view]) return;
    if (!isAdmin() && ['employees', 'store-info', 'settings'].includes(view)) {
        toast('Chức năng này chỉ dành cho Quản trị viên.');
        return;
    }
    $$('.view').forEach((e) => e.classList.toggle('active', e.id === 'view-' + view));
    $$('.nav-btn[data-view]').forEach((e) => {
        const active = e.dataset.view === view;
        e.classList.toggle('active', active);
        if (active) e.setAttribute('aria-current', 'page');
        else e.removeAttribute('aria-current');
    });
    $('#breadcrumb').textContent = pageNames[view];
    $('#sidebar').classList.remove('open');
    $('#mobileOverlay').classList.remove('show');
    window.scrollTo({ top: 0, behavior: 'instant' });
}

// ============================================================================
// AUTH GUARD & INITIAL DATA LOAD
// ============================================================================
async function verifyAccess() {
    try {
        const res = await AppAPI.get('backend/auth/me.php');
        if (!res.authenticated || !res.user || !['admin', 'nhan_vien'].includes(res.user.role)) {
            location.replace('auth.html?reason=admin_required');
            return false;
        }
        state.user = res.user;
        document.body.classList.remove('auth-checking');
        applyUserUI();
        return true;
    } catch {
        location.replace('auth.html?reason=admin_required');
        return false;
    }
}

function renderAvatarInto(el, avatarUrl, initials) {
    if (!el) return;
    if (avatarUrl) {
        el.innerHTML = `<img src="${safe(avatarUrl)}" alt="Ảnh đại diện"/>`;
    } else {
        el.textContent = initials;
    }
}

function renderAccountAvatarPreview(src, initials) {
    const box = $('#accountAvatarPreview');
    const clearBtn = $('#clearAccountAvatarBtn');
    const url = (src || '').trim();
    renderAvatarInto(box, url, initials);
    if (clearBtn) clearBtn.classList.toggle('hide', !url);
}

function getUserInitials(name) {
    return (name || 'QL')
        .split(/\s+/)
        .filter(Boolean)
        .slice(-2)
        .map((w) => w[0].toUpperCase())
        .join('');
}

function applyUserUI() {
    const u = state.user;
    const initials = getUserInitials(u.ho_ten);
    const avatarUrl = (u.anh_dai_dien || '').trim();

    renderAvatarInto($('#sideAvatar'), avatarUrl, initials);
    renderAvatarInto($('#topAvatar'), avatarUrl, initials);
    if ($('#topUserName')) $('#topUserName').textContent = u.ho_ten;
    $('#sideUserName').textContent = u.ho_ten;
    $('#sideUserRole').textContent = u.role === 'admin' ? 'Quản trị viên' : 'Nhân viên';
    $('#welcomeHeading').textContent = `Chào ngày mới, ${u.ho_ten}!`;

    $('#accountDisplayName').textContent = u.ho_ten;
    $('#accountDisplayRole').textContent = `${u.chuc_vu || (u.role === 'admin' ? 'Quản trị viên' : 'Nhân viên')} · Góc nhỏ có em`;
    $('#accountName').value = u.ho_ten || '';
    $('#accountEmail').value = u.email || '';
    $('#accountPhone').value = u.so_dien_thoai || '';
    if ($('#accountRoleDisplay')) {
        $('#accountRoleDisplay').textContent = u.role === 'admin' ? 'Quản trị viên' : 'Nhân viên';
    }

    state.pendingAccountAvatarFile = null;
    state.accountAvatarRemoved = false;
    if ($('#accountAvatarFile')) $('#accountAvatarFile').value = '';
    renderAccountAvatarPreview(avatarUrl, initials);

    // Ẩn các nút/mục chỉ dành cho admin nếu là nhân viên (và ngược lại với nút chỉ dành cho nhân viên)
    $$('.admin-only').forEach((el) => el.classList.toggle('hide', !isAdmin()));
    $$('.staff-only').forEach((el) => el.classList.toggle('hide', isAdmin()));
}

async function refreshAll() {
    try {
        const [catRes, prodRes, ordRes, invRes, supRes, stockRes, cusRes, empRes, svcRes, appRes, repRes, notRes, setRes, emRes] = await Promise.all([
            AppAPI.get('backend/categories/index.php'),
            AppAPI.get('backend/products/index.php?include_inactive=1'),
            AppAPI.get('backend/orders/index.php?scope=admin'),
            AppAPI.get('backend/invoices/index.php').catch(() => ({ invoices: [], summary: null })),
            AppAPI.get('backend/suppliers/index.php').catch(() => ({ suppliers: [] })),
            AppAPI.get('backend/inventory/index.php').catch(() => ({ summary: null, requests: [], receipts: [] })),
            AppAPI.get('backend/customers/index.php'),
            AppAPI.get('backend/employees/index.php'),
            AppAPI.get('backend/services/index.php?include_inactive=1'),
            AppAPI.get('backend/appointments/index.php?scope=admin'),
            AppAPI.get('backend/reports/index.php?days=' + state.chartDays),
            AppAPI.get('backend/notifications/index.php'),
            AppAPI.get('backend/settings/index.php'),
            AppAPI.get('backend/emails/index.php?scope=admin').catch(() => ({ emails: [] })),
        ]);

        state.categories = catRes.categories || [];
        state.products = prodRes.products || [];
        state.orders = ordRes.orders || [];
        state.invoices = invRes.invoices || [];
        state.invoiceSummary = invRes.summary || null;
        state.suppliers = supRes.suppliers || [];
        state.inventorySummary = stockRes.summary || null;
        state.importRequests = stockRes.requests || [];
        state.importReceipts = stockRes.receipts || [];
        state.customers = cusRes.customers || [];
        state.employees = empRes.employees || [];
        state.services = svcRes.services || [];
        state.appointments = appRes.appointments || [];
        state.report = repRes;
        state.notifications = notRes.notifications || [];
        state.unreadNotifications = notRes.unread || 0;
        state.settings = setRes.settings || {};
        state.smtpConfigured = Boolean(setRes.smtp_configured);
        state.smsConfigured = Boolean(setRes.sms_configured);
        state.aiStatus = setRes.ai_status || null;
        state.emails = emRes.emails || [];

        renderAll();
    } catch (err) {
        toast('Lỗi tải dữ liệu: ' + err.message);
    }
}

function renderAll() {
    renderStats();
    renderRevenueChart();
    renderDonut();
    renderInsights();
    renderPos();
    renderOrders();
    renderInvoices();
    renderInventory();
    renderProductFilters();
    renderProducts();
    renderCategoriesModalList();
    renderCustomers();
    renderEmployees();
    renderServices();
    renderAppointments();
    renderReports();
    renderNotifications();
    renderSettings();
    updateOrderProductOptions();
    updateBookingServiceOptions();
}

// ============================================================================
// DASHBOARD: KPI, SVG REVENUE CHART, DONUT, INSIGHTS
// ============================================================================
function renderStats() {
    const k = state.report?.kpi;
    if (!k) return;

    const todayLbl = k.today_label || formatDate(adminTodayYMD(0));
    $('#stats').innerHTML = [
        [
            'Doanh thu',
            compactMoney(k.revenue_today),
            'wallet',
            'pink',
            `Hôm nay (${todayLbl}) · ${k.orders_done_today || 0} đơn hoàn tất`,
            'reports',
        ],
        [
            'Tổng đơn hàng',
            Number(k.orders_today || 0).toLocaleString('vi-VN'),
            'orders',
            'orange',
            `Hôm nay · ${k.orders_pending_today || 0} đơn chờ xác nhận`,
            'orders',
        ],
        [
            'Sản phẩm đang bán',
            Number(k.products_active || 0).toLocaleString('vi-VN'),
            'shop',
            'purple',
            `Hôm nay bán: ${k.products_sold_today || 0} món · ${k.products_low_stock} sắp hết`,
            'products',
        ],
        [
            'Lịch hẹn thú cưng',
            Number(k.appointments_today || 0).toLocaleString('vi-VN'),
            'calendar',
            'green',
            `Hôm nay · ${k.appointments_pending_today || 0} lịch đang chờ`,
            'appointments',
        ],
    ]
        .map(
            ([label, num, ic, color, foot, targetView]) => `
        <button type="button" class="card stat stat-clickable" data-go="${targetView}">
            <div class="stat-top">
                <span class="stat-label">${label}</span>
                <span class="stat-icon ${color}">${uiIcon(ic, 'm-ico-md')}</span>
            </div>
            <div class="stat-number">${num}</div>
            <div class="stat-footer">${foot}</div>
        </button>`
        )
        .join('');

    $('#pendingCount').textContent = k.orders_pending;
    $('#notifyDot').classList.toggle('hide', state.unreadNotifications === 0 || state.settings.notifications === '0');
}

function renderRevenueChart() {
    const el = $('#salesChart');
    const series = state.report?.series || [];
    const total = state.report?.series_total || 0;
    $('#chartTotal').textContent = `Tổng ${state.chartDays} ngày: ${money(total)}`;

    if (!series.length) {
        el.innerHTML = tableEmpty('Chưa có dữ liệu doanh thu.');
        return;
    }

    const W = 620;
    const H = 205;
    const padL = 52;
    const padR = 18;
    const padT = 18;
    const padB = 30;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const maxVal = Math.max(100000, ...series.map((d) => Number(d.revenue)));

    const stepX = series.length > 1 ? plotW / (series.length - 1) : plotW;
    const pts = series.map((d, idx) => {
        const x = padL + idx * stepX;
        const y = padT + plotH - (Number(d.revenue) / maxVal) * plotH;
        return { x, y, ...d };
    });

    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(padT + plotH).toFixed(1)} L${pts[0].x.toFixed(1)},${(padT + plotH).toFixed(1)} Z`;

    const gridLines = [0, 0.25, 0.5, 0.75, 1]
        .map((ratio) => {
            const y = padT + plotH * (1 - ratio);
            const val = maxVal * ratio;
            return `<line class="chart-grid" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"/>
                    <text class="chart-axis" x="${padL - 8}" y="${y + 4}" text-anchor="end">${val >= 1000000 ? (val / 1000000).toFixed(1) + 'tr' : Math.round(val / 1000) + 'k'}</text>`;
        })
        .join('');

    const labelStep = series.length > 10 ? 5 : 1;
    const xLabels = pts
        .filter((_, i) => i % labelStep === 0 || i === pts.length - 1)
        .map((p) => `<text class="chart-axis" x="${p.x}" y="${H - 8}" text-anchor="middle">${safe(p.label)}</text>`)
        .join('');

    const dots = pts
        .map(
            (p) =>
                `<circle class="chart-dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${series.length > 12 ? 3 : 4.5}">
                    <title>${p.label}: ${money(p.revenue)} (${p.orders} đơn)</title>
                </circle>`
        )
        .join('');

    el.innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs>
            <linearGradient id="pinkArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#f276a3" stop-opacity="0.28"/>
                <stop offset="100%" stop-color="#f276a3" stop-opacity="0.01"/>
            </linearGradient>
        </defs>
        ${gridLines}
        <path fill="url(#pinkArea)" d="${areaPath}"/>
        <path class="chart-line" d="${linePath}"/>
        ${dots}
        ${xLabels}
    </svg>`;
}

function renderDonut() {
    const k = state.report?.kpi;
    if (!k) return;
    const total = k.orders_total || 0;
    const donePct = (k.orders_done / Math.max(1, total)) * 100;
    const shipPct = ((k.orders_done + k.orders_shipping) / Math.max(1, total)) * 100;
    const pendPct = ((k.orders_done + k.orders_shipping + k.orders_pending + k.orders_confirmed) / Math.max(1, total)) * 100;

    $('#donut').style.background = total
        ? `conic-gradient(#f582a9 0 ${donePct}%, #a792ea ${donePct}% ${shipPct}%, #ffd398 ${shipPct}% ${pendPct}%, #e5d8df ${pendPct}% 100%)`
        : '#f5edf2';

    $('#donutCount').textContent = total;
    $('#doneCount').textContent = k.orders_done;
    $('#shippingCount').textContent = k.orders_shipping;
    $('#waitingCount').textContent = k.orders_pending + k.orders_confirmed;
}

function renderInsights() {
    const parent = $('#aiInsights');
    if (state.settings.insights === '0') {
        parent.innerHTML = '<p class="panel-sub">Gợi ý AI đã được tắt trong Cài đặt.</p>';
        return;
    }
    const low = state.report?.low_stock || [];
    const pending = state.report?.kpi?.orders_pending || 0;
    const upcoming = state.report?.kpi?.appointments_upcoming || 0;

    const suggestions = [
        [
            'promo',
            low.length ? `${low.length} sản phẩm sắp hết hàng` : 'Tồn kho đang ổn định',
            low.length
                ? `${low.slice(0, 2).map((p) => `${safe(p.ten_san_pham)} (còn ${p.ton_kho})`).join(', ')} cần kiểm tra nhập thêm.`
                : 'Tất cả sản phẩm đang bán đều còn trên 10 món.',
        ],
        ['orders', 'Đơn hàng cần xác nhận', `Hiện có ${pending} đơn hàng chờ xử lý. Hãy kiểm tra và giao sớm cho khách nhé.`],
        ['spa', 'Lịch hẹn Spa sắp tới', `Có ${upcoming} lịch hẹn đang chờ chăm sóc. Chuẩn bị sẵn dụng cụ & sữa tắm dịu nhẹ.`],
    ];

    parent.innerHTML = suggestions
        .map(
            ([ic, title, desc]) => `
        <div class="insight">
            <div class="insight-icon">${uiIcon(ic, 'm-ico-md')}</div>
            <div><strong>${title}</strong><p>${desc}</p></div>
        </div>`
        )
        .join('');
}

// ============================================================================
// POS (BÁN HÀNG TẠI QUẦY)
// ============================================================================
function posUsedQty(productId) {
    const pid = Number(productId);
    return state.posCart
        .filter((i) => Number(i.ma_san_pham) === pid)
        .reduce((s, i) => s + Number(i.so_luong), 0);
}

function posCartTotal() {
    return state.posCart.reduce((s, i) => s + Number(i.gia) * Number(i.so_luong), 0);
}

function setPosError(msg = '') {
    const box = $('#posError');
    if (!box) return;
    if (msg) {
        box.textContent = msg;
        box.classList.remove('hide');
    } else {
        box.textContent = '';
        box.classList.add('hide');
    }
}

function populatePosCategoryFilter() {
    const sel = $('#posCategoryFilter');
    if (!sel) return;
    const prev = sel.value || 'all';
    sel.innerHTML =
        `<option value="all">Tất cả danh mục</option>` +
        (state.categories || [])
            .map((c) => `<option value="${safe(c.slug)}">${safe(c.ten_danh_muc)}</option>`)
            .join('');
    sel.value = prev !== 'all' && state.categories.some((c) => c.slug === prev) ? prev : 'all';
}

function findProductByCodeInput(rawInput) {
    const raw = String(rawInput || '').trim().toUpperCase();
    if (!raw) return null;
    const cleaned = raw.replace(/^#/, '').replace(/^SP/, '').trim();
    if (!/^\d+$/.test(cleaned)) return null;
    const id = Number(cleaned);
    return (state.products || []).find((p) => Number(p.ma_san_pham) === id && p.trang_thai === 'active') || null;
}

function renderPosCodePreview() {
    const box = $('#posCodePreview');
    const inp = $('#posCodeInput');
    if (!box || !inp) return;
    const val = inp.value.trim();
    if (!val) {
        box.classList.add('hide');
        box.innerHTML = '';
        return;
    }
    const p = findProductByCodeInput(val);
    if (!p) {
        box.classList.remove('hide');
        box.classList.add('not-found');
        box.innerHTML = `Không tìm thấy sản phẩm mã "${safe(val)}"`;
        return;
    }
    const remain = Math.max(0, Number(p.ton_kho) - posUsedQty(p.ma_san_pham));
    const isOut = Number(p.ton_kho) <= 0 || remain <= 0;
    const thumb = p.anh_chinh ? `<img src="${safe(p.anh_chinh)}" alt="">` : uiIcon('box');
    box.classList.remove('hide', 'not-found');
    box.classList.toggle('clickable', !isOut);
    box.innerHTML = `
        <button type="button" class="pos-code-preview-btn" ${isOut ? 'disabled' : `data-pos-add="${p.ma_san_pham}"`}>
            <div class="pos-code-preview-thumb">${thumb}</div>
            <div class="pos-code-preview-info">
                <strong>#SP${p.ma_san_pham} · ${safe(p.ten_san_pham)}</strong>
                <small>${money(p.gia)} · ${isOut ? 'Hết hàng' : `Còn ${remain} món`}</small>
            </div>
        </button>`;
}

function renderPos() {
    const grid = $('#posProductGrid');
    if (!grid) return;
    populatePosCategoryFilter();

    const kw = ($('#posSearch')?.value || '').trim().toLowerCase();
    const cat = $('#posCategoryFilter')?.value || 'all';

    const list = (state.products || [])
        .filter((p) => {
            if (p.trang_thai !== 'active') return false;
            if (cat !== 'all' && p.danh_muc_slug !== cat) return false;
            if (kw) {
                const codeStr = `#sp${p.ma_san_pham} sp${p.ma_san_pham} ${p.ma_san_pham}`;
                const hay = `${codeStr} ${p.ten_san_pham} ${p.ten_danh_muc || ''} ${p.mo_ta || ''}`.toLowerCase();
                if (!hay.includes(kw)) return false;
            }
            return true;
        })
        .sort((a, b) => {
            const aOut = Number(a.ton_kho) <= 0 ? 1 : 0;
            const bOut = Number(b.ton_kho) <= 0 ? 1 : 0;
            return aOut - bOut;
        });

    grid.innerHTML = list.length
        ? list
              .map((p) => {
                  const stock = Number(p.ton_kho);
                  const remain = Math.max(0, stock - posUsedQty(p.ma_san_pham));
                  const isOut = stock <= 0;
                  const stCls = isOut ? 'out' : remain <= 5 ? 'low' : '';
                  const stText = isOut ? 'Hết hàng' : `Còn ${remain}`;
                  const thumb = p.anh_chinh
                      ? `<img src="${safe(p.anh_chinh)}" alt="${safe(p.ten_san_pham)}" loading="lazy">`
                      : uiIcon('box', 'm-ico-lg');
                  return `
            <button type="button" class="pos-prod-card ${isOut ? 'out-of-stock' : ''}" data-pos-add="${p.ma_san_pham}" ${isOut ? 'disabled' : ''}>
                <div class="pos-prod-thumb">
                    <span class="pos-prod-code">#SP${p.ma_san_pham}</span>
                    <span class="pos-prod-stock ${stCls}">${stText}</span>
                    ${thumb}
                </div>
                <div class="pos-prod-name">${safe(p.ten_san_pham)}</div>
                <div class="pos-prod-foot">
                    <span class="pos-prod-price">${money(p.gia)}</span>
                    <span class="pos-prod-add">+</span>
                </div>
            </button>`;
              })
              .join('')
        : `<div class="empty" style="grid-column:1/-1">${uiIcon('search', 'm-ico-empty')}Không tìm thấy sản phẩm phù hợp.</div>`;

    renderPosCodePreview();
    renderPosCart();
}

function updatePosVarSubtotal() {
    const p = state.posVariantProduct;
    if (!p) return;
    const qtyEl = $('#posVarQty');
    const remain = Math.max(1, Number(p.ton_kho) - posUsedQty(p.ma_san_pham));
    const qty = Math.max(1, Math.min(remain, Number(qtyEl.value || 1)));
    qtyEl.value = String(qty);
    $('#posVarSubtotal').textContent = money(Number(p.gia) * qty);
}

function openPosVariantModal(productId) {
    const p = state.products.find((x) => Number(x.ma_san_pham) === Number(productId));
    if (!p) return;
    const remain = Number(p.ton_kho) - posUsedQty(p.ma_san_pham);
    if (remain <= 0) {
        toast(`Sản phẩm "${p.ten_san_pham}" đã đạt giới hạn tồn kho (${p.ton_kho}).`);
        return;
    }

    const groups = p.tuy_chon?.groups || [];
    if (!groups.length) {
        addPosCartItem(p, 1, '');
        return;
    }

    state.posVariantProduct = p;
    $('#posVarTitle').textContent = `#SP${p.ma_san_pham} · ${p.ten_san_pham}`;
    $('#posVarSub').textContent = `${money(p.gia)} · Còn ${remain} sản phẩm có thể thêm`;
    $('#posVarError')?.classList.add('hide');

    const noteField = p.tuy_chon?.note_field;
    const noteHtml = noteField
        ? `<div class="form-field" style="margin-top:8px">
               <label for="posVarNote">${safe(noteField.label)}</label>
               <input id="posVarNote" maxlength="80" placeholder="${safe(noteField.placeholder || '')}"/>
           </div>`
        : '';

    $('#posVarGroups').innerHTML =
        groups
            .map(
                (g) => `
        <div class="pos-var-group" data-pos-vgroup="${safe(g.key)}" data-pos-vlabel="${safe(g.label)}">
            <div class="pos-var-group-title">${safe(g.label)}</div>
            <div class="pos-var-pills">
                ${(g.choices || [])
                    .map(
                        (ch, idx) => `
                    <button type="button" class="pos-var-pill ${idx === 0 ? 'active' : ''}" data-pos-vpill="${safe(g.key)}" data-pos-vval="${safe(ch.value)}">
                        ${ch.hex ? `<span class="pos-var-dot" style="background:${safe(ch.hex)}"></span>` : ''}
                        <span>${safe(ch.label || ch.value)}</span>
                    </button>`
                    )
                    .join('')}
            </div>
        </div>`
            )
            .join('') + noteHtml;

    $('#posVarQty').max = String(remain);
    $('#posVarQty').value = '1';
    updatePosVarSubtotal();
    $('#modal-pos-variant').showModal();
}

function addPosCartItem(product, qty = 1, phanLoai = '') {
    const pid = Number(product.ma_san_pham);
    const variant = String(phanLoai || '').trim();
    const remain = Number(product.ton_kho) - posUsedQty(pid);
    if (remain < qty) {
        toast(`Chỉ còn ${Math.max(0, remain)} sản phẩm "${product.ten_san_pham}" trong kho.`);
        return false;
    }

    const existing = state.posCart.find((i) => Number(i.ma_san_pham) === pid && (i.phan_loai || '') === variant);
    if (existing) {
        existing.so_luong += qty;
    } else {
        state.posCart.push({
            ma_san_pham: pid,
            ten_san_pham: product.ten_san_pham,
            phan_loai: variant,
            gia: Number(product.gia),
            ton_kho: Number(product.ton_kho),
            anh_chinh: product.anh_chinh || '',
            bieu_tuong: product.bieu_tuong || '🐾',
            so_luong: qty,
        });
    }
    setPosError('');
    renderPos();
    return true;
}

function updatePosCashChange() {
    const total = posCartTotal();
    const raw = ($('#posCashGiven')?.value || '').trim();
    const row = $('#posChangeRow');
    const out = $('#posChangeAmount');
    if (!row || !out) return;

    if (raw === '' || total <= 0) {
        row.classList.remove('short');
        out.textContent = '0 ₫';
        return;
    }
    const given = Number(raw);
    const diff = given - total;
    if (diff < 0) {
        row.classList.add('short');
        out.textContent = `Thiếu ${money(Math.abs(diff))}`;
    } else {
        row.classList.remove('short');
        out.textContent = money(diff);
    }
}

function renderPosCart() {
    const listEl = $('#posCartList');
    if (!listEl) return;

    const totalQty = state.posCart.reduce((s, i) => s + Number(i.so_luong), 0);
    const total = posCartTotal();
    const isEmpty = state.posCart.length === 0;

    if ($('#posCartCount')) $('#posCartCount').textContent = `${totalQty} món`;
    if ($('#posSubtotal')) $('#posSubtotal').textContent = money(total);
    if ($('#posGrandTotal')) $('#posGrandTotal').textContent = money(total);
    if ($('#posQrAmount')) $('#posQrAmount').textContent = money(total);
    if ($('#posCheckoutBtn')) $('#posCheckoutBtn').disabled = isEmpty;
    if ($('#posClearBtn')) $('#posClearBtn').disabled = isEmpty;
    if ($('#posPrintInvoiceBtn')) $('#posPrintInvoiceBtn').disabled = isEmpty && !state.lastPosOrder;

    $$('#posPayTabs .pos-pay-tab').forEach((b) => {
        b.classList.toggle('active', b.dataset.posPay === state.posPayMethod);
    });
    $('#posCashBox')?.classList.toggle('hide', state.posPayMethod !== 'cod');
    $('#posQrBox')?.classList.toggle('hide', state.posPayMethod !== 'bank_transfer');
    if (state.posPayMethod === 'bank_transfer') {
        renderPosBankQr();
    }

    listEl.classList.toggle('hide', isEmpty);
    listEl.innerHTML = state.posCart
        .map(
            (it, idx) => `
            <div class="pos-cart-item">
                <div class="pos-cart-thumb">${it.anh_chinh ? `<img src="${safe(it.anh_chinh)}" alt="">` : uiIcon('box')}</div>
                <div class="pos-cart-info">
                    <strong>${safe(it.ten_san_pham)}</strong>
                    ${it.phan_loai || it.so_luong > 1 ? `<div class="pos-cart-meta">
                        ${it.phan_loai ? `<span class="pos-cart-var">${safe(it.phan_loai)}</span>` : ''}
                        ${it.so_luong > 1 ? `<span class="pos-cart-unit">${money(it.gia)} × ${it.so_luong}</span>` : ''}
                    </div>` : ''}
                </div>
                <div class="pos-cart-right">
                    <div class="pos-cart-price">${money(it.gia * it.so_luong)}</div>
                    <div class="pos-qty-ctrl">
                        <button type="button" data-pos-qty-idx="${idx}" data-delta="-1" aria-label="Giảm">−</button>
                        <span>${it.so_luong}</span>
                        <button type="button" data-pos-qty-idx="${idx}" data-delta="1" aria-label="Tăng">+</button>
                        <button type="button" class="pos-rem" data-pos-rem-idx="${idx}" aria-label="Xóa">×</button>
                    </div>
                </div>
            </div>`
        )
        .join('');

    updatePosCashChange();
}

function lookupPosCustomerByPhone() {
    const phone = ($('#posPhone')?.value || '').replace(/\D+/g, '');
    if (state.posPayMethod === 'bank_transfer') renderPosBankQr();
    if (phone.length < 9) return;
    const found = (state.customers || []).find(
        (c) => String(c.so_dien_thoai || '').replace(/\D+/g, '') === phone
    );
    if (found && $('#posCustomerName')) {
        $('#posCustomerName').value = found.ho_ten || '';
    }
}

function openPosReceiptModal(order, cashGiven = null, opts = {}) {
    const isPreview = Boolean(opts.isPreview);
    const isArchive = Boolean(opts.isArchive);
    const storeName = state.settings.store_name || 'Góc nhỏ có em';
    const storeAddress = state.settings.store_address || 'Cửa hàng thú cưng Góc nhỏ có em';
    const storeHotline = state.settings.store_hotline || '';
    const isCash = order.phuong_thuc !== 'bank_transfer';
    const isOnline = order.kenh_ban === 'online';
    const total = Number(order.tong_tien || 0);
    const shipFee = Number(order.phi_van_chuyen || 0);
    const subtotal = order.tam_tinh !== undefined && order.tam_tinh !== null ? Number(order.tam_tinh) : Math.max(0, total - shipFee);
    const effectiveGiven = cashGiven !== null && cashGiven !== undefined ? cashGiven : order.tien_khach_dua;
    const givenNum = isCash && effectiveGiven !== null && effectiveGiven !== undefined && Number(effectiveGiven) > 0 ? Number(effectiveGiven) : null;
    const changeNum = givenNum !== null ? Math.max(0, givenNum - total) : null;
    const invCode = order.ma_hoa_don_code || order.ma_don_code;
    const staffName = order.ten_nguoi_lap || state.user?.ho_ten || 'Nhân viên';
    const custName = order.ten_khach_hang || order.ten_nguoi_nhan || 'Khách lẻ';
    const timeStr = order.ngay_xuat || order.ngay_dat;
    const channelLabel = isOnline ? 'Online' : 'Tại quầy';
    const payLabel = isCash ? (isOnline ? 'Thanh toán khi nhận hàng (COD)' : 'Tiền mặt') : 'Chuyển khoản / QR';

    if ($('#posReceiptModalTitle')) {
        $('#posReceiptModalTitle').textContent = isPreview
            ? 'Xem & In hóa đơn'
            : isArchive
            ? `Hóa đơn #${invCode}`
            : 'Hóa đơn bán hàng';
    }
    if ($('#posReceiptModalSub')) {
        $('#posReceiptModalSub').textContent = isPreview
            ? 'Phiếu tạm tính từ hóa đơn hiện tại — nhấn In hóa đơn để in.'
            : isArchive
            ? `Kênh ${channelLabel} · Lưu trữ từ đơn #${order.ma_don_code || invCode}`
            : 'Thanh toán thành công & đã lưu hóa đơn.';
    }

    const rowsHtml = (order.items || [])
        .map(
            (i) => `
        <tr>
            <td>
                <strong>${safe(i.ten_san_pham)}</strong>
                ${i.phan_loai ? `<span class="pos-receipt-var">${safe(i.phan_loai)}</span>` : ''}
            </td>
            <td class="num">${money(i.don_gia)}</td>
            <td class="qty">${i.so_luong}</td>
            <td class="num"><strong>${money(Number(i.don_gia) * Number(i.so_luong))}</strong></td>
        </tr>`
        )
        .join('');

    $('#posReceiptBody').innerHTML = `
        <div class="pos-receipt-head">
            <img class="pos-receipt-logo" src="${safe(getStoreLogo())}" alt="${safe(storeName)}"/>
            <strong>${safe(storeName)}</strong>
            <small>${safe(storeAddress)}${storeHotline ? ` · Hotline: ${safe(storeHotline)}` : ''}</small>
            <div class="pos-receipt-badge">${isPreview ? 'HÓA ĐƠN TẠM TÍNH' : 'HÓA ĐƠN BÁN HÀNG'}</div>
        </div>
        <div class="pos-receipt-meta">
            <div><span>Mã hóa đơn</span><b>${isPreview ? 'Tạm tính' : `#${safe(invCode)}`}</b></div>
            <div><span>Thời gian</span><b>${formatDateTime(timeStr)}</b></div>
            <div><span>Kênh bán</span><b>${channelLabel}${!isPreview && order.ma_don_code && order.ma_don_code !== invCode ? ` · Đơn #${safe(order.ma_don_code)}` : ''}</b></div>
            <div><span>Người lập</span><b>${safe(staffName)}</b></div>
            <div><span>Khách hàng</span><b>${safe(custName)}${order.so_dien_thoai && order.so_dien_thoai !== 'Tại quầy' ? ` · ${safe(order.so_dien_thoai)}` : ''}</b></div>
            ${isOnline && order.dia_chi_nhan ? `<div><span>Địa chỉ giao</span><b>${safe(order.dia_chi_nhan)}</b></div>` : ''}
        </div>
        <table class="pos-receipt-table">
            <thead>
                <tr><th>Sản phẩm</th><th class="num">Đơn giá</th><th class="qty">SL</th><th class="num">Thành tiền</th></tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>
        <div class="pos-receipt-summary">
            <div><span>Tạm tính</span><span>${money(subtotal)}</span></div>
            ${shipFee > 0 ? `<div><span>Phí vận chuyển</span><span>${money(shipFee)}</span></div>` : ''}
            <div><span>Phương thức</span><strong>${payLabel}</strong></div>
            ${givenNum !== null ? `<div><span>Khách đưa</span><span>${money(givenNum)}</span></div><div><span>Tiền thừa</span><strong>${money(changeNum)}</strong></div>` : ''}
            ${order.ghi_chu ? `<div><span>Ghi chú</span><span>${safe(order.ghi_chu)}</span></div>` : ''}
            <div class="grand"><span>Tổng thanh toán</span><span>${money(total)}</span></div>
        </div>
        <div class="pos-receipt-foot">Cảm ơn quý khách đã ghé thăm ${safe(storeName)} · Hẹn gặp lại!</div>`;

    $('#modal-pos-receipt').showModal();
}

function openCurrentPosInvoiceForPrint() {
    if (state.posCart.length > 0) {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        const rawCash = ($('#posCashGiven')?.value || '').trim();
        const cashGiven = rawCash !== '' ? Number(rawCash) : null;
        const previewOrder = {
            ma_don_code: 'TAM-TINH',
            ngay_dat: nowStr,
            ten_nguoi_nhan: ($('#posCustomerName')?.value || '').trim() || 'Khách lẻ',
            so_dien_thoai: ($('#posPhone')?.value || '').trim(),
            phuong_thuc: state.posPayMethod,
            tien_khach_dua: state.posPayMethod === 'cod' ? cashGiven : null,
            ghi_chu: ($('#posNote')?.value || '').trim(),
            tong_tien: posCartTotal(),
            items: state.posCart.map((i) => ({
                ten_san_pham: i.ten_san_pham,
                phan_loai: i.phan_loai || '',
                don_gia: i.gia,
                so_luong: i.so_luong,
            })),
        };
        openPosReceiptModal(previewOrder, cashGiven, { isPreview: true });
        return;
    }
    if (state.lastPosOrder) {
        openPosReceiptModal(state.lastPosOrder, state.lastPosCashGiven);
        return;
    }
    toast('Chưa có sản phẩm nào trong hóa đơn để in.');
}

async function submitPosCheckout() {
    setPosError('');
    if (!state.posCart.length) {
        setPosError('Vui lòng thêm ít nhất 1 sản phẩm vào hóa đơn.');
        return;
    }
    const phone = ($('#posPhone')?.value || '').trim();
    const digits = phone.replace(/\D+/g, '');
    if (phone !== '' && digits.length < 9) {
        setPosError('Số điện thoại khách hàng cần tối thiểu 9 chữ số (hoặc để trống nếu là khách lẻ).');
        return;
    }

    const total = posCartTotal();
    const rawCash = ($('#posCashGiven')?.value || '').trim();
    const cashGiven = rawCash !== '' ? Number(rawCash) : null;
    if (state.posPayMethod === 'cod' && cashGiven !== null && cashGiven < total) {
        setPosError(`Số tiền khách đưa (${money(cashGiven)}) đang nhỏ hơn tổng thanh toán (${money(total)}).`);
        return;
    }

    const btn = $('#posCheckoutBtn');
    if (btn) btn.disabled = true;
    try {
        const res = await AppAPI.post('backend/orders/index.php', {
            from_admin: true,
            pos_sale: true,
            ten_nguoi_nhan: ($('#posCustomerName')?.value || '').trim(),
            so_dien_thoai: phone,
            phuong_thuc: state.posPayMethod,
            tien_khach_dua: state.posPayMethod === 'cod' ? cashGiven : null,
            ghi_chu: ($('#posNote')?.value || '').trim(),
            items: state.posCart.map((i) => ({
                ma_san_pham: i.ma_san_pham,
                phan_loai: i.phan_loai || '',
                so_luong: i.so_luong,
            })),
        });

        const receiptOrder = res.order;
        state.lastPosOrder = receiptOrder || null;
        state.lastPosCashGiven = cashGiven;
        state.posCart = [];
        if ($('#posPhone')) $('#posPhone').value = '';
        if ($('#posCustomerName')) $('#posCustomerName').value = '';
        if ($('#posCashGiven')) $('#posCashGiven').value = '';
        if ($('#posNote')) $('#posNote').value = '';
        lookupPosCustomerByPhone();

        toast(res.message);
        await refreshAll();
        if (receiptOrder) openPosReceiptModal(receiptOrder, cashGiven);
    } catch (err) {
        setPosError(err.message || 'Không thể hoàn tất thanh toán tại quầy.');
    } finally {
        if (btn) btn.disabled = state.posCart.length === 0;
    }
}

// ============================================================================
// INVOICES (LƯU TRỮ HÓA ĐƠN TẠI QUẦY & ONLINE)
// ============================================================================
function renderInvoices() {
    const wrap = $('#invoiceTableWrap');
    const sumGrid = $('#invoiceSummaryGrid');
    if (!wrap) return;

    const all = state.invoices || [];
    const sum = state.invoiceSummary || {
        total_count: all.length,
        total_amount: all.reduce((s, x) => s + Number(x.tong_tien || 0), 0),
        pos_count: all.filter((x) => x.kenh_ban === 'tai_quay').length,
        pos_amount: all.filter((x) => x.kenh_ban === 'tai_quay').reduce((s, x) => s + Number(x.tong_tien || 0), 0),
        online_count: all.filter((x) => x.kenh_ban !== 'tai_quay').length,
        online_amount: all.filter((x) => x.kenh_ban !== 'tai_quay').reduce((s, x) => s + Number(x.tong_tien || 0), 0),
    };

    if (sumGrid) {
        sumGrid.innerHTML = [
            ['Tổng hóa đơn đã lưu', `${sum.total_count} hóa đơn`, money(sum.total_amount), 'receipt', 'pink'],
            ['Hóa đơn tại quầy', `${sum.pos_count} hóa đơn`, money(sum.pos_amount), 'cart', 'orange'],
            ['Hóa đơn Online', `${sum.online_count} hóa đơn`, money(sum.online_amount), 'shop', 'purple'],
        ]
            .map(
                ([label, countTxt, revTxt, ico, color]) => `
            <div class="card inv-stat-card">
                <div class="inv-stat-meta">
                    <span class="inv-stat-label">${label}</span>
                    <span class="inv-stat-num">${countTxt}</span>
                    <span class="inv-stat-sub">${revTxt}</span>
                </div>
                <span class="stat-icon ${color}">${uiIcon(ico, 'm-ico-md')}</span>
            </div>`
            )
            .join('');
    }

    const q = ($('#invoiceSearch')?.value || '').trim().toLowerCase();
    const channel = $('#invoiceChannelFilter')?.value || 'all';
    const pay = $('#invoicePayFilter')?.value || 'all';
    const sort = $('#invoiceSort')?.value || 'desc';

    const list = all.filter((inv) => {
        if (channel !== 'all' && inv.kenh_ban !== channel) return false;
        if (pay !== 'all' && inv.phuong_thuc !== pay) return false;
        if (q) {
            const hay = `${inv.ma_hoa_don_code} ${inv.ma_don_code} ${inv.ten_khach_hang} ${inv.so_dien_thoai} ${inv.ten_nguoi_lap}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });

    list.sort((a, b) => {
        if (sort === 'amount_desc') return Number(b.tong_tien || 0) - Number(a.tong_tien || 0);
        const ta = parseOrderDateInfo(a.ngay_xuat).ts;
        const tb = parseOrderDateInfo(b.ngay_xuat).ts;
        return sort === 'asc' ? ta - tb : tb - ta;
    });

    if (!list.length) {
        wrap.innerHTML = tableEmpty('Không có hóa đơn phù hợp với bộ lọc hiện tại.');
        return;
    }

    const renderRow = (inv) => {
        const isPos = inv.kenh_ban === 'tai_quay';
        const channelTag = isPos
            ? '<span class="inv-channel-badge pos">Tại quầy</span>'
            : '<span class="inv-channel-badge online">Online</span>';
        const payText = inv.phuong_thuc === 'bank_transfer' ? 'Chuyển khoản / QR' : isPos ? 'Tiền mặt' : 'COD';
        const phoneSub = inv.so_dien_thoai && inv.so_dien_thoai !== 'Tại quầy' ? safe(inv.so_dien_thoai) : 'Khách tại quầy';
        const returnedNote =
            inv.trang_thai_don === 'returned' ? '<span class="inv-code-sub" style="color:#c2426c">Đã trả hàng</span>' : '';

        return `
        <tr>
            <td>
                <strong class="table-strong" style="white-space:nowrap">#${safe(inv.ma_hoa_don_code)}</strong>
                <span class="inv-code-sub" style="white-space:nowrap">Đơn #${safe(inv.ma_don_code)} · ${inv.so_mon || 0} món</span>
            </td>
            <td>${channelTag}${returnedNote}</td>
            <td>
                <strong class="table-strong">${safe(inv.ten_khach_hang)}</strong>
                <span class="inv-code-sub">${phoneSub}</span>
            </td>
            <td>${payText}</td>
            <td class="muted">${safe(inv.ten_nguoi_lap || 'Hệ thống')}</td>
            <td><strong class="table-strong" style="color:var(--pink-dark)">${money(inv.tong_tien)}</strong></td>
            <td class="muted" style="white-space:nowrap">${formatDateTime(inv.ngay_xuat)}</td>
            <td class="actions-col">
                <div class="button-group">
                    <button type="button" class="outline-btn small-btn" data-open-invoice="${inv.ma_hoa_don}">
                        ${uiIcon('printer')} Xem &amp; In
                    </button>
                </div>
            </td>
        </tr>`;
    };

    const headHtml = `
        <thead>
            <tr>
                <th>Mã hóa đơn</th>
                <th>Kênh bán</th>
                <th>Khách hàng</th>
                <th>Thanh toán</th>
                <th>Người lập</th>
                <th>Tổng tiền</th>
                <th>Ngày xuất</th>
                <th class="actions-col">Thao tác</th>
            </tr>
        </thead>`;

    if (sort === 'amount_desc') {
        wrap.innerHTML = `<table class="data-table">${headHtml}<tbody>${list.map(renderRow).join('')}</tbody></table>`;
        return;
    }

    const groups = new Map();
    const todayYmd = adminTodayYMD(0);
    const yesterdayYmd = adminTodayYMD(-1);
    for (const inv of list) {
        const info = parseOrderDateInfo(inv.ngay_xuat);
        if (!groups.has(info.ymd)) {
            let suffix = '';
            if (info.ymd === todayYmd) suffix = ' · Hôm nay';
            else if (info.ymd === yesterdayYmd) suffix = ' · Hôm qua';
            groups.set(info.ymd, { label: `Ngày ${info.dmy}${suffix}`, items: [] });
        }
        groups.get(info.ymd).items.push(inv);
    }

    let bodyHtml = '';
    for (const g of groups.values()) {
        const groupSum = g.items.reduce((s, x) => s + Number(x.tong_tien || 0), 0);
        bodyHtml += `
            <tr class="order-day-row">
                <td colspan="8">
                    <div class="order-day-head">
                        <strong>${safe(g.label)}</strong>
                        <span>${g.items.length} hóa đơn · ${money(groupSum)}</span>
                    </div>
                </td>
            </tr>
            ${g.items.map(renderRow).join('')}`;
    }

    wrap.innerHTML = `<table class="data-table">${headHtml}<tbody>${bodyHtml}</tbody></table>`;
}

// ============================================================================
// INVENTORY, IMPORT REQUESTS, RECEIPTS & SUPPLIERS (KHO & NHẬP HÀNG)
// ============================================================================
function setInvTab(tab) {
    if (!isAdmin() && (tab === 'receipts' || tab === 'suppliers')) {
        tab = 'stock';
    }
    state.invTab = tab;
    $$('#invTabs .inv-tab').forEach((b) => b.classList.toggle('active', b.dataset.invTab === tab));
    ['stock', 'requests', 'receipts', 'suppliers'].forEach((t) => {
        const pane = $('#invPane-' + t);
        if (!pane) return;
        const shouldShow = t === tab && (isAdmin() || (t !== 'receipts' && t !== 'suppliers'));
        pane.classList.toggle('hide', !shouldShow);
    });
}

function renderInventory() {
    const kpiGrid = $('#inventoryKpiGrid');
    if (!kpiGrid) return;

    const sum = state.inventorySummary || {
        total_products: state.products.length,
        total_units: state.products.reduce((s, p) => s + Number(p.ton_kho || 0), 0),
        low_stock_count: state.products.filter((p) => Number(p.ton_kho) > 0 && Number(p.ton_kho) <= 10).length,
        out_of_stock_count: state.products.filter((p) => Number(p.ton_kho) <= 0).length,
        pending_requests_count: (state.importRequests || []).filter((r) => r.trang_thai === 'pending').length,
        receipts_count: (state.importReceipts || []).length,
        total_import_value: (state.importReceipts || []).reduce((s, r) => s + Number(r.tong_tien_nhap || 0), 0),
    };

    // Badge trên sidebar & tab Yêu cầu nhập kho
    const pend = Number(sum.pending_requests_count || 0);
    const sideBadge = $('#pendingImportCount');
    if (sideBadge) {
        sideBadge.textContent = String(pend);
        sideBadge.classList.toggle('hide', pend <= 0);
    }
    const tabBadge = $('#invReqTabBadge');
    if (tabBadge) {
        tabBadge.textContent = String(pend);
        tabBadge.classList.toggle('hide', pend <= 0);
    }

    const cards = isAdmin()
        ? [
              ['Tổng tồn kho', `${sum.total_units} món`, `${sum.total_products} sản phẩm đang bán`, 'box', 'pink'],
              ['Sắp hết / Hết hàng', `${sum.low_stock_count + sum.out_of_stock_count} SP`, `${sum.out_of_stock_count} hết · ${sum.low_stock_count} sắp hết`, 'alert', 'orange'],
              ['Yêu cầu chờ duyệt', `${pend} yêu cầu`, 'Từ nhân viên gửi lên', 'send', 'purple'],
              ['Tổng chi nhập kho', compactMoney(sum.total_import_value), `${sum.receipts_count} phiếu · ${(state.suppliers || []).length} NCC`, 'wallet', 'green'],
          ]
        : [
              ['Tổng tồn kho', `${sum.total_units} món`, `${sum.total_products} sản phẩm đang bán`, 'box', 'pink'],
              ['Sắp hết hàng (≤ 10)', `${sum.low_stock_count} SP`, 'Cần gửi yêu cầu nhập sớm', 'alert', 'orange'],
              ['Đã hết hàng', `${sum.out_of_stock_count} SP`, 'Tồn kho bằng 0', 'alert', 'purple'],
              ['Yêu cầu chờ duyệt', `${pend} yêu cầu`, 'Đang chờ Quản lý xử lý', 'send', 'green'],
          ];

    kpiGrid.innerHTML = cards
        .map(
            ([label, val, sub, ico, color]) => `
        <div class="card stat">
            <div class="stat-top"><span class="stat-label">${label}</span><span class="stat-icon ${color}">${uiIcon(ico, 'm-ico-md')}</span></div>
            <div class="stat-number">${val}</div>
            <div style="font-size:11px;color:#9b899e;margin-top:4px;font-weight:650">${sub}</div>
        </div>`
        )
        .join('');

    setInvTab(state.invTab || 'stock');
    renderInventoryStock();
    renderImportRequests();
    if (isAdmin()) {
        renderImportReceipts();
        renderSuppliers();
    }
}

function renderInventoryStock() {
    const wrap = $('#invStockTableWrap');
    if (!wrap) return;
    const kw = ($('#invStockSearch')?.value || '').trim().toLowerCase();
    const filter = $('#invStockFilter')?.value || 'all';

    const list = (state.products || [])
        .filter((p) => {
            const st = Number(p.ton_kho || 0);
            if (filter === 'low' && !(st > 0 && st <= 10)) return false;
            if (filter === 'out' && st > 0) return false;
            if (kw) {
                const hay = `sp${p.ma_san_pham} #sp${p.ma_san_pham} ${p.ten_san_pham} ${p.ten_danh_muc || ''}`.toLowerCase();
                if (!hay.includes(kw)) return false;
            }
            return true;
        })
        .sort((a, b) => Number(a.ton_kho) - Number(b.ton_kho));

    if (!list.length) {
        wrap.innerHTML = tableEmpty('Không có sản phẩm nào phù hợp với bộ lọc tồn kho.');
        return;
    }

    wrap.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Mã SP</th>
                    <th>Sản phẩm</th>
                    <th>Danh mục</th>
                    <th>Giá bán</th>
                    <th>Tồn kho</th>
                    <th>Tình trạng</th>
                    <th class="actions-col">Thao tác</th>
                </tr>
            </thead>
            <tbody>
                ${list
                    .map((p) => {
                        const qty = Number(p.ton_kho || 0);
                        const badge =
                            qty <= 0
                                ? '<span class="stock-level-badge out">Hết hàng</span>'
                                : qty <= 10
                                ? '<span class="stock-level-badge low">Sắp hết hàng</span>'
                                : '<span class="stock-level-badge ok">Còn hàng</span>';
                        const actionBtn = isAdmin()
                            ? `<button type="button" class="primary-btn small-btn" data-quick-import="${p.ma_san_pham}">${uiIcon('plus')} Nhập kho</button>`
                            : `<button type="button" class="outline-btn small-btn" data-quick-request="${p.ma_san_pham}">${uiIcon('send')} Yêu cầu nhập</button>`;
                        return `
                    <tr>
                        <td><strong class="table-strong">#SP${p.ma_san_pham}</strong></td>
                        <td><strong class="table-strong">${safe(p.ten_san_pham)}</strong></td>
                        <td class="muted">${safe(p.ten_danh_muc || '—')}</td>
                        <td>${money(p.gia)}</td>
                        <td><strong class="table-strong" style="font-size:14px;color:${qty <= 10 ? '#c23962' : 'var(--ink)'}">${qty}</strong></td>
                        <td>${badge}</td>
                        <td class="actions-col"><div class="button-group">${actionBtn}</div></td>
                    </tr>`;
                    })
                    .join('')}
            </tbody>
        </table>`;
}

function renderImportRequests() {
    const wrap = $('#invReqTableWrap');
    if (!wrap) return;
    const kw = ($('#invReqSearch')?.value || '').trim().toLowerCase();
    const stFilter = $('#invReqFilter')?.value || 'all';

    const list = (state.importRequests || []).filter((r) => {
        if (stFilter !== 'all' && r.trang_thai !== stFilter) return false;
        if (kw) {
            const hay = `${r.ma_yeu_cau_code} ${r.ten_san_pham} ${r.ten_nguoi_yc} ${r.ly_do || ''}`.toLowerCase();
            if (!hay.includes(kw)) return false;
        }
        return true;
    });

    if (!list.length) {
        wrap.innerHTML = tableEmpty('Chưa có yêu cầu nhập kho nào.');
        return;
    }

    const reqStatusBadge = (st) => {
        if (st === 'approved') return statusHtml('done', { done: 'Đã nhập kho' });
        if (st === 'rejected') return statusHtml('cancelled', { cancelled: 'Từ chối' });
        return statusHtml('pending', { pending: 'Chờ duyệt' });
    };

    wrap.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Mã yêu cầu</th>
                    <th>Sản phẩm đề xuất</th>
                    <th>SL</th>
                    <th>Người yêu cầu &amp; Lý do</th>
                    <th>Trạng thái</th>
                    <th class="actions-col">Thao tác</th>
                </tr>
            </thead>
            <tbody>
                ${list
                    .map((r) => {
                        let actions = '<span class="muted">—</span>';
                        if (isAdmin() && r.trang_thai === 'pending') {
                            actions = `
                                <button type="button" class="primary-btn small-btn" data-approve-req="${r.ma_yeu_cau}">Duyệt &amp; Nhập</button>
                                <button type="button" class="outline-btn danger-btn small-btn" data-reject-req="${r.ma_yeu_cau}">Từ chối</button>`;
                        } else if (r.trang_thai === 'approved' && r.ma_phieu_code) {
                            actions = `<span class="muted" style="font-weight:750">#${safe(r.ma_phieu_code)}</span>`;
                        } else if (r.trang_thai === 'rejected' && r.ly_do_tu_choi) {
                            actions = `<span class="muted" title="${safe(r.ly_do_tu_choi)}">Đã từ chối</span>`;
                        }
                        const extraNote =
                            r.trang_thai === 'rejected' && r.ly_do_tu_choi
                                ? `<span class="inv-code-sub" style="color:#c2426c">Từ chối: ${safe(r.ly_do_tu_choi)}</span>`
                                : r.ten_nguoi_duyet
                                ? `<span class="inv-code-sub">Duyệt bởi: ${safe(r.ten_nguoi_duyet)}</span>`
                                : '';
                        return `
                    <tr>
                        <td>
                            <strong class="table-strong" style="white-space:nowrap">#${safe(r.ma_yeu_cau_code)}</strong>
                            <span class="inv-code-sub" style="white-space:nowrap">${formatDateTime(r.ngay_tao)}</span>
                        </td>
                        <td>
                            <strong class="table-strong">${safe(r.ten_san_pham)}</strong>
                            <span class="inv-code-sub">#SP${r.ma_san_pham} · Tồn hiện tại: ${r.ton_hien_tai}</span>
                        </td>
                        <td><strong class="table-strong" style="color:var(--pink-dark);white-space:nowrap">+${r.so_luong_yeu_cau}</strong></td>
                        <td>
                            <strong class="table-strong">${safe(r.ten_nguoi_yc)}</strong>
                            <span class="inv-code-sub">${safe(r.ly_do || '—')}</span>
                            ${extraNote}
                        </td>
                        <td>${reqStatusBadge(r.trang_thai)}</td>
                        <td class="actions-col"><div class="button-group">${actions}</div></td>
                    </tr>`;
                    })
                    .join('')}
            </tbody>
        </table>`;
}

function renderImportReceipts() {
    const wrap = $('#invReceiptTableWrap');
    if (!wrap) return;

    const supSel = $('#invReceiptSupplierFilter');
    if (supSel) {
        const cur = supSel.value || 'all';
        supSel.innerHTML =
            '<option value="all">Tất cả nhà cung cấp</option>' +
            (state.suppliers || []).map((s) => `<option value="${s.ma_ncc}">${safe(s.ten_ncc)}</option>`).join('');
        supSel.value = cur;
    }

    const kw = ($('#invReceiptSearch')?.value || '').trim().toLowerCase();
    const supId = supSel?.value || 'all';

    const list = (state.importReceipts || []).filter((rc) => {
        if (supId !== 'all' && String(rc.ma_ncc) !== String(supId)) return false;
        if (kw) {
            const hay = `${rc.ma_phieu_code} ${rc.ten_ncc} ${rc.ten_nguoi_nhap} ${rc.ma_yeu_cau_code || ''}`.toLowerCase();
            if (!hay.includes(kw)) return false;
        }
        return true;
    });

    if (!list.length) {
        wrap.innerHTML = tableEmpty('Chưa có phiếu nhập kho nào.');
        return;
    }

    wrap.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Mã phiếu nhập</th>
                    <th>Nhà cung cấp</th>
                    <th>Số lượng nhập</th>
                    <th>Người nhập</th>
                    <th>Tổng tiền nhập</th>
                    <th>Ngày nhập</th>
                    <th class="actions-col">Thao tác</th>
                </tr>
            </thead>
            <tbody>
                ${list
                    .map(
                        (rc) => `
                    <tr>
                        <td>
                            <strong class="table-strong" style="white-space:nowrap">#${safe(rc.ma_phieu_code)}</strong>
                            ${rc.ma_yeu_cau_code ? `<span class="inv-code-sub">Từ yêu cầu #${safe(rc.ma_yeu_cau_code)}</span>` : ''}
                        </td>
                        <td>
                            <strong class="table-strong">${safe(rc.ten_ncc)}</strong>
                            ${rc.sdt_ncc ? `<span class="inv-code-sub">${safe(rc.sdt_ncc)}</span>` : ''}
                        </td>
                        <td><strong class="table-strong">${rc.tong_so_luong || 0} món</strong> <span class="muted">(${(rc.items || []).length} mặt hàng)</span></td>
                        <td>${safe(rc.ten_nguoi_nhap)}</td>
                        <td><strong class="table-strong" style="color:var(--pink-dark)">${money(rc.tong_tien_nhap)}</strong></td>
                        <td class="muted" style="white-space:nowrap">${formatDateTime(rc.ngay_nhap)}</td>
                        <td class="actions-col">
                            <div class="button-group">
                                <button type="button" class="outline-btn small-btn" data-view-receipt="${rc.ma_phieu_nhap}">${uiIcon('printer')} Xem &amp; In</button>
                            </div>
                        </td>
                    </tr>`
                    )
                    .join('')}
            </tbody>
        </table>`;
}

function renderSuppliers() {
    const wrap = $('#invSupplierTableWrap');
    if (!wrap) return;
    const kw = ($('#invSupplierSearch')?.value || '').trim().toLowerCase();

    const list = (state.suppliers || []).filter((s) => {
        if (!kw) return true;
        const hay = `${s.ten_ncc} ${s.so_dien_thoai} ${s.nguoi_lien_he || ''} ${s.email || ''} ${s.ghi_chu || ''}`.toLowerCase();
        return hay.includes(kw);
    });

    if (!list.length) {
        wrap.innerHTML = tableEmpty('Chưa có nhà cung cấp nào. Hãy nhấn Thêm nhà cung cấp.');
        return;
    }

    wrap.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nhà cung cấp</th>
                    <th>Liên hệ</th>
                    <th>Địa chỉ</th>
                    <th>Số phiếu nhập</th>
                    <th>Tổng giá trị nhập</th>
                    <th>Trạng thái</th>
                    <th class="actions-col">Thao tác</th>
                </tr>
            </thead>
            <tbody>
                ${list
                    .map(
                        (s) => `
                    <tr>
                        <td>
                            <strong class="table-strong">${safe(s.ten_ncc)}</strong>
                            ${s.ghi_chu ? `<span class="inv-code-sub">${safe(s.ghi_chu)}</span>` : ''}
                        </td>
                        <td>
                            <div>${safe(s.so_dien_thoai)}</div>
                            <span class="inv-code-sub">${safe(s.nguoi_lien_he || s.email || '—')}</span>
                        </td>
                        <td class="muted">${safe(s.dia_chi || '—')}</td>
                        <td><strong>${s.so_phieu_nhap || 0}</strong> phiếu</td>
                        <td><strong style="color:var(--pink-dark)">${money(s.tong_gia_tri_nhap || 0)}</strong></td>
                        <td>${s.trang_thai === 'active' ? statusHtml('done', { done: 'Đang hợp tác' }) : statusHtml('cancelled', { cancelled: 'Tạm ngưng' })}</td>
                        <td class="actions-col">
                            <div class="button-group">
                                <button type="button" class="outline-btn small-btn" data-edit-supplier="${s.ma_ncc}">Sửa</button>
                            </div>
                        </td>
                    </tr>`
                    )
                    .join('')}
            </tbody>
        </table>`;
}

function openImportRequestModal(preselectProductId = null) {
    const sel = $('#req-product');
    if (!sel) return;
    sel.innerHTML = (state.products || [])
        .map((p) => `<option value="${p.ma_san_pham}">#SP${p.ma_san_pham} — ${safe(p.ten_san_pham)} (Còn ${p.ton_kho})</option>`)
        .join('');
    if (preselectProductId) sel.value = String(preselectProductId);
    const updateHint = () => {
        const p = state.products.find((x) => Number(x.ma_san_pham) === Number(sel.value));
        if ($('#req-stock-hint') && p) {
            $('#req-stock-hint').textContent = `Tồn kho hiện tại: ${p.ton_kho} món · Giá bán: ${money(p.gia)}`;
        }
    };
    sel.onchange = updateHint;
    updateHint();
    $('#req-qty').value = '10';
    $('#req-reason').value = '';
    $('#importReqError')?.classList.add('hide');
    $('#modal-import-request').showModal();
}

function buildImportReceiptRowHtml(preProductId = null, preQty = 10, preCost = null) {
    const prodOptions = (state.products || [])
        .map((p) => `<option value="${p.ma_san_pham}" ${Number(preProductId) === Number(p.ma_san_pham) ? 'selected' : ''}>#SP${p.ma_san_pham} — ${safe(p.ten_san_pham)} (Tồn ${p.ton_kho})</option>`)
        .join('');
    const picked = (state.products || []).find((p) => Number(p.ma_san_pham) === Number(preProductId)) || state.products[0];
    const defaultCost = preCost !== null ? Number(preCost) : picked ? Math.round((Number(picked.gia) * 0.7) / 1000) * 1000 : 50000;
    return `
        <div class="ir-item-row">
            <select class="ir-prod" aria-label="Sản phẩm nhập" required>${prodOptions}</select>
            <input class="ir-qty" type="number" min="1" max="10000" value="${Number(preQty) || 1}" aria-label="Số lượng nhập" placeholder="SL" required/>
            <input class="ir-cost" type="number" min="0" step="1000" value="${defaultCost}" aria-label="Giá nhập" placeholder="Giá nhập (₫)" required/>
            <button type="button" class="ir-rem-btn" aria-label="Xóa dòng">×</button>
        </div>`;
}

function updateImportReceiptTotal() {
    let total = 0;
    $$('#ir-items-list .ir-item-row').forEach((row) => {
        const q = Number(row.querySelector('.ir-qty')?.value || 0);
        const c = Number(row.querySelector('.ir-cost')?.value || 0);
        if (q > 0 && c >= 0) total += q * c;
    });
    if ($('#irTotalAmount')) $('#irTotalAmount').textContent = money(total);
}

function openImportReceiptModal(opts = {}) {
    if (!isAdmin()) {
        toast('Chỉ Quản trị viên / Chủ cửa hàng mới có quyền lập phiếu nhập kho.');
        return;
    }
    const supSel = $('#ir-supplier');
    const activeSups = (state.suppliers || []).filter((s) => s.trang_thai === 'active');
    const listSups = activeSups.length ? activeSups : state.suppliers || [];
    if (!listSups.length) {
        toast('Vui lòng thêm ít nhất 1 Nhà cung cấp trước khi lập phiếu nhập.');
        openSupplierModal(null);
        return;
    }
    supSel.innerHTML = listSups.map((s) => `<option value="${s.ma_ncc}">${safe(s.ten_ncc)} (${safe(s.so_dien_thoai)})</option>`).join('');

    $('#ir-request-id').value = opts.requestId ? String(opts.requestId) : '';
    $('#irModalTitle').textContent = opts.requestCode ? `Duyệt & Nhập kho (${opts.requestCode})` : 'Lập phiếu nhập kho';
    $('#irModalSub').textContent = opts.requestCode
        ? `Nhập kho theo yêu cầu của ${opts.requesterName || 'nhân viên'} — tồn kho sẽ tự động cộng sau khi xác nhận.`
        : 'Chọn nhà cung cấp và sản phẩm nhập — tồn kho sẽ tự động cộng sau khi lưu.';
    $('#ir-note').value = opts.note || '';
    $('#importReceiptError')?.classList.add('hide');

    const listEl = $('#ir-items-list');
    listEl.innerHTML = buildImportReceiptRowHtml(opts.productId || null, opts.qty || 10, null);
    updateImportReceiptTotal();
    $('#modal-import-receipt').showModal();
}

function openImportReceiptPrintModal(rc) {
    const storeName = state.settings.store_name || 'Góc nhỏ có em';
    const storeAddress = state.settings.store_address || 'Cửa hàng thú cưng Góc nhỏ có em';
    const storeHotline = state.settings.store_hotline || '';

    if ($('#posReceiptModalTitle')) $('#posReceiptModalTitle').textContent = `Phiếu nhập kho #${rc.ma_phieu_code}`;
    if ($('#posReceiptModalSub')) $('#posReceiptModalSub').textContent = `Nhà cung cấp: ${rc.ten_ncc}`;

    const rowsHtml = (rc.items || [])
        .map(
            (i) => `
        <tr>
            <td><strong>${safe(i.ten_san_pham)}</strong><span class="pos-receipt-var">#SP${i.ma_san_pham}</span></td>
            <td class="num">${money(i.gia_nhap)}</td>
            <td class="qty">${i.so_luong}</td>
            <td class="num"><strong>${money(Number(i.gia_nhap) * Number(i.so_luong))}</strong></td>
        </tr>`
        )
        .join('');

    $('#posReceiptBody').innerHTML = `
        <div class="pos-receipt-head">
            <img class="pos-receipt-logo" src="${safe(getStoreLogo())}" alt="${safe(storeName)}"/>
            <strong>${safe(storeName)}</strong>
            <small>${safe(storeAddress)}${storeHotline ? ` · Hotline: ${safe(storeHotline)}` : ''}</small>
            <div class="pos-receipt-badge">PHIẾU NHẬP KHO</div>
        </div>
        <div class="pos-receipt-meta">
            <div><span>Mã phiếu nhập</span><b>#${safe(rc.ma_phieu_code)}</b></div>
            <div><span>Ngày nhập</span><b>${formatDateTime(rc.ngay_nhap)}</b></div>
            <div><span>Nhà cung cấp</span><b>${safe(rc.ten_ncc)}</b></div>
            <div><span>Người lập phiếu</span><b>${safe(rc.ten_nguoi_nhap)}</b></div>
            ${rc.ma_yeu_cau_code ? `<div><span>Theo yêu cầu</span><b>#${safe(rc.ma_yeu_cau_code)}</b></div>` : ''}
        </div>
        <table class="pos-receipt-table">
            <thead>
                <tr><th>Sản phẩm</th><th class="num">Giá nhập</th><th class="qty">SL</th><th class="num">Thành tiền</th></tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>
        <div class="pos-receipt-summary">
            <div><span>Tổng số lượng</span><strong>${rc.tong_so_luong || 0} món</strong></div>
            ${rc.ghi_chu ? `<div><span>Ghi chú</span><span>${safe(rc.ghi_chu)}</span></div>` : ''}
            <div class="grand"><span>Tổng tiền nhập</span><span>${money(rc.tong_tien_nhap)}</span></div>
        </div>
        <div class="pos-receipt-foot">Chứng từ nhập kho nội bộ · ${safe(storeName)}</div>`;

    $('#modal-pos-receipt').showModal();
}

function openSupplierModal(supplierId = null) {
    if (!isAdmin()) {
        toast('Chỉ Quản trị viên / Chủ cửa hàng mới có quyền quản lý nhà cung cấp.');
        return;
    }
    const sup = supplierId ? (state.suppliers || []).find((s) => Number(s.ma_ncc) === Number(supplierId)) : null;
    state.editingSupplierId = sup ? Number(sup.ma_ncc) : null;
    $('#supModalTitle').textContent = sup ? 'Cập nhật nhà cung cấp' : 'Thêm nhà cung cấp';
    $('#sup-name').value = sup?.ten_ncc || '';
    $('#sup-phone').value = sup?.so_dien_thoai || '';
    $('#sup-contact').value = sup?.nguoi_lien_he || '';
    $('#sup-email').value = sup?.email || '';
    $('#sup-address').value = sup?.dia_chi || '';
    $('#sup-note').value = sup?.ghi_chu || '';
    $('#sup-status').value = sup?.trang_thai || 'active';
    $('#supplierError')?.classList.add('hide');
    $('#modal-supplier').showModal();
}

// ============================================================================
// ORDERS
// ============================================================================
function nextOrderStatus(st) {
    if (st === 'pending') return { next: 'shipping', label: 'Duyệt giao' };
    if (st === 'confirmed') return { next: 'shipping', label: 'Giao hàng' };
    if (st === 'shipping') return { next: 'done', label: 'Hoàn tất' };
    return null;
}

function parseOrderDateInfo(str) {
    const raw = String(str || '').trim();
    const d = new Date(raw.replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) {
        return { ts: 0, year: '', ymd: '0000-00-00', ym: '0000-00', dmy: raw || '—' };
    }
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return {
        ts: d.getTime(),
        year: yyyy,
        ymd: `${yyyy}-${mm}-${dd}`,
        ym: `${yyyy}-${mm}`,
        dmy: `${dd}/${mm}/${yyyy}`,
    };
}

function formatOrderGroupHeading(ymd, dmy) {
    const today = adminTodayYMD(0);
    const yesterday = adminTodayYMD(-1);
    if (ymd === today) return `Ngày ${dmy} · Hôm nay`;
    if (ymd === yesterday) return `Ngày ${dmy} · Hôm qua`;
    return `Ngày ${dmy}`;
}

function populateOrderTimeFilters() {
    const yearSel = $('#orderYearFilter');
    const monthSel = $('#orderMonthFilter');
    const allOrders = state.orders || [];

    let activeYear = yearSel?.value || 'all';
    if (yearSel) {
        const years = Array.from(
            new Set(allOrders.map((o) => parseOrderDateInfo(o.ngay_dat).year).filter(Boolean))
        ).sort((a, b) => b.localeCompare(a));

        yearSel.innerHTML =
            `<option value="all">Tất cả các năm</option>` +
            years.map((y) => `<option value="${y}">Năm ${y}</option>`).join('');
        activeYear = activeYear !== 'all' && years.includes(activeYear) ? activeYear : 'all';
        yearSel.value = activeYear;
    }

    if (monthSel) {
        const prevMonth = monthSel.value || 'all';
        const months = Array.from(
            new Set(
                allOrders
                    .map((o) => parseOrderDateInfo(o.ngay_dat))
                    .filter((info) => info.ym && info.ym !== '0000-00' && (activeYear === 'all' || info.year === activeYear))
                    .map((info) => info.ym)
            )
        ).sort((a, b) => b.localeCompare(a));

        monthSel.innerHTML =
            `<option value="all">Tất cả các tháng</option>` +
            months
                .map((ym) => {
                    const [y, m] = ym.split('-');
                    return `<option value="${ym}">Tháng ${m}/${y}</option>`;
                })
                .join('');
        monthSel.value = prevMonth !== 'all' && months.includes(prevMonth) ? prevMonth : 'all';
    }
}

function orderRowHtml(o, withActions = false) {
    const step = nextOrderStatus(o.trang_thai);
    return `
                <tr>
                    <td>
                        <span class="table-strong">#${safe(o.ma_don_code)}</span><br>
                        <span class="muted">${formatDateTime(o.ngay_dat)}</span>
                    </td>
                    <td>
                        <span class="cell-person">
                            <span class="person-dot">${safe((o.ten_nguoi_nhan || '?').trim().slice(0, 1).toUpperCase())}</span>
                            <span>
                                <span class="table-strong">${safe(o.ten_nguoi_nhan)}</span><br>
                                <span class="muted">${safe(o.so_dien_thoai)}</span>
                            </span>
                        </span>
                    </td>
                    <td class="order-items-col">${safe(o.tom_tat_san_pham || '—')}</td>
                    <td class="table-strong" style="white-space:nowrap">${money(o.tong_tien)}</td>
                    <td>
                        ${statusHtml(o.trang_thai)}
                        ${
                            o.phuong_thuc === 'bank_transfer' && o.trang_thai_thanh_toan !== 'paid' && o.trang_thai !== 'cancelled'
                                ? '<br><span class="muted" style="color:#c46d12;font-weight:700">Chờ thanh toán QR</span>'
                                : ''
                        }
                    </td>
                    ${
                        withActions
                            ? `<td class="actions-col">
                                <div class="button-group">
                                    ${step ? `<button class="primary-btn small-btn" data-order-status="${o.ma_don_hang}" data-next="${step.next}">${step.label}</button>` : ''}
                                    ${['pending', 'confirmed'].includes(o.trang_thai) ? `<button class="outline-btn danger-btn small-btn" data-order-status="${o.ma_don_hang}" data-next="cancelled">${o.trang_thai === 'pending' ? 'Không duyệt' : 'Hủy'}</button>` : ''}
                                    <button class="outline-btn small-btn" data-order-detail="${o.ma_don_hang}">Chi tiết</button>
                                </div>
                              </td>`
                            : ''
                    }
                </tr>`;
}

function orderTableHtml(orders, withActions = false, groupByDate = false) {
    if (!orders.length) return tableEmpty('Không tìm thấy đơn hàng nào.');
    const colSpan = withActions ? 6 : 5;
    let bodyHtml = '';

    if (groupByDate) {
        const groups = [];
        const byDay = new Map();
        orders.forEach((o) => {
            const info = parseOrderDateInfo(o.ngay_dat);
            if (!byDay.has(info.ymd)) {
                const grp = { ymd: info.ymd, dmy: info.dmy, items: [] };
                byDay.set(info.ymd, grp);
                groups.push(grp);
            }
            byDay.get(info.ymd).items.push(o);
        });
        bodyHtml = groups
            .map(
                (g) => `
                <tr class="order-date-group">
                    <td colspan="${colSpan}">
                        <div class="order-date-group-inner">
                            <span class="order-date-group-label">${uiIcon('calendar')} ${safe(formatOrderGroupHeading(g.ymd, g.dmy))}</span>
                            <span class="order-date-group-count">${g.items.length} đơn hàng</span>
                        </div>
                    </td>
                </tr>
                ${g.items.map((o) => orderRowHtml(o, withActions)).join('')}`
            )
            .join('');
    } else {
        bodyHtml = orders.map((o) => orderRowHtml(o, withActions)).join('');
    }

    return `
    <table class="data-table">
        <thead>
            <tr>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Sản phẩm</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                ${withActions ? '<th class="actions-col">Thao tác</th>' : ''}
            </tr>
        </thead>
        <tbody>
            ${bodyHtml}
        </tbody>
    </table>`;
}

function sortOrdersByDate(list, dir = 'desc') {
    const mult = dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
        const ta = parseOrderDateInfo(a.ngay_dat).ts;
        const tb = parseOrderDateInfo(b.ngay_dat).ts;
        if (ta !== tb) return (ta - tb) * mult;
        return (Number(a.ma_don_hang) - Number(b.ma_don_hang)) * mult;
    });
}

function renderOrders() {
    populateOrderTimeFilters();
    const kw = ($('#orderSearch').value || '').trim().toLowerCase();
    const statusSel = $('#orderStatusFilter');
    const filter = statusSel?.value || 'all';
    const yearFilter = $('#orderYearFilter')?.value || 'all';
    const monthFilter = $('#orderMonthFilter')?.value || 'all';
    const sortDir = $('#orderSort')?.value || 'desc';

    // Cập nhật số lượng đơn trực tiếp trong từng mục của select Lọc trạng thái
    if (statusSel) {
        const stCounts = { all: state.orders.length, pending: 0, confirmed: 0, shipping: 0, done: 0, returned: 0, cancelled: 0 };
        state.orders.forEach((o) => {
            if (stCounts[o.trang_thai] !== undefined) stCounts[o.trang_thai]++;
        });
        const stLabels = {
            all: 'Tất cả trạng thái',
            pending: 'Chờ xác nhận',
            confirmed: 'Đã xác nhận',
            shipping: 'Đang giao',
            done: 'Đã giao',
            returned: 'Trả hàng',
            cancelled: 'Đã hủy',
        };
        Array.from(statusSel.options).forEach((opt) => {
            const k = opt.value;
            if (stLabels[k]) {
                opt.textContent = `${stLabels[k]} (${stCounts[k] ?? 0})`;
            }
        });
    }

    const filtered = state.orders.filter((o) => {
        if (filter !== 'all' && o.trang_thai !== filter) return false;
        const dtInfo = parseOrderDateInfo(o.ngay_dat);
        if (yearFilter !== 'all' && dtInfo.year !== yearFilter) return false;
        if (monthFilter !== 'all' && dtInfo.ym !== monthFilter) return false;
        if (kw) {
            const hay = `${o.ma_don_code} ${o.ten_nguoi_nhan} ${o.so_dien_thoai} ${o.tom_tat_san_pham}`.toLowerCase();
            if (!hay.includes(kw)) return false;
        }
        return true;
    });

    const sorted = sortOrdersByDate(filtered, sortDir);
    $('#allOrders').innerHTML = orderTableHtml(sorted, true, true);
    $('#recentOrders').innerHTML = orderTableHtml(sortOrdersByDate(state.orders, 'desc').slice(0, 5), false, false);
}

function showOrderDetail(orderId) {
    const o = state.orders.find((x) => Number(x.ma_don_hang) === Number(orderId));
    if (!o) return;
    const itemsHtml = (o.items || [])
        .map(
            (i) =>
                `<div class="setting-row" style="padding:10px 0">
                    <span>${safe(i.ten_san_pham)}${i.phan_loai ? `<br><small style="color:#a8486e;font-weight:700">${safe(i.phan_loai)}</small>` : ''} <b>×${i.so_luong}</b></span>
                    <strong>${money(i.don_gia * i.so_luong)}</strong>
                </div>`
        )
        .join('');

    const ret = o.tra_hang;
    const returnBlock = ret
        ? `<div style="margin-top:10px;padding:12px;border-radius:12px;background:#fff6ee;border:1px solid #f7d6b8">
               <strong style="color:#b85d19;display:block;margin-bottom:6px">Thông tin trả hàng (${formatDateTime(ret.ngay_tao)})</strong>
               <div style="font-size:12px;line-height:1.65;color:#5e4e5c">
                   <div><b>Người gửi trả:</b> ${safe(ret.ho_ten)} (${safe(ret.so_dien_thoai)})</div>
                   <div><b>Địa chỉ lấy hoàn:</b> ${safe(ret.dia_chi_lay_hang)}</div>
                   ${ret.phuong_thuc_hoan_tien ? `<div><b>Nhận hoàn tiền:</b> ${safe(ret.phuong_thuc_hoan_tien)}</div>` : ''}
                   <div><b>Lí do trả hàng:</b> ${safe(ret.ly_do)}</div>
               </div>
               ${ret.hinh_anh ? `<a href="${safe(ret.hinh_anh)}" target="_blank" rel="noopener"><img src="${safe(ret.hinh_anh)}" alt="Ảnh sản phẩm trả hàng" style="margin-top:8px;width:96px;height:96px;object-fit:cover;border-radius:10px;border:1px solid #f0c9a8"></a>` : ''}
           </div>`
        : '';

    const isPosOrder =
        String(o.dia_chi_nhan || '').toLowerCase().includes('tại quầy') ||
        String(o.so_dien_thoai || '').trim().toLowerCase() === 'tại quầy';
    const custDisplay =
        o.so_dien_thoai && o.so_dien_thoai !== 'Tại quầy'
            ? `${safe(o.ten_nguoi_nhan)} (${safe(o.so_dien_thoai)})`
            : safe(o.ten_nguoi_nhan);
    const payDisplay = isPosOrder
        ? o.phuong_thuc === 'bank_transfer'
            ? 'Chuyển khoản'
            : 'Tiền mặt'
        : o.phuong_thuc === 'bank_transfer'
        ? 'Thanh toán trước qua thẻ / QR'
        : 'Thanh toán khi nhận hàng (COD)';

    $('#orderDetailContent').innerHTML = `
        <div class="setting-row"><strong>Mã đơn hàng</strong><span>#${safe(o.ma_don_code)} · ${statusHtml(o.trang_thai)}</span></div>
        <div class="setting-row"><strong>Khách hàng</strong><span>${custDisplay}</span></div>
        ${
            isPosOrder
                ? '<div class="setting-row"><strong>Kênh bán</strong><span>Mua tại quầy</span></div>'
                : `<div class="setting-row"><strong>Địa chỉ nhận</strong><span>${safe(o.dia_chi_nhan)}</span></div>
                   <div class="setting-row"><strong>Vận chuyển</strong><span>${o.phuong_thuc_van_chuyen === 'express' ? 'Giao hàng nhanh' : 'Giao hàng thường'}${Number(o.phi_van_chuyen) > 0 ? ` (${money(o.phi_van_chuyen)})` : ' (Miễn phí)'}</span></div>`
        }
        <div class="setting-row"><strong>Thanh toán</strong><span>${payDisplay}</span></div>
        ${o.ghi_chu ? `<div class="setting-row"><strong>Ghi chú</strong><span>${safe(o.ghi_chu)}</span></div>` : ''}
        <div style="margin-top:8px"><strong>Danh sách sản phẩm:</strong>${itemsHtml}</div>
        ${returnBlock}
        <div class="setting-row" style="border-top:2px solid #f4dce6">
            <strong>Tổng cộng</strong>
            <strong style="color:var(--pink-dark);font-size:17px">${money(o.tong_tien)}</strong>
        </div>`;
    $('#modal-order-detail').showModal();
}

// ============================================================================
// PRODUCTS & CATEGORIES
// ============================================================================
function renderProductFilters() {
    const current = $('#productFilters .selected')?.dataset.filter || 'all';
    $('#productFilters').innerHTML = [
        `<button class="chip ${current === 'all' ? 'selected' : ''}" data-filter="all">${uiIcon('pet')} Tất cả</button>`,
        ...state.categories.map(
            (c) => `<button class="chip ${current === c.slug ? 'selected' : ''}" data-filter="${safe(c.slug)}">${uiIcon(CAT_ICON_MAP[c.slug] || 'pet')} ${safe(c.ten_danh_muc)}</button>`
        ),
    ].join('');

    const pCat = $('#p-category');
    const prev = pCat.value;
    pCat.innerHTML = state.categories
        .map((c) => `<option value="${c.ma_danh_muc}">${safe(c.ten_danh_muc)}</option>`)
        .join('');
    if (prev) pCat.value = prev;
}

function renderProducts() {
    const kw = ($('#productSearch').value || '').trim().toLowerCase();
    const cat = $('#productFilters .selected')?.dataset.filter || 'all';
    const arr = state.products.filter((p) => {
        if (cat !== 'all' && p.danh_muc_slug !== cat) return false;
        if (kw && !(p.ten_san_pham + ' ' + (p.mo_ta || '')).toLowerCase().includes(kw)) return false;
        return true;
    });

    $('#productGrid').innerHTML = arr.length
        ? arr
              .map(
                  (p) => `
            <article class="card product-card" data-product-id="${p.ma_san_pham}">
                <div class="product-pic ${safe(p.danh_muc_slug)}">
                    ${p.trang_thai === 'inactive' ? '<span class="stock-tag inactive">Ngưng bán</span>' : ''}
                    ${p.anh_chinh ? `<img src="${safe(p.anh_chinh)}" alt="">` : uiIcon('box', 'm-ico-lg')}
                    <span class="stock-tag ${Number(p.ton_kho) <= 10 ? 'low' : ''}">Còn ${p.ton_kho}</span>
                </div>
                <div class="product-name">${safe(p.ten_san_pham)}</div>
                <div class="product-cat">${safe(p.ten_danh_muc)} · ${PET_TYPE_LABEL[p.loai_thu_cung] || ''}</div>
                <div class="product-bottom">
                    <span class="price">${money(p.gia)}</span>
                    <span class="pill-muted">#SP${p.ma_san_pham}</span>
                </div>
            </article>`
              )
              .join('')
        : tableEmpty('Không tìm thấy sản phẩm.');
}

function showProductDetail(id) {
    const p = state.products.find((x) => Number(x.ma_san_pham) === Number(id));
    if (!p) return;
    const pic = p.anh_chinh
        ? `<img src="${safe(p.anh_chinh)}" style="width:100%;height:100%;object-fit:cover">`
        : uiIcon('box', 'm-ico-lg');

    $('#productDetailContent').innerHTML = `
        <div style="display:flex;gap:16px;align-items:center">
            <div style="width:104px;height:104px;border-radius:16px;background:#fff0f5;display:grid;place-items:center;font-size:52px;overflow:hidden;flex-shrink:0">${pic}</div>
            <div>
                <h3 style="margin:0 0 6px;font-size:16px">${safe(p.ten_san_pham)}</h3>
                <b style="color:#df5889;font-size:18px">${money(p.gia)}</b>
                <p class="panel-sub">${safe(p.ten_danh_muc)} · ${PET_TYPE_LABEL[p.loai_thu_cung] || ''}</p>
            </div>
        </div>
        <p style="font-size:12px;color:#7a6c7e;background:#fff9fb;padding:10px 12px;border-radius:10px;margin:4px 0">${safe(p.mo_ta || 'Chưa có mô tả chi tiết.')}</p>
        <div class="setting-row"><strong>Mã sản phẩm</strong><span>#SP${p.ma_san_pham}</span></div>
        <div class="setting-row"><strong>Số lượng tồn kho</strong><span>${p.ton_kho} món</span></div>
        <div class="setting-row"><strong>Trạng thái</strong>${statusHtml(p.trang_thai, { active: 'Đang bán', inactive: 'Ngưng bán' })}</div>
        <div class="form-actions" style="margin-top:8px">
            <button class="outline-btn danger-btn" id="btnDeleteProd">Xóa / Ngưng bán</button>
            <button class="primary-btn" id="btnEditProd">${uiIcon('edit')} Chỉnh sửa sản phẩm</button>
        </div>`;

    $('#btnEditProd').onclick = () => {
        $('#productDetailDialog').close();
        openProductModal(p);
    };
    $('#btnDeleteProd').onclick = async () => {
        if (!confirm(`Xác nhận xóa hoặc ngưng bán sản phẩm "${p.ten_san_pham}"?`)) return;
        try {
            const res = await AppAPI.del('backend/products/index.php?id=' + p.ma_san_pham);
            $('#productDetailDialog').close();
            toast(res.message);
            await refreshAll();
        } catch (err) {
            toast(err.message);
        }
    };
    $('#productDetailDialog').showModal();
}

function setProductFormError(msg = '') {
    const box = $('#productFormError');
    if (!box) {
        if (msg) toast(msg);
        return;
    }
    box.textContent = msg;
    box.classList.toggle('hide', !msg);
}

function formatFileSizeShort(bytes) {
    const b = Number(bytes || 0);
    if (b >= 1024 * 1024) return (b / (1024 * 1024)).toFixed(2).replace(/\.00$/, '') + ' MB';
    if (b >= 1024) return Math.round(b / 1024) + ' KB';
    return b + ' B';
}

function revokeProductImagePreviewUrl() {
    if (state.productImageObjectUrl) {
        try { URL.revokeObjectURL(state.productImageObjectUrl); } catch {}
        state.productImageObjectUrl = '';
    }
}

function renderProductImagePreview(src = '', hintText = '', clearLabel = '') {
    const preview = $('#p-image-preview');
    const hint = $('#p-image-hint');
    const clearBtn = $('#p-image-clear-btn');
    if (preview) {
        preview.innerHTML = src
            ? `<img src="${safe(src)}" alt="Ảnh minh họa sản phẩm">`
            : `<span class="product-media-empty">${uiIcon('box')}<span>Chưa có ảnh</span></span>`;
    }
    if (hint) {
        hint.textContent =
            hintText || 'Hỗ trợ JPG, PNG, WEBP, GIF, AVIF, BMP (tối đa 10MB). Bấm chọn hoặc kéo thả ảnh vào khung.';
    }
    if (clearBtn) {
        clearBtn.textContent = clearLabel || 'Bỏ chọn';
        clearBtn.classList.toggle('hide', !clearLabel);
    }
}

function handleProductImageSelection(file) {
    setProductFormError('');
    if (!file) return;

    const ext = String(file.name || '').split('.').pop().toLowerCase();
    const validExts = ['jpg', 'jpeg', 'jfif', 'png', 'webp', 'gif', 'avif', 'bmp'];
    const isImageMime = String(file.type || '').toLowerCase().startsWith('image/');
    if (!isImageMime && !validExts.includes(ext)) {
        setProductFormError('Định dạng tệp chưa hợp lệ. Vui lòng chọn ảnh JPG, PNG, WEBP, GIF, AVIF hoặc BMP.');
        if ($('#p-image-file')) $('#p-image-file').value = '';
        return;
    }

    if (file.size > 25 * 1024 * 1024) {
        setProductFormError('Tệp ảnh quá lớn (vượt 25MB). Vui lòng chọn ảnh nhẹ hơn.');
        if ($('#p-image-file')) $('#p-image-file').value = '';
        return;
    }

    revokeProductImagePreviewUrl();
    state.pendingProductImageFile = file;
    state.productImageRemoved = false;
    state.productImageObjectUrl = URL.createObjectURL(file);

    const extraNote = file.size > 5 * 1024 * 1024 ? ' · Tự động tối ưu dung lượng khi lưu' : '';
    renderProductImagePreview(
        state.productImageObjectUrl,
        `Đã chọn: ${file.name} (${formatFileSizeShort(file.size)})${extraNote}`,
        'Bỏ chọn'
    );
}

async function optimizeProductImageIfNeeded(file) {
    if (!file) return null;
    const type = String(file.type || '').toLowerCase();
    const ext = String(file.name || '').split('.').pop().toLowerCase();
    const needsOptimize =
        type !== 'image/gif' &&
        (file.size > 4.5 * 1024 * 1024 || type === 'image/bmp' || type === 'image/x-ms-bmp' || ext === 'bmp');

    if (!needsOptimize) return file;

    try {
        const objUrl = URL.createObjectURL(file);
        const img = await new Promise((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error('decode_failed'));
            el.src = objUrl;
        });
        URL.revokeObjectURL(objUrl);

        const maxDim = 1600;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
            const scale = Math.min(maxDim / width, maxDim / height);
            width = Math.max(1, Math.round(width * scale));
            height = Math.max(1, Math.round(height * scale));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return file;
        ctx.drawImage(img, 0, 0, width, height);

        const targetMime = type === 'image/png' ? 'image/webp' : 'image/jpeg';
        const targetExt = targetMime === 'image/webp' ? 'webp' : 'jpg';
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, targetMime, 0.88));
        if (!blob || blob.size >= file.size) return file;

        const baseName = String(file.name || 'product').replace(/\.[^.]+$/, '');
        return new File([blob], `${baseName}.${targetExt}`, { type: targetMime });
    } catch {
        return file;
    }
}

function openProductModal(product = null) {
    state.editingProductId = product ? Number(product.ma_san_pham) : null;
    state.pendingProductImageFile = null;
    state.productImageRemoved = false;
    state.productOriginalImage = product?.anh_chinh ? String(product.anh_chinh) : '';
    revokeProductImagePreviewUrl();
    setProductFormError('');

    $('#productModalTitle').textContent = product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới';
    const form = $('#form-product');
    form.reset();
    if ($('#p-image-file')) $('#p-image-file').value = '';

    if (product) {
        $('#p-name').value = product.ten_san_pham;
        $('#p-category').value = String(product.ma_danh_muc);
        $('#p-pet-type').value = product.loai_thu_cung || 'ca_hai';
        $('#p-emoji').value = product.bieu_tuong || '🦴';
        $('#p-price').value = Math.round(Number(product.gia));
        $('#p-stock').value = Number(product.ton_kho);
        $('#p-desc').value = product.mo_ta || '';
        $('#p-status').value = product.trang_thai || 'active';
        $('#p-status-wrap').classList.remove('hide');

        if (state.productOriginalImage) {
            renderProductImagePreview(
                state.productOriginalImage,
                'Ảnh hiện tại của sản phẩm. Chọn ảnh mới để thay thế hoặc bấm Xóa ảnh.',
                'Xóa ảnh'
            );
        } else {
            renderProductImagePreview('', '', '');
        }
    } else {
        $('#p-status-wrap').classList.add('hide');
        renderProductImagePreview('', '', '');
    }
    $('#modal-product').showModal();
}

function renderCategoriesModalList() {
    const el = $('#categoryManageList');
    if (!el) return;
    el.innerHTML = state.categories
        .map(
            (c) => `
        <div class="setting-row" style="padding:10px 0">
            <div>
                <strong class="title-with-ico">${uiIcon(CAT_ICON_MAP[c.slug] || 'folder')} ${safe(c.ten_danh_muc)} <span class="muted">(${c.so_san_pham} SP)</span></strong>
                <small>${safe(c.mo_ta || c.slug)}</small>
            </div>
            ${isAdmin() ? `<button class="outline-btn danger-btn small-btn" data-del-cat="${c.ma_danh_muc}">Xóa</button>` : ''}
        </div>`
        )
        .join('');
}

// ============================================================================
// CUSTOMERS & EMPLOYEES
// ============================================================================
function renderCustomers() {
    const kw = ($('#customerSearch').value || '').trim().toLowerCase();
    const list = state.customers.filter((c) => {
        if (!kw) return true;
        return `${c.ho_ten} ${c.so_dien_thoai} ${c.email || ''} ${c.danh_sach_thu_cung || ''}`.toLowerCase().includes(kw);
    });

    $('#customerTable').innerHTML = list.length
        ? `<table class="data-table">
            <thead>
                <tr><th>Khách hàng</th><th>Liên hệ</th><th>Thú cưng</th><th>Đơn hàng</th><th>Chi tiêu</th><th>Trạng thái</th><th class="actions-col">Thao tác</th></tr>
            </thead>
            <tbody>
                ${list
                    .map(
                        (c) => `
                <tr>
                    <td>
                        <span class="cell-person">
                            <span class="person-dot">${safe((c.ho_ten || '?').slice(0, 1).toUpperCase())}</span>
                            <span class="table-strong">${safe(c.ho_ten)}</span>
                        </span>
                    </td>
                    <td>${safe(c.so_dien_thoai)}<br><span class="muted">${safe(c.email || 'Khách vãng lai')}</span></td>
                    <td>${safe(c.danh_sach_thu_cung || '—')}</td>
                    <td>${c.so_don_hang}</td>
                    <td class="table-strong" style="white-space:nowrap">${money(c.tong_chi_tieu)}</td>
                    <td>${statusHtml(c.trang_thai_tai_khoan === 'guest' ? 'active' : c.trang_thai_tai_khoan, { active: 'Hoạt động', locked: 'Đã khóa' })}</td>
                    <td class="actions-col">
                        <div class="button-group">
                            <button class="outline-btn small-btn" data-cus-edit="${c.ma_khach_hang}">${uiIcon('edit')} Sửa</button>
                            <button class="outline-btn small-btn" data-cus-detail="${c.ma_khach_hang}">Lịch sử</button>
                            ${
                                isAdmin() && c.ma_tai_khoan
                                    ? `<button class="outline-btn small-btn ${c.trang_thai_tai_khoan === 'active' ? 'danger-btn' : ''}" data-cus-lock="${c.ma_tai_khoan}" data-next-status="${c.trang_thai_tai_khoan === 'active' ? 'locked' : 'active'}">
                                        ${c.trang_thai_tai_khoan === 'active' ? 'Khóa' : 'Mở khóa'}
                                      </button>`
                                    : ''
                            }
                        </div>
                    </td>
                </tr>`
                    )
                    .join('')}
            </tbody>
           </table>`
        : tableEmpty('Không tìm thấy khách hàng.');
}

async function showCustomerDetail(id) {
    try {
        const res = await AppAPI.get('backend/customers/index.php?id=' + id);
        const c = res.customer;
        const ordersHtml = (c.don_hang || []).length
            ? c.don_hang
                  .map(
                      (o) =>
                          `<div class="setting-row" style="padding:8px 0">
                            <span>#${safe(o.ma_don_code)} · ${formatDate(o.ngay_dat)}</span>
                            <span>${money(o.tong_tien)} ${statusHtml(o.trang_thai)}</span>
                          </div>`
                  )
                  .join('')
            : '<p class="hint">Chưa có đơn hàng nào.</p>';
        const petsHtml = (c.thu_cung || []).length
            ? c.thu_cung.map((p) => `<span class="pill" style="margin:3px">${safe(p.ten_thu_cung)} (${safe(p.loai)})</span>`).join('')
            : '<span class="muted">Chưa lưu thú cưng</span>';

        $('#customerDetailContent').innerHTML = `
            <div class="setting-row"><strong>Họ tên</strong><span>${safe(c.ho_ten)}</span></div>
            <div class="setting-row"><strong>Điện thoại / Email</strong><span>${safe(c.so_dien_thoai)} · ${safe(c.email || '—')}</span></div>
            <div class="setting-row"><strong>Địa chỉ</strong><span>${safe(c.dia_chi || '—')}</span></div>
            <div class="setting-row"><strong>Thú cưng</strong><div>${petsHtml}</div></div>
            <div style="margin-top:8px"><strong>Lịch sử đơn hàng (${(c.don_hang || []).length}):</strong>${ordersHtml}</div>`;
        $('#modal-customer-detail').showModal();
    } catch (err) {
        toast(err.message);
    }
}

function renderEmployees() {
    const kw = ($('#employeeSearch')?.value || '').trim().toLowerCase();
    const list = state.employees.filter((e) => !kw || `${e.ho_ten} ${e.chuc_vu} ${e.email || ''}`.toLowerCase().includes(kw));
    $('#employeeTotal').textContent = state.employees.length;
    $('#employeeActive').textContent = state.employees.filter((e) => e.trang_thai_tai_khoan !== 'locked').length;

    $('#employeeTable').innerHTML = list.length
        ? `<table class="data-table">
            <thead><tr><th>Nhân viên</th><th>Chức vụ &amp; Quyền</th><th>Liên hệ</th><th>Trạng thái</th>${isAdmin() ? '<th class="actions-col">Thao tác</th>' : ''}</tr></thead>
            <tbody>
                ${list
                    .map((e) => {
                        const locked = e.trang_thai_tai_khoan === 'locked';
                        const isSelf = Number(e.ma_tai_khoan) === Number(state.user?.ma_tai_khoan);
                        return `
                    <tr>
                        <td>
                            <span class="cell-person">
                                <span class="person-dot">${safe((e.ho_ten || '?').trim().slice(0, 1).toUpperCase())}</span>
                                <span class="table-strong">${safe(e.ho_ten)}</span>
                            </span>
                        </td>
                        <td>${safe(e.chuc_vu)}<br><span class="muted">Quyền: ${e.ten_quyen === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</span></td>
                        <td>${safe(e.so_dien_thoai || '—')}<br><span class="muted">${safe(e.email || '—')}</span></td>
                        <td>${statusHtml(locked ? 'locked' : 'active', { active: 'Đang làm việc', locked: 'Đã khóa TK' })}</td>
                        ${
                            isAdmin()
                                ? `<td class="actions-col">
                                    ${
                                        isSelf
                                            ? '<span class="muted">Tài khoản hiện tại</span>'
                                            : `<div class="button-group">
                                                <button class="outline-btn small-btn" data-emp-role="${e.ma_nhan_vien}" data-next-role="${e.ten_quyen === 'admin' ? 'nhan_vien' : 'admin'}">
                                                    Đổi sang ${e.ten_quyen === 'admin' ? 'Nhân viên' : 'Admin'}
                                                </button>
                                                <button class="outline-btn small-btn ${locked ? '' : 'danger-btn'}" data-emp-lock="${e.ma_nhan_vien}" data-next-status="${locked ? 'active' : 'locked'}">
                                                    ${locked ? 'Mở khóa' : 'Khóa TK'}
                                                </button>
                                              </div>`
                                    }
                                  </td>`
                                : ''
                        }
                    </tr>`;
                    })
                    .join('')}
            </tbody>
           </table>`
        : tableEmpty('Chưa có nhân viên.');
}

// ============================================================================
// SERVICES & APPOINTMENTS
// ============================================================================
function renderServices() {
    $('#servicesManageTable').innerHTML = state.services.length
        ? `<table class="data-table">
            <thead><tr><th>Dịch vụ</th><th>Giá</th><th>Thời lượng</th><th>Trạng thái</th><th class="actions-col">Thao tác</th></tr></thead>
            <tbody>
                ${state.services
                    .map(
                        (s) => `
                <tr>
                    <td>
                        <div class="cell-person">
                            ${s.hinh_anh ? `<img class="svc-thumb" src="${safe(s.hinh_anh)}" alt="">` : `<span class="person-dot">${uiIcon('spa')}</span>`}
                            <div>
                                <span class="table-strong">${safe(s.ten_dich_vu)}</span><br>
                                <span class="muted">${safe(s.mo_ta || '')}</span>
                            </div>
                        </div>
                    </td>
                    <td class="table-strong" style="white-space:nowrap">${Number(s.gia) > 0 ? money(s.gia) : '<span class="muted">Không để giá</span>'}</td>
                    <td style="white-space:nowrap">${s.thoi_luong} phút</td>
                    <td>${statusHtml(s.trang_thai, { active: 'Đang mở', inactive: 'Tạm ẩn' })}</td>
                    <td class="actions-col">
                        <div class="button-group">
                            <button class="outline-btn small-btn" data-edit-svc="${s.ma_dich_vu}">${uiIcon('edit')} Sửa</button>
                        </div>
                    </td>
                </tr>`
                    )
                    .join('')}
            </tbody>
           </table>`
        : tableEmpty('Chưa có dịch vụ nào.');
}

function adminTodayYMD(offsetDays = 0) {
    const d = new Date(Date.now() + offsetDays * 86400000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function setAdminBookingError(msg = '', highlightSlots = false) {
    const box = $('#adminBookingError');
    const grid = $('#adminSlotsGrid');
    if (grid) grid.classList.toggle('needs-pick', Boolean(highlightSlots));
    if (!box) return;
    if (msg) {
        box.textContent = msg;
        box.classList.remove('hide');
    } else {
        box.textContent = '';
        box.classList.add('hide');
    }
}

async function loadAdminBookingSlots(autoFallbackTomorrow = false, keepError = false) {
    const serviceId = Number($('#a-service').value || 0);
    const dateVal = $('#a-date-only').value || adminTodayYMD(0);
    const grid = $('#adminSlotsGrid');
    const meta = $('#adminSlotMeta');
    const noteBox = $('#adminScheduleNote');
    const petName = ($('#form-appointment input[name="pet"]')?.value || '').trim();
    const phone = ($('#form-appointment input[name="phone"]')?.value || '').trim();
    $('#a-slot-value').value = '';
    if (!keepError) setAdminBookingError('', false);
    if (!serviceId) return;
    grid.innerHTML = '<div class="slot-loading">Đang kiểm tra khung giờ trống...</div>';
    try {
        const qs = new URLSearchParams({ action: 'slots', ma_dich_vu: String(serviceId), date: dateVal });
        if (petName) qs.set('ten_thu_cung', petName);
        if (phone) qs.set('so_dien_thoai', phone);
        const res = await AppAPI.get('backend/appointments/index.php?' + qs.toString());
        const slots = res.slots || [];
        const svc = res.service || {};
        if (autoFallbackTomorrow && dateVal === adminTodayYMD(0) && slots.length && slots.every((s) => s.status === 'past')) {
            const tomorrow = adminTodayYMD(1);
            $('#a-date-only').value = tomorrow;
            $('#a-date-vn').value = ymdToDMY(tomorrow);
            await loadAdminBookingSlots(false, keepError);
            return;
        }
        meta.textContent = `(${svc.thoi_luong || 45} phút · tối đa ${svc.max_per_slot || 4} lượt/khung)`;
        if (noteBox) {
            if (svc.schedule_hint) {
                noteBox.textContent = svc.schedule_hint;
                noteBox.classList.remove('hide');
            } else {
                noteBox.classList.add('hide');
            }
        }
        grid.innerHTML = slots
            .map((s) => {
                const disabled = s.status !== 'available' ? 'disabled' : '';
                const badge =
                    s.status === 'available'
                        ? `Còn trống (${s.remaining}/${s.max})`
                        : s.status === 'conflict'
                        ? 'Trùng lịch của bé'
                        : s.status === 'full'
                        ? `Không còn trống (${s.booked}/${s.max})`
                        : 'Đã qua giờ';
                const titleAttr = s.conflict_reason ? `title="${safe(s.conflict_reason)}"` : '';
                return `<button type="button" class="slot-btn ${safe(s.status)}" data-admin-slot="${safe(s.datetime)}" ${titleAttr} ${disabled}><strong>${safe(s.label)}</strong><span class="slot-badge">${badge}</span></button>`;
            })
            .join('');
    } catch (err) {
        grid.innerHTML = `<div class="slot-loading">${safe(err.message)}</div>`;
    }
}

function updateBookingServiceOptions() {
    const sel = $('#a-service');
    if (!sel) return;
    sel.innerHTML = state.services
        .filter((s) => s.trang_thai === 'active')
        .map((s) => `<option value="${s.ma_dich_vu}">${safe(s.ten_dich_vu)}${Number(s.gia) > 0 ? ' — ' + money(s.gia) : ''}</option>`)
        .join('');
}

function renderAppointments() {
    const card = (a, actions = false) => `
        <div class="appointment">
            <span class="appointment-emoji">${uiIcon('pet', 'm-ico-md')}</span>
            <div class="appointment-info">
                <strong>${safe(a.ten_thu_cung)} · ${safe(a.ten_dich_vu)} ${statusHtml(a.trang_thai, APPT_STATUS_LABEL)}</strong>
                <small>Chủ nuôi: ${safe(a.ten_chu_nuoi)} (${safe(a.so_dien_thoai)}) · ${formatDateTime(a.ngay_gio)}${a.ghi_chu ? ' · ' + safe(a.ghi_chu) : ''}</small>
            </div>
            ${
                actions
                    ? `<div class="button-group">
                        ${a.trang_thai === 'pending' ? `<button class="primary-btn small-btn" data-app-status="${a.ma_lich_hen}" data-next="confirmed">Xác nhận</button>` : ''}
                        ${a.trang_thai === 'confirmed' ? `<button class="primary-btn small-btn" data-app-status="${a.ma_lich_hen}" data-next="done">Hoàn thành</button>` : ''}
                        ${['pending', 'confirmed'].includes(a.trang_thai) ? `<button class="outline-btn danger-btn small-btn" data-app-status="${a.ma_lich_hen}" data-next="cancelled">Hủy</button>` : ''}
                      </div>`
                    : `<span class="appointment-time">${formatDateTime(a.ngay_gio)}</span>`
            }
        </div>`;

    $('#dashboardAppointments').innerHTML = state.appointments.slice(0, 3).map((a) => card(a, false)).join('') || tableEmpty('Chưa có lịch hẹn.');
    $('#appointmentList').innerHTML = state.appointments.map((a) => card(a, true)).join('') || tableEmpty('Chưa có lịch hẹn. Hãy đặt lịch mới.');
    $('#appointmentTotal').textContent = state.appointments.length;
    $('#appointmentUpcoming').textContent = state.report?.kpi?.appointments_upcoming ?? 0;
}

// ============================================================================
// REPORTS, NOTIFICATIONS, SETTINGS
// ============================================================================
function renderReports() {
    const r = state.report;
    if (!r) return;
    const k = r.kpi;
    $('#reportStats').innerHTML = [
        ['Doanh thu hoàn thành', money(k.revenue_done), 'wallet', 'pink'],
        ['Tổng đơn hàng', k.orders_total, 'orders', 'orange'],
        ['Tổng khách hàng', k.customers_total, 'account', 'purple'],
        ['Lịch dịch vụ Spa', k.appointments_total, 'calendar', 'green'],
    ]
        .map(
            ([l, v, ic, c]) => `
        <div class="card stat">
            <div class="stat-top"><span class="stat-label">${l}</span><span class="stat-icon ${c}">${uiIcon(ic, 'm-ico-md')}</span></div>
            <div class="stat-number">${v}</div>
        </div>`
        )
        .join('');

    const top = r.top_products || [];
    const maxSold = Math.max(1, ...top.map((p) => Number(p.da_ban)));
    $('#reportBars').innerHTML = top.length
        ? top
              .map(
                  (p) => `
            <div class="report-bar-row" style="grid-template-columns:160px 1fr 90px">
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${safe(p.ten_san_pham)}">${safe(p.ten_san_pham)}</span>
                <div class="report-track"><div class="report-fill" style="width:${Math.max(5, (Number(p.da_ban) / maxSold) * 100)}%"></div></div>
                <b>${p.da_ban} đã bán</b>
            </div>`
              )
              .join('')
        : tableEmpty('Chưa có dữ liệu bán hàng.');

    const cats = r.category_stats || [];
    const totalProds = Math.max(1, cats.reduce((s, c) => s + Number(c.so_san_pham), 0));
    $('#categoryReport').innerHTML = cats
        .map((c) => {
            const pct = Math.round((Number(c.so_san_pham) / totalProds) * 100);
            return `<div class="report-category"><span class="title-with-ico" style="min-width:120px">${uiIcon(CAT_ICON_MAP[c.slug] || 'box')} ${safe(c.ten_danh_muc)}</span><div class="track"><i style="width:${pct}%"></i></div><b>${c.so_san_pham} SP (${pct}%)</b></div>`;
        })
        .join('');

    $('#reportOrders').innerHTML = orderTableHtml(state.orders.slice(0, 10), false);
}

function normalizeNotificationType(loai) {
    return ['order', 'appointment', 'stock', 'customer', 'system'].includes(loai) ? loai : 'system';
}

function renderNotifications() {
    const icoMap = { order: 'orders', stock: 'fail', appointment: 'calendar', customer: 'account', system: 'bell' };
    const labelMap = {
        order: 'Đơn hàng',
        appointment: 'Lịch hẹn',
        stock: 'Tồn kho',
        customer: 'Khách hàng',
        system: 'Hệ thống',
    };
    const all = state.notifications || [];
    const counts = { all: all.length, order: 0, appointment: 0, stock: 0, customer: 0, system: 0, unread: 0 };
    all.forEach((n) => {
        const t = normalizeNotificationType(n.loai);
        counts[t]++;
        if (Number(n.da_doc) === 0) counts.unread++;
    });

    if ($('#notifCountAll')) $('#notifCountAll').textContent = counts.all;
    if ($('#notifCountOrder')) $('#notifCountOrder').textContent = counts.order;
    if ($('#notifCountAppt')) $('#notifCountAppt').textContent = counts.appointment;
    if ($('#notifCountStock')) $('#notifCountStock').textContent = counts.stock;
    if ($('#notifCountCustomer')) $('#notifCountCustomer').textContent = counts.customer;
    if ($('#notifCountSystem')) $('#notifCountSystem').textContent = counts.system;
    if ($('#notifCountUnread')) $('#notifCountUnread').textContent = counts.unread;

    const activeFilter = $('#notificationFilters .selected')?.dataset.filter || 'all';
    const filtered = all.filter((n) => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'unread') return Number(n.da_doc) === 0;
        return normalizeNotificationType(n.loai) === activeFilter;
    });

    const emptyLabel =
        activeFilter === 'all'
            ? 'Chưa có thông báo nào.'
            : activeFilter === 'unread'
            ? 'Không có thông báo chưa đọc.'
            : `Chưa có thông báo nào thuộc mục ${labelMap[activeFilter] || activeFilter}.`;

    $('#notificationList').innerHTML = filtered.length
        ? filtered
              .map((n) => {
                  const t = normalizeNotificationType(n.loai);
                  return `
            <div class="notice-row ${Number(n.da_doc) === 0 ? 'unread' : ''}">
                <span class="notice-icon ${t}">${uiIcon(icoMap[t] || 'bell', 'm-ico-md')}</span>
                <div style="flex:1;min-width:0">
                    <div class="notice-head">
                        <span class="notice-type-tag ${t}">${labelMap[t]}</span>
                        <strong>${safe(n.tieu_de)}</strong>
                        ${Number(n.da_doc) === 0 ? '<span class="pill">Mới</span>' : ''}
                    </div>
                    <p>${safe(n.noi_dung)}</p>
                    <p>${formatDateTime(n.thoi_gian)}</p>
                </div>
            </div>`;
              })
              .join('')
        : tableEmpty(emptyLabel);

    const emailBox = $('#adminEmailLog');
    if (emailBox) {
        const ems = state.emails || [];
        emailBox.innerHTML = ems.length
            ? `<table class="data-table">
                <thead>
                    <tr><th>Thời gian</th><th>Email nhận</th><th>Tiêu đề</th><th>Trạng thái gửi</th><th class="actions-col">Thao tác</th></tr>
                </thead>
                <tbody>
                    ${ems
                        .map((e) => {
                            const stBadge =
                                e.trang_thai_gui === 'sent_smtp'
                                    ? statusHtml('done', { done: 'Đã gửi SMTP' })
                                    : e.trang_thai_gui === 'failed'
                                    ? statusHtml('cancelled', { cancelled: 'Lỗi SMTP' })
                                    : statusHtml('confirmed', { confirmed: 'Đã lưu Hộp thư' });
                            return `
                    <tr>
                        <td class="muted" style="white-space:nowrap">${formatDateTime(e.ngay_gui)}</td>
                        <td class="table-strong">${safe(e.email_nhan)}</td>
                        <td>${safe(e.tieu_de)}${e.ghi_chu_gui ? `<br><span class="muted">${safe(e.ghi_chu_gui)}</span>` : ''}</td>
                        <td>${stBadge}</td>
                        <td class="actions-col"><div class="button-group"><button type="button" class="outline-btn small-btn" data-preview-email="${e.ma_email}">Xem thư</button></div></td>
                    </tr>`;
                        })
                        .join('')}
                </tbody>
               </table>`
            : tableEmpty('Chưa có email nào được gửi. Khi nhân viên duyệt hoặc không duyệt đơn hàng, email sẽ tự động lưu tại đây.');
    }
}

const DEFAULT_POS_QR_SVG = `<svg viewBox="0 0 120 120" width="90" height="90" role="img" aria-label="QR thanh toán"><rect width="120" height="120" rx="8" fill="#ffffff"/><rect x="8" y="8" width="28" height="28" rx="4" fill="none" stroke="#423444" stroke-width="4"/><rect x="15" y="15" width="14" height="14" rx="2" fill="#df5889"/><rect x="84" y="8" width="28" height="28" rx="4" fill="none" stroke="#423444" stroke-width="4"/><rect x="91" y="15" width="14" height="14" rx="2" fill="#df5889"/><rect x="8" y="84" width="28" height="28" rx="4" fill="none" stroke="#423444" stroke-width="4"/><rect x="15" y="91" width="14" height="14" rx="2" fill="#df5889"/><g fill="#423444"><rect x="44" y="10" width="6" height="6"/><rect x="56" y="10" width="6" height="12"/><rect x="68" y="10" width="6" height="6"/><rect x="44" y="22" width="12" height="6"/><rect x="68" y="22" width="6" height="12"/><rect x="10" y="44" width="12" height="6"/><rect x="28" y="44" width="6" height="12"/><rect x="44" y="44" width="12" height="6"/><rect x="68" y="44" width="12" height="6"/><rect x="86" y="44" width="6" height="12"/><rect x="98" y="44" width="12" height="6"/><rect x="10" y="56" width="6" height="12"/><rect x="22" y="62" width="12" height="6"/><rect x="44" y="56" width="6" height="12"/><rect x="56" y="56" width="12" height="12" fill="#df5889"/><rect x="74" y="56" width="6" height="12"/><rect x="98" y="56" width="12" height="6"/><rect x="10" y="72" width="12" height="6"/><rect x="34" y="72" width="16" height="6"/><rect x="62" y="74" width="12" height="6"/><rect x="80" y="72" width="12" height="6"/><rect x="98" y="68" width="12" height="12"/><rect x="44" y="86" width="6" height="12"/><rect x="56" y="86" width="12" height="6"/><rect x="74" y="86" width="12" height="6"/><rect x="92" y="86" width="18" height="6"/><rect x="56" y="98" width="6" height="12"/><rect x="68" y="98" width="12" height="12"/><rect x="86" y="98" width="6" height="6"/><rect x="98" y="98" width="12" height="12"/></g></svg>`;

const DEFAULT_STORE_LOGO = 'assets/images/logo.png';

function getStoreLogo() {
    const custom = (state.settings?.store_logo || '').trim();
    return custom || DEFAULT_STORE_LOGO;
}

function renderStoreLogoPreview(src, isCustom = false) {
    const box = $('#storeLogoPreview');
    const resetBtn = $('#resetStoreLogoBtn');
    const resolved = (src || '').trim() || DEFAULT_STORE_LOGO;
    if (box) {
        box.innerHTML = `<img src="${safe(resolved)}" alt="Logo cửa hàng"/>`;
    }
    if (resetBtn) {
        resetBtn.classList.toggle('hide', !isCustom);
    }
}

function applyStoreBranding() {
    const logo = getStoreLogo();
    $$('.brand-logo-img').forEach((img) => {
        img.src = logo;
    });
    const fav = $('link[rel="icon"]');
    if (fav) fav.href = logo;
}

function renderStoreQrPreview(src) {
    const box = $('#storeQrPreview');
    const clearBtn = $('#clearStoreQrBtn');
    if (!box) return;
    if (src) {
        box.dataset.qrUrl = '';
        box.innerHTML = `<img src="${safe(src)}" alt="Mã QR chuyển khoản cửa hàng"/>`;
        clearBtn?.classList.remove('hide');
        return;
    }
    clearBtn?.classList.add('hide');
    // Nếu chưa tải ảnh tĩnh, tự động xem trước mã VietQR động từ thông tin ngân hàng đang nhập
    const bName = ($('#setBankName')?.value || state.settings?.bank_name || '').trim();
    const bNo = ($('#setBankAccountNo')?.value || state.settings?.bank_account_no || '').trim();
    const bOwner = ($('#setBankAccountName')?.value || state.settings?.bank_account_name || '').trim();
    const bNote = ($('#setBankTransferNote')?.value || state.settings?.bank_transfer_note || '').trim();
    const ok = renderDynamicQrInto(box, {
        bankName: bName,
        accountNo: bNo,
        accountName: bOwner,
        addInfo: bNote,
        fallbackSvg: '<span class="store-qr-empty">Chưa có ảnh QR</span>',
    });
    if (!ok) {
        box.innerHTML = '<span class="store-qr-empty">Chưa có ảnh QR</span>';
    }
}

function renderPosBankQr() {
    const s = state.settings || {};
    const bankName = (s.bank_name || '').trim() || 'Vietcombank (VCB)';
    const bankNo = (s.bank_account_no || '').trim() || '1028 6688 9999';
    const bankOwner = (s.bank_account_name || '').trim() || 'GOC NHO CO EM';
    const memo = (s.bank_transfer_note || '').trim();
    const total = posCartTotal();
    const qrImg = (s.bank_qr_image || '').trim();

    if ($('#posQrBankName')) $('#posQrBankName').textContent = bankName;
    if ($('#posQrBankNo')) $('#posQrBankNo').textContent = bankNo;
    if ($('#posQrBankOwner')) $('#posQrBankOwner').textContent = bankOwner;
    if ($('#posQrBankNoteRow')) $('#posQrBankNoteRow').classList.toggle('hide', !memo);
    if ($('#posQrBankNote')) $('#posQrBankNote').textContent = memo;
    renderDynamicQrInto($('#posQrVisual'), {
        bankName,
        accountNo: bankNo,
        accountName: bankOwner,
        amount: total,
        addInfo: memo,
        fallbackImg: qrImg,
        fallbackSvg: DEFAULT_POS_QR_SVG,
    });
}

function renderSettings() {
    $('#settingNotifications').checked = state.settings.notifications !== '0';
    $('#settingInsights').checked = state.settings.insights !== '0';
    $('#setStoreName').value = state.settings.store_name || 'Góc nhỏ có em';
    $('#setStoreHotline').value = state.settings.store_hotline || '';
    $('#setStoreAddress').value = state.settings.store_address || '';
    if ($('#setStoreSlogan')) $('#setStoreSlogan').value = state.settings.store_slogan || '';

    if ($('#setBankName')) $('#setBankName').value = state.settings.bank_name || '';
    if ($('#setBankAccountNo')) $('#setBankAccountNo').value = state.settings.bank_account_no || '';
    if ($('#setBankAccountName')) $('#setBankAccountName').value = state.settings.bank_account_name || '';
    if ($('#setBankTransferNote')) $('#setBankTransferNote').value = state.settings.bank_transfer_note || '';
    state.pendingStoreLogoFile = null;
    state.storeLogoReset = false;
    if ($('#setStoreLogoFile')) $('#setStoreLogoFile').value = '';
    const savedLogo = getStoreLogo();
    renderStoreLogoPreview(savedLogo, savedLogo !== DEFAULT_STORE_LOGO);
    applyStoreBranding();
    state.pendingBankQrFile = null;
    state.bankQrRemoved = false;
    if ($('#setBankQrFile')) $('#setBankQrFile').value = '';
    renderStoreQrPreview(state.settings.bank_qr_image || '');
    renderPosBankQr();

    if ($('#settingRegOtpEnabled')) $('#settingRegOtpEnabled').checked = state.settings.reg_otp_enabled !== '0';
    const smsProv = state.settings.sms_provider || 'demo';
    if ($('#setSmsProvider')) $('#setSmsProvider').value = smsProv;
    if ($('#setSmsBrandname')) $('#setSmsBrandname').value = state.settings.sms_brandname || '';
    if ($('#setSmsGatewayUrl')) $('#setSmsGatewayUrl').value = state.settings.sms_gateway_url || '';
    if ($('#setSmsApiKey')) $('#setSmsApiKey').value = '';
    if ($('#setSmsSecretKey')) $('#setSmsSecretKey').value = '';
    const updateSmsFormVisibility = (p) => {
        $('#smsGateGuide')?.classList.toggle('hide', p !== 'smsgate');
        $('#smsGatewayUrlField')?.classList.toggle('hide', p !== 'smsgate');
        $('#smsApiKeyFields')?.classList.toggle('hide', p === 'demo');
        $('#smsSecretField')?.classList.toggle('hide', !['esms', 'smsgate'].includes(p));
        if ($('#smsApiKeyLabel')) {
            $('#smsApiKeyLabel').textContent = p === 'smsgate' ? 'Username (SMSGate)' : 'SMS API Key / Access Token';
        }
        if ($('#smsSecretKeyLabel')) {
            $('#smsSecretKeyLabel').textContent = p === 'smsgate' ? 'Password (SMSGate)' : 'Secret Key (dành cho eSMS)';
        }
    };
    updateSmsFormVisibility(smsProv);
    const smsBadge = $('#smsStatusBadge');
    if (smsBadge) {
        if (smsProv !== 'demo' && state.smsConfigured) {
            const provName = smsProv === 'smsgate' ? 'Android SMSGate' : smsProv.toUpperCase();
            smsBadge.textContent = `✓ Đã kết nối ${provName} · Gửi SMS thật`;
            smsBadge.style.background = '#e7f8f1';
            smsBadge.style.color = '#219775';
        } else if (smsProv !== 'demo') {
            smsBadge.textContent = 'Chưa nhập đủ thông tin kết nối (tạm dùng SMS mô phỏng)';
            smsBadge.style.background = '#fff3df';
            smsBadge.style.color = '#b86a18';
        } else {
            smsBadge.textContent = 'Chế độ Demo đồ án (SMS mô phỏng)';
            smsBadge.style.background = '#fff0f6';
            smsBadge.style.color = '#b84b73';
        }
    }

    if ($('#setSmtpHost')) $('#setSmtpHost').value = state.settings.smtp_host || 'smtp.gmail.com';
    if ($('#setSmtpPort')) $('#setSmtpPort').value = state.settings.smtp_port || '587';
    if ($('#setSmtpSecure')) $('#setSmtpSecure').value = state.settings.smtp_secure || 'tls';
    if ($('#setSmtpFromName')) $('#setSmtpFromName').value = state.settings.smtp_from_name || 'Góc nhỏ có em Pet Shop';
    if ($('#setSmtpUser')) $('#setSmtpUser').value = state.settings.smtp_user || '';
    if ($('#setSmtpPass')) $('#setSmtpPass').value = '';

    const smtpBadge = $('#smtpStatusBadge');
    if (smtpBadge) {
        if (state.smtpConfigured) {
            smtpBadge.textContent = '✓ Đã kết nối SMTP · Gửi email thực tế';
            smtpBadge.style.background = '#e7f8f1';
            smtpBadge.style.color = '#219775';
        } else {
            smtpBadge.textContent = 'Chế độ Hộp thư nội bộ (chưa nhập mật khẩu SMTP)';
            smtpBadge.style.background = '#fff0f6';
            smtpBadge.style.color = '#b84b73';
        }
    }

    const aiBadge = $('#aiProviderBadge');
    if (state.aiStatus?.external_connected) {
        aiBadge.textContent = `✦ Đang kết nối ${state.aiStatus.provider.toUpperCase()} API`;
        aiBadge.style.background = '#e7f8f1';
        aiBadge.style.color = '#219775';
    } else {
        aiBadge.textContent = '✦ Trợ lý dữ liệu MySQL (sẵn sàng gắn Gemini/OpenAI Key)';
    }
}

function updateOrderProductOptions() {
    const sel = $('#o-product');
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = state.products
        .filter((p) => p.trang_thai === 'active' && Number(p.ton_kho) > 0)
        .map((p) => `<option value="${p.ma_san_pham}">${safe(p.ten_san_pham)} — ${money(p.gia)} (còn ${p.ton_kho})</option>`)
        .join('');
    if (prev) sel.value = prev;
    updateOrderTotalHint();
}

function updateOrderTotalHint() {
    const p = state.products.find((x) => Number(x.ma_san_pham) === Number($('#o-product').value));
    const q = Math.max(1, Number($('#o-quantity').value || 1));
    $('#orderTotalHint').textContent = p ? `Tạm tính: ${money(Number(p.gia) * q)} · Tồn kho: ${p.ton_kho} món` : 'Không có sản phẩm còn hàng.';
}

// ============================================================================
// PAWLY AI ADMIN ASSISTANT
// ============================================================================
function addBubble(content, kind) {
    const div = document.createElement('div');
    div.className = 'bubble ' + kind;
    div.innerHTML = kind === 'bot' ? renderMarkdownLite(content) : safe(content);
    $('#chatBody').appendChild(div);
    $('#chatBody').scrollTop = $('#chatBody').scrollHeight;
    return div;
}

async function askAdminAI(question) {
    const q = String(question || '').trim();
    if (!q) return;
    addBubble(q, 'me');
    $('#chatInput').value = '';
    const typing = addBubble('Đang truy vấn số liệu MySQL và phân tích...', 'bot');

    try {
        const res = await AppAPI.post('backend/ai/chat.php', {
            mode: 'admin',
            message: q,
            conversation_id: state.aiConversationId,
        });
        state.aiConversationId = res.conversation_id || state.aiConversationId;
        typing.remove();
        let text = res.reply || 'Không có phản hồi.';
        if (res.fallback_notice) text += '\n\n' + res.fallback_notice;
        addBubble(text, 'bot');
    } catch (err) {
        typing.remove();
        addBubble('Lỗi gọi trợ lý AI: ' + err.message, 'bot');
    }
}

function updateTodayLabel() {
    $('#todayLabel').textContent = new Date().toLocaleDateString('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function scheduleMidnightRefresh() {
    clearTimeout(scheduleMidnightRefresh.timer);
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
    const delay = Math.max(1000, nextMidnight.getTime() - now.getTime());
    scheduleMidnightRefresh.timer = setTimeout(async () => {
        state.currentDayKey = adminTodayYMD(0);
        updateTodayLabel();
        await refreshAll();
        scheduleMidnightRefresh();
    }, delay);
}

// ============================================================================
// BOOTSTRAP & EVENT LISTENERS
// ============================================================================
async function setup() {
    const ok = await verifyAccess();
    if (!ok) return;

    state.currentDayKey = adminTodayYMD(0);
    updateTodayLabel();
    scheduleMidnightRefresh();
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            const nowKey = adminTodayYMD(0);
            if (nowKey !== state.currentDayKey) {
                state.currentDayKey = nowKey;
                updateTodayLabel();
                refreshAll();
                scheduleMidnightRefresh();
            }
        }
    });

    addBubble(
        'Chào bạn! Mình là **Pawly AI Quản trị** của **Góc nhỏ có em**\nMình kết nối trực tiếp cơ sở dữ liệu MySQL để tra cứu doanh thu, đơn hàng, cảnh báo tồn kho sắp hết và gợi ý nội dung chăm sóc khách hàng. Bạn muốn kiểm tra gì hôm nay?',
        'bot'
    );

    await refreshAll();

    document.addEventListener('click', async (e) => {
        const prodCard = e.target.closest('#productGrid .product-card');
        if (prodCard) {
            showProductDetail(prodCard.dataset.productId);
            return;
        }
        const nav = e.target.closest('[data-view]');
        if (nav) {
            go(nav.dataset.view);
            return;
        }
        const dest = e.target.closest('[data-go]');
        if (dest) {
            go(dest.dataset.go);
            return;
        }
        const modalBtn = e.target.closest('[data-modal]');
        if (modalBtn) {
            const type = modalBtn.dataset.modal;
            if (type === 'product') {
                openProductModal(null);
            } else if (type === 'service') {
                state.editingServiceId = null;
                $('#serviceModalTitle').textContent = 'Thêm dịch vụ Spa mới';
                $('#form-service').reset();
                $('#modal-service').showModal();
            } else if (type === 'appointment') {
                const today = adminTodayYMD(0);
                $('#a-date-only').min = today;
                $('#a-date-only').value = today;
                $('#a-date-vn').value = ymdToDMY(today);
                $('#modal-appointment').showModal();
                loadAdminBookingSlots(true);
            } else {
                $('#modal-' + type)?.showModal();
            }
            return;
        }
        const adminSlotBtn = e.target.closest('[data-admin-slot]');
        if (adminSlotBtn && !adminSlotBtn.disabled) {
            $$('#adminSlotsGrid .slot-btn').forEach((b) => b.classList.toggle('selected', b === adminSlotBtn));
            $('#a-slot-value').value = adminSlotBtn.dataset.adminSlot;
            setAdminBookingError('', false);
            return;
        }
        const closeBtn = e.target.closest('[data-close]');
        if (closeBtn) {
            closeBtn.closest('dialog')?.close();
            return;
        }
        const suggest = e.target.closest('[data-suggestion]');
        if (suggest) {
            go('ai');
            askAdminAI(suggest.dataset.suggestion);
            return;
        }
        const posAddBtn = e.target.closest('[data-pos-add]');
        if (posAddBtn && !posAddBtn.disabled) {
            openPosVariantModal(posAddBtn.dataset.posAdd);
            return;
        }
        const posVPill = e.target.closest('[data-pos-vpill]');
        if (posVPill) {
            const grp = posVPill.closest('.pos-var-group');
            grp?.querySelectorAll('.pos-var-pill').forEach((b) => b.classList.toggle('active', b === posVPill));
            return;
        }
        const posQtyBtn = e.target.closest('[data-pos-qty-idx]');
        if (posQtyBtn) {
            const idx = Number(posQtyBtn.dataset.posQtyIdx);
            const delta = Number(posQtyBtn.dataset.delta);
            const item = state.posCart[idx];
            if (!item) return;
            if (delta > 0) {
                const remain = Number(item.ton_kho) - posUsedQty(item.ma_san_pham);
                if (remain < delta) {
                    toast(`Đã đạt giới hạn tồn kho (${item.ton_kho}).`);
                    return;
                }
                item.so_luong += delta;
            } else {
                item.so_luong += delta;
                if (item.so_luong <= 0) state.posCart.splice(idx, 1);
            }
            renderPos();
            return;
        }
        const posRemBtn = e.target.closest('[data-pos-rem-idx]');
        if (posRemBtn) {
            state.posCart.splice(Number(posRemBtn.dataset.posRemIdx), 1);
            renderPos();
            return;
        }
        const posPayBtn = e.target.closest('[data-pos-pay]');
        if (posPayBtn) {
            state.posPayMethod = posPayBtn.dataset.posPay === 'bank_transfer' ? 'bank_transfer' : 'cod';
            setPosError('');
            renderPosCart();
            return;
        }
        const cashExactBtn = e.target.closest('[data-cash-exact]');
        if (cashExactBtn) {
            if ($('#posCashGiven')) $('#posCashGiven').value = String(posCartTotal());
            updatePosCashChange();
            return;
        }
        const cashValBtn = e.target.closest('[data-cash-val]');
        if (cashValBtn) {
            if ($('#posCashGiven')) $('#posCashGiven').value = String(Number(cashValBtn.dataset.cashVal));
            updatePosCashChange();
            return;
        }
        const filterChip = e.target.closest('.tool-filters [data-filter]');
        if (filterChip) {
            filterChip.parentElement.querySelectorAll('.chip').forEach((c) => c.classList.toggle('selected', c === filterChip));
            if (filterChip.closest('#orderFilters')) {
                $('#orderFilters')?.classList.add('hide');
                $('#orderFilterToggle')?.setAttribute('aria-expanded', 'false');
            }
            renderOrders();
            renderProducts();
            renderNotifications();
            return;
        }
        const ordDet = e.target.closest('[data-order-detail]');
        if (ordDet) {
            showOrderDetail(ordDet.dataset.orderDetail);
            return;
        }
        const invBtn = e.target.closest('[data-open-invoice]');
        if (invBtn) {
            const inv = (state.invoices || []).find((x) => Number(x.ma_hoa_don) === Number(invBtn.dataset.openInvoice));
            if (inv) {
                openPosReceiptModal(inv, inv.tien_khach_dua, { isArchive: true });
            }
            return;
        }
        const invTabBtn = e.target.closest('[data-inv-tab]');
        if (invTabBtn) {
            setInvTab(invTabBtn.dataset.invTab);
            return;
        }
        const quickReqBtn = e.target.closest('[data-quick-request]');
        if (quickReqBtn) {
            openImportRequestModal(Number(quickReqBtn.dataset.quickRequest));
            return;
        }
        const quickImpBtn = e.target.closest('[data-quick-import]');
        if (quickImpBtn) {
            openImportReceiptModal({ productId: Number(quickImpBtn.dataset.quickImport), qty: 10 });
            return;
        }
        const approveReqBtn = e.target.closest('[data-approve-req]');
        if (approveReqBtn) {
            const req = (state.importRequests || []).find((r) => Number(r.ma_yeu_cau) === Number(approveReqBtn.dataset.approveReq));
            if (req) {
                openImportReceiptModal({
                    requestId: req.ma_yeu_cau,
                    requestCode: req.ma_yeu_cau_code,
                    requesterName: req.ten_nguoi_yc,
                    productId: req.ma_san_pham,
                    qty: req.so_luong_yeu_cau,
                    note: req.ly_do ? `Theo yêu cầu #${req.ma_yeu_cau_code}: ${req.ly_do}` : `Theo yêu cầu #${req.ma_yeu_cau_code}`,
                });
            }
            return;
        }
        const rejectReqBtn = e.target.closest('[data-reject-req]');
        if (rejectReqBtn) {
            const reason = prompt('Nhập lý do từ chối yêu cầu nhập kho:', 'Tồn kho hiện tại vẫn đủ bán trong tuần này.');
            if (reason === null) return;
            try {
                const res = await AppAPI.put('backend/inventory/index.php', {
                    action: 'reject_request',
                    ma_yeu_cau: Number(rejectReqBtn.dataset.rejectReq),
                    ly_do_tu_choi: reason.trim(),
                });
                toast(res.message);
                await refreshAll();
            } catch (err) {
                toast(err.message);
            }
            return;
        }
        const viewReceiptBtn = e.target.closest('[data-view-receipt]');
        if (viewReceiptBtn) {
            const rc = (state.importReceipts || []).find((x) => Number(x.ma_phieu_nhap) === Number(viewReceiptBtn.dataset.viewReceipt));
            if (rc) openImportReceiptPrintModal(rc);
            return;
        }
        const editSupBtn = e.target.closest('[data-edit-supplier]');
        if (editSupBtn) {
            openSupplierModal(Number(editSupBtn.dataset.editSupplier));
            return;
        }
        const prevEmail = e.target.closest('[data-preview-email]');
        if (prevEmail) {
            const em = (state.emails || []).find((x) => Number(x.ma_email) === Number(prevEmail.dataset.previewEmail));
            if (em) {
                $('#emailPreviewTitle').textContent = em.tieu_de || 'Nội dung Email';
                $('#emailPreviewSub').textContent = `Tới: ${em.email_nhan} · ${formatDateTime(em.ngay_gui)}`;
                $('#adminEmailIframe').srcdoc = em.noi_dung_html || '';
                $('#modal-email-preview').showModal();
            }
            return;
        }
        const ordSt = e.target.closest('[data-order-status]');
        if (ordSt) {
            const next = ordSt.dataset.next;
            let lyDo = '';
            if (next === 'cancelled') {
                const input = prompt(
                    'Nhập lý do không duyệt / hủy đơn hàng (sẽ gửi thông báo qua Email cho khách hàng):',
                    'Sản phẩm tạm hết hàng hoặc thông tin xác nhận đơn chưa hợp lệ.'
                );
                if (input === null) return;
                lyDo = input.trim();
            }
            try {
                const res = await AppAPI.put('backend/orders/index.php', {
                    ma_don_hang: Number(ordSt.dataset.orderStatus),
                    trang_thai: next,
                    ly_do: lyDo,
                });
                toast(res.message);
                await refreshAll();
            } catch (err) {
                toast(err.message);
            }
            return;
        }
        const appSt = e.target.closest('[data-app-status]');
        if (appSt) {
            try {
                const res = await AppAPI.put('backend/appointments/index.php', {
                    ma_lich_hen: Number(appSt.dataset.appStatus),
                    trang_thai: appSt.dataset.next,
                });
                toast(res.message);
                await refreshAll();
            } catch (err) {
                toast(err.message);
            }
            return;
        }
        const editSvc = e.target.closest('[data-edit-svc]');
        if (editSvc) {
            const s = state.services.find((x) => Number(x.ma_dich_vu) === Number(editSvc.dataset.editSvc));
            if (!s) return;
            state.editingServiceId = Number(s.ma_dich_vu);
            $('#serviceModalTitle').textContent = 'Chỉnh sửa dịch vụ Spa';
            $('#svc-name').value = s.ten_dich_vu;
            $('#svc-price').value = Math.round(Number(s.gia));
            $('#svc-duration').value = s.thoi_luong;
            $('#svc-emoji').value = s.bieu_tuong || '🛁';
            $('#svc-desc').value = s.mo_ta || '';
            $('#svc-status').value = s.trang_thai || 'active';
            $('#modal-service').showModal();
            return;
        }
        const delCat = e.target.closest('[data-del-cat]');
        if (delCat) {
            if (!confirm('Xóa danh mục này?')) return;
            try {
                const res = await AppAPI.del('backend/categories/index.php?id=' + delCat.dataset.delCat);
                toast(res.message);
                await refreshAll();
            } catch (err) {
                toast(err.message);
            }
            return;
        }
        const cusEdit = e.target.closest('[data-cus-edit]');
        if (cusEdit) {
            const c = state.customers.find((x) => Number(x.ma_khach_hang) === Number(cusEdit.dataset.cusEdit));
            if (!c) return;
            $('#ec-id').value = c.ma_khach_hang;
            $('#ec-name').value = c.ho_ten || '';
            $('#ec-phone').value = c.so_dien_thoai || '';
            $('#ec-email').value = c.email || '';
            $('#ec-address').value = c.dia_chi || '';
            $('#modal-edit-customer').showModal();
            return;
        }
        const cusDet = e.target.closest('[data-cus-detail]');
        if (cusDet) {
            showCustomerDetail(cusDet.dataset.cusDetail);
            return;
        }
        const cusLock = e.target.closest('[data-cus-lock]');
        if (cusLock) {
            try {
                const res = await AppAPI.put('backend/customers/index.php', {
                    ma_tai_khoan: Number(cusLock.dataset.cusLock),
                    trang_thai: cusLock.dataset.nextStatus,
                });
                toast(res.message);
                await refreshAll();
            } catch (err) {
                toast(err.message);
            }
            return;
        }
        const empLock = e.target.closest('[data-emp-lock]');
        if (empLock) {
            try {
                const res = await AppAPI.put('backend/employees/index.php', {
                    ma_nhan_vien: Number(empLock.dataset.empLock),
                    trang_thai_tai_khoan: empLock.dataset.nextStatus,
                });
                toast(res.message);
                await refreshAll();
            } catch (err) {
                toast(err.message);
            }
            return;
        }
        const empRole = e.target.closest('[data-emp-role]');
        if (empRole) {
            try {
                const res = await AppAPI.put('backend/employees/index.php', {
                    ma_nhan_vien: Number(empRole.dataset.empRole),
                    ten_quyen: empRole.dataset.nextRole,
                });
                toast(res.message);
                await refreshAll();
            } catch (err) {
                toast(err.message);
            }
        }
    });

    $('#menuToggle').addEventListener('click', () => {
        $('#sidebar').classList.add('open');
        $('#mobileOverlay').classList.add('show');
    });
    $('#mobileOverlay').addEventListener('click', () => {
        $('#sidebar').classList.remove('open');
        $('#mobileOverlay').classList.remove('show');
    });
    $('#notifyBtn').addEventListener('click', () => go('notifications'));
    $('#logoutBtn').addEventListener('click', async () => {
        await AppAPI.post('backend/auth/logout.php', {});
        location.href = 'auth.html';
    });

    $('#globalSearch')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const t = e.target.value.trim();
            if (!t) return;
            $('#productSearch').value = t;
            go('products');
            renderProducts();
        }
    });

    // User name quick menu (Chỉnh sửa thông tin / Đổi mật khẩu)
    const closeUserMenus = () => {
        $('#topUserMenu')?.classList.add('hide');
        $('#topUserMenuBtn')?.setAttribute('aria-expanded', 'false');
        $('#sideUserMenu')?.classList.add('hide');
        $('#sideUserMenuBtn')?.setAttribute('aria-expanded', 'false');
    };
    const toggleUserMenu = (menuEl, btnEl) => {
        if (!menuEl || !btnEl) return;
        const willOpen = menuEl.classList.contains('hide');
        closeUserMenus();
        if (willOpen) {
            menuEl.classList.remove('hide');
            btnEl.setAttribute('aria-expanded', 'true');
        }
    };
    $('#topUserMenuBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleUserMenu($('#topUserMenu'), $('#topUserMenuBtn'));
    });
    $('#sideUserMenuBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleUserMenu($('#sideUserMenu'), $('#sideUserMenuBtn'));
    });
    // Order status dropdown filter toggle
    const closeOrderFilter = () => {
        $('#orderFilters')?.classList.add('hide');
        $('#orderFilterToggle')?.setAttribute('aria-expanded', 'false');
    };
    $('#orderFilterToggle')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = $('#orderFilters');
        if (!menu) return;
        const willOpen = menu.classList.contains('hide');
        closeUserMenus();
        menu.classList.toggle('hide', !willOpen);
        $('#orderFilterToggle').setAttribute('aria-expanded', String(willOpen));
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-menu-wrap') && !e.target.closest('.side-profile-wrap')) {
            closeUserMenus();
        }
        if (!e.target.closest('#orderFilterWrap')) {
            closeOrderFilter();
        }
        const actBtn = e.target.closest('[data-user-action]');
        if (!actBtn) return;
        const act = actBtn.dataset.userAction;
        closeUserMenus();
        if (act === 'edit-profile' && state.user) {
            $('#ep-name').value = state.user.ho_ten || '';
            $('#ep-email').value = state.user.email || '';
            $('#ep-phone').value = state.user.so_dien_thoai || '';
            $('#editProfileError')?.classList.add('hide');
            $('#modal-edit-profile')?.showModal();
        } else if (act === 'change-password') {
            go('account');
            setTimeout(() => $('#accountOldPass')?.focus(), 80);
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeUserMenus();
            closeOrderFilter();
        }
    });

    $('#form-edit-profile')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errBox = $('#editProfileError');
        errBox?.classList.add('hide');
        try {
            const res = await AppAPI.post('backend/auth/profile.php', {
                ho_ten: $('#ep-name').value.trim(),
                email: $('#ep-email').value.trim(),
                so_dien_thoai: $('#ep-phone').value.trim(),
            });
            state.user = res.user;
            applyUserUI();
            $('#modal-edit-profile').close();
            toast(res.message);
        } catch (err) {
            if (errBox) {
                errBox.textContent = err.message;
                errBox.classList.remove('hide');
            }
        }
    });

    $('#form-change-password')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errBox = $('#changePasswordError');
        const showErr = (m) => {
            if (!errBox) return;
            errBox.textContent = m;
            errBox.classList.remove('hide');
        };
        errBox?.classList.add('hide');
        const oldPass = $('#cp-old').value;
        const newPass = $('#cp-new').value;
        const confirmPass = $('#cp-confirm').value;
        if (newPass.length < 6) {
            showErr('Mật khẩu mới cần tối thiểu 6 ký tự.');
            return;
        }
        if (newPass !== confirmPass) {
            showErr('Mật khẩu xác nhận không khớp với mật khẩu mới.');
            return;
        }
        try {
            await AppAPI.post('backend/auth/profile.php', {
                ho_ten: state.user.ho_ten,
                email: state.user.email,
                so_dien_thoai: state.user.so_dien_thoai || '',
                mat_khau_cu: oldPass,
                mat_khau_moi: newPass,
            });
            e.target.reset();
            $('#modal-change-password').close();
            toast('Đã đổi mật khẩu thành công!');
        } catch (err) {
            showErr(err.message);
        }
    });
    $('#orderSearch').addEventListener('input', renderOrders);
    $('#orderStatusFilter')?.addEventListener('change', renderOrders);
    $('#orderYearFilter')?.addEventListener('change', renderOrders);
    $('#orderMonthFilter')?.addEventListener('change', renderOrders);
    $('#orderSort')?.addEventListener('change', renderOrders);
    $('#invoiceSearch')?.addEventListener('input', renderInvoices);
    $('#invoiceChannelFilter')?.addEventListener('change', renderInvoices);
    $('#invoicePayFilter')?.addEventListener('change', renderInvoices);
    $('#invoiceSort')?.addEventListener('change', renderInvoices);

    // Inventory & Suppliers listeners
    $('#invStockSearch')?.addEventListener('input', renderInventoryStock);
    $('#invStockFilter')?.addEventListener('change', renderInventoryStock);
    $('#invReqSearch')?.addEventListener('input', renderImportRequests);
    $('#invReqFilter')?.addEventListener('change', renderImportRequests);
    $('#invReceiptSearch')?.addEventListener('input', renderImportReceipts);
    $('#invReceiptSupplierFilter')?.addEventListener('change', renderImportReceipts);
    $('#invSupplierSearch')?.addEventListener('input', renderSuppliers);

    $('#openImportRequestBtn')?.addEventListener('click', () => openImportRequestModal(null));
    $('#openImportReceiptBtn')?.addEventListener('click', () => openImportReceiptModal({}));
    $('#openSupplierBtn')?.addEventListener('click', () => openSupplierModal(null));

    $('#irAddRowBtn')?.addEventListener('click', () => {
        $('#ir-items-list')?.insertAdjacentHTML('beforeend', buildImportReceiptRowHtml(null, 5, null));
        updateImportReceiptTotal();
    });
    $('#ir-items-list')?.addEventListener('click', (e) => {
        const rem = e.target.closest('.ir-rem-btn');
        if (!rem) return;
        const rows = $$('#ir-items-list .ir-item-row');
        if (rows.length <= 1) {
            toast('Phiếu nhập kho cần ít nhất 1 sản phẩm.');
            return;
        }
        rem.closest('.ir-item-row')?.remove();
        updateImportReceiptTotal();
    });
    $('#ir-items-list')?.addEventListener('input', updateImportReceiptTotal);
    $('#ir-items-list')?.addEventListener('change', (e) => {
        if (e.target.classList.contains('ir-prod')) {
            const p = state.products.find((x) => Number(x.ma_san_pham) === Number(e.target.value));
            const costEl = e.target.closest('.ir-item-row')?.querySelector('.ir-cost');
            if (p && costEl) {
                costEl.value = String(Math.round((Number(p.gia) * 0.7) / 1000) * 1000);
            }
            updateImportReceiptTotal();
        }
    });

    $('#form-import-request')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errBox = $('#importReqError');
        errBox?.classList.add('hide');
        try {
            const res = await AppAPI.post('backend/inventory/index.php', {
                action: 'request_import',
                ma_san_pham: Number($('#req-product').value),
                so_luong_yeu_cau: Number($('#req-qty').value),
                ly_do: $('#req-reason').value.trim(),
            });
            $('#modal-import-request').close();
            toast(res.message);
            state.invTab = 'requests';
            await refreshAll();
        } catch (err) {
            if (errBox) {
                errBox.textContent = err.message;
                errBox.classList.remove('hide');
            }
        }
    });

    $('#form-import-receipt')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errBox = $('#importReceiptError');
        errBox?.classList.add('hide');
        const items = $$('#ir-items-list .ir-item-row').map((row) => ({
            ma_san_pham: Number(row.querySelector('.ir-prod')?.value || 0),
            so_luong: Number(row.querySelector('.ir-qty')?.value || 0),
            gia_nhap: Number(row.querySelector('.ir-cost')?.value || 0),
        }));
        try {
            const res = await AppAPI.post('backend/inventory/index.php', {
                action: 'create_receipt',
                ma_ncc: Number($('#ir-supplier').value),
                ma_yeu_cau: Number($('#ir-request-id').value || 0),
                ghi_chu: $('#ir-note').value.trim(),
                items,
            });
            $('#modal-import-receipt').close();
            toast(res.message);
            state.invTab = 'receipts';
            await refreshAll();
        } catch (err) {
            if (errBox) {
                errBox.textContent = err.message;
                errBox.classList.remove('hide');
            }
        }
    });

    $('#form-supplier')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errBox = $('#supplierError');
        errBox?.classList.add('hide');
        const payload = {
            ten_ncc: $('#sup-name').value.trim(),
            so_dien_thoai: $('#sup-phone').value.trim(),
            nguoi_lien_he: $('#sup-contact').value.trim(),
            email: $('#sup-email').value.trim(),
            dia_chi: $('#sup-address').value.trim(),
            ghi_chu: $('#sup-note').value.trim(),
            trang_thai: $('#sup-status').value,
        };
        try {
            let res;
            if (state.editingSupplierId) {
                payload.ma_ncc = state.editingSupplierId;
                res = await AppAPI.put('backend/suppliers/index.php', payload);
            } else {
                res = await AppAPI.post('backend/suppliers/index.php', payload);
            }
            $('#modal-supplier').close();
            toast(res.message);
            state.invTab = 'suppliers';
            await refreshAll();
        } catch (err) {
            if (errBox) {
                errBox.textContent = err.message;
                errBox.classList.remove('hide');
            }
        }
    });

    // POS listeners
    $('#posSearch')?.addEventListener('input', renderPos);
    $('#posCategoryFilter')?.addEventListener('change', renderPos);
    $('#posCodeInput')?.addEventListener('input', renderPosCodePreview);
    const triggerPosCodeSelect = () => {
        const val = ($('#posCodeInput')?.value || '').trim();
        if (!val) {
            $('#posCodeInput')?.focus();
            return;
        }
        const p = findProductByCodeInput(val);
        if (!p) {
            renderPosCodePreview();
            toast(`Không tìm thấy sản phẩm mã "${val}".`);
            return;
        }
        openPosVariantModal(p.ma_san_pham);
    };
    $('#posCodeInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            triggerPosCodeSelect();
        }
    });
    $('#posCodeLookupBtn')?.addEventListener('click', triggerPosCodeSelect);
    $('#posPhone')?.addEventListener('input', lookupPosCustomerByPhone);
    $('#posCashGiven')?.addEventListener('input', updatePosCashChange);
    $('#posClearBtn')?.addEventListener('click', () => {
        if (!state.posCart.length) return;
        state.posCart = [];
        setPosError('');
        renderPos();
    });
    $('#posCheckoutBtn')?.addEventListener('click', submitPosCheckout);
    $('#posPrintInvoiceBtn')?.addEventListener('click', openCurrentPosInvoiceForPrint);
    $('#posPrintBtn')?.addEventListener('click', () => window.print());
    $('#posVarQty')?.addEventListener('input', updatePosVarSubtotal);
    $('#form-pos-variant')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const p = state.posVariantProduct;
        if (!p) return;
        const parts = [];
        $$('#posVarGroups .pos-var-group').forEach((grp) => {
            const active = grp.querySelector('.pos-var-pill.active');
            const label = (grp.dataset.posVlabel || '').replace(/\s*\([^)]*\)/g, '');
            if (active) parts.push(`${label}: ${active.dataset.posVval}`);
        });
        const customNote = ($('#posVarNote')?.value || '').trim();
        if (customNote) parts.push(`Ghi chú: ${customNote}`);
        const qty = Math.max(1, Number($('#posVarQty').value || 1));
        if (addPosCartItem(p, qty, parts.join(' · '))) {
            $('#modal-pos-variant').close();
            if ($('#posCodeInput')) {
                $('#posCodeInput').value = '';
                renderPosCodePreview();
            }
        }
    });
    $('#productSearch').addEventListener('input', renderProducts);
    $('#customerSearch').addEventListener('input', renderCustomers);
    $('#employeeSearch').addEventListener('input', renderEmployees);

    $('#chartRange').addEventListener('change', async (e) => {
        state.chartDays = Number(e.target.value);
        state.report = await AppAPI.get('backend/reports/index.php?days=' + state.chartDays);
        renderRevenueChart();
    });

    // Product image picker, preview click, drag-and-drop & clear
    $('#p-image-file')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) handleProductImageSelection(file);
    });

    $('#p-image-preview')?.addEventListener('click', () => {
        $('#p-image-file')?.click();
    });

    const pDropZone = $('#p-image-dropzone');
    if (pDropZone) {
        ['dragenter', 'dragover'].forEach((evtName) => {
            pDropZone.addEventListener(evtName, (e) => {
                e.preventDefault();
                pDropZone.classList.add('drag-over');
            });
        });
        ['dragleave', 'drop'].forEach((evtName) => {
            pDropZone.addEventListener(evtName, (e) => {
                e.preventDefault();
                pDropZone.classList.remove('drag-over');
            });
        });
        pDropZone.addEventListener('drop', (e) => {
            const file = e.dataTransfer?.files?.[0];
            if (file) handleProductImageSelection(file);
        });
    }

    $('#p-image-clear-btn')?.addEventListener('click', () => {
        setProductFormError('');
        if ($('#p-image-file')) $('#p-image-file').value = '';
        if (state.pendingProductImageFile) {
            state.pendingProductImageFile = null;
            revokeProductImagePreviewUrl();
            if (state.productOriginalImage && !state.productImageRemoved) {
                renderProductImagePreview(
                    state.productOriginalImage,
                    'Ảnh hiện tại của sản phẩm. Chọn ảnh mới để thay thế hoặc bấm Xóa ảnh.',
                    'Xóa ảnh'
                );
            } else {
                renderProductImagePreview('', '', '');
            }
            return;
        }
        if (state.productOriginalImage) {
            state.productImageRemoved = true;
            renderProductImagePreview('', 'Ảnh minh họa hiện tại sẽ được gỡ sau khi bấm "Lưu sản phẩm".', '');
        }
    });

    // Save product (Add or Edit + optional Image upload)
    $('#form-product').addEventListener('submit', async (e) => {
        e.preventDefault();
        setProductFormError('');
        const fd = new FormData(e.target);
        const submitBtn = $('#p-submit-btn');
        const origLabel = submitBtn ? submitBtn.textContent : 'Lưu sản phẩm';

        let uploadedPath = '';
        const selectedFile = state.pendingProductImageFile || $('#p-image-file')?.files?.[0] || null;

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = selectedFile ? 'Đang tải ảnh & lưu...' : 'Đang lưu...';
        }

        try {
            if (selectedFile) {
                const readyFile = await optimizeProductImageIfNeeded(selectedFile);
                if (readyFile.size > 10 * 1024 * 1024) {
                    setProductFormError('Kích thước ảnh vượt quá 10MB. Vui lòng chọn ảnh nhẹ hơn.');
                    return;
                }
                const imgData = new FormData();
                imgData.append('image', readyFile, readyFile.name);
                const up = await AppAPI.post('backend/products/upload.php', imgData);
                uploadedPath = up.path || '';
            }

            const payload = {
                ten_san_pham: String(fd.get('name')).trim(),
                ma_danh_muc: Number(fd.get('category')),
                loai_thu_cung: String(fd.get('pet_type')),
                bieu_tuong: String(fd.get('emoji')),
                gia: Number(fd.get('price')),
                ton_kho: Number(fd.get('stock')),
                mo_ta: String(fd.get('desc') || '').trim(),
                trang_thai: String(fd.get('status') || 'active'),
            };
            if (uploadedPath) {
                payload.anh_chinh = uploadedPath;
            } else if (state.editingProductId && state.productImageRemoved) {
                payload.xoa_anh_chinh = true;
            }

            let res;
            if (state.editingProductId) {
                payload.ma_san_pham = state.editingProductId;
                res = await AppAPI.put('backend/products/index.php', payload);
            } else {
                res = await AppAPI.post('backend/products/index.php', payload);
            }
            state.pendingProductImageFile = null;
            state.productImageRemoved = false;
            revokeProductImagePreviewUrl();
            $('#modal-product').close();
            toast(res.message);
            await refreshAll();
            go('products');
        } catch (err) {
            setProductFormError(err.message || 'Không thể lưu sản phẩm. Vui lòng thử lại.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = origLabel;
            }
        }
    });

    // Category create
    $('#form-category').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
            const res = await AppAPI.post('backend/categories/index.php', {
                ten_danh_muc: String(fd.get('ten_danh_muc')).trim(),
                bieu_tuong: String(fd.get('bieu_tuong') || '🐾').trim(),
                mo_ta: String(fd.get('mo_ta') || '').trim(),
            });
            e.target.reset();
            toast(res.message);
            await refreshAll();
        } catch (err) {
            toast(err.message);
        }
    });

    // Order create from admin
    ['o-product', 'o-quantity'].forEach((id) => $('#' + id).addEventListener('input', updateOrderTotalHint));
    $('#form-order').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
            const res = await AppAPI.post('backend/orders/index.php', {
                from_admin: true,
                ten_nguoi_nhan: String(fd.get('customer')).trim(),
                so_dien_thoai: String(fd.get('phone') || '').trim(),
                dia_chi_nhan: String(fd.get('address') || '').trim(),
                items: [{ ma_san_pham: Number(fd.get('productId')), so_luong: Number(fd.get('quantity')) }],
            });
            e.target.reset();
            $('#modal-order').close();
            toast(res.message);
            await refreshAll();
            go('orders');
        } catch (err) {
            toast(err.message);
        }
    });

    // Appointment create
    $('#a-service').addEventListener('change', () => loadAdminBookingSlots(false));
    setupVnDatePicker($('#a-date-vn'), $('#a-date-only'), $('#a-date-trigger'), () => loadAdminBookingSlots(false));
    $('#form-appointment').addEventListener('submit', async (e) => {
        e.preventDefault();
        setAdminBookingError('', false);
        const fd = new FormData(e.target);
        const dt = String(fd.get('datetime') || '').trim();
        if (!dt) {
            setAdminBookingError('Vui lòng bấm chọn một khung giờ còn trống ở trên trước khi lưu lịch hẹn.', true);
            return;
        }
        try {
            const res = await AppAPI.post('backend/appointments/index.php', {
                from_admin: true,
                ten_thu_cung: String(fd.get('pet')).trim(),
                bieu_tuong: String(fd.get('emoji')),
                ten_chu_nuoi: String(fd.get('owner')).trim(),
                so_dien_thoai: String(fd.get('phone') || '').trim(),
                ma_dich_vu: Number(fd.get('service')),
                ngay_gio: dt,
            });
            e.target.reset();
            setAdminBookingError('', false);
            $('#modal-appointment').close();
            toast(res.message);
            await refreshAll();
            go('appointments');
        } catch (err) {
            setAdminBookingError(err.message || 'Không thể lưu lịch hẹn.');
            await loadAdminBookingSlots(false, true);
        }
    });

    // Service create/edit
    $('#form-service').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = {
            ten_dich_vu: String(fd.get('ten_dich_vu')).trim(),
            gia: Number(fd.get('gia')),
            thoi_luong: Number(fd.get('thoi_luong')),
            bieu_tuong: String(fd.get('bieu_tuong') || '🛁'),
            mo_ta: String(fd.get('mo_ta') || '').trim(),
            trang_thai: String(fd.get('trang_thai') || 'active'),
        };
        try {
            let res;
            if (state.editingServiceId) {
                payload.ma_dich_vu = state.editingServiceId;
                res = await AppAPI.put('backend/services/index.php', payload);
            } else {
                res = await AppAPI.post('backend/services/index.php', payload);
            }
            $('#modal-service').close();
            toast(res.message);
            await refreshAll();
        } catch (err) {
            toast(err.message);
        }
    });

    // Edit customer info from Admin
    $('#form-edit-customer').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const res = await AppAPI.put('backend/customers/index.php', {
                ma_khach_hang: Number($('#ec-id').value),
                ho_ten: $('#ec-name').value.trim(),
                so_dien_thoai: $('#ec-phone').value.trim(),
                email: $('#ec-email').value.trim(),
                dia_chi: $('#ec-address').value.trim(),
            });
            $('#modal-edit-customer').close();
            toast(res.message);
            await refreshAll();
        } catch (err) {
            toast(err.message);
        }
    });

    // Employee create
    $('#form-employee').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
            const res = await AppAPI.post('backend/employees/index.php', {
                ho_ten: String(fd.get('name')).trim(),
                chuc_vu: String(fd.get('role')),
                so_dien_thoai: String(fd.get('phone') || '').trim(),
                email: String(fd.get('email')).trim(),
                mat_khau: String(fd.get('password')),
                ten_quyen: String(fd.get('permission')),
            });
            e.target.reset();
            $('#modal-employee').close();
            toast(res.message);
            await refreshAll();
        } catch (err) {
            toast(err.message);
        }
    });

    // Account avatar picker & clear
    $('#accountAvatarFile')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) {
            toast('Kích thước ảnh đại diện tối đa là 3MB.');
            e.target.value = '';
            return;
        }
        state.pendingAccountAvatarFile = file;
        state.accountAvatarRemoved = false;
        renderAccountAvatarPreview(URL.createObjectURL(file), getUserInitials(state.user?.ho_ten));
    });

    $('#clearAccountAvatarBtn')?.addEventListener('click', () => {
        state.pendingAccountAvatarFile = null;
        state.accountAvatarRemoved = true;
        if ($('#accountAvatarFile')) $('#accountAvatarFile').value = '';
        renderAccountAvatarPreview('', getUserInitials(state.user?.ho_ten));
    });

    // Account profile info update (separated from password change)
    $('#accountForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            let avatarPath = state.accountAvatarRemoved ? '' : (state.user?.anh_dai_dien || '');
            if (state.pendingAccountAvatarFile) {
                const fd = new FormData();
                fd.append('image', state.pendingAccountAvatarFile);
                const up = await AppAPI.post('backend/auth/upload_avatar.php', fd);
                avatarPath = up.path || '';
            }
            const res = await AppAPI.post('backend/auth/profile.php', {
                ho_ten: $('#accountName').value.trim(),
                email: $('#accountEmail').value.trim(),
                so_dien_thoai: $('#accountPhone').value.trim(),
                anh_dai_dien: avatarPath,
            });
            state.user = res.user;
            applyUserUI();
            toast(res.message);
        } catch (err) {
            toast(err.message);
        }
    });

    // Toggle password visibility in Account password card
    $('#toggleAccountPass')?.addEventListener('change', (e) => {
        const t = e.target.checked ? 'text' : 'password';
        ['#accountOldPass', '#accountNewPass', '#accountConfirmPass'].forEach((sel) => {
            if ($(sel)) $(sel).type = t;
        });
    });

    // Account password change with Email OTP verification (2-step)
    let accountOtpStep = false;
    let accountOtpTimer = null;

    const resetAccountOtpFlow = (clearInputs = false) => {
        accountOtpStep = false;
        if (accountOtpTimer) {
            clearInterval(accountOtpTimer);
            accountOtpTimer = null;
        }
        $('#accountOtpPanel')?.classList.add('hide');
        $('#accountOtpOpenMailBtn')?.classList.add('hide');
        $('#accountPassError')?.classList.add('hide');
        if ($('#accountOtpCode')) $('#accountOtpCode').value = '';
        ['#accountOldPass', '#accountNewPass', '#accountConfirmPass'].forEach((sel) => {
            if ($(sel)) $(sel).readOnly = false;
        });
        if ($('#accountPassSubmitBtn')) {
            $('#accountPassSubmitBtn').innerHTML = `${uiIcon('lock')} Đổi mật khẩu`;
            $('#accountPassSubmitBtn').disabled = false;
        }
        if (clearInputs) {
            $('#accountPasswordForm')?.reset();
            if ($('#toggleAccountPass')) {
                $('#toggleAccountPass').checked = false;
                ['#accountOldPass', '#accountNewPass', '#accountConfirmPass'].forEach((sel) => {
                    if ($(sel)) $(sel).type = 'password';
                });
            }
        }
    };

    const startOtpCooldown = (seconds = 30) => {
        const btn = $('#accountOtpResendBtn');
        if (!btn) return;
        if (accountOtpTimer) clearInterval(accountOtpTimer);
        let left = Math.max(1, Number(seconds) || 30);
        btn.disabled = true;
        btn.textContent = `Gửi lại (${left}s)`;
        accountOtpTimer = setInterval(() => {
            left -= 1;
            if (left <= 0) {
                clearInterval(accountOtpTimer);
                accountOtpTimer = null;
                btn.disabled = false;
                btn.textContent = 'Gửi lại mã';
            } else {
                btn.textContent = `Gửi lại (${left}s)`;
            }
        }, 1000);
    };

    const requestPasswordOtp = async () => {
        const errBox = $('#accountPassError');
        const showErr = (msg) => {
            if (!errBox) return toast(msg);
            errBox.textContent = msg;
            errBox.classList.toggle('hide', !msg);
        };
        showErr('');

        const oldPass = $('#accountOldPass').value;
        const newPass = $('#accountNewPass').value;
        const confirmPass = $('#accountConfirmPass').value;
        if (!oldPass) {
            showErr('Vui lòng nhập mật khẩu hiện tại.');
            return;
        }
        if (newPass.length < 6) {
            showErr('Mật khẩu mới cần tối thiểu 6 ký tự.');
            return;
        }
        if (newPass !== confirmPass) {
            showErr('Nhập lại mật khẩu mới chưa khớp.');
            return;
        }

        const btn = $('#accountPassSubmitBtn');
        if (btn) btn.disabled = true;
        try {
            const res = await AppAPI.post('backend/auth/password_otp.php', {
                mat_khau_cu: oldPass,
                mat_khau_moi: newPass,
            });
            accountOtpStep = true;
            ['#accountOldPass', '#accountNewPass', '#accountConfirmPass'].forEach((sel) => {
                if ($(sel)) $(sel).readOnly = true;
            });
            if ($('#accountOtpNote')) {
                const localHint =
                    res.delivery_status !== 'sent_smtp'
                        ? ' Chưa bật SMTP Gmail — bạn có thể xem mã tại Thông báo → Hộp thư Email.'
                        : '';
                $('#accountOtpNote').innerHTML = `Mã xác nhận 6 chữ số đã được gửi tới <b>${safe(res.email)}</b> (hiệu lực 5 phút).${localHint}`;
            }
            $('#accountOtpOpenMailBtn')?.classList.toggle('hide', res.delivery_status === 'sent_smtp');
            $('#accountOtpPanel')?.classList.remove('hide');
            if (btn) btn.innerHTML = `${uiIcon('check')} Xác nhận đổi mật khẩu`;
            startOtpCooldown(res.resend_after || 30);
            $('#accountOtpCode')?.focus();
            toast(res.message);
            // Làm mới danh sách email để thấy ngay thư mã xác nhận
            AppAPI.get('backend/emails/index.php?scope=admin')
                .then((emRes) => {
                    state.emails = emRes.emails || [];
                    renderNotifications();
                })
                .catch(() => {});
        } catch (err) {
            showErr(err.message || 'Không thể gửi mã xác nhận qua email.');
        } finally {
            if (btn) btn.disabled = false;
        }
    };

    $('#accountOtpResendBtn')?.addEventListener('click', requestPasswordOtp);
    $('#accountOtpCancelBtn')?.addEventListener('click', () => resetAccountOtpFlow(false));
    $('#accountOtpOpenMailBtn')?.addEventListener('click', () => go('notifications'));
    $('#accountOtpCode')?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D+/g, '').slice(0, 6);
    });

    $('#accountPasswordForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!accountOtpStep) {
            await requestPasswordOtp();
            return;
        }

        const errBox = $('#accountPassError');
        const showErr = (msg) => {
            if (!errBox) return toast(msg);
            errBox.textContent = msg;
            errBox.classList.toggle('hide', !msg);
        };
        showErr('');

        const code = ($('#accountOtpCode')?.value || '').trim();
        if (code.length !== 6) {
            showErr('Vui lòng nhập đủ mã xác nhận 6 chữ số đã gửi về email.');
            $('#accountOtpCode')?.focus();
            return;
        }

        const btn = $('#accountPassSubmitBtn');
        if (btn) btn.disabled = true;
        try {
            const res = await AppAPI.post('backend/auth/profile.php', {
                mat_khau_cu: $('#accountOldPass').value,
                mat_khau_moi: $('#accountNewPass').value,
                ma_xac_nhan: code,
                require_otp: true,
            });
            state.user = res.user;
            resetAccountOtpFlow(true);
            toast(res.message);
        } catch (err) {
            showErr(err.message || 'Mã xác nhận chưa chính xác.');
        } finally {
            if (btn) btn.disabled = false;
        }
    });

    // Store logo picker & reset
    $('#setStoreLogoFile')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) {
            toast('Kích thước ảnh logo tối đa là 3MB.');
            e.target.value = '';
            return;
        }
        state.pendingStoreLogoFile = file;
        state.storeLogoReset = false;
        renderStoreLogoPreview(URL.createObjectURL(file), true);
    });

    $('#resetStoreLogoBtn')?.addEventListener('click', () => {
        state.pendingStoreLogoFile = null;
        state.storeLogoReset = true;
        if ($('#setStoreLogoFile')) $('#setStoreLogoFile').value = '';
        renderStoreLogoPreview(DEFAULT_STORE_LOGO, false);
    });

    // Cập nhật xem trước VietQR tự động khi thay đổi thông tin ngân hàng (nếu chưa tải ảnh tĩnh)
    let bankQrPreviewTimer = null;
    ['#setBankName', '#setBankAccountNo', '#setBankAccountName', '#setBankTransferNote'].forEach((sel) => {
        $(sel)?.addEventListener('input', () => {
            if (state.pendingBankQrFile) return;
            const hasSavedStatic = !state.bankQrRemoved && Boolean((state.settings?.bank_qr_image || '').trim());
            if (hasSavedStatic) return;
            clearTimeout(bankQrPreviewTimer);
            bankQrPreviewTimer = setTimeout(() => renderStoreQrPreview(''), 350);
        });
    });

    // Store bank QR picker & clear
    $('#setBankQrFile')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) {
            toast('Kích thước ảnh mã QR tối đa là 3MB.');
            e.target.value = '';
            return;
        }
        state.pendingBankQrFile = file;
        state.bankQrRemoved = false;
        const previewUrl = URL.createObjectURL(file);
        renderStoreQrPreview(previewUrl);
    });

    $('#clearStoreQrBtn')?.addEventListener('click', () => {
        state.pendingBankQrFile = null;
        state.bankQrRemoved = true;
        if ($('#setBankQrFile')) $('#setBankQrFile').value = '';
        renderStoreQrPreview('');
    });

    // Store info save (separated from system settings)
    $('#storeInfoForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            let logoPath = state.storeLogoReset ? DEFAULT_STORE_LOGO : getStoreLogo();
            if (state.pendingStoreLogoFile) {
                const fdLogo = new FormData();
                fdLogo.append('image', state.pendingStoreLogoFile);
                const upLogo = await AppAPI.post('backend/settings/upload_logo.php', fdLogo);
                logoPath = upLogo.path || DEFAULT_STORE_LOGO;
            }
            let qrPath = state.bankQrRemoved ? '' : (state.settings.bank_qr_image || '');
            if (state.pendingBankQrFile) {
                const fd = new FormData();
                fd.append('image', state.pendingBankQrFile);
                const up = await AppAPI.post('backend/settings/upload_qr.php', fd);
                qrPath = up.path || '';
            }
            const res = await AppAPI.post('backend/settings/index.php', {
                store_name: $('#setStoreName').value.trim(),
                store_hotline: $('#setStoreHotline').value.trim(),
                store_address: $('#setStoreAddress').value.trim(),
                store_slogan: $('#setStoreSlogan')?.value.trim() || '',
                store_logo: logoPath,
                bank_name: $('#setBankName')?.value.trim() || '',
                bank_account_no: $('#setBankAccountNo')?.value.trim() || '',
                bank_account_name: $('#setBankAccountName')?.value.trim() || '',
                bank_transfer_note: $('#setBankTransferNote')?.value.trim() || '',
                bank_qr_image: qrPath,
            });
            state.pendingStoreLogoFile = null;
            state.storeLogoReset = false;
            state.pendingBankQrFile = null;
            state.bankQrRemoved = false;
            toast(res.message);
            await refreshAll();
        } catch (err) {
            toast(err.message);
        }
    });

    $('#setSmsProvider')?.addEventListener('change', (e) => {
        const p = e.target.value;
        $('#smsGateGuide')?.classList.toggle('hide', p !== 'smsgate');
        $('#smsGatewayUrlField')?.classList.toggle('hide', p !== 'smsgate');
        $('#smsApiKeyFields')?.classList.toggle('hide', p === 'demo');
        $('#smsSecretField')?.classList.toggle('hide', !['esms', 'smsgate'].includes(p));
        if ($('#smsApiKeyLabel')) {
            $('#smsApiKeyLabel').textContent = p === 'smsgate' ? 'Username (SMSGate)' : 'SMS API Key / Access Token';
        }
        if ($('#smsSecretKeyLabel')) {
            $('#smsSecretKeyLabel').textContent = p === 'smsgate' ? 'Password (SMSGate)' : 'Secret Key (dành cho eSMS)';
        }
    });

    $('#testSmsBtn')?.addEventListener('click', async () => {
        const to = prompt('Nhập số điện thoại nhận tin nhắn SMS OTP kiểm tra:', state.user?.so_dien_thoai || '');
        if (!to || !to.trim()) return;
        const btn = $('#testSmsBtn');
        btn.disabled = true;
        try {
            const res = await AppAPI.post('backend/settings/test_sms.php', { to_phone: to.trim() });
            toast(res.message);
        } catch (err) {
            toast(err.message);
        } finally {
            btn.disabled = false;
        }
    });

    // System settings, SMS OTP & SMTP save
    $('#settingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const res = await AppAPI.post('backend/settings/index.php', {
                notifications: $('#settingNotifications').checked,
                insights: $('#settingInsights').checked,
                reg_otp_enabled: $('#settingRegOtpEnabled')?.checked ?? true,
                sms_provider: $('#setSmsProvider')?.value || 'demo',
                sms_gateway_url: $('#setSmsGatewayUrl')?.value.trim() || '',
                sms_brandname: $('#setSmsBrandname')?.value.trim() || '',
                sms_api_key: $('#setSmsApiKey')?.value.trim() || '',
                sms_secret_key: $('#setSmsSecretKey')?.value.trim() || '',
                smtp_host: $('#setSmtpHost')?.value.trim() || 'smtp.gmail.com',
                smtp_port: $('#setSmtpPort')?.value.trim() || '587',
                smtp_secure: $('#setSmtpSecure')?.value || 'tls',
                smtp_from_name: $('#setSmtpFromName')?.value.trim() || 'Góc nhỏ có em Pet Shop',
                smtp_user: $('#setSmtpUser')?.value.trim() || '',
                smtp_pass: $('#setSmtpPass')?.value.trim() || '',
            });
            toast(res.message);
            await refreshAll();
        } catch (err) {
            toast(err.message);
        }
    });

    $('#testSmtpBtn')?.addEventListener('click', async () => {
        const to = prompt('Nhập địa chỉ Email nhận thư kiểm tra:', state.user?.email || '');
        if (!to || !to.trim()) return;
        const btn = $('#testSmtpBtn');
        btn.disabled = true;
        try {
            const res = await AppAPI.post('backend/emails/index.php', { to_email: to.trim() });
            toast(res.message);
            await refreshAll();
        } catch (err) {
            toast(err.message);
        } finally {
            btn.disabled = false;
        }
    });

    // Notifications mark all read
    $('#markNotifications').addEventListener('click', async () => {
        try {
            const res = await AppAPI.post('backend/notifications/index.php', { action: 'mark_all_read' });
            toast(res.message);
            await refreshAll();
        } catch (err) {
            toast(err.message);
        }
    });

    // Export CSV report
    $('#exportReport').addEventListener('click', () => {
        const rows = [
            ['Ma don', 'Khach hang', 'SDT', 'San pham', 'Tong tien', 'Trang thai', 'Ngay dat'],
            ...state.orders.map((o) => [o.ma_don_code, o.ten_nguoi_nhan, o.so_dien_thoai, o.tom_tat_san_pham, o.tong_tien, o.trang_thai, o.ngay_dat]),
        ];
        const csv = '\ufeff' + rows.map((r) => r.map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        a.download = 'goc-nho-co-em-bao-cao.csv';
        a.click();
        URL.revokeObjectURL(a.href);
    });

    // AI Chat submit
    $('#chatForm').addEventListener('submit', (e) => {
        e.preventDefault();
        askAdminAI($('#chatInput').value);
    });

    $$('dialog').forEach((d) =>
        d.addEventListener('click', (e) => {
            if (e.target === d) d.close();
        })
    );
}

setup();
