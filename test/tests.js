var JsonDSV = require('../index')
  , es = require('event-stream')
  , should = require('should')
  , concat = require('concat-stream')
  , transformer = new JsonDSV()
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

  describe('Unit tests', function() {
    describe('_getHeaderRow', function() {
      it('should get headers properly for string fields', function() {
        var ctx = transformer;
        ctx.options.fields = stringFields;
        var header = transformer._getHeaderRow.call(ctx);
        header.should.equal('make,model,nested.price\r\n');
      });
      it('should get headers properly for label fields', function() {
        var ctx = transformer;
        ctx.options.fields = labelFields;
        var header = transformer._getHeaderRow.call(ctx);
        header.should.equal('Make,Model,Final Price\r\n');
      });
    });

    describe('_getBodyRow', function() {
      it('should get row properly for string fields', function() {
        var ctx = transformer;
        ctx.options.fields = stringFields;
        var header = transformer._getBodyRow.call(ctx, data[0]);
        header.should.equal('nissan,350z,35000\r\n');
      });
      it('should get row properly for label/function fields', function() {
        var ctx = transformer;
        ctx.options.fields = labelFields;
        var header = transformer._getBodyRow.call(ctx, data[1]);
        header.should.equal('bmw,328i,33000\r\n');
      });
    });

    describe('_escapeValue', function() {
      it('should not escape unnecessarily', function() {
        var value = transformer._escapeValue('asdf');
        value.should.equal('asdf');
      });
      it('should escape \"s', function() {
        var value = transformer._escapeValue('as"df');
        value.should.equal('"as""df"');
      });
      it('should escape \\ns', function() {
        var value = transformer._escapeValue('asdf\n');
        value.should.equal('"asdf\n"');
      });
      it('should escape ,s', function() {
        var value = transformer._escapeValue('asdf,');
        value.should.equal('"asdf,"');
      });
    });
  });

  describe('Integration tests', function() {
    it('should convert buffer properly', function(done) {
      transformer.dsv(data, {fields: stringFields}, function(err, csv) {
        csv.should.equal('make,model,nested.price\r\nnissan,350z,35000\r\nbmw,328i,34000\r\n');
        done();
      });
    });

    it('should convert stream properly', function(done) {
      es.readArray(data)
        .pipe(transformer.dsv({fields: stringFields}))
        .pipe(concat(function(csv) {
          csv.should.equal('make,model,nested.price\r\nnissan,350z,35000\r\nbmw,328i,34000\r\n');
          done();
        }));
    });
  });
});
