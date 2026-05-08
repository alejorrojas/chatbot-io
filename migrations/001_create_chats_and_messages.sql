-- Migration: create_chats_and_messages
-- Data model for Simplex chat persistence.
-- Messages stored in UIMessage format (Vercel AI SDK).

-- chats: conversation metadata, one row per session
CREATE TABLE IF NOT EXISTS chats (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL DEFAULT 'Nueva conversación',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- messages: individual turns in UIMessage format
-- id is server-generated (format: msg_<16 chars>) to survive reconnects
-- parts stores the full UIMessage parts array as JSONB
-- "order" preserves insertion sequence within a chat
CREATE TABLE IF NOT EXISTS messages (
  id          TEXT        PRIMARY KEY,
  chat_id     UUID        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  parts       JSONB       NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "order"     INTEGER     NOT NULL DEFAULT 0
);

-- Indexes for common access patterns
CREATE INDEX IF NOT EXISTS chats_user_id_updated_idx ON chats (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS messages_chat_order_idx   ON messages (chat_id, "order" ASC);

-- Keep updated_at current whenever a chat row is modified
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chats_updated_at ON chats;
CREATE TRIGGER chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security: users can only touch their own data
ALTER TABLE chats    ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- chats policies
CREATE POLICY "chats: select own"
  ON chats FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "chats: insert own"
  ON chats FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chats: update own"
  ON chats FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chats: delete own"
  ON chats FOR DELETE USING (auth.uid() = user_id);

-- messages policies: access is granted via chat ownership
CREATE POLICY "messages: select via chat"
  ON messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid()
  ));

CREATE POLICY "messages: insert via chat"
  ON messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid()
  ));

CREATE POLICY "messages: update via chat"
  ON messages FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid()
  ));

CREATE POLICY "messages: delete via chat"
  ON messages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid()
  ));
