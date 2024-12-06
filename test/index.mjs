
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { SQ3DataStore } from '../dist/index.js';
import { assert, util } from 'chai';

import sqlite3 from 'sqlite3';
import * as sqlite_regex from "sqlite-regex";

const __filename = import.meta.filename;
const __dirname = import.meta.dirname;

let DB; // : Database;

// TODO enable tracing on SQLITE3

describe('Set up DB', function() {
    let table;
    it('should initialize SQLITE3 in-memory', function() {
        try {
            table = new SQ3DataStore(':memory:', 'firsttable');
        } catch (err) {
            console.error(err.stack);
            throw err;
        }
    });

    it('should save database handle', function() {
        DB = table.DB;
        assert.ok(DB instanceof sqlite3.Database);
    });

    it('should install REGEXP extension', async function() {

        const regexp_loadable_path
                = sqlite_regex.getLoadablePath();
        await new Promise((resolve, reject) => {
            DB.loadExtension(regexp_loadable_path, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(undefined);
                }
            });
        });
    });

    it('should drop first table', function() {
        table.drop();
    });

});

describe('SINGLE KVS ITEM', function() {

    let table;

    it('should create a kvs table', async function() {
        table = new SQ3DataStore(DB, 'table1');
    });

    it('should store value in kvs table', async function() {
        let result;
        try {
            result = await table.put('key1', {
                value1: 'Here I am',
                value2: 'JH'
            });
        } catch (err) {
            console.error('ERROR', err.stack);
            throw err;
        }
        console.log(result);
    });

    it('should retrieve stored value', async function() {
        const value = await table.get('key1');
        // console.log(value);
        assert.equal(typeof value, 'object');
        assert.deepEqual(value, {
            value1: 'Here I am',
            value2: 'JH'
        });
    });

    it('should update with new value', async function() {
        await table.update('key1', {
            question: 'What is the ultimate question of life, the universe, and everything',
            answer: 42
        });
    });

    it('should retrieve updated value', async function() {
        const value = await table.get('key1');
        // console.log(value);
        assert.equal(typeof value, 'object');
        assert.deepEqual(value, {
            question: 'What is the ultimate question of life, the universe, and everything',
            answer: 42
        });
    });

    it('should delete the item', async function() {
        await table.delete('key1');
    });

    it('should not retrieve stored value', async function() {
        const value = await table.get('key1');
        // console.log(value);
        assert.ok(typeof value === 'undefined');
    });

    it('should not retrieve value for bad key', async function() {
        const value = await table.get('BAD22222B0NE');
        // console.log(value);
        assert.ok(typeof value === 'undefined');
    });

    it('should not store bad KEY (undefined) in kvs table', async function() {
        let result;
        let errored = false;
        try {
            result = await table.put(undefined, {
                value1: 'Here I am',
                value2: 'JH'
            });
        } catch (err) {
            errored = true;
            // console.error('ERROR', err.stack);
            // throw err;
        }
        // console.log(result);
        assert.ok(errored);
    });

    it('should store numerical KEY in kvs table', async function() {
        let result;
        let errored = false;
        try {
            result = await table.put(42, {
                value1: 'Here I am',
                value2: 'JH 42'
            });
        } catch (err) {
            errored = true;
            console.error('ERROR', err.stack);
            // throw err;
        }
        // console.log(result);
        assert.ok(!errored);
    });

    it('should retrieve value for numerical key', async function() {
        const value = await table.get(42);
        // console.log({ key: 42, value  });
        assert.deepEqual(value, {
            value1: 'Here I am',
            value2: 'JH 42'
        });
    });

    it('should delete table', async function() {
        await table.drop();
    });

    // These are difficult to test.  They're auto-converted to text
    // FAIL Try inserting with key = { object values }
    // FAIL Try inserting with key = [ array values ]
    // FAIL Try inserting with key = 'key' value = BAD
});

const dataset1 = [
    { a: 1, b: 2, c: 3, d: 4, e: 5 },       // key0
    { a: 6, b: 7, c: 8, d: 9, e: 10 },      // key1
    { a: 11, b: 12, c: 13, d: 14, e: 15 },  // key2
    { a: 16, b: 17, c: 18, d: 19, e: 20 },  // key3

    { a: 1, b: 2, c: 3, d: 4, e: 5 },       // key4
    { a: 6, b: 7, c: 8, d: 9, e: 10 },      // key5
    { a: 11, b: 12, c: 13, d: 14, e: 15 },  // key6
    { a: 16, b: 17, c: 18, d: 19, e: 20 },  // key7
];

const dataText = [
    { name: 'John Smith', city: 'Burbank',
        path: '/some/where/john-smith.html'
    },
    { name: 'Ioan Iliescu', city: 'Bucuresti',
        path: '/some/where/ro/iliescu.html'
    },
    { name: 'ALL', city: 'EVERYWHERE',
        path: 'index.html'
    }
];

describe('MULTIPLE ITEMS', function() {

    let table;

    it('should create a kvs table', function() {
        table = new SQ3DataStore(DB, 'multi');
    });

    it('should add multiple items to table', async function() {
        let i = 0;
        let errored = false;
        for (const item of dataset1) {
            try {
                await table.put(`key${i++}`, item);
            } catch (err) {
                errored = true;
                console.error(err.stack);
            }
        }
        assert.ok(!errored);
    });

    it('should retrieve 4th item', async function() {
        const value = await table.get('key3');
        // console.log(`GET 'key3' ${util.inspect(value)}`);
        assert.deepEqual(value, { a: 16, b: 17, c: 18, d: 19, e: 20 });
    });

    // Try find({ fieldnm: 'value' })
    it('should find a value simple equal', async function() {
        const rows = await table.find({
            '$.a': 1
        });

        // console.log(rows);
        for (const row of rows) {
            assert.deepEqual(row,
                { a: 1, b: 2, c: 3, d: 4, e: 5 }
            );
        }
    });

    // Try find({ fidlenm: { eq: 'value' }})
    it('should find a value eq operator', async function() {
        const rows = await table.find({
            '$.a': { eq: 1 }
        });

        // console.log(rows);
        for (const row of rows) {
            assert.deepEqual(row,
                { a: 1, b: 2, c: 3, d: 4, e: 5 }
            );
        }
    });

    // Try find({ fidlenm: { gt: 'value' }})
    it('should find a value gt operator', async function() {
        const rows = await table.find({
            '$.b': { gt: 1 }
        });

        // console.log(rows);
        assert.deepEqual(rows,[
            { a: 1, b: 2, c: 3, d: 4, e: 5 },
            { a: 6, b: 7, c: 8, d: 9, e: 10 },
            { a: 11, b: 12, c: 13, d: 14, e: 15 },
            { a: 16, b: 17, c: 18, d: 19, e: 20 },
            { a: 1, b: 2, c: 3, d: 4, e: 5 },
            { a: 6, b: 7, c: 8, d: 9, e: 10 },
            { a: 11, b: 12, c: 13, d: 14, e: 15 },
            { a: 16, b: 17, c: 18, d: 19, e: 20 }
        ]);
    });

    // Try find({ fidlenm: { lt: 'value' }})
    it('should find a value lt operator', async function() {
        const rows = await table.find({
            '$.b': { lt: 10 }
        });

        // console.log(rows);
        assert.deepEqual(rows, [
            { a: 1, b: 2, c: 3, d: 4, e: 5 },
            { a: 6, b: 7, c: 8, d: 9, e: 10 },
            { a: 1, b: 2, c: 3, d: 4, e: 5 },
            { a: 6, b: 7, c: 8, d: 9, e: 10 }
        ]);
    });

    // Try find({
    //      field1nm: 'value'
    //      field2nm: 'value'
    // })
    it('should find a value multiple simple equal', async function() {
        const rows = await table.find({
            '$.a': 1,
            '$.b': 2
        });

        // console.log(rows);
        for (const row of rows) {
            assert.deepEqual(row,
                { a: 1, b: 2, c: 3, d: 4, e: 5 }
            );
        }
    });

    // Try find({
    //      field1nm: { eq: 'value' }
    //      field2nm: { lt: 'value' }
    // })
    it('should find a value eq/lt operators', async function() {
        const rows = await table.find({
            '$.b': { eq: 2 },
            '$.c': { lt: 8 }
        });

        // console.log(rows);
        assert.deepEqual(rows, [
            { a: 1, b: 2, c: 3, d: 4, e: 5 },
            { a: 1, b: 2, c: 3, d: 4, e: 5 } ]
        );
    });

    // Try find({
    //      field1nm: { gt: 'value' }
    //      field2nm: { lt: 'value' }
    // })
    it('should find a value gt/lt operators', async function() {
        const rows = await table.find({
            '$.b': { gt: 1 },
            '$.b': { lt: 7 }
        });

        // console.log(rows);
        assert.deepEqual(rows, [
            { a: 1, b: 2, c: 3, d: 4, e: 5 },
            { a: 1, b: 2, c: 3, d: 4, e: 5 }
        ]);
    });

    it('should add text items to table', async function() {
        let i = 0;
        let errored = false;
        for (const item of dataText) {
            try {
                await table.put(`keytxt${i++}`, item);
            } catch (err) {
                errored = true;
                console.error(err.stack);
            }
        }
        assert.ok(!errored);
    });

    it('should retrieve all items', async function() {
        const rows = await table.findAll();
        assert.deepEqual(rows, [
            { a: 1, b: 2, c: 3, d: 4, e: 5 },
            { a: 6, b: 7, c: 8, d: 9, e: 10 },
            { a: 11, b: 12, c: 13, d: 14, e: 15 },
            { a: 16, b: 17, c: 18, d: 19, e: 20 },
            { a: 1, b: 2, c: 3, d: 4, e: 5 },
            { a: 6, b: 7, c: 8, d: 9, e: 10 },
            { a: 11, b: 12, c: 13, d: 14, e: 15 },
            { a: 16, b: 17, c: 18, d: 19, e: 20 },
            {
              name: 'John Smith',
              city: 'Burbank',
              path: '/some/where/john-smith.html'
            },
            {
              name: 'Ioan Iliescu',
              city: 'Bucuresti',
              path: '/some/where/ro/iliescu.html'
            },
            { name: 'ALL', city: 'EVERYWHERE', path: 'index.html' }
          ]);
    });

    // Try find({ fidlenm: { like: '%value%' }})
    it('should find a value LIKE operator', async function() {
        const rows = await table.find({
            '$.name': { like: '%Smith%' }
        });

        // console.log(rows);
        assert.deepEqual(rows, [
            {
              name: 'John Smith',
              city: 'Burbank',
              path: '/some/where/john-smith.html'
            }
        ]);
    });

    it('should find a value simple equal and LIKE operator', async function() {
        const rows = await table.find({
            '$.name': 'ALL',
            '$.name': { like: '%Ioan%' }
        });

        // console.log(rows);
        assert.deepEqual(rows, [
            {
              name: 'Ioan Iliescu',
              city: 'Bucuresti',
              path: '/some/where/ro/iliescu.html'
            }
        ]);
    });

    // Try find({ fidlenm: { regex: 'REGEX' }})
    it('should find a value REGEX operator', async function() {
        const rows = await table.find({
            '$.name': { regexp: '.*Smith.*' }
        });

        // console.log(rows);
        assert.deepEqual(rows, [
            {
              name: 'John Smith',
              city: 'Burbank',
              path: '/some/where/john-smith.html'
            }
        ]);
    });

    it('should find a value REGEX operator', async function() {
        const rows = await table.find({
            '$.city': { regexp: '^Buc.*' }
        });

        // console.log(rows);
        assert.deepEqual(rows, [
            {
              name: 'Ioan Iliescu',
              city: 'Bucuresti',
              path: '/some/where/ro/iliescu.html'
            }
        ]);
    });


    // Try find({ fidlenm: { glob: 'REGEX' }})
    it('should find a value GLOB operator', async function() {
        const rows = await table.find({
            '$.path': { glob: '**/index.html' }
        });

        assert.deepEqual(rows, []);
    });
    it('should find a value GLOB operator', async function() {
        const rows = await table.find({
            '$.path': { glob: '**/*.html' }
        });

        assert.deepEqual(rows, [
            {
              name: 'John Smith',
              city: 'Burbank',
              path: '/some/where/john-smith.html'
            },
            {
              name: 'Ioan Iliescu',
              city: 'Bucuresti',
              path: '/some/where/ro/iliescu.html'
            }
        ]);
    });

    // THIS REQUIRES IMPLEMENTING OR
    // it('should find a value OR (REGEXP and GLOB) operator', async function() {
    //     const rows = await table.find({
    //         OR: [
    //             { '$.name': { regexp: '.*John.*' } },
    //             { '$.path': { glob: 'index.*' } }
    //         ]
    //     });

    //     console.log(rows);
    //     assert.deepEqual(rows, [
    //         {
    //           name: 'Ioan Iliescu',
    //           city: 'Bucuresti',
    //           path: '/some/where/ro/iliescu.html'
    //         }
    //     ]);
    // });

    // Try find({
    //      field1nm: { eq: 'value' }
    //      field2nm: { like: '%value%' }
    // })
    // Try find({
    //      field1nm: { regex: 'REGEX' }
    //      field2nm: { lt: 'value' }
    // })
    // try find({
    //      or: [
    //          { field1nm: 'value' },
    //          { field2nm: 'value' },
    //      ]
    // })
    // try find({
    //      or: [
    //          { field1nm: 'value' },
    //          { field2nm: { eq: 'value' }},
    //      ]
    // })
    // try find({
    //      or: [
    //          { field1nm: 'value' },
    //          { field2nm: { gt: 'value' }},
    //      ]
    // })
    // try find({
    //      or: [
    //          { field1nm: 'value' },
    //          { field2nm: { lt: 'value' }},
    //      ]
    // })
    // try find({
    //      or: [
    //          { field1nm: 'value' },
    //          { field2nm: { like: 'value' }},
    //      ]
    // })
    // try find({
    //      or: [
    //          { field1nm: 'value' },
    //          { field2nm: { regex: 'REGEX' }},
    //      ]
    // })

    it('should delete table', async function() {
        await table.drop();
    });

});


describe('MULTIPLE TABLES', function() {

    let table1;
    let table2;

    it('should create kvs tables', async function() {
        table1 = new SQ3DataStore(DB, 'multi1');
        table2 = new SQ3DataStore(DB, 'multi2');
    });

    // Add items to table 1
    // Add items to table 2
    // Query table 1 items in table 1
    // Query table 2 items in table 2
    // FAIL Query table 1 items in table 2
    // FAIL Query table 2 items in table 1

    it('should delete tables', async function() {
        await table1.drop();
        await table2.drop();
    });

});
