'use strict';

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const GUEST_CART_KEY = 'gnce_guest_cart';
const WISH_KEY = 'gnce_wishlist';
const BUY_NOW_KEY = 'gnce_buy_now_item';

const state = {
    user: null,
    categories: [],
    products: [],
    services: [],
    cart: [],
    cartSelectedKeys: new Set(),
    cartSelectionInitialized: false,
    wish: [],
    pets: [],
    orders: [],
    appointments: [],
    shopFilter: 'all',
    petFilter: 'all',
    priceFilter: 'all',
    currentPage: 'home',
    aiConversationId: 0,
    activeDetailProduct: null,
    activeVariantProduct: null,
    activeVariantMode: 'add',
    activeReviewService: null,
    preselectedPetId: null,
    orderTab: 'all',
    activeQrOrderId: null,
    activeReviewFile: null,
    activeReturnOrderId: null,
    activeReturnFile: null,
    emails: [],
    emailUnread: 0,
    checkoutOverrideItems: null,
    storeSettings: {},
};

function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 3300);
}

function loadLocalLists() {
    try {
        const w = JSON.parse(localStorage.getItem(WISH_KEY) || '[]');
        state.wish = Array.isArray(w) ? w : [];
    } catch {
        state.wish = [];
    }
}

function loadGuestCart() {
    try {
        const c = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]');
        if (!Array.isArray(c)) return [];
        const usedByProd = {};
        return c
            .map((i) => {
                const p = state.products.find((x) => Number(x.ma_san_pham) === Number(i.id));
                if (!p || Number(p.ton_kho) <= 0) return null;
                const pid = Number(p.ma_san_pham);
                const left = Math.max(0, Number(p.ton_kho) - (usedByProd[pid] || 0));
                if (left <= 0) return null;
                const qty = Math.min(Math.max(1, Number(i.qty) || 1), left);
                usedByProd[pid] = (usedByProd[pid] || 0) + qty;
                return {
                    ma_san_pham: pid,
                    phan_loai: String(i.variant || '').trim(),
                    ten_san_pham: p.ten_san_pham,
                    gia: Number(p.gia),
                    ton_kho: Number(p.ton_kho),
                    bieu_tuong: p.bieu_tuong,
                    anh_chinh: p.anh_chinh,
                    so_luong: qty,
                };
            })
            .filter(Boolean);
    } catch {
        return [];
    }
}

function saveGuestCart() {
    const raw = state.cart.map((i) => ({
        id: i.ma_san_pham,
        qty: i.so_luong,
        variant: i.phan_loai || '',
    }));
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(raw));
}

function goPage(name) {
    if (!['home', 'shop', 'services', 'orders', 'appointments', 'profile'].includes(name)) return;
    state.currentPage = name;
    $$('.page').forEach((el) => el.classList.toggle('active', el.id === 'page-' + name));
    $$('[data-page]').forEach((el) => {
        el.classList.toggle('active', el.dataset.page === name);
        el.setAttribute('aria-current', el.dataset.page === name ? 'page' : 'false');
    });
    $('#mainNav').classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (['orders', 'appointments', 'profile'].includes(name)) loadMemberData();
}

// ============================================================================
// AUTH & HEADER
// ============================================================================
async function loadAuth() {
    try {
        const res = await AppAPI.get('backend/auth/me.php');
        state.user = res.authenticated ? res.user : null;
    } catch {
        state.user = null;
    }
    renderAuthControls();
    await loadCustomerEmails();
}

function renderAuthControls() {
    const adminLink = $('#adminLink');
    const authLink = $('#authLink');
    const userBadge = $('#userBadge');
    const logoutBtn = $('#logoutBtn');
    const emailBtn = $('#emailInboxBtn');

    if (state.user) {
        const isStaff = ['admin', 'nhan_vien'].includes(state.user.role);
        adminLink.classList.toggle('hidden', !isStaff);
        authLink.classList.add('hidden');
        userBadge.classList.remove('hidden');
        const avt = (state.user.anh_dai_dien || '').trim();
        userBadge.innerHTML =
            (avt ? `<img class="head-user-avatar" src="${safe(avt)}" alt=""/>` : uiIcon('account')) +
            ' ' +
            safe(state.user.ho_ten);
        logoutBtn.classList.remove('hidden');
        emailBtn?.classList.remove('hidden');
    } else {
        adminLink.classList.add('hidden');
        authLink.classList.remove('hidden');
        userBadge.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        emailBtn?.classList.add('hidden');
    }
}

async function loadCustomerEmails() {
    if (!state.user) {
        state.emails = [];
        state.emailUnread = 0;
        renderEmailBadge();
        return;
    }
    try {
        const res = await AppAPI.get('backend/emails/index.php');
        state.emails = res.emails || [];
        state.emailUnread = Number(res.unread_count || 0);
    } catch {
        state.emails = [];
        state.emailUnread = 0;
    }
    renderEmailBadge();
}

function renderEmailBadge() {
    const badge = $('#emailUnreadBadge');
    if (!badge) return;
    badge.textContent = state.emailUnread;
    badge.classList.toggle('hidden', state.emailUnread <= 0);
}

function renderEmailInboxList() {
    const list = $('#emailInboxList');
    const cnt = $('#emailInboxCount');
    if (!list) return;
    if (cnt) cnt.textContent = `${state.emails.length} thông báo · ${state.emailUnread} chưa đọc`;

    list.innerHTML = state.emails.length
        ? state.emails
              .map((em) => {
                  const isUnread = Number(em.da_doc) === 0;
                  const pill =
                      em.loai === 'order_approved'
                          ? '<span class="email-type-pill approved">✓ Đã duyệt đơn</span>'
                          : em.loai === 'order_rejected'
                          ? '<span class="email-type-pill rejected">✕ Không duyệt đơn</span>'
                          : '<span class="email-type-pill general">Thông báo</span>';
                  return `
            <button type="button" class="email-row ${isUnread ? 'unread' : ''}" data-open-email="${em.ma_email}">
                <div class="email-row-top">
                    ${pill}
                    <small>${formatDateTime(em.ngay_gui)}${isUnread ? ' · <strong style="color:var(--pink-deep)">Mới</strong>' : ''}</small>
                </div>
                <strong>${safe(em.tieu_de)}</strong>
            </button>`;
              })
              .join('')
        : `<div class="empty">${uiIcon('bell', 'm-ico-empty')}<b>Chưa có thông báo nào</b></div>`;
}

async function openEmailInbox() {
    await loadCustomerEmails();
    $('#emailListView')?.classList.remove('hidden');
    $('#emailDetailView')?.classList.add('hidden');
    renderEmailInboxList();
    $('#emailInboxDialog')?.showModal();
}

async function openEmailDetail(emailId) {
    const em = state.emails.find((x) => Number(x.ma_email) === Number(emailId));
    if (!em) return;
    $('#emailListView')?.classList.add('hidden');
    $('#emailDetailView')?.classList.remove('hidden');
    $('#emailDetailSubject').textContent = em.tieu_de || '';
    $('#emailDetailMeta').textContent = formatDateTime(em.ngay_gui);
    $('#emailViewerFrame').srcdoc = em.noi_dung_html || '';

    if (Number(em.da_doc) === 0) {
        em.da_doc = 1;
        state.emailUnread = Math.max(0, state.emailUnread - 1);
        renderEmailBadge();
        try {
            await AppAPI.put('backend/emails/index.php', { ma_email: Number(em.ma_email) });
        } catch {}
    }
}

// ============================================================================
// CATEGORIES & PRODUCTS
// ============================================================================
async function loadCatalog() {
    const [catRes, prodRes, svcRes] = await Promise.all([
        AppAPI.get('backend/categories/index.php'),
        AppAPI.get('backend/products/index.php'),
        AppAPI.get('backend/services/index.php'),
    ]);
    state.categories = catRes.categories || [];
    state.products = prodRes.products || [];
    state.services = svcRes.services || [];

    renderCategories();
    renderShopFilters();
    renderProducts();
    renderServices();
}

function renderCategories() {
    const el = $('#homeCategories');
    if (!state.categories.length) {
        el.innerHTML = '<div class="empty" style="grid-column:1/-1">Chưa có danh mục sản phẩm.</div>';
        return;
    }
    el.innerHTML = state.categories
        .slice(0, 8)
        .map(
            (c) => `
        <button class="category" data-category="${safe(c.slug)}">
            <span class="category-icon">${
                c.hinh_anh
                    ? `<img src="${safe(c.hinh_anh)}" alt="${safe(c.ten_danh_muc)}" loading="lazy">`
                    : uiIcon(CAT_ICON_MAP[c.slug] || 'pet', 'm-ico-lg')
            }</span>
            <div>
                <h3>${safe(c.ten_danh_muc)}</h3>
                <span>${safe(c.mo_ta || c.so_san_pham + ' sản phẩm')}</span>
            </div>
        </button>`
        )
        .join('');
}

function renderShopFilters() {
    const container = $('#shopFilters');
    const chips = [
        `<button class="filter ${state.shopFilter === 'all' ? 'active' : ''}" data-filter="all">${uiIcon('pet')} Tất cả</button>`,
        ...state.categories.map(
            (c) =>
                `<button class="filter ${state.shopFilter === c.slug ? 'active' : ''}" data-filter="${safe(c.slug)}">${uiIcon(CAT_ICON_MAP[c.slug] || 'pet')} ${safe(c.ten_danh_muc)}</button>`
        ),
    ];
    container.innerHTML = chips.join('');
}

function productCardHtml(p) {
    const id = Number(p.ma_san_pham);
    const stock = Number(p.ton_kho);
    const isOut = stock <= 0;
    const saved = state.wish.includes(id);
    const rating = Number(p.diem_trung_binh || 0);
    const badgeCls = isOut ? 'out' : stock <= 5 ? 'low' : '';
    const badgeText = isOut ? 'Hết hàng' : stock <= 5 ? 'Sắp hết' : 'Đang bán';
    const visualInner = p.anh_chinh
        ? `<img src="${safe(p.anh_chinh)}" alt="${safe(p.ten_san_pham)}" loading="lazy">`
        : `<span class="product-art">${uiIcon('box', 'm-ico-lg')}</span>`;

    return `
    <article class="product-card ${isOut ? 'out-of-stock' : ''}">
        <div class="product-visual ${safe(p.danh_muc_slug)}" data-detail="${id}">
            <span class="prod-label ${badgeCls}">${badgeText}</span>
            <button class="wish ${saved ? 'saved' : ''}" data-wish="${id}" aria-label="Yêu thích">${saved ? '♥' : '♡'}</button>
            ${visualInner}
        </div>
        <div class="product-info">
            <div class="product-meta-row">
                <span class="product-category">${safe(p.ten_danh_muc)}${PET_TYPE_LABEL[p.loai_thu_cung] ? ' · ' + PET_TYPE_LABEL[p.loai_thu_cung] : ''}</span>
                ${rating > 0 ? `<span class="product-rating">★ ${rating.toFixed(1)}</span>` : ''}
            </div>
            <div class="product-name" data-detail="${id}">${safe(p.ten_san_pham)}</div>
            <div class="product-foot">
                <div class="product-price">
                    ${money(p.gia)}
                    <small>${isOut ? 'Tạm hết hàng' : `Còn ${stock} sản phẩm`}</small>
                </div>
                <div class="product-foot-actions">
                    <button class="add-btn" data-add="${id}" aria-label="Thêm vào giỏ hàng" title="Thêm vào giỏ hàng" ${isOut ? 'disabled' : ''}>+</button>
                    <button class="buy-now-btn" data-buy-now="${id}" type="button" ${isOut ? 'disabled' : ''}>Mua ngay</button>
                </div>
            </div>
        </div>
    </article>`;
}

function sortProductsByStock(items) {
    return [...items].sort((a, b) => {
        const aOut = Number(a.ton_kho) <= 0 ? 1 : 0;
        const bOut = Number(b.ton_kho) <= 0 ? 1 : 0;
        return aOut - bOut;
    });
}

function getFilteredProducts() {
    const kw = ($('#shopSearch').value || '').trim().toLowerCase();
    const filtered = state.products.filter((p) => {
        if (state.shopFilter !== 'all' && p.danh_muc_slug !== state.shopFilter) return false;
        if (state.petFilter !== 'all') {
            if (state.petFilter === 'cho' && !['cho', 'ca_hai'].includes(p.loai_thu_cung)) return false;
            if (state.petFilter === 'meo' && !['meo', 'ca_hai'].includes(p.loai_thu_cung)) return false;
            if (state.petFilter === 'ca_hai' && p.loai_thu_cung !== 'ca_hai') return false;
        }
        const price = Number(p.gia);
        if (state.priceFilter === 'under100' && price >= 100000) return false;
        if (state.priceFilter === '100to250' && (price < 100000 || price > 250000)) return false;
        if (state.priceFilter === 'over250' && price <= 250000) return false;
        if (kw) {
            const hay = (p.ten_san_pham + ' ' + (p.mo_ta || '') + ' ' + p.ten_danh_muc).toLowerCase();
            if (!hay.includes(kw)) return false;
        }
        return true;
    });
    return sortProductsByStock(filtered);
}

function renderProducts() {
    const featured = sortProductsByStock(state.products).slice(0, 6);
    $('#featuredProducts').innerHTML = featured.length
        ? featured.map(productCardHtml).join('')
        : `<div class="empty" style="grid-column:1/-1">${uiIcon('pet', 'm-ico-empty')}<b>Chưa có sản phẩm</b>Hãy thêm sản phẩm từ trang quản trị nhé.</div>`;

    const list = getFilteredProducts();
    $('#shopProducts').innerHTML = list.length
        ? list.map(productCardHtml).join('')
        : `<div class="empty" style="grid-column:1/-1">${uiIcon('search', 'm-ico-empty')}<b>Không có sản phẩm phù hợp</b>Thử thay đổi bộ lọc danh mục, loại thú cưng hoặc khoảng giá nhé.</div>`;
}

// ============================================================================
// PRODUCT VARIANT SELECTOR (SIZE, MÀU SẮC, KHỐI LƯỢNG, HƯƠNG VỊ, DUNG TÍCH...)
// ============================================================================
function getProductOptionSchema(p) {
    if (p?.tuy_chon?.groups?.length) return p.tuy_chon;
    return {
        groups: [
            {
                key: 'size',
                label: 'Kích cỡ (Size)',
                type: 'pill',
                required: true,
                choices: [
                    { value: 'Size S', label: 'Size S' },
                    { value: 'Size M', label: 'Size M' },
                    { value: 'Size L', label: 'Size L' },
                ],
            },
            {
                key: 'color',
                label: 'Màu sắc',
                type: 'color',
                required: true,
                choices: [
                    { value: 'Hồng phấn', label: 'Hồng phấn', hex: '#f49ab8' },
                    { value: 'Kem sữa', label: 'Kem sữa', hex: '#f5e6d0' },
                    { value: 'Xanh pastel', label: 'Xanh pastel', hex: '#9ecae1' },
                ],
            },
        ],
    };
}

function renderVariantGroupsHtml(product, scope = 'modal') {
    const schema = getProductOptionSchema(product);
    const groupsHtml = (schema.groups || [])
        .map(
            (g) => `
        <div class="variant-group" data-vgroup="${safe(g.key)}" data-vlabel="${safe(g.label)}" data-vscope="${scope}">
            <div class="variant-group-label">
                <span>${safe(g.label)} ${g.required ? '*' : ''}</span>
                <span class="picked" data-vpicked="${safe(g.key)}">Chưa chọn</span>
            </div>
            <div class="variant-pills">
                ${(g.choices || [])
                    .map(
                        (ch) => `
                    <button type="button" class="variant-pill" data-vopt="${safe(g.key)}" data-vval="${safe(ch.value)}" data-vscope="${scope}">
                        ${ch.hex ? `<span class="variant-color-dot" style="background:${safe(ch.hex)}"></span>` : ''}
                        <span>${safe(ch.label || ch.value)}</span>
                    </button>`
                    )
                    .join('')}
            </div>
        </div>`
        )
        .join('');

    const noteHtml = schema.note_field
        ? `<div class="field" style="margin-bottom:10px">
               <label>${safe(schema.note_field.label)}</label>
               <input type="text" class="variant-custom-note" data-vnote="${scope}" maxlength="80" placeholder="${safe(schema.note_field.placeholder || '')}"/>
           </div>`
        : '';

    return groupsHtml + noteHtml;
}

function collectVariantSelection(containerEl, product) {
    const schema = getProductOptionSchema(product);
    const parts = [];
    const missing = [];

    (schema.groups || []).forEach((g) => {
        const groupEl = containerEl.querySelector(`.variant-group[data-vgroup="${g.key}"]`);
        const activeBtn = groupEl?.querySelector('.variant-pill.active');
        if (activeBtn) {
            groupEl?.classList.remove('needs-pick');
            parts.push(`${g.label.replace(/\s*\([^)]*\)/g, '')}: ${activeBtn.dataset.vval}`);
        } else if (g.required) {
            groupEl?.classList.add('needs-pick');
            missing.push(g.label);
        }
    });

    const noteVal = (containerEl.querySelector('.variant-custom-note')?.value || '').trim();
    if (noteVal) {
        parts.push(`Khắc/Ghi chú: ${noteVal}`);
    }

    return {
        ok: missing.length === 0,
        missing,
        phan_loai: parts.join(' · '),
    };
}

function updateVariantModalSummary() {
    const p = state.activeVariantProduct;
    if (!p) return;
    const qtyEl = $('#variantQty');
    const maxStock = Math.max(1, Number(p.ton_kho || 1));
    let qty = Math.max(1, Math.min(maxStock, Number(qtyEl.value || 1)));
    qtyEl.value = qty;
    $('#variantSubtotal').textContent = money(Number(p.gia) * qty);
}

function setVariantError(msg = '') {
    const box = $('#variantError');
    if (!box) return;
    if (msg) {
        box.textContent = msg;
        box.classList.remove('hidden');
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        box.textContent = '';
        box.classList.add('hidden');
    }
}

async function openVariantModal(productId, initialQty = 1, mode = 'add') {
    const pid = Number(productId);
    let p = state.products.find((x) => Number(x.ma_san_pham) === pid);
    if (!p || !p.tuy_chon) {
        try {
            const res = await AppAPI.get('backend/products/index.php?id=' + encodeURIComponent(pid));
            p = res.product;
        } catch (err) {
            toast(err.message);
            return;
        }
    }
    if (!p || Number(p.ton_kho) <= 0) {
        toast('Sản phẩm này hiện đã hết hàng.');
        return;
    }

    state.activeVariantProduct = p;
    state.activeVariantMode = mode === 'buy' ? 'buy' : 'add';
    setVariantError('');

    const isBuy = state.activeVariantMode === 'buy';
    $('#variantAddBtn')?.classList.toggle('hidden', isBuy);
    $('#variantBuyNowBtn')?.classList.toggle('hidden', !isBuy);

    const stock = Number(p.ton_kho);
    $('#variantModalTitle').textContent = 'Chọn phân loại sản phẩm';
    const subEl = $('#variantModalSubtitle');
    if (subEl) {
        subEl.textContent = isBuy
            ? 'Hãy chọn size, màu sắc hoặc quy cách phù hợp cho bé trước khi mua ngay.'
            : 'Hãy chọn size, màu sắc hoặc quy cách phù hợp cho bé trước khi thêm vào giỏ hàng.';
    }
    $('#variantProductCard').innerHTML = `
        ${p.anh_chinh ? `<img src="${safe(p.anh_chinh)}" alt="${safe(p.ten_san_pham)}">` : uiIcon('box', 'm-ico-lg')}
        <div>
            <strong>${safe(p.ten_san_pham)}</strong>
            <small>${money(p.gia)} · ${safe(p.ten_danh_muc || '')} ${PET_TYPE_LABEL[p.loai_thu_cung] ? '· ' + PET_TYPE_LABEL[p.loai_thu_cung] : ''}</small>
        </div>`;

    $('#variantOptionsContainer').innerHTML = renderVariantGroupsHtml(p, 'modal');
    $('#variantQty').max = String(stock);
    $('#variantQty').value = String(Math.min(stock, Math.max(1, Number(initialQty) || 1)));
    $('#variantStockHint').textContent = `Còn ${stock} sản phẩm trong kho`;
    updateVariantModalSummary();

    $('#variantDialog').showModal();
}

// ============================================================================
// PRODUCT DETAIL & REVIEWS
// ============================================================================
async function openProductDetail(id) {
    try {
        const res = await AppAPI.get('backend/products/index.php?id=' + encodeURIComponent(id));
        const p = res.product;
        state.activeDetailProduct = p;

        const stock = Number(p.ton_kho);
        const pic = p.anh_chinh
            ? `<img src="${safe(p.anh_chinh)}" alt="${safe(p.ten_san_pham)}">`
            : uiIcon('box', 'm-ico-lg');

        const reviewsHtml = (p.danh_gia || []).length
            ? p.danh_gia
                  .map(
                      (r) => `
                <div class="review-item">
                    <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:4px">
                        <strong>${safe(r.ho_ten)}</strong>
                        <span class="review-stars">${'★'.repeat(Number(r.so_sao))}${'☆'.repeat(5 - Number(r.so_sao))}</span>
                    </div>
                    <div>${safe(r.noi_dung)}</div>
                    ${r.hinh_anh ? `<a href="${safe(r.hinh_anh)}" target="_blank" rel="noopener"><img class="review-photo" src="${safe(r.hinh_anh)}" alt="Ảnh đánh giá sản phẩm"></a>` : ''}
                    <small style="color:#b09fb0">${formatDateTime(r.ngay_tao)}</small>
                </div>`
                  )
                  .join('')
            : '<p class="hint">Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên chia sẻ nhé!</p>';

        $('#productDetailBody').innerHTML = `
            <div class="detail-hero">
                <div class="detail-pic">${pic}</div>
                <div>
                    <div class="product-category">${safe(p.ten_danh_muc)} · ${PET_TYPE_LABEL[p.loai_thu_cung] || ''}</div>
                    <h3 style="margin:6px 0 8px;font-size:18px">${safe(p.ten_san_pham)}</h3>
                    <div style="font-size:20px;font-weight:900;color:var(--pink-deep)">${money(p.gia)}</div>
                    <small style="color:#8f7e90">Tình trạng: ${stock > 0 ? `Còn ${stock} sản phẩm trong kho` : 'Tạm hết hàng'}</small>
                </div>
            </div>
            <div class="detail-desc">${safe(p.mo_ta || 'Sản phẩm chính hãng dành cho thú cưng tại Góc nhỏ có em.')}</div>
            ${
                stock > 0
                    ? `<div class="detail-variants-box" id="detailVariantsBox">
                           ${renderVariantGroupsHtml(p, 'detail')}
                       </div>
                       <div class="modal-alert hidden" id="detailVariantError" role="alert"></div>`
                    : ''
            }
            <div class="detail-action-row">
                <input id="detailQty" type="number" min="1" max="${Math.max(1, stock)}" value="1"
                       style="width:70px;height:42px;border-radius:11px;border:1px solid #eadce4;text-align:center;font-weight:800" ${stock <= 0 ? 'disabled' : ''}>
                <button class="btn btn-outline" id="detailAddBtn" type="button" ${stock <= 0 ? 'disabled' : ''}>
                    ${stock > 0 ? `${uiIcon('bag')} Thêm vào giỏ hàng` : 'Hết hàng'}
                </button>
                <button class="btn btn-primary" id="detailBuyNowBtn" type="button" ${stock <= 0 ? 'disabled' : ''}>
                    ${stock > 0 ? 'Mua ngay' : 'Hết hàng'}
                </button>
            </div>
            <div class="review-box">
                <h4 style="margin:0 0 10px;font-size:14px">⭐ Đánh giá khách hàng (${(p.danh_gia || []).length})</h4>
                <div id="detailReviewsList">${reviewsHtml}</div>
                ${
                    state.user
                        ? `<form id="productReviewForm" style="margin-top:12px">
                            <div class="form-grid">
                                <div class="field" style="margin-bottom:8px">
                                    <label>Chấm sao</label>
                                    <select name="so_sao">
                                        <option value="5">★★★★★ (5 sao - Tuyệt vời)</option>
                                        <option value="4">★★★★☆ (4 sao - Rất tốt)</option>
                                        <option value="3">★★★☆☆ (3 sao - Ổn)</option>
                                        <option value="2">★★☆☆☆ (2 sao)</option>
                                        <option value="1">★☆☆☆☆ (1 sao)</option>
                                    </select>
                                </div>
                                <div class="field" style="margin-bottom:8px;justify-content:end">
                                    <button class="btn btn-outline" type="submit" style="height:42px">Gửi đánh giá</button>
                                </div>
                            </div>
                            <div class="field" style="margin-bottom:0">
                                <textarea name="noi_dung" rows="2" required placeholder="Chia sẻ cảm nhận của bé sau khi sử dụng..."></textarea>
                            </div>
                        </form>`
                        : `<p class="hint">Vui lòng <a href="auth.html" style="color:var(--pink-deep);font-weight:800">đăng nhập</a> để viết đánh giá sản phẩm.</p>`
                }
            </div>`;

        $('#detailAddBtn')?.addEventListener('click', async () => {
            const box = $('#detailVariantsBox');
            const errBox = $('#detailVariantError');
            const check = box ? collectVariantSelection(box, p) : { ok: true, missing: [], phan_loai: '' };
            if (!check.ok) {
                if (errBox) {
                    errBox.textContent = 'Vui lòng chọn: ' + check.missing.join(', ') + ' trước khi thêm vào giỏ hàng nhé!';
                    errBox.classList.remove('hidden');
                    errBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
                return;
            }
            if (errBox) errBox.classList.add('hidden');
            const qty = Math.max(1, Number($('#detailQty')?.value || 1));
            const ok = await addToCart(p.ma_san_pham, qty, check.phan_loai);
            if (ok) $('#productDetailDialog').close();
        });

        $('#detailBuyNowBtn')?.addEventListener('click', () => {
            const box = $('#detailVariantsBox');
            const errBox = $('#detailVariantError');
            const check = box ? collectVariantSelection(box, p) : { ok: true, missing: [], phan_loai: '' };
            if (!check.ok) {
                if (errBox) {
                    errBox.textContent = 'Vui lòng chọn: ' + check.missing.join(', ') + ' trước khi mua ngay nhé!';
                    errBox.classList.remove('hidden');
                    errBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
                return;
            }
            if (errBox) errBox.classList.add('hidden');
            const qty = Math.max(1, Math.min(stock, Number($('#detailQty')?.value || 1)));
            $('#productDetailDialog').close();
            startBuyNow(p, qty, check.phan_loai);
        });

        $('#productReviewForm')?.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const fd = new FormData(ev.target);
            try {
                const r = await AppAPI.post('backend/reviews/index.php', {
                    ma_san_pham: p.ma_san_pham,
                    so_sao: Number(fd.get('so_sao')),
                    noi_dung: String(fd.get('noi_dung')).trim(),
                });
                toast(r.message);
                await loadCatalog();
                await openProductDetail(p.ma_san_pham);
            } catch (err) {
                toast(err.message);
            }
        });

        $('#productDetailDialog').showModal();
    } catch (err) {
        toast(err.message);
    }
}

// ============================================================================
// CART (DB-SYNCED FOR LOGGED IN USERS, LOCAL FALLBACK FOR GUESTS)
// ============================================================================
function cartItemKey(item) {
    if (!item) return '';
    return item.ma_chi_tiet ? 'd:' + item.ma_chi_tiet : `${item.ma_san_pham}::${item.phan_loai || ''}`;
}

function syncCartSelection(autoSelectKeys = []) {
    const validKeys = new Set(state.cart.map(cartItemKey));
    if (!state.cartSelectionInitialized) {
        state.cartSelectedKeys = new Set(validKeys);
        state.cartSelectionInitialized = true;
    } else {
        // Loại bỏ key của các sản phẩm đã bị xóa khỏi giỏ
        state.cartSelectedKeys = new Set([...state.cartSelectedKeys].filter((k) => validKeys.has(k)));
        autoSelectKeys.forEach((k) => {
            if (validKeys.has(k)) state.cartSelectedKeys.add(k);
        });
    }
}

function getSelectedCartItems() {
    return state.cart.filter((i) => state.cartSelectedKeys.has(cartItemKey(i)));
}

function toggleCartItem(idx) {
    const item = state.cart[Number(idx)];
    if (!item) return;
    const key = cartItemKey(item);
    if (state.cartSelectedKeys.has(key)) {
        state.cartSelectedKeys.delete(key);
    } else {
        state.cartSelectedKeys.add(key);
    }
    renderCart();
}

function toggleSelectAllCart(checked) {
    if (checked) {
        state.cartSelectedKeys = new Set(state.cart.map(cartItemKey));
    } else {
        state.cartSelectedKeys.clear();
    }
    renderCart();
}

async function deleteSelectedCartItems() {
    const selected = getSelectedCartItems();
    if (!selected.length) return;
    const count = selected.length;

    if (state.user) {
        const ids = selected.map((i) => i.ma_chi_tiet).filter(Boolean);
        try {
            const res = ids.length
                ? await AppAPI.del('backend/cart/index.php?ids=' + encodeURIComponent(ids.join(',')))
                : await AppAPI.del('backend/cart/index.php');
            state.cart = res.items || [];
            syncCartSelection();
            renderCart();
            toast(`Đã xóa ${count} sản phẩm đã chọn khỏi giỏ hàng.`);
        } catch (err) {
            toast(err.message);
        }
        return;
    }

    const delKeys = new Set(selected.map(cartItemKey));
    state.cart = state.cart.filter((i) => !delKeys.has(cartItemKey(i)));
    syncCartSelection();
    saveGuestCart();
    renderCart();
    toast(`Đã xóa ${count} sản phẩm đã chọn khỏi giỏ hàng.`);
}

async function loadCart() {
    if (state.user) {
        try {
            const res = await AppAPI.get('backend/cart/index.php');
            state.cart = res.items || [];
        } catch {
            state.cart = [];
        }
    } else {
        state.cart = loadGuestCart();
    }
    syncCartSelection();
    renderCart();
}

function cartTotalAmount() {
    return getSelectedCartItems().reduce((sum, i) => sum + Number(i.gia) * Number(i.so_luong), 0);
}

function renderCart() {
    syncCartSelection();
    const totalCount = state.cart.reduce((s, i) => s + Number(i.so_luong), 0);
    const selectedItems = getSelectedCartItems();
    const selectedQty = selectedItems.reduce((s, i) => s + Number(i.so_luong), 0);
    const allChecked = state.cart.length > 0 && selectedItems.length === state.cart.length;
    const someChecked = selectedItems.length > 0 && selectedItems.length < state.cart.length;

    $('#cartBadge').textContent = totalCount;
    const cartTitleEl = $('#cartTitle');
    if (cartTitleEl) cartTitleEl.textContent = `Giỏ hàng (${state.cart.length})`;
    $('#cartTotal').textContent = money(cartTotalAmount());

    const totalLabel = $('#cartTotalLabel');
    if (totalLabel) {
        totalLabel.textContent = selectedQty > 0
            ? `Tạm tính (${selectedQty} sản phẩm đã chọn)`
            : 'Chưa chọn sản phẩm nào';
    }

    const toolbar = $('#cartToolbar');
    if (toolbar) {
        toolbar.classList.toggle('hidden', state.cart.length === 0);
        const selAll = $('#cartSelectAll');
        if (selAll) {
            selAll.checked = allChecked;
            selAll.indeterminate = someChecked;
        }
        const selAllLabel = $('#cartSelectAllLabel');
        if (selAllLabel) {
            selAllLabel.textContent = `Chọn tất cả (${selectedItems.length}/${state.cart.length})`;
        }
        const delBtn = $('#cartDeleteSelectedBtn');
        const delLbl = $('#cartDeleteSelectedLabel');
        if (delBtn) delBtn.disabled = selectedItems.length === 0;
        if (delLbl) delLbl.textContent = selectedItems.length ? `Xóa đã chọn (${selectedItems.length})` : 'Xóa đã chọn';
    }

    const checkoutBtn = $('#checkoutOpen');
    checkoutBtn.disabled = selectedItems.length === 0;
    if (selectedItems.length === 0) {
        checkoutBtn.textContent = state.cart.length ? 'Vui lòng chọn sản phẩm cần thanh toán' : 'Thanh toán';
    } else {
        checkoutBtn.textContent = state.user
            ? `Thanh toán (${selectedQty})`
            : `Đăng nhập / Đăng ký để thanh toán (${selectedQty})`;
    }

    const noteEl = $('#cartPanel .drawer-bottom small');
    if (noteEl) {
        noteEl.textContent = state.user
            ? 'Chọn sản phẩm cần thanh toán rồi bấm Thanh toán · Hỗ trợ giao Nhanh/Thường & QR/COD'
            : 'Khách hàng cần đăng nhập hoặc đăng ký tài khoản để đặt hàng (giỏ hàng sẽ được tự động lưu lại)';
    }

    $('#cartContents').innerHTML = state.cart.length
        ? state.cart
              .map((i, idx) => {
                  const isChecked = state.cartSelectedKeys.has(cartItemKey(i));
                  return `
            <div class="cart-item ${isChecked ? 'selected' : 'unselected'}">
                <div class="cart-item-check-wrap">
                    <input type="checkbox" class="cart-check" data-cart-check="${idx}" ${isChecked ? 'checked' : ''} aria-label="Chọn ${safe(i.ten_san_pham)}"/>
                </div>
                <div class="cart-thumb" data-cart-toggle="${idx}">${i.anh_chinh ? `<img src="${safe(i.anh_chinh)}" alt="">` : uiIcon('box', 'm-ico-md')}</div>
                <div class="cart-details">
                    <strong data-cart-toggle="${idx}">${safe(i.ten_san_pham)}</strong>
                    ${i.phan_loai ? `<div class="cart-variant-tag">${safe(i.phan_loai)}</div>` : ''}
                    <div class="price">${money(Number(i.gia) * Number(i.so_luong))}</div>
                    <div class="qty">
                        <button data-qty-idx="${idx}" data-delta="-1" aria-label="Giảm">−</button>
                        <span>${i.so_luong}</span>
                        <button data-qty-idx="${idx}" data-delta="1" aria-label="Tăng">+</button>
                        <button class="delete" data-remove-idx="${idx}" type="button">${uiIcon('trash')} Xóa</button>
                    </div>
                </div>
            </div>`;
              })
              .join('')
        : `<div class="empty">${uiIcon('bag', 'm-ico-empty')}<b>Giỏ hàng còn trống</b>Hãy chọn món gì đó xinh xắn cho bé nhé!</div>`;
}

async function addToCart(productId, qty = 1, phanLoai = '', silent = false) {
    const pid = Number(productId);
    const variant = String(phanLoai || '').trim();

    if (state.user) {
        try {
            const res = await AppAPI.post('backend/cart/index.php', {
                ma_san_pham: pid,
                so_luong: qty,
                phan_loai: variant,
            });
            state.cart = res.items || [];
            const added = state.cart.find((x) => Number(x.ma_san_pham) === pid && (x.phan_loai || '') === variant);
            syncCartSelection(added ? [cartItemKey(added)] : []);
            renderCart();
            if (!silent) toast(res.message || 'Đã thêm vào giỏ hàng.');
            return true;
        } catch (err) {
            if (!silent) {
                setVariantError(err.message);
                toast(err.message);
            }
            return false;
        }
    }

    const p = state.products.find((x) => Number(x.ma_san_pham) === pid);
    if (!p || Number(p.ton_kho) <= 0) {
        if (!silent) toast('Sản phẩm này đã hết hàng.');
        return false;
    }
    const existing = state.cart.find((x) => x.ma_san_pham === pid && (x.phan_loai || '') === variant);
    const otherQty = state.cart
        .filter((x) => x.ma_san_pham === pid && x !== existing)
        .reduce((s, x) => s + Number(x.so_luong), 0);
    const desired = (existing ? existing.so_luong : 0) + qty;
    if (otherQty + desired > Number(p.ton_kho)) {
        const msg = `Không thể thêm vượt quá tồn kho (${p.ton_kho}).`;
        if (!silent) {
            setVariantError(msg);
            toast(msg);
        }
        return false;
    }
    let addedItem = existing;
    if (existing) {
        existing.so_luong = desired;
    } else {
        addedItem = {
            ma_san_pham: pid,
            phan_loai: variant,
            ten_san_pham: p.ten_san_pham,
            gia: Number(p.gia),
            ton_kho: Number(p.ton_kho),
            bieu_tuong: p.bieu_tuong,
            anh_chinh: p.anh_chinh,
            so_luong: qty,
        };
        state.cart.push(addedItem);
    }
    syncCartSelection([cartItemKey(addedItem)]);
    saveGuestCart();
    renderCart();
    if (!silent) toast(`Đã thêm ${p.ten_san_pham}${variant ? ` (${variant})` : ''} vào giỏ hàng.`);
    return true;
}

async function updateCartQtyByIndex(idx, delta) {
    const item = state.cart[Number(idx)];
    if (!item) return;
    const nextQty = item.so_luong + delta;

    if (state.user) {
        try {
            const payload = item.ma_chi_tiet
                ? { ma_chi_tiet: item.ma_chi_tiet, so_luong: nextQty }
                : { ma_san_pham: item.ma_san_pham, phan_loai: item.phan_loai || '', so_luong: nextQty };
            const res = await AppAPI.put('backend/cart/index.php', payload);
            state.cart = res.items || [];
            syncCartSelection();
            renderCart();
        } catch (err) {
            toast(err.message);
        }
        return;
    }

    const otherQty = state.cart
        .filter((x) => x.ma_san_pham === item.ma_san_pham && x !== item)
        .reduce((s, x) => s + Number(x.so_luong), 0);
    if (otherQty + nextQty > item.ton_kho) {
        toast('Đã đạt giới hạn số lượng tồn kho.');
        return;
    }
    if (nextQty <= 0) {
        state.cart.splice(Number(idx), 1);
    } else {
        item.so_luong = nextQty;
    }
    syncCartSelection();
    saveGuestCart();
    renderCart();
}

async function removeCartItemByIndex(idx) {
    const item = state.cart[Number(idx)];
    if (!item) return;
    if (state.user) {
        const qs = item.ma_chi_tiet
            ? 'ma_chi_tiet=' + encodeURIComponent(item.ma_chi_tiet)
            : 'ma_san_pham=' + encodeURIComponent(item.ma_san_pham);
        const res = await AppAPI.del('backend/cart/index.php?' + qs);
        state.cart = res.items || [];
        syncCartSelection();
        renderCart();
        return;
    }
    state.cart.splice(Number(idx), 1);
    syncCartSelection();
    saveGuestCart();
    renderCart();
}

function openCart() {
    renderCart();
    $('#overlay').classList.add('show');
    $('#cartPanel').classList.add('open');
    $('#cartPanel').setAttribute('aria-hidden', 'false');
}

function closeCart() {
    $('#overlay').classList.remove('show');
    $('#cartPanel').classList.remove('open');
    $('#cartPanel').setAttribute('aria-hidden', 'true');
}

function getCheckoutShippingMethod() {
    return $('#checkoutForm input[name="phuong_thuc_van_chuyen"]:checked')?.value || 'standard';
}

function getCheckoutPaymentMethod() {
    return $('#checkoutForm input[name="phuong_thuc"]:checked')?.value || 'cod';
}

function calcCheckoutShippingFee(subtotal, method) {
    if (method === 'express') return 35000;
    return subtotal >= 500000 ? 0 : 20000;
}

function setCheckoutError(msg = '') {
    const box = $('#checkoutError');
    if (!box) return;
    if (msg) {
        box.textContent = msg;
        box.classList.remove('hidden');
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        box.textContent = '';
        box.classList.add('hidden');
    }
}

function getActiveCheckoutItems() {
    if (Array.isArray(state.checkoutOverrideItems) && state.checkoutOverrideItems.length) {
        return state.checkoutOverrideItems;
    }
    return getSelectedCartItems();
}

function activeCheckoutSubtotal() {
    return getActiveCheckoutItems().reduce((sum, i) => sum + Number(i.gia) * Number(i.so_luong), 0);
}

function updateCheckoutTotals() {
    const subtotal = activeCheckoutSubtotal();
    const shipMethod = getCheckoutShippingMethod();
    const payMethod = getCheckoutPaymentMethod();
    const standardFee = calcCheckoutShippingFee(subtotal, 'standard');
    const shipFee = calcCheckoutShippingFee(subtotal, shipMethod);
    const grandTotal = subtotal + shipFee;

    // Cập nhật trạng thái active cho các thẻ radio vận chuyển & thanh toán
    $$('#checkoutShippingWrap .choice-card').forEach((card) => {
        const inp = card.querySelector('input[type="radio"]');
        card.classList.toggle('active', Boolean(inp?.checked));
    });
    $$('#checkoutPaymentWrap .choice-card').forEach((card) => {
        const inp = card.querySelector('input[type="radio"]');
        card.classList.toggle('active', Boolean(inp?.checked));
    });

    const stdFeeEl = $('#shipFeeStandard');
    if (stdFeeEl) stdFeeEl.textContent = standardFee === 0 ? 'Miễn phí' : money(standardFee);

    $('#coSubtotal').textContent = money(subtotal);
    $('#coShipLabel').textContent =
        shipMethod === 'express' ? 'Phí vận chuyển (Giao hàng nhanh)' : 'Phí vận chuyển (Giao hàng thường)';
    $('#coShipFee').textContent = shipFee === 0 ? 'Miễn phí' : money(shipFee);
    $('#coGrandTotal').textContent = money(grandTotal);

    const qrBox = $('#checkoutQrBox');
    if (qrBox) {
        const showQr = payMethod === 'bank_transfer';
        qrBox.classList.toggle('hidden', !showQr);
        if (showQr) {
            const phone = ($('#checkoutPhone')?.value || state.user?.so_dien_thoai || '').replace(/\D+/g, '');
            const s = state.storeSettings || {};
            const savedNote = (s.bank_transfer_note || '').trim();
            const memo = savedNote || (phone ? `GNCE ${phone}` : 'GNCE THANH TOAN');
            $('#qrPayAmount').textContent = money(grandTotal);
            $('#qrPayMemo').textContent = memo;
            renderDynamicQrInto($('#checkoutQrBox .js-store-qr-frame'), {
                bankName: s.bank_name || 'Vietcombank (VCB)',
                accountNo: s.bank_account_no || '1028 6688 9999',
                accountName: s.bank_account_name || 'GOC NHO CO EM',
                amount: grandTotal,
                addInfo: memo,
                fallbackImg: (s.bank_qr_image || '').trim(),
            });
        }
    }
}

function startBuyNow(product, qty = 1, phanLoai = '') {
    if (!product || Number(product.ton_kho) <= 0) {
        toast('Sản phẩm này hiện đã hết hàng.');
        return;
    }
    const safeQty = Math.max(1, Math.min(Number(product.ton_kho), Number(qty) || 1));
    const item = {
        ma_san_pham: Number(product.ma_san_pham),
        ten_san_pham: product.ten_san_pham,
        phan_loai: String(phanLoai || '').trim(),
        gia: Number(product.gia),
        ton_kho: Number(product.ton_kho),
        bieu_tuong: product.bieu_tuong,
        anh_chinh: product.anh_chinh,
        so_luong: safeQty,
    };

    if (!state.user) {
        sessionStorage.setItem(BUY_NOW_KEY, JSON.stringify(item));
        toast('Vui lòng đăng nhập hoặc đăng ký tài khoản để mua ngay nhé!');
        setTimeout(() => {
            location.href = 'auth.html?reason=checkout_required&next=' + encodeURIComponent('customer.html#buynow');
        }, 650);
        return;
    }

    openCheckout([item]);
}

function openCheckout(overrideItems = null) {
    state.checkoutOverrideItems = Array.isArray(overrideItems) && overrideItems.length ? overrideItems : null;
    const selected = getActiveCheckoutItems();
    if (!selected.length) {
        toast('Vui lòng tick chọn ít nhất 1 sản phẩm cần thanh toán trong giỏ hàng!');
        return;
    }
    if (!state.user) {
        saveGuestCart();
        closeCart();
        toast('Vui lòng đăng nhập hoặc đăng ký tài khoản để đặt hàng nhé!');
        setTimeout(() => {
            location.href = 'auth.html?reason=checkout_required&next=' + encodeURIComponent('customer.html#checkout');
        }, 650);
        return;
    }
    closeCart();
    setCheckoutError('');

    // 1. Thông tin khách hàng
    $('#checkoutName').value = state.user.ho_ten || '';
    $('#checkoutPhone').value = state.user.so_dien_thoai || '';
    $('#checkoutAddress').value = state.user.dia_chi || '';
    $('#checkoutNote').value = '';

    // 2. Danh sách sản phẩm đã chọn thanh toán
    const totalQty = selected.reduce((s, i) => s + Number(i.so_luong), 0);
    $('#checkoutItemCount').textContent = `${totalQty} món`;
    $('#checkoutItemsList').innerHTML = selected
        .map(
            (i) => `
        <div class="checkout-item-row">
            <div class="checkout-item-thumb">${i.anh_chinh ? `<img src="${safe(i.anh_chinh)}" alt="">` : uiIcon('box', 'm-ico-md')}</div>
            <div class="checkout-item-info">
                <strong>${safe(i.ten_san_pham)}</strong>
                ${i.phan_loai ? `<span class="cart-variant-tag">${safe(i.phan_loai)}</span>` : ''}
                <small>${money(i.gia)} × ${i.so_luong}</small>
            </div>
            <div class="checkout-item-price">
                <strong>${money(Number(i.gia) * Number(i.so_luong))}</strong>
            </div>
        </div>`
        )
        .join('');

    // 3 & 4. Mặc định Giao hàng thường & Thanh toán khi nhận hàng
    const stdRadio = $('#checkoutForm input[name="phuong_thuc_van_chuyen"][value="standard"]');
    const codRadio = $('#checkoutForm input[name="phuong_thuc"][value="cod"]');
    const qrPaidChk = $('#checkoutQrPaid');
    if (stdRadio) stdRadio.checked = true;
    if (codRadio) codRadio.checked = true;
    if (qrPaidChk) qrPaidChk.checked = false;
    updateCheckoutTotals();

    $('#checkoutDialog').showModal();
}

// ============================================================================
// SERVICES & APPOINTMENTS
// ============================================================================
function renderServices() {
    const grid = $('#servicesGrid');
    grid.innerHTML = state.services.length
        ? state.services
              .map((s) => {
                  const rating = Number(s.diem_trung_binh || 0);
                  const hasPrice = Number(s.gia) > 0;
                  const coverHtml = s.hinh_anh
                      ? `<div class="service-cover"><img src="${safe(s.hinh_anh)}" alt="${safe(s.ten_dich_vu)}" loading="lazy"></div>`
                      : `<div class="service-body" style="padding-bottom:0"><div class="service-emoji">${uiIcon('spa', 'm-ico-lg')}</div></div>`;
                  const priceRowHtml = hasPrice
                      ? `${money(s.gia)} <small>· ${s.thoi_luong} phút ${rating > 0 ? `· ★ ${rating.toFixed(1)}` : ''}</small>`
                      : `<span class="no-price-meta">${uiIcon('clock')} Thời lượng ${s.thoi_luong} phút ${rating > 0 ? `· ★ ${rating.toFixed(1)}` : ''}</span>`;
                  return `
            <article class="service-card">
                ${coverHtml}
                <div class="service-body">
                    <h3>${safe(s.ten_dich_vu)}</h3>
                    <p>${safe(s.mo_ta || '')}</p>
                    <div class="service-price">
                        ${priceRowHtml}
                    </div>
                    <div class="service-actions">
                        <button class="btn btn-primary" data-book="${s.ma_dich_vu}">${uiIcon('booking')} Đặt lịch ngay</button>
                        <button class="btn btn-outline btn-sm" data-svc-review="${s.ma_dich_vu}">${uiIcon('review')} Đánh giá</button>
                    </div>
                </div>
            </article>`;
              })
              .join('')
        : '<div class="empty" style="grid-column:1/-1">Chưa có dịch vụ nào đang mở.</div>';
}

function todayYMD(offsetDays = 0) {
    const d = new Date(Date.now() + offsetDays * 86400000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function setBookingError(msg = '', highlightSlots = false) {
    const box = $('#bookingError');
    const grid = $('#bookingSlotsGrid');
    if (grid) grid.classList.toggle('needs-pick', Boolean(highlightSlots));
    if (!box) return;
    if (msg) {
        box.textContent = msg;
        box.classList.remove('hidden');
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        box.textContent = '';
        box.classList.add('hidden');
    }
}

async function loadBookingSlots(autoFallbackTomorrow = false, keepError = false) {
    const serviceId = Number($('#bookingService').value || 0);
    const dateVal = $('#bookingDateOnly').value || todayYMD(0);
    const grid = $('#bookingSlotsGrid');
    const meta = $('#bookingSlotMeta');
    const noteBox = $('#bookingScheduleNote');
    const advBox = $('#bookingAdvisory');
    const petId = ($('#bookingSavedPet')?.value || '').trim();
    const petName = ($('#bookingPet')?.value || '').trim();
    $('#bookingSlotValue').value = '';
    if (!keepError) setBookingError('', false);

    if (!serviceId) return;
    grid.innerHTML = '<div class="slot-loading">Đang kiểm tra khung giờ trống...</div>';

    try {
        const qs = new URLSearchParams({
            action: 'slots',
            ma_dich_vu: String(serviceId),
            date: dateVal,
        });
        if (petId) qs.set('ma_thu_cung', petId);
        if (petName) qs.set('ten_thu_cung', petName);

        const res = await AppAPI.get('backend/appointments/index.php?' + qs.toString());
        const slots = res.slots || [];
        const svc = res.service || {};

        // Nếu hôm nay đã qua toàn bộ khung giờ, tự động gợi ý chuyển sang ngày mai
        if (autoFallbackTomorrow && dateVal === todayYMD(0) && slots.length && slots.every((s) => s.status === 'past')) {
            const tomorrow = todayYMD(1);
            $('#bookingDateOnly').value = tomorrow;
            $('#bookingDateVN').value = ymdToDMY(tomorrow);
            await loadBookingSlots(false, keepError);
            return;
        }

        meta.textContent = `(${svc.thoi_luong || 45} phút · tối đa ${svc.max_per_slot || 4} lượt/khung)`;

        if (noteBox) {
            noteBox.textContent = '';
            noteBox.classList.add('hidden');
        }
        if (advBox) {
            if (res.advisory) {
                advBox.textContent = res.advisory;
                advBox.classList.remove('hidden');
            } else {
                advBox.textContent = '';
                advBox.classList.add('hidden');
            }
        }

        grid.innerHTML = slots.length
            ? slots
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
                      return `
                    <button type="button" class="slot-btn ${safe(s.status)}" data-pick-slot="${safe(s.datetime)}" ${titleAttr} ${disabled}>
                        <strong>${safe(s.label)}</strong>
                        <span class="slot-badge">${badge}</span>
                    </button>`;
                  })
                  .join('')
            : '<div class="slot-loading">Chưa có khung giờ hỗ trợ cho ngày này.</div>';
    } catch (err) {
        grid.innerHTML = `<div class="slot-loading">${safe(err.message)}</div>`;
    }
}

async function openBookingModal(serviceId) {
    if (!state.user) {
        toast('Vui lòng đăng nhập hoặc đăng ký tài khoản để đặt lịch Spa cho bé nhé!');
        setTimeout(() => {
            location.href = 'auth.html?reason=booking_required&next=' + encodeURIComponent('customer.html#services');
        }, 650);
        return;
    }

    const svc = state.services.find((s) => Number(s.ma_dich_vu) === Number(serviceId));
    if (!svc) {
        toast('Vui lòng chọn một dịch vụ Spa cụ thể để đặt lịch.');
        return;
    }

    $('#bookingForm').reset();
    setBookingError('', false);
    $('#bookingService').value = String(svc.ma_dich_vu);
    $('#bookingModalTitle').textContent = `Đặt lịch: ${svc.ten_dich_vu}`;
    const summarySub = Number(svc.gia) > 0
        ? `${money(svc.gia)} · Thời lượng ${svc.thoi_luong} phút`
        : `Thời lượng ${svc.thoi_luong} phút`;
    $('#bookingServiceSummary').innerHTML = `
        ${svc.hinh_anh ? `<img src="${safe(svc.hinh_anh)}" alt="${safe(svc.ten_dich_vu)}">` : ''}
        <div>
            <strong>${safe(svc.ten_dich_vu)}</strong>
            <small>${summarySub}</small>
        </div>`;

    const hintEl = $('#bookingOwnerHint');
    if (hintEl) {
        hintEl.textContent = `Khách hàng: ${state.user.ho_ten} (${state.user.so_dien_thoai || state.user.email})`;
    }

    try {
        const pRes = await AppAPI.get('backend/pets/index.php');
        state.pets = pRes.pets || [];
    } catch {}

    const petSelectWrap = $('#savedPetWrap');
    const petSelect = $('#bookingSavedPet');
    if (state.pets.length) {
        petSelectWrap.classList.remove('hidden');
        petSelect.innerHTML =
            '<option value="">+ Nhập thông tin thú cưng mới</option>' +
            state.pets.map((p) => `<option value="${p.ma_thu_cung}">${safe(p.ten_thu_cung)} (${safe(p.loai)})</option>`).join('');

        if (state.preselectedPetId) {
            const pet = state.pets.find((p) => Number(p.ma_thu_cung) === Number(state.preselectedPetId));
            if (pet) {
                petSelect.value = String(pet.ma_thu_cung);
                $('#bookingPet').value = pet.ten_thu_cung;
                $('#bookingType').value = pet.bieu_tuong || '🐶';
            }
            state.preselectedPetId = null;
        }
    } else {
        petSelectWrap.classList.add('hidden');
    }

    const today = todayYMD(0);
    $('#bookingDateOnly').min = today;
    $('#bookingDateOnly').value = today;
    $('#bookingDateVN').value = ymdToDMY(today);
    $('#bookingDialog').showModal();
    await loadBookingSlots(true);
}

async function openServiceReviewModal(serviceId) {
    const svc = state.services.find((s) => Number(s.ma_dich_vu) === Number(serviceId));
    if (!svc) return;
    state.activeReviewService = svc;
    const res = await AppAPI.get('backend/reviews/index.php?ma_dich_vu=' + svc.ma_dich_vu);
    const reviews = res.reviews || [];

    $('#serviceReviewTitle').textContent = `${svc.bieu_tuong} Đánh giá: ${svc.ten_dich_vu}`;
    $('#serviceReviewList').innerHTML = reviews.length
        ? reviews
              .map(
                  (r) => `
            <div class="review-item">
                <div style="display:flex;justify-content:space-between">
                    <strong>${safe(r.ho_ten)}</strong>
                    <span class="review-stars">${'★'.repeat(Number(r.so_sao))}${'☆'.repeat(5 - Number(r.so_sao))}</span>
                </div>
                <div>${safe(r.noi_dung)}</div>
                <small style="color:#b09fb0">${formatDateTime(r.ngay_tao)}</small>
            </div>`
              )
              .join('')
        : '<p class="hint">Chưa có đánh giá nào cho dịch vụ này.</p>';

    $('#serviceReviewForm').classList.toggle('hidden', !state.user);
    $('#serviceReviewGuestHint').classList.toggle('hidden', !!state.user);
    $('#serviceReviewDialog').showModal();
}

// ============================================================================
// MEMBER ORDERS & SEPARATED CUSTOMER PROFILE + PETS
// ============================================================================
async function loadMemberData() {
    const isLoggedIn = !!state.user;

    // Trang Đơn hàng: tách rõ bố cục Khách vãng lai vs Thành viên
    $('#guestOrdersLayout').classList.toggle('hidden', isLoggedIn);
    $('#memberOrdersLayout').classList.toggle('hidden', !isLoggedIn);

    // Trang Lịch hẹn của bạn: tách rõ trạng thái chưa/đã đăng nhập
    $('#appointmentsGuestNotice')?.classList.toggle('hidden', isLoggedIn);
    $('#memberAppointmentsLayout')?.classList.toggle('hidden', !isLoggedIn);

    // Trang Hồ sơ & Thú cưng: tách rõ trạng thái chưa/đã đăng nhập
    $('#profileGuestNotice').classList.toggle('hidden', isLoggedIn);
    $('#memberProfileLayout').classList.toggle('hidden', !isLoggedIn);

    if (!isLoggedIn) return;

    const u = state.user;
    const initials = (u.ho_ten || 'KH')
        .split(/\s+/)
        .filter(Boolean)
        .slice(-2)
        .map((w) => w[0].toUpperCase())
        .join('');
    const roleLabel =
        u.role === 'admin' ? 'Quản trị viên' : u.role === 'nhan_vien' ? 'Nhân viên' : 'Khách hàng';
    const avatarUrl = (u.anh_dai_dien || '').trim();

    state.pendingMemberAvatarFile = null;
    state.memberAvatarRemoved = false;
    if ($('#memberAvatarFile')) $('#memberAvatarFile').value = '';
    const avtBox = $('#memberAvatarPreview');
    if (avtBox) {
        if (avatarUrl) {
            avtBox.innerHTML = `<img src="${safe(avatarUrl)}" alt="Ảnh đại diện"/>`;
        } else {
            avtBox.textContent = initials;
        }
    }
    $('#clearMemberAvatarBtn')?.classList.toggle('hidden', !avatarUrl);

    if ($('#memberName')) $('#memberName').textContent = u.ho_ten || 'Thành viên';
    if ($('#memberRoleSub')) $('#memberRoleSub').textContent = `${roleLabel} · Góc nhỏ có em`;
    if ($('#memberRoleDisplay')) $('#memberRoleDisplay').textContent = roleLabel;
    if ($('#profName')) $('#profName').value = u.ho_ten || '';
    if ($('#profEmail')) $('#profEmail').value = u.email || '';
    if ($('#profPhone')) $('#profPhone').value = u.so_dien_thoai || '';
    if ($('#profAddress')) $('#profAddress').value = u.dia_chi || '';
    $('#openDeleteAccountBtn')?.classList.toggle('hidden', u.role !== 'khach_hang');

    try {
        const [ordRes, appRes, petRes] = await Promise.all([
            AppAPI.get('backend/orders/index.php'),
            AppAPI.get('backend/appointments/index.php'),
            AppAPI.get('backend/pets/index.php'),
        ]);
        state.orders = ordRes.orders || [];
        state.appointments = appRes.appointments || [];
        state.pets = petRes.pets || [];

        $('#statOrdersCount').textContent = state.orders.length;
        $('#statApptsCount').textContent = state.appointments.length;
        $('#statPetsCount').textContent = state.pets.length;

        renderMemberOrders();
        renderMemberAppointments();
        renderMemberPets();
    } catch (err) {
        toast(err.message);
    }
}

function isAwaitingQrPayment(o) {
    if (!o) return false;
    if (['cancelled', 'returned', 'done'].includes(o.trang_thai)) return false;
    return o.phuong_thuc === 'bank_transfer' && o.trang_thai_thanh_toan !== 'paid';
}

function orderMatchesTab(o, tab) {
    if (!o) return false;
    if (tab === 'all') return true;
    if (tab === 'returned') return o.trang_thai === 'returned';
    if (tab === 'cancelled') return o.trang_thai === 'cancelled';
    if (isAwaitingQrPayment(o)) return tab === 'awaiting_payment';
    if (tab === 'awaiting_confirm') return o.trang_thai === 'pending';
    if (tab === 'to_ship') return ['confirmed', 'shipping'].includes(o.trang_thai);
    if (tab === 'delivered') return o.trang_thai === 'done';
    if (tab === 'to_review') return o.trang_thai === 'done' && Boolean(o.can_review);
    return false;
}

function getOrderDisplayStatus(o) {
    if (o.trang_thai === 'returned') {
        return { cls: 'returned', label: 'Đã trả hàng' };
    }
    if (o.trang_thai === 'cancelled') {
        return { cls: 'cancelled', label: 'Đã hủy' };
    }
    if (isAwaitingQrPayment(o)) {
        return { cls: 'awaiting_payment', label: 'Chờ thanh toán QR' };
    }
    if (o.trang_thai === 'pending') {
        return { cls: 'pending', label: 'Chờ xác nhận' };
    }
    if (o.trang_thai === 'confirmed' || o.trang_thai === 'shipping') {
        return { cls: 'shipping', label: 'Chờ giao hàng' };
    }
    if (o.trang_thai === 'done') {
        if (o.all_reviewed) return { cls: 'done', label: 'Đã giao · Đã đánh giá' };
        return { cls: 'done', label: 'Đã giao' };
    }
    return { cls: 'cancelled', label: 'Đã hủy' };
}

const VALID_ORDER_TABS = [
    'all',
    'awaiting_payment',
    'awaiting_confirm',
    'to_ship',
    'delivered',
    'to_review',
    'returned',
    'cancelled',
];

function setOrderTab(tab) {
    state.orderTab = VALID_ORDER_TABS.includes(tab) ? tab : 'all';
    $$('#orderTabs .order-tab').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.orderTab === state.orderTab);
    });
    renderMemberOrders();
}

function renderMemberOrders() {
    const all = state.orders || [];
    const cntPay = all.filter((o) => orderMatchesTab(o, 'awaiting_payment')).length;
    const cntConfirm = all.filter((o) => orderMatchesTab(o, 'awaiting_confirm')).length;
    const cntShip = all.filter((o) => orderMatchesTab(o, 'to_ship')).length;
    const cntDelivered = all.filter((o) => orderMatchesTab(o, 'delivered')).length;
    const cntRev = all.filter((o) => orderMatchesTab(o, 'to_review')).length;
    const cntReturned = all.filter((o) => orderMatchesTab(o, 'returned')).length;
    const cntCancelled = all.filter((o) => orderMatchesTab(o, 'cancelled')).length;

    if ($('#ordCountAll')) $('#ordCountAll').textContent = all.length;
    if ($('#ordCountPay')) $('#ordCountPay').textContent = cntPay;
    if ($('#ordCountConfirm')) $('#ordCountConfirm').textContent = cntConfirm;
    if ($('#ordCountShip')) $('#ordCountShip').textContent = cntShip;
    if ($('#ordCountDelivered')) $('#ordCountDelivered').textContent = cntDelivered;
    if ($('#ordCountReview')) $('#ordCountReview').textContent = cntRev;
    if ($('#ordCountReturned')) $('#ordCountReturned').textContent = cntReturned;
    if ($('#ordCountCancelled')) $('#ordCountCancelled').textContent = cntCancelled;

    $$('#orderTabs .order-tab').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.orderTab === state.orderTab);
    });

    const filtered = all.filter((o) => orderMatchesTab(o, state.orderTab));
    const emptyMsgMap = {
        all: ['Chưa có đơn hàng nào', ''],
        awaiting_payment: ['Không có đơn chờ thanh toán', ''],
        awaiting_confirm: ['Không có đơn chờ xác nhận', ''],
        to_ship: ['Không có đơn chờ giao hàng', ''],
        delivered: ['Chưa có đơn hàng đã giao', ''],
        to_review: ['Chưa có đơn hàng cần đánh giá', ''],
        returned: ['Chưa có sản phẩm trả hàng', ''],
        cancelled: ['Không có đơn hàng đã hủy', ''],
    };
    renderOrdersList(filtered, '#myOrders', emptyMsgMap[state.orderTab]);
}

function renderOrdersList(orders, targetSelector = '#myOrders', emptyPair = null) {
    const container = $(targetSelector);
    if (!container) return;
    const [emptyTitle, emptySub] = emptyPair || ['Chưa có đơn hàng nào', 'Hãy chọn món đồ đáng yêu cho bé ở mục Cửa hàng nhé!'];

    container.innerHTML = orders.length
        ? orders
              .map((o) => {
                  const st = getOrderDisplayStatus(o);
                  const awaitingPay = isAwaitingQrPayment(o);
                  const canReviewOrder = Boolean(state.user && o.trang_thai === 'done' && o.can_review);
                  const canReturnOrder = Boolean(state.user && o.trang_thai === 'done' && o.can_return);
                  const items = Array.isArray(o.items) ? o.items : [];

                  const itemsStripHtml = items.length
                      ? `<div class="order-products-strip">
                            ${items
                                .map((it) => {
                                    const itemCanReview = canReviewOrder && !it.da_danh_gia;
                                    const reviewAttr = itemCanReview
                                        ? `data-open-order-review="${it.ma_san_pham}" data-order-id="${o.ma_don_hang}"`
                                        : '';
                                    const rightPart =
                                        state.user && o.trang_thai === 'done'
                                            ? it.da_danh_gia
                                                ? `<span class="order-reviewed-badge">✓ Đã đánh giá ★ ${it.so_sao_danh_gia}</span>`
                                                : itemCanReview
                                                ? `<button type="button" class="btn btn-outline btn-sm" data-open-order-review="${it.ma_san_pham}" data-order-id="${o.ma_don_hang}">${uiIcon('star')} Đánh giá</button>`
                                                : `<span class="order-expired-badge">Hết hạn đánh giá</span>`
                                            : `<strong style="font-size:11.5px;color:var(--pink-deep);white-space:nowrap">${money(Number(it.don_gia) * Number(it.so_luong))}</strong>`;
                                    return `
                                <div class="order-prod-mini ${itemCanReview ? 'reviewable' : ''}" ${reviewAttr}>
                                    <div class="order-prod-mini-thumb">${it.anh_chinh ? `<img src="${safe(it.anh_chinh)}" alt="">` : uiIcon('box')}</div>
                                    <div class="order-prod-mini-info">
                                        <strong>${safe(it.ten_san_pham)}</strong>
                                        ${it.phan_loai ? `<span class="cart-variant-tag">${safe(it.phan_loai)}</span>` : ''}
                                        <small>${money(it.don_gia)} × ${it.so_luong}</small>
                                    </div>
                                    ${rightPart}
                                </div>`;
                                })
                                .join('')}
                        </div>`
                      : `<div class="order-desc">${safe(o.tom_tat_san_pham)}</div>`;

                  const reviewNoticeHtml = canReviewOrder
                      ? `<div class="order-review-deadline">${uiIcon('clock')} Còn <strong>${o.review_days_left} ngày</strong> để đánh giá (hạn đến ${formatDate(o.review_deadline)})</div>`
                      : o.trang_thai === 'done' && o.review_expired && !o.all_reviewed
                      ? `<div class="order-review-deadline expired">${uiIcon('clock')} Đã quá hạn đánh giá (7 ngày kể từ khi nhận hàng)</div>`
                      : '';

                  const returnNoticeHtml = canReturnOrder
                      ? `<div class="order-review-deadline">${uiIcon('clock')} Hỗ trợ trả hàng trong <strong>${o.return_days_left} ngày</strong> (đến ${formatDate(o.return_deadline)})</div>`
                      : '';

                  const deadlinesRowHtml = reviewNoticeHtml || returnNoticeHtml
                      ? `<div class="order-deadlines-row">${reviewNoticeHtml}${returnNoticeHtml}</div>`
                      : '';

                  const ret = o.tra_hang;
                  const returnSummaryHtml =
                      o.trang_thai === 'returned' && ret
                          ? `<div class="order-return-summary-box">
                                 <div class="ret-info">
                                     <span class="ret-title">Đã trả hàng thành công · ${formatDateTime(ret.ngay_tao)}</span>
                                     <div><b>Người gửi:</b> ${safe(ret.ho_ten)} (${safe(ret.so_dien_thoai)})</div>
                                     <div><b>Địa chỉ lấy hoàn:</b> ${safe(ret.dia_chi_lay_hang)}</div>
                                     ${ret.phuong_thuc_hoan_tien ? `<div><b>Hoàn tiền:</b> ${safe(ret.phuong_thuc_hoan_tien)}</div>` : ''}
                                     <div><b>Lí do:</b> ${safe(ret.ly_do)}</div>
                                 </div>
                                 ${ret.hinh_anh ? `<a href="${safe(ret.hinh_anh)}" target="_blank" rel="noopener"><img class="ret-photo" src="${safe(ret.hinh_anh)}" alt="Ảnh trả hàng"></a>` : ''}
                             </div>`
                          : '';

                  const actions = [];
                  if (state.user) {
                      if (awaitingPay) {
                          actions.push(`<button class="btn btn-primary btn-sm" data-pay-qr="${o.ma_don_hang}" type="button">Thanh toán QR ngay</button>`);
                          if (o.trang_thai === 'pending') {
                              actions.push(`<button class="btn btn-outline btn-sm" data-cancel-order="${o.ma_don_hang}" type="button">Hủy đơn</button>`);
                          }
                      } else if (o.trang_thai === 'pending') {
                          actions.push(`<button class="btn btn-outline btn-sm" data-cancel-order="${o.ma_don_hang}" type="button">Hủy đơn</button>`);
                      } else if (['confirmed', 'shipping'].includes(o.trang_thai)) {
                          actions.push(`<button class="btn btn-primary btn-sm" data-confirm-received="${o.ma_don_hang}" type="button">✓ Đã nhận</button>`);
                      } else if (o.trang_thai === 'done') {
                          if (canReturnOrder) {
                              actions.push(`<button class="btn btn-outline btn-sm" data-open-return="${o.ma_don_hang}" type="button">Trả hàng</button>`);
                          }
                          actions.push(`<button class="btn btn-primary btn-sm" data-rebuy-order="${o.ma_don_hang}" type="button">Mua lại</button>`);
                      } else if (o.trang_thai === 'returned' || o.trang_thai === 'cancelled') {
                          actions.push(`<button class="btn btn-outline btn-sm" data-rebuy-order="${o.ma_don_hang}" type="button">Mua lại</button>`);
                      }
                  }

                  return `
            <article class="order-item">
                <div class="order-top">
                    <span class="order-id">#${safe(o.ma_don_code)} <span style="font-weight:500;color:#ad9daa">· ${formatDateTime(o.ngay_dat)}</span></span>
                    <span class="order-status ${safe(st.cls)}">${safe(st.label)}</span>
                </div>
                ${itemsStripHtml}
                ${deadlinesRowHtml}
                ${returnSummaryHtml}
                <div class="order-desc">
                    ${uiIcon('map-pin')} ${safe(o.dia_chi_nhan)}<br>
                    Vận chuyển: <strong>${o.phuong_thuc_van_chuyen === 'express' ? 'Giao hàng nhanh' : 'Giao hàng thường'}</strong>${Number(o.phi_van_chuyen) > 0 ? ` (${money(o.phi_van_chuyen)})` : ''} · Thanh toán: <strong>${o.phuong_thuc === 'bank_transfer' ? 'Thanh toán trước qua thẻ / QR' : 'Thanh toán khi nhận hàng (COD)'}</strong>
                </div>
                <div class="order-bottom">
                    <div class="order-total">${money(o.tong_tien)}</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap">
                        ${actions.join('')}
                    </div>
                </div>
            </article>`;
              })
              .join('')
        : `<div class="empty">${uiIcon('orders', 'm-ico-empty')}<b>${safe(emptyTitle)}</b>${safe(emptySub)}</div>`;
}

async function rebuyOrder(orderId) {
    const o = state.orders.find((x) => Number(x.ma_don_hang) === Number(orderId));
    if (!o || !Array.isArray(o.items) || !o.items.length) {
        toast('Không tìm thấy sản phẩm trong đơn hàng này.');
        return;
    }
    let addedCount = 0;
    const skipped = [];
    for (const it of o.items) {
        const prod = state.products.find((p) => Number(p.ma_san_pham) === Number(it.ma_san_pham));
        const stock = prod ? Number(prod.ton_kho) : 0;
        if (!prod || stock <= 0) {
            skipped.push(it.ten_san_pham);
            continue;
        }
        const qty = Math.min(stock, Math.max(1, Number(it.so_luong) || 1));
        const ok = await addToCart(it.ma_san_pham, qty, it.phan_loai || '', true);
        if (ok) addedCount++;
        else skipped.push(it.ten_san_pham);
    }
    if (addedCount > 0) {
        const suffix = skipped.length ? ` (${skipped.length} sản phẩm đã hết hàng)` : '';
        toast(`Đã thêm ${addedCount} sản phẩm vào giỏ hàng để mua lại${suffix}.`);
        openCart();
    } else {
        toast('Các sản phẩm trong đơn này hiện đã hết hàng.');
    }
}

function clearReturnPhotoPreview() {
    state.activeReturnFile = null;
    if ($('#returnPhotoCamera')) $('#returnPhotoCamera').value = '';
    if ($('#returnPhotoFile')) $('#returnPhotoFile').value = '';
    $('#returnPhotoPreviewWrap')?.classList.add('hidden');
    if ($('#returnPhotoPreviewImg')) $('#returnPhotoPreviewImg').src = '';
}

function handleReturnPhotoSelected(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        const box = $('#orderReturnError');
        if (box) {
            box.textContent = 'Kích thước ảnh tối đa 5MB, vui lòng chọn ảnh nhỏ hơn.';
            box.classList.remove('hidden');
        }
        return;
    }
    state.activeReturnFile = file;
    $('#orderReturnError')?.classList.add('hidden');
    const url = URL.createObjectURL(file);
    $('#returnPhotoPreviewImg').src = url;
    $('#returnPhotoPreviewWrap').classList.remove('hidden');
}

function openOrderReturnModal(orderId) {
    const o = state.orders.find((x) => Number(x.ma_don_hang) === Number(orderId));
    if (!o) return;
    state.activeReturnOrderId = Number(o.ma_don_hang);
    $('#orderReturnForm').reset();
    clearReturnPhotoPreview();
    $('#orderReturnError')?.classList.add('hidden');
    $('#orderReturnOrderId').value = String(o.ma_don_hang);
    $('#orderReturnTitle').textContent = `Yêu cầu trả hàng · #${o.ma_don_code}`;
    $('#orderReturnSub').textContent = `Hỗ trợ trả hàng trong vòng 3 ngày (hạn đến ${formatDate(o.return_deadline)}).`;
    $('#orderReturnSummary').innerHTML = `
        <strong>Đơn hàng #${safe(o.ma_don_code)}</strong> · Tổng ${money(o.tong_tien)}<br>
        <span>${safe(o.tom_tat_san_pham || '')}</span>`;
    $('#returnName').value = o.ten_nguoi_nhan || state.user?.ho_ten || '';
    $('#returnPhone').value = o.so_dien_thoai || state.user?.so_dien_thoai || '';
    $('#returnAddress').value = o.dia_chi_nhan || state.user?.dia_chi || '';
    $('#orderReturnDialog').showModal();
}

async function dismissOrderReturn(orderId) {
    if (!confirm('Bạn xác nhận không có nhu cầu trả hàng cho đơn này? Nút Trả hàng sẽ được ẩn đi.')) return;
    try {
        const res = await AppAPI.put('backend/orders/index.php', {
            ma_don_hang: Number(orderId),
            action: 'dismiss_return',
        });
        toast(res.message);
        await loadMemberData();
    } catch (err) {
        toast(err.message);
    }
}

function openQrOrderModal(orderId) {
    const o = state.orders.find((x) => Number(x.ma_don_hang) === Number(orderId));
    if (!o) return;
    state.activeQrOrderId = Number(o.ma_don_hang);
    $('#qrOrderTitle').textContent = `Thanh toán QR · Đơn #${o.ma_don_code}`;
    $('#qrOrderAmount').textContent = money(o.tong_tien);
    const s = state.storeSettings || {};
    const savedNote = (s.bank_transfer_note || '').trim();
    const memo = savedNote ? `${savedNote} ${o.ma_don_code}` : `GNCE ${o.ma_don_code}`;
    $('#qrOrderMemo').textContent = memo;
    renderDynamicQrInto($('#qrPayOrderDialog .js-store-qr-frame'), {
        bankName: s.bank_name || 'Vietcombank (VCB)',
        accountNo: s.bank_account_no || '1028 6688 9999',
        accountName: s.bank_account_name || 'GOC NHO CO EM',
        amount: Number(o.tong_tien || 0),
        addInfo: memo,
        fallbackImg: (s.bank_qr_image || '').trim(),
    });
    $('#qrPayOrderDialog').showModal();
}

const STAR_LABELS = {
    1: 'Rất tệ (1/5)',
    2: 'Không hài lòng (2/5)',
    3: 'Bình thường (3/5)',
    4: 'Hài lòng (4/5)',
    5: 'Tuyệt vời (5/5)',
};

function setReviewStars(count) {
    const val = Math.max(1, Math.min(5, Number(count) || 5));
    $('#orderReviewStarsValue').value = String(val);
    $$('#reviewStarsPicker .star-pick-btn').forEach((btn) => {
        btn.classList.toggle('active', Number(btn.dataset.star) <= val);
    });
    const lbl = $('#reviewStarsLabel');
    if (lbl) lbl.textContent = STAR_LABELS[val] || `${val}/5`;
}

function clearReviewPhotoPreview() {
    state.activeReviewFile = null;
    if ($('#orderReviewCamera')) $('#orderReviewCamera').value = '';
    if ($('#orderReviewFile')) $('#orderReviewFile').value = '';
    $('#orderReviewPreviewWrap')?.classList.add('hidden');
    if ($('#orderReviewPreviewImg')) $('#orderReviewPreviewImg').src = '';
}

function handleReviewPhotoSelected(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        const box = $('#orderReviewError');
        if (box) {
            box.textContent = 'Kích thước ảnh tối đa 5MB, vui lòng chọn ảnh nhỏ hơn.';
            box.classList.remove('hidden');
        }
        return;
    }
    state.activeReviewFile = file;
    $('#orderReviewError')?.classList.add('hidden');
    const url = URL.createObjectURL(file);
    $('#orderReviewPreviewImg').src = url;
    $('#orderReviewPreviewWrap').classList.remove('hidden');
}

function openOrderReviewModal(orderId, productId) {
    const o = state.orders.find((x) => Number(x.ma_don_hang) === Number(orderId));
    const item = o?.items?.find((i) => Number(i.ma_san_pham) === Number(productId))
        || state.products.find((p) => Number(p.ma_san_pham) === Number(productId));
    if (!item) return;

    $('#orderReviewForm').reset();
    clearReviewPhotoPreview();
    $('#orderReviewError')?.classList.add('hidden');
    $('#orderReviewProductId').value = String(item.ma_san_pham);
    setReviewStars(5);

    $('#orderReviewProductCard').innerHTML = `
        ${item.anh_chinh ? `<img src="${safe(item.anh_chinh)}" alt="${safe(item.ten_san_pham)}">` : uiIcon('box', 'm-ico-lg')}
        <div>
            <strong>${safe(item.ten_san_pham)}</strong>
            <small>${item.phan_loai ? safe(item.phan_loai) : `Đơn hàng #${safe(o?.ma_don_code || '')}`}</small>
        </div>`;

    $('#orderReviewDialog').showModal();
}

function renderMemberAppointments() {
    $('#myAppointments').innerHTML = state.appointments.length
        ? state.appointments
              .map(
                  (a) => `
            <article class="order-item">
                <div class="order-top">
                    <span class="order-id title-with-ico">${uiIcon('pet')} ${safe(a.ten_thu_cung)} · ${safe(a.ten_dich_vu)}</span>
                    <span class="order-status ${safe(a.trang_thai)}">${APPT_STATUS_LABEL[a.trang_thai] || a.trang_thai}</span>
                </div>
                <div class="order-desc">${uiIcon('clock')} ${formatDateTime(a.ngay_gio)}${Number(a.gia) > 0 ? ` · Giá tham khảo: <strong>${money(a.gia)}</strong>` : ''}</div>
            </article>`
              )
              .join('')
        : `<div class="empty">${uiIcon('calendar', 'm-ico-empty')}<b>Chưa có lịch hẹn nào</b></div>`;
}

function renderMemberPets() {
    $('#myPetsList').innerHTML = state.pets.length
        ? state.pets
              .map(
                  (p) => `
            <div class="pet-chip">
                <span class="ico">${uiIcon('pet', 'm-ico-md')}</span>
                <div style="flex:1;min-width:0">
                    <strong>${safe(p.ten_thu_cung)}</strong>
                    <small>${safe(p.loai)}${p.giong ? ' · ' + safe(p.giong) : ''}${p.tuoi ? ' · ' + safe(p.tuoi) : ''}</small>
                    ${p.ghi_chu ? `<small style="display:block;color:#a0859a;margin-top:2px">Ghi chú: ${safe(p.ghi_chu)}</small>` : ''}
                </div>
                <button class="btn btn-outline btn-sm" data-edit-pet="${p.ma_thu_cung}" type="button">${uiIcon('edit')} Sửa</button>
                <button class="btn btn-outline btn-sm" data-book-pet="${p.ma_thu_cung}" type="button">${uiIcon('booking')} Đặt Spa</button>
                <button class="delete" data-del-pet="${p.ma_thu_cung}" type="button">Xóa</button>
            </div>`
              )
              .join('')
        : `<div class="empty">${uiIcon('pet', 'm-ico-empty')}<b>Chưa có hồ sơ thú cưng</b>Nhấn "Thêm bé cưng" để lưu thông tin bé nhé!</div>`;
}

function openPetModal(pet = null) {
    const form = $('#addPetForm');
    if (!form) return;
    form.reset();
    if (pet) {
        $('#petModalTitle').textContent = 'Chỉnh sửa thông tin thú cưng';
        $('#petModalSubmitBtn').textContent = 'Lưu thay đổi';
        $('#petEditId').value = String(pet.ma_thu_cung);
        form.elements.ten_thu_cung.value = pet.ten_thu_cung || '';
        form.elements.bieu_tuong.value = pet.bieu_tuong || '🐶';
        form.elements.loai.value = pet.loai || 'Chó';
        form.elements.giong.value = pet.giong || '';
        form.elements.tuoi.value = pet.tuoi || '';
        form.elements.ghi_chu.value = pet.ghi_chu || '';
    } else {
        $('#petModalTitle').textContent = 'Thêm hồ sơ bé cưng';
        $('#petModalSubmitBtn').textContent = 'Lưu hồ sơ bé';
        $('#petEditId').value = '';
    }
    $('#addPetDialog').showModal();
}

// ============================================================================
// PAWLY AI CHAT (BACKEND PHP + MYSQL GROUNDING)
// ============================================================================
function toggleAI(show) {
    const visible = typeof show === 'boolean' ? show : !$('#aiPanel').classList.contains('open');
    $('#aiPanel').classList.toggle('open', visible);
    $('#aiPanel').setAttribute('aria-hidden', String(!visible));
    if (visible) $('#aiInput').focus();
}

function appendAIMessage(text, who, recommended = []) {
    const div = document.createElement('div');
    div.className = 'bubble ' + who;
    div.innerHTML = who === 'bot' ? renderMarkdownLite(text) : safe(text);

    if (who === 'bot' && Array.isArray(recommended) && recommended.length) {
        const list = document.createElement('div');
        list.className = 'ai-rec-list';
        list.innerHTML = recommended
            .map(
                (p) => `
            <div class="ai-rec-card">
                <span class="ico">${p.anh_chinh ? `<img src="${safe(p.anh_chinh)}" alt="">` : uiIcon('box')}</span>
                <div class="info">
                    <b title="${safe(p.ten_san_pham)}">${safe(p.ten_san_pham)}</b>
                    <span>${money(p.gia)} · Còn ${p.ton_kho}</span>
                </div>
                <button class="btn btn-primary btn-sm" data-add="${p.ma_san_pham}">+ Giỏ</button>
            </div>`
            )
            .join('');
        div.appendChild(list);
    }

    $('#aiMessages').appendChild(div);
    $('#aiMessages').scrollTop = $('#aiMessages').scrollHeight;
    return div;
}

async function askAI(question) {
    const q = String(question || '').trim();
    if (!q) return;
    toggleAI(true);
    appendAIMessage(q, 'me');
    $('#aiInput').value = '';

    const typing = appendAIMessage('Pawly đang tra cứu dữ liệu cửa hàng...', 'bot');
    try {
        const res = await AppAPI.post('backend/ai/chat.php', {
            mode: 'customer',
            message: q,
            conversation_id: state.aiConversationId,
        });
        state.aiConversationId = res.conversation_id || state.aiConversationId;
        typing.remove();
        let text = res.reply || 'Xin lỗi, mình chưa hiểu câu hỏi này.';
        if (res.fallback_notice) {
            text += '\n\n' + res.fallback_notice;
        }
        appendAIMessage(text, 'bot', res.recommended_products || []);
    } catch (err) {
        typing.remove();
        appendAIMessage('Trợ lý AI tạm thời bận (' + err.message + '). Bạn vẫn có thể duyệt sản phẩm và đặt lịch bình thường nhé!', 'bot');
    }
}

async function loadStoreSettings() {
    try {
        const res = await AppAPI.get('backend/settings/index.php');
        const s = res.settings || {};
        state.storeSettings = s;
        const bankName = s.bank_name || 'Vietcombank (VCB)';
        const bankNo = s.bank_account_no || '1028 6688 9999';
        const bankOwner = s.bank_account_name || 'GOC NHO CO EM';
        const qrImg = (s.bank_qr_image || '').trim();
        const storeLogo = (s.store_logo || '').trim();

        if (storeLogo) {
            $$('.logo-img').forEach((img) => {
                img.src = storeLogo;
            });
            const fav = $('link[rel="icon"]');
            if (fav) fav.href = storeLogo;
        }

        $$('.js-store-bank-name').forEach((el) => (el.textContent = bankName));
        $$('.js-store-bank-no').forEach((el) => (el.textContent = bankNo));
        $$('.js-store-bank-owner').forEach((el) => (el.textContent = bankOwner));
        if (qrImg) {
            $$('.js-store-qr-frame').forEach((frame) => {
                frame.innerHTML = '';
                const img = document.createElement('img');
                img.src = qrImg;
                img.alt = 'Mã QR chuyển khoản cửa hàng';
                frame.appendChild(img);
            });
        }
    } catch {}
}

// ============================================================================
// EVENTS & BOOTSTRAP
// ============================================================================
async function setup() {
    loadLocalLists();
    await loadAuth();
    try {
        await Promise.all([loadCatalog(), loadStoreSettings()]);
        await loadCart();
    } catch (err) {
        toast('Lỗi tải dữ liệu máy chủ: ' + err.message);
    }

    document.addEventListener('click', async (e) => {
        const pageBtn = e.target.closest('[data-page]');
        if (pageBtn) {
            goPage(pageBtn.dataset.page);
            return;
        }
        const goBtn = e.target.closest('[data-go]');
        if (goBtn) {
            goPage(goBtn.dataset.go);
            return;
        }
        const catBtn = e.target.closest('[data-category]');
        if (catBtn) {
            state.shopFilter = catBtn.dataset.category;
            renderShopFilters();
            renderProducts();
            goPage('shop');
            return;
        }
        const fltBtn = e.target.closest('[data-filter]');
        if (fltBtn) {
            state.shopFilter = fltBtn.dataset.filter;
            renderShopFilters();
            renderProducts();
            return;
        }
        const wishBtn = e.target.closest('[data-wish]');
        if (wishBtn) {
            e.stopPropagation();
            const id = Number(wishBtn.dataset.wish);
            state.wish = state.wish.includes(id) ? state.wish.filter((x) => x !== id) : [...state.wish, id];
            localStorage.setItem(WISH_KEY, JSON.stringify(state.wish));
            renderProducts();
            return;
        }
        const addBtn = e.target.closest('[data-add]');
        if (addBtn) {
            e.stopPropagation();
            await openVariantModal(addBtn.dataset.add, 1, 'add');
            return;
        }
        const buyNowBtn = e.target.closest('[data-buy-now]');
        if (buyNowBtn) {
            e.stopPropagation();
            await openVariantModal(buyNowBtn.dataset.buyNow, 1, 'buy');
            return;
        }
        const vOptBtn = e.target.closest('[data-vopt]');
        if (vOptBtn) {
            const grp = vOptBtn.closest('.variant-group');
            if (grp) {
                grp.querySelectorAll('.variant-pill').forEach((b) => b.classList.toggle('active', b === vOptBtn));
                grp.classList.remove('needs-pick');
                const pickedSpan = grp.querySelector('[data-vpicked]');
                if (pickedSpan) pickedSpan.textContent = vOptBtn.dataset.vval;
            }
            if (vOptBtn.dataset.vscope === 'modal') {
                setVariantError('');
                updateVariantModalSummary();
            } else {
                $('#detailVariantError')?.classList.add('hidden');
            }
            return;
        }
        const detailEl = e.target.closest('[data-detail]');
        if (detailEl) {
            await openProductDetail(detailEl.dataset.detail);
            return;
        }
        const cartToggle = e.target.closest('[data-cart-toggle]');
        if (cartToggle) {
            toggleCartItem(cartToggle.dataset.cartToggle);
            return;
        }
        const qtyBtn = e.target.closest('[data-qty-idx]');
        if (qtyBtn) {
            await updateCartQtyByIndex(qtyBtn.dataset.qtyIdx, Number(qtyBtn.dataset.delta));
            return;
        }
        const remBtn = e.target.closest('[data-remove-idx]');
        if (remBtn) {
            await removeCartItemByIndex(remBtn.dataset.removeIdx);
            return;
        }
        const bookBtn = e.target.closest('[data-book]');
        if (bookBtn) {
            await openBookingModal(bookBtn.dataset.book);
            return;
        }
        const svcRevBtn = e.target.closest('[data-svc-review]');
        if (svcRevBtn) {
            await openServiceReviewModal(svcRevBtn.dataset.svcReview);
            return;
        }
        const ordTabBtn = e.target.closest('[data-order-tab]');
        if (ordTabBtn) {
            setOrderTab(ordTabBtn.dataset.orderTab);
            return;
        }
        const payQrBtn = e.target.closest('[data-pay-qr]');
        if (payQrBtn) {
            openQrOrderModal(payQrBtn.dataset.payQr);
            return;
        }
        const recvBtn = e.target.closest('[data-confirm-received]');
        if (recvBtn) {
            try {
                const res = await AppAPI.put('backend/orders/index.php', {
                    ma_don_hang: Number(recvBtn.dataset.confirmReceived),
                    trang_thai: 'done',
                });
                state.orderTab = 'delivered';
                toast(res.message);
                await loadMemberData();
            } catch (err) {
                toast(err.message);
            }
            return;
        }
        const rebuyBtn = e.target.closest('[data-rebuy-order]');
        if (rebuyBtn) {
            await rebuyOrder(rebuyBtn.dataset.rebuyOrder);
            return;
        }
        const openReturnBtn = e.target.closest('[data-open-return]');
        if (openReturnBtn) {
            openOrderReturnModal(openReturnBtn.dataset.openReturn);
            return;
        }
        const dismissReturnBtn = e.target.closest('[data-dismiss-return]');
        if (dismissReturnBtn) {
            await dismissOrderReturn(dismissReturnBtn.dataset.dismissReturn);
            return;
        }
        const returnChipBtn = e.target.closest('[data-return-chip]');
        if (returnChipBtn) {
            const ta = $('#returnReason');
            if (ta) {
                const cur = ta.value.trim();
                const add = returnChipBtn.dataset.returnChip;
                ta.value = cur ? (cur.includes(add) ? cur : cur + ' ' + add) : add;
                ta.focus();
            }
            return;
        }
        const openRevEl = e.target.closest('[data-open-order-review]');
        if (openRevEl) {
            e.stopPropagation();
            openOrderReviewModal(openRevEl.dataset.orderId, openRevEl.dataset.openOrderReview);
            return;
        }
        const starBtn = e.target.closest('[data-star]');
        if (starBtn) {
            setReviewStars(starBtn.dataset.star);
            return;
        }
        const chipBtn = e.target.closest('[data-review-chip]');
        if (chipBtn) {
            const ta = $('#orderReviewText');
            if (ta) {
                const cur = ta.value.trim();
                const add = chipBtn.dataset.reviewChip;
                ta.value = cur ? (cur.includes(add) ? cur : cur + ' ' + add) : add;
                ta.focus();
            }
            return;
        }
        const openEmailBtn = e.target.closest('[data-open-email]');
        if (openEmailBtn) {
            await openEmailDetail(openEmailBtn.dataset.openEmail);
            return;
        }
        const cancelOrdBtn = e.target.closest('[data-cancel-order]');
        if (cancelOrdBtn) {
            if (!confirm('Bạn chắc chắn muốn hủy đơn hàng này? Tồn kho sẽ được hoàn lại.')) return;
            try {
                const res = await AppAPI.put('backend/orders/index.php', {
                    ma_don_hang: Number(cancelOrdBtn.dataset.cancelOrder),
                    trang_thai: 'cancelled',
                });
                state.orderTab = 'cancelled';
                toast(res.message);
                await loadCatalog();
                await loadMemberData();
            } catch (err) {
                toast(err.message);
            }
            return;
        }
        const editPetBtn = e.target.closest('[data-edit-pet]');
        if (editPetBtn) {
            const pet = state.pets.find((p) => Number(p.ma_thu_cung) === Number(editPetBtn.dataset.editPet));
            if (pet) openPetModal(pet);
            return;
        }
        const bookPetBtn = e.target.closest('[data-book-pet]');
        if (bookPetBtn) {
            state.preselectedPetId = Number(bookPetBtn.dataset.bookPet);
            const pet = state.pets.find((p) => Number(p.ma_thu_cung) === state.preselectedPetId);
            goPage('services');
            toast(`Hãy chọn dịch vụ Spa muốn đặt cho bé ${pet ? pet.ten_thu_cung : 'cưng'} nhé!`);
            return;
        }
        const delPetBtn = e.target.closest('[data-del-pet]');
        if (delPetBtn) {
            try {
                const res = await AppAPI.del('backend/pets/index.php?id=' + delPetBtn.dataset.delPet);
                toast(res.message);
                await loadMemberData();
            } catch (err) {
                toast(err.message);
            }
            return;
        }
        const slotBtn = e.target.closest('[data-pick-slot]');
        if (slotBtn && !slotBtn.disabled) {
            $$('#bookingSlotsGrid .slot-btn').forEach((b) => b.classList.toggle('selected', b === slotBtn));
            $('#bookingSlotValue').value = slotBtn.dataset.pickSlot;
            setBookingError('', false);
            return;
        }
        const closeDlg = e.target.closest('[data-close-dialog]');
        if (closeDlg) {
            closeDlg.closest('dialog')?.close();
            return;
        }
        const promptBtn = e.target.closest('[data-ai-prompt]');
        if (promptBtn) {
            askAI(promptBtn.dataset.aiPrompt);
            return;
        }
        const footerPage = e.target.closest('[data-footer-page]');
        if (footerPage) {
            e.preventDefault();
            goPage(footerPage.dataset.footerPage);
        }
    });

    $('#logoHome').addEventListener('click', (e) => {
        e.preventDefault();
        goPage('home');
    });
    $('#mobileToggle').addEventListener('click', () => $('#mainNav').classList.toggle('open'));
    $('#cartOpen').addEventListener('click', openCart);
    $('#emailInboxBtn')?.addEventListener('click', openEmailInbox);
    $('#backToEmailListBtn')?.addEventListener('click', () => {
        $('#emailDetailView')?.classList.add('hidden');
        $('#emailListView')?.classList.remove('hidden');
        renderEmailInboxList();
    });
    $('#markAllEmailsReadBtn')?.addEventListener('click', async () => {
        try {
            await AppAPI.put('backend/emails/index.php', {});
            await loadCustomerEmails();
            renderEmailInboxList();
            toast('Đã đánh dấu tất cả thông báo là đã đọc.');
        } catch (err) {
            toast(err.message);
        }
    });
    $('#cartClose').addEventListener('click', closeCart);
    $('#overlay').addEventListener('click', closeCart);
    $('#checkoutOpen').addEventListener('click', openCheckout);
    $('#cartSelectAll')?.addEventListener('change', (e) => toggleSelectAllCart(e.target.checked));
    $('#cartDeleteSelectedBtn')?.addEventListener('click', deleteSelectedCartItems);
    $('#cartContents')?.addEventListener('change', (e) => {
        const chk = e.target.closest('[data-cart-check]');
        if (chk) toggleCartItem(chk.dataset.cartCheck);
    });

    $('#shopSearch').addEventListener('input', renderProducts);
    $('#petFilter').addEventListener('change', (e) => {
        state.petFilter = e.target.value;
        renderProducts();
    });
    $('#priceFilter').addEventListener('change', (e) => {
        state.priceFilter = e.target.value;
        renderProducts();
    });

    $('#logoutBtn').addEventListener('click', async () => {
        await AppAPI.post('backend/auth/logout.php', {});
        state.user = null;
        state.cart = [];
        state.emails = [];
        state.emailUnread = 0;
        state.cartSelectedKeys.clear();
        state.cartSelectionInitialized = false;
        renderAuthControls();
        renderEmailBadge();
        renderCart();
        toast('Đã đăng xuất thành công.');
        if (['orders', 'appointments', 'profile'].includes(state.currentPage)) loadMemberData();
    });

    // Variant modal controls & submit
    $('#variantQtyMinus')?.addEventListener('click', () => {
        const el = $('#variantQty');
        el.value = String(Math.max(1, Number(el.value || 1) - 1));
        updateVariantModalSummary();
    });
    $('#variantQtyPlus')?.addEventListener('click', () => {
        const el = $('#variantQty');
        const max = Math.max(1, Number(state.activeVariantProduct?.ton_kho || 1));
        el.value = String(Math.min(max, Number(el.value || 1) + 1));
        updateVariantModalSummary();
    });
    $('#variantQty')?.addEventListener('input', updateVariantModalSummary);

    $('#variantForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const p = state.activeVariantProduct;
        if (!p) return;
        const isBuy = state.activeVariantMode === 'buy';
        const check = collectVariantSelection($('#variantOptionsContainer'), p);
        if (!check.ok) {
            setVariantError(
                'Vui lòng chọn: ' + check.missing.join(', ') + (isBuy ? ' trước khi mua ngay nhé!' : ' trước khi thêm vào giỏ hàng nhé!')
            );
            return;
        }
        setVariantError('');
        const qty = Math.max(1, Math.min(Number(p.ton_kho || 1), Number($('#variantQty').value || 1)));
        if (isBuy) {
            $('#variantDialog').close();
            startBuyNow(p, qty, check.phan_loai);
            return;
        }
        const btn = $('#variantAddBtn');
        if (btn) btn.disabled = true;
        try {
            const ok = await addToCart(p.ma_san_pham, qty, check.phan_loai);
            if (ok) {
                $('#variantDialog').close();
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    });

    $('#variantBuyNowBtn')?.addEventListener('click', () => {
        const p = state.activeVariantProduct;
        if (!p) return;
        const check = collectVariantSelection($('#variantOptionsContainer'), p);
        if (!check.ok) {
            setVariantError('Vui lòng chọn: ' + check.missing.join(', ') + ' trước khi mua ngay nhé!');
            return;
        }
        setVariantError('');
        const qty = Math.max(1, Math.min(Number(p.ton_kho || 1), Number($('#variantQty').value || 1)));
        $('#variantDialog').close();
        startBuyNow(p, qty, check.phan_loai);
    });

    // Checkout shipping & payment radio listeners (live fee + QR toggle)
    $('#checkoutDialog')?.addEventListener('close', () => {
        state.checkoutOverrideItems = null;
    });
    $('#checkoutForm')?.addEventListener('change', (e) => {
        if (e.target.name === 'phuong_thuc_van_chuyen' || e.target.name === 'phuong_thuc') {
            updateCheckoutTotals();
        }
    });
    $('#checkoutPhone')?.addEventListener('input', () => {
        if (getCheckoutPaymentMethod() === 'bank_transfer') updateCheckoutTotals();
    });

    // Checkout submit -> MySQL transaction (hỗ trợ cả Giỏ hàng chọn lọc & Mua ngay)
    $('#checkoutForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        setCheckoutError('');
        const isBuyNow = Array.isArray(state.checkoutOverrideItems) && state.checkoutOverrideItems.length > 0;
        const selected = getActiveCheckoutItems();
        if (!selected.length) {
            setCheckoutError('Vui lòng chọn ít nhất 1 sản phẩm cần thanh toán!');
            return;
        }
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
            const payMethod = getCheckoutPaymentMethod();
            const qrPaid = payMethod === 'bank_transfer' && Boolean($('#checkoutQrPaid')?.checked);
            const payload = {
                ten_nguoi_nhan: $('#checkoutName').value.trim(),
                so_dien_thoai: $('#checkoutPhone').value.trim(),
                dia_chi_nhan: $('#checkoutAddress').value.trim(),
                phuong_thuc_van_chuyen: getCheckoutShippingMethod(),
                phuong_thuc: payMethod,
                da_chuyen_khoan: qrPaid,
                is_buy_now: isBuyNow,
                ghi_chu: $('#checkoutNote').value.trim(),
                items: selected.map((i) => ({
                    ma_chi_tiet: i.ma_chi_tiet || null,
                    ma_san_pham: i.ma_san_pham,
                    phan_loai: i.phan_loai || '',
                    so_luong: i.so_luong,
                })),
            };
            const res = await AppAPI.post('backend/orders/index.php', payload);
            if (!isBuyNow) {
                const purchasedKeys = new Set(selected.map(cartItemKey));
                state.cart = state.cart.filter((i) => !purchasedKeys.has(cartItemKey(i)));
                purchasedKeys.forEach((k) => state.cartSelectedKeys.delete(k));
                if (!state.user) saveGuestCart();
            }
            state.checkoutOverrideItems = null;
            $('#checkoutDialog').close();
            e.target.reset();
            await loadCatalog();
            await loadCart();
            toast(res.message);

            if (!state.user) {
                $('#lookupName').value = payload.ten_nguoi_nhan;
                $('#lookupPhone').value = payload.so_dien_thoai;
                goPage('orders');
                const lk = await AppAPI.get(
                    `backend/orders/index.php?name=${encodeURIComponent(payload.ten_nguoi_nhan)}&phone=${encodeURIComponent(payload.so_dien_thoai)}`
                );
                renderOrdersList(lk.orders || []);
            } else {
                state.orderTab = payMethod === 'bank_transfer' && !qrPaid ? 'awaiting_payment' : 'awaiting_confirm';
                goPage('orders');
            }
        } catch (err) {
            setCheckoutError(err.message || 'Không thể hoàn tất đặt hàng, vui lòng kiểm tra lại.');
        } finally {
            btn.disabled = false;
        }
    });

    // Xác nhận đã chuyển khoản QR từ modal #qrPayOrderDialog
    $('#confirmQrOrderPaidBtn')?.addEventListener('click', async () => {
        if (!state.activeQrOrderId) return;
        const btn = $('#confirmQrOrderPaidBtn');
        btn.disabled = true;
        try {
            const res = await AppAPI.put('backend/orders/index.php', {
                ma_don_hang: state.activeQrOrderId,
                action: 'confirm_payment',
            });
            $('#qrPayOrderDialog').close();
            state.orderTab = 'awaiting_confirm';
            toast(res.message);
            await loadMemberData();
        } catch (err) {
            toast(err.message);
        } finally {
            btn.disabled = false;
        }
    });

    // Chụp / tải ảnh & gửi đánh giá sản phẩm từ mục Cần đánh giá
    $('#orderReviewCamera')?.addEventListener('change', (e) => handleReviewPhotoSelected(e.target.files?.[0]));
    $('#orderReviewFile')?.addEventListener('change', (e) => handleReviewPhotoSelected(e.target.files?.[0]));
    $('#orderReviewRemoveImg')?.addEventListener('click', clearReviewPhotoPreview);

    $('#orderReviewForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errBox = $('#orderReviewError');
        errBox?.classList.add('hidden');

        const pid = Number($('#orderReviewProductId').value || 0);
        const stars = Number($('#orderReviewStarsValue').value || 5);
        const text = $('#orderReviewText').value.trim();
        if (!pid || !text) {
            if (errBox) {
                errBox.textContent = 'Vui lòng nhập nội dung đánh giá sản phẩm nhé!';
                errBox.classList.remove('hidden');
            }
            return;
        }

        const btn = e.target.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        try {
            let uploadedPath = '';
            if (state.activeReviewFile) {
                const imgFd = new FormData();
                imgFd.append('image', state.activeReviewFile);
                const up = await AppAPI.post('backend/reviews/upload.php', imgFd);
                uploadedPath = up.path || '';
            }
            const res = await AppAPI.post('backend/reviews/index.php', {
                ma_san_pham: pid,
                so_sao: stars,
                noi_dung: text,
                hinh_anh: uploadedPath,
            });
            $('#orderReviewDialog').close();
            e.target.reset();
            clearReviewPhotoPreview();
            await loadCatalog();
            await loadMemberData();
            const stillToReview = state.orders.filter((o) => orderMatchesTab(o, 'to_review')).length;
            toast(
                stillToReview === 0 && state.orderTab === 'to_review'
                    ? 'Cảm ơn bạn đã đánh giá! Đơn đã đánh giá xong được chuyển về mục Đã giao & Tất cả.'
                    : res.message
            );
        } catch (err) {
            if (errBox) {
                errBox.textContent = err.message || 'Không thể gửi đánh giá, vui lòng thử lại.';
                errBox.classList.remove('hidden');
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    });

    // Chụp / tải ảnh & gửi yêu cầu trả hàng từ mục Đã giao
    $('#returnPhotoCamera')?.addEventListener('change', (e) => handleReturnPhotoSelected(e.target.files?.[0]));
    $('#returnPhotoFile')?.addEventListener('change', (e) => handleReturnPhotoSelected(e.target.files?.[0]));
    $('#returnPhotoRemoveImg')?.addEventListener('click', clearReturnPhotoPreview);

    $('#orderReturnForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errBox = $('#orderReturnError');
        const showErr = (m) => {
            if (!errBox) return;
            errBox.textContent = m;
            errBox.classList.remove('hidden');
            errBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        };
        errBox?.classList.add('hidden');

        const orderId = Number($('#orderReturnOrderId').value || state.activeReturnOrderId || 0);
        const hoTen = $('#returnName').value.trim();
        const sdt = $('#returnPhone').value.trim();
        const diaChi = $('#returnAddress').value.trim();
        const hoanTien = $('#returnRefundInfo').value.trim();
        const lyDo = $('#returnReason').value.trim();

        if (!orderId || !hoTen || sdt.replace(/\D+/g, '').length < 9 || !diaChi) {
            showErr('Vui lòng điền đầy đủ họ tên, số điện thoại (tối thiểu 9 số) và địa chỉ lấy hàng hoàn.');
            return;
        }
        if (!lyDo) {
            showErr('Vui lòng nêu lí do trả hàng nhé!');
            return;
        }
        if (!state.activeReturnFile) {
            showErr('Vui lòng chụp hoặc chọn ảnh sản phẩm cần trả trước khi xác nhận.');
            return;
        }

        const btn = e.target.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        try {
            const imgFd = new FormData();
            imgFd.append('image', state.activeReturnFile);
            const up = await AppAPI.post('backend/orders/upload_return.php', imgFd);
            const uploadedPath = up.path || '';

            const res = await AppAPI.put('backend/orders/index.php', {
                ma_don_hang: orderId,
                action: 'return_order',
                ho_ten: hoTen,
                so_dien_thoai: sdt,
                dia_chi_lay_hang: diaChi,
                phuong_thuc_hoan_tien: hoanTien,
                ly_do: lyDo,
                hinh_anh: uploadedPath,
            });
            $('#orderReturnDialog').close();
            e.target.reset();
            clearReturnPhotoPreview();
            state.orderTab = 'returned';
            await loadCatalog();
            await loadMemberData();
            toast(res.message);
        } catch (err) {
            showErr(err.message || 'Không thể gửi yêu cầu trả hàng, vui lòng thử lại.');
        } finally {
            if (btn) btn.disabled = false;
        }
    });

    // Saved pet selector auto-fill + live conflict check
    $('#bookingSavedPet')?.addEventListener('change', (e) => {
        const pet = state.pets.find((x) => Number(x.ma_thu_cung) === Number(e.target.value));
        if (pet) {
            $('#bookingPet').value = pet.ten_thu_cung;
            $('#bookingType').value = pet.bieu_tuong || '🐶';
        }
        loadBookingSlots(false);
    });
    let bookingPetTimer = null;
    $('#bookingPet')?.addEventListener('input', () => {
        clearTimeout(bookingPetTimer);
        bookingPetTimer = setTimeout(() => loadBookingSlots(false), 350);
    });

    // Bộ chọn ngày định dạng dd/mm/yyyy (ngày/tháng/năm)
    setupVnDatePicker($('#bookingDateVN'), $('#bookingDateOnly'), $('#bookingDateTrigger'), () => loadBookingSlots(false));

    // Booking submit -> MySQL LichHen
    $('#bookingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        setBookingError('', false);
        const fd = new FormData(e.target);
        const petName = String(fd.get('pet') || '').trim();
        const pickedDatetime = String(fd.get('datetime') || '').trim();
        if (!petName) {
            setBookingError('Vui lòng nhập tên thú cưng của bạn nhé!');
            $('#bookingPet').focus();
            return;
        }
        if (!pickedDatetime) {
            setBookingError('Vui lòng bấm chọn một khung giờ còn trống ở trên trước khi xác nhận nhé!', true);
            return;
        }
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        try {
            const res = await AppAPI.post('backend/appointments/index.php', {
                ma_dich_vu: Number(fd.get('ma_dich_vu')),
                ma_thu_cung: fd.get('ma_thu_cung') ? Number(fd.get('ma_thu_cung')) : null,
                ten_thu_cung: petName,
                bieu_tuong: String(fd.get('emoji')),
                ngay_gio: pickedDatetime,
                ghi_chu: String(fd.get('ghi_chu') || '').trim(),
            });
            $('#bookingDialog').close();
            e.target.reset();
            setBookingError('', false);
            toast(res.message);
            if (state.currentPage === 'appointments' || state.currentPage === 'orders') loadMemberData();
        } catch (err) {
            setBookingError(err.message || 'Không thể đặt lịch, vui lòng thử lại.');
            await loadBookingSlots(false, true);
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });

    // Service review submit
    $('#serviceReviewForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!state.activeReviewService) return;
        const fd = new FormData(e.target);
        try {
            const res = await AppAPI.post('backend/reviews/index.php', {
                ma_dich_vu: state.activeReviewService.ma_dich_vu,
                so_sao: Number(fd.get('so_sao')),
                noi_dung: String(fd.get('noi_dung')).trim(),
            });
            e.target.reset();
            toast(res.message);
            await loadCatalog();
            await openServiceReviewModal(state.activeReviewService.ma_dich_vu);
        } catch (err) {
            toast(err.message);
        }
    });

    // Member avatar picker & clear
    const renderMemberAvatarPreview = (src) => {
        const box = $('#memberAvatarPreview');
        const clearBtn = $('#clearMemberAvatarBtn');
        const url = (src || '').trim();
        const initials = (state.user?.ho_ten || 'KH')
            .split(/\s+/)
            .filter(Boolean)
            .slice(-2)
            .map((w) => w[0].toUpperCase())
            .join('');
        if (box) {
            if (url) {
                box.innerHTML = '';
                const img = document.createElement('img');
                img.src = url;
                img.alt = 'Ảnh đại diện';
                box.appendChild(img);
            } else {
                box.textContent = initials;
            }
        }
        clearBtn?.classList.toggle('hidden', !url);
    };

    $('#memberAvatarFile')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) {
            toast('Kích thước ảnh đại diện tối đa là 3MB.');
            e.target.value = '';
            return;
        }
        state.pendingMemberAvatarFile = file;
        state.memberAvatarRemoved = false;
        renderMemberAvatarPreview(URL.createObjectURL(file));
    });

    $('#clearMemberAvatarBtn')?.addEventListener('click', () => {
        state.pendingMemberAvatarFile = null;
        state.memberAvatarRemoved = true;
        if ($('#memberAvatarFile')) $('#memberAvatarFile').value = '';
        renderMemberAvatarPreview('');
    });

    // Save member profile info (separated from password change)
    $('#memberProfileForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!state.user) return;
        try {
            let avatarPath = state.memberAvatarRemoved ? '' : (state.user.anh_dai_dien || '');
            if (state.pendingMemberAvatarFile) {
                const fd = new FormData();
                fd.append('image', state.pendingMemberAvatarFile);
                const up = await AppAPI.post('backend/auth/upload_avatar.php', fd);
                avatarPath = up.path || '';
            }
            const res = await AppAPI.post('backend/auth/profile.php', {
                ho_ten: $('#profName').value.trim(),
                email: $('#profEmail').value.trim(),
                so_dien_thoai: $('#profPhone').value.trim(),
                dia_chi: $('#profAddress').value.trim(),
                anh_dai_dien: avatarPath,
            });
            state.user = res.user;
            renderAuthControls();
            toast(res.message || 'Đã cập nhật hồ sơ cá nhân thành công.');
            await loadMemberData();
        } catch (err) {
            toast(err.message);
        }
    });

    // Toggle password visibility in Customer password card
    $('#toggleProfPass')?.addEventListener('change', (e) => {
        const t = e.target.checked ? 'text' : 'password';
        ['#profOldPass', '#profNewPass', '#profConfirmPass'].forEach((sel) => {
            if ($(sel)) $(sel).type = t;
        });
    });

    // Customer password change with Email OTP verification (2-step)
    let profOtpStep = false;
    let profOtpTimer = null;

    const resetProfOtpFlow = (clearInputs = false) => {
        profOtpStep = false;
        if (profOtpTimer) {
            clearInterval(profOtpTimer);
            profOtpTimer = null;
        }
        $('#profOtpPanel')?.classList.add('hidden');
        $('#profOtpOpenMailBtn')?.classList.add('hidden');
        $('#profPassError')?.classList.add('hidden');
        if ($('#profOtpCode')) $('#profOtpCode').value = '';
        ['#profOldPass', '#profNewPass', '#profConfirmPass'].forEach((sel) => {
            if ($(sel)) $(sel).readOnly = false;
        });
        if ($('#profPassSubmitBtn')) {
            $('#profPassSubmitBtn').innerHTML = `${uiIcon('lock')} Đổi mật khẩu`;
            $('#profPassSubmitBtn').disabled = false;
        }
        if (clearInputs) {
            $('#memberPasswordForm')?.reset();
            if ($('#toggleProfPass')) {
                $('#toggleProfPass').checked = false;
                ['#profOldPass', '#profNewPass', '#profConfirmPass'].forEach((sel) => {
                    if ($(sel)) $(sel).type = 'password';
                });
            }
        }
    };

    const startProfOtpCooldown = (seconds = 30) => {
        const btn = $('#profOtpResendBtn');
        if (!btn) return;
        if (profOtpTimer) clearInterval(profOtpTimer);
        let left = Math.max(1, Number(seconds) || 30);
        btn.disabled = true;
        btn.textContent = `Gửi lại (${left}s)`;
        profOtpTimer = setInterval(() => {
            left -= 1;
            if (left <= 0) {
                clearInterval(profOtpTimer);
                profOtpTimer = null;
                btn.disabled = false;
                btn.textContent = 'Gửi lại mã';
            } else {
                btn.textContent = `Gửi lại (${left}s)`;
            }
        }, 1000);
    };

    const requestProfOtp = async () => {
        const errBox = $('#profPassError');
        const showErr = (msg) => {
            if (!errBox) return toast(msg);
            errBox.textContent = msg;
            errBox.classList.toggle('hidden', !msg);
        };
        showErr('');

        const oldPass = $('#profOldPass').value;
        const newPass = $('#profNewPass').value;
        const confirmPass = $('#profConfirmPass').value;
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

        const btn = $('#profPassSubmitBtn');
        if (btn) btn.disabled = true;
        try {
            const res = await AppAPI.post('backend/auth/password_otp.php', {
                mat_khau_cu: oldPass,
                mat_khau_moi: newPass,
            });
            profOtpStep = true;
            ['#profOldPass', '#profNewPass', '#profConfirmPass'].forEach((sel) => {
                if ($(sel)) $(sel).readOnly = true;
            });
            if ($('#profOtpNote')) {
                const localHint =
                    res.delivery_status !== 'sent_smtp'
                        ? ' Bạn có thể bấm Mở Hộp thư Email bên dưới để xem mã.'
                        : '';
                $('#profOtpNote').innerHTML = `Mã xác nhận 6 chữ số đã được gửi tới <b>${safe(res.email)}</b> (hiệu lực 5 phút).${localHint}`;
            }
            $('#profOtpOpenMailBtn')?.classList.toggle('hidden', res.delivery_status === 'sent_smtp');
            $('#profOtpPanel')?.classList.remove('hidden');
            if (btn) btn.innerHTML = `${uiIcon('check')} Xác nhận đổi mật khẩu`;
            startProfOtpCooldown(res.resend_after || 30);
            $('#profOtpCode')?.focus();
            toast(res.message);
            loadCustomerEmails();
        } catch (err) {
            showErr(err.message || 'Không thể gửi mã xác nhận qua email.');
        } finally {
            if (btn) btn.disabled = false;
        }
    };

    $('#profOtpResendBtn')?.addEventListener('click', requestProfOtp);
    $('#profOtpCancelBtn')?.addEventListener('click', () => resetProfOtpFlow(false));
    $('#profOtpOpenMailBtn')?.addEventListener('click', () => openEmailInbox());
    $('#profOtpCode')?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D+/g, '').slice(0, 6);
    });

    $('#memberPasswordForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!profOtpStep) {
            await requestProfOtp();
            return;
        }

        const errBox = $('#profPassError');
        const showErr = (msg) => {
            if (!errBox) return toast(msg);
            errBox.textContent = msg;
            errBox.classList.toggle('hidden', !msg);
        };
        showErr('');

        const code = ($('#profOtpCode')?.value || '').trim();
        if (code.length !== 6) {
            showErr('Vui lòng nhập đủ mã xác nhận 6 chữ số đã gửi về email.');
            $('#profOtpCode')?.focus();
            return;
        }

        const btn = $('#profPassSubmitBtn');
        if (btn) btn.disabled = true;
        try {
            const res = await AppAPI.post('backend/auth/profile.php', {
                mat_khau_cu: $('#profOldPass').value,
                mat_khau_moi: $('#profNewPass').value,
                ma_xac_nhan: code,
                require_otp: true,
            });
            state.user = res.user;
            resetProfOtpFlow(true);
            toast(res.message || 'Đã đổi mật khẩu thành công.');
        } catch (err) {
            showErr(err.message || 'Mã xác nhận chưa chính xác.');
        } finally {
            if (btn) btn.disabled = false;
        }
    });

    // Self-delete customer account
    $('#openDeleteAccountBtn')?.addEventListener('click', () => {
        if (!state.user || state.user.role !== 'khach_hang') return;
        $('#deleteAccountForm')?.reset();
        $('#deleteAccountError')?.classList.add('hidden');
        $('#deleteAccountDialog')?.showModal();
    });

    $('#deleteAccountForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errBox = $('#deleteAccountError');
        errBox?.classList.add('hidden');
        const password = $('#delAccPassword').value;
        if (!password) {
            if (errBox) {
                errBox.textContent = 'Vui lòng nhập mật khẩu hiện tại để xác nhận.';
                errBox.classList.remove('hidden');
            }
            return;
        }
        const btn = e.target.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        try {
            const res = await AppAPI.post('backend/auth/delete_account.php', { mat_khau: password });
            $('#deleteAccountDialog').close();
            state.user = null;
            state.cart = [];
            state.emails = [];
            state.emailUnread = 0;
            state.pets = [];
            state.orders = [];
            state.appointments = [];
            state.cartSelectedKeys.clear();
            state.cartSelectionInitialized = false;
            localStorage.removeItem(GUEST_CART_KEY);
            renderAuthControls();
            renderEmailBadge();
            renderCart();
            goPage('home');
            toast(res.message || 'Tài khoản của bạn đã được xóa vĩnh viễn.');
        } catch (err) {
            if (errBox) {
                errBox.textContent = err.message || 'Không thể xóa tài khoản.';
                errBox.classList.remove('hidden');
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    });

    // Add / Edit Pet submit
    $('#addPetForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const editId = Number(fd.get('ma_thu_cung') || 0);
        const payload = {
            ten_thu_cung: String(fd.get('ten_thu_cung')).trim(),
            loai: String(fd.get('loai')).trim() || 'Chó',
            giong: String(fd.get('giong') || '').trim(),
            tuoi: String(fd.get('tuoi') || '').trim(),
            bieu_tuong: String(fd.get('bieu_tuong')),
            ghi_chu: String(fd.get('ghi_chu') || '').trim(),
        };
        try {
            let res;
            if (editId > 0) {
                payload.ma_thu_cung = editId;
                res = await AppAPI.put('backend/pets/index.php', payload);
            } else {
                res = await AppAPI.post('backend/pets/index.php', payload);
            }
            e.target.reset();
            $('#petEditId').value = '';
            $('#addPetDialog').close();
            toast(res.message);
            await loadMemberData();
        } catch (err) {
            toast(err.message);
        }
    });
    $('#openAddPetBtn').addEventListener('click', () => openPetModal(null));

    // Guest order lookup
    $('#lookupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = $('#lookupName').value.trim();
        const phone = $('#lookupPhone').value.trim();
        try {
            const res = await AppAPI.get(
                `backend/orders/index.php?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}`
            );
            renderOrdersList(res.orders || [], '#guestOrdersResult');
        } catch (err) {
            toast(err.message);
        }
    });

    // AI events
    $('#aiToggle').addEventListener('click', () => toggleAI());
    $('#aiClose').addEventListener('click', () => toggleAI(false));
    $('#navAI').addEventListener('click', () => toggleAI(true));
    $('#heroAI').addEventListener('click', () => toggleAI(true));
    $('#aiForm').addEventListener('submit', (e) => {
        e.preventDefault();
        askAI($('#aiInput').value);
    });

    $$('dialog').forEach((d) =>
        d.addEventListener('click', (e) => {
            if (e.target === d) d.close();
        })
    );
    $$('[data-close-dialog]').forEach((btn) =>
        btn.addEventListener('click', () => btn.closest('dialog')?.close())
    );
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeCart();
    });

    const hash = location.hash.replace('#', '');
    if (['home', 'shop', 'services', 'orders', 'appointments', 'profile'].includes(hash)) {
        goPage(hash);
    } else if (hash === 'buynow' && state.user) {
        history.replaceState(null, '', 'customer.html');
        try {
            const saved = JSON.parse(sessionStorage.getItem(BUY_NOW_KEY) || 'null');
            sessionStorage.removeItem(BUY_NOW_KEY);
            if (saved && saved.ma_san_pham) {
                openCheckout([saved]);
            }
        } catch {}
    } else if (hash === 'checkout' && state.user && state.cart.length) {
        history.replaceState(null, '', 'customer.html');
        openCheckout();
    }
}

setup();
