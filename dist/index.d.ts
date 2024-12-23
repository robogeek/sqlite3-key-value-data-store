import sqlite3 from 'sqlite3';
export declare class SQ3DataStore {
    #private;
    constructor(DB: sqlite3.Database | string, tablenm: string);
    get DB(): sqlite3.Database;
    put(key: string, value: any): Promise<void>;
    update(key: string, value: any): Promise<void>;
    get(key: string): Promise<any | undefined>;
    /**
     * Determines whether the database contains an item
     * with the given key.
     *
     * @param key
     * @returns true if an item exists, false otherwise
     */
    exists(key: string): Promise<boolean>;
    /**
     * Fetch the keys used in the table.  Optionally the
     * pattern parameter is the type of pattern used
     * in an SQL LIKE clause.
     * @param pattern An SQL LIKE pattern specifier
     * @returns Either all keys, or the ones matching the pattern
     */
    keys(pattern?: string): Promise<string[]>;
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
    find(selectors: any): Promise<Array<any> | undefined>;
    findAll(): Promise<Array<any>>;
    delete(key: string): Promise<void>;
    drop(): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map