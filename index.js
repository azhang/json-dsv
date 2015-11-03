var es     = require('event-stream')
  , get    = require('lodash.get')
  , concat = require('concat-stream')
  , assign = require('object-assign')
;

var Transformer = function(options) {
  this.options = {
    delimiter: ',',
    default: '',
    includeHeader: true,
    newLine: '\r\n'
  };

  this.options = assign(this.options, options || {});
};

Transformer.prototype.dsv = function() {
  switch (arguments.length) {
    case 0:
      return this.dsvStream(this.options);
    case 1:
      this.options = assign(this.options, arguments[0]);
      return this.dsvStream(this.options);
    case 2:   
      return this.dsvBuffered(arguments[0], this.options, arguments[1]);
    case 3:
      this.options = assign(this.options, arguments[1]);
      return this.dsvBuffered(arguments[0], this.options, arguments[2]);
    default:
      throw new Error('Too many arguments');
  }
};

Transformer.prototype.csv = function() {
  this.options.delimiter = ',';
  return this.dsv.apply(this, arguments);
};

Transformer.prototype.tsv = function() {
  this.options.delimiter = '\t';
  return this.dsv.apply(this, arguments);
};

Transformer.prototype.dsvStream = function(options) {
  if (!this.options.fields)
    throw new Error('options.fields not specified');
  
  var writtenHeader = !this.options.includeHeader;

  var _this = this;
  return es.through(function write(data) {
    if (!writtenHeader) {
      this.emit('data', _this._getHeaderRow());
      writtenHeader = true;
    }
    this.emit('data', _this._getBodyRow(data));
  });
};

Transformer.prototype.dsvBuffered = function(data, options, done) {
  if (!this.options.fields)
    throw new Error('options.fields not specified');

  es.readArray(data)
    .pipe(this.dsvStream(options))
    .pipe(concat(function(buffer) {
      done(null, buffer)
    }));
};

Transformer.prototype._escapeValue = function(arg, forceQuoted) {
  var quoted = forceQuoted || arg.indexOf('"') !== -1 || arg.indexOf(this.options.delimiter) !== -1 || arg.indexOf('\n') !== -1;
  var result = arg.replace(/\"/g,'""');
  return quoted ? '"' + result + '"' : result;
};

Transformer.prototype._getHeaderRow = function() {
  var headers = this.options.fields.map(function(field, i) {
    var header = (typeof field === 'string') ? field : (field.label || field.value);
    return this._escapeValue(header);
  }, this);

  return headers.join(this.options.delimiter) + this.options.newLine;
};

Transformer.prototype._getBodyRow = function(data) {
  if (!data || Object.getOwnPropertyNames(data).length === 0) return '';

  var values = this.options.fields.map(function(field, i) {
    var value;

    if (typeof field === 'undefined' && typeof field.value === 'undefined') {
      throw new Error('Invalid :fields. `fields[]` or `fields[][value]` must be a string or function.');
    } else if (typeof field === 'string' || typeof field.value === 'string') {
      var path = (typeof field === 'string') ? field : field.value;
      value = get(data, path, field.default || this.options.default);
    } else if (typeof field.value === 'function') {
      value = field.value(data);
      if (typeof value === 'undefined')
        value = field.default || this.options.default;
    }

    if (Array.isArray(value)) {
      value = value.join(',');
    } else if (typeof value === 'object') {
      value = JSON.stringify(value);
    }

    // Handle numbers
    value = value.toString();

    return this._escapeValue(value);
  }, this);

  return values.join(this.options.delimiter) + this.options.newLine;
};

module.exports = Transformer;
