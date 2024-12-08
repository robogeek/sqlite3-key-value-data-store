# Key/Value store for SQLite3, with data search features

The `sqlite3-key-value-data-store` package is primarily a key/value store.  Like KVS packages it has `put`, `get`, and `delete` methods that work with a simple _key_ to add/retrieve/delete a _value_.

The _value_ is treated as, and stored as, JSON.

In addition, searches can be done on fields in the _value_ field.  The `find` method can be used to search for items by making comparisons on JSON fields.

# Install and usage

Install:

```shell
$ npm install sqlite3-key-value-data-store --save
```

Usage:

```js
import sqlite3 from 'sqlite3';
import * as sqlite_regex from "sqlite-regex";
import { SQ3DataStore } from 'sqlite3-key-value-data-store';
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

In `sqlite3-key-value-data-store` we can store multiple pools of key/value data.  Each pool corresponds to a dynamically created SQLITE3 table.

Instantiating an instance of the `SQ3DataStore` class generates a simple table in the SQLITE3 instance specified in the `DB` parameter.  The `tablenm` parameter gives the name for the table.

One may share an SQLITE3 instance between `sqlite3-key-value-data-store` and other code that is also storing tables.  Passing a `Database` instance in the `DB` parameter allows using an existing SQLITE3 instance.  Passing a _string_ instead generates a new Database object connecting to the connection URL in the string.

No attempt is made by `sqlite3-key-value-data-store` to avoid conflicting tables. It's up to your application to not step on other tables in your SQLITE3 instance.

```js
const table1 = new SQ3DataStore(':memory:', 'table1');
const table2 = new SQ3DataStore(table1.DB, 'table2');
const table3 = new SQ3DataStore(table1.DB, 'table3'); 
```

This shows creating three key/value pools in the same `:memory:` instance.

```js
SQ3DataStore#DB
```

As just explained, the `DB` getter retrieves the `Database` instance being used in the table.

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
SQ3DataStore#get(key: string): Promise<any | undefined>
```

Retrieves the value for the provided key.

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
