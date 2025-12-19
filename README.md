# WhatsApp Bot - Zafra con Prisma + SQLite

Bot de WhatsApp desarrollado con Node.js, Express, Twilio y Prisma para **Distribuidora Azucarera Zafra**, con sistema de carritos de cotización y reservas de preventa.

## 🍞 Sobre Zafra

Con más de 30 años de experiencia, Zafra suministra insumos premium para panaderías y restaurantes.

## 🚀 Funcionalidades del Bot

1. **Cotización con Carrito** - Agrega productos a un carrito para cotizar
2. **Precios** - Lista de precios organizada por categorías
3. **Disponibilidad** - Consulta disponibilidad y niveles de stock
4. **Entregas** - Información sobre zonas de entrega, tiempos y costos
5. **Stock** - Estado actual del inventario agrupado por categorías
6. **Preventa con Reservas** - Reserva productos en preventa
7. **Ver Carrito** - Consulta tu carrito de cotización
8. **Ver Reservas** - Consulta tus reservas de preventa

## 🛠️ Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Generar Prisma Client:
```bash
npm run prisma:generate
```

3. Ejecutar migraciones:
```bash
npm run prisma:migrate
```

4. Poblar la base de datos:
```bash
npm run seed
```

5. Iniciar el servidor:
```bash
npm start
```

## 📁 Estructura del Proyecto

```
wa-bot/
├── prisma/
│   ├── schema.prisma      # Schema de la base de datos
│   └── migrations/        # Migraciones de Prisma
├── data/
│   └── products.json      # Datos iniciales
├── scripts/
│   └── seed.js            # Script para poblar la BD
├── lib/
│   └── prisma.js          # Cliente de Prisma
├── index.js               # Código principal del bot
└── package.json
```

## 🗄️ Base de Datos

El proyecto usa **Prisma + SQLite** con los siguientes modelos:

- **Company** - Información de la empresa
- **Category** - Categorías de productos
- **Product** - Productos con stock real
- **DeliveryZone** - Zonas de entrega
- **PresaleProduct** - Productos en preventa
- **Cart** - Carritos de cotización
- **CartItem** - Items del carrito
- **Reservation** - Reservas de preventa
- **ReservationItem** - Items de reserva

## 🎯 Uso del Bot

### Cotización con Carrito
1. Selecciona opción `1` (Cotización)
2. Escribe `ID cantidad` (ej: `ZAF001 5`)
3. Los productos se agregan al carrito
4. Escribe `carrito` o `7` para ver tu carrito

### Reservas de Preventa
1. Selecciona opción `6` (Preventa)
2. Escribe `ID cantidad` (ej: `PRE001 2`)
3. Se crea una reserva automáticamente
4. Escribe `reservas` o `8` para ver tus reservas

### Comandos
- `hola`, `menu`, `ayuda` - Mostrar menú
- `carrito` o `7` - Ver carrito
- `reservas` o `8` - Ver reservas
- Números 1-8 - Seleccionar opción del menú

## 📝 Notas Técnicas

- **Stock Real**: El stock se descuenta cuando se agregan productos al carrito o se hacen reservas
- **Persistencia**: Todos los datos se guardan en SQLite usando Prisma
- **Sesiones**: Las sesiones de conversación se mantienen en memoria
- **Carritos**: Cada usuario tiene su propio carrito activo
- **Reservas**: Las reservas se crean con estado "pending" y requieren confirmación

## 🔧 Scripts Disponibles

- `npm start` - Iniciar servidor
- `npm run seed` - Poblar base de datos
- `npm run prisma:generate` - Generar Prisma Client
- `npm run prisma:migrate` - Ejecutar migraciones
- `npm run prisma:studio` - Abrir Prisma Studio (GUI para la BD)

## ⚠️ Nota sobre Prisma Client

Si encuentras errores al cargar Prisma Client, ejecuta:
```bash
npx prisma generate
```

El cliente se genera en `node_modules/.prisma/client`. Si hay problemas, verifica que el archivo `default.js` apunte correctamente al cliente generado.
