'use strict';

const supervisorService = require('../services/supervisor.service');
const { ok } = require('../utils/response');

function health(req, res) {
  return ok(res, supervisorService.getHealth());
}

function overview(req, res) {
  return ok(res, supervisorService.getOverview(req.query));
}

function records(req, res) {
  return ok(
    res,
    supervisorService.listRecords(req.query, req.query.limit),
  );
}

function events(req, res) {
  return ok(res, supervisorService.listEvents({
    student: req.query.student,
    studentId: req.query.studentId,
    status: req.query.status,
    offset: req.query.offset,
    limit: req.query.limit,
  }));
}

function acknowledgeEvent(req, res) {
  return ok(res, supervisorService.acknowledgeEvent(req.params.id));
}

module.exports = {
  health,
  overview,
  records,
  events,
  acknowledgeEvent,
};
