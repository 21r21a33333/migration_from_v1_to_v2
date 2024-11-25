const knex = require("knex");
require('dotenv').config()
if (!process.env.READ_DB_HOST) {
  throw new Error("DB_HOST not found");
}
if (!process.env.READ_DB_PORT) {
  throw new Error("DB_PORT not found");
}
if (!process.env.READ_DB_USER) {
  throw new Error("DB_USER not found");
}
if (!process.env.READ_DB_PASS) {
  throw new Error("DB_PASS not found");
}
if (!process.env.READ_DB_NAME) {
  throw new Error("DB_NAME not found");
}

const pgdb = knex({
  client: "pg",
  connection: {
    host: process.env.READ_DB_HOST,
    port: process.env.READ_DB_PORT,
    user: process.env.READ_DB_USER,
    password: process.env.READ_DB_PASS,
    database: process.env.READ_DB_NAME,
    ssl: {
      rejectUnauthorized: false,
    },
  },
  pool: {
    min: 2,
    max: 48,
  },
});

module.exports = pgdb;
