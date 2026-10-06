-- Chainshift is additive and independently gated; no Balance facts are changed.
CREATE TABLE arcade.chainshift_puzzles (
 puzzle_id varchar(100) PRIMARY KEY,
 day_key date NOT NULL UNIQUE,
 start_word varchar(64) NOT NULL,
 finish_word varchar(64) NOT NULL CHECK (finish_word <> start_word),
 graph_version varchar(80) NOT NULL,
 graph_checksum varchar(80) NOT NULL,
 rules_revision varchar(80) NOT NULL,
 publication_state varchar(20) NOT NULL CHECK (publication_state IN ('local-candidate','unpublished')),
 certificate jsonb NOT NULL,
 published_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE arcade.chainshift_attempts (
 attempt_id uuid PRIMARY KEY,
 puzzle_id varchar(100) NOT NULL REFERENCES arcade.chainshift_puzzles ON DELETE RESTRICT,
 player_id uuid NOT NULL REFERENCES arcade.players ON DELETE RESTRICT,
 launch_guild_id uuid NOT NULL REFERENCES arcade.guilds ON DELETE RESTRICT,
 claimed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 route text[] NOT NULL CHECK (cardinality(route) BETWEEN 1 AND 2048),
 revision integer NOT NULL DEFAULT 0 CHECK (revision BETWEEN 0 AND 10000),
 state varchar(16) NOT NULL DEFAULT 'active' CHECK (state IN ('active','completed')),
 completed_at timestamptz,
 final_shifts integer,
 elapsed_ms bigint,
 UNIQUE(player_id,puzzle_id),
 CHECK ((state='active' AND completed_at IS NULL AND final_shifts IS NULL AND elapsed_ms IS NULL)
 OR (state='completed' AND completed_at IS NOT NULL AND final_shifts IS NOT NULL AND elapsed_ms IS NOT NULL AND completed_at>=claimed_at AND final_shifts=cardinality(route)-1 AND final_shifts>0
 AND elapsed_ms=floor(extract(epoch FROM (completed_at-claimed_at))*1000)::bigint))
);
CREATE INDEX chainshift_ranking ON arcade.chainshift_attempts(puzzle_id,final_shifts,elapsed_ms,player_id) WHERE state='completed';
CREATE TABLE arcade.chainshift_actions (
 attempt_id uuid NOT NULL REFERENCES arcade.chainshift_attempts ON DELETE RESTRICT,
 request_id uuid NOT NULL,
 request_digest char(64) NOT NULL,
 outcome jsonb NOT NULL,
 PRIMARY KEY(attempt_id,request_id)
);
CREATE FUNCTION arcade.chainshift_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN RAISE EXCEPTION 'immutable Chainshift fact' USING ERRCODE='23514'; END $$;
CREATE TRIGGER immutable_chainshift_puzzle BEFORE UPDATE OR DELETE ON arcade.chainshift_puzzles FOR EACH ROW EXECUTE FUNCTION arcade.chainshift_immutable();
CREATE TRIGGER immutable_chainshift_action BEFORE UPDATE OR DELETE ON arcade.chainshift_actions FOR EACH ROW EXECUTE FUNCTION arcade.chainshift_immutable();
CREATE FUNCTION arcade.chainshift_guard_attempt() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE p arcade.chainshift_puzzles;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'immutable attempt' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.state='completed' OR (NEW.attempt_id,NEW.puzzle_id,NEW.player_id,NEW.launch_guild_id,NEW.claimed_at)
   IS DISTINCT FROM (OLD.attempt_id,OLD.puzzle_id,OLD.player_id,OLD.launch_guild_id,OLD.claimed_at)
   OR NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'immutable attempt identity/result' USING ERRCODE='23514'; END IF;
 ELSE
  IF NEW.state<>'active' OR NEW.revision<>0 OR cardinality(NEW.route)<>1 THEN RAISE EXCEPTION 'invalid initial attempt' USING ERRCODE='23514'; END IF;
  NEW.claimed_at:=clock_timestamp();
 END IF;
 SELECT * INTO STRICT p FROM arcade.chainshift_puzzles WHERE puzzle_id=NEW.puzzle_id;
 IF p.publication_state<>'local-candidate' OR NEW.route[1]<>p.start_word THEN RAISE EXCEPTION 'invalid puzzle route' USING ERRCODE='23514'; END IF;
 IF NEW.state='completed' THEN
  IF NEW.route[cardinality(NEW.route)]<>p.finish_word THEN RAISE EXCEPTION 'invalid finish' USING ERRCODE='23514'; END IF;
  NEW.completed_at:=clock_timestamp();
  NEW.final_shifts:=cardinality(NEW.route)-1;
  NEW.elapsed_ms:=floor(extract(epoch FROM (NEW.completed_at-NEW.claimed_at))*1000)::bigint;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_chainshift_attempt BEFORE INSERT OR UPDATE OR DELETE ON arcade.chainshift_attempts FOR EACH ROW EXECUTE FUNCTION arcade.chainshift_guard_attempt();
REVOKE ALL ON arcade.chainshift_puzzles,arcade.chainshift_attempts,arcade.chainshift_actions FROM PUBLIC;
REVOKE ALL ON FUNCTION arcade.chainshift_immutable(),arcade.chainshift_guard_attempt() FROM PUBLIC;
