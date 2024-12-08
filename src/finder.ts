
import util from 'node:util';
import { default as SqlString } from 'sqlstring';


type ComparableValue = boolean | string | number;

type $eqOperation  = { $eq:  ComparableValue };
type $ltOperation  = { $lt:  ComparableValue };
type $lteOperation = { $lte: ComparableValue };
type $gtOperation  = { $gt:  ComparableValue };
type $gteOperation = { $gte: ComparableValue };
type $neOperation  = { $ne:  ComparableValue };
type $existsOperation = { $exists: ComparableValue };

const isComparable = (v: any): boolean => {
    return typeof v === 'boolean'
        || typeof v === 'string'
        || typeof v === 'number';
}


const $eq = (sel: string, tosel: ComparableValue) => {
    return SqlString.format([
        '( ',
        // 'EXISTS json_extract(value, ?) ',
        // 'AND json_extract(value, ?) == ?',
        'json_extract(value, ?) == ?',
        ' )'
    ].join(''),
        [ /* sel, */ sel, tosel ]
    );
}

const $lt = (sel: string, tosel: ComparableValue) => {
    return SqlString.format([
        '( ',
        // 'EXISTS json_extract(value, ?) ',
        // 'AND json_extract(value, ?) < ?',
        'json_extract(value, ?) < ?',
        ' )'
    ].join(''),
        [ /* sel, */ sel, tosel ]
    );
}

const $lte = (sel: string, tosel: ComparableValue) => {
    return SqlString.format([
        '( ',
        // 'EXISTS json_extract(value, ?) ',
        // 'AND json_extract(value, ?) <= ?',
        'json_extract(value, ?) <= ?',
        ' )'
    ].join(''),
        [ /* sel, */ sel, tosel ]
    );
}

const $gt = (sel: string, tosel: ComparableValue) => {
    return SqlString.format([
        '( ',
        // 'EXISTS json_extract(value, ?) ',
        // 'AND json_extract(value, ?) > ?',
        'json_extract(value, ?) > ?',
        ' )'
    ].join(''),
        [ /* sel, */ sel, tosel ]
    );
}

const $gte = (sel: string, tosel: ComparableValue) => {
    return SqlString.format([
        '( ',
        // 'EXISTS json_extract(value, ?) ',
        // 'AND json_extract(value, ?) >= ?',
        'json_extract(value, ?) >= ?',
        ' )'
    ].join(''),
        [ /* sel, */ sel, tosel ]
    );
}

const $ne = (sel: string, tosel: ComparableValue) => {
    return SqlString.format([
        '( ',
        // 'EXISTS json_extract(value, ?) ',
        // 'AND json_extract(value, ?) <> ?',
        'json_extract(value, ?) <> ?',
        ' )'
    ].join(''),
        [ /* sel, */ sel, tosel ]
    );
}

const $exists = (sel: string) => {
    return SqlString.format([
        '( ',
        'EXISTS(json_extract(value, ?)) ',
        ' )'
    ].join(''),
        [ sel ]
    );
}

const $null = (sel: string) => {
    return SqlString.format([
        '( ',
        'json_extract(value, ?) IS NULL ',
        ' )'
    ].join(''),
        [ sel ]
    );
}

const $notnull = (sel: string) => {
    return SqlString.format([
        '( ',
        'json_extract(value, ?) IS NOT NULL ',
        ' )'
    ].join(''),
        [ sel ]
    );
}

const $like = (sel: string, tosel: ComparableValue) => {
    return SqlString.format([
        '( ',
        // 'EXISTS json_extract(value, ?) ',
        // 'AND json_extract(value, ?) LIKE ?',
        'json_extract(value, ?) LIKE ?',
        ' )'
    ].join(''),
        [ /* sel, */ sel, tosel ]
    );
}

const $glob = (sel: string, tosel: ComparableValue) => {
    return SqlString.format([
        '( ',
        // 'EXISTS json_extract(value, ?) ',
        // 'AND json_extract(value, ?) GLOB ?',
        'json_extract(value, ?) GLOB ?',
        ' )'
    ].join(''),
        [ /* sel, */ sel, tosel ]
    );
}

const $regexp = (sel: string, tosel: ComparableValue) => {
    return SqlString.format([
        '( ',
        // 'EXISTS json_extract(value, ?) ',
        // 'AND json_extract(value, ?) regexp ?',
        'json_extract(value, ?) regexp ?',
        ' )'
    ].join(''),
        [ /* sel, */ sel, tosel ]
    );
}

function handleArraySelector(selectors: Array<any>)
    : Array<string>
{

    const queries = new Array<string>();

    for (const sel of selectors) {
        if (Array.isArray(sel)) {
            throw new Error(`Found array in array selectors ${util.inspect(sel)}`);
        }
        if (typeof sel !== 'object') {
            throw new Error(`Found non-object selector ${util.inspect(sel)}`);
        }

        const sels = handleObjectSelector(sel);
        queries.push(
            '( ' + sels.join(' AND ') + ' )'
        );
    }

    return queries;
}

function handleObjectSelector(selectors: any)
    : Array<string>
{

    const queries = new Array<string>();

    for (const sel in selectors) {
        if (!(typeof sel === 'string')) {
            throw new Error(`handleObjectSelector got invalid selector ${util.inspect(sel)}`);
        }

        const tosel = selectors[sel];

        if (sel === '$or' && !(Array.isArray(tosel))) {
            throw new Error(`selectors2where got $or without array ${util.inspect(tosel)}`);
        }
        if (sel === '$or') {
            queries.push(
                '( ' + handleArraySelector(tosel).join(' OR ') + ' )'
            );
            continue;
        }
        if (sel === '$and' && !(Array.isArray(tosel))) {
            throw new Error(`selectors2where got $and without array ${util.inspect(tosel)}`);
        }
        if (sel === '$and') {
            queries.push(
                '( ' + handleArraySelector(tosel).join(' AND ') + ' )'
            );
            continue;
        }

        if (sel === '$exists') {
            if (typeof tosel !== 'string') {
                throw new Error(`Incorrect operand ${util.inspect(tosel)} for $exists`);
            }
            queries.push(
                '( ' + $exists(tosel) + ' )'
            );
            continue;
        }

        if (sel === '$null') {
            if (typeof tosel !== 'string') {
                throw new Error(`Incorrect operand ${util.inspect(tosel)} for $null`);
            }
            queries.push(
                '( ' + $null(tosel) + ' )'
            );
            continue;
        }

        if (sel === '$notnull') {
            if (typeof tosel !== 'string') {
                throw new Error(`Incorrect operand ${util.inspect(tosel)} for $notnull`);
            }
            queries.push(
                '( ' + $notnull(tosel) + ' )'
            );
            continue;
        }

        // THe default action is equality
        if (isComparable(tosel)) {
            queries.push($eq(sel, tosel));
            continue;
        }

        if (typeof tosel === 'object') {
            const keys = Object.keys(tosel);
            if (keys.length < 1 || keys.length > 1) {
                throw new Error(`selectors2where got incorrect comparison operand for ${util.inspect(sel)} with ${util.inspect(tosel)}`);
            }
            const op = keys[0];
            const orsel = tosel[op];
            if (op === '$eq') {
                queries.push($eq(sel, orsel));
            } else if (op === '$lt') {
                queries.push($lt(sel, orsel));
            } else if (op === '$lte') {
                queries.push($lte(sel, orsel));
            } else if (op === '$gt') {
                queries.push($gt(sel, orsel));
            } else if (op === '$gte') {
                queries.push($gte(sel, orsel));
            } else if (op === '$ne') {
                queries.push($ne(sel, orsel));
            } else if (op === '$exists') {
                queries.push($exists(sel));
            } else if (op === '$like') {
                queries.push($like(sel, orsel));
            } else if (op === '$glob') {
                queries.push($glob(sel, orsel));
            } else if (op === '$regexp') {
                queries.push($regexp(sel, orsel));
            } else {
                throw new Error(`selectors2where got invalid operator ${util.inspect(op)} in ${util.inspect(tosel)}`);
            }
        }
    }
    return queries;
}

export function selectors2where(selectors: any) {

    if (typeof selectors !== 'object') {
        throw new Error(`Incorrect type for selector ${util.inspect(selectors)}`);
    }

    const queries = handleObjectSelector(selectors);
    return /* '( ' + */ queries.join(' AND ') /* + ' )' */;
}