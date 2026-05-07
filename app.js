// CONFIGURACIÓN (REEMPLAZA CON TUS DATOS)
const supabaseUrl = 'https://nbcxafnjolasdmleqjhp.supabase.co';
const supabaseKey = 'sb_publishable_0CmPrpHpz_iz8ZOI04uZ4A_VcNCpncN'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let cart = [];
let selectedPolo = null;
let secretClicks = 0;

// MOSTRAR VENTANA FLOTANTE (TOAST)
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// CARGAR PRODUCTOS DESDE SUPABASE
async function loadProducts() {
    const { data: polos, error } = await _supabase.from('polos').select('*');
    if (error) return console.log(error);

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

// SUBIR PRODUCTO
async function saveProduct() {
    const fileInput = document.getElementById('imgFileInput');
    const file = fileInput.files[0];
    const nombre = document.getElementById('prodName').value;
    const precio = document.getElementById('prodPrice').value;

    if (!file || !nombre || !precio) {
        showToast("⚠️ Por favor, llena todos los campos.");
        return;
    }

    const btn = document.getElementById('saveBtn');
    btn.innerText = "SUBIENDO...";
    btn.disabled = true;

    const fileName = `${Date.now()}_${file.name}`;
    const { data: upData, error: upErr } = await _supabase.storage.from('imagenes-polos').upload(fileName, file);

    if (upErr) {
        showToast("❌ Error al subir la imagen.");
        btn.disabled = false;
        btn.innerText = "PUBLICAR PRODUCTO";
        return;
    }

    const { data: urlData } = _supabase.storage.from('imagenes-polos').getPublicUrl(fileName);

    const { error: dbErr } = await _supabase.from('polos').insert([
        { nombre: nombre, precio: parseFloat(precio), imagen_url: urlData.publicUrl }
    ]);

    if (!dbErr) {
        showToast("✅ ¡Polo publicado con éxito!");
        loadProducts();
        switchTab('store');
        // Limpiar campos
        document.getElementById('prodName').value = '';
        document.getElementById('prodPrice').value = '';
        fileInput.value = '';
        document.getElementById('fileLabel').innerText = "📷 Click para elegir foto";
    } else {
        showToast("❌ Error al guardar en base de datos.");
    }
    btn.disabled = false;
    btn.innerText = "PUBLICAR PRODUCTO";
}

// NAVEGACIÓN
function switchTab(tabId) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + tabId)?.classList.add('active');
    
    // El Hero solo se muestra en su propia pestaña o al inicio
    const hero = document.getElementById('hero');
    if(tabId !== 'hero' && tabId !== 'store') {
        hero.style.display = 'none';
    } else if (tabId === 'store') {
        hero.style.display = 'none';
    } else {
        hero.style.display = 'block';
    }
}

// MODAL
function openModal(polo) {
    selectedPolo = polo;
    document.getElementById('modalImg').src = polo.imagen_url;
    document.getElementById('modalName').innerText = polo.nombre;
    document.getElementById('modalPrice').innerText = "S/ " + polo.precio.toFixed(2);
    document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
}

// CARRITO
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
    cart.forEach((p, index) => {
        total += p.precio;
        list.innerHTML += `<div style="display:flex; justify-content:space-between; padding:15px; border-bottom:1px solid #eee; align-items:center;">
            <span><strong>${p.nombre}</strong></span>
            <span>S/ ${p.precio.toFixed(2)}</span>
        </div>`;
    });
    document.getElementById('cartTotalVal').innerText = `Total: S/ ${total.toFixed(2)}`;
}

function sendWhatsApp() {
    let msg = "¡Hola! Quiero comprar estos polos de POLO STUDIO:%0A";
    cart.forEach(p => msg += `- ${p.nombre} (S/ ${p.precio})%0A`);
    window.open(`https://wa.me/51900000000?text=${msg}`); // CAMBIA EL NÚMERO AQUÍ
}

// TRUCO DEL ADMIN SECRETO
document.getElementById('secretLogo').addEventListener('click', () => {
    secretClicks++;
    if (secretClicks === 5) {
        showToast("🛠️ Modo Administrador activado");
        document.getElementById('tab-admin').style.display = 'inline-block';
        secretClicks = 0;
    }
    setTimeout(() => { secretClicks = 0; }, 2000);
});

function updateLabel() {
    const file = document.getElementById('imgFileInput').files[0];
    if (file) document.getElementById('fileLabel').innerText = "✅ " + file.name;
}

// INICIO
loadProducts();
