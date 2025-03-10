'use strict';

const test = require("/test/test-helper.xqy");
const utils = require('/test/suites/data-hub/5/data-services/lib/mappingService.sjs').DocumentForTestingUtils;

const assertions = [];

const result = utils.invokeService(utils.STEP_NAME1, '/content/sampleCustomerDoc.json');

try {
  // Tests for data section.
  assertions.push(test.assertExists(result.data, 'Top-level "data" property does not exist'));
  assertions.push(test.assertEqual(204, Number(result.data.CustOrders.CustomerID)));
  assertions.push(test.assertEqual('Sparrow', String(result.data.CustOrders.Nicknames.Nickname[1])));

  // Test(s) for namespaces section.
  assertions.push(test.assertEqualJson({}, result.namespaces, 'The "namespaces" property should be an empty object for JSON input.'));

  // Test(s) for format section.
  assertions.push(test.assertEqual('JSON', String(result.format), 'The "format" property should be set to "JSON".'));

  // Tests for sourceProperties section.
  const sourceProperties = result.sourceProperties;
  // Array with valid QName (should not include array-node()
  let name = 'Nickname';
  assertions.push();

  utils.addSourcePropertyAssertions(assertions, sourceProperties, name, `/CustOrders/Nicknames/${name}`, true, 2);
  // Invalid QNames
  name = '$id';
  utils.addSourcePropertyAssertions(assertions, sourceProperties, name, `/CustOrders/invalidQNames/node('${name}')`, false, 2);
  name = '$array-of-objects';
  utils.addSourcePropertyAssertions(assertions, sourceProperties, name, `/CustOrders/invalidQNames/node('${name}')`, true, 2);
  name = '$array-of-values';
  utils.addSourcePropertyAssertions(assertions, sourceProperties, name, `/CustOrders/invalidQNames/array-node('${name}')/node()`, true, 2);
  name = 'invalidLocalName:asdf';
  utils.addSourcePropertyAssertions(assertions, sourceProperties, name, `/CustOrders/OddPropertyNames/node('${name}')`, false, 2);
  // Unicode character in property name.
  name = 'propName\u{EFFFF}IncludesUnicode';
  utils.addSourcePropertyAssertions(assertions, sourceProperties, name, `/CustOrders/OddPropertyNames/${name}`, false, 2);
} catch (ex) {
  assertions.push(test.assertFalse(true, `Unexpected exception: ${ex.toLocaleString()}; Result: ${xdmp.toJsonString(result)}`));
}
assertions;
