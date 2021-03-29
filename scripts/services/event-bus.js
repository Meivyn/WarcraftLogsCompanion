define(function () {
  let _listeners = [];

  function arrayRemove(arr, value) {

      return arr.filter(function(ele) {
          return ele != value;
      });
 
  }

  function getCallerFile() {
    const originalFunc = Error.prepareStackTrace;

    let callerfile;
    try {
      let currentfile;
      const err = new Error();

      Error.prepareStackTrace = function (err, stack) { return stack; };

      currentfile = err.stack.shift().getFileName();

      while (err.stack.length) {
        callerfile = err.stack.shift().getFileName();

        if(currentfile !== callerfile) break;
      }
    } catch (e) {}

    Error.prepareStackTrace = originalFunc;

    return callerfile;
  }

  function addListener(eventHandler) {
    console.log('Adding listener to event bus', getCallerFile());
    _listeners.push(eventHandler);
  }

  function removeListener(eventHandler) {
    console.log('Removing listener from event bus', getCallerFile());
    _listeners = arrayRemove(_listeners, eventHandler);
  }

  function trigger(eventName, data) {
    console.log('Event: ' + eventName, data, getCallerFile());
    for (let listener of _listeners)
    {
      listener(eventName, data);
    }
  }

  return {
    addListener,
    removeListener,
    trigger
  }
});