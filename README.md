# Key/Value store for SQLite3, with data search features

The `sq3-kv-data-store` package is primarily a key/value store built on top of SQLITE3.  While it is meant to be used in-memory (`:memory:`), it can be used with any SQLITE3 storage location.  Its tables can be stored alongside other tables in an application using SQLITE3.

# Features

* Like other KVS packages it has `put`, `get` `update`, and `delete` methods that take a simple text _key_ to add/retrieve/update/delete a _value_. The _value_ is treated as, and stored as, JSON.
* It also supports `keys` and `exists` methods.
* It supports a powerful `find` operating for performing Mango/Mongo-like queries on the JSON values stored in the `value` field.  This relies on SQLITE3's built-in JSON capabilities.  Selector objects are converted, on the fly, into SQL WHERE clauses testing JSON fields.

# Comparison to related packages

* KeyV is a typical key/value store.
    * Its API supports `get`, `set` and `delete` methods.
    * It supports multiple back-end storage engines.
    * It is an excellent choice if your needs are limited to set/get/delete values using a key.
* PouchDB is a light-weight database that can serve as a key/value store and it can run in apps on mobile devices.
    * It has the `get`, `set`, and `delete` methods of a key/value store.
    * It supports synchronization to CouchDB for data persistence.
    * It supports a MongoDB-like `find` method, if you install the `pouchdb-find` plugin.
    * But, there are many strage quirks to the API, and on Node.js it brings in a lot of stale LevelDown-related packages that generate security warnings.

# Install and usage

Install:

```shell
$ npm install sq3-kv-data-store --save
```

Usage:

```js
import sqlite3 from 'sqlite3';
import * as sqlite_regex from "sqlite-regex";
import { SQ3DataStore } from 'sq3-kv-data-store';
```

At the moment this package only supports use in ESM contexts.  To use in CommonJS code, use the `import()` function.

The `SQ3DataStore` class wraps around an SQLite3 instance.  It has only been tested against the `sqlite3` package on Node.js.  The `sqlite-regex` package is used for implementing regular expression comparisons.

TODO: Support this against the SQLITE3 due to be implemented in Node.js 24.

TODO: Support this against the SQLITE3 that exists in Bun.

TODO: Determine what to do on Deno.

TODO: Support this against better-sqlite3

# API

```js
new SQ3DataStore(
    DB: sqlite3.Database | string,
    tablenm: string)
```

In `sq3-kv-data-store` we can store multiple pools of key/value data.  Each pool corresponds to a dynamically created SQLITE3 table.

Instantiating an instance of the `SQ3DataStore` class generates a simple table in the SQLITE3 instance specified in the `DB` parameter.  The `tablenm` parameter gives the name for the table.

One may share an SQLITE3 instance between `sq3-kv-data-store` and other code that is also storing tables.  Passing a `Database` instance in the `DB` parameter allows using an existing SQLITE3 instance.  Passing a _string_ instead generates a new Database object connecting to the connection URL in the string.

No attempt is made by `sq3-kv-data-store` to avoid conflicting tables. It's up to your application to not step on other tables in your SQLITE3 instance.

```js
const table1 = new SQ3DataStore(':memory:', 'table1');
const table2 = new SQ3DataStore(table1.DB, 'table2');
const table3 = new SQ3DataStore(table1.DB, 'table3'); 
```

This shows creating three key/value pools in the same `:memory:` instance.  One can create many data tables.

```js
SQ3DataStore#DB
```

As just explained, the `DB` getter retrieves the `Database` instance being used in the table.  It means your code can go behind the scenes and directly invoke SQLITE3 API methods.

```js
SQ3DataStore#put(
    key: string,
    value: any
): Promise<void>
```

This stores a value in the data table.  The value is stringified as JSON before storage.

```js
SQ3DataStore#update(
    key: string,
    value: any
): Promise<void>
```

Replaces the _value_ for an existing _key_.

```js
SQ3DataStore#get(key: string)
    : Promise<any | undefined>
```

Retrieves the value for the provided key.

```js
SQ3DataStore#get(key: string)
    : Promise<boolean>
```

Determines whether the database table contains an item with the given key.

The return value is `true` if such an item exists, and `false` otherwise.


```js
SQ3DataStore#keys(pattern?: string)
    : Promise<string[]>
```

Retrieves the keys currently existing in the database table.  The `pattern` parameter allows specifying a LIKE pattern.  If specified the returned keys will match the pattern.

```js
SQ3DataStore#find(selectors: Array<any>)
    : Promise<Array<any> | undefined>
```

Searches the fields in the _value_ objects.  This is discussed later.

```js
SQ3DataStore#findAll(): Promise<Array<any>>
```

Retrieves all entries in the data table.

```js
SQ3DataStore#delete(key: string): Promise<void>
```

Deletes an item from the data table.

```js
SQ3DataStore#drop(key: string): Promise<void>
```

Deletes the data table from the SQLITE3 instance.

# Searching with the `find` method

The `find` method allows one to search against the JSON value similarly to MongoDB queries.  This relies on the `json_extract` function from the JSON extension.  This extension is generally bundled with SQLITE3.

Simple example:

```js
const found = await table.find({
    '$.vpath': 'index.html'
});
```

This searches for items where the `vpath` item in the JSON is precisely equal to `index.html`.

The `$.vpath` string is in the format required by the JSON extension.  That documentation reads as so:

> A well-formed PATH is a text value that begins with exactly one '$' character followed by zero or more instances of ".objectlabel" or "[arrayindex]".

The simple example is equivalent to:

```js
const found = await table.find({
    '$.vpath': { $eq: 'index.html' }
});
```

The first example shows the implicit equality comparison.  This is an explicit equality comparison using the `$eq` operator.

The full list of operators of this sort are:

* **`$eq`** - equality
* **`$lt`** - less than
* **`$lte`** - less than or equal
* **`$gt`** - greater than
* **`$gte`** - greater than or equal
* **`$ne`** - not equal
* **`$like`** - matches using an SQL LIKE clause - e.g. `'%Smith'`
* **`$glob`** - matches using an filesystem path match - e.g. `'**/*.html'`
* **`$regexp`** - matches using an regular expression - e.g. `'^Smith.*$'`

**`$null` or `$notnull`**

These operators test if the value is `null` (using `IS NULL`) or not null (using `IS NOT NULL`).

```js
const found = await table.find({
    $notnull: '$.vpath'
});
```

The `$null` operator matches both fields which are `undefined` or contain the value `null`.

**`$exists`**

Attempts to determine if the item exists using the `EXISTS` operator.  However, KNOWN BUG, this produces a syntax error from SQLITE3.  See https://github.com/robogeek/sqlite3-key-value-data-store/issues/1

**`$or` or `$and`**

These take an array of sub-clauses.  The `$or` form matches if one of the sub-clauses matches.  The `$and` form matches if all the sub-clauses matches.

```js
const found = await table.find({
    $or: [
        { '$.dirname': 'subdir' },
        { $and: [
            { '$.dirname': { $like: 'hier-broke%' }},
            { '$.index': { $eq: 3 } }
        ]}
    ]
});
```

# Installing the REGEXP extension

The `find` method supports matching on regular expressions.  To use this feature one must install the `sqlite-regex` package, then enable it in the SQLITE3 database.

```shell
$ npm install sqlite-regex --save
```

This package has `sqlite-regex` as a peer dependency.

In your code do something like this:

```js
import * as sqlite_regex from "sqlite-regex";
...
const db = new sqlite3.Database(URL);
const regexp_loadable_path
        = sqlite_regex.getLoadablePath();
db.loadExtension(regexp_loadable_path, (err) => {
    // handle error
});
```

## Using REGEXP where there might be missing data

A collection of JSON documents are unlikely to all have the same shape or content.

You can easily end up with a situation of where a `{ $regexp: 'regular-expression' }` operator is matched against a field which does not exist in all documents.  In such a case an error is thrown, `SQLITE_ERROR: Unexpected null value`.

The solution is to add the `$notnull` operator like so:

```js
const rows = await table.find({
    $notnull: '$.name',
    '$.name': { $regexp: '.*Smith.*' }
});
```

The generated SQL will be:

```
WHERE json_extract(value, '$.name') IS NOT NULL
  AND json_extract(value, '$.name') regexp '.*Smith.*'
```

This ensures the field exists before running the regular expression.