const fs = require('fs');
const path = require('path');
const micromatch = require('micromatch');

const TaskQueue = require('./TaskQueue');
const once = require('../util/once');

class Crawler extends TaskQueue {
  constructor(options) {
    super(options);
    if (options.root === undefined) {
      throw TypeError('Invalid configuration. Root path is required.');
    }
    this.root = options.root;
    this.match = options.match || [];
    this.ignorePaths = options.ignorePaths || [/node_modules/];
    this.maxDepth = options.maxDepth;
    this.strict = options.strict || false;
  }

  validateDirectory(dir) {
    if (this.ignorePaths && this.ignorePaths.length) {
      for (let i = 0; i < this.ignorePaths.length; i += 1) {
        const rgx = this.ignorePaths[i];
        if (rgx.test(dir)) {
          return false;
        }
      }
    }
    return true;
  }

  _crawl(root, depth, onFinish) {

    let callback = once(onFinish);

    if (depth !== undefined && depth < 0) {
      return this.nextTickResult([], callback);
    }

    fs.stat(root, (err, stats) => {
      if (err) {
        if (err.code === 'EACCES') {
          if (this.strict) {
            return this.nextTickError(err, callback);
          }
          return callback(null, []);
        }
        return this.nextTickError(err, callback);
      }

      if (stats && !stats.isDirectory()) {
        return callback(null, root);
      }

      if (!this.validateDirectory(root)) {
        return callback(null, []);
      }

      fs.readdir(root, (readdirErr, files) => {
        if (readdirErr) {
          return this.nextTickError(err, callback);
        }

        if (files.length === 0) {
          return this.nextTickResult(root, callback);
        }

        let completed = 0;
        let hasErrors = false;
        let results = [];

        function enqueueTask(file) {
          const filePath = path.join(root, file);
          function task(done) {
            this._crawl(filePath, depth - 1, (pathErr, result) => {
              if (pathErr) {
                hasErrors = true;
                return this.nextTickError(err, callback);
              }

              let res = result;

              if (this.match && this.match.length) {
                res = micromatch(res, this.match);
              }

              results = results.concat(res);
              completed += 1;

              if (completed === files.length && !hasErrors) {
                return callback(null, results);
              }

              done();
            });
          }
          this.push(task.bind(this));
        }
        files.forEach(enqueueTask.bind(this));
        this.done();
      });
    });
  }

  crawl(onFinish) {
    this._crawl(this.root, this.maxDepth, onFinish);
  }

  forEach(iteratee, onFinish) {
    const finished = once(onFinish);

    this._crawl(this.root, this.maxDepth, (err, files) => {
      if (err) {
        return this.nextTickError(err, finished);
      }

      let completed = 0;

      function enqueueTask(file) {
        function task(done) {
          try {
            iteratee(file, (cbErr) => {
              if (cbErr) {
                return this.nextTickError(err, finished);
              }

              completed += 1;

              if (completed === files.length) {
                finished(null);
              }

              done();
            });
          } catch (taskErr) {
            return this.nextTickError(taskErr, finished);
          }
        }
        this.push(task.bind(this));
      }

      files.forEach(enqueueTask.bind(this));
    });
  }

  map(iteratee, onFinish) {
    const finished = once(onFinish);

    this._crawl(this.root, this.maxDepth, (err, files) => {
      if (err) {
        return this.nextTickError(err, finished);
      }

      const results = [];
      let completed = 0;

      function enqueueTask(file, index) {
        function task(done) {
          try {
            iteratee(file, (cbErr, result) => {
              if (cbErr) {
                return this.nextTickError(cbErr, finished);
              }

              results[index] = result;
              completed += 1;

              if (completed === files.length) {
                return finished(null, results);
              }

              done();
            });
          } catch (taskErr) {
            return this.nextTickError(taskErr, finished);
          }
        }
        this.push(task.bind(this));
      }

      files.forEach(enqueueTask.bind(this));
    });
  }

  filter(predicate, onFinish) {
    const finished = once(onFinish);

    this._crawl(this.root, this.maxDepth, (err, files) => {
      if (err) {
        return this.nextTickError(err, finished);
      }

      const results = [];
      let completed = 0;

      function enqueueTask(file) {
        function task(done) {
          try {
            predicate(file, (cbErr, result) => {
              if (cbErr) {
                this.nextTickError(cbErr, finished);
              }

              if (result) {
                results.push(file);
              }

              completed += 1;

              if (completed === files.length) {
                finished(null, results);
              }

              done();
            });
          } catch (taskErr) {
            this.nextTickError(taskErr, finished);
          }
        }
        this.push(task.bind(this));
      }

      files.forEach(enqueueTask.bind(this));
    });
  }

  reduce(initVal, reducer, onFinish) {
    let initialValue = initVal;
    let finished = once(onFinish);

    this._crawl(this.root, this.maxDepth, (err, files) => {
      if (err) {
        this.nextTickError(err, finished);
      }

      let completed = 0;
      let accumulator = initialValue;
      let prevConcurrency = this.concurrency;

      this.setConcurrency(1);

      function enqueueTask(file) {
        function task(done) {
          try {
            if (accumulator === undefined) {
              reducer(file, (cbErr, result) => {
                if (cbErr) {
                  this.nextTickError(cbErr, finished);
                }

                accumulator = result;
                completed += 1;

                if (completed === files.length) {
                  this.setConcurrency(prevConcurrency);
                  finished(null, accumulator);
                } else {
                  for (let i = 1; i < files.length; i += 1) {
                    enqueueTask(files[i]);
                  }
                }

                done();
              });
            } else {
              reducer(accumulator, file, (cbErr, result) => {
                if (cbErr) {
                  this.nextTickError(cbErr, finished);
                }

                accumulator = result;
                completed += 1;

                if (completed === files.length) {
                  finished(null, accumulator);
                }

                done();
              });
            }
          } catch (taskErr) {
            this.nextTickError(taskErr, finished);
          }
        }
        this.push(task.bind(this));
      }

      if (accumulator === undefined) {
        if (files.length === 0) {
          throw TypeError('Reduce of empty array with no initial value');
        }
        enqueueTask(files[0]);
      } else {
        files.forEach(enqueueTask.bind(this));
      }
    });
  }
}

module.exports = Crawler;
