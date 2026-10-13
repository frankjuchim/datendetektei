'use strict';
// GET /api/themen – öffentliche Themenübersicht aus dem Seed (Spec §7.12, src/services/themen.js). Ohne Lösungen.

const express = require('express');

function themenRouten({ themen }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  router.get('/api/themen', (req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json(themen.themen());
  });
  return router;
}

module.exports = { themenRouten };
