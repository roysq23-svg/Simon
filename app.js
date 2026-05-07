const supabaseUrl = 'https://nbcxafnjolasdmleqjhp.supabase.co';
const supabaseKey = 'sb_publishable_0CmPrpHpz_iz8ZOI04uZ4A_VcNCpncN';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let cart = [];
let selectedPolo = null;
let selectedColor = null;
let selectedTalla = null;
let currentStock = [];
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
    const { data: polos, error } = await _supabase
        .from('polos')
        .select('*')
        .order('id', { ascending: false });

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
    const { data: polos, error } = await _supabase
        .from('polos')
        .select('*')
        .order('id', { ascending: false });

    if (error) { showToast("❌ Error al cargar inventario"); return; }

    const list = document.getElementById('adminInventoryList');
    list.innerHTML = '';

    polos.forEach(p => {
        list.innerHTML += `
            <div class="inventory-item">
                <img src="${p.imagen_url}" onerror="this.src='https://via.placeholder.com/50'">
                <div style="flex-grow:1; margin-left:15px;">
                    <h4 style="font-size:14px;">${p.nombre}</h4>
                    <small>S/ ${parseFloat(p.precio).toFixed(2)}</small><br>
                    <small style="color:#888;">${p.categoria || 'Sin categoría'}</small>
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
    const categoria = document.getElementById('prodCategoria').value;
    const file = document.getElementById('imgFileInput').files[0];

    // Tallas seleccionadas
    const tallasChecked = [...document.querySelectorAll('.talla-check:checked')].map(cb => cb.value);

    // Colores ingresados
    const coloresRaw = document.getElementById('prodColores').value.trim();
    const colores = coloresRaw ? coloresRaw.split(',').map(c => c.trim()).filter(c => c) : [];

    if (!nombre || !precio) return showToast("⚠️ Llena nombre y precio");

    const btn = document.getElementById('saveBtn');
    btn.innerText = "PROCESANDO...";
    btn.disabled = true;

    let updateData = {
        nombre,
        precio: parseFloat(precio),
        descripcion,
        categoria,
        tallas: tallasChecked,
        colores: colores
    };

    // Subir imagen si hay archivo
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

    let poloId = id;
    let error;

    if (id) {
        const res = await _supabase.from('polos').update(updateData).eq('id', id);
        error = res.error;
    } else {
        const res = await _supabase.from('polos').insert([updateData]).select();
        error = res.error;
        if (!error && res.data && res.data.length > 0) {
            poloId = res.data[0].id;
        }
    }

    if (error) {
        showToast("❌ Error: " + error.message);
        btn.innerText = "GUARDAR CAMBIOS";
        btn.disabled = false;
        return;
    }

    // Guardar stock por talla y color
    if (poloId && tallasChecked.length > 0 && colores.length > 0) {
        for (const talla of tallasChecked) {
            for (const color of colores) {
                const stockInput = document.getElementById(`stock_${talla}_${color.replace(/\s/g,'_')}`);
                const cantidad = stockInput ? parseInt(stockInput.value) || 0 : 0;
                await _supabase.from('polo_stock').upsert({
                    polo_id: parseInt(poloId),
                    talla,
                    color,
                    cantidad
                }, { onConflict: 'polo_id,talla,color' });
            }
        }
    }

    showToast(id ? "✅ Polo actualizado" : "✅ Polo agregado");
    resetForm();
    loadProducts();
    loadInventory();

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
    document.getElementById('prodCategoria').value = polo.categoria || 'Básico';
    document.getElementById('prodColores').value = (polo.colores || []).join(', ');
    document.getElementById('fileLabel').innerHTML = "📷 Seleccionar nueva imagen (opcional)";
    document.getElementById('cancelEdit').style.display = 'block';

    // Marcar tallas
    document.querySelectorAll('.talla-check').forEach(cb => {
        cb.checked = (polo.tallas || []).includes(cb.value);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    document.getElementById('formTitle').innerText = "Agregar Polo";
    document.getElementById('editPoloId').value = "";
    document.getElementById('prodName').value = "";
    document.getElementById('prodPrice').value = "";
    document.getElementById('prodDesc').value = "";
    document.getElementById('prodCategoria').value = "Básico";
    document.getElementById('prodColores').value = "";
    document.getElementById('imgFileInput').value = "";
    document.getElementById('fileLabel').innerHTML = "📷 Seleccionar Imagen";
    document.getElementById('cancelEdit').style.display = 'none';
    document.querySelectorAll('.talla-check').forEach(cb => cb.checked = false);
}

// MODAL CON TALLAS Y COLORES
async function openModal(polo) {
    selectedPolo = polo;
    selectedColor = null;
    selectedTalla = null;

    document.getElementById('modalImg').src = polo.imagen_url;
    document.getElementById('modalName').innerText = polo.nombre;
    document.getElementById('modalPrice').innerText = "S/ " + parseFloat(polo.precio).toFixed(2);
    document.getElementById('modalDesc').innerText = polo.descripcion || "Calidad Premium.";
    document.getElementById('modalCategoria').innerText = polo.categoria || "Básico";
    document.getElementById('colorSeleccionado').innerText = "—";
    document.getElementById('tallaSeleccionada').innerText = "—";
    document.getElementById('stockWarning').style.display = 'none';
    document.getElementById('tallaOptions').innerHTML = '';
    document.getElementById('colorOptions').innerHTML = '';

    // Cargar stock desde supabase
    const { data: stockData } = await _supabase
        .from('
