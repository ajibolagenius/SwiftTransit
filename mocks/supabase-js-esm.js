// Entry for `import ... from 'https://esm.sh/@supabase/supabase-js@2'` under
// jest (see package.json moduleNameMapper). That specifier is a URL the Supabase
// edge runtime resolves and Node does not, so the geo function tests load this
// stand in instead. `state.session` is what the fake `getUser` answers with, and
// the test sets it per case.
const state = {
  session: { data: { user: { id: 'customer-1' } }, error: null },
};

module.exports = {
  state,
  createClient: () => ({
    auth: { getUser: () => Promise.resolve(state.session) },
  }),
};
