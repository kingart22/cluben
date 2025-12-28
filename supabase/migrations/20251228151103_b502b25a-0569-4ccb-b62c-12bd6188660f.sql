-- Permitir que o próprio sócio atualize o seu registo em members
create policy "Members can update their own member row"
on public.members
for update
using (
  exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and (u.raw_user_meta_data->>'member_id')::uuid = members.id
  )
);
