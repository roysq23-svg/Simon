const supabaseUrl = 'https://nbcxafnjolasdmleqjhp.supabase.co';
const supabaseKey = 'sb_publishable_0CmPrpHpz_iz8ZOI04uZ4A_VcNCpncN'; // Pega tu llave de Supabase
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let cart = [];
let selectedPolo = null;
let secretClicks = 0;

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

async function loadProducts() {
    const { data: polos, error } = await _supabase.from('polos').select('*');
    if (error) return;
    const grid = document.getElementById('storeGrid');
    if(!grid) return;
    grid.innerHTML = '';
    polos.forEach(p => {
        grid.innerHTML += `
            <div class="product-card" onclick='openModal(${JSON.stringify(p)})'>
                <img src="${p.imagen_url}">
                <div style="padding:15px; text-align:center;">
                    <h3 style="font-family:Syne; font-size:16px;">${p.nombre}</h3>
                    <p style="color:#666; font-size:14px;">S/ ${p.precio.toFixed(2)}</p>
                </div>
            </div>`;
    });
}

async function saveProduct() {
    const fileInput = document.getElementById('imgFileInput');
    const file = fileInput.files[0];
    const nombre = document.getElementById('prodName').value;
    const precio = document.getElementById('prodPrice').value;

    if (!file || !nombre || !precio) {
        showToast("⚠️ Llena todos los campos.");
        return;
    }

    const btn = document.getElementById('saveBtn');
    btn.innerText = "SUBIENDO...";
    btn.disabled = true;

    const fileName = `${Date.now()}_${file.name}`;
    const { data: upData, error: upErr } = await _supabase.storage.from('imagenes-polos').upload(fileName, file);

    if (upErr) {
        showToast("❌ Error al subir imagen.");
        btn.disabled = false;
        btn.innerText = "PUBLICAR PRODUCTO";
        return;
    }

    const { data: urlData } = _supabase.storage.from('imagenes-polos').getPublicUrl(fileName);
    const { error: dbErr } = await _supabase.from('polos').insert([
        { nombre: nombre, precio: parseFloat(precio), imagen_url: urlData.publicUrl }
    ]);

    if (!dbErr) {
        showToast("✅ ¡Polo publicado!");
        loadProducts();
        switchTab('store');
        document.getElementById('prodName').value = '';
        document.getElementById('prodPrice').value = '';
        fileInput.value = '';
        document.getElementById('fileLabel').innerText = "📷 Click para elegir foto";
    }
    btn.disabled = false;
    btn.innerText = "PUBLICAR PRODUCTO";
}

function switchTab(tabId) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + tabId)?.classList.add('active');
    const hero = document.getElementById('hero');
    if(tabId !== 'hero' && tabId !== 'store') { hero.style.display = 'none'; }
    else if (tabId === 'store') { hero.style.display = 'none'; }
    else { hero.style.display = 'block'; }
}

function openModal(polo) {
    selectedPolo = polo;
    document.getElementById('modalImg').src = polo.imagen_url;
    document.getElementById('modalName').innerText = polo.nombre;
    document.getElementById('modalPrice').innerText = "S/ " + polo.precio.toFixed(2);
    document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

function addToCartFromModal() {
    cart.push(selectedPolo);
    document.getElementById('cart-count').innerText = cart.length;
    renderCart();
    closeModal();
    showToast("🛒 Añadido al carrito");
}

function renderCart() {
    const list = document.getElementById('cartItemsList');
    const footer = document.getElementById('cartFooter');
    if (cart.length === 0) {
        list.innerHTML = "<p style='text-align:center; padding:20px;'>Tu carrito está vacío.</p>";
        footer.style.display = 'none';
        return;
    }
    footer.style.display = 'block';
    list.innerHTML = '';
    let total = 0;
    cart.forEach(p => {
        total += p.precio;
        list.innerHTML += `<div style="display:flex; justify-content:space-between; padding:15px; border-bottom:1px solid #eee;">
            <span><strong>${p.nombre}</strong></span>
            <span>S/ ${p.precio.toFixed(2)}</span>
        </div>`;
    });
    document.getElementById('cartTotalVal').innerText = `Total: S/ ${total.toFixed(2)}`;
}

function sendWhatsApp() {
    let msg = "¡Hola! Quiero comprar estos polos de POLO STUDIO:%0A";
    cart.forEach(p => msg += `- ${p.nombre} (S/ ${p.precio})%0A`);
    window.open(`https://wa.me/51900000000?text=${msg}`);
}

// TRUCO: 5 CLICS EN EL LOGO PARA MOSTRAR ADMIN
document.getElementById('secretLogo').addEventListener('click', () => {
    secretClicks++;
    if (secretClicks === 5) {
        showToast("🛠️ Modo Administrador activado");
        const adminBtn = document.getElementById('tab-admin');
        // Usamos setProperty para saltarnos el !important del HTML
        adminBtn.style.setProperty('display', 'inline-block', 'important');
        secretClicks = 0;
    }
    setTimeout(() => { secretClicks = 0; }, 2500);
});

function updateLabel() {
    const file = document.getElementById('imgFileInput').files[0];
    if (file) document.getElementById('fileLabel').innerText = "✅ " + file.name;
}

loadProducts();
