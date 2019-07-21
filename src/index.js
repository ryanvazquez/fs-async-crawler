const fs = require('fs');
const path = require('path');
const micromatch = require('micromatch');

const TaskQueue = require('./taskQueue');
const once = require('../util/once');

class fsCrawler extends TaskQueue {
  constructor(options){
    super(options);
    if (options.root === undefined){
      throw TypeError('Invalid configuration. Root path is required.')
    }
    
    this.match = options.match || [];
    this.ignorePaths = options.ignorePaths || [ /node_modules/ ];
    this.maxDepth = options.maxDepth || null;
    this.root = options.root;
    
    this.addListener('drained', err => this.onDrained(err));
    this.addListener('finished', (res) => this.onFinished(res));
  }
  
  _validateDirectory(dir){
    if (this.ignorePaths && this.ignorePaths.length){
      for (let i = 0; i < this.ignorePaths.length; i += 1){
        const rgx = this.ignorePaths[i];
        if (rgx.test(dir)){
          return false;
        }
      }
    }
    return true;
  }

  _crawl(root, depth, callback){
    
    if (depth !== undefined && depth < 0){
      return this._nextTick(null, [], callback)
    }

    fs.stat(root, (err, stats) => {
      if (err){
        return this._nextTick(err, null, callback);
      }
      
      if (stats && !stats.isDirectory()){
        return callback(null, root);
      }
      
      if (!this._validateDirectory(root)){
        return callback(null, []);
      }
  
      fs.readdir(root, (err, files) => {
        if (err){
          return this._nextTick(err, null, callback);
        }
        
        if (files.length === 0){
          return process.nextTick(() => callback(null, root));
        }
  
        let completed = 0, hasErrors = false, results = [];
  
        files.forEach(enqueueTask.bind(this));

        this.done();
  
        function enqueueTask(file){
          const filePath = path.join(root, file);

          this.push(task.bind(this));
  
          function task(done){
            this._crawl(filePath, depth - 1, (err, result) => {
              if (err) {
                hasErrors = true;
                return this._nextTick(err, null, callback);
              }
            
              if (this.match && this.match.length){
                result = micromatch(result, this.match);
              }
  
              results = results.concat(result);
              
              if (++ completed === files.length && !hasErrors){
                return callback(null, results);
              }
  
              done();
              
            });
          }
        }
      });
    });
  }


  all(callback){

    callback = once(callback);

    this._crawl(this.root, this.maxDepth, callback);
  }

  forEach(iteratee, finished){

    finished = once(finished);

    this.onDrained = err => finished(err);
    this.onFinished = err => finished(null);

    this._crawl(this.root, this.maxDepth, (err, files) => {
      if (err){
        return this._nextTick(err, null, 'error');
      }
      
      let completed = 0;
      files.forEach(enqueueTask.bind(this));

      function enqueueTask(file){
        this.push(task.bind(this));

        function task(done){
          try {
            iteratee(file, (err) => {
              if (err){
                return this._nextTick(err, null, 'error');
              }

              if (++ completed === files.length){
                return this.emit('finished', null, results);
              }

              done();

            })
          } catch (err) {
            return this._nextTick(err, null, 'error');
          }
        }
      }

    })
  }

  map(iteratee, finished){

    finished = once(finished);

    this.onDrained = err => finished(err, null);
    this.onFinished = results => finished(null, results);

    this._crawl(this.root, this.maxDepth, (err, files) => {
      if (err){
        return this._nextTick(err, null, 'error');
      }

      const results = [];
      let completed = 0;

      files.forEach(enqueueTask.bind(this));

      function enqueueTask(file, index){
        this.push(task.bind(this));

        function task(done){
          try {
            iteratee(file, (err, result) => {
              if (err) {
                return this._nextTick(err, null, 'error');
              }
  
              results[index] = result;
  
              if (++ completed === files.length){
                this.emit('finished', null, results);
              }

              done();
  
            });
          } catch (err) {
            return this._nextTick(err, null, 'error');
          }
        }
      }
    });

  }

  filter(predicate, finished){

    finished = once(finished);

    this.onDrained = err => finished(err, null);
    this.onFinished = results => finished(null, results);

    this._crawl(this.root, this.maxDepth, (err, files) => {
      if (err){
        this._nextTick(err, null, 'error');
      }

      const filtered = [];
      let completed = 0;

      files.forEach(enqueueTask.bind(this));

      function enqueueTask(file, index){
        this.push(task.bind(this));

        function task(done){
          try {
            predicate(file, (err, result) => {
              if (err){
                this._nextTick(err, null, 'error');
              }

              if (result){
                filtered[index] = file;
              }
              
              if (++ completed === files.length){
                this.emit('finished', filtered);
              }
  
              done();
  
            });
          } catch (err) {
            this._nextTick(err, null, 'error');
          }
        }
      }
    });
  }

  reduce(reducer, initialValue, finished){

    if (typeof initialValue === 'function' && finished === undefined){
      finished = initialValue;
      initialValue = undefined;
    }

    finished = once(finished);

    this.onDrained = err => finished(err, null);
    this.onFinished = results => finished(null, results);

    this._crawl(this.root, this.maxDepth, (err, files) => {
      if (err){
        this._nextTick(err, null, 'error');
      }

      let completed = 0, accumulator = initialValue;

      this._setConcurrency(1);

      if (accumulator === undefined){
        if (files.length === 0){
          throw TypeError('Reduce of empty array with no initial value');
        }

        enqueueTask(files[0]);

      } else {
        files.forEach(enqueueTask.bind(this));
      }

      function enqueueTask(file){
        this.push(task.bind(this));

        function task(done){
          try {
            if (accumulator === undefined){
              reducer(file, (err, result) => {
                if (err){
                  this._nextTick(err, null, 'error');
                }

                accumulator = result;

                if (++ completed === files.length){
                  this.emit('finished', accumulator);
                } else {
                  for (let i = 1; i < files.length; i += 1){
                    enqueueTask(files[i]);
                  }
                }

                done();
    
              });
            } else {
              reducer(accumulator, file, (err, result) => {
                if (err){
                  this._nextTick(err, null, 'error');
                }
                
                accumulator = result;

                if (++ completed === files.length){
                  this.emit('finished', accumulator);
                }

                done();
    
              });
            }
          } catch (err) {
            this._nextTick(err, null, 'error');
          }
        }
      }
    });
  }
}

module.exports = fsCrawler