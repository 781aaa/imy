'use strict';

function asyncHandler(handler) {
  return function wrapped(req, res, next) {
    try {
      const result = handler(req, res, next);
      if (result && typeof result.then === 'function') {
        result.catch(next);
      }
    } catch (error) {
      next(error);
    }
  };
}

module.exports = asyncHandler;
