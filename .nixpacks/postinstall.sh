#!/bin/bash
set -e
rm -rf node_modules/.prisma/client || true
npx prisma generate
