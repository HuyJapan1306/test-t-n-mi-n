'use strict';

const $ = (s) => document.querySelector(s);

function showAlert(msg, type = 'error') {
    const box = $('#authAlert');
    box.textContent = msg;
    box.className = 'alert ' + type;
    box.classList.remove('hidden');
}

function hideAlert() {
    $('#authAlert').classList.add('hidden');
}

function switchTab(which) {
    hideAlert();
    const isLogin = which === 'login';
    $('#loginForm').classList.toggle('hidden', !isLogin);
    $('#registerForm').classList.toggle('hidden', isLogin);
    $('#loginTab').classList.toggle('active', isLogin);
    $('#registerTab').classList.toggle('active', !isLogin);
}

$('#loginTab').onclick = $('#toLogin').onclick = () => switchTab('login');
$('#registerTab').onclick = $('#toRegister').onclick = () => switchTab('register');

// Hỗ trợ chuyển nhanh sang tab đăng ký qua ?mode=register hoặc thông báo phân quyền
const params = new URLSearchParams(location.search);
if (params.get('mode') === 'register') {
    switchTab('register');
}
if (params.get('reason') === 'admin_required') {
    showAlert('Trang quản trị chỉ dành cho tài khoản Quản trị viên hoặc Nhân viên. Vui lòng đăng nhập đúng quyền.', 'error');
} else if (params.get('reason') === 'checkout_required') {
    showAlert('Vui lòng đăng nhập hoặc đăng ký tài khoản để đặt hàng. Giỏ hàng của bạn sẽ được tự động giữ lại!', 'error');
} else if (params.get('reason') === 'booking_required') {
    showAlert('Vui lòng đăng nhập hoặc đăng ký tài khoản để đặt lịch dịch vụ Spa cho bé cưng!', 'error');
} else if (params.get('reason') === 'login_required') {
    showAlert('Vui lòng đăng nhập để tiếp tục.', 'error');
}

async function syncGuestCartIfAny() {
    const guestCartRaw = localStorage.getItem('gnce_guest_cart');
    if (!guestCartRaw) return;
    try {
        const items = JSON.parse(guestCartRaw);
        if (Array.isArray(items) && items.length) {
            await AppAPI.post('backend/cart/index.php', {
                sync_items: items.map((i) => ({
                    ma_san_pham: i.id,
                    so_luong: i.qty,
                    phan_loai: i.variant || '',
                })),
            });
            localStorage.removeItem('gnce_guest_cart');
        }
    } catch {}
}

let regOtpEnabled = true;

// Đồng bộ logo cửa hàng & trạng thái OTP đăng ký từ cài đặt MySQL
AppAPI.get('backend/settings/index.php')
    .then((res) => {
        const s = res?.settings || {};
        regOtpEnabled = s.reg_otp_enabled !== '0';
        const logo = (s.store_logo || '').trim();
        if (!logo) return;
        document.querySelectorAll('.auth-logo-img').forEach((img) => {
            img.src = logo;
        });
        const fav = document.querySelector('link[rel="icon"]');
        if (fav) fav.href = logo;
    })
    .catch(() => {});

// Kiểm tra xem đã đăng nhập sẵn chưa
AppAPI.get('backend/auth/me.php')
    .then((res) => {
        if (res.authenticated && res.user && !params.get('reason')) {
            const dest = ['admin', 'nhan_vien'].includes(res.user.role) ? 'index.html' : 'customer.html';
            showAlert(`Bạn đang đăng nhập với tài khoản ${res.user.ho_ten} (${res.user.role}). Đang chuyển trang...`, 'success');
            setTimeout(() => {
                location.href = dest;
            }, 900);
        }
    })
    .catch(() => {});

// Ô tích chọn hiển thị / ẩn mật khẩu
document.querySelectorAll('[data-toggle-pass]').forEach((cb) => {
    cb.addEventListener('change', () => {
        const target = document.getElementById(cb.dataset.togglePass);
        if (target) {
            target.type = cb.checked ? 'text' : 'password';
        }
    });
});

// Nút điền nhanh tài khoản mẫu để kiểm thử đồ án
document.querySelectorAll('[data-fill]').forEach((btn) => {
    btn.addEventListener('click', () => {
        switchTab('login');
        $('#loginIdentifier').value = btn.dataset.email;
        $('#loginPassword').value = btn.dataset.pass;
        hideAlert();
    });
});

// Đăng nhập
$('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();
    const submitBtn = e.target.querySelector('.submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang xác thực...';

    try {
        const res = await AppAPI.post('backend/auth/login.php', {
            identifier: $('#loginIdentifier').value.trim(),
            mat_khau: $('#loginPassword').value,
        });

        // Đồng bộ giỏ hàng tạm của khách vãng lai (nếu có) vào MySQL
        await syncGuestCartIfAny();

        showAlert(res.message || 'Đăng nhập thành công!', 'success');
        const next = params.get('next');
        const target = next && !next.includes('://') ? next : (res.redirect || 'customer.html');
        setTimeout(() => {
            location.href = target;
        }, 500);
    } catch (err) {
        showAlert(err.message || 'Đăng nhập thất bại.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Đăng nhập';
    }
});

// Đăng ký tài khoản khách hàng (hỗ trợ xác nhận OTP SĐT 2 bước)
let regOtpStep = false;
let regOtpTimer = null;

function resetRegOtpFlow() {
    regOtpStep = false;
    if (regOtpTimer) {
        clearInterval(regOtpTimer);
        regOtpTimer = null;
    }
    $('#regOtpPanel')?.classList.add('hidden');
    $('#regSmsDemoBanner')?.classList.add('hidden');
    if ($('#regOtpCode')) $('#regOtpCode').value = '';
    ['#regName', '#regEmail', '#regPhone', '#regAddress', '#regPassword'].forEach((sel) => {
        if ($(sel)) $(sel).readOnly = false;
    });
    const submitBtn = $('#regSubmitBtn') || $('#registerForm .submit');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Tạo tài khoản';
    }
}

function startRegOtpCooldown(seconds = 30) {
    const btn = $('#regOtpResendBtn');
    if (!btn) return;
    if (regOtpTimer) clearInterval(regOtpTimer);
    let left = Math.max(1, Number(seconds) || 30);
    btn.disabled = true;
    btn.textContent = `Gửi lại (${left}s)`;
    regOtpTimer = setInterval(() => {
        left -= 1;
        if (left <= 0) {
            clearInterval(regOtpTimer);
            regOtpTimer = null;
            btn.disabled = false;
            btn.textContent = 'Gửi lại mã';
        } else {
            btn.textContent = `Gửi lại (${left}s)`;
        }
    }, 1000);
}

async function requestRegPhoneOtp() {
    hideAlert();
    const submitBtn = $('#regSubmitBtn') || $('#registerForm .submit');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang gửi mã OTP...';
    }

    try {
        const res = await AppAPI.post('backend/auth/register_otp.php', {
            ho_ten: $('#regName').value.trim(),
            email: $('#regEmail').value.trim(),
            so_dien_thoai: $('#regPhone').value.trim(),
            mat_khau: $('#regPassword').value,
        });

        regOtpStep = true;
        ['#regName', '#regEmail', '#regPhone', '#regAddress', '#regPassword'].forEach((sel) => {
            if ($(sel)) $(sel).readOnly = true;
        });
        if ($('#regOtpNote')) {
            $('#regOtpNote').innerHTML = `Mã xác nhận 6 chữ số đã được gửi tới số <b>${res.masked_phone || ''}</b> (hiệu lực 5 phút).`;
        }
        const demoBox = $('#regSmsDemoBanner');
        if (demoBox && res.demo_sms) {
            if ($('#regSmsDemoSender')) $('#regSmsDemoSender').textContent = `SMS · ${res.demo_sms.sender}`;
            if ($('#regSmsDemoText')) {
                const otpEsc = String(res.demo_sms.otp || '').replace(/</g, '&lt;');
                const txt = String(res.demo_sms.text || '').replace(/</g, '&lt;');
                $('#regSmsDemoText').innerHTML = txt.replace(otpEsc, `<strong>${otpEsc}</strong>`);
            }
            demoBox.classList.remove('hidden');
        } else {
            demoBox?.classList.add('hidden');
        }

        $('#regOtpPanel')?.classList.remove('hidden');
        startRegOtpCooldown(res.resend_after || 30);
        if (submitBtn) submitBtn.textContent = 'Xác nhận & Hoàn tất đăng ký';
        $('#regOtpCode')?.focus();
        showAlert(res.message || 'Đã gửi mã OTP xác nhận số điện thoại.', 'success');
    } catch (err) {
        showAlert(err.message || 'Không thể gửi mã OTP xác nhận số điện thoại.');
        if (submitBtn) submitBtn.textContent = regOtpStep ? 'Xác nhận & Hoàn tất đăng ký' : 'Tạo tài khoản';
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

$('#regOtpResendBtn')?.addEventListener('click', requestRegPhoneOtp);
$('#regOtpCancelBtn')?.addEventListener('click', () => {
    hideAlert();
    resetRegOtpFlow();
});
$('#regOtpCode')?.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D+/g, '').slice(0, 6);
});

$('#registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    if (regOtpEnabled && !regOtpStep) {
        await requestRegPhoneOtp();
        return;
    }

    const otpCode = ($('#regOtpCode')?.value || '').trim();
    if (regOtpEnabled && otpCode.length !== 6) {
        showAlert('Vui lòng nhập đủ mã OTP 6 chữ số đã gửi về số điện thoại.');
        $('#regOtpCode')?.focus();
        return;
    }

    const submitBtn = $('#regSubmitBtn') || e.target.querySelector('.submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang xác nhận...';

    try {
        const res = await AppAPI.post('backend/auth/register.php', {
            ho_ten: $('#regName').value.trim(),
            email: $('#regEmail').value.trim(),
            so_dien_thoai: $('#regPhone').value.trim(),
            dia_chi: $('#regAddress').value.trim(),
            mat_khau: $('#regPassword').value,
            ma_xac_nhan: otpCode,
        });

        await syncGuestCartIfAny();

        showAlert(res.message || 'Đăng ký thành công!', 'success');
        const next = params.get('next');
        const target = next && !next.includes('://') ? next : 'customer.html';
        setTimeout(() => {
            location.href = target;
        }, 650);
    } catch (err) {
        showAlert(err.message || 'Không thể đăng ký tài khoản.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = regOtpStep ? 'Xác nhận & Hoàn tất đăng ký' : 'Tạo tài khoản';
    }
});
