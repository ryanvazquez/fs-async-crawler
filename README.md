[![Build Status](https://travis-ci.org/ryanvazquez/fs-crawler.svg?branch=master)](https://travis-ci.org/ryanvazquez/fs-crawler)

# fs-crawler
A collection of configurable file system crawlers. Serial, Parallel, and Queued crawlers available

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
  | `callback`| `function` | The callback function will be fired after the crawler has completed crawling the directory tree or upon encountering an error. Provides `err` and `array` of files as arguments. | `true`|
  
  ### **Options**
  | Property | Type | Description | Default 
  | :------- | :--- | :---------- | :------ |
  | `maxDepth` | `number` |  A number representing the maximum depth of recursion. The crawler will terminate the crawling of a branch once the maxDepth has been reached. **Warning:** If not specified, the crawler will crawl the **entire** directory tree. This could have signficant performance impact. | `null`
  | `ignorePaths`| `array <rgx>` | An array of regular expressions. The crawler will ignore any directories and any files that match to provided paths. | `[/node_modules/]`
  | `match` | `array <glob>` | An array of glob strings. If provided, the crawler will collect only the files whose paths match the provided globs. | `[*]` 
  | `predicate` | `function` | Function to test if file path should be evaluated. Must return a `Boolean`. Fires after `ignorePaths` and before `match`. [See Configuration](#Configuration)

### **Configuration**
  | ignorePaths | match | predicate | result |
  | :--- |:--- | :---| :--- |
  | `true` | `true` | `true` | Crawler will ignore all ignoredPaths. Predicate will only evaluate matched files.
  | `false` | `true` | `true` | Predicate will only evalutate matched files.
  | `false` | `false` | `true` | Predicate will evaluate any file or directory.
  | `true` | `false` | `true` | Crawler will ignore all ignoredPaths. Predicate will evaluate any non-ignored file or directory.

    
# **Usage**
### Get all files within a directory.

> Note: Ignores `node_modules` by default.
```js
const crawler = require('fs-crawler').serial;

crawler('path/to/dir', (err, files) => {
  if (err){
    return handleError(err);
  }
  return doSomething(files);
});
```
       
### Get only files matching an extension in a root directory

```js
const crawler = require('fs-crawler').serial;

// locate all JavaScript and JSX files in given directory
const options = {
  ignorePaths: [/node_modules/],
  match: [ "**.(js|jsx)" ], 
};

crawler('path/to/dir', options, (err, files) => {
  if (err){
    return handleError(err);
  }
  return doSomethingElse(files);
);
```

### Get only files matching an extension in a root directory

```js
const crawler = require('fs-crawler').serial;

// locate all JavaScript and JSX files in given directory
const options = {
  ignorePaths: [/node_modules/],
  match: [ "**.(js|jsx)" ], 
};

crawler('path/to/dir', options, (err, files) => {
  if (err){
    return handleError(err);
  }
  return callThePresident(files);
);
```

### Get only files matching an extension that a Node process has permission to edit;

```js
const crawler = require('fs-crawler').serial;

// locate all JSON files inside given directory
const options = {
  ignorePaths: [/node_modules/],
  predicate: path => /\.json$/.test(filePath)
};

crawler('path/to/dir', options, (err, files) => {
  if (err){
    return handleError(err);
  }
  return processToBinaryAndReadToMomOverThePhone(files);
);
```
