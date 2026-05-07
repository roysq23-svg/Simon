const supabaseUrl = 'https://nbcxafnjolasdmleqjhp.supabase.co';
const supabaseKey = 'sb_publishable_0CmPrpHpz_iz8ZOI04uZ4A_VcNCpncN';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let cart = [];
let selectedPolo = null;
let secretClicks = 0;

// NAVEGACIÓN
function switchTab(tabId) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('panel-' + tabId);
    if (target) target.classList.add('active');
    if (tabId === 'admin') loadInventory();
    if (tabId === 'cart') renderCart();
    window.scrollTo(0, 0);
}

// CARGAR TIENDA
async function loadProducts() {
    const { data: polos, error } = await _supabase.from('polos').select('*').order('id', { ascending: false });
    if (error) { showToast("❌ Error al cargar productos"); return; }
    const grid = document.getElementById('storeGrid');
    grid.innerHTML = '';
    polos.forEach(p => {
        grid.innerHTML += `
            <div class="product-card" onclick='openModal(${JSON.stringify(p)})'>
                <img src="${p.imagen_url}" onerror="this.src='https://via.placeholder.com/300?text=Sin+imagen'">
                <div class="product-info">
                    <h3>${p.nombre}</h3>
                    <p>S/ ${parseFloat(p.precio).toFixed(2)}</p>
                </div>
            </div>`;
    });
}

// CRUD ADMIN
async function loadInventory() {
    const { data: polos, error } = await _supabase.from('polos').select('*').order('id', { ascending: false });
    if (error) { showToast("❌ Error al cargar inventario"); return; }
    const list = document.getElementById('adminInventoryList');
    list.innerHTML = '';
    polos.forEach(p => {
        list.innerHTML += `
            <div class="inventory-item">
                <img src="${p.imagen_url}" onerror="this.src='https://via.placeholder.com/50'">
                <div style="flex-grow:1; margin-left:15px;">
                    <h4 style="font-size:14px;">${p.nombre}</h4>
                    <small>S/ ${parseFloat(p.precio).toFixed(2)}</small>
                </div>
                <button onclick='prepareEdit(${JSON.stringify(p)})' style="color:blue; background:none; border:none; cursor:pointer;">Editar</button>
                <button onclick="deletePolo(${p.id})" style="color:red; background:none; border:none; cursor:pointer; margin-left:10px;">Borrar</button>
            </div>`;
    });
}

async function saveProduct() {
    const id = document.getElementById('editPoloId').value;
    const nombre = document.getElementById('prodName').value.trim();
    const precio = document.getElementById('prodPrice').value;
    const descripcion = document.getElementById('prodDesc').value.trim();
    const file = document.getElementById('imgFileInput').files[0];

    if (!nombre || !precio) return showToast("⚠️ Llena nombre y precio");

    const btn = document.getElementById('saveBtn');
    btn.innerText = "PROCESANDO...";
    btn.disabled = true;

    let updateData = { nombre, precio: parseFloat(precio), descripcion };

    // ✅ FIX: await correcto para subir imagen
    if (file) {
        const fileName = `polo_${Date.now()}.png`;
        const { error: uploadError } = await _supabase.storage
            .from('imagenes-polos')
            .upload(fileName, file, { upsert: true });

        if (uploadError) {
            showToast("❌ Error al subir imagen");
            btn.innerText = "GUARDAR CAMBIOS";
            btn.disabled = false;
            return;
        }

        const { data: urlData } = _supabase.storage
            .from('imagenes-polos')
            .getPublicUrl(fileName);

        updateData.imagen_url = urlData.publicUrl;
    }

    let error;
    if (id) {
        const res = await _supabase.from('polos').update(updateData).eq('id', id);
        error = res.error;
    } else {
        const res = await _supabase.from('polos').insert([updateData]);
        error = res.error;
    }

    if (error) {
        showToast("❌ Error: " + error.message);
    } else {
        showToast(id ? "✅ Polo actualizado" : "✅ Polo agregado");
        resetForm();
        loadProducts();
        loadInventory();
    }

    btn.innerText = "GUARDAR CAMBIOS";
    btn.disabled = false;
}

async function deletePolo(id) {
    if (!confirm("¿Eliminar polo?")) return;
    const { error } = await _supabase.from('polos').delete().eq('id', id);
    if (error) {
        showToast("❌ Error al eliminar: " + error.message);
    } else {
        showToast("🗑️ Eliminado");
        loadInventory();
        loadProducts();
    }
}

function prepareEdit(polo) {
    document.getElementById('formTitle').innerText = "Editando Polo";
    document.getElementById('editPoloId').value = polo.id;
    document.getElementById('prodName').value = polo.nombre;
    document.getElementById('prodPrice').value = polo.precio;
    document.getElementById('prodDesc').value = polo.descripcion || '';
    document.getElementById('fileLabel').innerHTML = "📷 Seleccionar nueva imagen (opcional)";
    document.getElementById('cancelEdit').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    document.getElementById('formTitle').innerText = "Agregar Polo";
    document.getElementById('editPoloId').value = "";
    document.getElementById('prodName').value = "";
    document.getElementById('prodPrice').value = "";
    document.getElementById('prodDesc').value = "";
    document.getElementById('imgFileInput').value = "";
    document.getElementById('fileLabel').innerHTML = "📷 Seleccionar Imagen";
    document.getElementById('cancelEdit').style.display = 'none';
}

// MODAL
function openModal(polo) {
    selectedPolo = polo;
    document.getElementById('modalImg').src = polo.imagen_url;
    document.getElementById('modalName').innerText = polo.nombre;
    document.getElementById('modalPrice').innerText = "S/ " + parseFloat(polo.precio).toFixed(2);
    document.getElementById('modalDesc').innerText = polo.descripcion || "Calidad Premium.";
    document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
}

function addToCartFromModal() {
    cart.push({ ...selectedPolo });
    document.getElementById('cart-count').innerText = cart.length;
    showToast("🛒 Añadido al carrito");
    closeModal();
}

// ✅ CARRITO CON FOTOS
function renderCart() {
    const list = document.getElementById('cartItemsList');
    const footer = document.getElementById('cartFooter');

    if (cart.length === 0) {
        list.innerHTML = "<p style='text-align:center; padding:40px; color:#999;'>Tu carrito está vacío.</p>";
        footer.style.display = 'none';
        return;
    }

    list.innerHTML = '';
    footer.style.display = 'block';
    let total = 0;

    cart.forEach((p, index) => {
        total += parseFloat(p.precio);
        list.innerHTML += `
            <div style="display:flex; align-items:center; gap:15px; padding:15px; border-bottom:1px solid #eee;">
                <img src="${p.imagen_url}" 
                     onerror="this.src='https://via.placeholder.com/70?text=?'"
                     style="width:70px; height:70px; object-fit:cover; border-radius:8px; flex-shrink:0;">
                <div style="flex-grow:1;">
                    <p style="font-weight:600; margin-bottom:4px;">${p.nombre}</p>
                    <p style="color:#666; font-size:14px;">S/ ${parseFloat(p.precio).toFixed(2)}</p>
                </div>
                <button onclick="removeFromCart(${index})" 
                        style="background:none; border:none; cursor:pointer; font-size:18px; color:#999;">✕</button>
            </div>`;
    });

    document.getElementById('cartTotalVal').innerText = `Total: S/ ${total.toFixed(2)}`;
}

// ✅ BONUS: función para eliminar del carrito
function removeFromCart(index) {
    cart.splice(index, 1);
    document.getElementById('cart-count').innerText = cart.length;
    renderCart();
    showToast("🗑️ Producto eliminado");
}

function sendWhatsApp() {
    if (cart.length === 0) return showToast("⚠️ El carrito está vacío");
    let msg = "¡Hola! Quiero hacer el siguiente pedido de POLO STUDIO:%0A%0A";
    let total = 0;
    cart.forEach(p => {
        msg += `- ${p.nombre}: S/ ${parseFloat(p.precio).toFixed(2)}%0A`;
        total += parseFloat(p.precio);
    });
    msg += `%0A*Total: S/ ${total.toFixed(2)}*`;
    window.open(`https://wa.me/51900000000?text=${msg}`);
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function updateLabel() {
    const f = document.getElementById('imgFileInput').files[0];
    if (f) document.getElementById('fileLabel').innerHTML = "✅ " + f.name;
}

// TRUCO ADMIN
document.getElementById('secretLogo').addEventListener('click', () => {
    secretClicks++;
    if (secretClicks === 5) {
        document.getElementById('tab-admin').style.setProperty('display', 'inline-block', 'important');
        showToast("🛡️ Modo Admin activado");
        secretClicks = 0;
    }
    setTimeout(() => { secretClicks = 0; }, 3000);
});

loadProducts();
