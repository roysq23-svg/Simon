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
    window.scrollTo(0, 0);
}

// CARGAR TIENDA
async function loadProducts() {
    const { data: polos, error } = await _supabase.from('polos').select('*').order('id', { ascending: false });
    const grid = document.getElementById('storeGrid');
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

// CRUD ADMIN
async function loadInventory() {
    const { data: polos, error } = await _supabase.from('polos').select('*').order('id', { ascending: false });
    const list = document.getElementById('adminInventoryList');
    list.innerHTML = '';
    polos.forEach(p => {
        list.innerHTML += `
            <div class="inventory-item">
                <img src="${p.imagen_url}">
                <div style="flex-grow:1; margin-left:15px;">
                    <h4 style="font-size:14px;">${p.nombre}</h4>
                    <small>S/ ${p.precio}</small>
                </div>
                <button onclick='prepareEdit(${JSON.stringify(p)})' style="color:blue; background:none; border:none; cursor:pointer;">Editar</button>
                <button onclick="deletePolo(${p.id})" style="color:red; background:none; border:none; cursor:pointer; margin-left:10px;">Borrar</button>
            </div>`;
    });
}

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
        const fileName = `polo_${Date.now()}.png`;
        await _supabase.storage.from('imagenes-polos').upload(fileName, file);
        const { data } = _supabase.storage.from('imagenes-polos').getPublicUrl(fileName);
        updateData.imagen_url = data.publicUrl;
    }

    if (id) await _supabase.from('polos').update(updateData).eq('id', id);
    else await _supabase.from('polos').insert([updateData]);

    showToast("✅ Guardado");
    resetForm(); loadProducts(); loadInventory();
    btn.innerText = "GUARDAR CAMBIOS"; btn.disabled = false;
}

async function deletePolo(id) {
    if (!confirm("¿Eliminar polo?")) return;
    await _supabase.from('polos').delete().eq('id', id);
    showToast("🗑️ Eliminado");
    loadInventory(); loadProducts();
}

function prepareEdit(polo) {
    document.getElementById('formTitle').innerText = "Editando Polo";
    document.getElementById('editPoloId').value = polo.id;
    document.getElementById('prodName').value = polo.nombre;
    document.getElementById('prodPrice').value = polo.precio;
    document.getElementById('prodDesc').value = polo.descripcion || '';
    document.getElementById('cancelEdit').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    document.getElementById('formTitle').innerText = "Agregar Polo";
    document.getElementById('editPoloId').value = "";
    document.getElementById('prodName').value = "";
    document.getElementById('prodPrice').value = "";
    document.getElementById('prodDesc').value = "";
    document.getElementById('cancelEdit').style.display = 'none';
}

// MODALES Y CARRITO
function openModal(polo) {
    selectedPolo = polo;
    document.getElementById('modalImg').src = polo.imagen_url;
    document.getElementById('modalName').innerText = polo.nombre;
    document.getElementById('modalPrice').innerText = "S/ " + polo.precio.toFixed(2);
    document.getElementById('modalDesc').innerText = polo.descripcion || "Calidad Premium.";
    document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

function addToCartFromModal() {
    cart.push(selectedPolo);
    document.getElementById('cart-count').innerText = cart.length;
    showToast("🛒 Añadido");
    closeModal();
}

function renderCart() {
    const list = document.getElementById('cartItemsList');
    const footer = document.getElementById('cartFooter');
    if (cart.length === 0) {
        list.innerHTML = "<p style='text-align:center;'>Carrito vacío.</p>";
        footer.style.display = 'none';
        return;
    }
    list.innerHTML = ''; footer.style.display = 'block';
    let total = 0;
    cart.forEach(p => {
        total += p.precio;
        list.innerHTML += `<div style="display:flex; justify-content:space-between; padding:15px; border-bottom:1px solid #eee;"><span>${p.nombre}</span><strong>S/ ${p.precio.toFixed(2)}</strong></div>`;
    });
    document.getElementById('cartTotalVal').innerText = `Total: S/ ${total.toFixed(2)}`;
}

function sendWhatsApp() {
    let msg = "¡Hola! Mi pedido de POLO STUDIO:%0A";
    cart.forEach(p => msg += `- ${p.nombre} (S/ ${p.precio.toFixed(2)})%0A`);
    window.open(`https://wa.me/51900000000?text=${msg}`);
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function updateLabel() {
    const f = document.getElementById('imgFileInput').files[0];
    if(f) document.getElementById('fileLabel').innerHTML = "✅ " + f.name;
}

// TRUCO ADMIN
document.getElementById('secretLogo').addEventListener('click', () => {
    secretClicks++;
    if (secretClicks === 5) {
        document.getElementById('tab-admin').style.setProperty('display', 'inline-block', 'important');
        showToast("🛡️ Modo Admin");
        secretClicks = 0;
    }
    setTimeout(() => secretClicks = 0, 3000);
});

loadProducts();
