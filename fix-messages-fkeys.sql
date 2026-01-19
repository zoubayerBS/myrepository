-- =====================================================
-- FIX MESSAGES RELATIONSHIPS (Error PGRST201)
-- =====================================================

-- 1. Drop ambiguous constraints
DO $$ 
BEGIN 
    -- Drop duplicate sender keys
    BEGIN
        ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS "messages_senderId_fkey";
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
        ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_senderid_fkey;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Drop duplicate receiver keys
    BEGIN
        ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS "messages_receiverId_fkey";
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
        ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_receiverid_fkey;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
END $$;

-- 2. Recreate clean constraints with explicit names
ALTER TABLE public.messages 
ADD CONSTRAINT messages_sender_fkey 
FOREIGN KEY ("senderId") 
REFERENCES public.users(uid) 
ON UPDATE CASCADE 
ON DELETE CASCADE;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_receiver_fkey 
FOREIGN KEY ("receiverId") 
REFERENCES public.users(uid) 
ON UPDATE CASCADE 
ON DELETE CASCADE;
