// Script para crear default.js después de generar Prisma Client
const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, '..', 'node_modules', '.prisma', 'client');
const defaultJsPath = path.join(clientDir, 'default.js');
const clientTsPath = path.join(clientDir, 'client.ts');

if (fs.existsSync(clientTsPath) && !fs.existsSync(defaultJsPath)) {
  fs.writeFileSync(defaultJsPath, 'module.exports = require("./client.ts");\n');
  console.log('✅ default.js creado');
} else if (fs.existsSync(defaultJsPath)) {
  console.log('✅ default.js ya existe');
} else {
  console.log('⚠️  Prisma Client no generado aún');
}

