'use strict';

function ok(res, data = null, message = 'ok') {
  return res.status(200).json({ success: true, message, data });
}

function created(res, data = null, message = 'created') {
  return res.status(201).json({ success: true, message, data });
}

function noContent(res, message = 'ok') {
  return res.status(200).json({ success: true, message, data: null });
}

function fail(res, status, message, code = 'ERROR', details = null) {
  const body = { success: false, message, code };
  if (details !== null && details !== undefined) {
    body.details = details;
  }
  return res.status(status).json(body);
}

function paginated(res, items, total, page, pageSize) {
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  return res.status(200).json({
    success: true,
    message: 'ok',
    data: {
      items,
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
  });
}

module.exports = {
  ok,
  created,
  noContent,
  fail,
  paginated,
};
