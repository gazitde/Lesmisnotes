'use strict';

// Keep this function outside dist/. It must execute on the server, never ship as an asset.
const { createContactHandler } = require('../server/contact-service.cjs');
module.exports = createContactHandler();

