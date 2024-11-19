import {assert} from 'chai';

descaribe("foo", () => {
  it("should not explode", () => {
    assert.equal(2 + 5, 7);
  });
});