require('dotenv').config();
// Usar Prisma Client directamente
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');


async function main() {
  console.log('🌱 Iniciando migración de datos...');

  // Leer datos del JSON
  const dataPath = path.join(__dirname, '..', 'data', 'products.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // Crear/Actualizar información de la empresa
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

  // Crear categorías
  console.log('📂 Creando categorías...');
  for (const cat of data.categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {
        name: cat.name,
        description: cat.description,
      },
      create: {
        id: cat.id,
        name: cat.name,
        description: cat.description,
      },
    });
  }

  // Crear productos
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

  // Crear zonas de entrega
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

  // Crear productos en preventa
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

  console.log('✅ Migración completada exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error en la migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

