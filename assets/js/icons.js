'use strict';

/**
 * Modern Duotone SVG Icon System — Góc Nhỏ Có Em
 * Sleek 24x24 vector icons with subtle pastel blush duotone accents (zero CDN dependency).
 */
const MODERN_ICONS = {
    home: '<path class="duo" d="M5 10.5 12 4.5l7 6V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-8.5z"/><path d="M3.5 10.5 12 3.5l8.5 7M5.5 9.5V19a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V9.5"/><path d="M9.5 20.5V14a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5v6.5"/>',
    shop: '<path class="duo" d="M4.5 9.5h15l-1 9.5a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19l-1-9.5z"/><path d="M3.5 9.5 5 4.5h14l1.5 5"/><path d="M4.5 9.5v9.5A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5V9.5"/><path d="M9 13.5a3 3 0 0 0 6 0"/>',
    cart: '<path class="duo" d="M6 8h13l-1.4 8.2a1.5 1.5 0 0 1-1.5 1.3H8.4a1.5 1.5 0 0 1-1.5-1.2L6 8z"/><path d="M3 4.5h2.2l1.8 11.4a1.5 1.5 0 0 0 1.5 1.3h8.4a1.5 1.5 0 0 0 1.5-1.2L20 7.5H6"/><circle cx="9.5" cy="20" r="1.2"/><circle cx="16.5" cy="20" r="1.2"/>',
    bag: '<path class="duo" d="M6 8.5h12l1 10.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19L6 8.5z"/><path d="M6 8.5h12l1 10.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19L6 8.5z"/><path d="M9 8.5V6.5a3 3 0 0 1 6 0v2"/>',
    orders: '<rect class="duo" x="5" y="4" width="14" height="16.5" rx="2.5"/><path d="M8.5 3.5h7a2 2 0 0 1 2 2v14a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 0 1-1.5-1.5v-14a2 2 0 0 1 2-2z"/><path d="M9.5 9h5M9.5 12.5h5M9.5 16h3"/>',
    spa: '<path class="duo" d="M4.5 13h15v2.5a4.5 4.5 0 0 1-4.5 4.5H9a4.5 4.5 0 0 1-4.5-4.5V13z"/><path d="M3.5 13h17"/><path d="M5 13v2a4.5 4.5 0 0 0 4.5 4.5h5A4.5 4.5 0 0 0 19 15v-2"/><path d="M7.5 19.5 7 21M16.5 19.5l.5 1.5"/><path d="M8 13V7a2.5 2.5 0 0 1 5 0v1"/><circle cx="15.5" cy="8" r="1.2"/><circle cx="18" cy="10" r=".9"/>',
    booking: '<rect class="duo" x="3.5" y="5.5" width="17" height="14.5" rx="2.5"/><rect x="3.5" y="5.5" width="17" height="14.5" rx="2.5"/><path d="M8 3.5v3.5M16 3.5v3.5M3.5 10h17"/><path d="m9.5 15 1.8 1.8 3.5-3.6"/>',
    calendar: '<rect class="duo" x="3.5" y="5.5" width="17" height="14.5" rx="2.5"/><rect x="3.5" y="5.5" width="17" height="14.5" rx="2.5"/><path d="M8 3.5v3.5M16 3.5v3.5M3.5 10h17"/><circle cx="8.5" cy="14" r=".8"/><circle cx="12" cy="14" r=".8"/><circle cx="15.5" cy="14" r=".8"/>',
    clock: '<circle class="duo" cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    account: '<circle class="duo" cx="12" cy="8.5" r="3.5"/><path class="duo" d="M5.5 19.5a6.5 6.5 0 0 1 13 0"/><circle cx="12" cy="8.5" r="3.5"/><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0"/>',
    users: '<circle class="duo" cx="9" cy="8.5" r="3"/><path class="duo" d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M15.5 6.5a2.5 2.5 0 0 1 0 5M17 13.5a4.5 4.5 0 0 1 3.5 4.5v1"/>',
    staff: '<rect class="duo" x="4" y="6.5" width="16" height="13" rx="2.5"/><rect x="4" y="6.5" width="16" height="13" rx="2.5"/><path d="M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5M4 12h16"/>',
    search: '<circle class="duo" cx="10.8" cy="10.8" r="6.5"/><circle cx="10.8" cy="10.8" r="6.5"/><path d="m15.6 15.6 4.4 4.4"/>',
    heart: '<path class="duo" d="M12 20s-7-4.5-8.5-8.6A4.7 4.7 0 0 1 12 6.8a4.7 4.7 0 0 1 8.5 4.6C19 15.5 12 20 12 20z"/><path d="M12 20s-7-4.5-8.5-8.6A4.7 4.7 0 0 1 12 6.8a4.7 4.7 0 0 1 8.5 4.6C19 15.5 12 20 12 20z"/>',
    bell: '<path class="duo" d="M18 15.5H6c1.2-1.2 1.8-2.8 1.8-5.2a4.2 4.2 0 1 1 8.4 0c0 2.4.6 4 1.8 5.2z"/><path d="M18 15.5H6c1.2-1.2 1.8-2.8 1.8-5.2a4.2 4.2 0 1 1 8.4 0c0 2.4.6 4 1.8 5.2z"/><path d="M10 18.5a2 2 0 0 0 4 0"/>',
    settings: '<circle class="duo" cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.2a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1z"/>',
    login: '<path class="duo" d="M13 4.5h4.5A2 2 0 0 1 19.5 6.5v11a2 2 0 0 1-2 2H13z"/><path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14"/><path d="m10 8.5 3.5 3.5L10 15.5M4.5 12h9"/>',
    logout: '<path class="duo" d="M11 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H11z"/><path d="M10.5 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h4"/><path d="m15.5 8.5 3.5 3.5-3.5 3.5M10.5 12h8.5"/>',
    mail: '<rect class="duo" x="3.5" y="5.5" width="17" height="13" rx="2.2"/><rect x="3.5" y="5.5" width="17" height="13" rx="2.2"/><path d="m4.5 7 7.5 5.5L19.5 7"/>',
    'map-pin': '<path class="duo" d="M12 20.5s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z"/><path d="M12 20.5s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z"/><circle cx="12" cy="10.5" r="2"/>',
    pet: '<ellipse class="duo" cx="12" cy="15.5" rx="4.5" ry="3.4"/><ellipse cx="12" cy="15.5" rx="4.5" ry="3.4"/><circle cx="6.5" cy="10.2" r="1.5"/><circle cx="10" cy="7.2" r="1.5"/><circle cx="14" cy="7.2" r="1.5"/><circle cx="17.5" cy="10.2" r="1.5"/>',
    dog: '<path class="duo" d="M7 9.5a5 5 0 0 1 10 0v4.5a5 5 0 0 1-10 0V9.5z"/><path d="M7 9.5C5.2 8 3.5 9 3.5 11.5c0 1.6 1.2 2.5 2.5 2.5M17 9.5c1.8-1.5 3.5-.5 3.5 2 0 1.6-1.2 2.5-2.5 2.5"/><path d="M7 10a5 5 0 0 1 10 0v4a5 5 0 0 1-10 0v-4z"/><circle cx="10" cy="11.5" r=".7"/><circle cx="14" cy="11.5" r=".7"/><path d="M11 14.5q1 1 2 0"/>',
    cat: '<path class="duo" d="M6 10.5 5.5 5l4 2.5h5L18.5 5 18 10.5v2.8a6 6 0 0 1-12 0v-2.8z"/><path d="M6 10.5 5.5 5l4 2.5h5L18.5 5 18 10.5v2.8a6 6 0 0 1-12 0v-2.8z"/><circle cx="9.8" cy="12" r=".7"/><circle cx="14.2" cy="12" r=".7"/><path d="M11 14.6q1 .8 2 0"/>',
    food: '<path class="duo" d="M4.5 14h15l1 4.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5L4.5 14z"/><path d="M4.5 14h15l1 4.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5L4.5 14z"/><path d="M6.5 14a5.5 5.5 0 0 1 11 0"/>',
    toy: '<circle class="duo" cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="7.5"/><path d="M6.5 7.5a7 7 0 0 1 0 9M17.5 7.5a7 7 0 0 0 0 9"/>',
    care: '<rect class="duo" x="7" y="8.5" width="10" height="12" rx="2.5"/><rect x="7" y="8.5" width="10" height="12" rx="2.5"/><path d="M10 8.5V6h4v2.5M12 6V4M9.5 4h5.5"/>',
    accessory: '<path class="duo" d="M4.5 11.5c0 2.6 3.4 4.5 7.5 4.5s7.5-1.9 7.5-4.5S16.1 7 12 7s-7.5 1.9-7.5 4.5z"/><ellipse cx="12" cy="11.5" rx="7.5" ry="4.2"/><circle cx="12" cy="17.8" r="2"/>',
    sparkles: '<path class="duo" d="m12 3 2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3z"/><path d="m12 3 2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3z"/><path d="M19 4v3M17.5 5.5h3"/>',
    bot: '<rect class="duo" x="4.5" y="7.5" width="15" height="11.5" rx="3.5"/><rect x="4.5" y="7.5" width="15" height="11.5" rx="3.5"/><path d="M12 7.5V4.5"/><circle cx="12" cy="3.8" r="1.1"/><circle cx="9.2" cy="13" r="1"/><circle cx="14.8" cy="13" r="1"/><path d="M10 16h4M2.5 12v2.5M21.5 12v2.5"/>',
    chat: '<path class="duo" d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 17 16H9.5l-4 3.5V16H7a2.5 2.5 0 0 1-2.5-2.5v-7z"/><path d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 17 16H9.5l-4 3.5V16H7a2.5 2.5 0 0 1-2.5-2.5v-7z"/><path d="M8.5 9.5h7M8.5 12.5h4.5"/>',
    wallet: '<rect class="duo" x="3.5" y="6" width="17" height="13" rx="2.5"/><rect x="3.5" y="6" width="17" height="13" rx="2.5"/><path d="M16 12.5h4.5M5.5 6V4.5a1.5 1.5 0 0 1 1.5-1.5h10"/>',
    chart: '<rect class="duo" x="4.5" y="12" width="3.5" height="8" rx="1"/><rect class="duo" x="10.2" y="8" width="3.5" height="12" rx="1"/><rect class="duo" x="16" y="4.5" width="3.5" height="15.5" rx="1"/><rect x="4.5" y="12" width="3.5" height="8" rx="1"/><rect x="10.2" y="8" width="3.5" height="12" rx="1"/><rect x="16" y="4.5" width="3.5" height="15.5" rx="1"/>',
    trophy: '<path class="duo" d="M7 4.5h10v5a5 5 0 0 1-10 0v-5z"/><path d="M7 4.5h10v5a5 5 0 0 1-10 0v-5z"/><path d="M7 6.5H4.5a2 2 0 0 0 0 4H7M17 6.5h2.5a2 2 0 0 1 0 4H17M12 14.5V19M8.5 19.5h7"/>',
    star: '<path class="duo" d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9L12 3.5z"/><path d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9L12 3.5z"/>',
    edit: '<path class="duo" d="m14.8 5.2 4 4L9.5 18.5H5.5v-4l9.3-9.3z"/><path d="m14.8 5.2 4 4L9.5 18.5H5.5v-4l9.3-9.3z"/><path d="m12.8 7.2 4 4"/>',
    trash: '<path class="duo" d="M6.5 7.5h11l-.8 11.5a1.5 1.5 0 0 1-1.5 1.5H8.8a1.5 1.5 0 0 1-1.5-1.5L6.5 7.5z"/><path d="M4.5 7.5h15M9.5 7.5V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2.5M6.5 7.5l.8 11.5a1.5 1.5 0 0 0 1.5 1.5h6.4a1.5 1.5 0 0 0 1.5-1.5l.8-11.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    folder: '<path class="duo" d="M3.5 7A2 2 0 0 1 5.5 5h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7z"/><path d="M3.5 7A2 2 0 0 1 5.5 5h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7z"/>',
    download: '<path d="M12 4.5v10.5M8 11l4 4 4-4M4.5 18.5h15"/>',
    check: '<circle class="duo" cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.2 2.3 2.3 4.7-4.8"/>',
    alert: '<path class="duo" d="M12 4 3.5 19h17L12 4z"/><path d="M12 4 3.5 19h17L12 4z"/><path d="M12 9.5v4.5"/><circle cx="12" cy="16.5" r=".7"/>',
    promo: '<path class="duo" d="M4.5 11.5V6a1.5 1.5 0 0 1 1.5-1.5h5.5l8 8a1.8 1.8 0 0 1 0 2.5l-4.5 4.5a1.8 1.8 0 0 1-2.5 0l-8-8z"/><path d="M4.5 11.5V6a1.5 1.5 0 0 1 1.5-1.5h5.5l8 8a1.8 1.8 0 0 1 0 2.5l-4.5 4.5a1.8 1.8 0 0 1-2.5 0l-8-8z"/><circle cx="9" cy="9" r="1.2"/>',
    save: '<path class="duo" d="M5 4.5h11.5l3 3V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V6A1.5 1.5 0 0 1 6 4.5z"/><path d="M5.5 4.5h11l3 3V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V6A1.5 1.5 0 0 1 5.5 4.5z"/><path d="M8.5 4.5v5h7v-5M8 20.5v-6h8v6"/>',
    health: '<rect class="duo" x="4" y="6.5" width="16" height="13" rx="2.5"/><rect x="4" y="6.5" width="16" height="13" rx="2.5"/><path d="M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5M12 10v6M9 13h6"/>',
    box: '<path class="duo" d="m4 8 8-4 8 4v8l-8 4-8-4V8z"/><path d="m4 8 8-4 8 4v8l-8 4-8-4V8zM4 8l8 4 8-4M12 12v8"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    send: '<path class="duo" d="m20.5 3.5-7 17-2.8-7.2L3.5 10.5l17-7z"/><path d="m20.5 3.5-7 17-2.8-7.2L3.5 10.5l17-7zM10.7 13.3l9.8-9.8"/>',
    lock: '<rect class="duo" x="5" y="10.5" width="14" height="9.5" rx="2.5"/><rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/><circle cx="12" cy="15.2" r="1.2"/>',
    printer: '<path class="duo" d="M6.5 9.5h11a2 2 0 0 1 2 2v4a1.5 1.5 0 0 1-1.5 1.5H16.5v-3h-9v3H6a1.5 1.5 0 0 1-1.5-1.5v-4a2 2 0 0 1 2-2z"/><path d="M7.5 9.5V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v4.5"/><path d="M7.5 17H6a1.5 1.5 0 0 1-1.5-1.5v-4a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v4a1.5 1.5 0 0 1-1.5 1.5H16.5"/><rect x="7.5" y="14" width="9" height="6" rx="1"/>',
    receipt: '<path class="duo" d="M6 4h12v16l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 20V4z"/><path d="M6 4h12v16l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 20V4z"/><path d="M9 8.5h6M9 12h6M9 15.5h3.5"/>',
    warehouse: '<path class="duo" d="M3.5 9.5 12 4.5l8.5 5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V9.5z"/><path d="M3.5 9.5 12 4.5l8.5 5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V9.5z"/><path d="M7.5 20.5v-7h9v7M7.5 16.5h9"/>',
    'arrow-right': '<path d="M5 12h14m-5.5-5.5L19 12l-5.5 5.5"/>',
};

function renderModernSvg(name, cls = '') {
    const key = MODERN_ICONS[name] ? name : 'pet';
    return `<svg class="m-ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${MODERN_ICONS[key]}</svg>`;
}

/**
 * Thay thế tự động tất cả phần tử <i data-ico="..."> trên DOM bằng modern duotone SVG
 */
function hydrateModernIcons(root = document) {
    root.querySelectorAll('[data-ico]').forEach((el) => {
        const name = el.getAttribute('data-ico');
        const extra = el.getAttribute('data-ico-cls') || '';
        el.outerHTML = renderModernSvg(name, extra);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => hydrateModernIcons());
} else {
    hydrateModernIcons();
}
