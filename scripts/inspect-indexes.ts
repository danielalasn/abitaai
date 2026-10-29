import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('--- TABLAS Y CONTEO ESTIMADO DE FILAS ---');
  const tableCounts = await prisma.$queryRaw<any[]>`
    SELECT relname as table_name, n_live_tup as live_rows
    FROM pg_stat_user_tables
    ORDER BY n_live_tup DESC;
  `;
  console.table(tableCounts);

  console.log('\n--- ÍNDICES EXISTENTES EN PUBLIC ---');
  const existingIndexes = await prisma.$queryRaw<any[]>`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `;
  console.table(existingIndexes);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
