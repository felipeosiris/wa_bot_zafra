#!/bin/bash
set -e

echo "🔄 Ejecutando migraciones..."
npx prisma migrate deploy

echo "⏳ Esperando 3 segundos para asegurar que las migraciones terminen..."
sleep 3

echo "🌱 Ejecutando seed..."
npm run seed || echo "⚠️ Seed falló, pero continuando..."

echo "✅ Post-migración completada"

