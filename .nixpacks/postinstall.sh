#!/bin/bash
set -e
echo "🧹 Limpiando directorio de Prisma Client..."
rm -rf node_modules/.prisma/client || true
rm -rf node_modules/.prisma || true
echo "✅ Directorio limpiado"
echo "🔨 Generando Prisma Client..."
npx prisma generate
echo "✅ Prisma Client generado"
