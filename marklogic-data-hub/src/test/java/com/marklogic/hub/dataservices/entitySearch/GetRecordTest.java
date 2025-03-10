package com.marklogic.hub.dataservices.entitySearch;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.marklogic.client.io.DocumentMetadataHandle;
import com.marklogic.client.io.Format;
import com.marklogic.hub.AbstractHubCoreTest;
import com.marklogic.hub.dataservices.EntitySearchService;
import com.marklogic.hub.dataservices.FlowService;
import com.marklogic.hub.flow.FlowInputs;
import com.marklogic.hub.flow.FlowRunner;
import com.marklogic.hub.flow.impl.FlowRunnerImpl;
import com.marklogic.hub.flow.RunFlowResponse;
import com.marklogic.hub.step.RunStepResponse;
import com.marklogic.hub.test.Customer;
import com.marklogic.hub.test.ReferenceModelProject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class GetRecordTest extends AbstractHubCoreTest {

    private EntitySearchService service;
    private FlowService flowService;

    @BeforeEach
    void beforeEach() {
        resetDatabases();
        runAsAdmin();
        service = EntitySearchService.on(getHubClient().getFinalClient());
        flowService = FlowService.on(getHubClient().getFinalClient());
    }

    @Test
    void testGetRecord() {
        ReferenceModelProject project;project = installReferenceModelProject();
        project.setCustomerDocumentMetadata(new DocumentMetadataHandle()
                .withCollections(ReferenceModelProject.CUSTOMER_ENTITY_TYPE)
                .withPermission("data-hub-common", DocumentMetadataHandle.Capability.READ, DocumentMetadataHandle.Capability.UPDATE)
                .withMetadataValue("datahubCreatedInFlow", "getRecordTestFlow")
                .withMetadataValue("datahubCreatedByStep", "getRecordTestStep"));

        Customer customer1 = new Customer();
        customer1.setCustomerId(1);
        customer1.setName("Jane");
        customer1.setCustomerNumber(123456789);
        customer1.setCustomerSince("2012-05-16");

        project.createCustomerInstance(customer1);
        project.createCustomerInstance(customer1, Format.XML, "doesnt-matter");

        // xml record with metadata
        ObjectNode response = (ObjectNode) service.getRecord("/Customer1.xml");
        assertNotNull(response.get("data"));
        assertNotNull(response.get("documentSize"));
        assertNotNull(response.get("entityInstanceProperties"));
        assertEquals("getRecordTestStep", response.get("recordMetadata").get("datahubCreatedByStep").asText());
        assertEquals("getRecordTestFlow", response.get("recordMetadata").get("datahubCreatedInFlow").asText());
        assertEquals("xml", response.get("recordType").asText());

        // json record with metadata
        response = (ObjectNode) service.getRecord("/Customer1.json");
        assertNotNull(response.get("data"));
        assertNotNull(response.get("documentSize"));
        assertNotNull(response.get("entityInstanceProperties"));
        assertEquals("getRecordTestStep", response.get("recordMetadata").get("datahubCreatedByStep").asText());
        assertEquals("getRecordTestFlow", response.get("recordMetadata").get("datahubCreatedInFlow").asText());
        assertEquals("json", response.get("recordType").asText());

        // record with no metadata
        project.setCustomerDocumentMetadata(new DocumentMetadataHandle()
                .withCollections(ReferenceModelProject.CUSTOMER_ENTITY_TYPE)
                .withPermission("data-hub-common", DocumentMetadataHandle.Capability.READ, DocumentMetadataHandle.Capability.UPDATE));

        Customer customer2 = new Customer();
        customer2.setCustomerId(2);
        customer2.setName("Sally");
        customer2.setCustomerNumber(123456780);
        customer2.setCustomerSince("2012-05-16");
        project.createCustomerInstance(customer2);

        response = (ObjectNode) service.getRecord("/Customer2.json");
        assertNotNull(response.get("data"));
        assertNotNull(response.get("documentSize"));
        assertNotNull(response.get("entityInstanceProperties"));
        assertTrue(response.get("recordMetadata").isNull());
        assertEquals("json", response.get("recordType").asText());
    }

    @Test
    public void testRecordHistoryWithTwoProvenanceRecords() {
        synchronized(this) {
            installProjectInFolder("test-projects/provenance-test" );
            String path = "test-projects/provenance-test/data/customers";
            RunStepResponse mappingStepResponse = null;
            FlowInputs inputs = null;
            FlowRunner flowRunner = null;

            try {
                   inputs = new FlowInputs("inline");
                   inputs.setInputFilePath(readFileFromClasspath(path).getAbsolutePath());
                   flowRunner = new FlowRunnerImpl(getHubClient());
                   RunFlowResponse flowResponse = flowRunner.runFlow(inputs);
                   flowRunner.awaitCompletion();
                   mappingStepResponse = flowResponse.getStepResponses().get("2");
            } catch (Error e) {
                    logger.error("Error getting step " + e.getMessage());
            }

            assertEquals(true, mappingStepResponse.isSuccess(), "mappingStepResponse: " + mappingStepResponse.toString() );
            assertNull( mappingStepResponse.getStepOutput());

            ObjectNode response = (ObjectNode) service.getRecord("/customers/customer1.json");
            ArrayNode history = (ArrayNode) response.get("history");
            assertEquals(2, history.size());
            assertNotNull(history.get(0).get("updatedTime"));
            assertEquals("inline", history.get(0).get("flow").asText());
            assertEquals("map", history.get(0).get("step").asText());
            assertEquals(getHubConfig().getMlUsername(), history.get(0).get("user").asText());
            assertNotNull(history.get(1).get("updatedTime"));
            assertEquals("inline", history.get(1).get("flow").asText());
            assertEquals("ingest", history.get(1).get("step").asText());
            assertEquals(getHubConfig().getMlUsername(), history.get(1).get("user").asText());

            inputs.setFlowName("referenced");
            inputs.setInputFilePath(readFileFromClasspath(path).getAbsolutePath());
            flowRunner = new FlowRunnerImpl(getHubClient());
            flowRunner.runFlow(inputs);
            flowRunner.awaitCompletion();

            response = (ObjectNode) service.getRecord("/history-test/customer1.json");
            history = (ArrayNode) response.get("history");
            assertEquals(2, history.size());
            assertNotNull(history.get(0).get("updatedTime"));
            assertEquals("referenced", history.get(0).get("flow").asText());
            assertEquals("map-customer", history.get(0).get("step").asText());
            assertEquals(getHubConfig().getMlUsername(), history.get(0).get("user").asText());
            assertNotNull(history.get(1).get("updatedTime"));
            assertEquals("referenced", history.get(1).get("flow").asText());
            assertEquals("ingest-customer", history.get(1).get("step").asText());
            assertEquals(getHubConfig().getMlUsername(), history.get(1).get("user").asText());
        }
    }

    @Test
    public void testRecordHistoryTestWithOneProvenanceRecord() {
        installProjectInFolder("test-projects/provenance-test");
        String path = "test-projects/provenance-test/data/customers";

        FlowInputs inputs = new FlowInputs("inline", "1");
        inputs.setInputFilePath(readFileFromClasspath(path).getAbsolutePath());
        FlowRunner flowRunner = new FlowRunnerImpl(getHubClient());
        flowRunner.runFlow(inputs);
        flowRunner.awaitCompletion();

        ObjectNode response = (ObjectNode) service.getRecord("/customers/customer1.json");
        ArrayNode history = (ArrayNode) response.get("history");
        assertEquals(1, history.size());
        assertNotNull(history.get(0).get("updatedTime"));
        assertEquals("inline", history.get(0).get("flow").asText());
        assertEquals("ingest", history.get(0).get("step").asText());
        assertEquals(getHubConfig().getMlUsername(), history.get(0).get("user").asText());

        inputs.setFlowName("referenced");
        inputs.setInputFilePath(readFileFromClasspath(path).getAbsolutePath());
        flowRunner = new FlowRunnerImpl(getHubClient());
        flowRunner.runFlow(inputs);
        flowRunner.awaitCompletion();

        response = (ObjectNode) service.getRecord("/history-test/customer1.json");
        history = (ArrayNode) response.get("history");
        assertEquals(1, history.size());
        assertNotNull(history.get(0).get("updatedTime"));
        assertEquals("referenced", history.get(0).get("flow").asText());
        assertEquals("ingest-customer", history.get(0).get("step").asText());
        assertEquals(getHubConfig().getMlUsername(), history.get(0).get("user").asText());
    }

    @Test
    public void testRecordHistoryTestWithNoProvenanceRecord() {
        ReferenceModelProject project = installReferenceModelProject();
        project.setCustomerDocumentMetadata(new DocumentMetadataHandle()
                .withCollections(ReferenceModelProject.CUSTOMER_ENTITY_TYPE)
                .withPermission("data-hub-common", DocumentMetadataHandle.Capability.READ, DocumentMetadataHandle.Capability.UPDATE)
                .withMetadataValue("datahubCreatedInFlow", "getRecordTestFlow")
                .withMetadataValue("datahubCreatedByStep", "getRecordTestStep")
                .withMetadataValue("datahubCreatedBy", "test-data-hub-developer")
                .withMetadataValue("datahubCreatedOn", "2020-11-23T19:03:34.399008-08:00"));

        Customer customer1 = new Customer();
        customer1.setCustomerId(1);
        customer1.setName("Jane");
        project.createCustomerInstance(customer1);
        ObjectNode response = (ObjectNode) service.getRecord("/Customer1.json");
        ArrayNode history = (ArrayNode) response.get("history");
        assertEquals(1, history.size());

        assertNotNull(history.get(0).get("updatedTime"));
        assertEquals("getRecordTestFlow", history.get(0).get("flow").asText());
        assertEquals("getRecordTestStep", history.get(0).get("step").asText());
        assertEquals("test-data-hub-developer", history.get(0).get("user").asText());

        // record with no metadata
        project.setCustomerDocumentMetadata(new DocumentMetadataHandle()
                .withCollections(ReferenceModelProject.CUSTOMER_ENTITY_TYPE)
                .withPermission("data-hub-common", DocumentMetadataHandle.Capability.READ, DocumentMetadataHandle.Capability.UPDATE));

        Customer customer2 = new Customer();
        customer2.setCustomerId(2);
        customer2.setName("Sally");
        project.createCustomerInstance(customer2);

        response = (ObjectNode) service.getRecord("/Customer2.json");
        history = (ArrayNode) response.get("history");
        assertEquals(0, history.size());
    }

    @Test
    public void provenanceDataContainsADeletedFlow() {
        installProjectInFolder("test-projects/provenance-test");
        String path = "test-projects/provenance-test/data/customers";

        FlowInputs inputs = new FlowInputs("inline", "1");
        inputs.setInputFilePath(readFileFromClasspath(path).getAbsolutePath());
        FlowRunner flowRunner = new FlowRunnerImpl(getHubClient());
        flowRunner.runFlow(inputs);
        flowRunner.awaitCompletion();

        // delete a flow
        flowService.deleteFlow("inline");

        ObjectNode response = (ObjectNode) service.getRecord("/customers/customer1.json");
        ArrayNode history = (ArrayNode) response.get("history");
        assertEquals(1, history.size());
        assertNull(history.get(0).get("flow"));
        assertNull(history.get(0).get("step"));
    }
}
