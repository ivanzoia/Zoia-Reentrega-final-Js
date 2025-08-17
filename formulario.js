(function(){
  emailjs.init("5bHI0dbsKYhagXA73"); 
})();

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById("compraForm");
  const resumenDiv = document.getElementById("resumenPedido");

  // 🔹 Recuperar carrito y mostrarlo en pantalla
  let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

  if (carrito.length > 0) {
    let total = 0;
    let tabla = `
      <h2>🛒 Resumen de tu pedido</h2>
      <table class="tabla-resumen">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cant.</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
    `;

    carrito.forEach(item => {
      let subtotal = item.precio * item.qty;
      total += subtotal;
      tabla += `
        <tr>
          <td>${item.nombre} (${item.color || "sin color"})</td>
          <td>${item.qty}</td>
          <td>$${subtotal}</td>
        </tr>
      `;
    });

    tabla += `
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2"><b>Total</b></td>
            <td><b>$${total}</b></td>
          </tr>
        </tfoot>
      </table>
    `;

    resumenDiv.innerHTML = tabla;
  } else {
    resumenDiv.innerHTML = "<p>No hay productos en tu carrito.</p>";
  }

  // 🔹 Manejo del envío de formulario
  form.addEventListener("submit", function(event) {
    event.preventDefault();

    const nombre = document.getElementById("nombre").value;
    const direccion = document.getElementById("direccion").value;
    const email = document.getElementById("email").value;

    if (carrito.length === 0) {
      Swal.fire("⚠️ Atención", "Tu carrito está vacío", "warning");
      return;
    }

    let detallePedido = carrito.map(item =>
      `${item.nombre} (${item.color || "sin color"}) x${item.qty} = $${item.precio * item.qty}`
    ).join("<br>");

    let total = carrito.reduce((acc, item) => acc + (item.precio * item.qty), 0);

    let datosTransferencia = `
    <b>Alias:</b> juemix.mp <br>
    <b>CBU:</b> 000000000000000 <br>
    <b>Banco:</b> Mercado Pago <br>
    <b>Titular:</b> JUEMIX
    `;

    // 🔹 Resumen con SweetAlert
    Swal.fire({
      title: "📦 Confirmá tu pedido",
      html: `
        <div style="text-align:left; font-size:14px; line-height:1.6">
          <p><b>Cliente:</b> ${nombre}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Dirección:</b> ${direccion}</p>
          <hr>
          <p><b>Detalle del pedido:</b></p>
          <p>${detallePedido}</p>
          <hr>
          <p><b>Total:</b> $${total}</p>
          <p><b>Datos para Transferencia:</b><br>${datosTransferencia}</p>
        </div>
      `,
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "✅ Confirmar y enviar",
      cancelButtonText: "❌ Cancelar",
      customClass: { popup: 'swal2-border-radius' }
    }).then((result) => {
      if (result.isConfirmed) {
        const templateParams = {
          cliente_nombre: nombre,
          cliente_direccion: direccion,
          cliente_email: email,
          pedido: carrito.map(item =>
            `${item.nombre} (${item.color || "sin color"}) x${item.qty} = $${item.precio * item.qty}`
          ).join("\n"),
          total: `$${total}`,
          transferencia: "Alias: juemix.mp | CBU: 000000000000000 | Banco: Mercado Pago | Titular: JUEMIX"
        };

        emailjs.send("service_dv3zbrl", "template_2bsg3sn", templateParams)
          .then(() => {
            Swal.fire("✅ Pedido enviado", "Te enviamos un correo con los datos para realizar la transferencia", "success");
            localStorage.removeItem("carrito");
            form.reset();
          })
          .catch((error) => {
            Swal.fire("❌ Error", "No se pudo enviar el correo: " + JSON.stringify(error), "error");
          });
      }
    });
  });
});
