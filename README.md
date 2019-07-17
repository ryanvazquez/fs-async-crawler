# fs-crawler
A collection of configurable file system crawlers.

# How to Use

Warning: If no maxDepth option is set, fs-crawler will crawl the **entire** directory starting from the root. This could have signficant performance issues for large directories.


    const crawler = require('fs-crawler').serial;
    
    crawler('path/to/dir', (err, results) => {
      if (err){
        // do something with the error
      } else {
        // do something with the results
      }
     });
  
     // get ALL files matching a file extension in a root directory
     
    crawler('path/to/dir', 
      {
        match: ['**.[js](x)'], 
        ignorePaths: [/node_modules/] 
      }, 
      (err, result) => {
        if (err){
          // do something with the error
        } else {
          // do something with the result
      });
