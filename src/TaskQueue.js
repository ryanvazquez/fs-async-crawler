class TaskQueue {
  constructor(config){
    this.concurrency = config.concurrency || 4;
    this.running = 0;
    this.queue = [];
    this.done = this.done.bind(this);
  }

  onError(err, callback){
    this.drain();
    callback(err, null);
  }

  nextTickError(error, callback){
    return process.nextTick(() => this.onError(error, callback));
  }

  nextTickResult(result, callback){
    return process.nextTick(() => callback(null, result));
  }

  setConcurrency(n){
    if (n < 1){
      throw new TypeError('Invalid value. Concurrency must be set to a value greater than zero');
    }
    this.concurrency = n;
  }

  drain(){
    while (this.queue.length){
      this.queue.pop();
    }
  }

  push(task){
    this.queue.push(task);
    this.next();
  }

  done(){
    this.running --;
    this.next();
  }

  next(){
    while (this.running < this.concurrency && this.queue.length){
      const task = this.queue.shift();
      task(this.done);
      this.running ++;
    }
  }
}

module.exports = TaskQueue;
