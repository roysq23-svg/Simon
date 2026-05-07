// 1. CONFIGURACIÓN DE SUPABASE
// Reemplaza con tus credenciales exactas
const supabaseUrl = 'https://nbcxafnjolasdmleqjhp.supabase.co';
const supabaseKey = 'sb_publishable_0CmPrpHpz_iz8ZOI04uZ4A_VcNCpncN'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 2. ESTADO DE LA APLICACIÓN
let cart = [];
let selectedPolo = null;
let secretClicks = 0;

// --- FUNCIONES DE NAVEGACIÓN ---
function switchTab(tabId) {
    // Ocultar todos los paneles
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    
    // Activar el panel seleccionado
    const target = document.getElementById('panel-' + tabId);
    if (target) target.classList.add('active');

    // Cargas dinámicas según la pestaña
    if (tabId === 'store') loadProducts();
    if (tabId === 'cart') renderCart();
    if (tabId === 'admin') loadInventory();

    // Resetear el scroll al inicio
    window.scrollTo(0, 0);
}

// --- GESTIÓN DE TIENDA (VISTA USUARIO) ---
async function loadProducts() {
    const { data: polos, error } = await _supabase
        .from('polos')
        .select('*')
        .order('id', { ascending: false });

    if (error) return console.error("Error al cargar productos:", error);

    const grid = document.getElementById('storeGrid');
    if (!grid) return;
    grid.innerHTML = '';

    polos.forEach(p => {
        grid.innerHTML += `
            <div class="product-card" onclick='openModal(${JSON.stringify(p)})'>
                <img src="${p.imagen_url}" alt="${p.nombre}">
                <div class="product-info">
                    <h3>${p.nombre}</h3>
                    <p>S/ ${p.precio.toFixed(2)}</p>
                </div>
            </div>`;
    });
}

// --- GESTIÓN ADMIN (CRUD: EDITAR Y BORRAR) ---
async function loadInventory() {
    const { data: polos, error } = await _supabase
        .from('polos')
        .select('*')
        .order('id', { ascending: false });

    const container = document.getElementById('adminInventoryList');
    if (!container) return;
    container.innerHTML = '';

    polos.forEach(p => {
        container.innerHTML += `
            <div class="inventory-item" style="display:flex; align-items:center; justify-content:space-between; background:white; padding:10px; margin-bottom:10px; border-radius:8px; border:1px solid #eee;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${p.imagen_url}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
                    <span style="font-size:13px; font-weight:600;">${p.nombre}</span>
                </div>
                <div>
                    <button onclick='prepareEdit(${JSON.stringify(p)})' style="color:blue; border:none; background:none; cursor:pointer; font-weight:700;">Editar</button>
                    <button onclick="deletePolo(${p.id})" style="color:red; border:none; background:none; cursor:pointer; font-weight:700; margin-left:10px;">Borrar</button>
                </div>
            </div>`;
    });
}

async function saveProduct() {
    const id = document.getElementById('editPoloId').value;
    const nombre = document.getElementById('prodName').value;
    const precio = document.getElementById('prodPrice').value;
    const descripcion = document.getElementById('prodDesc').value;
    const file = document.getElementById('imgFileInput').files[0];

    if (!nombre || !precio) return showToast("⚠️ Ingresa nombre y precio");

    const btn = document.getElementById('saveBtn');
    btn.innerText = "PROCESANDO..."; btn.disabled = true;

    let updateData = { nombre, precio: parseFloat(precio), descripcion };

    try {
        if (file) {
            const fileName = `polo_${Date.now()}.png`;
            const { data: uploadData, error: upErr } = await _supabase.storage
                .from('imagenes-polos')
                .upload(fileName, file);
            if (upErr) throw upErr;

            const { data: urlData } = _supabase.storage.from('imagenes-polos').getPublicUrl(fileName);
            updateData.imagen_url = urlData.publicUrl;
        }

        if (id) {
            // EDITAR
            await _supabase.from('polos').update(updateData).eq('id', id);
        } else {
            // CREAR NUEVO
            if (!updateData.imagen_url) throw new Error("Falta la imagen");
            await _supabase.from('polos').insert([updateData]);
        }

        showToast("✅ ¡Guardado con éxito!");
        resetForm();
        loadProducts();
        loadInventory();
    } catch (e) {
        showToast("❌ Error: " + e.message);
    } finally {
        btn.innerText = "GUARDAR CAMBIOS"; btn.disabled = false;
    }
}

async function deletePolo(id) {
    if (!confirm("¿Seguro que quieres eliminar este producto?")) return;
    const { error } = await _supabase.from('polos').delete().eq('id', id);
    if (!error) {
        showToast("🗑️ Polo eliminado");
        loadInventory();
        loadProducts();
    }
}

function prepareEdit(polo) {
    document.getElementById('formTitle').innerText = "📝 Editando: " + polo.nombre;
    document.getElementById('editPoloId').value = polo.id;
    document.getElementById('prodName').value = polo.nombre;
    document.getElementById('prodPrice').value = polo.precio;
    document.getElementById('prodDesc').value = polo.descripcion || '';
    document.getElementById('cancelEdit').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    document.getElementById('formTitle').innerText = "➕ Agregar Nuevo Polo";
    document.getElementById('editPoloId').value = "";
    document.getElementById('prodName').value = "";
    document.getElementById('prodPrice').value = "";
    document.getElementById('prodDesc').value = "";
    document.getElementById('cancelEdit').style.display = 'none';
    document.getElementById('fileLabel').innerText = "📷 Click para foto";
}

// --- CARRITO Y MODAL ---
function openModal(polo) {
    selectedPolo = polo;
    document.getElementById('modalImg').src = polo.imagen_url;
    document.getElementById('modalName').innerText = polo.nombre;
    document.getElementById('modalPrice').innerText = "S/ " + polo.precio.toFixed(2);
    document.getElementById('modalDesc').innerText = polo.descripcion || "Polo de alta calidad, diseño exclusivo.";
    document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
}

function addToCartFromModal() {
    cart.push(selectedPolo);
    document.getElementById('cart-count').innerText = cart.length;
    showToast("🛒 ¡Añadido al carrito!");
    closeModal();
}

function renderCart() {
    const list = document.getElementById('cartItemsList');
    const footer = document.getElementById('cartFooter');

    if (cart.length === 0) {
        list.innerHTML = "<p style='text-align:center; padding:50px;'>Tu carrito está vacío.</p>";
        footer.style.display = 'none';
        return;
    }

    list.innerHTML = '';
    footer.style.display = 'block';
    let total = 0;

    cart.forEach((p, index) => {
        total += p.precio;
        list.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:15px; border-bottom:1px solid #eee; background:white; margin-bottom:10px; border-radius:8px;">
                <span><strong>${p.nombre}</strong></span>
                <span>S/ ${p.precio.toFixed(2)} <button onclick="removeFromCart(${index})" style="color:red; background:none; border:none; cursor:pointer; margin-left:10px;">❌</button></span>
            </div>`;
    });

    document.getElementById('cartTotalVal').innerText = `Total: S/ ${total.toFixed(2)}`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    document.getElementById('cart-count').innerText = cart.length;
    renderCart();
}

// --- WHATSAPP ---
function sendWhatsApp() {
    if (cart.length === 0) return;

    const miNumero = "51900000000"; // Reemplaza con tu número real (51 + número)
    let mensaje = "¡Hola! Quisiera realizar el siguiente pedido:%0A%0A";
    let total = 0;

    cart.forEach((p, i) => {
        mensaje += `${i + 1}. *${p.nombre}* - S/ ${p.precio.toFixed(2)}%0A`;
        total += p.precio;
    });

    mensaje += `%0A💰 *TOTAL: S/ ${total.toFixed(2)}*%0A%0A¿Tienen disponibilidad?`;

    window.open(`https://wa.me/${miNumero}?text=${mensaje}`, '_blank');
}

// --- UTILIDADES ---
function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function updateLabel() {
    const file = document.getElementById('imgFileInput').files[0];
    if (file) document.getElementById('fileLabel').innerText = "✅ " + file.name;
}

// --- TRUCO DEL LOGO ---
document.getElementById('secretLogo').addEventListener('click', () => {
    secretClicks++;
    if (secretClicks === 5) {
        document.getElementById('tab-admin').style.setProperty('display', 'inline-block', 'important');
        showToast("🛠️ Modo Administrador Activado");
        secretClicks = 0;
    }
    setTimeout(() => { secretClicks = 0; }, 2500);
});

// INICIO
loadProducts();
