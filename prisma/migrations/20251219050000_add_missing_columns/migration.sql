-- Migración para agregar columnas createdAt y updatedAt si no existen
-- Esta migración es idempotente y se puede ejecutar múltiples veces

-- Función helper para agregar columna si no existe
DO $$
BEGIN
    -- Company table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Company' AND column_name='createdAt') THEN
        ALTER TABLE "Company" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Company' AND column_name='updatedAt') THEN
        ALTER TABLE "Company" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Category table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Category' AND column_name='createdAt') THEN
        ALTER TABLE "Category" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Category' AND column_name='updatedAt') THEN
        ALTER TABLE "Category" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Product table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Product' AND column_name='createdAt') THEN
        ALTER TABLE "Product" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Product' AND column_name='updatedAt') THEN
        ALTER TABLE "Product" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- DeliveryZone table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='DeliveryZone' AND column_name='createdAt') THEN
        ALTER TABLE "DeliveryZone" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='DeliveryZone' AND column_name='updatedAt') THEN
        ALTER TABLE "DeliveryZone" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- PresaleProduct table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='PresaleProduct' AND column_name='createdAt') THEN
        ALTER TABLE "PresaleProduct" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='PresaleProduct' AND column_name='updatedAt') THEN
        ALTER TABLE "PresaleProduct" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Cart table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Cart' AND column_name='createdAt') THEN
        ALTER TABLE "Cart" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Cart' AND column_name='updatedAt') THEN
        ALTER TABLE "Cart" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- CartItem table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='CartItem' AND column_name='createdAt') THEN
        ALTER TABLE "CartItem" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='CartItem' AND column_name='updatedAt') THEN
        ALTER TABLE "CartItem" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Reservation table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Reservation' AND column_name='createdAt') THEN
        ALTER TABLE "Reservation" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Reservation' AND column_name='updatedAt') THEN
        ALTER TABLE "Reservation" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- ReservationItem table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ReservationItem' AND column_name='createdAt') THEN
        ALTER TABLE "ReservationItem" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ReservationItem' AND column_name='updatedAt') THEN
        ALTER TABLE "ReservationItem" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Crear función para triggers de updatedAt si no existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear triggers si no existen (usando IF NOT EXISTS equivalente)
DO $$
BEGIN
    -- Company
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_company_updated_at') THEN
        CREATE TRIGGER update_company_updated_at BEFORE UPDATE ON "Company" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Category
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_category_updated_at') THEN
        CREATE TRIGGER update_category_updated_at BEFORE UPDATE ON "Category" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Product
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_product_updated_at') THEN
        CREATE TRIGGER update_product_updated_at BEFORE UPDATE ON "Product" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- DeliveryZone
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_deliveryzone_updated_at') THEN
        CREATE TRIGGER update_deliveryzone_updated_at BEFORE UPDATE ON "DeliveryZone" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- PresaleProduct
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_presaleproduct_updated_at') THEN
        CREATE TRIGGER update_presaleproduct_updated_at BEFORE UPDATE ON "PresaleProduct" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Cart
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_cart_updated_at') THEN
        CREATE TRIGGER update_cart_updated_at BEFORE UPDATE ON "Cart" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- CartItem
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_cartitem_updated_at') THEN
        CREATE TRIGGER update_cartitem_updated_at BEFORE UPDATE ON "CartItem" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Reservation
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_reservation_updated_at') THEN
        CREATE TRIGGER update_reservation_updated_at BEFORE UPDATE ON "Reservation" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- ReservationItem
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_reservationitem_updated_at') THEN
        CREATE TRIGGER update_reservationitem_updated_at BEFORE UPDATE ON "ReservationItem" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

