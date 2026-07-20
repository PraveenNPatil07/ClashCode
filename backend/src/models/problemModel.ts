import type { Problem } from '@clashcode/shared';

import { supabase } from '../db/supabase.js';

export async function createProblemRecord(problem: Omit<Problem, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('problems')
    .insert(problem)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Unable to create problem: ${error.message}`);
  }

  return data as Problem;
}
