import { Worker } from 'bullmq';
import { query } from './db/pool.js';
import { redis } from './services/reorderQueue.js';
import { config } from './config.js';

const worker = new Worker('inventory-reorders', async (job) => {
  const result = await query('SELECT id,reorder_quantity,unit_price FROM products WHERE id=$1', [job.data.productId]);
  if (!result.rowCount) return;
  const existing = await query("SELECT id FROM reorder_requests WHERE product_id=$1 AND status IN ('pending','approved') LIMIT 1", [job.data.productId]);
  if (!existing.rowCount) {
    const quantity = result.rows[0].reorder_quantity;
    const status = Number(result.rows[0].unit_price) * quantity > config.highValueReorderLimit ? 'pending_approval' : 'pending';
    await query('INSERT INTO reorder_requests(product_id,quantity,status) VALUES($1,$2,$3)', [job.data.productId, quantity, status]);
  }
}, { connection: redis });
worker.on('completed', (job) => console.log(`Reorder job ${job.id} completed`));
worker.on('failed', (job,error) => console.error(`Reorder job ${job?.id} failed`,error));
console.log('Inventory reorder worker started');
