import type { College } from '@clashcode/shared';

import { supabase } from '../db/supabase.js';

const TABLE = 'colleges';

export async function listColleges(): Promise<College[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('total_points', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Unable to fetch colleges: ${error.message}`);
  }

  return data satisfies College[];
}
