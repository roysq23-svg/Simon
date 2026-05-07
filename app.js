// CONFIGURACIÓN SUPABASE
const supabaseUrl = 'https://nbcxafnjolasdmleqjhp.supabase.co';
const supabaseKey = 'sb_publishable_0CmPrpHpz_iz8ZOI04uZ4A_VcNCpncN'; // Tu clave de la captura
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let cart = [];
let selectedPolo = null;
let secretClicks = 0;

// --- SISTEMA DE NAVEGACIÓN (CORREGIDO) ---
function switchTab(tabId) {
    // 1. Ocultar todos los paneles
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    
    // 2. Mostrar el panel actual
    const target = document.getElementById('panel-' + tabId);
    if (target) {
        target.classList.add('active');
        
        // 3. ¡ESTO ARREGLA EL CARRITO VACÍO! 
        // Dibujamos el carrito justo cuando el usuario entra a la pestaña
        if (tabId === 'cart') {
            renderCart();
        }
        // Si entra al admin, cargamos la lista para editar/borrar
        if (tabId === 'admin') {
            loadInventory();
        }
    }
    window.scrollTo(0, 0);
}

// --- TIENDA ---
async function loadProducts() {
    const { data: polos, error } = await _supabase.from('polos').select('*').order('id', { ascending: false });
    if (error) return console.log(error);
    
    const grid = document.getElementById('storeGrid');
    if(!grid) return;
    grid.innerHTML = '';
    polos.forEach(p => {
        grid.innerHTML += `
            <div class="product-card" onclick='openModal(${JSON.stringify(p)})'>
                <img src="${p.imagen_url}">
                <div class="product-info">
                    <h3>${p.nombre}</h3>
                    <p>S/ ${p.precio.toFixed(2)}</p>
                </div>
            </div>`;
    });
}

// --- CARRITO (CORREGIDO) ---
function renderCart() {
    const list = document.getElementById('cartItemsList');
    const footer = document.getElementById('cartFooter');
    
    if (cart.length === 0) {
        list.innerHTML = "<div style='text-align:center; padding:50px; color:#666;'>Tu carrito está vacío.</div>";
        footer.style.display = 'none';
        return;
    }

    footer.style.display = 'block';
    list.innerHTML = '';
    let total = 0;

    cart.forEach((p, index) => {
        total += p.precio;
        list.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:15px; border-bottom:1px solid #eee; background:white; margin-bottom:10px; border-radius:8px; border:1px solid #ddd;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${p.imagen_url}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;">
                    <div>
                        <strong style="display:block;">${p.nombre}</strong>
                        <small>S/ ${p.precio.toFixed(2)}</small>
                    </div>
                </div>
                <button onclick="removeFromCart(${index})" style="color:red; background:none; border:none; cursor:pointer; font-weight:bold;">Quitar</button>
            </div>`;
    });

    document.getElementById('cartTotalVal').innerText = `Total: S/ ${total.toFixed(2)}`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    document.getElementById('cart-count').innerText = cart.length;
    renderCart(); // Volver a dibujar
}

// --- ADMIN CRUD ---
async function saveProduct() {
    const id = document.getElementById('editPoloId').value;
    const nombre = document.getElementById('prodName').value;
    const precio = document.getElementById('prodPrice').value;
    const descripcion = document.getElementById('prodDesc').value;
    const file = document.getElementById('imgFileInput').files[0];

    if (!nombre || !precio) return showToast("⚠️ Llena nombre y precio");

    const btn = document.getElementById('saveBtn');
    btn.innerText = "SUBIENDO..."; btn.disabled = true;

    try {
        let updateData = { nombre, precio: parseFloat(precio), descripcion };

        if (file) {
            const fileName = `polo_${Date.now()}.png`;
            const { data: uploadData, error: upErr } = await _supabase.storage.from('imagenes-polos').upload(fileName, file);
            if (upErr) throw upErr;

            const { data: urlData } = _supabase.storage.from('imagenes-polos').getPublicUrl(fileName);
            updateData.imagen_url = urlData.publicUrl;
        }

        if (id) {
            await _supabase.from('polos').update(updateData).eq('id', id);
        } else {
            if (!updateData.imagen_url) throw new Error("Falta la imagen");
            await _supabase.from('polos').insert([updateData]);
        }

        showToast("✅ Producto guardado");
        resetForm(); loadProducts(); loadInventory();
    } catch (e) {
        showToast("❌ Error: " + e.message);
    } finally {
        btn.innerText = "GUARDAR CAMBIOS"; btn.disabled = false;
    }
}

async function loadInventory() {
    const { data: polos } = await _supabase.from('polos').select('*').order('id', { ascending: false });
    const list = document.getElementById('adminInventoryList');
    list.innerHTML = '';
    polos.forEach(p => {
        list.innerHTML += `
            <div class="inventory-item" style="display:flex; align-items:center; justify-content:space-between; background:white; padding:10px; margin-bottom:10px; border-radius:8px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${p.imagen_url}" style="width:40px; height:40px; object-fit:cover;">
                    <span style="font-size:12px;">${p.nombre}</span>
                </div>
                <div>
                    <button onclick='prepareEdit(${JSON.stringify(p)})' style="color:blue; border:none; background:none; cursor:pointer;">Edit</button>
                    <button onclick="deletePolo(${p.id})" style="color:red; border:none; background:none; cursor:pointer; margin-left:10px;">Borrar</button>
                </div>
            </div>`;
    });
}

async function deletePolo(id) {
    if (!confirm("¿Borrar?")) return;
    await _supabase.from('polos').delete().eq('id', id);
    showToast("Eliminado");
    loadInventory(); loadProducts();
}

// --- UTILIDADES ---
function openModal(polo) {
    selectedPolo = polo;
    document.getElementById('modalImg').src = polo.imagen_url;
    document.getElementById('modalName').innerText = polo.nombre;
    document.getElementById('modalPrice').innerText = "S/ " + polo.precio.toFixed(2);
    document.getElementById('modalDesc').innerText = polo.descripcion || "Polo Premium JOGRI.";
    document.getElementById('modalOverlay').classList.add('open');
}

function addToCartFromModal() {
    cart.push(selectedPolo);
    document.getElementById('cart-count').innerText = cart.length;
    showToast("🛒 Añadido");
    closeModal();
}

function sendWhatsApp() {
    let msg = "¡Hola JOGRI! Mi pedido es:%0A%0A";
    let total = 0;
    cart.forEach(p => {
        msg += `- ${p.nombre} (S/ ${p.precio.toFixed(2)})%0A`;
        total += p.precio;
    });
    msg += `%0A*TOTAL: S/ ${total.toFixed(2)}*`;
    window.open(`https://wa.me/912334187?text=${msg}`); // Reemplaza con tu número
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

document.getElementById('secretLogo').addEventListener('click', () => {
    secretClicks++;
    if (secretClicks === 5) {
        document.getElementById('tab-admin').style.setProperty('display', 'inline-block', 'important');
        showToast("🔓 Modo Admin Activado");
        secretClicks = 0;
    }
    setTimeout(() => secretClicks = 0, 3000);
});

// Carga inicial
loadProducts();
