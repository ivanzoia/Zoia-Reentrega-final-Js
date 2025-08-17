let productos = [];      
let carrito = [];        
const pending = {};      
const selectedColor = {}; 


const contenedor   = document.getElementById("productos");
const listaPedido  = document.getElementById("listaPedido");
const totalPedido  = document.getElementById("totalPedido");
const iconoCarrito = document.getElementById("iconoCarrito");
const btnFinalizar = document.getElementById("btnFinalizar");
const miniResumen  = document.getElementById("miniResumen");


const saveCart = () => localStorage.setItem("carrito", JSON.stringify(carrito));
const loadCart = () => JSON.parse(localStorage.getItem("carrito") || "[]");

const cartKey = (tipo, nombre, color=null) => `${tipo}|${nombre}|${color ?? ""}`;

const findProductByKey = (id) => {
  const [tipo, nombre, color] = id.split("|");
  const prod = productos.find(p => p.tipo === tipo && p.nombre === nombre);
  return { prod, color: color || null };
};

const qtyInCart = (id) => {
  const it = carrito.find(i => i.id === id);
  return it ? it.qty : 0;
};

// stock base desde JSON; el disponible = base - enCarrito
function baseStock(prod, color=null) {
  if (prod.tipo === "remera") {
    const c = prod.colores.find(cc => cc.nombre === color);
    return c ? (c.stock || 0) : 0;
  } else {
    return prod.stock || 0;
  }
}
function availableStock(prod, color=null) {
  const id = cartKey(prod.tipo, prod.nombre, color);
  return Math.max(0, baseStock(prod, color) - qtyInCart(id));
}
// inicio
function init() {
  carrito = loadCart();
  fetch("productos.json")
    .then(r => r.json())
    .then(data => {
      productos = data;

      // color por defecto de cada remera = 1er color del JSON
      productos.forEach((p, idx) => {
        if (p.tipo === "remera") {
          selectedColor[idx] = p.colores[0]?.nombre || null;
        }
      });

      renderProductos();
      renderCart();
    });
}

// productos
function renderProductos() {
  contenedor.innerHTML = "";

  productos.forEach((prod, index) => {
    const card = document.createElement("div");
    card.className = "item";

    // imagen + select (si es remera)
    let imageSrc = prod.imagen;
    let selectHTML = "";
    if (prod.tipo === "remera") {
      const colorSel = selectedColor[index] ?? prod.colores[0].nombre;
      const colObj = prod.colores.find(c => c.nombre === colorSel) || prod.colores[0];
      imageSrc = colObj.imagen;
      selectHTML = `
        <select id="selectColor-${index}">
          ${prod.colores.map(c => `
            <option value="${c.nombre}" ${c.nombre === colorSel ? "selected" : ""}>
              ${c.nombre}
            </option>`).join("")}
        </select>
      `;
    }

    // stock visible (según color si remera)
    let stockVisible;
    if (prod.tipo === "remera") {
      const colorSel = selectedColor[index];
      stockVisible = availableStock(prod, colorSel);
    } else {
      stockVisible = availableStock(prod, null);
    }

    
    const idPend = prod.tipo === "remera"
      ? cartKey(prod.tipo, prod.nombre, selectedColor[index])
      : cartKey(prod.tipo, prod.nombre, null);

    const qtyPend = pending[idPend] || 0;

    card.innerHTML = `
      <img id="img-${index}" src="${imageSrc}" alt="${prod.nombre}">
      <h3>${prod.nombre}</h3>
      ${selectHTML}
      <p id="stock-${index}">Stock disponible: ${stockVisible}</p>
      <p>$${prod.precio}</p>

      <div>
        <button id="menos-${index}" aria-label="Quitar uno">−</button>
        <span id="cant-${index}">${qtyPend}</span>
        <button id="mas-${index}" aria-label="Sumar uno">+</button>
      </div>

      <button class="btn-agregar" id="agregar-${index}" style="background:#7CFC00; color:white; margin-top:6px;">
        Agregar al carrito
      </button>
    `;

    contenedor.appendChild(card);

   
    if (prod.tipo === "remera") {
      const select = document.getElementById(`selectColor-${index}`);
      select.addEventListener("change", () => {
        selectedColor[index] = select.value; 
        const colObj = prod.colores.find(c => c.nombre === select.value);
        document.getElementById(`img-${index}`).src = colObj?.imagen || prod.colores[0].imagen;

        // actualizar stock visible y cantidad pendiente para este color
        const newId = cartKey(prod.tipo, prod.nombre, selectedColor[index]);
        const disp = availableStock(prod, selectedColor[index]);
        document.getElementById(`stock-${index}`).textContent = `Stock disponible: ${disp}`;
        document.getElementById(`cant-${index}`).textContent = pending[newId] || 0;
      });
    }

    // ajusta cantidad
    document.getElementById(`mas-${index}`).addEventListener("click", () => {
      const colorSel = prod.tipo === "remera" ? selectedColor[index] : null;
      const id = cartKey(prod.tipo, prod.nombre, colorSel);
      const disp = availableStock(prod, colorSel);
      const actual = pending[id] || 0;
      if (actual + 1 > disp) {
        Swal.fire("No hay suficiente stock");
        return;
      }
      pending[id] = actual + 1;
      document.getElementById(`cant-${index}`).textContent = pending[id];
    });

    document.getElementById(`menos-${index}`).addEventListener("click", () => {
      const colorSel = prod.tipo === "remera" ? selectedColor[index] : null;
      const id = cartKey(prod.tipo, prod.nombre, colorSel);
      const actual = pending[id] || 0;
      if (actual - 1 < 0) return;
      pending[id] = actual - 1;
      document.getElementById(`cant-${index}`).textContent = pending[id];
    });

    // Agregar al carrito
    document.getElementById(`agregar-${index}`).addEventListener("click", () => {
      const colorSel = prod.tipo === "remera" ? selectedColor[index] : null;
      const id = cartKey(prod.tipo, prod.nombre, colorSel);
      const toAdd = pending[id] || 0;
      if (toAdd <= 0) {
        Swal.fire("Seleccioná al menos 1 unidad con +");
        return;
      }
      const disp = availableStock(prod, colorSel);
      if (toAdd > disp) {
        Swal.fire("No hay suficiente stock");
        return;
      }
      // merge en carrito
      const idx = carrito.findIndex(i => i.id === id);
      if (idx >= 0) {
        carrito[idx].qty += toAdd;
      } else {
        carrito.push({
          id,
          tipo: prod.tipo,
          nombre: prod.nombre,
          color: colorSel,
          precio: prod.precio,
          qty: toAdd
        });
      }
      // Notificación con Toastify
Toastify({
  text: `${prod.nombre}${colorSel ? " (" + colorSel + ")" : ""} agregado al carrito`,
  duration: 2000,
  gravity: "bottom",
  position: "right",
  style: {
    background: "linear-gradient(to right, #00b09b, #96c93d)"
  }
}).showToast();

     
      pending[id] = 0;

      saveCart();
      renderCart();

      // stock
      const nuevoDisp = availableStock(prod, colorSel);
      document.getElementById(`stock-${index}`).textContent = `Stock disponible: ${nuevoDisp}`;
      document.getElementById(`cant-${index}`).textContent = "0";
    });
  });
}

// carrito
function renderCart() {
  listaPedido.innerHTML = "";
  let total = 0;
  let count = 0;

  carrito.forEach(item => {
    const li = document.createElement("li");

    const label = document.createElement("span");
    label.textContent = item.tipo === "remera"
      ? `${item.nombre} (${item.color}) - $${item.precio}`
      : `${item.nombre} - $${item.precio}`;

    // controles: − qty +
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.alignItems = "center";
    controls.style.gap = "6px";

    const btnMenos = document.createElement("button");
    btnMenos.textContent = "−";
    btnMenos.title = "Quitar uno";
    btnMenos.addEventListener("click", () => {
      setItemQty(item.id, item.qty - 1);
    });

    const qtySpan = document.createElement("span");
    qtySpan.textContent = `x${item.qty}`;

    const btnMas = document.createElement("button");
    btnMas.textContent = "+";
    btnMas.title = "Agregar uno";
    btnMas.addEventListener("click", () => {
      setItemQty(item.id, item.qty + 1);
    });

    const btnTrash = document.createElement("button");
    btnTrash.textContent = "🗑️";
    btnTrash.title = "Eliminar ítem";
    btnTrash.style.background = "transparent";
    btnTrash.style.color = "inherit";
    btnTrash.addEventListener("click", () => {
      removeItem(item.id);
    });

    controls.appendChild(btnMenos);
    controls.appendChild(qtySpan);
    controls.appendChild(btnMas);
    controls.appendChild(btnTrash);

    li.appendChild(label);
    li.appendChild(controls);
    listaPedido.appendChild(li);

    total += item.precio * item.qty;
    count += item.qty;
  });

  totalPedido.textContent = total;
  iconoCarrito.setAttribute("data-count", count);

  // Boton de abajo (vaciar / seguir)
  ensureMiniResumenButtons();
}

// valida cantiddad de stockk
function setItemQty(id, newQty) {
  const { prod, color } = findProductByKey(id);
  if (!prod) return;

  if (newQty <= 0) {
    removeItem(id);
    return;
  }

  const max = baseStock(prod, color); 
  if (newQty > max) {
    Swal.fire("No hay suficiente stock");
    return;
  }

  const idx = carrito.findIndex(i => i.id === id);
  if (idx >= 0) {
    carrito[idx].qty = newQty;
    saveCart();
    renderCart();
    
    renderProductos(); 
  }
}

function removeItem(id) {
  const idx = carrito.findIndex(i => i.id === id);
  if (idx >= 0) {
    carrito.splice(idx, 1);
    saveCart();
    renderCart();
    renderProductos(); 
  }
}

function ensureMiniResumenButtons() {
  // no duplica elementos
  if (document.getElementById("mini-controls")) return;

  const controls = document.createElement("div");
  controls.id = "mini-controls";
  controls.style.marginTop = "10px";
  controls.style.display = "flex";
  controls.style.justifyContent = "space-between";

  const btnVaciar = document.createElement("button");
  btnVaciar.textContent = "Vaciar carrito";
  btnVaciar.style.background = "#FF6347";
  btnVaciar.style.color = "white";
  btnVaciar.style.border = "none";
  btnVaciar.style.borderRadius = "5px";
  btnVaciar.style.padding = "5px 10px";
  btnVaciar.addEventListener("click", () => {
    carrito = [];
    saveCart();
    renderCart();
    renderProductos();
  });

  const btnSeguir = document.createElement("button");
  btnSeguir.textContent = "Seguir comprando";
  btnSeguir.style.background = "#7CFC00";
  btnSeguir.style.color = "white";
  btnSeguir.style.border = "none";
  btnSeguir.style.borderRadius = "5px";
  btnSeguir.style.padding = "5px 10px";
  btnSeguir.addEventListener("click", () => {
    miniResumen.style.display = "none";
  });

  controls.appendChild(btnVaciar);
  controls.appendChild(btnSeguir);
  miniResumen.appendChild(controls);
}


iconoCarrito.addEventListener("click", () => {
  miniResumen.style.display = (miniResumen.style.display === "block") ? "none" : "block";
});

btnFinalizar.addEventListener("click", () => {
  if (carrito.length === 0) {
    Swal.fire("El carrito está vacío");
    return;
  }
  saveCart();
  window.open("formulario.html", "_blank");
});
// Botón para cerrar el miniResumen 
const btnCerrarResumen = document.createElement("span");
btnCerrarResumen.textContent = "❌";
btnCerrarResumen.style.cursor = "pointer";
btnCerrarResumen.style.float = "right";
btnCerrarResumen.addEventListener("click", () => {
  miniResumen.style.display = "none";
});
miniResumen.insertBefore(btnCerrarResumen, miniResumen.firstChild);

// vuelve
init();
