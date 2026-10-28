-- New authored rules/tables only. No historical attempt or score is converted.
CREATE TABLE arcade.chainshift_authored_puzzles (
 puzzle_id varchar(100) PRIMARY KEY,
 rules_revision varchar(80) NOT NULL CHECK (rules_revision='chainshift-authored-v2'),
 content_digest char(64) NOT NULL CHECK (content_digest ~ '^[a-f0-9]{64}$'),
 kind varchar(10) NOT NULL CHECK (kind IN ('daily','practice')),
 day_key date UNIQUE,
 answer_lengths integer[] NOT NULL CHECK (cardinality(answer_lengths)=5 AND 2<=ALL(answer_lengths) AND 12>=ALL(answer_lengths)),
 published_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK ((kind='daily')=(day_key IS NOT NULL))
);
CREATE TABLE arcade.chainshift_authored_attempts (
 attempt_id uuid PRIMARY KEY,
 player_id uuid NOT NULL REFERENCES arcade.players ON DELETE RESTRICT,
 puzzle_id varchar(100) NOT NULL REFERENCES arcade.chainshift_authored_puzzles ON DELETE RESTRICT,
 kind varchar(10) NOT NULL CHECK (kind IN ('daily','practice')),
 state jsonb NOT NULL CHECK (jsonb_typeof(state)='object' AND octet_length(state::text)<=1000000),
 revision integer GENERATED ALWAYS AS ((state->>'revision')::integer) STORED,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 started_at timestamptz,
 completed_at timestamptz,
 elapsed_ms bigint NOT NULL DEFAULT 0 CHECK (elapsed_ms>=0),
 UNIQUE(attempt_id,player_id),
 CHECK (completed_at IS NULL OR (started_at IS NOT NULL AND completed_at>=started_at))
);
CREATE UNIQUE INDEX authored_one_daily ON arcade.chainshift_authored_attempts(player_id,puzzle_id) WHERE kind='daily';
CREATE INDEX authored_owned ON arcade.chainshift_authored_attempts(player_id,created_at);
CREATE INDEX authored_standings ON arcade.chainshift_authored_attempts(puzzle_id,elapsed_ms,player_id) WHERE kind='daily' AND completed_at IS NOT NULL;
CREATE TABLE arcade.chainshift_authored_actions (
 player_id uuid NOT NULL REFERENCES arcade.players ON DELETE RESTRICT,
 request_id uuid NOT NULL,
 attempt_id uuid NOT NULL,
 request_digest char(64) NOT NULL CHECK (request_digest ~ '^[a-f0-9]{64}$'),
 PRIMARY KEY(player_id,request_id),
 FOREIGN KEY(attempt_id,player_id) REFERENCES arcade.chainshift_authored_attempts(attempt_id,player_id) ON DELETE RESTRICT
);
CREATE FUNCTION arcade.authored_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN RAISE EXCEPTION 'immutable authored fact' USING ERRCODE='23514'; END $$;
CREATE TRIGGER immutable_authored_publication BEFORE UPDATE OR DELETE ON arcade.chainshift_authored_puzzles FOR EACH ROW EXECUTE FUNCTION arcade.authored_immutable();
CREATE TRIGGER immutable_authored_receipt BEFORE UPDATE OR DELETE ON arcade.chainshift_authored_actions FOR EACH ROW EXECUTE FUNCTION arcade.authored_immutable();
CREATE FUNCTION arcade.authored_guard_attempt() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE p arcade.chainshift_authored_puzzles; n integer; r integer; h integer; m integer; old_n integer; old_h integer; old_r integer; t timestamptz;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'immutable authored attempt' USING ERRCODE='23514'; END IF;
 SELECT * INTO STRICT p FROM arcade.chainshift_authored_puzzles WHERE puzzle_id=NEW.puzzle_id;
 n:=(NEW.state->>'current')::integer; r:=(NEW.state->>'revealed')::integer; h:=(NEW.state->>'hints')::integer; m:=(NEW.state->>'mistakes')::integer;
 IF NOT (NEW.state ?& ARRAY['id','player','name','puzzleId','day','mode','revision','current','revealed','hints','mistakes','startedAt','completedAt','elapsedMs','guesses','receipts','message','outcome']) OR (SELECT count(*) FROM jsonb_object_keys(NEW.state))<>18 OR m>h OR NEW.kind<>p.kind OR NEW.state->>'id'<>NEW.attempt_id::text OR NEW.state->>'puzzleId'<>p.puzzle_id OR NEW.state->>'mode'<>p.kind
  OR NEW.state->'day' IS DISTINCT FROM coalesce(to_jsonb(p.day_key::text),'null'::jsonb)
  OR NEW.state->>'player' IS DISTINCT FROM (SELECT discord_user_id FROM arcade.players WHERE player_id=NEW.player_id)
  OR n IS NULL OR r IS NULL OR h IS NULL OR m IS NULL OR n NOT BETWEEN 1 AND 6 OR r NOT BETWEEN 1 AND 12 OR h NOT BETWEEN 0 AND 55 OR m NOT BETWEEN 0 AND 5000
  OR (NEW.state->>'revision')::integer NOT BETWEEN 0 AND 5000 OR jsonb_typeof(NEW.state->'guesses')<>'array'
  OR NEW.state->'receipts'<>'{}'::jsonb OR (n<6 AND r>=p.answer_lengths[n])
  OR (n=6 AND NEW.state->'completedAt'='null'::jsonb) THEN RAISE EXCEPTION 'invalid authored state' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.started_at IS NOT NULL OR NEW.completed_at IS NOT NULL OR NEW.elapsed_ms<>0 OR NEW.state->'startedAt'<>'null'::jsonb OR NEW.state->'completedAt'<>'null'::jsonb
   OR (NEW.state->>'revision')::integer<>0 OR n<>1 OR r<>1 OR h<>0 OR m<>0 THEN RAISE EXCEPTION 'invalid authored creation' USING ERRCODE='23514'; END IF;
  NEW.created_at:=clock_timestamp();
 ELSE
  IF OLD.completed_at IS NOT NULL OR (NEW.attempt_id,NEW.player_id,NEW.puzzle_id,NEW.kind,NEW.created_at,NEW.started_at,NEW.completed_at,NEW.elapsed_ms)
   IS DISTINCT FROM (OLD.attempt_id,OLD.player_id,OLD.puzzle_id,OLD.kind,OLD.created_at,OLD.started_at,OLD.completed_at,OLD.elapsed_ms)
   OR (NEW.state->>'revision')::integer<>OLD.revision+1 THEN RAISE EXCEPTION 'immutable authored identity/result' USING ERRCODE='23514'; END IF;
  old_n:=(OLD.state->>'current')::integer;old_h:=(OLD.state->>'hints')::integer;old_r:=(OLD.state->>'revealed')::integer;
  IF n NOT BETWEEN old_n AND old_n+1 OR h NOT BETWEEN old_h AND old_h+1 OR m NOT BETWEEN (OLD.state->>'mistakes')::integer AND (OLD.state->>'mistakes')::integer+1
   OR (n=old_n AND r NOT BETWEEN old_r AND old_r+1) OR (n>old_n AND r<>1)
   OR (n=old_n AND ((r>old_r)<>(h>old_h))) OR (m>(OLD.state->>'mistakes')::integer AND h<>old_h+1)
   OR (n>old_n AND h>old_h AND old_r+1<>p.answer_lengths[old_n]) THEN RAISE EXCEPTION 'invalid authored transition' USING ERRCODE='23514'; END IF;
  t:=clock_timestamp();
  IF OLD.started_at IS NULL THEN
   IF NEW.state->'startedAt'='null'::jsonb OR n<>1 OR r<>1 OR h<>0 OR m<>0 THEN RAISE EXCEPTION 'start required' USING ERRCODE='23514'; END IF;
   IF p.kind='daily' AND p.day_key<>(t AT TIME ZONE 'America/New_York')::date THEN RAISE EXCEPTION 'stale authored day' USING ERRCODE='23514'; END IF;
   NEW.started_at:=t;
  END IF;
  NEW.elapsed_ms:=greatest(OLD.elapsed_ms,floor(extract(epoch FROM(t-NEW.started_at))*1000)::bigint,0);
  IF n=6 THEN NEW.completed_at:=greatest(t,NEW.started_at); END IF;
 END IF;
 NEW.state:=NEW.state||jsonb_build_object('startedAt',CASE WHEN NEW.started_at IS NULL THEN NULL ELSE floor(extract(epoch FROM NEW.started_at)*1000)::bigint END,
  'completedAt',CASE WHEN NEW.completed_at IS NULL THEN NULL ELSE floor(extract(epoch FROM NEW.completed_at)*1000)::bigint END,'elapsedMs',NEW.elapsed_ms);
 RETURN NEW;
END $$;
CREATE TRIGGER guard_authored_attempt BEFORE INSERT OR UPDATE OR DELETE ON arcade.chainshift_authored_attempts FOR EACH ROW EXECUTE FUNCTION arcade.authored_guard_attempt();
REVOKE ALL ON arcade.chainshift_authored_puzzles,arcade.chainshift_authored_attempts,arcade.chainshift_authored_actions FROM PUBLIC;
REVOKE ALL ON FUNCTION arcade.authored_immutable(),arcade.authored_guard_attempt() FROM PUBLIC;
