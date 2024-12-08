
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { SQ3DataStore } from '../dist/index.js';
import { selectors2where } from '../dist/finder.js';
import { assert, util } from 'chai';

import sqlite3 from 'sqlite3';
import * as sqlite_regex from "sqlite-regex";

const __filename = import.meta.filename;
const __dirname = import.meta.dirname;

let DB; // : Database;

// TODO enable tracing on SQLITE3

//////// Test the construction of selectors
//  for the find method

describe('SELECTORS for find method', function() {
    it('should format simple equal', function() {
        const where = selectors2where({
            foo: 'bar',
            '$.count': 42,
            '$.truth': true,
            '$.falsity': false
        });

        assert.ok(where.includes(" 'foo')"));
        assert.ok(where.includes(" 'bar' "));
        assert.ok(where.includes(" '$.count')"));
        assert.ok(where.includes(" 42 "));
        assert.ok(where.includes(" '$.truth')"));
        assert.ok(where.includes(" true "));
        assert.ok(where.includes(" '$.falsity')"));
        assert.ok(where.includes(" false "));
    });

    it('should format simple $eq', function() {
        const where = selectors2where({
            '$.foo': { $eq: 'bar' }
        });
        // console.log(where);
        assert.ok(where.includes(" '$.foo')"));
        assert.ok(where.includes(" == "));
        assert.ok(where.includes(" 'bar' "));
    });

    it('should format simple $lt', function() {
        const where = selectors2where({
            foo: { $lt: 'bar' }
        });
        // console.log(where);
        assert.ok(where.includes(" 'foo')"));
        assert.ok(where.includes(" < "));
        assert.ok(where.includes(" 'bar' "));
    });

    it('should format simple $lte', function() {
        const where = selectors2where({
            foo: { $lte: 'bar' }
        });
        // console.log(where);
        assert.ok(where.includes(" 'foo')"));
        assert.ok(where.includes(" <= "));
        assert.ok(where.includes(" 'bar' "));
    });

    it('should format simple $gt', function() {
        const where = selectors2where({
            foo: { $gt: 'bar' }
        });
        // console.log(where);
        assert.ok(where.includes(" 'foo')"));
        assert.ok(where.includes(" > "));
        assert.ok(where.includes(" 'bar' "));
    });

    it('should format simple $gte', function() {
        const where = selectors2where({
            foo: { $gte: 'bar' }
        });
        // console.log(where);
        assert.ok(where.includes(" 'foo')"));
        assert.ok(where.includes(" >= "));
        assert.ok(where.includes(" 'bar' "));
    });

    it('should format simple $ne', function() {
        const where = selectors2where({
            foo: { $ne: 'bar' }
        });
        // console.log(where);
        assert.ok(where.includes(" 'foo')"));
        assert.ok(where.includes(" <> "));
        assert.ok(where.includes(" 'bar' "));
    });

    it('should format simple $exists', function() {
        const where = selectors2where({
            foo: { $exists: 'bar' }
        });
        // console.log(where);
        assert.ok(where.includes(" 'foo')"));
    });

    it('should format simple $like', function() {
        const where = selectors2where({
            foo: { $like: '%bar%' }
        });
        // console.log(where);
        assert.ok(where.includes(" 'foo')"));
        assert.ok(where.includes(" LIKE "));
        assert.ok(where.includes(" '%bar%' "));
    });

    it('should format simple $regexp', function() {
        const where = selectors2where({
            foo: { $regexp: '.*bar.*' }
        });
        // console.log(where);
        assert.ok(where.includes(" 'foo')"));
        assert.ok(where.includes(" regexp "));
        assert.ok(where.includes(" '.*bar.*' "));
    });

    it('should format simple $glob', function() {
        const where = selectors2where({
            foo: { $glob: '**/bar.*' }
        });
        // console.log(where);
        assert.ok(where.includes(" 'foo')"));
        assert.ok(where.includes(" GLOB "));
        assert.ok(where.includes(" '**/bar.*' "));
    });

    it('should format multiple queries', function() {
        const where = selectors2where({
            foo: 'bar',
            index: { $glob: '**/index.html' },
            reg1: { $regexp: '^reg1' },
            reg2: { $regexp: '^reg2' }
        });
        // console.log(where);

        assert.notInclude(where, ' OR ');
        assert.include(where, ' AND ');
        assert.ok(where.includes(" 'index')"));
        assert.ok(where.includes(" GLOB "));
        assert.ok(where.includes(" '**/index.html' "));
        assert.ok(where.includes(" 'reg1')"));
        assert.ok(where.includes(" regexp "));
        assert.ok(where.includes(" '^reg1' "));
        assert.ok(where.includes(" 'reg2')"));
        assert.ok(where.includes(" regexp "));
        assert.ok(where.includes(" '^reg2' "));
    });

    // ( 
    //   (
    //     EXISTS json_extract(value, 'foo')
    //     AND json_extract(value, 'foo') == 'bar' 
    //   )
    //   AND 
    //   (
    //     EXISTS json_extract(value, 'index')
    //     AND json_extract(value, 'index') GLOB '**/index.html'
    //   )
    //   AND 
    //   ( 
    //     ( 
    //       ( 
    //         EXISTS json_extract(value, 'reg1') 
    //         AND json_extract(value, 'reg1') regexp '^reg1'
    //       )
    //     )
    //     OR
    //     (
    //       (
    //         EXISTS json_extract(value, 'reg2')
    //         AND json_extract(value, 'reg2') regexp '^reg2'
    //       )
    //     )
    //   )
    // )
    it('should format nested queries', function() {
        const where = selectors2where({
            foo: 'bar',
            index: { $glob: '**/index.html' },
            $or: [
                { reg1: { $regexp: '^reg1' } },
                { reg2: { $regexp: '^reg2' } }
            ]
        });
        // console.log(where);

        assert.include(where, ' OR ');
        assert.include(where, ' AND ');
        assert.ok(where.includes(" 'index')"));
        assert.ok(where.includes(" GLOB "));
        assert.ok(where.includes(" '**/index.html' "));
        assert.ok(where.includes(" 'reg1')"));
        assert.ok(where.includes(" regexp "));
        assert.ok(where.includes(" '^reg1' "));
        assert.ok(where.includes(" 'reg2')"));
        assert.ok(where.includes(" regexp "));
        assert.ok(where.includes(" '^reg2' "));
    });

});

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
        try {
            table = new SQ3DataStore(DB, 'table1');
        } catch (err) {
            console.error(err.stack);
            throw err;
        }
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
        // console.log(result);
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
            '$.a': { $eq: 1 }
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
            '$.b': { $gt: 1 }
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
            '$.b': { $lt: 10 }
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
            '$.b': { $eq: 2 },
            '$.c': { $lt: 8 }
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
            '$.b': { $gt: 1 },
            '$.b': { $lt: 7 }
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
            '$.name': { $like: '%Smith%' }
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
            $notnull: '$.name',
            '$.name': 'ALL',
            '$.name': { $like: '%Ioan%' }
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
            $notnull: '$.name',
            '$.name': { $regexp: '.*Smith.*' }
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
            $notnull: '$.city',
            '$.city': { $regexp: '^Buc.*' }
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
            '$.path': { $glob: '**/index.html' }
        });

        assert.deepEqual(rows, []);
    });
    it('should find a value GLOB operator', async function() {
        const rows = await table.find({
            '$.path': { $glob: '**/*.html' }
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

const complexData = [

    {
        vpath: 'partials-nunjucks.html.njk',
        mime: 'text/x-nunjucks',
        renderPath: 'partials-nunjucks.html',
        rendersToHTML: true,
        dirname: '.',
        parentDir: '/',
        mtimeMs: '2024-11-15T16:52:01.798Z',
        docMetadata: {
          layout: 'default.html.ejs',
          title: 'Partials',
          publicationDate: '2021-11-10T00:00:00.000Z',
          tags: []
        },
        index: 1
    },

    {
        vpath: 'markdoc-test.html.markdoc',
        mime: 'text/x-markdoc',
        renderPath: 'markdoc-test.html',
        rendersToHTML: true,
        dirname: '.',
        parentDir: '/',
        mtimeMs: '2022-11-06T05:57:57.971Z',
        docMetadata: {
          title: 'Markdoc test using the standard Markdown test',
          layout: 'default-once.html.ejs',
          tags: []
        },
        index: 2
    },

    {
        vpath: 'hier-broke/dir1/sibling.html.md',
        mime: 'text/markdown',
        renderPath: 'hier-broke/dir1/sibling.html',
        rendersToHTML: true,
        dirname: 'hier-broke/dir1',
        parentDir: 'hier-broke',
        mtimeMs: '2022-09-21T19:34:54.577Z',
        docMetadata: {
          title: 'dir1 sibling item',
          layout: 'default.html.ejs',
          publicationDate: '2021-11-30T00:00:00.000Z',
          tags: []
        },
        index: 3
    },

    {
        vpath: 'subdir/shown-content-local.html.md',
        mime: 'text/markdown',
        renderPath: 'subdir/shown-content-local.html',
        rendersToHTML: true,
        dirname: 'subdir',
        parentDir: '.',
        mtimeMs: '2022-09-21T19:34:33.816Z',
        docMetadata: {
          layout: 'default.html.ejs',
          title: 'Shown LOCAL Content - solely for use of show-content-local.html',
          publicationDate: '2021-11-28T00:00:00.000Z',
          tags: []
        },
        index: 4,
        // Set this only here
        exists: true,
        null: null
    }
];

describe('COMPLEX QUERIES', function() {

    let table;

    it('should create kvs table', async function() {
        try {
            table = new SQ3DataStore(DB, 'complex');
        } catch (err) {
            console.error(err.stack);
            throw err;
        }
        // table = new SQ3DataStore(DB, 'complex');
    });

    // it('should have complex table', async function() {
    //     try {
    //         const tables = await table.tables();
    //         console.log(tables);
    //     } catch (err) {
    //         console.error(err.stack);
    //         throw err;
    //     }
    // });

    it('should add multiple items to table', async function() {
        let i = 0;
        let errored = false;
        for (const item of complexData) {
            try {
                await table.put(`key${i++}`, item);
            } catch (err) {
                errored = true;
                console.error(err.stack);
            }
        }
        assert.ok(!errored);
    });

    it('should retrieve partials-nunjucks.html.njk simple equal', async function() {

        const found = await table.find({
            '$.vpath': 'partials-nunjucks.html.njk'
        });

        // console.log(found);
        assert.ok(Array.isArray(found));
        assert.ok(found.length === 1);
        assert.equal(found[0].vpath, 'partials-nunjucks.html.njk');
    });

    it('should retrieve partials-nunjucks.html.njk $eq', async function() {

        const found = await table.find({
            '$.vpath': {
                $eq: 'partials-nunjucks.html.njk'
            }
        });

        // console.log(found);
        assert.ok(Array.isArray(found));
        assert.ok(found.length === 1);
        assert.equal(found[0].vpath, 'partials-nunjucks.html.njk');
    });

    it('should retrieve $lt', async function() {

        const found = await table.find({
            '$.index': { $lt: 2 }
        });

        // console.log(found);
        assert.ok(Array.isArray(found));
        assert.ok(found.length === 1);
        assert.equal(found[0].vpath, 'partials-nunjucks.html.njk');
        assert.equal(found[0].index, 1);
    });

    it('should retrieve $lte', async function() {

        const found = await table.find({
            '$.index': { $lte: 2 }
        });

        // console.log(found);
        assert.ok(Array.isArray(found));
        assert.ok(found.length === 2);
        assert.equal(found[0].vpath, 'partials-nunjucks.html.njk');
        assert.equal(found[0].index, 1);
        assert.equal(found[1].vpath, 'markdoc-test.html.markdoc');
        assert.equal(found[1].index, 2);
    });

    it('should retrieve $gt', async function() {

        const found = await table.find({
            '$.index': { $gt: 3 }
        });

        // console.log(found);
        assert.ok(Array.isArray(found));
        assert.ok(found.length === 1);
        assert.equal(found[0].vpath, 'subdir/shown-content-local.html.md');
        assert.equal(found[0].index, 4);
    });

    it('should retrieve $gte', async function() {

        const found = await table.find({
            '$.index': { $gte: 3 }
        });

        // console.log(found);
        assert.ok(Array.isArray(found));
        assert.ok(found.length === 2);
        assert.equal(found[0].vpath, 'hier-broke/dir1/sibling.html.md');
        assert.equal(found[0].index, 3);
        assert.equal(found[1].vpath, 'subdir/shown-content-local.html.md');
        assert.equal(found[1].index, 4);
    });

    it('should retrieve $ne', async function() {

        const found = await table.find({
            '$.index': { $ne: 3 }
        });

        // console.log(found);
        assert.ok(Array.isArray(found));
        assert.ok(found.length === 3);
        assert.deepEqual(found, [
            {
              vpath: 'partials-nunjucks.html.njk',
              mime: 'text/x-nunjucks',
              renderPath: 'partials-nunjucks.html',
              rendersToHTML: true,
              dirname: '.',
              parentDir: '/',
              mtimeMs: '2024-11-15T16:52:01.798Z',
              docMetadata: {
                layout: 'default.html.ejs',
                title: 'Partials',
                publicationDate: '2021-11-10T00:00:00.000Z',
                tags: []
              },
              index: 1
            },
            {
              vpath: 'markdoc-test.html.markdoc',
              mime: 'text/x-markdoc',
              renderPath: 'markdoc-test.html',
              rendersToHTML: true,
              dirname: '.',
              parentDir: '/',
              mtimeMs: '2022-11-06T05:57:57.971Z',
              docMetadata: {
                title: 'Markdoc test using the standard Markdown test',
                layout: 'default-once.html.ejs',
                tags: []
              },
              index: 2
            },
            {
              vpath: 'subdir/shown-content-local.html.md',
              mime: 'text/markdown',
              renderPath: 'subdir/shown-content-local.html',
              rendersToHTML: true,
              dirname: 'subdir',
              parentDir: '.',
              mtimeMs: '2022-09-21T19:34:33.816Z',
              docMetadata: {
                layout: 'default.html.ejs',
                title: 'Shown LOCAL Content - solely for use of show-content-local.html',
                publicationDate: '2021-11-28T00:00:00.000Z',
                tags: []
              },
              index: 4,
              exists: true,
              null: null
            }
        ]);
    });

    it('should retrieve $gte $ne', async function() {

        const found = await table.find({
            $and: [
                { '$.index': { $gte: 3 } },
                { '$.index': { $ne: 4 } }
            ]
        });

        // console.log(found);
        assert.ok(Array.isArray(found));
        assert.ok(found.length === 1);
        assert.equal(found[0].vpath, 'hier-broke/dir1/sibling.html.md');
        assert.equal(found[0].index, 3);
    });

    // NOTE that the $exists operator ends
    // up with a syntax error.  $notnull serves
    // the same purpose and does not generate
    // the syntax error.
    //
    // Error: SQLITE_ERROR: near "json_extract": syntax error

    // it('should retrieve $exists', async function() {

    //     const found = await table.find({
    //         $exists: '$.exists'
    //     });

    //     console.log(found);
    //     assert.ok(Array.isArray(found));
    //     assert.ok(found.length === 1);
    //     assert.equal(found[0].vpath, 'subdir/shown-content-local.html.md');
    //     assert.equal(found[0].index, 4);
    // });

    it('should retrieve $notnull', async function() {

        const found = await table.find({
            $notnull: '$.exists'
        });

        // console.log(found);
        assert.ok(Array.isArray(found));
        assert.ok(found.length === 1);
        assert.equal(found[0].vpath, 'subdir/shown-content-local.html.md');
        assert.equal(found[0].index, 4);
    });

    // This isn't terribly useful.  It does
    // not match fields which are explicitly null.
    // It also matches fields which are undefined.

    // it('should retrieve $null', async function() {

    //     const found = await table.find({
    //         // Generates a syntax error
    //         // $exists: '$.null',
    //         $null: '$.null'
    //     });

    //     console.log(found);
    //     assert.ok(Array.isArray(found));
    //     assert.ok(found.length === 1);
    //     assert.equal(found[0].vpath, 'subdir/shown-content-local.html.md');
    //     assert.equal(found[0].index, 4);
    // });

    it('should retrieve $like', async function() {

        const found = await table.find({
            '$.vpath': { $like: 'subdir%' }
        });

        // console.log(found);
        assert.ok(Array.isArray(found));
        assert.ok(found.length === 1);
        assert.equal(found[0].vpath, 'subdir/shown-content-local.html.md');
        assert.equal(found[0].index, 4);
    });

    it('should retrieve $glob', async function() {

        const found = await table.find({
            '$.vpath': { $glob: 'subdir/**' }
        });

        // console.log(found);
        assert.ok(Array.isArray(found));
        assert.ok(found.length === 1);
        assert.equal(found[0].vpath, 'subdir/shown-content-local.html.md');
        assert.equal(found[0].index, 4);
    });

    it('should retrieve $regexp', async function() {

        const found = await table.find({
            '$.vpath': { $regexp: 'subdir/.*$' }
        });

        // console.log(found);
        assert.ok(Array.isArray(found));
        assert.ok(found.length === 1);
        assert.equal(found[0].vpath, 'subdir/shown-content-local.html.md');
        assert.equal(found[0].index, 4);
    });

    it('should retrieve $or', async function() {

        const found = await table.find({
            $or: [
                { '$.dirname': 'subdir' },
                { '$.dirname': { $like: 'hier-broke%' }}
            ]
        });

        // console.log(found);
        assert.ok(Array.isArray(found));
        assert.ok(found.length === 2);
        assert.equal(found[0].vpath, 'hier-broke/dir1/sibling.html.md');
        assert.equal(found[1].vpath, 'subdir/shown-content-local.html.md');
    });

    it('should retrieve $or $and', async function() {

        const found = await table.find({
            $or: [
                { '$.dirname': 'subdir' },
                { $and: [
                    { '$.dirname': { $like: 'hier-broke%' }},
                    { '$.index': { $eq: 3 } }
                ]}
            ]
        });

        // console.log(found);
        assert.ok(Array.isArray(found));
        assert.ok(found.length === 2);
        assert.equal(found[0].vpath, 'hier-broke/dir1/sibling.html.md');
        assert.equal(found[1].vpath, 'subdir/shown-content-local.html.md');
    });

    it('should retrieve $or $regexp', async function() {

        const found = await table.find({
            $or: [
                { '$.vpath': {
                    $regexp: '^subdir.*$'
                } },
                { '$.vpath': {
                    $regexp: '^hier-broke.*$'
                } },
            ]
        });

        // console.log(found);
        assert.ok(Array.isArray(found));
        assert.ok(found.length === 2);
        assert.equal(found[0].vpath, 'hier-broke/dir1/sibling.html.md');
        assert.equal(found[1].vpath, 'subdir/shown-content-local.html.md');
    });

    it('should retrieve $and $regexp', async function() {

        const found = await table.find({
            $and: [
                { '$.vpath': {
                    $regexp: '^subdir.*$'
                } },
                { '$.vpath': {
                    $regexp: '^hier-broke.*$'
                } },
            ]
        });

        // console.log(found);
        assert.ok(Array.isArray(found));
        assert.ok(found.length === 0);
    });

    it('should delete table', async function() {
        await table.drop();
    });

});
