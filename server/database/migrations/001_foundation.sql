-- Additive foundation only. Application write paths are deliberately absent.
CREATE TABLE arcade.players (
 player_id uuid PRIMARY KEY,
 discord_user_id varchar(20) NOT NULL UNIQUE CHECK (discord_user_id ~ '^[1-9][0-9]{16,19}$'),
 display_name varchar(100) NOT NULL CHECK (length(display_name) > 0),
 avatar_hash varchar(128), profile_refreshed_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), last_active_at timestamptz NOT NULL
);
CREATE INDEX players_last_active ON arcade.players(last_active_at);
CREATE TABLE arcade.guilds (
 guild_id uuid PRIMARY KEY,
 discord_guild_id varchar(20) NOT NULL UNIQUE CHECK (discord_guild_id ~ '^[1-9][0-9]{16,19}$'),
 display_name varchar(100) NOT NULL CHECK (length(display_name) > 0),
 status varchar(16) NOT NULL DEFAULT 'disabled' CHECK (status IN ('enabled','disabled','removed')),
 first_seen_at timestamptz NOT NULL, last_seen_at timestamptz NOT NULL
);
CREATE TABLE arcade.guild_participations (
 player_id uuid NOT NULL REFERENCES arcade.players ON DELETE RESTRICT,
 guild_id uuid NOT NULL REFERENCES arcade.guilds ON DELETE RESTRICT,
 first_seen_at timestamptz NOT NULL, last_seen_at timestamptz NOT NULL,
 membership_verified_at timestamptz NOT NULL,
 PRIMARY KEY(player_id,guild_id)
);
CREATE INDEX participations_guild ON arcade.guild_participations(guild_id,last_seen_at);
CREATE TABLE arcade.game_versions (
 version_id uuid PRIMARY KEY,
 game_key varchar(40) NOT NULL CHECK (game_key = 'balance'),
 ruleset_id varchar(80) NOT NULL UNIQUE,
 simulation_digest varchar(64) CHECK (simulation_digest ~ '^[a-f0-9]{64}$'),
 validator_revision varchar(80) NOT NULL,
 tick_rate integer NOT NULL CHECK (tick_rate = 60),
 max_ticks integer NOT NULL CHECK (max_ticks > 0 AND max_ticks <= 18000),
 issuance_enabled boolean NOT NULL DEFAULT false,
 submission_deadline timestamptz,
 CHECK (NOT issuance_enabled OR (simulation_digest IS NOT NULL AND validator_revision <> 'unimplemented')),
 UNIQUE(version_id,max_ticks)
);
INSERT INTO arcade.game_versions(version_id,game_key,ruleset_id,simulation_digest,validator_revision,tick_rate,max_ticks,issuance_enabled)
VALUES ('00000000-0000-4000-8000-000000000001','balance','balance-official-v1',NULL,'unimplemented',60,18000,false);
CREATE TABLE arcade.application_sessions (
 session_id uuid PRIMARY KEY,
 token_digest varchar(64) NOT NULL UNIQUE CHECK (token_digest ~ '^[a-f0-9]{64}$'),
 player_id uuid NOT NULL, guild_id uuid NOT NULL,
 authenticated_at timestamptz NOT NULL, expires_at timestamptz NOT NULL,
 idle_expires_at timestamptz NOT NULL, revoked_at timestamptz,
 membership_verified_at timestamptz NOT NULL,
 origin_class varchar(20) NOT NULL CHECK (origin_class IN ('activity','browser')),
 transport varchar(16) NOT NULL CHECK (transport IN ('cookie','bearer')),
 instance_ciphertext bytea CHECK (octet_length(instance_ciphertext) <= 2048),
 csrf_digest varchar(64) CHECK (csrf_digest ~ '^[a-f0-9]{64}$'),
 FOREIGN KEY(player_id,guild_id) REFERENCES arcade.guild_participations ON DELETE RESTRICT,
 CHECK(expires_at > authenticated_at AND idle_expires_at <= expires_at),
 UNIQUE(session_id,player_id,guild_id)
);
CREATE INDEX sessions_expiry ON arcade.application_sessions(expires_at);
CREATE INDEX sessions_owner ON arcade.application_sessions(player_id,revoked_at);
CREATE INDEX sessions_guild ON arcade.application_sessions(guild_id);
CREATE TABLE arcade.auth_challenges (
 challenge_id uuid PRIMARY KEY,
 binding_digest varchar(64) NOT NULL UNIQUE CHECK(binding_digest ~ '^[a-f0-9]{64}$'),
 verifier_ciphertext bytea NOT NULL CHECK(octet_length(verifier_ciphertext) BETWEEN 16 AND 2048),
 issued_at timestamptz NOT NULL, expires_at timestamptz NOT NULL, consumed_at timestamptz,
 CHECK(expires_at > issued_at)
);
CREATE INDEX challenges_expiry ON arcade.auth_challenges(expires_at);
CREATE TABLE arcade.attempt_authorizations (
 attempt_id uuid PRIMARY KEY,
 player_id uuid NOT NULL, guild_id uuid NOT NULL,
 version_id uuid NOT NULL REFERENCES arcade.game_versions ON DELETE RESTRICT,
 game_key varchar(40) NOT NULL DEFAULT 'balance' CHECK(game_key = 'balance'),
 session_id uuid,
 begin_key uuid NOT NULL,
 issued_at timestamptz NOT NULL,
 submit_deadline timestamptz NOT NULL, retry_deadline timestamptz NOT NULL,
 state varchar(16) NOT NULL DEFAULT 'open' CHECK(state IN ('open','submitted','expired','cancelled')),
 first_received_at timestamptz,
 submission_digest varchar(64) CHECK(submission_digest ~ '^[a-f0-9]{64}$'),
 FOREIGN KEY(player_id,guild_id) REFERENCES arcade.guild_participations ON DELETE RESTRICT,
 FOREIGN KEY(session_id,player_id,guild_id) REFERENCES arcade.application_sessions(session_id,player_id,guild_id) ON DELETE RESTRICT,
 CHECK(submit_deadline > issued_at AND retry_deadline >= submit_deadline),
 UNIQUE(player_id,begin_key), UNIQUE(attempt_id,player_id,guild_id,version_id)
);
CREATE UNIQUE INDEX one_open_attempt ON arcade.attempt_authorizations(player_id,game_key) WHERE state = 'open';
CREATE INDEX authorizations_expiry ON arcade.attempt_authorizations(submit_deadline);
CREATE INDEX authorizations_guild ON arcade.attempt_authorizations(guild_id);
CREATE INDEX authorizations_version ON arcade.attempt_authorizations(version_id);
CREATE INDEX authorizations_session ON arcade.attempt_authorizations(session_id);
CREATE TABLE arcade.game_attempts (
 attempt_id uuid PRIMARY KEY,
 player_id uuid NOT NULL, guild_id uuid NOT NULL, version_id uuid NOT NULL,
 disposition varchar(16) NOT NULL CHECK(disposition IN ('accepted','practice','rejected','expired')),
 ticks integer NOT NULL CHECK(ticks >= 0), max_ticks integer NOT NULL,
 interruption_count integer NOT NULL DEFAULT 0 CHECK(interruption_count >= 0),
 failure_direction varchar(8) CHECK(failure_direction IN ('left','right')),
 failure_phase varchar(16) CHECK(failure_phase IN ('Warmup','Active','Intense','Critical')),
 accepted_at timestamptz NOT NULL,
 reason_code varchar(64) NOT NULL CHECK(reason_code ~ '^[a-z_]+$'),
 evidence_digest varchar(64) CHECK(evidence_digest ~ '^[a-f0-9]{64}$'),
 validator_revision varchar(80) NOT NULL,
 FOREIGN KEY(attempt_id,player_id,guild_id,version_id) REFERENCES arcade.attempt_authorizations(attempt_id,player_id,guild_id,version_id) ON DELETE RESTRICT,
 FOREIGN KEY(version_id,max_ticks) REFERENCES arcade.game_versions(version_id,max_ticks) ON DELETE RESTRICT,
 CHECK(ticks <= max_ticks),
 CHECK(disposition <> 'accepted' OR (ticks > 0 AND interruption_count = 0 AND evidence_digest IS NOT NULL AND validator_revision <> 'unimplemented')),
 UNIQUE(attempt_id,player_id,version_id,ticks,disposition),
 UNIQUE(attempt_id,guild_id,version_id,ticks,disposition),
 UNIQUE(attempt_id,player_id,guild_id,version_id,ticks,disposition)
);
CREATE INDEX attempts_personal ON arcade.game_attempts(player_id,version_id,accepted_at DESC);
CREATE INDEX attempts_guild ON arcade.game_attempts(guild_id,version_id,accepted_at DESC);
CREATE INDEX attempts_version ON arcade.game_attempts(version_id);
CREATE TABLE arcade.attempt_traces (
 attempt_id uuid PRIMARY KEY REFERENCES arcade.game_attempts ON DELETE CASCADE,
 encoding varchar(40) NOT NULL,
 evidence bytea NOT NULL CHECK(octet_length(evidence) <= 65536),
 expires_at timestamptz NOT NULL
);
CREATE INDEX traces_expiry ON arcade.attempt_traces(expires_at);
CREATE TABLE arcade.personal_game_stats (
 player_id uuid NOT NULL REFERENCES arcade.players ON DELETE RESTRICT,
 version_id uuid NOT NULL REFERENCES arcade.game_versions ON DELETE RESTRICT,
 official_count bigint NOT NULL CHECK(official_count > 0),
 total_ticks bigint NOT NULL CHECK(total_ticks > 0),
 best_attempt_id uuid NOT NULL, best_ticks integer NOT NULL CHECK(best_ticks > 0),
 best_disposition varchar(16) NOT NULL DEFAULT 'accepted' CHECK(best_disposition = 'accepted'),
 first_accepted_at timestamptz NOT NULL, last_accepted_at timestamptz NOT NULL,
 PRIMARY KEY(player_id,version_id),
 FOREIGN KEY(best_attempt_id,player_id,version_id,best_ticks,best_disposition) REFERENCES arcade.game_attempts(attempt_id,player_id,version_id,ticks,disposition) ON DELETE RESTRICT,
 CHECK(total_ticks >= best_ticks AND last_accepted_at >= first_accepted_at)
);
CREATE INDEX stats_best ON arcade.personal_game_stats(best_attempt_id);
CREATE INDEX stats_version ON arcade.personal_game_stats(version_id);
CREATE TABLE arcade.guild_leaderboard_entries (
 guild_id uuid NOT NULL REFERENCES arcade.guilds ON DELETE RESTRICT,
 version_id uuid NOT NULL REFERENCES arcade.game_versions ON DELETE RESTRICT,
 player_id uuid NOT NULL REFERENCES arcade.players ON DELETE RESTRICT,
 best_attempt_id uuid NOT NULL, best_ticks integer NOT NULL CHECK(best_ticks > 0),
 best_disposition varchar(16) NOT NULL DEFAULT 'accepted' CHECK(best_disposition = 'accepted'),
 best_accepted_at timestamptz NOT NULL,
 PRIMARY KEY(guild_id,version_id,player_id),
 FOREIGN KEY(best_attempt_id,player_id,guild_id,version_id,best_ticks,best_disposition) REFERENCES arcade.game_attempts(attempt_id,player_id,guild_id,version_id,ticks,disposition) ON DELETE RESTRICT
);
CREATE INDEX leaderboard_rank ON arcade.guild_leaderboard_entries(guild_id,version_id,best_ticks DESC,best_accepted_at,player_id);
CREATE INDEX leaderboard_player ON arcade.guild_leaderboard_entries(player_id);
CREATE INDEX leaderboard_best ON arcade.guild_leaderboard_entries(best_attempt_id);
CREATE INDEX leaderboard_version ON arcade.guild_leaderboard_entries(version_id);
CREATE TABLE arcade.guild_game_records (
 guild_id uuid NOT NULL REFERENCES arcade.guilds ON DELETE RESTRICT,
 version_id uuid NOT NULL REFERENCES arcade.game_versions ON DELETE RESTRICT,
 record_attempt_id uuid, record_ticks integer,
 record_disposition varchar(16) NOT NULL DEFAULT 'accepted' CHECK(record_disposition = 'accepted'),
 sequence bigint NOT NULL DEFAULT 0 CHECK(sequence >= 0),
 PRIMARY KEY(guild_id,version_id),
 CHECK((record_attempt_id IS NULL AND record_ticks IS NULL AND sequence = 0) OR (record_attempt_id IS NOT NULL AND record_ticks IS NOT NULL AND record_ticks > 0 AND sequence > 0)),
 FOREIGN KEY(record_attempt_id,guild_id,version_id,record_ticks,record_disposition) REFERENCES arcade.game_attempts(attempt_id,guild_id,version_id,ticks,disposition) ON DELETE RESTRICT
);
CREATE INDEX records_attempt ON arcade.guild_game_records(record_attempt_id);
CREATE INDEX records_version ON arcade.guild_game_records(version_id);
CREATE TABLE arcade.guild_record_events (
 event_id uuid PRIMARY KEY,
 guild_id uuid NOT NULL, version_id uuid NOT NULL,
 sequence bigint NOT NULL CHECK(sequence > 0),
 record_attempt_id uuid NOT NULL UNIQUE,
 new_ticks integer NOT NULL CHECK(new_ticks > 0),
 record_disposition varchar(16) NOT NULL DEFAULT 'accepted' CHECK(record_disposition = 'accepted'),
 previous_attempt_id uuid, previous_ticks integer,
 occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(guild_id,version_id) REFERENCES arcade.guild_game_records ON DELETE RESTRICT,
 FOREIGN KEY(record_attempt_id,guild_id,version_id,new_ticks,record_disposition) REFERENCES arcade.game_attempts(attempt_id,guild_id,version_id,ticks,disposition) ON DELETE RESTRICT,
 FOREIGN KEY(previous_attempt_id,guild_id,version_id,previous_ticks,record_disposition) REFERENCES arcade.game_attempts(attempt_id,guild_id,version_id,ticks,disposition) ON DELETE RESTRICT,
 CHECK((previous_attempt_id IS NULL AND previous_ticks IS NULL) OR (previous_attempt_id IS NOT NULL AND previous_ticks IS NOT NULL AND new_ticks > previous_ticks)),
 UNIQUE(guild_id,version_id,sequence)
);
CREATE INDEX events_previous ON arcade.guild_record_events(previous_attempt_id);
CREATE TABLE arcade.security_events (
 event_id uuid PRIMARY KEY,
 event_type varchar(40) NOT NULL CHECK(event_type ~ '^[a-z_]+$'),
 reason_code varchar(64) NOT NULL CHECK(reason_code ~ '^[a-z_]+$'),
 actor_reference varchar(64), occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(), expires_at timestamptz NOT NULL,
 CHECK(expires_at > occurred_at)
);
CREATE INDEX security_expiry ON arcade.security_events(expires_at);
CREATE INDEX security_type ON arcade.security_events(event_type,occurred_at);
-- Update immutability includes nonaccepted terminal outcomes. Privacy deletion is a future explicit operation.
CREATE FUNCTION arcade.reject_fact_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'immutable_fact'; END $$;
CREATE TRIGGER immutable_attempt BEFORE UPDATE ON arcade.game_attempts FOR EACH ROW EXECUTE FUNCTION arcade.reject_fact_update();
CREATE TRIGGER immutable_record_event BEFORE UPDATE ON arcade.guild_record_events FOR EACH ROW EXECUTE FUNCTION arcade.reject_fact_update();
CREATE FUNCTION arcade.protect_version_rules() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.version_id,NEW.game_key,NEW.ruleset_id,NEW.simulation_digest,NEW.validator_revision,NEW.tick_rate,NEW.max_ticks)
 IS DISTINCT FROM (OLD.version_id,OLD.game_key,OLD.ruleset_id,OLD.simulation_digest,OLD.validator_revision,OLD.tick_rate,OLD.max_ticks)
 THEN RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'immutable_rules'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_rules BEFORE UPDATE ON arcade.game_versions FOR EACH ROW EXECUTE FUNCTION arcade.protect_version_rules();
REVOKE ALL ON ALL TABLES IN SCHEMA arcade FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA arcade FROM PUBLIC;
