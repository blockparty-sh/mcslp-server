import pgPromise from "pg-promise";
import * as config from "./config";

const pgp = pgPromise();
const db = pgp(config.connString());

(async () => {
  await db.any(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
  await db.any(`DROP TABLE IF EXISTS users`);
  await db.any(`DROP TABLE IF EXISTS transfers`);
  await db.any(`DROP TABLE IF EXISTS deposits`);
  await db.any(`DROP TABLE IF EXISTS withdraws`);
  await db.any(`DROP TABLE IF EXISTS tokens`);
  await db.any(`DROP TABLE IF EXISTS servers`);


  await db.any(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      game VARCHAR(32) NOT NULL,
      game_username VARCHAR(64) NOT NULL,
      server_id INTEGER NOT NULL,
      balances JSONB NOT NULL DEFAULT '{}'::JSONB,
      ts TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.any(`CREATE INDEX IF NOT EXISTS users_game_idx ON users (game);`);
  await db.any(`CREATE INDEX IF NOT EXISTS users_game_username_idx ON users (game_username);`);
  await db.any(`CREATE INDEX IF NOT EXISTS users_server_id_idx ON users (server_id);`);

  await db.none(`INSERT INTO users (
              game,
              game_username,
              server_id,
              balances
            ) VALUES ('minecraft', 'c25d4086b30143cb838e62802aa61ad8', 1, '{ "spice": "100" }')`);


  await db.any(`
    CREATE TABLE IF NOT EXISTS transfers (
      id SERIAL PRIMARY KEY,
      send_user_id INTEGER NOT NULL,
      recv_user_id INTEGER NOT NULL,
      server_id INTEGER NOT NULL,
      token_id VARCHAR(64) NOT NULL,
      amount NUMERIC NOT NULL,
      ts TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.any(`CREATE INDEX IF NOT EXISTS transfers_send_user_id_idx ON transfers (send_user_id);`);
  await db.any(`CREATE INDEX IF NOT EXISTS transfers_recv_user_id_idx ON transfers (recv_user_id);`);
  await db.any(`CREATE INDEX IF NOT EXISTS transfers_server_id_idx ON transfers (server_id);`);
  await db.any(`CREATE INDEX IF NOT EXISTS transfers_token_id_idx ON transfers (token_id);`);

  await db.any(`
    CREATE TABLE IF NOT EXISTS deposits (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      txid VARCHAR(64) NOT NULL,
      token_id VARCHAR(64) NOT NULL,
      server_id INTEGER NOT NULL,
      amount NUMERIC NOT NULL,
      ts TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.any(`CREATE INDEX IF NOT EXISTS deposits_user_id_idx ON deposits (user_id);`);
  await db.any(`CREATE INDEX IF NOT EXISTS deposits_txid_idx ON deposits (txid);`);
  await db.any(`CREATE INDEX IF NOT EXISTS deposits_token_id_idx ON deposits (token_id);`);
  await db.any(`CREATE INDEX IF NOT EXISTS deposits_server_id_idx ON deposits (server_id);`);

  await db.any(`
    CREATE TABLE IF NOT EXISTS withdraws (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      txid VARCHAR(64) NOT NULL,
      token_id VARCHAR(64) NOT NULL,
      server_id INTEGER NOT NULL,
      amount NUMERIC NOT NULL,
      address VARCHAR(64) NOT NULL,
      ts TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.any(`CREATE INDEX IF NOT EXISTS withdraws_user_id_idx ON withdraws (user_id);`);
  await db.any(`CREATE INDEX IF NOT EXISTS withdraws_txid_idx ON withdraws (txid);`);
  await db.any(`CREATE INDEX IF NOT EXISTS withdraws_token_id_idx ON withdraws (token_id);`);
  await db.any(`CREATE INDEX IF NOT EXISTS withdraws_server_id_idx ON withdraws (server_id);`);
  await db.any(`CREATE INDEX IF NOT EXISTS withdraws_address_idx ON withdraws (address);`);

  await db.any(`
    CREATE TABLE IF NOT EXISTS tokens (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      ts TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.none(`
    INSERT INTO tokens (
      id,
      name
    ) VALUES (
      '4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf',
      'spice'
    )
  `);

  await db.any(`
    CREATE TABLE IF NOT EXISTS servers (
      id SERIAL PRIMARY KEY,
      game VARCHAR(32) NOT NULL,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      ip_address INET NOT NULL,
      ts TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.any(`CREATE INDEX IF NOT EXISTS servers_game_idx ON servers (game);`);
  await db.any(`CREATE INDEX IF NOT EXISTS servers_email_idx ON servers (email);`);
  await db.any(`CREATE INDEX IF NOT EXISTS servers_password_idx ON servers (password);`);
  await db.any(`CREATE INDEX IF NOT EXISTS servers_ip_address_idx ON servers (ip_address);`);

  await db.none(`
    INSERT INTO servers (
      game,
      email,
      password,
      ip_address
    ) VALUES (
      'minecraft',
      'blockparty-sh@yandex.com',
      crypt('password', gen_salt('bf')),
      '::ffff:127.0.0.1'
    )`
  );
})();
