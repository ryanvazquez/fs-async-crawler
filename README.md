[![Build Status](https://travis-ci.org/ryanvazquez/fs-crawler.svg?branch=master)](https://travis-ci.org/ryanvazquez/fs-crawler)

# fs-crawler
A collection of configurable file system crawlers.

## **Install**
```sh
  npm install fs-crawler
```

# fs-crawler.serial
  ### **Description**
  Collects all files of a given directory into a flattened array. Traverses root directory **serially**. Evaluates one branch at a time until all files have been collected or until maxDepth is reached. Terminates upon encountering an error. Signficantly slower than  **fs-crawler.parallel** or **fs-crawler.queue**.

  ### **Params**
  | Param | Type | Description | Required |
  | :------- | :--- | :---------- | :------ |
  | `path` | `string` | **Absolute** path of the directory to crawl | `true`|
  | `options` | `object` | [See Options](#Options) | `false` |
  | `callback`| `function` | The callback function will be fired after the crawler has completed crawling the directory tree or upon encountering an error. Provides `err` and `array` of absolute file paths as arguments. | `true`|
  
  ### **Options**
  | Property | Type | Description | Default 
  | :------- | :--- | :---------- | :------ |
  | `maxDepth` | `number` |  A number representing the maximum depth of recursion. The crawler will terminate the crawling of a branch once the maxDepth has been reached. **Warning:** If not specified, the crawler will crawl the **entire** directory tree. This could have signficant performance impact. | `null`
  | `ignorePaths`| `array <rgx>` | An array of regular expressions. The crawler will ignore any directories and any files that match to provided paths. | `[/node_modules/]`
  | `match` | `array <glob>` | An array of glob strings. If provided, the crawler will collect only the files whose paths match the provided globs. | `[*]` 
  | `strict` | `boolean` | Determines whether the crawler throw an error when trying to access a file the parent process does not have permissions for.  | `false` |

    
# **API**
## fsCrawler.prototype.all

### Crawls entire directory starting from the root. Returns an array of absolute filePaths. Ignores node_modules by default

> crawler.all(finalCallback)

quick setup: 
```js
const fsCrawler = require('fs-crawler');
const crawler = new fsCrawler({ root: 'path/to/dir' });

// gets all files within root
crawler.all((err, files) => {
  if (err){
    return handleError(err);
  }
  return doSomething(files);
});
```

with options:

```js
const fsCrawler = require('fs-crawler');
const config = {
  root: 'path/to/dir',
  ignorePaths: [/node_modules/, /__tests__/],
  match: ['**.js']
}
const crawler = new fsCrawler(config);

// get all JS files within root
crawler.all((err, files) => {
  if (err){
    return handleError(err);
  }
  return doSomething(files);
});
```
       
## fsCrawler.prototype.forEach

### Crawls the directory and performs an async operation on each file.

> crawler.forEach(iteratee, finalCallback);

```js
const fsCrawler = require('fs-crawler');
const config = {
  root: 'path/to/log-files',
  ignorePaths: [/node_modules/],
  match: ['**.log']
}
const crawler = new fsCrawler(config);

// get all log files within root and delete them
crawler.forEach((file, done) => {

  deleteFile(file, (err, result) => {
    if (err){
      return done(err);
    }
    return done(null);
  })

}, (err) => {
  if (err){
    console.log('Something went wrong');
  } else {
    console.log('Everything ok!');
  }
});
```

## fsCrawler.prototype.map

### Crawls the directory, performs an async operation on each file and collects each result in an array

> crawler.map(iteratee, finalCallback);

```js
const fsCrawler = require('fs-crawler');
const config = {
  root: 'path/to/dir',
  match: ['**.txt']
}
const crawler = new fsCrawler(config);

// find all txt files within root and create an array of their contents
crawler.map((file, done) => {

  getContentsOfTxtFile(file, (err, content) => {
    if (err){
      return done(err, null);
    }
    return done(null, content);
  })

}, (err, contents) => {
  if (err){
    console.log('The first err from ');
  } else {
    console.log('')
  }
});
```