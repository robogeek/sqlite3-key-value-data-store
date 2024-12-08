
import util from 'node:util';
import sqlite3 from 'sqlite3';
import { selectors2where } from './finder.js';
// import sqdb from './sqdb.js';

// PROBLEM - @akashacms/plugns-tagged-content
// is using PouchDB which then brought in
// a lot of unwanted dependencies in the
// LevelDown arena.
//
// It should be possible to use SQLITE3 to
// implement a key/value store.  This could
// also eliminate the need for KeyV in another
// plugin.
//
// Another goal is to spin this off into its
// own package that might be of broad interest.


// Simple key/value store on SQLITE3.
// Support multiple stores - named
// Each store has its own table

// CREATE TABLE kvs${NAME} (
//    key TEXT
//    value JSON
// )
// The key column needs an index and to
// be unique

// Is there a way to ALTER TABLE to add
// columns based on a JSON field?

// To replace pouchdb use in tagged-content
// there's a need for queries on fields of
// the JSON object

// This encapsulates an object with put/get/delete
// methods for the key-value-store.
// If ALTER TABLE is useful then an API is
// needed for adding a queryable column.

// https://github.com/kujirahand/node-sqlite-kvs
// That's a simplistic KVS which can be used
// as a model

// Once this is complete it can be spun off to
// a standalone module.


// CREATE TABLE kvs{NAME} (
//     key TEXT PRIMARY KEY,
//     value JSON // isJSON=true
// ) WITHOUT ROWID;


// sqlite> SELECT 
//       vpath,
//       json_extract(info, '$.renderPath') as renderPath2 
// FROM DOCUMENTS
// WHERE renderPath2 LIKE '%index.html';

////////////////// Opening Database connection

// let DB: sqlite3.Database;

/**
 * Use an existing DB
 * @param db 
 */
// export function useDB(db: sqlite3.Database) {
//     DB = db;
// }

/**
 * Open a database connection to the
 * named location.
 *
 * @param dburl 
 */
// export function open(dburl: string) {
//     DB = new sqlite3.Database(dburl);
// }

///////////////////// Create a table

// export async function kvtable(name: string) {
//     const tablenm = `kv${name}`;
//     const indexnm = `kv_index_${name}`;
//     const result = await DB.exec(`
//         CREATE TABLE ${tablenm} (
//             key TEXT PRIMARY KEY,
//             value TEXT
//         ) WITHOUT ROWID;
//         CREATE UNIQUE INDEX ${indexnm}
//             ON ${tablenm} (key);
//     `);

//     return new SQ3DataStore(DB, tablenm);
// }

export class SQ3DataStore {

    #DB: sqlite3.Database;
    #tablenm: string;
    #indexnm: string;

    constructor(
            DB: sqlite3.Database | string,
            tablenm: string) {

        if (typeof DB === 'object'
         && DB instanceof sqlite3.Database
        ) {
            this.#DB = DB;
        } else if (typeof DB === 'string') {
            this.#DB = new sqlite3.Database(DB);
        } else {
            this.#DB = new sqlite3.Database(':memory:');
        }

        // this.#DB.on('trace', (sql) => {
        //     console.log(`TRACE: ${sql}`);
        // });

        this.#tablenm = tablenm;

        this.#indexnm = `kv_index_${tablenm}`;
        this.#DB.exec(`
            CREATE TABLE ${tablenm} (
                key TEXT PRIMARY KEY,
                value TEXT
            ) WITHOUT ROWID;
            CREATE UNIQUE INDEX ${this.#indexnm}
                ON ${this.#tablenm} (key);
        `);

    }

    get DB(): sqlite3.Database { return this.#DB; }

    // This can be useful for debugging.
    // This SQLITE query retrieves the table listing
    // all the existing tables.

    // async tables() {
    //     const rows = await new Promise((resolve, reject) => {
    //         this.#DB.all(`
    //             SELECT * FROM sqlite_master;
    //         `, {},
    //         (err, rows) => {
    //             if (err) {
    //                 console.error(`put ERROR `, err.stack);
    //                 reject(err);
    //             } else {
    //                 resolve(rows);
    //             }
    //         });
    //     });
    //     return rows;
    // }

    async put(key: string, value: any): Promise<void> {
        // insert into ...
        // console.log(`before get ${key}`);
        const update = await this.get(key);
        // console.log(`put ${key} got value ${util.inspect(update)}`);
        if (update) {
            return this.update(key, value);
        }
        // console.log(`to put ${key}`, value);
        await new Promise((resolve, reject) => {
            this.#DB.run(`
                INSERT INTO "${this.#tablenm}"
                ( key, value )
                VALUES (
                    $key, $value
                )
            `, {
                $key: key,
                $value: JSON.stringify(value)
            },
            (err) => {
                if (err) {
                    console.error(`put ERROR `, err.stack);
                    reject(err);
                } else {
                    resolve(undefined);
                }
            });
        }) 
        // console.log(`did put ${key}`);
    }

    async update(key: string, value: any): Promise<void> {
        // console.log(`to update ${key}`, value);
        const that = this;
        const result = await new Promise((resolve, reject) => {
            that.#DB.run(`
                UPDATE ${this.#tablenm}
                   SET value = $value
                 WHERE key = $key
            `, {
                $key: key,
                $value: JSON.stringify(value)
            },
            (err) => {
                if (err) {
                    console.error(`update ERROR`, err.stack);
                    reject(err);
                } else resolve(undefined);
            });
        });
        // console.log(`updated ${key}`);
    }

    async get(key: string): Promise<any | undefined> {
        // ... get item from table
        // console.log(`get ${key}`);
        const that = this;
        const result = await new Promise((resolve, reject) => {
            that.#DB.all(`
                SELECT value
                  FROM ${this.#tablenm}
                 WHERE key = $key
            `, {
                // $tablenm: this.#tablenm,
                $key: key
            },
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        // console.log(`got ${key}`, result);
        if (Array.isArray(result)
         && result.length === 1
        ) {
            const v1 = result[0];
            if (typeof v1 === 'object'
             && 'value' in v1
             && typeof v1['value'] === 'string'
            ) {
                return JSON.parse(v1['value']);
            } else {
                throw new Error(`Database had incorrect value field for ${key} ${util.inspect(v1)}`);
            }
        } else if (Array.isArray(result)
            && result.length > 1
        ) {
            throw new Error(`Got more than one item for ${key} -- ${util.inspect(result)}`);
        }
        
        return undefined;
    }

    /**
     * 
     * [
     *  { '$.foo.bar': 'value' },
     *  { '$.foo.bar1': 'value1' },
     *  { '$OR': [
     *     { '$.foo.zab': { gt: 'value } }
     *  ] }
     * ]
     * 
     * 
     * {
     *  '$.foo.bar': 'value',
     *  '$.foo.bar1': 'value1'
     *  '$.foo.bar2': { lt: 'value' },
     *  '$OR': [
     *  ]
     * }
     * 
     * @param selector 
     */
    async find(selectors: any)
        : Promise<Array<any> | undefined>
    {
        let where = selectors2where(selectors);

        // console.log(where);

        const query = `
                SELECT key, value
                  FROM ${this.#tablenm}
                 WHERE ${where}
            `;
        // console.log(query);

        try {
            const that = this;
            const rows = await new Promise((resolve, reject) => {
                that.#DB.all(query, { },
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            }) as any[];

            // console.log(`find ${util.inspect(rows)}`);
            return rows.map(row => {
                return JSON.parse(row.value);
            });
        } catch (err: any) {
            console.log(`find ERROR `, err.stack);
            throw err;
        }
    }

    async findAll(): Promise<Array<any>> {

        const query = `
                SELECT key, value
                  FROM ${this.#tablenm}
            `;
        const that = this;
        const rows = await new Promise((resolve, reject) => {
            that.#DB.all(query, { },
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        }) as any[];

        return rows.map(row => {
            return JSON.parse(row.value);
        });
    }

    async delete(key: string): Promise<void> {
        // .. delete item from table
        await new Promise((resolve, reject) => {
            this.#DB.run(`
                DELETE
                  FROM ${this.#tablenm}
                 WHERE key = $key
            `, {
                // $tablenm: this.#tablenm,
                $key: key
            },
            (err) => {
                if (err) {
                    console.error(`delete ERROR`, err.stack);
                    reject(err);
                } else {
                    resolve(undefined);
                }
            });
        });
    }

    async drop(): Promise<void> {
        // ... DROP TABLE
        await new Promise((resolve, reject) => {
            this.#DB.run(`
                DROP TABLE ${this.#tablenm}
            `, { },
            (err) => {
                if (err) {
                    console.error(`delete ERROR`, err.stack);
                    reject(err);
                } else {
                    resolve(undefined);
                }
            });
        });
    }
}