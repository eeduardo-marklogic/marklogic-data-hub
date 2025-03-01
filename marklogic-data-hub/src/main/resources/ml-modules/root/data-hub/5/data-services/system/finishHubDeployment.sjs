/**
 Copyright 2012-2021 MarkLogic Corporation

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
'use strict';

// No privilege required: For now it is only used during installation and installation requires admin privileges.

const jobQueryLib = require("/data-hub/5/flow/job-query-lib.sjs");
const provLib = require('/data-hub/5/provenance/prov-lib.sjs');
const systemLib = require('/data-hub/5/system/system-lib.sjs');

jobQueryLib.installJobTemplates();
provLib.installProvTemplates();
systemLib.saveHubConfigInDocumentsDatabase();
