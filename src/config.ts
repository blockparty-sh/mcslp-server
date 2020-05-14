import dotenv from "dotenv";
dotenv.config();

export function port() {
  return process.env.PORT || 8222;
}

export function connString() {
  return `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;
}

export function privateKey() {
  return process.env.PRIVKEY;
}
