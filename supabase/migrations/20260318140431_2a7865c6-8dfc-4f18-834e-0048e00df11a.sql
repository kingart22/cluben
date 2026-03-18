DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Authorized roles can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'security')
  OR public.has_role(auth.uid(), 'cashier')
);