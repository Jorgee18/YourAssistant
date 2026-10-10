export const findAdministrator = async (client, userId) => {
  const { data, error } = await client
    .from('administrators')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};
