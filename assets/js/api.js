'use strict';

/**
 * Shared API & UI helper utilities for "Góc nhỏ có em"
 */
const AppAPI = {
    async request(url, options = {}) {
        const opts = {
            credentials: 'same-origin',
            headers: {},
            ...options,
        };

        if (opts.body && !(opts.body instanceof FormData)) {
            opts.headers['Content-Type'] = 'application/json';
            if (typeof opts.body !== 'string') {
                opts.body = JSON.stringify(opts.body);
            }
        }

        const res = await fetch(url, opts);
        let data;
        try {
            data = await res.json();
        } catch {
            data = { success: false, message: 'Phản hồi máy chủ không hợp lệ (kiểm tra Apache/PHP).' };
        }

        if (!res.ok || data.success === false) {
            const err = new Error(data.message || `Lỗi kết nối (${res.status})`);
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    },

    get(url) {
        return this.request(url, { method: 'GET' });
    },

    post(url, body) {
        return this.request(url, { method: 'POST', body });
    },

    put(url, body) {
        return this.request(url, { method: 'PUT', body });
    },

    del(url) {
        return this.request(url, { method: 'DELETE' });
    },
};

const safe = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[c]));

const money = (v) => Number(v || 0).toLocaleString('vi-VN') + ' ₫';

const compactMoney = (n) => {
    const v = Number(n || 0);
    if (v >= 1000000) {
        return (v / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tr ₫';
    }
    if (v >= 1000) {
        return (v / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + 'k ₫';
    }
    return v.toLocaleString('vi-VN') + ' ₫';
};

const formatDateTime = (str) => {
    if (!str) return '—';
    const d = new Date(String(str).replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) return String(str);
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${hh}:${mi} · ${dd}/${mm}/${yyyy}`;
};

const formatDate = (str) => {
    if (!str) return '—';
    const d = new Date(String(str).replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) return String(str);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
};

const ymdToDMY = (ymd) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || '').trim());
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

const dmyToYMD = (dmy) => {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(dmy || '').trim());
    if (!m) return null;
    const day = Number(m[1]), month = Number(m[2]), year = Number(m[3]);
    const dt = new Date(year, month - 1, day);
    if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Gắn bộ chọn ngày định dạng dd/mm/yyyy (ngày/tháng/năm) kèm lịch trực quan
 */
function setupVnDatePicker(displayInput, nativeInput, triggerBtn, onValidChange) {
    if (!displayInput || !nativeInput) return;

    const openNative = () => {
        if (typeof nativeInput.showPicker === 'function') {
            try {
                nativeInput.showPicker();
                return;
            } catch {}
        }
        nativeInput.focus();
        nativeInput.click();
    };

    if (triggerBtn) triggerBtn.addEventListener('click', openNative);

    nativeInput.addEventListener('change', () => {
        if (nativeInput.value) {
            displayInput.value = ymdToDMY(nativeInput.value);
            onValidChange?.(nativeInput.value);
        }
    });

    displayInput.addEventListener('change', () => {
        const ymd = dmyToYMD(displayInput.value);
        if (!ymd) {
            displayInput.value = ymdToDMY(nativeInput.value);
            return;
        }
        if (nativeInput.min && ymd < nativeInput.min) {
            nativeInput.value = nativeInput.min;
            displayInput.value = ymdToDMY(nativeInput.min);
        } else {
            nativeInput.value = ymd;
            displayInput.value = ymdToDMY(ymd);
        }
        onValidChange?.(nativeInput.value);
    });
}

const ORDER_STATUS_LABEL = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    shipping: 'Đang giao',
    done: 'Đã giao',
    returned: 'Trả hàng',
    cancelled: 'Đã hủy',
};

const APPT_STATUS_LABEL = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    done: 'Hoàn thành',
    cancelled: 'Đã hủy',
};

const PET_TYPE_LABEL = {
    cho: 'Chó',
    meo: 'Mèo',
    ca_hai: 'Chó & Mèo',
    khac: 'Thú cưng khác',
};

const ICON_ALIAS = {
    pawly_ai: 'bot',
    chat_ai: 'chat',
    report: 'chart',
    contact: 'mail',
    review: 'star',
    fail: 'alert',
    wishlist: 'heart',
};

function uiIcon(name, cls = '') {
    const key = ICON_ALIAS[name] || name;
    if (typeof renderModernSvg === 'function') {
        return renderModernSvg(key, cls);
    }
    return '';
}

const CAT_ICON_MAP = {
    food: 'food',
    toy: 'toy',
    care: 'care',
    accessory: 'accessory',
};

function renderMarkdownLite(text) {
    return safe(text)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

/**
 * Tự động tạo mã VietQR động (chuẩn NAPAS 247 — miễn phí 100%)
 * Khi khách quét bằng app ngân hàng, tự điền sẵn Ngân hàng, STK, Chủ TK, Số tiền và Nội dung CK.
 */
const VIETQR_BANK_ALIASES = [
    ['VCB', ['VIETCOMBANK', 'VCB', 'NGOAI THUONG']],
    ['MB', ['MBBANK', 'MB BANK', 'QUAN DOI', 'MB']],
    ['TCB', ['TECHCOMBANK', 'TCB', 'KY THUONG']],
    ['BIDV', ['BIDV', 'DAU TU VA PHAT TRIEN']],
    ['ICB', ['VIETINBANK', 'VIETIN', 'CONG THUONG', 'ICB', 'CTG']],
    ['ACB', ['ACB', 'A CHAU']],
    ['TPB', ['TPBANK', 'TPB', 'TIEN PHONG']],
    ['VPB', ['VPBANK', 'VPB', 'VIET NAM THINH VUONG']],
    ['STB', ['SACOMBANK', 'STB', 'SAI GON THUONG TIN']],
    ['VBA', ['AGRIBANK', 'VBA', 'NONG NGHIEP']],
    ['HDB', ['HDBANK', 'HDB', 'PHAT TRIEN TP']],
    ['VIB', ['VIB', 'QUOC TE']],
    ['SHB', ['SHB', 'SAI GON HA NOI']],
    ['OCB', ['OCB', 'PHUONG DONG']],
    ['MSB', ['MSB', 'HANG HAI', 'MARITIME']],
    ['SEAB', ['SEABANK', 'SEAB', 'DONG NAM A']],
    ['EIB', ['EXIMBANK', 'EIB', 'XUAT NHAP KHAU']],
    ['LPB', ['LPBANK', 'LIENVIETPOSTBANK', 'LIEN VIET', 'LPB']],
    ['NAB', ['NAM A', 'NAMABANK', 'NAB']],
    ['BVB', ['BVBANK', 'VIETCAPITAL', 'BAN VIET', 'VCCB', 'BVB']],
    ['BAB', ['BAC A', 'BACABANK', 'BAB']],
    ['ABB', ['ABBANK', 'AN BINH', 'ABB']],
    ['VAB', ['VIETABANK', 'VIET A', 'VAB']],
    ['NCB', ['NCB', 'QUOC DAN']],
    ['KLB', ['KIENLONGBANK', 'KIEN LONG', 'KLB']],
    ['PVCB', ['PVCOMBANK', 'PVCB', 'DAI CHUNG']],
    ['CAKE', ['CAKE']],
    ['UBANK', ['UBANK']],
    ['TIMO', ['TIMO']],
    ['SHBVN', ['SHINHAN', 'SHBVN']],
    ['WVN', ['WOORI', 'WVN']],
    ['SCB', ['SCB']],
];

function normalizeBankStr(str) {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toUpperCase()
        .trim();
}

function resolveVietQrBankId(bankName) {
    const norm = normalizeBankStr(bankName);
    if (!norm) return '';
    // Ưu tiên mã viết tắt trong ngoặc, ví dụ: "Vietcombank (VCB)"
    const paren = norm.match(/\(([A-Z0-9]{2,8})\)/);
    if (paren) {
        const code = paren[1];
        for (const [id, aliases] of VIETQR_BANK_ALIASES) {
            if (id === code || aliases.includes(code)) return id;
        }
    }
    const compact = norm.replace(/[^A-Z0-9]/g, '');
    for (const [id, aliases] of VIETQR_BANK_ALIASES) {
        if (compact === id) return id;
        for (const a of aliases) {
            const aClean = a.replace(/[^A-Z0-9]/g, '');
            if (aClean.length >= 3 && (norm.includes(a) || compact.includes(aClean))) {
                return id;
            }
        }
    }
    // Khớp từ riêng cho mã 2 ký tự như "MB"
    if (/\bMB\b/.test(norm)) return 'MB';
    return '';
}

function stripViAccents(str) {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/\s+/g, ' ')
        .trim();
}

function buildVietQrUrl({ bankName, accountNo, accountName = '', amount = 0, addInfo = '', template = 'qr_only' }) {
    const bankId = resolveVietQrBankId(bankName);
    const accNo = String(accountNo || '').replace(/[^A-Za-z0-9]/g, '');
    if (!bankId || accNo.length < 4) return '';

    const parts = [];
    const amt = Math.round(Number(amount || 0));
    if (amt > 0) parts.push(`amount=${amt}`);
    const memo = stripViAccents(addInfo).slice(0, 80);
    if (memo) parts.push(`addInfo=${encodeURIComponent(memo)}`);
    const owner = stripViAccents(accountName).slice(0, 80);
    if (owner) parts.push(`accountName=${encodeURIComponent(owner)}`);

    const qs = parts.join('&');
    return `https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(accNo)}-${template}.png${qs ? '?' + qs : ''}`;
}

function renderDynamicQrInto(containerEl, opts = {}) {
    if (!containerEl) return false;
    const url = buildVietQrUrl(opts);
    const fallbackImg = String(opts.fallbackImg || '').trim();
    const fallbackSvg = String(opts.fallbackSvg || '');

    if (!url) {
        containerEl.dataset.qrUrl = '';
        if (fallbackImg) {
            containerEl.innerHTML = '';
            const img = document.createElement('img');
            img.src = fallbackImg;
            img.alt = 'Mã QR chuyển khoản';
            containerEl.appendChild(img);
        } else if (fallbackSvg) {
            containerEl.innerHTML = fallbackSvg;
        }
        return false;
    }

    if (containerEl.dataset.qrUrl === url && containerEl.querySelector('img')) {
        return true;
    }
    containerEl.dataset.qrUrl = url;
    containerEl.innerHTML = '';
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Mã VietQR chuyển khoản';
    img.loading = 'eager';
    img.addEventListener('error', () => {
        if (img.dataset.fallbackApplied) return;
        img.dataset.fallbackApplied = '1';
        if (fallbackImg) {
            img.src = fallbackImg;
        } else if (fallbackSvg) {
            containerEl.innerHTML = fallbackSvg;
        }
    });
    containerEl.appendChild(img);
    return true;
}
