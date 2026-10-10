const unwrapResult = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export const findAssistantSettings = async client => {
  const result = await client
    .from('assistant_settings')
    .select('id, active_model, updated_at, updated_by')
    .eq('id', 1)
    .maybeSingle();

  return unwrapResult(result);
};

export const updateActiveModel = async (client, model, adminId) => {
  const result = await client
    .from('assistant_settings')
    .update({
      active_model: model,
      updated_at: new Date().toISOString(),
      updated_by: adminId
    })
    .eq('id', 1)
    .select('id, active_model, updated_at, updated_by')
    .single();

  return unwrapResult(result);
};
