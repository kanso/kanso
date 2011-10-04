#!/usr/bin/env node
require('../lib/logger').clean_exit = true;
require('../deps/nodeunit/bin/nodeunit');
