/* ============================================
   BEAN BOUTIQUE — App Logic v2.0
   ============================================ */

'use strict';

// ─── State ────────────────────────────────────
const STATE = {
  cart: JSON.parse(localStorage.getItem('bb_cart') || '[]'),
  user: JSON.parse(localStorage.getItem('bb_user') || 'null'),
  // Wishlist entries are objects {id,name,price,img}; legacy string ids are normalised
  wishlist: JSON.parse(localStorage.getItem('bb_wishlist') || '[]')
    .map(w => (typeof w === 'string' ? { id: w, name: w, price: 0, img: '' } : w)),
  orders: JSON.parse(localStorage.getItem('bb_orders') || '[]'),
  events: JSON.parse(localStorage.getItem('bb_events') || '[]'),
  subscription: JSON.parse(localStorage.getItem('bb_subscription') || 'null'),
};

function persist(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

// Items saved earlier may reference image URLs that no longer exist; point them at working ones
const DEAD_IMAGES = {
  'photo-1585236166440-272cbce50bb8': '/static/images/espresso_machine.jpg',
  'photo-1544421255-a638b975af48': '/static/images/french_press.jpg',
};
function fixImg(src) {
  if (!src) return src;
  for (const k in DEAD_IMAGES) if (src.includes(k)) return DEAD_IMAGES[k];
  return src;
}
STATE.cart.forEach(i => { i.img = fixImg(i.img); });
STATE.wishlist.forEach(w => { w.img = fixImg(w.img); });
STATE.orders.forEach(o => o.items.forEach(i => { i.img = fixImg(i.img); }));

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtINR(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }

// ─── Cart helpers ──────────────────────────────
function saveCart() {
  localStorage.setItem('bb_cart', JSON.stringify(STATE.cart));
  updateCartUI();
}

function updateCartUI() {
  const count = STATE.cart.reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('.cart-counter').forEach(el => {
    el.textContent = count;
    el.classList.remove('bump');
    void el.offsetWidth; // reflow
    if (count > 0) el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 400);
  });
}

function addToCart(btn, id, name, price) {
  const existing = STATE.cart.find(i => i.id === id);
  const img = btn.closest('.card')?.querySelector('img')?.src || '';
  if (existing) {
    existing.qty++;
  } else {
    STATE.cart.push({ id, name, price, qty: 1, img });
  }
  saveCart();
  showToast(`Added <strong>${name}</strong> to cart`, 'success');

  // Transform button to qty controls
  const footer = btn.closest('.card-footer');
  if (footer) renderQtyControls(footer, id, price, 1);
}

function renderQtyControls(footer, id, price, qty) {
  const priceEl = footer.querySelector('.price')?.outerHTML || `<span class="price">${price}</span>`;
  footer.innerHTML = `
    ${priceEl}
    <div class="qty-controls" data-id="${id}">
      <button type="button" onclick="changeQty(this,-1,'${id}')" aria-label="Decrease">−</button>
      <span class="qty-val">${qty}</span>
      <button type="button" onclick="changeQty(this,1,'${id}')" aria-label="Increase">+</button>
    </div>
  `;
}

function changeQty(btn, delta, id) {
  const item = STATE.cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    STATE.cart.splice(STATE.cart.indexOf(item), 1);
    const footer = btn.closest('.card-footer');
    if (footer) {
      const price = footer.querySelector('.price')?.textContent || '';
      footer.innerHTML = `
        <span class="price">${price}</span>
        <button class="btn btn-primary btn-sm" onclick="addToCart(this,'${id}','${item.name}','${item.price}')">Add to Cart</button>
      `;
    }
  } else {
    btn.parentElement.querySelector('.qty-val').textContent = item.qty;
  }
  saveCart();
}

// ─── Wishlist ──────────────────────────────────
function saveWishlist() {
  localStorage.setItem('bb_wishlist', JSON.stringify(STATE.wishlist));
}

function toggleWishlist(btn, id, name) {
  btn.classList.toggle('active');
  const icon = btn.querySelector('i');
  if (btn.classList.contains('active')) {
    icon.classList.replace('far', 'fas');
    if (!STATE.wishlist.some(w => w.id === id)) {
      const card = btn.closest('.card');
      const priceText = card?.querySelector('.price')?.firstChild?.textContent || '';
      STATE.wishlist.push({
        id,
        name: name || card?.querySelector('.card-title')?.textContent?.trim() || 'Item',
        price: parseFloat(priceText.replace(/[^\d.]/g, '')) || 0,
        img: card?.querySelector('img')?.src || '',
        tag: card?.querySelector('.card-tag')?.textContent?.trim() || '',
        desc: card?.querySelector('.card-desc')?.textContent?.trim() || '',
      });
    }
    showToast(`<strong>${esc(name || 'Item')}</strong> added to wishlist`, 'info');
  } else {
    icon.classList.replace('fas', 'far');
    STATE.wishlist = STATE.wishlist.filter(w => w.id !== id);
    showToast(`Removed from wishlist`, 'info');
  }
  saveWishlist();
}

// Restore filled hearts for wishlisted items on catalogue pages
function initWishlistButtons() {
  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    const m = (btn.getAttribute('onclick') || '').match(/toggleWishlist\(this,\s*'([^']+)'/);
    if (m && STATE.wishlist.some(w => w.id === m[1])) {
      btn.classList.add('active');
      btn.querySelector('i')?.classList.replace('far', 'fas');
    }
  });
}

// ─── Auth ──────────────────────────────────────
function openAuthModal(e) {
  if (e) e.preventDefault();
  showModal(`
    <div class="modal-icon"><i class="fas fa-coffee"></i></div>
    <h2 class="modal-title">Welcome back</h2>
    <p class="modal-subtitle">Sign in to your account or create a new one.</p>
    <div class="auth-tabs">
      <button class="auth-tab active" id="tabLogin" onclick="switchTab('login')">Sign In</button>
      <button class="auth-tab" id="tabSignup" onclick="switchTab('signup')">Create Account</button>
    </div>
    <div id="authFormContainer"></div>
  `, () => renderLoginForm());
}

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(tab === 'login' ? 'tabLogin' : 'tabSignup').classList.add('active');
  if (tab === 'login') renderLoginForm();
  else renderSignupForm();
}

function renderLoginForm() {
  document.getElementById('authFormContainer').innerHTML = `
    <div class="form-group">
      <label for="loginEmail">Email address</label>
      <input class="form-input" type="email" id="loginEmail" placeholder="you@example.com" autocomplete="email">
    </div>
    <div class="form-group">
      <label for="loginPass">Password</label>
      <input class="form-input" type="password" id="loginPass" placeholder="••••••••" autocomplete="current-password">
    </div>
    <button class="btn btn-primary btn-full" style="margin-top:0.5rem;" onclick="simulateLogin()">Sign In</button>
    <p style="text-align:center;font-size:0.8rem;color:var(--clr-text-faint);margin-top:1rem;">
      <a href="#" onclick="showComingSoon(event)" style="color:var(--clr-accent);">Forgot your password?</a>
    </p>
  `;
  document.getElementById('loginEmail')?.focus();
}

function renderSignupForm() {
  document.getElementById('authFormContainer').innerHTML = `
    <div class="form-row">
      <div class="form-group">
        <label for="signupFirst">First name</label>
        <input class="form-input" type="text" id="signupFirst" placeholder="Jane" autocomplete="given-name">
      </div>
      <div class="form-group">
        <label for="signupLast">Last name</label>
        <input class="form-input" type="text" id="signupLast" placeholder="Doe" autocomplete="family-name">
      </div>
    </div>
    <div class="form-group">
      <label for="signupEmail">Email address</label>
      <input class="form-input" type="email" id="signupEmail" placeholder="you@example.com" autocomplete="email">
    </div>
    <div class="form-group">
      <label for="signupPass">Password</label>
      <input class="form-input" type="password" id="signupPass" placeholder="Create a strong password" autocomplete="new-password">
    </div>
    <button class="btn btn-primary btn-full" style="margin-top:0.5rem;" onclick="simulateSignup()">Create Account</button>
  `;
  document.getElementById('signupFirst')?.focus();
}

function simulateLogin() {
  const email = document.getElementById('loginEmail')?.value?.trim();
  if (!email) { showToast('Please enter your email', 'error'); return; }
  const prev = STATE.user && STATE.user.email === email ? STATE.user : {};
  STATE.user = { ...prev, name: prev.name || email.split('@')[0], email, initial: (prev.name || email)[0].toUpperCase() };
  localStorage.setItem('bb_user', JSON.stringify(STATE.user));
  closeModal();
  updateUserUI();
  showToast(`Welcome back, <strong>${esc(STATE.user.name)}</strong>!`, 'success');
  renderAccountPages();
}

function simulateSignup() {
  const first = document.getElementById('signupFirst')?.value?.trim();
  const last = document.getElementById('signupLast')?.value?.trim() || '';
  const email = document.getElementById('signupEmail')?.value?.trim();
  if (!first || !email) { showToast('Please fill in all fields', 'error'); return; }
  STATE.user = { name: first, lastName: last, email, initial: first[0].toUpperCase() };
  localStorage.setItem('bb_user', JSON.stringify(STATE.user));
  closeModal();
  updateUserUI();
  showToast(`Account created! Welcome, <strong>${esc(first)}</strong>!`, 'success');
  renderAccountPages();
}

function logoutUser(e) {
  if (e) e.preventDefault();
  STATE.user = null;
  localStorage.removeItem('bb_user');
  updateUserUI();
  document.getElementById('userMenuDropdown')?.classList.remove('active');
  showToast('You have been signed out', 'info');
  renderAccountPages();
}

function updateUserUI() {
  const loginBtn = document.getElementById('loginNavBtn');
  const userNav = document.getElementById('userNavBtn');
  const avatar = document.querySelector('.user-avatar');
  if (STATE.user) {
    loginBtn && (loginBtn.style.display = 'none');
    userNav && (userNav.style.display = 'flex');
    if (avatar) {
      avatar.textContent = STATE.user.initial || '?';
      avatar.title = STATE.user.name;
    }
  } else {
    loginBtn && (loginBtn.style.display = '');
    userNav && (userNav.style.display = 'none');
  }
}

function toggleUserMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('userMenuDropdown');
  menu?.classList.toggle('active');
}

// ─── Modal system ──────────────────────────────
function showModal(htmlContent, onOpen) {
  let overlay = document.getElementById('globalModal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'globalModal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal-box" id="modalBox">
      <button class="modal-close-btn" onclick="closeModal()" aria-label="Close"><i class="fas fa-times"></i></button>
      <div id="modalBody"></div>
    </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
  }
  document.getElementById('modalBody').innerHTML = htmlContent;
  overlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
  if (typeof onOpen === 'function') onOpen();
}

function closeModal() {
  const overlay = document.getElementById('globalModal');
  if (overlay) {
    overlay.classList.remove('visible');
    document.body.style.overflow = '';
  }
}

// ─── Details modal ─────────────────────────────
function openDetailsModal(title, desc, price, tag, imgSrc) {
  showModal(`
    ${imgSrc ? `<img src="${imgSrc}" alt="${title}" style="width:100%;border-radius:var(--radius);margin-bottom:1.25rem;max-height:220px;object-fit:cover;">` : ''}
    <span style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;color:var(--clr-accent);">${tag || ''}</span>
    <h2 class="modal-title" style="margin-top:0.25rem;">${title}</h2>
    <p class="modal-subtitle">${desc}</p>
    ${price ? `<p style="font-size:1.5rem;font-weight:700;color:var(--clr-text);margin-bottom:1.25rem;">${price}</p>` : ''}
    <button class="btn btn-outline btn-full" onclick="closeModal()">Close</button>
  `);
}

// ─── Event Registration ─────────────────────────
let PENDING_EVENT = null;
function openEventRegistration(eventName, eventDate) {
  PENDING_EVENT = { name: eventName, date: eventDate };
  showModal(`
    <div class="modal-icon"><i class="fas fa-calendar-check"></i></div>
    <h2 class="modal-title">Register for Event</h2>
    <p class="modal-subtitle"><strong>${eventName}</strong> — ${eventDate}</p>
    <div class="register-form">
      <div class="form-row">
        <div class="form-group">
          <label>First name</label>
          <input class="form-input" id="regFirst" type="text" placeholder="Jane">
        </div>
        <div class="form-group">
          <label>Last name</label>
          <input class="form-input" id="regLast" type="text" placeholder="Doe">
        </div>
      </div>
      <div class="form-group">
        <label>Email address</label>
        <input class="form-input" id="regEmail" type="email" placeholder="you@example.com">
      </div>
      <button class="btn btn-primary btn-full" onclick="submitEventRegistration('${eventName}')">Confirm Registration</button>
    </div>
  `);
}

function submitEventRegistration(name) {
  const first = document.getElementById('regFirst')?.value?.trim();
  const email = document.getElementById('regEmail')?.value?.trim();
  if (!first || !email) { showToast('Please fill in all fields', 'error'); return; }
  if (STATE.events.some(ev => ev.name === name && ev.email === email)) {
    closeModal();
    showToast(`You're already registered for <strong>${esc(name)}</strong>`, 'info');
    return;
  }
  STATE.events.push({
    id: 'ev' + Date.now(),
    name,
    date: PENDING_EVENT?.date || '',
    first,
    last: document.getElementById('regLast')?.value?.trim() || '',
    email,
    registeredAt: new Date().toISOString(),
  });
  persist('bb_events', STATE.events);
  closeModal();
  showToast(`You're registered for <strong>${esc(name)}</strong>!`, 'success');
}

// ─── Subscription flow ─────────────────────────
function openSubscribeModal(tier, price) {
  showModal(`
    <div class="modal-icon"><i class="fas fa-box-open"></i></div>
    <h2 class="modal-title">Subscribe — ${tier}</h2>
    <p class="modal-subtitle">You're about to subscribe to the <strong>${tier}</strong> plan at <strong>${price}/mo</strong>. Cancel anytime.</p>
    <div class="form-group">
      <label>Email address</label>
      <input class="form-input" id="subEmail" type="email" placeholder="you@example.com"
        value="${STATE.user?.email || ''}">
    </div>
    <div class="form-group">
      <label>Grind preference</label>
      <select class="form-input filter-chip" id="subGrind">
        <option>Whole Bean</option>
        <option>Espresso</option>
        <option>Filter / Pour-over</option>
        <option>Cafetière</option>
      </select>
    </div>
    <button class="btn btn-primary btn-full" style="margin-top:0.5rem;" onclick="confirmSubscription('${tier}','${price}')">Start Subscription</button>
  `);
}

function confirmSubscription(tier, price) {
  const email = document.getElementById('subEmail')?.value?.trim();
  if (!email) { showToast('Please enter your email', 'error'); return; }
  STATE.subscription = {
    tier,
    price: price || '',
    grind: document.getElementById('subGrind')?.value || 'Whole Bean',
    email,
    since: new Date().toISOString(),
  };
  persist('bb_subscription', STATE.subscription);
  closeModal();
  showToast(`🎉 Subscribed to <strong>${tier}</strong>! Check your inbox.`, 'success');
}

// ─── Checkout ──────────────────────────────────
function openCheckout() {
  if (STATE.cart.length === 0) {
    showToast('Your cart is empty', 'error');
    return;
  }
  showModal(`
    <div class="modal-icon"><i class="fas fa-lock"></i></div>
    <h2 class="modal-title">Secure Checkout</h2>
    <p class="modal-subtitle">Complete your order details below.</p>
    <div class="form-row">
      <div class="form-group">
        <label>First name</label>
        <input class="form-input" id="ckFirst" type="text" placeholder="Jane">
      </div>
      <div class="form-group">
        <label>Last name</label>
        <input class="form-input" id="ckLast" type="text" placeholder="Doe">
      </div>
    </div>
    <div class="form-group">
      <label>Email</label>
      <input class="form-input" id="ckEmail" type="email" placeholder="you@example.com" value="${STATE.user?.email || ''}">
    </div>
    <div class="form-group">
      <label>Shipping address</label>
      <input class="form-input" id="ckAddr" type="text" placeholder="123 Roastery Lane, Mumbai">
    </div>
    <div class="form-group">
      <label>Card number</label>
      <input class="form-input" id="ckCard" type="text" placeholder="•••• •••• •••• ••••" maxlength="19" oninput="formatCard(this)">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Expiry (MM/YY)</label>
        <input class="form-input" type="text" placeholder="MM/YY" maxlength="5">
      </div>
      <div class="form-group">
        <label>CVV</label>
        <input class="form-input" type="text" placeholder="•••" maxlength="3">
      </div>
    </div>
    <button class="btn btn-primary btn-full" style="margin-top:0.5rem;" onclick="submitOrder()">
      <i class="fas fa-lock" style="font-size:0.75rem;"></i> Place Order
    </button>
    <p style="text-align:center;font-size:0.75rem;color:var(--clr-text-faint);margin-top:0.75rem;">
      <i class="fas fa-shield-alt"></i> Your payment is encrypted and secure
    </p>
  `);
}

function formatCard(input) {
  let v = input.value.replace(/\D/g, '').substring(0, 16);
  input.value = v.replace(/(.{4})/g, '$1 ').trim();
}

function calcCartTotals() {
  let subtotal = STATE.cart.reduce((s, i) => s + (parseFloat(String(i.price).replace(/[^\d.]/g, '')) || 0) * i.qty, 0);
  const discount = localStorage.getItem('bb_promo') === 'BEAN10' ? Math.round(subtotal * 0.1) : 0;
  subtotal -= discount;
  const shipping = subtotal > 5000 ? 0 : 149;
  return { subtotal, discount, shipping, total: subtotal + shipping };
}

function submitOrder() {
  const first = document.getElementById('ckFirst')?.value?.trim();
  const email = document.getElementById('ckEmail')?.value?.trim();
  const card = document.getElementById('ckCard')?.value?.trim();
  if (!first || !email || !card) { showToast('Please fill in all required fields', 'error'); return; }
  const t = calcCartTotals();
  STATE.orders.unshift({
    id: 'BB' + String(Date.now()).slice(-7),
    date: new Date().toISOString(),
    email,
    address: document.getElementById('ckAddr')?.value?.trim() || '',
    items: STATE.cart.map(i => ({ id: i.id, name: i.name, price: parseFloat(String(i.price).replace(/[^\d.]/g, '')) || 0, qty: i.qty, img: i.img })),
    discount: t.discount, shipping: t.shipping, total: t.total,
    status: 'Processing',
  });
  persist('bb_orders', STATE.orders);
  localStorage.removeItem('bb_promo');
  STATE.cart = [];
  saveCart();
  closeModal();
  showToast('🎉 Order placed! Thank you for your purchase.', 'success');
  setTimeout(() => renderCartPage(), 300);
}

// ─── Cart page ─────────────────────────────────
function renderCartPage() {
  const itemsList = document.getElementById('cartItemsList');
  const emptyState = document.getElementById('cartEmptyState');
  const summaryPanel = document.getElementById('cartSummary');
  if (!itemsList) return;

  if (STATE.cart.length === 0) {
    itemsList.innerHTML = '';
    emptyState && (emptyState.style.display = 'block');
    summaryPanel && (summaryPanel.style.display = 'none');
    return;
  }

  emptyState && (emptyState.style.display = 'none');
  summaryPanel && (summaryPanel.style.display = '');

  let html = '';
  let subtotal = 0;
  STATE.cart.forEach(item => {
    const itemPrice = parseFloat(String(item.price).replace(/[^\d.]/g, '')) || 0;
    const lineTotal = itemPrice * item.qty;
    subtotal += lineTotal;
    html += `
      <div class="cart-item" id="cart-item-${item.id}">
        <img src="${item.img || 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?auto=format&fit=crop&w=200&q=80'}" alt="${item.name}" class="cart-img">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-variant">Whole Bean</div>
          <div class="cart-item-price">₹${itemPrice.toLocaleString('en-IN')}</div>
        </div>
        <div class="cart-item-actions">
          <div class="qty-controls">
            <button type="button" onclick="updateCartItemQty('${item.id}',-1)" aria-label="Decrease">−</button>
            <span class="qty-val">${item.qty}</span>
            <button type="button" onclick="updateCartItemQty('${item.id}',1)" aria-label="Increase">+</button>
          </div>
          <button class="cart-remove-btn" onclick="removeCartItem('${item.id}')" aria-label="Remove">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  });
  itemsList.innerHTML = html;

  // Update summary
  const discount = localStorage.getItem('bb_promo') === 'BEAN10' ? Math.round(subtotal * 0.1) : 0;
  const dRow = document.getElementById('discountRow');
  if (dRow) dRow.style.display = discount ? 'flex' : 'none';
  const dEl = document.getElementById('summaryDiscount');
  if (dEl) dEl.textContent = `−₹${discount.toLocaleString('en-IN')}`;
  subtotal -= discount;
  const shipping = subtotal > 5000 ? 0 : 149;
  document.getElementById('summarySubtotal') && (document.getElementById('summarySubtotal').textContent = `₹${subtotal.toLocaleString('en-IN')}`);
  document.getElementById('summaryShipping') && (document.getElementById('summaryShipping').textContent = shipping === 0 ? 'Free' : `₹${shipping}`);
  document.getElementById('summaryTotal') && (document.getElementById('summaryTotal').textContent = `₹${(subtotal + shipping).toLocaleString('en-IN')}`);
}

function updateCartItemQty(id, delta) {
  const item = STATE.cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    STATE.cart.splice(STATE.cart.indexOf(item), 1);
    document.getElementById(`cart-item-${id}`)?.remove();
  } else {
    const el = document.querySelector(`#cart-item-${id} .qty-val`);
    if (el) el.textContent = item.qty;
  }
  saveCart();
  renderCartPage();
}

function removeCartItem(id) {
  STATE.cart = STATE.cart.filter(i => i.id !== id);
  saveCart();
  renderCartPage();
  showToast('Item removed from cart', 'info');
}

function clearCart() {
  if (STATE.cart.length === 0) return;
  STATE.cart = [];
  saveCart();
  renderCartPage();
  showToast('Cart cleared', 'info');
}

// ─── Toast notifications ───────────────────────
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: 'fa-check', error: 'fa-exclamation', info: 'fa-info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i class="fas ${icons[type] || 'fa-info'}"></i></div>
    <div class="toast-message">${message}</div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('dismissing');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ─── Search / Filter ───────────────────────────
function initSearch() {
  document.querySelectorAll('.search-input').forEach(input => {
    input.addEventListener('input', debounce(() => {
      const q = input.value.toLowerCase().trim();
      document.querySelectorAll('.card').forEach(card => {
        const text = card.textContent.toLowerCase();
        const matches = !q || text.includes(q);
        card.style.display = matches ? '' : 'none';
        card.style.opacity = matches ? '1' : '0';
      });
    }, 200));
  });
}

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

// ─── Scroll reveal ─────────────────────────────
function initScrollReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('[data-reveal]').forEach(el => obs.observe(el));
}

// ─── Navbar scroll effect ──────────────────────
function initNavbar() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  const updateNav = () => {
    if (window.scrollY > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();
}

// ─── Mobile nav ────────────────────────────────
function toggleMobileNav() {
  const hamburger = document.querySelector('.nav-hamburger');
  const drawer = document.getElementById('mobileNavDrawer');
  hamburger?.classList.toggle('open');
  drawer?.classList.toggle('open');
  document.body.style.overflow = drawer?.classList.contains('open') ? 'hidden' : '';
}

// ─── Active nav link ───────────────────────────
function setActiveNavLink() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a, .nav-mobile-drawer a').forEach(a => {
    const href = a.getAttribute('href') || '';
    a.classList.toggle('active',
      href === path ||
      (path === '/' && href === '/') ||
      (href !== '/' && path.startsWith(href))
    );
  });
}

// ─── Coming Soon ───────────────────────────────
function showComingSoon(e) {
  if (e) e.preventDefault();
  showModal(`
    <div class="modal-icon"><i class="fas fa-rocket"></i></div>
    <h2 class="modal-title">Coming Soon</h2>
    <p class="modal-subtitle">We're working hard on this feature. Sign up to be notified when it launches.</p>
    <div class="form-group">
      <input class="form-input" type="email" placeholder="your@email.com">
    </div>
    <button class="btn btn-primary btn-full" onclick="closeModal();showToast('You\'re on the list!','success')">Notify Me</button>
  `);
}

// ─── Remove from cart page ─────────────────────
function removeFromCartPage(btn) {
  btn.closest('.cart-item')?.remove();
}

// ─── Promo code ────────────────────────────────
function applyPromo() {
  const input = document.getElementById('promoInput');
  const val = input?.value?.trim().toUpperCase();
  if (val === 'BEAN10') {
    localStorage.setItem('bb_promo', 'BEAN10');
    showToast('Promo applied: 10% off!', 'success');
    input.value = '';
    renderCartPage();
  } else if (val) {
    showToast('Invalid promo code', 'error');
    input.style.borderColor = 'var(--clr-red)';
    setTimeout(() => { if (input) input.style.borderColor = ''; }, 2000);
  }
}

// ─── Account pages ─────────────────────────────
function loginGate(icon, title) {
  return `<div class="cart-empty"><i class="fas ${icon}"></i><h2>Sign in to view ${title}</h2>
    <p>You need to be signed in to access this page.</p>
    <button class="btn btn-primary" onclick="openAuthModal(event)">Sign In</button></div>`;
}

function emptyBlock(icon, title, text, href, cta) {
  return `<div class="cart-empty"><i class="fas ${icon}"></i><h2>${title}</h2><p>${text}</p>
    <a href="${href}" class="btn btn-primary">${cta}</a></div>`;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderAccountPages() {
  renderProfilePage();
  renderOrdersPage();
  renderWishlistPage();
  renderMyEventsPage();
}

// Profile
function renderProfilePage() {
  const root = document.getElementById('profileRoot');
  if (!root) return;
  if (!STATE.user) { root.innerHTML = loginGate('fa-user-circle', 'your profile'); return; }
  const u = STATE.user;
  const sub = STATE.subscription;
  root.innerHTML = `
    <div class="account-grid">
      <div class="cart-panel profile-card">
        <div class="profile-avatar">${esc(u.initial || '?')}</div>
        <h2>${esc(u.name)} ${esc(u.lastName || '')}</h2>
        <p class="muted">${esc(u.email)}</p>
        <div class="profile-stats">
          <div><strong>${STATE.orders.length}</strong><span>Orders</span></div>
          <div><strong>${STATE.wishlist.length}</strong><span>Wishlist</span></div>
          <div><strong>${STATE.events.length}</strong><span>Events</span></div>
        </div>
      </div>
      <div class="cart-panel account-panel">
        <div class="cart-panel-header"><h2>Account Details</h2></div>
        <div class="form-row">
          <div class="form-group"><label for="pfFirst">First name</label>
            <input class="form-input" id="pfFirst" value="${esc(u.name)}"></div>
          <div class="form-group"><label for="pfLast">Last name</label>
            <input class="form-input" id="pfLast" value="${esc(u.lastName || '')}"></div>
        </div>
        <div class="form-group"><label for="pfEmail">Email</label>
          <input class="form-input" id="pfEmail" type="email" value="${esc(u.email)}"></div>
        <div class="form-group"><label for="pfPhone">Phone</label>
          <input class="form-input" id="pfPhone" type="tel" placeholder="+91 98765 43210" value="${esc(u.phone || '')}"></div>
        <div class="form-group"><label for="pfAddr">Default shipping address</label>
          <input class="form-input" id="pfAddr" placeholder="123 Roastery Lane, Mumbai" value="${esc(u.address || '')}"></div>
        <button class="btn btn-primary" onclick="saveProfile()">Save Changes</button>
      </div>
    </div>
    <div class="cart-panel account-panel" style="margin-top:1.5rem;">
      <div class="cart-panel-header"><h2>Subscription</h2></div>
      ${sub ? `<p><strong>${esc(sub.tier)}</strong> ${esc(sub.price)}/mo · ${esc(sub.grind)}<br>
          <span class="muted">Since ${fmtDate(sub.since)}</span></p>
          <button class="btn btn-ghost btn-sm" style="margin-top:1rem;" onclick="cancelSubscription()">Cancel Subscription</button>`
        : `<p class="muted">You have no active subscription.</p>
          <a href="/subscriptions" class="btn btn-primary btn-sm" style="margin-top:1rem;">View Plans</a>`}
    </div>`;
}

function saveProfile() {
  const first = document.getElementById('pfFirst').value.trim();
  const email = document.getElementById('pfEmail').value.trim();
  if (!first || !email) { showToast('Name and email are required', 'error'); return; }
  STATE.user = {
    ...STATE.user, name: first, email, initial: first[0].toUpperCase(),
    lastName: document.getElementById('pfLast').value.trim(),
    phone: document.getElementById('pfPhone').value.trim(),
    address: document.getElementById('pfAddr').value.trim(),
  };
  persist('bb_user', STATE.user);
  updateUserUI();
  renderProfilePage();
  showToast('Profile updated', 'success');
}

function cancelSubscription() {
  STATE.subscription = null;
  localStorage.removeItem('bb_subscription');
  renderProfilePage();
  showToast('Subscription cancelled', 'info');
}

// Orders
function renderOrdersPage() {
  const root = document.getElementById('ordersRoot');
  if (!root) return;
  if (!STATE.user) { root.innerHTML = loginGate('fa-box-open', 'your orders'); return; }
  if (!STATE.orders.length) {
    root.innerHTML = emptyBlock('fa-box-open', 'No orders yet', 'When you place an order it will appear here.', '/coffee', 'Browse Coffee');
    return;
  }
  root.innerHTML = STATE.orders.map(o => `
    <div class="cart-panel order-card">
      <div class="cart-panel-header">
        <div><h2>Order #${esc(o.id)}</h2><span class="muted">${fmtDate(o.date)}</span></div>
        <span class="badge-tag coffee">${esc(o.status)}</span>
      </div>
      ${o.items.map(i => `
        <div class="cart-item">
          ${i.img ? `<img class="cart-img" src="${esc(i.img)}" alt="${esc(i.name)}">` : ''}
          <div class="cart-item-info">
            <div class="cart-item-name">${esc(i.name)}</div>
            <div class="cart-item-variant">Qty ${i.qty}</div>
          </div>
          <div class="cart-item-price">${fmtINR(i.price * i.qty)}</div>
        </div>`).join('')}
      <div class="summary-row"><span>Shipping</span><span>${o.shipping ? fmtINR(o.shipping) : 'Free'}</span></div>
      ${o.discount ? `<div class="summary-row"><span>Discount</span><span>−${fmtINR(o.discount)}</span></div>` : ''}
      <div class="summary-row total"><span>Total</span><span>${fmtINR(o.total)}</span></div>
      <div class="order-actions">
        <button class="btn btn-ghost btn-sm" onclick="reorder('${esc(o.id)}')"><i class="fas fa-rotate-right"></i> Reorder</button>
      </div>
    </div>`).join('');
}

function reorder(orderId) {
  const o = STATE.orders.find(x => x.id === orderId);
  if (!o) return;
  o.items.forEach(i => {
    const ex = STATE.cart.find(c => c.id === i.id);
    if (ex) ex.qty += i.qty;
    else STATE.cart.push({ id: i.id, name: i.name, price: i.price, qty: i.qty, img: i.img });
  });
  saveCart();
  showToast('Items added to your cart', 'success');
}

// Fill in missing details (image/description/etc.) for wishlist items saved without them
async function hydrateWishlist() {
  const incomplete = STATE.wishlist.filter(w => !w.img || !w.desc || w.name === w.id);
  if (!incomplete.length) return;
  const found = {};
  for (const url of ['/coffee', '/equipment']) {
    try {
      const html = await (await fetch(url)).text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('.card').forEach(card => {
        const m = (card.querySelector('.wishlist-btn')?.getAttribute('onclick') || '').match(/toggleWishlist\(this,\s*'([^']+)'/);
        if (!m) return;
        const priceText = card.querySelector('.price')?.firstChild?.textContent || '';
        found[m[1]] = {
          name: card.querySelector('.card-title')?.textContent?.trim() || '',
          price: parseFloat(priceText.replace(/[^\d.]/g, '')) || 0,
          img: card.querySelector('img')?.getAttribute('src') || '',
          tag: card.querySelector('.card-tag')?.textContent?.trim() || '',
          desc: card.querySelector('.card-desc')?.textContent?.trim() || '',
        };
      });
    } catch (e) { /* offline: keep what we have */ }
  }
  let changed = false;
  STATE.wishlist = STATE.wishlist.map(w => {
    const f = found[w.id];
    if (!f) return w;
    changed = true;
    return { ...w, ...f };
  });
  if (changed) saveWishlist();
}

// Wishlist
async function renderWishlistPage() {
  const root = document.getElementById('wishlistRoot');
  if (!root) return;
  if (!STATE.user) { root.innerHTML = loginGate('fa-heart', 'your wishlist'); return; }
  await hydrateWishlist();
  if (!STATE.wishlist.length) {
    root.innerHTML = emptyBlock('fa-heart', 'Your wishlist is empty', 'Tap the heart on any product to save it here.', '/coffee', 'Browse Coffee');
    return;
  }
  root.innerHTML = `<div class="grid">${STATE.wishlist.map(w => `
    <div class="card revealed">
      <div class="card-img-wrapper">${w.img ? `<img src="${esc(w.img)}" alt="${esc(w.name)}">` : ''}</div>
      <div class="card-body">
        ${w.tag ? `<span class="card-tag">${esc(w.tag)}</span>` : ''}
        <h2 class="card-title">${esc(w.name)}</h2>
        ${w.desc ? `<p class="card-desc">${esc(w.desc)}</p>` : ''}
        <div class="card-footer">
          <span class="price">${w.price ? fmtINR(w.price) : ''}</span>
          <div style="display:flex;gap:.5rem;">
            <button class="btn btn-ghost btn-sm" onclick="removeFromWishlist('${esc(w.id)}')" aria-label="Remove"><i class="fas fa-trash"></i></button>
            <button class="btn btn-primary btn-sm" onclick="wishlistToCart('${esc(w.id)}')"><i class="fas fa-plus"></i> Add</button>
          </div>
        </div>
      </div>
    </div>`).join('')}</div>`;
}

function removeFromWishlist(id) {
  STATE.wishlist = STATE.wishlist.filter(w => w.id !== id);
  saveWishlist();
  renderWishlistPage();
  showToast('Removed from wishlist', 'info');
}

function wishlistToCart(id) {
  const w = STATE.wishlist.find(x => x.id === id);
  if (!w) return;
  const ex = STATE.cart.find(c => c.id === id);
  if (ex) ex.qty++;
  else STATE.cart.push({ id: w.id, name: w.name, price: w.price, qty: 1, img: w.img });
  saveCart();
  showToast(`Added <strong>${esc(w.name)}</strong> to cart`, 'success');
}

// My Events
function renderMyEventsPage() {
  const root = document.getElementById('myEventsRoot');
  if (!root) return;
  if (!STATE.user) { root.innerHTML = loginGate('fa-calendar-check', 'your events'); return; }
  if (!STATE.events.length) {
    root.innerHTML = emptyBlock('fa-calendar-check', 'No events yet', 'Register for a tasting or masterclass and it will show up here.', '/events', 'Browse Events');
    return;
  }
  root.innerHTML = STATE.events.map(ev => `
    <div class="cart-panel order-card">
      <div class="cart-panel-header">
        <div><h2>${esc(ev.name)}</h2><span class="muted"><i class="fas fa-calendar"></i> ${esc(ev.date)}</span></div>
        <span class="badge-tag coffee">Confirmed</span>
      </div>
      <p class="muted">Registered as ${esc(ev.first)} ${esc(ev.last)} · ${esc(ev.email)}</p>
      <div class="order-actions">
        <button class="btn btn-ghost btn-sm" onclick="cancelEvent('${esc(ev.id)}')"><i class="fas fa-xmark"></i> Cancel Registration</button>
      </div>
    </div>`).join('');
}

function cancelEvent(id) {
  STATE.events = STATE.events.filter(e => e.id !== id);
  persist('bb_events', STATE.events);
  renderMyEventsPage();
  showToast('Registration cancelled', 'info');
}

// ─── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateCartUI();
  updateUserUI();
  initNavbar();
  initSearch();
  initScrollReveal();
  setActiveNavLink();
  initWishlistButtons();
  renderAccountPages();

  // Cart page init
  renderCartPage();

  // Close user menu on outside click
  document.addEventListener('click', e => {
    const menu = document.getElementById('userMenuDropdown');
    if (menu?.classList.contains('active')) {
      if (!menu.contains(e.target) && !e.target.closest('.user-avatar')) {
        menu.classList.remove('active');
      }
    }
    // Close mobile nav on outside click
    const drawer = document.getElementById('mobileNavDrawer');
    const hamburger = document.querySelector('.nav-hamburger');
    if (drawer?.classList.contains('open')) {
      if (!drawer.contains(e.target) && !hamburger?.contains(e.target)) {
        drawer.classList.remove('open');
        hamburger?.classList.remove('open');
        document.body.style.overflow = '';
      }
    }
  });

  // ESC closes modal and nav
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      const drawer = document.getElementById('mobileNavDrawer');
      if (drawer?.classList.contains('open')) {
        drawer.classList.remove('open');
        document.querySelector('.nav-hamburger')?.classList.remove('open');
        document.body.style.overflow = '';
      }
    }
  });
});
