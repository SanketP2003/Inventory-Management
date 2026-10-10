import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const sampleProducts = [
  {
    name: 'MacBook Pro 16-inch M3 Max',
    sku: 'LAPTOP-MBP-16',
    quantity: 3, // Near threshold (threshold = 5)
    lowStockThreshold: 5,
    costPrice: new Prisma.Decimal(3499.00),
    supplierName: 'Apple Global Distribution',
    reorderQuantity: 10, // Total Value = $34,990 (Requires OTP approval)
  },
  {
    name: 'Dell UltraSharp 32-inch 4K Monitor',
    sku: 'MON-DELL-U3223',
    quantity: 4, // Near threshold (threshold = 8)
    lowStockThreshold: 8,
    costPrice: new Prisma.Decimal(799.50),
    supplierName: 'Dell Commercial Solutions',
    reorderQuantity: 15, // Total Value = $11,992.50 (Requires OTP approval)
  },
  {
    name: 'Logitech MX Master 3S Wireless Mouse',
    sku: 'ACC-LOGI-MX3S',
    quantity: 25, // Well stocked (threshold = 10)
    lowStockThreshold: 10,
    costPrice: new Prisma.Decimal(79.99),
    supplierName: 'Logitech Logistics',
    reorderQuantity: 30, // Total Value = $2,399.70 (Auto Queued)
  },
  {
    name: 'Keychron Q1 Pro Wireless Mechanical Keyboard',
    sku: 'ACC-KEY-Q1PRO',
    quantity: 7, // Near threshold (threshold = 12)
    lowStockThreshold: 12,
    costPrice: new Prisma.Decimal(189.00),
    supplierName: 'Keychron Direct',
    reorderQuantity: 20, // Total Value = $3,780.00 (Auto Queued)
  },
  {
    name: 'Sony WH-1000XM5 Wireless Headphones',
    sku: 'AUD-SONY-XM5',
    quantity: 18, // Healthy (threshold = 15)
    lowStockThreshold: 15,
    costPrice: new Prisma.Decimal(349.99),
    supplierName: 'Sony Electronics Corp',
    reorderQuantity: 25, // Total Value = $8,749.75 (Requires OTP approval)
  },
  {
    name: 'Herman Miller Aeron Ergonomic Chair',
    sku: 'FURN-HM-AERON',
    quantity: 2, // Near threshold (threshold = 5)
    lowStockThreshold: 5,
    costPrice: new Prisma.Decimal(1250.00),
    supplierName: 'Herman Miller Commercial',
    reorderQuantity: 5, // Total Value = $6,250.00 (Requires OTP approval)
  },
  {
    name: 'CalDigit TS4 Thunderbolt 4 Dock',
    sku: 'ACC-CAL-TS4',
    quantity: 12, // Near threshold (threshold = 10)
    lowStockThreshold: 10,
    costPrice: new Prisma.Decimal(359.95),
    supplierName: 'CalDigit Supply',
    reorderQuantity: 10, // Total Value = $3,599.50 (Auto Queued)
  },
  {
    name: 'Samsung 990 Pro 2TB NVMe PCIe 4.0 SSD',
    sku: 'STO-SAM-990P-2TB',
    quantity: 45, // Healthy (threshold = 20)
    lowStockThreshold: 20,
    costPrice: new Prisma.Decimal(169.99),
    supplierName: 'Samsung Semiconductor',
    reorderQuantity: 50, // Total Value = $8,499.50 (Requires OTP approval)
  },
  {
    name: 'Anker 737 Power Bank (PowerCore 24K)',
    sku: 'PWR-ANK-737',
    quantity: 6, // Near threshold (threshold = 10)
    lowStockThreshold: 10,
    costPrice: new Prisma.Decimal(119.99),
    supplierName: 'Anker Innovations',
    reorderQuantity: 25, // Total Value = $2,999.75 (Auto Queued)
  },
  {
    name: 'Ubiquiti UniFi Dream Machine Special Edition',
    sku: 'NET-UBI-UDMSE',
    quantity: 1, // Near threshold (threshold = 4)
    lowStockThreshold: 4,
    costPrice: new Prisma.Decimal(499.00),
    supplierName: 'Ubiquiti Global',
    reorderQuantity: 8, // Total Value = $3,992.00 (Auto Queued)
  },
];

async function main() {
  console.log('Seeding initial inventory products...');

  for (const productData of sampleProducts) {
    const existing = await prisma.product.findUnique({
      where: { sku: productData.sku },
    });

    if (existing) {
      await prisma.product.update({
        where: { sku: productData.sku },
        data: productData,
      });
      console.log(`Updated existing product: ${productData.sku}`);
    } else {
      await prisma.product.create({
        data: productData,
      });
      console.log(`Created product: ${productData.name} (${productData.sku})`);
    }
  }

  console.log('Successfully seeded 10 inventory products.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
