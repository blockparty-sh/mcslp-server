/* eslint-disable camelcase */
import pgPromise from "pg-promise";
import dotenv from "dotenv";
dotenv.config();

// initializing the library:
const pgp = pgPromise();

// // database object:
const db = pgp(`postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`)

db.any(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`)

db.any(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    game VARCHAR(32) NOT NULL,
    game_username VARCHAR(64) NOT NULL,
    balances JSONB NOT NULL DEFAULT '{}'::JSONB,
    ts TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`)
.then(() => {
  db.any(`CREATE INDEX IF NOT EXISTS users_game_idx ON users (game);`);
  db.any(`CREATE INDEX IF NOT EXISTS users_game_username_idx ON users (game_username);`);

  db.none(`INSERT INTO users (
            game,
            game_username,
            balances
          ) VALUES ('minecraft', '0000', '{ "123": "100" }')`);
});


db.any(`
  CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    send_user_id INTEGER NOT NULL,
    recv_user_id INTEGER NOT NULL,
    token_id VARCHAR(64) NOT NULL,
    amount NUMERIC NOT NULL,
    ts TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`)
.then(() => {
  db.any(`CREATE INDEX IF NOT EXISTS transfers_send_user_id_idx ON transfers (send_user_id);`);
  db.any(`CREATE INDEX IF NOT EXISTS transfers_recv_user_id_idx ON transfers (recv_user_id);`);
  db.any(`CREATE INDEX IF NOT EXISTS transfers_token_id_idx ON transfers (token_id);`);
});


db.any(`
  CREATE TABLE IF NOT EXISTS deposits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    txid VARCHAR(64) NOT NULL,
    token_id VARCHAR(64) NOT NULL,
    amount NUMERIC NOT NULL,
    ts TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`)
.then(() => {
  db.any(`CREATE INDEX IF NOT EXISTS deposits_user_id_idx ON deposits (user_id);`);
  db.any(`CREATE INDEX IF NOT EXISTS deposits_txid_idx ON deposits (txid);`);
  db.any(`CREATE INDEX IF NOT EXISTS deposits_token_id_idx ON deposits (token_id);`);
});

db.any(`
  CREATE TABLE IF NOT EXISTS withdraws (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    txid VARCHAR(64) NOT NULL,
    token_id VARCHAR(64) NOT NULL,
    amount NUMERIC NOT NULL,
    address VARCHAR(64) NOT NULL,
    ts TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`)
.then(() => {
  db.any(`CREATE INDEX IF NOT EXISTS withdraws_user_id_idx ON withdraws (user_id);`);
  db.any(`CREATE INDEX IF NOT EXISTS withdraws_txid_idx ON withdraws (txid);`);
  db.any(`CREATE INDEX IF NOT EXISTS withdraws_token_id_idx ON withdraws (token_id);`);
  db.any(`CREATE INDEX IF NOT EXISTS withdraws_address_idx ON withdraws (address);`);
});

db.any(`
  CREATE TABLE IF NOT EXISTS tokens (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    symbol VARCHAR(64) NOT NULL,
    ts TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

db.any(`
  CREATE TABLE IF NOT EXISTS servers (
    id SERIAL PRIMARY KEY,
    game VARCHAR(32) NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    ip_address INET NOT NULL,
    ts TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`)
.then(() => {
  db.any(`CREATE INDEX IF NOT EXISTS servers_game_idx ON servers (game);`);
  db.any(`CREATE INDEX IF NOT EXISTS servers_email_idx ON servers (email);`);
  db.any(`CREATE INDEX IF NOT EXISTS servers_password_idx ON servers (password);`);
  db.any(`CREATE INDEX IF NOT EXISTS servers_ip_address_idx ON servers (ip_address);`);
});
