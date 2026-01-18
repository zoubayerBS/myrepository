-- =====================================================
-- CONFIGURATION GLOBALE SUPABASE : Sécurité et Relations
-- =====================================================

-- -----------------------------------------------------
-- 1. NETTOYAGE DES RELATIONS (Fix Erreur PGRST201)
-- -----------------------------------------------------
-- Supprime les doublons de clés étrangères créés par erreur
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE public.vacations DROP CONSTRAINT IF EXISTS "vacations_userId_fkey";
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.vacations DROP CONSTRAINT IF EXISTS vacations_userid_fkey;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
END $$;

-- Recréation d'une relation unique et propre avec CASCADE
ALTER TABLE public.vacations DROP CONSTRAINT IF EXISTS vacations_user_relation_fkey;
ALTER TABLE public.vacations 
ADD CONSTRAINT vacations_user_relation_fkey 
FOREIGN KEY ("userId") 
REFERENCES public.users(uid) 
ON UPDATE CASCADE 
ON DELETE CASCADE;

-- -----------------------------------------------------
-- 2. LOGIQUE ADMINISTRATIVE (Fix Récursion 42P17)
-- -----------------------------------------------------
-- Fonction de vérification admin sans récursion
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
    is_adm boolean;
BEGIN
    SELECT (role = 'admin') INTO is_adm
    FROM public.users
    WHERE uid = (SELECT auth.uid())::text;
    RETURN COALESCE(is_adm, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- -----------------------------------------------------
-- 3. POLITIQUES DE SÉCURITÉ (RLS)
-- -----------------------------------------------------

-- Configuration de la table 'users'
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated" ON users;
DROP POLICY IF EXISTS "users_read_all" ON users;
DROP POLICY IF EXISTS "users_update_own_or_admin" ON users;

CREATE POLICY "users_read_all" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_update_own_or_admin" ON users FOR UPDATE TO authenticated 
USING (uid = (SELECT auth.uid())::text OR public.is_admin());

-- Configuration de la table 'vacations'
ALTER TABLE public.vacations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vacations_all_access" ON vacations;

CREATE POLICY "vacations_all_access" ON vacations FOR ALL TO authenticated 
USING ("userId" = (SELECT auth.uid())::text OR public.is_admin())
WITH CHECK ("userId" = (SELECT auth.uid())::text OR public.is_admin());

-- Configuration de la table 'vacation_amounts_full'
ALTER TABLE public.vacation_amounts_full ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "amounts_read_all" ON vacation_amounts_full;
DROP POLICY IF EXISTS "amounts_admin_all" ON vacation_amounts_full;

CREATE POLICY "amounts_read_all" ON vacation_amounts_full FOR SELECT TO authenticated USING (true);
CREATE POLICY "amounts_admin_all" ON vacation_amounts_full FOR ALL TO authenticated USING (public.is_admin());

-- Configuration de la table 'surgeons'
ALTER TABLE public.surgeons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "surgeons_read" ON surgeons;
DROP POLICY IF EXISTS "surgeons_insert" ON surgeons;
DROP POLICY IF EXISTS "surgeons_admin_manage" ON surgeons;

CREATE POLICY "surgeons_read" ON surgeons FOR SELECT TO authenticated USING (true);
CREATE POLICY "surgeons_insert" ON surgeons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "surgeons_admin_manage" ON surgeons FOR ALL TO authenticated USING (public.is_admin());

-- Configuration de la table 'notifications'
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_all_access" ON notifications;

CREATE POLICY "notifications_all_access" ON notifications FOR ALL TO authenticated 
USING ("userId" = (SELECT auth.uid())::text OR public.is_admin());

-- Configuration de la table 'messages'
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_all_access" ON messages;

CREATE POLICY "messages_all_access" ON messages FOR ALL TO authenticated 
USING (
  "senderId" = (SELECT auth.uid())::text 
  OR 
  "receiverId" = (SELECT auth.uid())::text 
  OR 
  public.is_admin()
);
