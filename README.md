# sqlite3-key-value-data-store
Node.js key/value store for SQLITE3 that includes data search features


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
