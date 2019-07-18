const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const micromatch = require('micromatch');
const asyncIterator = require('./async-iterator');

/* 

  Implements a serial iterator approach. Given a maximum recursion depth, 
  fsCrawlerSerial will start at the root directory, recursing through sub directories,
  and collecting files into a flattened array. fsCrawlerSerial will wait until 
  the previous recursive call has completed or reached its maximum before continuing.

  options:
    maxDepth: number
      - If no maxDepth is specified, fsCrawlerSerial will crawl the entire directory tree from the root. 
      - If invoked high enough in the directory tree, this could cause a stackoverflow.
    ignorePaths: <array>
      - An array of regular expressions. Ignores node_modules by default
    match: <array>
      - An array of glob pattern strings. fsCrawlerSerial will evaluate each file against the glob,
        collecting only the filePaths that return true
      - If no match is provided, fsCrawlerSerial will match every file it encounters.
*/

function fsCrawlerSerial(root, options, finalCallback){
  const defaultOptions = {
    ignorePaths: [/node_modules/]  
  };

  finalCallback = typeof options === 'function' ? options : finalCallback;
  options = typeof options === 'function' ? defaultOptions : { ...defaultOptions, ...options };

  if (options.maxDepth === undefined){
    if (process.env.NODE_ENV === "development"){
      console.warn(chalk.yellow(`[fs-crawler] Warning: No maximum recursion depth set. This could adversely affect performance and possibly cause a stack overflow.`))
    }
  }

  function asyncCrawler(collection, worker, maxDepth, done){
    if (maxDepth !== undefined && maxDepth < 0){
      return process.nextTick(() => done(null, []));
    }

    let results = [];

    iterate(0);
    
    function iterate(index){
      if (index === collection.length){
        return done(null, results);
      }
      
      const task = collection[index];

      let shouldContinue = true;

      if(!options.match || !options.match.length) {
        if (options.predicate && typeof options.predicate === 'function'){
          try {
            shouldContinue = options.predicate(task);
          } catch (err) {
            return done(err, null);
          }
        }
    
        if (!shouldContinue){
          return done(null, results);
        }
      }
  
      worker (task, maxDepth, (err, result) => {
        if (err){
          return done(err, null);
        }

        if (options.match && options.match.length){
          let matches = micromatch(result, options.match);

          if (options.predicate && typeof options.predicate === 'function'){
            try {

              const filtered = [];
              filter(0);

              function filter(filterIndex){
                if (filterIndex === matches.length){
                  matches = filtered;
                  return;
                }

                options.predicate(matches[filterIndex], (err, res) => {
                  if (err){
                    return done(err, null);
                  }
                  if (res){
                    filtered.push(res);
                  }
                  return filter(filterIndex + 1);
                })
              }

            } catch (err) {
              return done(err, null);
            }
          }

        results = results.concat(matches);
        } else {
          results = results.concat(result);
        }

        return iterate(index + 1);

      });
    }
  }

  function isValidDir(dir){
    if (options.ignorePaths && options.ignorePaths.length){
      for (let i = 0; i < options.ignorePaths.length; i += 1){
        const rgx = options.ignorePaths[i];
        if (rgx.test(dir)){
          return false;
        }
      }
    }
    return true;
  }

  function resolvePaths(root, filePaths){
    return filePaths.map(filePath => path.join(root, filePath));
  }

  function fsWorker(rootPath, maxDepth, callback) {
    fs.stat(rootPath, (err, stats) => {
      if (err){
        if (err.code === 'ENOENT'){
          return callback(null, rootPath);
        }
        return callback(err, null);
      }

      if (stats && stats.isDirectory()){
        if (!isValidDir(rootPath)){
          return callback(null, []);
        }

        return fs.readdir(rootPath, (err, files) => {
          if (err){
            return callback(err, null, null);
          }

          maxDepth = maxDepth === undefined ? maxDepth : maxDepth - 1;

          asyncCrawler(resolvePaths(rootPath, files), fsWorker, maxDepth, (err, files) => {
            if (err){
              return callback(err, null);
            }
            return callback(null, files);
          });
        })
      }
      return callback(null, rootPath);
    });
  };

  asyncCrawler([root], fsWorker, options.maxDepth, finalCallback);
};

const options = {
  match: '**.js',
  maxDepth: 2,
  ignorePaths: [/node_modules/],
  predicate: (filePath, callback) => {
    fs.access(filePath, fs.W_OK, err => {
      if (err) return callback(null, false);
      return callback(null, true);
    })
  }
}

fsCrawlerSerial('/Users/ryanvazquez/Codesmith', options, (err, results) => {
  if (err) return console.error({err});
  console.log({results});
});

module.exports = fsCrawlerSerial;
