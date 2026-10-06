-- Additive receipt ledger. A sent/uncertain create is never automatically reissued.
CREATE TABLE arcade.chainshift_daily_messages (
 channel_id varchar(20) NOT NULL CHECK (channel_id='1549149791915737129'),
 day_key date NOT NULL,
 puzzle_id varchar(100) NOT NULL REFERENCES arcade.chainshift_puzzles ON DELETE RESTRICT,
 discord_guild_id varchar(20) NOT NULL CHECK (discord_guild_id ~ '^[1-9][0-9]{16,19}$'),
 operation_key char(64) NOT NULL UNIQUE CHECK (operation_key ~ '^[a-f0-9]{64}$'),
 nonce varchar(25) NOT NULL UNIQUE CHECK (nonce ~ '^[a-f0-9]{24}$'),
 state varchar(16) NOT NULL DEFAULT 'prepared' CHECK (state IN ('prepared','uncertain','posted','blocked')),
 message_id varchar(20) UNIQUE CHECK (message_id ~ '^[1-9][0-9]{16,19}$'),
 digest char(64) CHECK (digest ~ '^[a-f0-9]{64}$'),
 revision integer NOT NULL DEFAULT 0 CHECK (revision>=0),
 update_key varchar(140) CHECK (update_key ~ '^[a-f0-9]{64}:[0-9]{1,10}:[a-f0-9]{64}$'),
 last_error varchar(32) CHECK (last_error IN ('rate_limited','transient','uncertain','malformed','missing','forbidden','invalid_channel','invalid_configuration')),
 failures integer NOT NULL DEFAULT 0 CHECK (failures>=0),
 next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 create_attempted_at timestamptz,
 reconciled_at timestamptz,
 checked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(channel_id,day_key),
 UNIQUE(channel_id,puzzle_id),
 CHECK ((state IN ('prepared','uncertain') AND message_id IS NULL) OR state='blocked' OR (state='posted' AND message_id IS NOT NULL)),
 CHECK ((revision=0 AND digest IS NULL AND reconciled_at IS NULL) OR (revision>0 AND digest IS NOT NULL AND message_id IS NOT NULL AND reconciled_at IS NOT NULL))
);
CREATE FUNCTION arcade.chainshift_guard_delivery() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE puzzle_day date;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'immutable delivery identity' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' THEN
  SELECT day_key INTO STRICT puzzle_day FROM arcade.chainshift_puzzles WHERE puzzle_id=NEW.puzzle_id;
  IF NEW.day_key<>puzzle_day OR NEW.state<>'prepared' OR NEW.message_id IS NOT NULL OR NEW.revision<>0 OR NEW.create_attempted_at IS NOT NULL THEN
   RAISE EXCEPTION 'invalid initial receipt' USING ERRCODE='23514';
  END IF;
  NEW.created_at:=clock_timestamp();
 ELSE
  IF (NEW.channel_id,NEW.day_key,NEW.puzzle_id,NEW.discord_guild_id,NEW.operation_key,NEW.nonce,NEW.created_at)
    IS DISTINCT FROM (OLD.channel_id,OLD.day_key,OLD.puzzle_id,OLD.discord_guild_id,OLD.operation_key,OLD.nonce,OLD.created_at)
    OR (OLD.message_id IS NOT NULL AND NEW.message_id IS DISTINCT FROM OLD.message_id)
    OR OLD.state='blocked' OR NEW.revision NOT IN (OLD.revision,OLD.revision+1)
    OR (OLD.create_attempted_at IS NOT NULL AND NEW.create_attempted_at IS DISTINCT FROM OLD.create_attempted_at)
    OR (OLD.state='posted' AND NEW.state NOT IN ('posted','blocked'))
    OR (NEW.state='uncertain' AND NEW.create_attempted_at IS NULL)
    OR (NEW.state='prepared' AND OLD.state<>'prepared' AND NOT (OLD.state='uncertain' AND NEW.last_error='rate_limited')) THEN
   RAISE EXCEPTION 'guarded delivery transition' USING ERRCODE='23514';
  END IF;
 END IF;
 NEW.updated_at:=clock_timestamp();
 RETURN NEW;
END $$;
CREATE TRIGGER guard_chainshift_delivery BEFORE INSERT OR UPDATE OR DELETE ON arcade.chainshift_daily_messages FOR EACH ROW EXECUTE FUNCTION arcade.chainshift_guard_delivery();
REVOKE ALL ON arcade.chainshift_daily_messages FROM PUBLIC;
REVOKE ALL ON FUNCTION arcade.chainshift_guard_delivery() FROM PUBLIC;
