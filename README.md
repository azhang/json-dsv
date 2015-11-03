json-dsv
=========

![Build status](https://travis-ci.org/azhang/json-dsv.svg?branch=master)

Transform JSON to delimiter-separated values, such as CSV and TSV. Supports streams.

Installation
------------

    npm install json-dsv

Usage
-----

### Streaming
```js
var JsonDSV = require('json-dsv');
var transformer = new JsonDSV(options);

readableStream
  .pipe(transformer.dsv(addlOptions))
  .pipe(writableStream);
```


### Buffered
```js
var JsonDSV = require('json-dsv');
var transformer = new JsonDSV(options);

var data = data; // Object[]
transformer.dsv(data, options, function(err, dsv) {
  // buffered dsv result
});
```


### Options / Defaults
```js
{
  delimiter: ',', // use a different field separator char, eg `\t`
  default: '' // if value is undefined at `value` path
  includeHeader: true, // Boolean, determines whether or not CSV file will contain a title column
  newLine: '\r\n', // String, overrides the default OS line ending (i.e. `\n` on Unix and `\r\n` on Windows).
  fields: [
    // Supports label -> simple path
    {
      label: 'some label', // (optional, column will be labeled 'path.to.something' if not defined)
      value: 'path.to.something', // data.path.to.something
      default: 'NULL' // default if value is not found (optional, overrides `options.default` for column)
    },

    // Supports label -> derived value
    {
      label: 'some label', // Supports duplicate labels (required, else your column will be labeled [function])
      value: function(row) {
        return row.path1 + row.path2;
      },
      default: 'NULL' // default if value fn returns undefined
    },

    // Support pathname -> pathvalue
    'simplepath' // equivalent to {value:'simplepath'}
    'path.to.value' // also equivalent to {label:'path.to.value', value:'path.to.value'}
  ]
}

### API

<a name="JsonDSV" href="#JsonDSV">#</a> new <b>JsonDSV</b>(<i>options</i>)

Constructs a new JSON-DSV transformer.

<a name="JsonDSV_dsv_stream" href="#JsonDSV_dsv_stream">#</a> *JsonDSV*.<b>dsv</b>([<i>addlOptions</i>])

Transforms `data` to DSV (CSV by default). Streams data per line.

`.csv` and `.tsv` are available as convenience methods.

Specified `addlOptions` override `options`.

```js
var options = {
  fields: [{value: 'make', label: 'Brand'}, 'model']
};
var data = [
  { make: 'nissan', model: '350z'},
  { make: 'bmw', model: '328i'}
];

var JsonDSV = require('json-dsv');
var transformer = new JsonDSV(options);
var es = require('event-stream');

es.readArray(data)
  .pipe(transformer.dsv())
  .pipe(process.stdout);

// Brand,model
// nissan,350z
// bmw,328i
```


<a name="JsonDSV_dsv_buffered" href="#JsonDSV_dsv_buffered">#</a> *JsonDSV*.<b>dsv</b>(<i>data</i>[, <i>addlOptions</i>], <i>callback</i>])

Transforms `data` to DSV (CSV by default). Callback passes on buffered output.

`.csv` and `.tsv` are available as convenience methods.

Specified `addlOptions` override `options`.

```js
var options = {
  fields: [{value: 'make', label: 'Brand'}, 'model']
};
var data = [
  { make: 'nissan', model: '350z'},
  { make: 'bmw', model: '328i'}
];

var JsonDSV = require('json-dsv');
var transformer = new JsonDSV(options);

transformer.dsv(data, function(err, csv) {
  console.log(csv);
});

// Brand,model
// nissan,350z
// bmw,328i
```

### Tests

    npm test
