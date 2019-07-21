function once(fn) {
  function wrapper (...args) {
    if (fn === null) return;
    const origFn = fn;
    fn = null;
    origFn.apply(this, args);
  }
  Object.assign(wrapper, fn)
  return wrapper;
}

module.exports = once;