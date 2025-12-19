require('dotenv').config();
const express = require("express");
const { twiml: { MessagingResponse } } = require("twilio");
const prisma = require("./lib/prisma");

const app = express();
app.use(express.urlencoded({ extended: false }));

// Gestión de sesiones en memoria
const sessions = new Map();

function normalize(text = "") {
  return text.trim().toLowerCase();
}

// Funciones helper para cada funcionalidad
async function getMenuMessage(twiml) {
  const company = await prisma.company.findUnique({ where: { id: 'zafra' } });
  const messageText = (
    `🍞 ¡Hola! Bienvenido a *${company?.name || "Zafra"}*\n\n` +
    `Más de 30 años suministrando insumos de la más alta calidad para panadería y repostería.\n\n` +
    `¿En qué puedo ayudarte? Selecciona una opción:\n\n` +
    `1️⃣ 💰 Cotización (con carrito)\n` +
    `2️⃣ 💵 Precios\n` +
    `3️⃣ 📦 Disponibilidad\n` +
    `4️⃣ 🚚 Entregas\n` +
    `5️⃣ 📊 Stock\n` +
    `6️⃣ 🎁 Preventa (reservas)\n` +
    `7️⃣ 🛒 Ver mi carrito\n` +
    `8️⃣ 📋 Ver mis reservas\n\n` +
    `📞 Contacto: ${company?.phone || "55 6805 9501"}\n\n` +
    `Escribe el número o *menu* para ver este menú.`
  );
  
  twiml.message(messageText);
  return twiml;
}

// Funciones de carrito
async function getOrCreateCart(phone) {
  let cart = await prisma.cart.findFirst({
    where: {
      phone: phone,
      status: 'active'
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              category: true
            }
          }
        }
      }
    }
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        phone: phone,
        status: 'active'
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        }
      }
    });
  }

  return cart;
}

async function addToCart(phone, productId, quantity) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  
  if (!product) {
    return { error: 'Producto no encontrado' };
  }

  if (product.stock < quantity) {
    return { error: `Stock insuficiente. Disponible: ${product.stock} ${product.unit}` };
  }

  const cart = await getOrCreateCart(phone);
  
  const existingItem = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId: productId
    }
  });

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    if (product.stock < newQuantity) {
      return { error: `Stock insuficiente. Disponible: ${product.stock} ${product.unit}` };
    }
    
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: newQuantity }
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: productId,
        quantity: quantity
      }
    });
  }

  return { success: true, product };
}

async function handleCotizacion(session, body, phone) {
  const twiml = new MessagingResponse();
  
  if (session.step === "await_cotizacion_product") {
    // Verificar si es un comando especial
    const normalizedBody = normalize(body);
    if (normalizedBody === "carrito" || normalizedBody.includes("carrito")) {
      const cartTwiml = await handleViewCart(phone);
      return { twiml: cartTwiml, session };
    }
    
    // Formato: ID cantidad (ej: ZAF001 5)
    const parts = body.trim().split(/\s+/);
    const productId = parts[0]?.toUpperCase();
    const quantity = parseInt(parts[1]) || 1;
    
    if (!productId) {
      twiml.message("❌ Por favor escribe el ID del producto. Ejemplo: *ZAF001 5*\n\nO escribe *carrito* para ver tu carrito.");
      return { twiml, session };
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true }
    });
    
    if (product) {
      // Intentar agregar al carrito
      const result = await addToCart(phone, productId, quantity);
      
      if (result.error) {
        twiml.message(`❌ ${result.error}\n\nEscribe otro producto o *menu* para regresar.`);
      } else {
        const message = (
          `✅ *Agregado al carrito*\n\n` +
          `💰 *${product.name}*\n` +
          `📋 Categoría: ${product.category.name}\n` +
          `💵 Precio: $${product.price.toFixed(2)} / ${product.unit}\n` +
          `📦 Cantidad: ${quantity} ${product.unit}\n` +
          `💰 Subtotal: $${(product.price * quantity).toFixed(2)}\n\n` +
          `🛒 Escribe *carrito* para ver tu carrito\n` +
          `📝 Escribe otro producto (ID cantidad) o *menu* para regresar.`
        );
        twiml.message(message);
      }
      session.step = "await_cotizacion_product";
    } else {
      const categories = await prisma.category.findMany({
        include: {
          products: {
            take: 3
          }
        }
      });
      
      let message = `❌ No encontré el producto *${productId}*.\n\n`;
      message += `*Productos disponibles:*\n`;
      categories.forEach(cat => {
        if (cat.products.length > 0) {
          message += `\n*${cat.name}:*\n`;
          cat.products.forEach(p => {
            message += `• ${p.id} - ${p.name}\n`;
          });
        }
      });
      message += `\nEscribe *ID cantidad* (ej: ZAF001 5) o *menu* para regresar.`;
      twiml.message(message);
    }
  } else {
    const categories = await prisma.category.findMany({
      include: {
        products: {
          where: { available: true },
          take: 5
        }
      }
    });
    
    let message = `💰 *Cotización de Productos*\n\n`;
    message += `*Agrega productos a tu carrito escribiendo: ID cantidad*\n`;
    message += `Ejemplo: *ZAF001 5*\n\n`;
    message += `*Categorías disponibles:*\n`;
    categories.forEach((cat, idx) => {
      if (cat.products.length > 0) {
        message += `${idx + 1}. ${cat.name}\n`;
      }
    });
    message += `\n*Ejemplos de productos:*\n`;
    categories.forEach(cat => {
      cat.products.slice(0, 2).forEach(p => {
        message += `• ${p.id} - ${p.name} - $${p.price.toFixed(2)}\n`;
      });
    });
    message += `\nEscribe *ID cantidad* para agregar al carrito o *menu* para regresar.`;
    twiml.message(message);
    session.step = "await_cotizacion_product";
  }
  
  return { twiml, session };
}

async function handlePrecios() {
  const twiml = new MessagingResponse();
  
  const categories = await prisma.category.findMany({
    include: {
      products: {
        orderBy: { name: 'asc' }
      }
    }
  });
  
  let message = `💵 *Lista de Precios*\n\n`;
  
  categories.forEach(cat => {
    if (cat.products.length > 0) {
      message += `*${cat.name}:*\n`;
      cat.products.forEach(p => {
        const stockEmoji = p.available && p.stock > 0 ? "✅" : "❌";
        message += `${stockEmoji} ${p.name} (${p.id})\n`;
        message += `   $${p.price.toFixed(2)} / ${p.unit}\n`;
      });
      message += `\n`;
    }
  });
  
  const company = await prisma.company.findUnique({ where: { id: 'zafra' } });
  message += `💡 *Nota:* Precios sujetos a cambio. Para pedidos especiales o grandes volúmenes, contáctanos.\n\n`;
  message += `📞 ${company?.phone || "55 6805 9501"}\n\n`;
  message += `Escribe *menu* para volver al menú.`;
  
  twiml.message(message);
  return twiml;
}

async function handleDisponibilidad(session, body) {
  const twiml = new MessagingResponse();
  
  if (session.step === "await_disponibilidad_product") {
    const productId = body.toUpperCase();
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true }
    });
    
    if (product) {
      const status = product.available && product.stock > 0 ? "✅ Disponible" : "❌ Agotado";
      const stockLevel = product.stock > 20 ? "Alto" : product.stock > 10 ? "Medio" : product.stock > 0 ? "Bajo" : "Sin stock";
      const message = (
        `📦 *Disponibilidad - ${product.name}*\n\n` +
        `Estado: ${status}\n` +
        `Stock: ${product.stock} ${product.unit}\n` +
        `Nivel: ${stockLevel}\n` +
        `ID: ${product.id}\n` +
        `Categoría: ${product.category.name}\n` +
        `Tiempo de entrega: ${product.deliveryDays} día(s)\n\n` +
        (product.stock === 0 ? `⚠️ Producto agotado. Contáctanos para conocer fecha de reposición.\n\n` : ``)
      );
      twiml.message(message + `\n\nEscribe *menu* para volver al menú.`);
      session.step = "await_disponibilidad_product";
    } else {
      const products = await prisma.product.findMany({
        take: 10,
        include: { category: true }
      });
      
      twiml.message(
        `❌ No encontré el producto *${productId}*.\n\n` +
        `Productos disponibles:\n` +
        products.map(p => `• ${p.id} - ${p.name}`).join("\n") +
        `\n\nEscribe un ID o *menu* para regresar.`
      );
    }
  } else {
    const availableProducts = await prisma.product.findMany({
      where: { available: true, stock: { gt: 0 } },
      include: { category: true }
    });
    
    let message = `📦 *Disponibilidad de Productos*\n\n`;
    message += `*Productos disponibles:*\n`;
    availableProducts.forEach(p => {
      const stockEmoji = p.stock > 10 ? "✅" : "⚠️";
      message += `${stockEmoji} ${p.id} - ${p.name} (${p.stock} ${p.unit})\n`;
    });
    
    const unavailableCount = await prisma.product.count({
      where: { OR: [{ available: false }, { stock: 0 }] }
    });
    
    if (unavailableCount > 0) {
      message += `\n⚠️ ${unavailableCount} producto(s) actualmente agotado(s)\n\n`;
    }
    
    message += `Escribe el *ID del producto* para más detalles o *menu* para regresar.`;
    
    twiml.message(message);
    session.step = "await_disponibilidad_product";
  }
  
  return { twiml, session };
}

async function handleEntregas(session, body) {
  const twiml = new MessagingResponse();
  
  if (session.step === "await_entregas_zone") {
    const zone = body.toLowerCase();
    const deliveryZone = await prisma.deliveryZone.findFirst({
      where: {
        OR: [
          { zone: { contains: zone, mode: 'insensitive' } },
          { description: { contains: zone, mode: 'insensitive' } }
        ]
      }
    });
    
    if (deliveryZone) {
      const company = await prisma.company.findUnique({ where: { id: 'zafra' } });
      
      let message = `🚚 *Entregas - ${deliveryZone.zone}*\n\n`;
      message += `⏱️ Tiempo estimado: ${deliveryZone.days} día(s)\n`;
      message += `💰 Costo de envío: $${deliveryZone.cost.toFixed(2)}\n`;
      if (deliveryZone.description) {
        message += `📍 ${deliveryZone.description}\n`;
      }
      
      if (company) {
        message += `\n*Nuestra sucursal:*\n`;
        message += `📍 ${company.address}\n`;
        message += `📞 ${company.phone}\n`;
        message += `🕐 ${company.schedule}\n`;
      }
      
      message += `\n💡 *Nota:* Los tiempos pueden variar según el volumen del pedido.\n\n`;
      message += `Escribe *menu* para volver al menú.`;
      
      twiml.message(message);
      session.step = "await_entregas_zone";
    } else {
      const zones = await prisma.deliveryZone.findMany();
      
      twiml.message(
        `❌ No encontré la zona *${body}*.\n\n` +
        `Zonas disponibles:\n` +
        zones.map(z => `• ${z.zone}`).join("\n") +
        `\n\nEscribe una zona o *menu* para regresar.`
      );
    }
  } else {
    const zones = await prisma.deliveryZone.findMany();
    const company = await prisma.company.findUnique({ where: { id: 'zafra' } });
    
    const zonesList = zones
      .map(z => `• ${z.zone}: ${z.days} día(s) - $${z.cost.toFixed(2)}`)
      .join("\n");
    
    twiml.message(
      `🚚 *Información de Entregas*\n\n` +
      `*Zonas de entrega y costos:*\n${zonesList}\n\n` +
      `📍 *Sucursal:*\n${company?.address || "Avenida Central de Abastos, 09040 Ciudad de México"}\n` +
      `📞 ${company?.phone || "55 6805 9501"}\n` +
      `🕐 ${company?.schedule || "Lunes a Viernes: 9:00 am - 6:00 pm"}\n\n` +
      `Escribe el *nombre de la zona* para más detalles o *menu* para regresar.`
    );
    session.step = "await_entregas_zone";
  }
  
  return { twiml, session };
}

async function handleStock() {
  const twiml = new MessagingResponse();
  
  const categories = await prisma.category.findMany({
    include: {
      products: {
        orderBy: { name: 'asc' }
      }
    }
  });
  
  let message = `📊 *Stock Actual de Inventario*\n\n`;
  
  categories.forEach(cat => {
    if (cat.products.length > 0) {
      message += `*${cat.name}:*\n`;
      cat.products.forEach(p => {
        let emoji = "✅";
        if (p.stock === 0) emoji = "❌";
        else if (p.stock <= 10) emoji = "⚠️";
        else if (p.stock <= 25) emoji = "🟡";
        
        message += `${emoji} ${p.name} (${p.id})\n`;
        message += `   Stock: ${p.stock} ${p.unit}\n`;
      });
      message += `\n`;
    }
  });
  
  message += `*Leyenda:*\n✅ Buen stock | 🟡 Stock medio | ⚠️ Stock bajo | ❌ Agotado\n\n`;
  message += `Escribe *menu* para volver al menú.`;
  
  twiml.message(message);
  return twiml;
}

async function handlePreventa(session, body, phone) {
  const twiml = new MessagingResponse();
  
  if (session.step === "await_preventa_reservation") {
    // Verificar si es un comando especial
    const normalizedBody = normalize(body);
    if (normalizedBody === "reservas" || normalizedBody.includes("reserva")) {
      const reservationsTwiml = await handleViewReservations(phone);
      return { twiml: reservationsTwiml, session };
    }
    
    // Formato: ID cantidad (ej: PRE001 2)
    const parts = body.trim().split(/\s+/);
    const presaleId = parts[0]?.toUpperCase();
    const quantity = parseInt(parts[1]) || 1;
    
    if (!presaleId) {
      twiml.message("❌ Por favor escribe el ID del producto en preventa. Ejemplo: *PRE001 2*\n\nO escribe *reservas* para ver tus reservas.");
      return { twiml, session };
    }

    const presaleProduct = await prisma.presaleProduct.findUnique({
      where: { id: presaleId }
    });
    
    if (presaleProduct) {
      // Crear reserva
      const reservation = await prisma.reservation.create({
        data: {
          phone: phone,
          status: 'pending',
          items: {
            create: {
              presaleProductId: presaleId,
              quantity: quantity
            }
          }
        },
        include: {
          items: {
            include: {
              presaleProduct: true
            }
          }
        }
      });

      const total = presaleProduct.deposit * quantity;
      
      const message = (
        `✅ *Reserva creada*\n\n` +
        `🎁 *${presaleProduct.name}*\n` +
        `💵 Precio: $${presaleProduct.price.toFixed(2)}\n` +
        `💰 Anticipo: $${presaleProduct.deposit.toFixed(2)} c/u\n` +
        `📦 Cantidad: ${quantity}\n` +
        `💰 Total anticipo: $${total.toFixed(2)}\n` +
        `📅 Fecha de lanzamiento: ${presaleProduct.releaseDate}\n\n` +
        `📋 ID de reserva: ${reservation.id}\n\n` +
        `💡 *Nota:* Contáctanos para confirmar tu reserva y realizar el pago del anticipo.\n` +
        `📞 ${(await prisma.company.findUnique({ where: { id: 'zafra' } }))?.phone || "55 6805 9501"}\n\n` +
        `Escribe *reservas* para ver tus reservas o *menu* para regresar.`
      );
      twiml.message(message);
      session.step = "menu";
    } else {
      const presales = await prisma.presaleProduct.findMany();
      
      twiml.message(
        `❌ No encontré el producto en preventa *${presaleId}*.\n\n` +
        `Productos en preventa:\n` +
        presales.map(p => `• ${p.id} - ${p.name}`).join("\n") +
        `\n\nEscribe *ID cantidad* o *menu* para regresar.`
      );
    }
  } else {
    const presales = await prisma.presaleProduct.findMany();
    
    if (presales.length === 0) {
      const company = await prisma.company.findUnique({ where: { id: 'zafra' } });
      twiml.message(
        `🎁 *Productos en Preventa*\n\n` +
        `Actualmente no tenemos productos en preventa.\n\n` +
        `💡 *¿Buscas algo específico?* Contáctanos y te ayudamos a encontrarlo.\n` +
        `📞 ${company?.phone || "55 6805 9501"}\n\n` +
        `Escribe *menu* para volver al menú.`
      );
    } else {
      const presaleList = presales
        .map((p, idx) => (
          `${idx + 1}. *${p.name}* (${p.id})\n` +
          `   💵 Precio: $${p.price.toFixed(2)}\n` +
          `   💰 Anticipo: $${p.deposit.toFixed(2)}\n` +
          `   📅 Fecha: ${p.releaseDate}\n` +
          (p.description ? `   ℹ️ ${p.description}\n` : ``)
        ))
        .join("\n\n");
      
      const message = (
        `🎁 *Productos en Preventa*\n\n` +
        `Reserva ahora escribiendo: *ID cantidad*\n` +
        `Ejemplo: *PRE001 2*\n\n` +
        `${presaleList}\n\n` +
        `Escribe *ID cantidad* para reservar o *menu* para regresar.`
      );
      twiml.message(message);
      session.step = "await_preventa_reservation";
    }
  }
  
  return { twiml, session };
}

async function handleViewCart(phone) {
  const twiml = new MessagingResponse();
  
  const cart = await getOrCreateCart(phone);
  
  if (cart.items.length === 0) {
    twiml.message(
      `🛒 *Tu Carrito está vacío*\n\n` +
      `Agrega productos desde la opción *Cotización* del menú.\n\n` +
      `Escribe *menu* para regresar.`
    );
    return twiml;
  }

  let message = `🛒 *Tu Carrito de Cotización*\n\n`;
  let total = 0;
  
  cart.items.forEach(item => {
    const subtotal = item.product.price * item.quantity;
    total += subtotal;
    message += `• ${item.product.name} (${item.product.id})\n`;
    message += `  Cantidad: ${item.quantity} ${item.product.unit}\n`;
    message += `  Precio: $${item.product.price.toFixed(2)} c/u\n`;
    message += `  Subtotal: $${subtotal.toFixed(2)}\n\n`;
  });
  
  message += `💰 *Total: $${total.toFixed(2)}*\n\n`;
  message += `💡 Para finalizar tu cotización, contáctanos:\n`;
  const company = await prisma.company.findUnique({ where: { id: 'zafra' } });
  message += `📞 ${company?.phone || "55 6805 9501"}\n\n`;
  message += `Escribe *menu* para regresar.`;
  
  twiml.message(message);
  return twiml;
}

async function handleViewReservations(phone) {
  const twiml = new MessagingResponse();
  
  const reservations = await prisma.reservation.findMany({
    where: { phone: phone },
    include: {
      items: {
        include: {
          presaleProduct: true,
          product: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  if (reservations.length === 0) {
    twiml.message(
      `📋 *No tienes reservas*\n\n` +
      `Puedes hacer reservas desde la opción *Preventa* del menú.\n\n` +
      `Escribe *menu* para regresar.`
    );
    return twiml;
  }

  let message = `📋 *Tus Reservas*\n\n`;
  
  reservations.forEach((res, idx) => {
    message += `${idx + 1}. *Reserva ${res.id.slice(0, 8)}...*\n`;
    message += `   Estado: ${res.status === 'pending' ? '⏳ Pendiente' : res.status === 'confirmed' ? '✅ Confirmada' : '❌ Cancelada'}\n`;
    
    res.items.forEach(item => {
      if (item.presaleProduct) {
        const total = item.presaleProduct.deposit * item.quantity;
        message += `   🎁 ${item.presaleProduct.name}\n`;
        message += `   Cantidad: ${item.quantity}\n`;
        message += `   Anticipo: $${total.toFixed(2)}\n`;
      }
    });
    message += `\n`;
  });
  
  const company = await prisma.company.findUnique({ where: { id: 'zafra' } });
  message += `💡 Para confirmar tus reservas, contáctanos:\n`;
  message += `📞 ${company?.phone || "55 6805 9501"}\n\n`;
  message += `Escribe *menu* para regresar.`;
  
  twiml.message(message);
  return twiml;
}

// Endpoint principal
app.post("/whatsapp", async (req, res) => {
  const twiml = new MessagingResponse();
  
  try {
    const from = req.body.From;
    const body = normalize(req.body.Body || '');
    const phone = from ? from.replace('whatsapp:', '') : 'unknown';
    
    const session = sessions.get(from) || { step: "menu", data: {} };
    
    // Manejar diferentes tipos de entrada
    const listValue = req.body.ListId && req.body.ListItemId ? req.body.ListItemId : null;
    const buttonValue = req.body.ButtonText ? normalize(req.body.ButtonText) : null;
    const buttonPayload = req.body.ButtonPayload ? normalize(req.body.ButtonPayload) : null;
    const selectedOption = listValue || buttonPayload || buttonValue || body;
    
    // Disparadores para volver al menú
    if (body === "hola" || body === "menu" || body === "ayuda" || 
        selectedOption === "menu" || buttonPayload === "menu") {
      session.step = "menu";
    }
    
    // Mostrar menú principal
    if (session.step === "menu") {
      try {
        await getMenuMessage(twiml);
      } catch (error) {
        console.error('Error obteniendo menú:', error);
        // Si falla, usar menú básico sin BD
        twiml.message(
          `🍞 ¡Hola! Bienvenido a *Zafra*\n\n` +
          `¿En qué puedo ayudarte? Selecciona una opción:\n\n` +
          `1️⃣ 💰 Cotización\n` +
          `2️⃣ 💵 Precios\n` +
          `3️⃣ 📦 Disponibilidad\n` +
          `4️⃣ 🚚 Entregas\n` +
          `5️⃣ 📊 Stock\n` +
          `6️⃣ 🎁 Preventa\n` +
          `7️⃣ 🛒 Ver mi carrito\n` +
          `8️⃣ 📋 Ver mis reservas\n\n` +
          `📞 Contacto: 55 6805 9501`
        );
      }
      session.step = "await_option";
      sessions.set(from, session);
      res.type("text/xml").send(twiml.toString());
      return;
    }
  
  // Procesar selección del menú
  if (session.step === "await_option") {
    let result;
    const option = normalize(selectedOption);
    
    try {
      if (option === "cotizacion" || option === "1" || option.includes("cotiz")) {
        result = await handleCotizacion(session, body, phone);
      } else if (option === "precios" || option === "2" || option.includes("precio")) {
        result = { twiml: await handlePrecios(), session };
      } else if (option === "disponibilidad" || option === "3" || option.includes("dispon")) {
        result = await handleDisponibilidad(session, body);
      } else if (option === "entregas" || option === "4" || option.includes("entrega")) {
        result = await handleEntregas(session, body);
      } else if (option === "stock" || option === "5" || option.includes("stock")) {
        result = { twiml: await handleStock(), session };
      } else if (option === "preventa" || option === "6" || option.includes("preventa")) {
        result = await handlePreventa(session, body, phone);
      } else if (option === "carrito" || option === "7" || option.includes("carrito")) {
        result = { twiml: await handleViewCart(phone), session };
        session.step = "menu";
      } else if (option === "reservas" || option === "8" || option.includes("reserva")) {
        result = { twiml: await handleViewReservations(phone), session };
        session.step = "menu";
      } else {
        twiml.message(
          "❌ No te entendí 😅. Por favor selecciona una opción del menú o escribe *menu*."
        );
        result = { twiml, session };
      }
      
      // Si la opción no requiere más interacción, volver al menú
      if (option === "precios" || option === "stock" || option === "2" || option === "5") {
        session.step = "menu";
      }
      
      sessions.set(from, result.session);
      res.type("text/xml").send(result.twiml.toString());
      return;
    } catch (error) {
      console.error('Error procesando opción:', error);
      twiml.message("❌ Ocurrió un error. Por favor intenta de nuevo o escribe *menu*.");
      sessions.set(from, session);
      res.type("text/xml").send(twiml.toString());
      return;
    }
  }
  
  // Manejar estados específicos de cada funcionalidad
  if (session.step === "await_cotizacion_product") {
    let result;
    if (body === "menu") {
      session.step = "menu";
      await getMenuMessage(twiml);
      result = { twiml, session };
    } else {
      result = await handleCotizacion(session, body, phone);
    }
    sessions.set(from, result.session);
    res.type("text/xml").send(result.twiml.toString());
    return;
  }
  
  if (session.step === "await_disponibilidad_product") {
    let result;
    if (body === "menu") {
      session.step = "menu";
      await getMenuMessage(twiml);
      result = { twiml, session };
    } else {
      result = await handleDisponibilidad(session, body);
    }
    sessions.set(from, result.session);
    res.type("text/xml").send(result.twiml.toString());
    return;
  }
  
  if (session.step === "await_entregas_zone") {
    let result;
    if (body === "menu") {
      session.step = "menu";
      await getMenuMessage(twiml);
      result = { twiml, session };
    } else {
      result = await handleEntregas(session, body);
    }
    sessions.set(from, result.session);
    res.type("text/xml").send(result.twiml.toString());
    return;
  }

  if (session.step === "await_preventa_reservation") {
    let result;
    if (body === "menu") {
      session.step = "menu";
      await getMenuMessage(twiml);
      result = { twiml, session };
    } else {
      result = await handlePreventa(session, body, phone);
    }
    sessions.set(from, result.session);
    res.type("text/xml").send(result.twiml.toString());
    return;
  }
  
    // Fallback
    try {
      const company = await prisma.company.findUnique({ where: { id: 'zafra' } });
      twiml.message(
        `No entendí tu mensaje 😅\n\n` +
        `Escribe *menu* para ver todas las opciones disponibles.\n\n` +
        `O contáctanos directamente:\n` +
        `📞 ${company?.phone || "55 6805 9501"}\n` +
        `🕐 ${company?.schedule || "Lunes a Viernes: 9:00 am - 6:00 pm"}`
      );
    } catch (error) {
      console.error('Error en fallback:', error);
      twiml.message(
        `No entendí tu mensaje 😅\n\n` +
        `Escribe *menu* para ver todas las opciones disponibles.\n\n` +
        `📞 Contacto: 55 6805 9501`
      );
    }
    sessions.set(from, session);
    res.type("text/xml").send(twiml.toString());
  } catch (error) {
    console.error('Error en endpoint /whatsapp:', error);
    // Siempre responder algo para evitar 500
    const errorTwiml = new MessagingResponse();
    errorTwiml.message(
      `⚠️ Ocurrió un error temporal. Por favor intenta de nuevo escribiendo *menu*.\n\n` +
      `Si el problema persiste, contáctanos: 55 6805 9501`
    );
    res.type("text/xml").status(200).send(errorTwiml.toString());
  }
});

app.get("/health", (_, res) => res.json({ ok: true }));

// Endpoint para ejecutar seed manualmente (solo en desarrollo o con autenticación)
// Endpoint GET para ejecutar seed (más fácil desde navegador)
app.get("/seed", async (req, res) => {
  const token = req.query.token;
  const expectedToken = process.env.SEED_TOKEN || 'zafra-seed-2024';
  
  if (process.env.NODE_ENV === 'production' && token !== expectedToken) {
    return res.status(401).send(`
      <html>
        <body style="font-family: Arial; padding: 20px;">
          <h1>401 Unauthorized</h1>
          <p>Proporciona el token: <code>?token=zafra-seed-2024</code></p>
          <p>O configura SEED_TOKEN en Railway y usa ese valor</p>
        </body>
      </html>
    `);
  }
  
  try {
    console.log('🌱 Ejecutando seed manualmente desde GET...');
    
    // Ejecutar seed directamente
    const fs = require('fs');
    const path = require('path');
    const dataPath = path.join(__dirname, 'data', 'products.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Ejecutar seed
    console.log('📋 Creando información de la empresa...');
    await prisma.company.upsert({
      where: { id: 'zafra' },
      update: {
        name: data.company.name,
        description: data.company.description,
        phone: data.company.phone,
        schedule: data.company.schedule,
        address: data.company.address,
      },
      create: {
        id: 'zafra',
        name: data.company.name,
        description: data.company.description,
        phone: data.company.phone,
        schedule: data.company.schedule,
        address: data.company.address,
      },
    });

    console.log('📂 Creando categorías...');
    for (const cat of data.categories) {
      await prisma.category.upsert({
        where: { id: cat.id },
        update: { name: cat.name, description: cat.description },
        create: { id: cat.id, name: cat.name, description: cat.description },
      });
    }

    console.log('📦 Creando productos...');
    for (const product of data.products) {
      await prisma.product.upsert({
        where: { id: product.id },
        update: {
          name: product.name,
          categoryId: product.categoryId,
          price: product.price,
          stock: product.stock,
          available: product.available,
          deliveryDays: product.deliveryDays,
          unit: product.unit,
          minOrder: product.minOrder || 1,
        },
        create: {
          id: product.id,
          name: product.name,
          categoryId: product.categoryId,
          price: product.price,
          stock: product.stock,
          available: product.available,
          deliveryDays: product.deliveryDays,
          unit: product.unit,
          minOrder: product.minOrder || 1,
        },
      });
    }

    console.log('🚚 Creando zonas de entrega...');
    for (const zone of data.deliveryZones) {
      await prisma.deliveryZone.upsert({
        where: { id: zone.zone.replace(/\s+/g, '_').toLowerCase() },
        update: {
          zone: zone.zone,
          days: zone.days,
          cost: zone.cost,
          description: zone.description,
        },
        create: {
          id: zone.zone.replace(/\s+/g, '_').toLowerCase(),
          zone: zone.zone,
          days: zone.days,
          cost: zone.cost,
          description: zone.description,
        },
      });
    }

    console.log('🎁 Creando productos en preventa...');
    for (const presale of data.presaleProducts) {
      await prisma.presaleProduct.upsert({
        where: { id: presale.id },
        update: {
          name: presale.name,
          category: presale.category,
          price: presale.price,
          releaseDate: presale.releaseDate,
          deposit: presale.deposit,
          description: presale.description,
        },
        create: {
          id: presale.id,
          name: presale.name,
          category: presale.category,
          price: presale.price,
          releaseDate: presale.releaseDate,
          deposit: presale.deposit,
          description: presale.description,
        },
      });
    }

    const counts = {
      company: await prisma.company.count(),
      categories: await prisma.category.count(),
      products: await prisma.product.count(),
      zones: await prisma.deliveryZone.count(),
      presales: await prisma.presaleProduct.count(),
    };
    
    console.log('✅ Seed completado exitosamente!');
    console.log('📊 Resumen:', counts);
    
    res.send(`
      <html>
        <body style="font-family: Arial; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #28a745;">✅ Seed ejecutado exitosamente</h1>
            <h2>📊 Datos insertados:</h2>
            <ul style="font-size: 16px; line-height: 1.8;">
              <li><strong>Empresa:</strong> ${counts.company}</li>
              <li><strong>Categorías:</strong> ${counts.categories}</li>
              <li><strong>Productos:</strong> ${counts.products}</li>
              <li><strong>Zonas de entrega:</strong> ${counts.zones}</li>
              <li><strong>Productos en preventa:</strong> ${counts.presales}</li>
            </ul>
            <p style="margin-top: 20px;">
              <a href="/health" style="color: #007bff; text-decoration: none;">🔍 Ver health check</a>
            </p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('❌ Error ejecutando seed:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial; padding: 20px;">
          <h1 style="color: #dc3545;">❌ Error ejecutando seed</h1>
          <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px;">${error.message}</pre>
          ${process.env.NODE_ENV === 'development' ? `<pre style="background: #f8f9fa; padding: 15px; border-radius: 4px; font-size: 12px;">${error.stack}</pre>` : ''}
        </body>
      </html>
    `);
  }
});

// Endpoint POST para ejecutar seed
app.post("/seed", async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.body.token;
  const expectedToken = process.env.SEED_TOKEN || 'zafra-seed-2024';
  
  if (process.env.NODE_ENV === 'production' && token !== expectedToken) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Proporciona token en Authorization: Bearer TOKEN o body.token' 
    });
  }
  
  // Redirigir a GET para ejecutar el seed
  return res.redirect(`/seed?token=${token || expectedToken}`);
});

// Endpoint GET para ejecutar seed (más fácil desde navegador)
app.get("/seed", async (req, res) => {
  const token = req.query.token;
  const expectedToken = process.env.SEED_TOKEN || 'zafra-seed-2024';
  
  if (process.env.NODE_ENV === 'production' && token !== expectedToken) {
    return res.status(401).send(`
      <html>
        <body>
          <h1>401 Unauthorized</h1>
          <p>Proporciona el token: ?token=TU_TOKEN</p>
          <p>O usa POST /seed con Authorization header</p>
        </body>
      </html>
    `);
  }
  
  try {
    console.log('🌱 Ejecutando seed manualmente desde GET...');
    // Ejecutar seed directamente
    const { PrismaClient } = require('@prisma/client');
    const seedPrisma = new PrismaClient();
    const fs = require('fs');
    const path = require('path');
    
    const dataPath = path.join(__dirname, 'data', 'products.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Ejecutar seed
    await seedPrisma.company.upsert({
      where: { id: 'zafra' },
      update: {
        name: data.company.name,
        description: data.company.description,
        phone: data.company.phone,
        schedule: data.company.schedule,
        address: data.company.address,
      },
      create: {
        id: 'zafra',
        name: data.company.name,
        description: data.company.description,
        phone: data.company.phone,
        schedule: data.company.schedule,
        address: data.company.address,
      },
    });

    for (const cat of data.categories) {
      await seedPrisma.category.upsert({
        where: { id: cat.id },
        update: { name: cat.name, description: cat.description },
        create: { id: cat.id, name: cat.name, description: cat.description },
      });
    }

    for (const product of data.products) {
      await seedPrisma.product.upsert({
        where: { id: product.id },
        update: {
          name: product.name,
          categoryId: product.categoryId,
          price: product.price,
          stock: product.stock,
          available: product.available,
          deliveryDays: product.deliveryDays,
          unit: product.unit,
          minOrder: product.minOrder || 1,
        },
        create: {
          id: product.id,
          name: product.name,
          categoryId: product.categoryId,
          price: product.price,
          stock: product.stock,
          available: product.available,
          deliveryDays: product.deliveryDays,
          unit: product.unit,
          minOrder: product.minOrder || 1,
        },
      });
    }

    for (const zone of data.deliveryZones) {
      await seedPrisma.deliveryZone.upsert({
        where: { id: zone.zone.replace(/\s+/g, '_').toLowerCase() },
        update: {
          zone: zone.zone,
          days: zone.days,
          cost: zone.cost,
          description: zone.description,
        },
        create: {
          id: zone.zone.replace(/\s+/g, '_').toLowerCase(),
          zone: zone.zone,
          days: zone.days,
          cost: zone.cost,
          description: zone.description,
        },
      });
    }

    for (const presale of data.presaleProducts) {
      await seedPrisma.presaleProduct.upsert({
        where: { id: presale.id },
        update: {
          name: presale.name,
          category: presale.category,
          price: presale.price,
          releaseDate: presale.releaseDate,
          deposit: presale.deposit,
          description: presale.description,
        },
        create: {
          id: presale.id,
          name: presale.name,
          category: presale.category,
          price: presale.price,
          releaseDate: presale.releaseDate,
          deposit: presale.deposit,
          description: presale.description,
        },
      });
    }

    await seedPrisma.$disconnect();
    
    const counts = {
      company: await prisma.company.count(),
      categories: await prisma.category.count(),
      products: await prisma.product.count(),
      zones: await prisma.deliveryZone.count(),
      presales: await prisma.presaleProduct.count(),
    };
    
    res.send(`
      <html>
        <body style="font-family: Arial; padding: 20px;">
          <h1>✅ Seed ejecutado exitosamente</h1>
          <h2>Datos insertados:</h2>
          <ul>
            <li>Empresa: ${counts.company}</li>
            <li>Categorías: ${counts.categories}</li>
            <li>Productos: ${counts.products}</li>
            <li>Zonas de entrega: ${counts.zones}</li>
            <li>Productos en preventa: ${counts.presales}</li>
          </ul>
          <p><a href="/health">Ver health check</a></p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error ejecutando seed:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial; padding: 20px;">
          <h1>❌ Error ejecutando seed</h1>
          <pre>${error.message}</pre>
          ${process.env.NODE_ENV === 'development' ? `<pre>${error.stack}</pre>` : ''}
        </body>
      </html>
    `);
  }
});

const PORT = process.env.PORT || 3000;

// Función para verificar conexión a la base de datos
async function checkDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Conectado a la base de datos');
    
    // Verificar que las tablas existan
    const company = await prisma.company.findUnique({ where: { id: 'zafra' } }).catch(() => null);
    const productCount = await prisma.product.count().catch(() => 0);
    const categoryCount = await prisma.category.count().catch(() => 0);
    const zoneCount = await prisma.deliveryZone.count().catch(() => 0);
    
    console.log(`🍞 ${company?.name || "Zafra"} - Bot de WhatsApp`);
    console.log(`📦 Productos: ${productCount}`);
    console.log(`📋 Categorías: ${categoryCount}`);
    console.log(`🚚 Zonas de entrega: ${zoneCount}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error.message);
    console.error('💡 Asegúrate de que las migraciones se hayan ejecutado correctamente');
    return false;
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
  await checkDatabase();
});
