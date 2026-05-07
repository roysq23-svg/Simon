// CONFIGURACIÓN SUPABASE
const supabaseUrl = 'https://nbcxafnjolasdmleqjhp.supabase.co';
const supabaseKey = 'sb_publishable_0CmPrpHpz_iz8ZOI04uZ4A_VcNCpncN'; 
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

// CARGAR PRODUCTOS EN TIENDA
async function loadProducts() {
    const { data: polos, error } = await _supabase.from('polos').select('*').order('id', { ascending: false });
    if (error) return console.log(error);
    const grid = document.getElementById('storeGrid');
    grid.innerHTML = '';
    polos.forEach(p => {
        grid.innerHTML += `
            <div class="product-card" onclick='openModal(${JSON.stringify(p)})'>
                <img src="${p.imagen_url}">
                <div class="product-info">
                    <h3 style="font-family:Syne; font-size:16px;">${p.nombre}</h3>
                    <p style="color:#666; font-size:14px;">S/ ${p.precio.toFixed(2)}</p>
                </div>
            </div>`;
    });
}

// GUARDAR PRODUCTO (EDITAR O CREAR)
async function saveProduct() {
    const id = document.getElementById('editPoloId').value;
    const nombre = document.getElementById('prodName').value;
    const precio = document.getElementById('prodPrice').value;
    const descripcion = document.getElementById('prodDesc').value;
    const file = document.getElementById('imgFileInput').files[0];

    if (!nombre || !precio) return showToast("⚠️ Llena nombre y precio");

    const btn = document.getElementById('saveBtn');
    btn.innerText = "PROCESANDO..."; btn.disabled = true;

    let updateData = { nombre, precio: parseFloat(precio), descripcion };

    if (file) {
        const fileName = `${Date.now()}_${file.name}`;
        await _supabase.storage.from('imagenes-polos').upload(fileName, file);
        const { data } = _supabase.storage.from('imagenes-polos').getPublicUrl(fileName);
        updateData.imagen_url = data.publicUrl;
    }

    if (id) {
        // EDITAR
        const { error } = await _supabase.from('polos').update(updateData).eq('id', id);
        if (!error) showToast("✅ ¡Polo actualizado!");
    } else {
        // CREAR
        if(!updateData.imagen_url) { btn.disabled = false; btn.innerText = "GUARDAR CAMBIOS"; return showToast("📷 Falta la foto"); }
        const { error } = await _supabase.from('polos').insert([updateData]);
        if (!error) showToast("✅ ¡Polo creado!");
    }

    resetForm();
    
    // --- CORRECCIÓN: ACTUALIZAR TIENDA OFICIAL ---
    await loadProducts(); // Recarga los productos en la tienda
    await loadInventory(); // Recarga la lista en el admin
    // ----------------------------------------------
    
    btn.disabled = false; btn.innerText = "GUARDAR CAMBIOS";
}

// OTRAS FUNCIONES (CRUD Y CARRITO)
async function loadInventory() {
    const { data: polos } = await _supabase.from('polos').select('*').order('id', { ascending: false });
    const container = document.getElementById('adminInventoryList');
    container.innerHTML = '';
    polos.forEach(p => {
        container.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; background:#eee; padding:5px; margin-bottom:5px; border-radius:5px;">
            <span>${p.nombre}</span>
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

function prepareEdit(polo) {
    document.getElementById('formTitle').innerText = "📝 Editando: " + polo.nombre;
    document.getElementById('editPoloId').value = polo.id;
    document.getElementById('prodName').value = polo.nombre;
    document.getElementById('prodPrice').value = polo.precio;
    document.getElementById('prodDesc').value = polo.descripcion || '';
    document.getElementById('cancelEdit').style.display = 'block';
    document.getElementById('panel-admin').scrollTo(0,0);
}

function resetForm() {
    document.getElementById('formTitle').innerText = "➕ Agregar Nuevo Polo";
    document.getElementById('editPoloId').value = "";
    document.getElementById('prodName').value = "";
    document.getElementById('prodPrice').value = "";
    document.getElementById('prodDesc').value = "";
    document.getElementById('cancelEdit').style.display = 'none';
}

function switchTab(tabId) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + tabId)?.classList.add('active');
    if(tabId === 'admin') loadInventory();
    if(tabId === 'cart') renderCart();
}

// MODAL Y CARRITO
function openModal(polo) {
    selectedPolo = polo;
    document.getElementById('modalImg').src = polo.imagen_url;
    document.getElementById('modalName').innerText = polo.nombre;
    document.getElementById('modalPrice').innerText = "S/ " + polo.precio.toFixed(2);
    document.getElementById('modalDesc').innerText = polo.descripcion || "Polo exclusivo.";
    document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

function addToCartFromModal() {
    cart.push(selectedPolo);
    document.getElementById('cart-count').innerText = cart.length;
    renderCart(); closeModal(); showToast("🛒 Añadido");
}

function renderCart() {
    const list = document.getElementById('cartItemsList');
    if (cart.length === 0) { list.innerHTML = "<p style='text-align:center;'>Carrito vacío.</p>"; return; }
    list.innerHTML = '';
    let total = 0;
    cart.forEach(p => {
        total += p.precio;
        list.innerHTML += `<div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;"><span>${p.nombre}</span><strong>S/ ${p.precio.toFixed(2)}</strong></div>`;
    });
    document.getElementById('cartTotalVal').innerText = `Total: S/ ${total.toFixed(2)}`;
}

function sendWhatsApp() {
    let msg = "¡Hola JOGRI! Mi pedido es:%0A%0A";
    cart.forEach(p => msg += `- ${p.nombre} (S/ ${p.precio.toFixed(2)})%0A`);
    window.open(`https://wa.me/51900000000?text=${msg}`);
}

// LOGO SECRETO
document.getElementById('secretLogo').addEventListener('click', () => {
    secretClicks++;
    if (secretClicks === 5) {
        document.getElementById('tab-admin').style.setProperty('display', 'inline-block', 'important');
        showToast("🛠️ Admin Activado");
        secretClicks = 0;
    }
    setTimeout(() => secretClicks = 0, 3000);
});

function updateLabel() {
    const file = document.getElementById('imgFileInput').files[0];
    if (file) document.getElementById('fileLabel').innerText = "✅ " + file.name;
}

loadProducts();
