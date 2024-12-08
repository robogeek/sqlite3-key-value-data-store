import sqlite3 from 'sqlite3';
/**
 * Use an existing DB
 * @param db
 */
/**
 * Open a database connection to the
 * named location.
 *
 * @param dburl
 */
export declare class SQ3DataStore {
    #private;
    constructor(DB: sqlite3.Database | string, tablenm: string);
    get DB(): sqlite3.Database;
    put(key: string, value: any): Promise<void>;
    update(key: string, value: any): Promise<void>;
    get(key: string): Promise<any | undefined>;
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