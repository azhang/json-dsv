var JsonDSV = require('../index')
  , es = require('event-stream')
  , should = require('should')
  , concat = require('concat-stream')
;

describe('Convert data to csv using dsv', function() {
  var data = [
    { make: 'nissan', model: '350z', nested: {price: 35000}},
    { make: 'bmw', model: '328i', nested: {price: 34000, discount: 1000}}
  ];

  var stringFields = [
    'make',
    'model',
    'nested.price'
  ];

  var labelFields = [
    {value: 'make', label: 'Make'},
    {value: 'model', label: 'Model'},
    {value: function(row) {
      return row.nested.price - (row.nested.discount || 0);
    }, label: 'Final Price'}
  ];

  var missingFields = [
    {value: 'engine', label: 'Engine', default: 'Tiny'},
    {value: 'type', label: 'Type'}
  ];

  describe('Unit tests', function() {
    describe('_getHeaderRow', function() {
      it('should get headers properly for string fields', function() {
        var transformer = new JsonDSV();
        transformer.options.fields = stringFields;
        var header = transformer._getHeaderRow.call(transformer);
        header.should.equal('make,model,nested.price\r\n');
      });
      it('should get headers properly for label fields', function() {
        var transformer = new JsonDSV();
        transformer.options.fields = labelFields;
        var header = transformer._getHeaderRow.call(transformer);
        header.should.equal('Make,Model,Final Price\r\n');
      });
    });

    describe('_getBodyRow', function() {
      it('should get row properly for string fields', function() {
        var transformer = new JsonDSV();
        transformer.options.fields = stringFields;
        var row = transformer._getBodyRow.call(transformer, data[0]);
        row.should.equal('nissan,350z,35000\r\n');
      });
      it('should get row properly for label/function fields', function() {
        var transformer = new JsonDSV();
        transformer.options.fields = labelFields;
        var row = transformer._getBodyRow.call(transformer, data[1]);
        row.should.equal('bmw,328i,33000\r\n');
      });
      it('should get row properly for specified delimiter', function() {
        var transformer = new JsonDSV();
        transformer.options.fields = stringFields;
        transformer.options.delimiter = '!';
        var row = transformer._getBodyRow.call(transformer, data[0]);
        row.should.equal('nissan!350z!35000\r\n');
      });
      it('should use default properly for missing fields', function() {
        var transformer = new JsonDSV();
        transformer.options.fields = missingFields;
        transformer.options.default = 'Not Specified';
        var row = transformer._getBodyRow.call(transformer, data[0]);
        row.should.equal('Tiny,Not Specified\r\n');
      });
      it('should use default value if function value undefined', function() {
        var fields = [
          { value: function(row) { return void 0; }, label: 'Undefined' }
        ];
        var transformer = new JsonDSV({fields: fields});
        transformer.options.default = 'default';
        var row = transformer._getBodyRow.call(transformer, data[0]);
        row.should.equal('default\r\n');
      });
      it('should return \'\' if empty input data', function() {
        var transformer = new JsonDSV({fields: labelFields});
        transformer.options.default = 'default';
        var row = transformer._getBodyRow.call(transformer, {});
        row.should.equal(',,\r\n');
      });
      it('should return default if \'\' field and field.value', function() {
        var fields = labelFields.slice(0); // clone array
        fields[1] = '';
        fields[2] = {value:'', default:'1'};
        var transformer = new JsonDSV({fields: fields});
        transformer.options.default = 'default';
        var row = transformer._getBodyRow.call(transformer, data[0]);
        row.should.equal('nissan,default,1\r\n');
      });
      it('should return default if {} field', function() {
        var fields = labelFields.slice(0); // clone array
        fields[2] = {};
        var transformer = new JsonDSV({fields: fields});
        transformer.options.default = 'default';
        var row = transformer._getBodyRow.call(transformer, data[0]);
        row.should.equal('nissan,350z,default\r\n');
      });
      it('should throw error if invalid (undefined) field', function() {
        var fields = labelFields.slice(0); // clone array
        fields[2] = undefined;
        var transformer = new JsonDSV({fields: fields});
        transformer.options.default = 'default';
        try {
          var row = transformer._getBodyRow.call(transformer, data[0]);         
        } catch (err) {
          err.message.should.equal('Invalid :fields. `fields[]` or `fields[][value]` must be a string or function.');
        }
      });
      it('should throw error if invalid (number) field', function() {
        var fields = labelFields.slice(0); // clone array
        fields[2] = 1;
        var transformer = new JsonDSV({fields: fields});
        transformer.options.default = 'default';
        try {
          var row = transformer._getBodyRow.call(transformer, data[0]);         
        } catch (err) {
          err.message.should.equal('Invalid :fields. `fields[]` or `fields[][value]` must be a string or function.');
        }
      });
      it('should throw error if invalid (array) field', function() {
        var fields = labelFields.slice(0); // clone array
        fields[2] = [];
        var transformer = new JsonDSV({fields: fields});
        transformer.options.default = 'default';
        try {
          var row = transformer._getBodyRow.call(transformer, data[0]);         
        } catch (err) {
          err.message.should.equal('Invalid :fields. `fields[]` or `fields[][value]` must be a string or function.');
        }
      });
    });

    describe('_escapeValue', function() {
      it('should not escape unnecessarily', function() {
        var transformer = new JsonDSV();
        var value = transformer._escapeValue('asdf');
        value.should.equal('asdf');
      });
      it('should escape \"s', function() {
        var transformer = new JsonDSV();
        var value = transformer._escapeValue('as"df');
        value.should.equal('"as""df"');
      });
      it('should escape \\ns', function() {
        var transformer = new JsonDSV();
        var value = transformer._escapeValue('asdf\n');
        value.should.equal('"asdf\n"');
      });
      it('should escape ,s', function() {
        var transformer = new JsonDSV();
        var value = transformer._escapeValue('asdf,');
        value.should.equal('"asdf,"');
      });
    });
  });

  describe('Integration tests', function() {
    it('should convert buffer properly', function(done) {
      var transformer = new JsonDSV();
      transformer.dsv(data, {fields: stringFields}, function(err, csv) {
        csv.should.equal('make,model,nested.price\r\nnissan,350z,35000\r\nbmw,328i,34000\r\n');
        done();
      });
    });

    it('should convert buffer properly (predefined fields)', function(done) {
      var transformer = new JsonDSV({fields: stringFields});
      transformer.dsv(data, function(err, csv) {
        csv.should.equal('make,model,nested.price\r\nnissan,350z,35000\r\nbmw,328i,34000\r\n');
        done();
      });
    });

    it('should convert stream properly', function(done) {
      var transformer = new JsonDSV();
      es.readArray(data)
        .pipe(transformer.dsv({fields: stringFields}))
        .pipe(concat(function(csv) {
          csv.should.equal('make,model,nested.price\r\nnissan,350z,35000\r\nbmw,328i,34000\r\n');
          done();
        }));
    });

    it('should convert stream properly (predefined fields)', function(done) {
      var transformer = new JsonDSV({fields: stringFields});
      es.readArray(data)
        .pipe(transformer.tsv())
        .pipe(concat(function(tsv) {
          tsv.should.equal('make\tmodel\tnested.price\r\nnissan\t350z\t35000\r\nbmw\t328i\t34000\r\n');
          done();
        }));
    });

    it('.dsv with 4 arguments should callback error', function(done) {
      var transformer = new JsonDSV();
      transformer.dsv(data, {fields: stringFields}, 'extraneous arg', function(err, csv) {
        err.message.should.equal('Too many arguments');
        done();
      });
    });

    describe('Convenience methods', function(done) {
      it('.csv should work', function(done) {
        var transformer = new JsonDSV();
        es.readArray(data)
          .pipe(transformer.csv({fields: stringFields}))
          .pipe(concat(function(csv) {
            csv.should.equal('make,model,nested.price\r\nnissan,350z,35000\r\nbmw,328i,34000\r\n');
            done();
          }));
      });

      it('.tsv should work', function(done) {
        var transformer = new JsonDSV();
        es.readArray(data)
          .pipe(transformer.tsv({fields: stringFields}))
          .pipe(concat(function(tsv) {
            tsv.should.equal('make\tmodel\tnested.price\r\nnissan\t350z\t35000\r\nbmw\t328i\t34000\r\n');
            done();
          }));
      });
    });

    it('.dsv initialized with missing fields should throw error', function() {
      var transformer = new JsonDSV();
      try {        
        transformer.dsv();
      } catch (err) {
        err.message.should.equal('options.fields not specified');
      }
    });

    it('.dsv buffered with missing fields should error', function(done) {
      var transformer = new JsonDSV();
      transformer.dsv(data, function(err, csv) {
        err.message.should.equal('options.fields not specified');
        should.not.exist(csv);
        done();
      });
    });

    it('.dsv buffered with invalid fields should error', function(done) {
      var transformer = new JsonDSV();
      transformer.dsv(data, {fields: [3,2,1]}, function(err, csv) {
        err.message.should.equal('Invalid :fields. `fields[]` or `fields[][value]` must be a string or function.');
        should.not.exist(csv);
        done();
      });
    });

    it('should create fixture0.csv from fixture0.json', function(done) {
      var fs = require('fs');
      var JSONStream = require('JSONStream');
      
      var fields = [ '_id', 'index', 'guid', 'isActive', 'balance', 'picture', 'age', 'eyeColor', 'name', 'company', 'email', 'phone', 'address', 'about', 'registered', 'latitude', 'longitude', 'tags', 'range', 'friends', 'greeting', 'favoriteFruit' ];

      var readStream = fs.createReadStream('./test/fixture0.json', 'utf8');
      var expectedOutput = fs.readFileSync('./test/fixture0.csv', 'utf8');

      var transformer = new JsonDSV();

      readStream
        .pipe(JSONStream.parse('*'))
        .pipe(transformer.dsv({fields: fields}))
        .pipe(concat(function(csv) {
          csv.should.equal(expectedOutput);
          done();
        }));

    });

    it('should throw error if invalid (undefined) field', function(done) {
      var fields = labelFields.slice(0); // clone array
      fields[2] = undefined;

      var transformer = new JsonDSV();
      es.readArray(data)
        .pipe(transformer.dsv({fields: fields}))
        .on('error', function(err) {
          err.message.should.equal('Invalid :fields. `fields[]` or `fields[][value]` must be a string or function.');
          done();
        })
        .pipe(concat(function(csv) {
          should.not.exist(csv);
          done();
        }));
    });

  });
});
