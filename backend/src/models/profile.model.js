const unwrapResult = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export const findProfileById = async (client, userId) => {
  const result = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  return unwrapResult(result);
};

export const updateProfileById = async (client, userId, profile) => {
  const result = await client
    .from('profiles')
    .update({
      full_name: profile.fullName,
      phone: profile.phone,
      avatar_url: profile.avatarUrl,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .maybeSingle();

  return unwrapResult(result);
};
