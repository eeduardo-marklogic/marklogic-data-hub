const mlSmMergeRest = require("/marklogic.rest.resource/mlSmMerge/assets/resource.sjs");
const test = require("/test/test-helper.xqy");

const assertions = [];

const emptyDocument = new NodeBuilder().startDocument().endDocument().toNode();
const context = {};
const validMergeParams = { flowName: "CurateCustomerJSON", step: "2", uri: ["/content/customer1.json", "/content/customer2.json"] };

const validResults = mlSmMergeRest.POST(context, validMergeParams, emptyDocument);

assertions.push(
  test.assertTrue(validResults.success,"Merge should be successful"),
  test.assertEqual(2, validResults.mergedURIs.length),
  test.assertTrue(validResults.mergedDocument.value.envelope.headers.interceptorCalled, "Interceptor should be called on merge.")
);

const invalidMergeParams = { flowName: "CurateCustomerJSON", step: "1", uri: ["/content/customer1.json", "/content/customer2.json"] };

try {
  mlSmMergeRest.POST(context, invalidMergeParams, emptyDocument);
  assertions.push(test.assertTrue(false,"Merge should have failed"));
} catch (e) {
  assertions.push(test.assertEqual("400", e.data[0], xdmp.toJsonString(e)));
  assertions.push(test.assertEqual("The step referenced must be a merging step. Step type: matching", e.data[1], xdmp.toJsonString(e)));
}

const validMergeParamsWithoutStep = { flowName: "CurateCustomerJSON", uri: ["/content/customer1.json", "/content/customer2.json"] };

const validResultsWithoutStep = mlSmMergeRest.POST(context, validMergeParamsWithoutStep, emptyDocument);

assertions.push(
  test.assertTrue(validResultsWithoutStep.success,"Merge should be successful"),
  test.assertEqual(2, validResultsWithoutStep.mergedURIs.length),
  test.assertTrue(validResultsWithoutStep.mergedDocument.value.envelope.headers.interceptorCalled, "Interceptor should be called on merge.")
);

assertions;