
import util from 'node:util';
import sqlite3 from 'sqlite3';
import { selectors2where } from './finder.js';

///////////////////// Create a table

export class SQ3DataStore {

    #DB: sqlite3.Database;
    #tablenm: string;
    #indexnm: string;

    constructor(
        DB: sqlite3.Database | string,
        tablenm: string
    ) {

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
        this.#indexnm = `kv_index_${this.#tablenm}`;

        this.#DB.exec(`
            CREATE TABLE ${this.#tablenm} (
                key TEXT PRIMARY KEY,
                value TEXT
            ) WITHOUT ROWID;
            CREATE UNIQUE INDEX ${this.#indexnm}
                ON ${this.#tablenm} (key);
        `,
        (err) => {
            if (err) {
                console.error(`******** Could not create database ${this.#tablenm}`);
            }
        });

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

    async put(key: string, value: any)
        : Promise<void>
    {
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

    async update(key: string, value: any)
        : Promise<void>
    {
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

    async get(key: string)
        : Promise<any | undefined>
    {
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
     * Determines whether the database contains an item
     * with the given key.
     *
     * @param key 
     * @returns true if an item exists, false otherwise
     */
    async exists(key: string): Promise<boolean> {
        if (!this.#DB) {
            throw new Error("Database not initialized");
        }
        const that = this;
        const result = await new Promise((resolve, reject) => {
            that.#DB.all(`
                SELECT 1
                  FROM ${this.#tablenm}
                 WHERE key = $key
                `, {
                    $key: key
                },
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
        });
        if (Array.isArray(result)
         && result.length === 1
        ) {
            return true;
        } else if (Array.isArray(result)
            && result.length > 1
        ) {
            return false;
        }
        return false;
    }

    /**
     * Fetch the keys used in the table.  Optionally the
     * pattern parameter is the type of pattern used
     * in an SQL LIKE clause.
     * @param pattern An SQL LIKE pattern specifier
     * @returns Either all keys, or the ones matching the pattern
     */
    async keys(pattern?: string): Promise<string[]> {
        if (!this.#DB) {
            throw new Error("Database not initialized");
        }
        const that = this;
        const result = await new Promise((resolve, reject) => {
            // This is a big funky - BUT -
            // We can either query where "pattern" is a LIKE pattern
            // or we query for all keys.
            // That means we have two choices of query string
            // and two choices of the values object.
            that.#DB.all(
                typeof pattern === 'string'
                ? `
                SELECT DISTINCT key
                  FROM ${this.#tablenm}
                 WHERE key LIKE $pattern
                `
                : `
                SELECT DISTINCT key
                  FROM ${this.#tablenm}
                `,
                typeof pattern === 'string'
                ? {
                    $pattern: pattern
                }
                : { },
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows.map((item: any) => {
                        return item.key
                    }));
                });
        });
        if (Array.isArray(result)) {
            return result;
        } else {
            return [];
        }
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

    async findAll()
        : Promise<Array<any>>
    {

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

    async delete(key: string)
        : Promise<void>
    {
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

    async drop()
        : Promise<void>
    {
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