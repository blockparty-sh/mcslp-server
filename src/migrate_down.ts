/* eslint-disable camelcase */
import pgPromise from "pg-promise";
import dotenv from "dotenv";
dotenv.config();

// initializing the library:
const pgp = pgPromise();

// // database object:
const db = pgp(`postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`)

db.any(`DROP TABLE users`);
db.any(`DROP TABLE transfers`);
db.any(`DROP TABLE deposits`);
db.any(`DROP TABLE withdraws`);
db.any(`DROP TABLE tokens`);
