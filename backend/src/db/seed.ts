import { supabase } from './supabase.js';
import { colleges, problems, seasons, users } from './seedData.js';

async function upsertTable(table: string, rows: Record<string, unknown>[], conflict: string) {
  const { error } = await supabase.from(table).upsert(rows, {
    onConflict: conflict,
    ignoreDuplicates: false
  });

  if (error) {
    throw new Error(`Failed seeding ${table}: ${error.message}`);
  }
}

async function seed() {
  await upsertTable('colleges', colleges, 'id');
  await upsertTable('users', users, 'id');
  await upsertTable('problems', problems, 'id');
  await upsertTable('seasons', seasons, 'id');

  console.log(`Seed complete: ${colleges.length} colleges, ${users.length} users, ${problems.length} problems, ${seasons.length} seasons.`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
