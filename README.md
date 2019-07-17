# fs-crawler
A collection of configurable file system crawlers

# How to Use
```
  const crawler = require('fs-crawler').serial;

  // with default options
  crawler.('path/to/dir', (err, results) => {
    if (err){
    // do something with error
    }
    // do something with results
  });

```