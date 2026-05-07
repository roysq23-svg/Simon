const supabaseUrl = 'https://nbcxafnjolasdmleqjhp.supabase.co';
const supabaseKey = 'sb_publishable_0CmPrpHpz_iz8ZOI04uZ4A_VcNCpncN';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let cart = [];
let selectedPolo = null;

// CARGAR POLOS
async function loadProducts() {
    const { data: polos, error } = await _supabase.from('polos').select('*');
    if (error) return console.log(error);

    const grid = document.getElementById('storeGrid');
    grid.innerHTML = '';
    polos.forEach(p => {
        grid.innerHTML += `
            <div class="product-card" onclick='openModal(${JSON.stringify(p)})'>
                <img src="${p.imagen_url}">
                <div style="padding:15px; text-align:center;">
                    <h3 style="font-family:Syne">${p.nombre}</h3>
                    <p style="color:#666">S/ ${p.precio}</p>
                </div>
            </div>`;
    });
}

// SUBIR PRODUCTO
async function saveProduct() {
    const file = document.getElementById('imgFileInput').files[0];
    const nombre = document.getElementById('prodName').value;
    const precio = document.getElementById('prodPrice').value;

    if (!file || !nombre || !precio) return alert("Por favor, llena todos los campos.");

    const btn = document.getElementById('saveBtn');
    btn.innerText = "SUBIENDO...";
    btn.disabled = true;

    const fileName = `${Date.now()}_${file.name}`;
    const { data: upData, error: upErr } = await _supabase.storage.from('imagenes-polos').upload(fileName, file);

    if (upErr) {
        alert("Error al subir imagen");
        btn.disabled = false;
        return;
    }

    const { data: urlData } = _supabase.storage.from('imagenes-polos').getPublicUrl(fileName);

    const { error: dbErr } = await _supabase.from('polos').insert([
        { nombre: nombre, precio: parseFloat(precio), imagen_url: urlData.publicUrl }
    ]);

    if (!dbErr) {
        alert("Polo publicado con éxito");
        loadProducts();
        switchTab('store');
    }
    btn.disabled = false;
    btn.innerText = "PUBLICAR AHORA";
}

// CARRITO Y NAVEGACIÓN
function switchTab(tabId) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + tabId)?.classList.add('active');
    if(tabId === 'hero') document.getElementById('hero').classList.add('active');
}

function openModal(polo) {
    selectedPolo = polo;
    document.getElementById('modalImg').src = polo.imagen_url;
    document.getElementById('modalName').innerText = polo.nombre;
    document.getElementById('modalPrice').innerText = "S/ " + polo.precio;
    document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
}

function addToCartFromModal() {
    cart.push(selectedPolo);
    document.getElementById('cart-count').innerText = cart.length;
    renderCart();
    closeModal();
}

function renderCart() {
    const list = document.getElementById('cartItemsList');
    const footer = document.getElementById('cartFooter');
    if (cart.length === 0) {
        list.innerHTML = "Carrito vacío.";
        footer.style.display = 'none';
        return;
    }
    footer.style.display = 'block';
    list.innerHTML = '';
    let total = 0;
    cart.forEach((p, index) => {
        total += p.precio;
        list.innerHTML += `<div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee">
            <span>${p.nombre}</span>
            <span>S/ ${p.precio}</span>
        </div>`;
    });
    document.getElementById('cartTotalVal').innerText = `Total: S/ ${total.toFixed(2)}`;
}

function sendWhatsApp() {
    let msg = "¡Hola! Quiero comprar estos polos: ";
    cart.forEach(p => msg += `${p.nombre} (S/ ${p.precio}), `);
    window.open(`https://wa.me/51900000000?text=${encodeURIComponent(msg)}`);
}

loadProducts();
