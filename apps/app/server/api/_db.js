// The site's database: DATABASE_URL, the Postgres beside the site (apps/app/arena/compose.yaml; tables in schema.sql
// and pro.sql). One pool for every function; `sql` is a tagged template whose answer is an array of rows.
const postgres = require("postgres");

/** JSON as the functions send it: already text (`${JSON.stringify(x)}::jsonb`), passed on as it is, not encoded again. */
const json = (oid) => ({ to: oid, from: [oid], serialize: (x) => (typeof x === "string" ? x : JSON.stringify(x)), parse: JSON.parse });

let pool = null;
/** The pool, made the first time it is asked for. A value left undefined is sent as NULL. */
const db = () => (pool ??= postgres(process.env.DATABASE_URL, { max: 10, transform: { undefined: null }, types: { json: json(114), jsonb: json(3802) } }));

module.exports = { db };
