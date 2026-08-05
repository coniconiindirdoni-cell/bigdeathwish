-- ═══════════════════════════════════════════════════════════════════════
--  DEATHWISH GAME BOT — POSTGRESQL ŞEMASI
--  7+1 mikroservis mimarisi için tek ortak veritabanı.
--
--  Tüm servisler AYNI PostgreSQL veritabanına bağlanır (DATABASE_URL).
--  Her tablo aşağıda HANGİ SERVİSİN OKUYUP/YAZDIĞI belirtilerek
--  gruplanmıştır. Bu sadece organizasyon amaçlıdır — PostgreSQL
--  şema/kullanıcı bazlı erişim kısıtlaması bu dosyada uygulanmamıştır
--  (istersen ileride her servise ayrı bir DB rolü/GRANT ile
--  gerçek izolasyon eklenebilir).
--
--  Kaynak: Mevcut tek-dosya botun better-sqlite3 şeması (ensureSchema +
--  ensureMMORPGSchema) buradan PostgreSQL'e taşındı. SQLite'taki
--  senkron db.prepare() çağrıları, her serviste pg (node-postgres) ile
--  ASYNC sorgulara dönüşecek.
--
--  Notlar:
--   - INTEGER PRIMARY KEY AUTOINCREMENT  → BIGSERIAL PRIMARY KEY
--   - Coin/bakiye alanları               → BIGINT (taşma riskine karşı)
--   - Seviye/sayaç gibi küçük alanlar    → INTEGER
--   - Zaman damgaları (epoch ms)         → BIGINT
--   - Tarih alanları (YYYY-MM-DD)        → TEXT (mevcut kodla uyumlu
--     kalması için; ileride DATE'e çevrilebilir)
-- ═══════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════
--  0) ÇEKİRDEK / ORTAK TABLOLAR
--  Sahibi: tüm servisler (özellikle gateway-service kayıt açar)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS servers (
    guild_id    TEXT PRIMARY KEY,
    guild_name  TEXT,
    added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS server_settings (
    guild_id TEXT NOT NULL REFERENCES servers(guild_id) ON DELETE CASCADE,
    key      TEXT NOT NULL,
    value    TEXT,
    PRIMARY KEY (guild_id, key)
);

CREATE TABLE IF NOT EXISTS users (
    user_id      TEXT PRIMARY KEY,
    username     TEXT,
    first_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════════════════
--  1) ECONOMY-SERVICE
--  Bakiye, banka, evlilik, market, oyuncu pazarı, boostlar
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS economy (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    balance  BIGINT NOT NULL DEFAULT 0,
    bank     BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
);

-- Coin çoğaltmayı / çift ödül vermeyi engellemek için idempotency-key'li
-- ledger. Her bakiye değişikliği (mümkün olduğunca) buraya da düşmeli.
CREATE TABLE IF NOT EXISTS transactions (
    id              BIGSERIAL PRIMARY KEY,
    guild_id        TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    amount          BIGINT NOT NULL,               -- + kazanç, - harcama
    reason          TEXT NOT NULL,                  -- 'game_win','voice_reward','daily','market_buy',...
    source_service  TEXT NOT NULL,                  -- işlemi tetikleyen servis
    idempotency_key TEXT UNIQUE,                     -- aynı ödülün 2 kez işlenmesini engeller
    balance_after   BIGINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_user   ON transactions (guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions (created_at DESC);

CREATE TABLE IF NOT EXISTS bank_accounts (
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    created_at BIGINT,
    PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS marriages (
    guild_id   TEXT NOT NULL,
    user1      TEXT NOT NULL,
    user2      TEXT NOT NULL,
    married_at TEXT,
    PRIMARY KEY (guild_id, user1)
);

CREATE TABLE IF NOT EXISTS rings (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS market_roles (
    guild_id   TEXT NOT NULL,
    role_id    TEXT NOT NULL,
    price      BIGINT,
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (guild_id, role_id)
);

CREATE TABLE IF NOT EXISTS color_roles (
    guild_id TEXT NOT NULL,
    role_id  TEXT NOT NULL,
    price    BIGINT NOT NULL DEFAULT 4000,
    PRIMARY KEY (guild_id, role_id)
);

CREATE TABLE IF NOT EXISTS royal_items (
    guild_id TEXT NOT NULL,
    item_key TEXT NOT NULL,
    owner_id TEXT,
    price    BIGINT NOT NULL DEFAULT 2000,
    PRIMARY KEY (guild_id, item_key)
);

CREATE TABLE IF NOT EXISTS properties (
    guild_id    TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    house_level INTEGER NOT NULL DEFAULT 0,
    car_level   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
);

-- Oyuncular arası pazar (madencilik/odunculuk/craft eşyaları alım-satımı)
CREATE TABLE IF NOT EXISTS player_market (
    id         BIGSERIAL PRIMARY KEY,
    guild_id   TEXT NOT NULL,
    seller_id  TEXT NOT NULL,
    item_type  TEXT NOT NULL,
    item_key   TEXT NOT NULL,
    quantity   INTEGER NOT NULL DEFAULT 1,
    price      BIGINT NOT NULL,
    listed_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_player_market_guild ON player_market (guild_id);

-- XP/Coin boost kayıtları (economy tarafından tüketilir/kontrol edilir)
CREATE TABLE IF NOT EXISTS xp_boosts (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS coin_boosts (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS temp_xp_boosts (
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    expires_at BIGINT,
    uses_left  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_coin_counter (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    count    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
);

-- Genel günlük ödül takibi (daily/haftalık claim tipleri)
CREATE TABLE IF NOT EXISTS daily_claims (
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    claim_date TEXT NOT NULL,
    claim_type TEXT NOT NULL,
    PRIMARY KEY (guild_id, user_id, claim_date, claim_type)
);

CREATE TABLE IF NOT EXISTS daily_counts (
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    claim_date TEXT NOT NULL,
    claim_type TEXT NOT NULL,
    count      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id, claim_date, claim_type)
);


-- ═══════════════════════════════════════════════════════════════════════
--  2) USER-SERVICE
--  Profil, XP/Level, RPG stat/class, başarımlar, sohbet istatistikleri
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_levels (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    xp       BIGINT NOT NULL DEFAULT 0,
    level    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS message_counts (
    guild_id   TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    count_date TEXT NOT NULL,
    count      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, channel_id, user_id, count_date)
);

CREATE TABLE IF NOT EXISTS achievements (
    guild_id       TEXT NOT NULL,
    user_id        TEXT NOT NULL,
    achievement_key TEXT NOT NULL,
    unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (guild_id, user_id, achievement_key)
);

-- RPG seviye/xp (mesaj XP sisteminden bağımsız — /stat, /zindan, /fight vb.)
CREATE TABLE IF NOT EXISTS rpg_data (
    guild_id  TEXT NOT NULL,
    user_id   TEXT NOT NULL,
    rpg_level INTEGER NOT NULL DEFAULT 1,
    rpg_xp    BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS rpg_stats (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    hp       INTEGER NOT NULL DEFAULT 1,
    attack   INTEGER NOT NULL DEFAULT 1,
    defense  INTEGER NOT NULL DEFAULT 1,
    critical INTEGER NOT NULL DEFAULT 1,
    speed    INTEGER NOT NULL DEFAULT 1,
    mana     INTEGER NOT NULL DEFAULT 1,
    magic    INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS rpg_class (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    class    TEXT,
    PRIMARY KEY (guild_id, user_id)
);

-- Hırsızlık (/çal) seviyesi kullanıcı ilerlemesi olduğu için user-service'te
CREATE TABLE IF NOT EXISTS theft_levels (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    level    INTEGER NOT NULL DEFAULT 0,
    xp       BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS theft_shields (
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    expires_at BIGINT,
    PRIMARY KEY (guild_id, user_id)
);


-- ═══════════════════════════════════════════════════════════════════════
--  3) GAME-CORE-SERVICE
--  Madencilik, odunculuk, balıkçılık, pet, relik, antika, MMORPG/RPG
--  ekipman, zindan, /fight — botun en büyük parçası.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Madencilik ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mining_data (
    guild_id                    TEXT NOT NULL,
    user_id                     TEXT NOT NULL,
    miners                      INTEGER NOT NULL DEFAULT 2,
    mining_level                INTEGER NOT NULL DEFAULT 1,
    mining_xp                   BIGINT  NOT NULL DEFAULT 0,
    energy_level                INTEGER NOT NULL DEFAULT 1,
    energy_xp                   BIGINT  NOT NULL DEFAULT 0,
    energy                      INTEGER NOT NULL DEFAULT 20,
    last_energy_regen           BIGINT  NOT NULL DEFAULT 0,
    hungry_until                BIGINT  NOT NULL DEFAULT 0,
    worker_tier                 INTEGER NOT NULL DEFAULT 0,
    purchases_in_tier           INTEGER NOT NULL DEFAULT 0,
    total_ores_mined            BIGINT  NOT NULL DEFAULT 0,
    bread_uses                  INTEGER NOT NULL DEFAULT 0,
    soup_uses                   INTEGER NOT NULL DEFAULT 0,
    meat_uses                   INTEGER NOT NULL DEFAULT 0,
    energy_cap_tier             INTEGER NOT NULL DEFAULT 0,
    energy_cap_purchases_in_tier INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS mining_inventory (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    ore      TEXT NOT NULL,
    amount   BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id, ore)
);

-- ── Odunculuk ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS woodcutting_data (
    guild_id           TEXT NOT NULL,
    user_id            TEXT NOT NULL,
    lumberjacks        INTEGER NOT NULL DEFAULT 2,
    wood_level         INTEGER NOT NULL DEFAULT 1,
    wood_xp            BIGINT  NOT NULL DEFAULT 0,
    energy_level       INTEGER NOT NULL DEFAULT 1,
    energy_xp          BIGINT  NOT NULL DEFAULT 0,
    energy             INTEGER NOT NULL DEFAULT 20,
    last_energy_regen  BIGINT  NOT NULL DEFAULT 0,
    worker_tier        INTEGER NOT NULL DEFAULT 0,
    purchases_in_tier  INTEGER NOT NULL DEFAULT 0,
    total_logs_cut     BIGINT  NOT NULL DEFAULT 0,
    bread_uses         INTEGER NOT NULL DEFAULT 0,
    soup_uses          INTEGER NOT NULL DEFAULT 0,
    meat_uses          INTEGER NOT NULL DEFAULT 0,
    energy_cap_tier    INTEGER NOT NULL DEFAULT 0,
    energy_cap_purchases_in_tier INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS woodcutting_inventory (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    wood     TEXT NOT NULL,
    amount   BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id, wood)
);

-- ── Balıkçılık ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fish_inventory (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    fish_key TEXT NOT NULL,
    count    BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id, fish_key)
);

CREATE TABLE IF NOT EXISTS fish_boosts (
    guild_id  TEXT NOT NULL,
    user_id   TEXT NOT NULL,
    uses_left INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS fish_cast_state (
    guild_id        TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    since_line      INTEGER NOT NULL DEFAULT 0,
    line_threshold  INTEGER NOT NULL DEFAULT 0,
    since_rod       INTEGER NOT NULL DEFAULT 0,
    rod_threshold   INTEGER NOT NULL DEFAULT 0,
    since_empty     INTEGER NOT NULL DEFAULT 0,
    empty_threshold INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
);

-- ── Pet sistemi (klasik) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS pets (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    pet_key  TEXT NOT NULL,
    level    INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (guild_id, user_id, pet_key)
);

CREATE TABLE IF NOT EXISTS active_pet (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    pet_key  TEXT,
    PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS pet_food (
    guild_id     TEXT NOT NULL,
    user_id      TEXT NOT NULL,
    pet_key      TEXT NOT NULL,
    last_fed_at  TEXT,
    PRIMARY KEY (guild_id, user_id, pet_key)
);

-- ── Antika sistemi ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS antique_inventory (
    guild_id    TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    antique_key TEXT NOT NULL,
    count       INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id, antique_key)
);

CREATE TABLE IF NOT EXISTS active_antique (
    guild_id    TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    antique_key TEXT,
    PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS antique_upgrades (
    guild_id      TEXT NOT NULL,
    user_id       TEXT NOT NULL,
    antique_key   TEXT NOT NULL,
    upgrade_level INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id, antique_key)
);

CREATE TABLE IF NOT EXISTS daily_antique_market (
    guild_id  TEXT NOT NULL,
    market_date TEXT NOT NULL,
    antique1  TEXT,
    antique2  TEXT,
    PRIMARY KEY (guild_id, market_date)
);

-- ── Relik / Ejder Seti ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS relics (
    guild_id  TEXT NOT NULL,
    user_id   TEXT NOT NULL,
    relic_key TEXT NOT NULL,
    PRIMARY KEY (guild_id, user_id, relic_key)
);

CREATE TABLE IF NOT EXISTS relic_upgrades (
    guild_id  TEXT NOT NULL,
    user_id   TEXT NOT NULL,
    relic_key TEXT NOT NULL,
    level     INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (guild_id, user_id, relic_key)
);

-- Aynı anda en fazla RELIC_SET_MAX_EQUIPPED (2) set kuşanılabilir.
CREATE TABLE IF NOT EXISTS active_relic_sets (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    set_key  TEXT NOT NULL,
    PRIMARY KEY (guild_id, user_id, set_key)
);

-- ── Araçlar (madencilik/odunculuk aletleri, oyuncu pazarından) ──
CREATE TABLE IF NOT EXISTS player_tools (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    tool_key TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (guild_id, user_id, tool_key)
);

-- ── MMORPG modülü ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mmo_pets (
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    pet_key    TEXT NOT NULL,
    level      INTEGER NOT NULL DEFAULT 1,
    hatched_at TEXT NOT NULL,
    PRIMARY KEY (guild_id, user_id, pet_key, hatched_at)
);

CREATE TABLE IF NOT EXISTS mmo_active_pets (
    guild_id       TEXT NOT NULL,
    user_id        TEXT NOT NULL,
    slot           INTEGER NOT NULL,
    pet_key        TEXT,
    pet_hatched_at TEXT,
    PRIMARY KEY (guild_id, user_id, slot)
);

CREATE TABLE IF NOT EXISTS mmo_eggs (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    egg_type TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id, egg_type)
);

CREATE TABLE IF NOT EXISTS mmo_pet_shards (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    pet_key  TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id, pet_key)
);

CREATE TABLE IF NOT EXISTS mmo_chests (
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    chest_type TEXT NOT NULL,
    quantity   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id, chest_type)
);

CREATE TABLE IF NOT EXISTS mmo_craft_mats (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    mat_key  TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id, mat_key)
);

CREATE TABLE IF NOT EXISTS mmo_weapons (
    id          BIGSERIAL PRIMARY KEY,
    guild_id    TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    weapon_key  TEXT NOT NULL,
    enhancement INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_mmo_weapons_owner ON mmo_weapons (guild_id, user_id);

CREATE TABLE IF NOT EXISTS mmo_armors (
    id          BIGSERIAL PRIMARY KEY,
    guild_id    TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    armor_key   TEXT NOT NULL,
    slot        TEXT NOT NULL,
    enhancement INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_mmo_armors_owner ON mmo_armors (guild_id, user_id);

CREATE TABLE IF NOT EXISTS mmo_equipped (
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    slot       TEXT NOT NULL,
    item_id    BIGINT,
    item_table TEXT,
    PRIMARY KEY (guild_id, user_id, slot)
);

CREATE TABLE IF NOT EXISTS mmo_slot_daily (
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    play_date  TEXT NOT NULL,
    plays      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id, play_date)
);

CREATE TABLE IF NOT EXISTS mmo_dungeon_cd (
    guild_id    TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    dungeon_key TEXT NOT NULL,
    last_enter  BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id, dungeon_key)
);

CREATE TABLE IF NOT EXISTS mmo_fight_cd (
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    last_fight BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
);

-- ── Genel oyun/geçmiş kayıtları (dokümandaki games/game_history) ──
CREATE TABLE IF NOT EXISTS games (
    game_key    TEXT PRIMARY KEY,     -- 'blackjack','at_yarisi','slot', vb.
    display_name TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS game_history (
    id         BIGSERIAL PRIMARY KEY,
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    game_key   TEXT NOT NULL,
    result     TEXT,                  -- 'win','lose','draw'
    bet_amount BIGINT,
    payout     BIGINT,
    played_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_game_history_user ON game_history (guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_date ON game_history (played_at DESC);


-- ═══════════════════════════════════════════════════════════════════════
--  4) VOICE-SERVICE
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS voice_activity (
    guild_id      TEXT NOT NULL,
    user_id       TEXT NOT NULL,
    total_seconds BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
);


-- ═══════════════════════════════════════════════════════════════════════
--  5) MODERATION-SERVICE
--  Dokümanda istenen yeni sistem — mevcut botta karşılığı yoktu.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS moderation_logs (
    id          BIGSERIAL PRIMARY KEY,
    guild_id    TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    action_type TEXT NOT NULL,        -- 'warn','mute','kick','ban','spam_delete','filter_delete'
    reason      TEXT,
    moderator_id TEXT,                -- otomatikse NULL / 'AUTO'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mod_logs_user ON moderation_logs (guild_id, user_id);

CREATE TABLE IF NOT EXISTS moderation_warnings (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    count    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
);


-- ═══════════════════════════════════════════════════════════════════════
--  6) BACKGROUND-SERVICE
--  Zamanlanmış görev takibi (background-service içindeki cron'ların
--  hangi işi ne zaman çalıştırdığını loglamak / mükerrer çalışmayı
--  önlemek için).
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS background_tasks (
    task_key     TEXT PRIMARY KEY,    -- 'daily_reward_reset','fish_market_refresh','db_backup'
    last_run_at  TIMESTAMPTZ,
    last_status  TEXT,                -- 'success','failed'
    last_error   TEXT
);


-- ═══════════════════════════════════════════════════════════════════════
--  7) LOG-SERVICE  (önceki adımda kuruldu, referans için burada da var)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS logs (
    id           BIGSERIAL PRIMARY KEY,
    service_name TEXT NOT NULL,
    level        TEXT NOT NULL CHECK (level IN ('INFO','WARNING','ERROR','CRITICAL')),
    message      TEXT NOT NULL,
    file_name    TEXT,
    user_id      TEXT,
    server_id    TEXT,
    metadata     JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_logs_service_level ON logs (service_name, level);
CREATE INDEX IF NOT EXISTS idx_logs_created_at     ON logs (created_at DESC);


-- ═══════════════════════════════════════════════════════════════════════
--  ORTAK PERFORMANS İNDEXLERİ
-- ═══════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_economy_guild        ON economy (guild_id);
CREATE INDEX IF NOT EXISTS idx_user_levels_guild     ON user_levels (guild_id);
CREATE INDEX IF NOT EXISTS idx_voice_activity_guild  ON voice_activity (guild_id);
CREATE INDEX IF NOT EXISTS idx_mining_data_guild     ON mining_data (guild_id);
CREATE INDEX IF NOT EXISTS idx_woodcutting_data_guild ON woodcutting_data (guild_id);
