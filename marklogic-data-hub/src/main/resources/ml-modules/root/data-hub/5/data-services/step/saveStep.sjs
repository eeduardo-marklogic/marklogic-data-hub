/**
 Copyright (c) 2021 MarkLogic Corporation

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

const Artifacts = require('/data-hub/5/artifacts/core.sjs');
const StepDefinition = require("/data-hub/5/impl/stepDefinition.sjs");
const consts = require("/data-hub/5/impl/consts.sjs");
const httpUtils = require("/data-hub/5/impl/http-utils.sjs");
const entityLib = require("/data-hub/5/impl/entity-lib.sjs");

var stepDefinitionType;
var stepProperties;
var overwrite;
var throwErrorIfStepIsPresent;

stepDefinitionType = stepDefinitionType.toLowerCase();

if ("ingestion" === stepDefinitionType) {
  xdmp.securityAssert("http://marklogic.com/data-hub/privileges/write-ingestion", "execute");
} else if ("mapping" === stepDefinitionType) {
  xdmp.securityAssert("http://marklogic.com/data-hub/privileges/write-mapping", "execute");
} else if ("matching" === stepDefinitionType || "merging" === stepDefinitionType) {
  xdmp.securityAssert("http://marklogic.com/data-hub/privileges/write-match-merge", "execute");
} else if ("custom" === stepDefinitionType) {
  xdmp.securityAssert("http://marklogic.com/data-hub/privileges/write-custom", "execute");
} else if ("matching" === stepDefinitionType || "merging" === stepDefinitionType || "mastering" === stepDefinitionType) {
  xdmp.securityAssert("http://marklogic.com/data-hub/privileges/write-flow", "execute");
} else {
  httpUtils.throwBadRequest("Unsupported step definition type: " + stepDefinitionType);
}

stepProperties = stepProperties.toObject();
const stepName = stepProperties.name;

xdmp.trace(consts.TRACE_STEP, `Saving step with name ${stepName} and type ${stepDefinitionType}`);

let existingStep = fn.head(cts.search(cts.andQuery([
  cts.collectionQuery("http://marklogic.com/data-hub/steps"),
  cts.jsonPropertyValueQuery("stepDefinitionType", stepDefinitionType, "case-insensitive"),
  cts.jsonPropertyValueQuery("name", stepName)
])));

if(existingStep && throwErrorIfStepIsPresent){
  httpUtils.throwBadRequest("A step of type '" + stepDefinitionType + "' with the name '" +  stepName +  "' already exists");
}

if (existingStep) {
  let updatedStep;
  if(overwrite){
    xdmp.trace(consts.TRACE_STEP, `Step with name ${stepName} and type ${stepDefinitionType} already exists, the existing step will be overwritten`);
    updatedStep = stepProperties;
  }
  else{
    xdmp.trace(consts.TRACE_STEP, `Step with name ${stepName} and type ${stepDefinitionType} already exists, so will update`);
    updatedStep = Object.assign(existingStep.toObject(), stepProperties);
  }
  Artifacts.setArtifact(stepDefinitionType, stepName, updatedStep);
}
else {
  xdmp.trace(consts.TRACE_STEP, `Step with name ${stepName} and type ${stepDefinitionType}  does not exist, so will create`);

  // For now, can assume the stepDefinitionName based on the type. Can add stepDefinitionType as a parameter once we need
  // more flexibility.
  let stepDefinitionName;
  if ("mapping" === stepDefinitionType) {
    stepDefinitionName = "entity-services-mapping";
  }
  else if("matching" === stepDefinitionType){
    stepDefinitionName = "default-matching";
  }
  else if("merging" === stepDefinitionType){
    stepDefinitionName = "default-merging";
  }
  else {
    // if 'stepDefinitionName' is not set for ingestion step, it will be set to 'default-ingestion'
    if ("ingestion" === stepDefinitionType && !stepProperties.stepDefinitionName){
      stepDefinitionName = "default-ingestion";
    }
    else {
      stepDefinitionName = stepProperties.stepDefinitionName;
    }
  }
  stepProperties.stepDefinitionName = stepDefinitionName;
  stepProperties.stepDefinitionType = stepDefinitionType;
  stepProperties.stepId = stepProperties.stepId || stepName + "-" + stepDefinitionType;

  if (!stepProperties.stepDefinitionName){
    throw new Error(`Missing required property 'stepDefinitionName' for step: ${stepName}`);
  }

  if (stepProperties.entityType){
    if (fn.docAvailable("/entities/"+ stepProperties.entityType +".entity.json")){
      const entityTypeId = entityLib.getEntityTypeId(entityLib.findModelByEntityName(stepProperties.entityType), stepProperties.entityType);
      stepProperties.targetEntityType = entityTypeId;
    }
    else {
      stepProperties.targetEntityType = stepProperties.entityType;
    }
    delete stepProperties.entityType;
  }

  const stepDef = new StepDefinition().getStepDefinitionByNameAndType(stepDefinitionName, stepDefinitionType);
  if (stepDef != null && stepDef.options != null) {
    const stepDefOptions = stepDef.options;
    Object.keys(stepDefOptions).forEach(key => {
      // Step artifact libraries are expected to apply their own concept of default collections
      // And outputFormat should not be included because HC expects to use targetFormat instead
      if (stepProperties[key] == undefined && key !== "collections" && key !== "outputFormat") {
        stepProperties[key] = stepDefOptions[key];
      }
    });
  }
  if (isEmptyString(stepProperties.customHook)){
    stepProperties.customHook = {};
  }
  if (isEmptyString(stepProperties.headers) || isEmptyObject(stepProperties.headers)) {
    stepProperties.headers = "ingestion" === stepDefinitionType ? {
      sources: [{name: stepProperties.datahubSourceName || stepName}],
      lastLoadedDateTime: "currentDateTime",
      createdOn: "currentDateTime",
      createdBy: "currentUser"
    } :{};
  }
  if (isEmptyString(stepProperties.interceptors)){
    stepProperties.interceptors = [];
  }

  Artifacts.setArtifact(stepDefinitionType, stepName, stepProperties);
}

function isEmptyString(property) {
  return property !== undefined && typeof property === 'string' && property.trim().length === 0;
}

function isEmptyObject(property) {
  return typeof stepProperties.headers === 'object' && Object.keys(stepProperties.headers).length === 0
}
