package com.marklogic.hub.flow;

import com.fasterxml.jackson.databind.JsonNode;
import com.marklogic.client.document.JSONDocumentManager;
import com.marklogic.client.io.DocumentMetadataHandle;
import com.marklogic.client.io.JacksonHandle;
import com.marklogic.hub.AbstractHubCoreTest;
import com.marklogic.hub.flow.impl.JobStatus;
import com.marklogic.hub.step.RunStepResponse;
import com.marklogic.hub.test.ReferenceModelProject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

public class RunStepWithInterceptorsTest extends AbstractHubCoreTest {

    private final static String CUSTOMER1_URI = "/echo/customer1.json";
    private final static String CUSTOMER2_URI = "/echo/customer2.json";

    @BeforeEach
    void beforeEach() {
        ReferenceModelProject project = installReferenceModelProject();
        runAsDataHubOperator();
        project.createRawCustomer(1, "Jane");
        project.createRawCustomer(2, "John");
    }

    @Test
    void overrideUriViaIngestionStep() {
        makeInputFilePathsAbsoluteInFlow("stepInterceptors");

        runAsDataHubOperator();
        RunFlowResponse response = runFlow(new FlowInputs("stepInterceptors", "4"));
        assertEquals(JobStatus.FINISHED.toString(), response.getJobStatus());

        final String expectedUri = "/overridden/1.json";
        JSONDocumentManager mgr = getHubClient().getStagingClient().newJSONDocumentManager();
        assertNotNull(mgr.exists(expectedUri), "The URI should have been overridden by the step interceptor");

        JsonNode doc = mgr.read(expectedUri, new JacksonHandle()).get();
        assertEquals("1", doc.get("envelope").get("instance").get("CustomerID").asText());
    }

    @Test
    void twoInterceptorsOnAStep() {
        RunFlowResponse response = runFlow(new FlowInputs("stepInterceptors", "1"));
        assertEquals(JobStatus.FINISHED.toString(), response.getJobStatus());

        JSONDocumentManager mgr = getHubClient().getFinalClient().newJSONDocumentManager();
        Stream.of(CUSTOMER1_URI, CUSTOMER2_URI).forEach(uri -> {
            JsonNode customer = mgr.read(uri, new JacksonHandle()).get();
            assertEquals("world", customer.get("envelope").get("headers").get("hello").asText(),
                "The hello header should have been added by the addHeaders.sjs interceptor");
        });

        DocumentMetadataHandle.DocumentPermissions perms = mgr.readMetadata(CUSTOMER1_URI, new DocumentMetadataHandle()).getPermissions();
        assertEquals(2, perms.get("data-hub-operator").size());
        assertEquals(DocumentMetadataHandle.Capability.READ, perms.get("qconsole-user").iterator().next(),
            "The addPermissions.sjs interceptor should have added qconsole-user/read to the first document since it " +
                "has a name of 'Jane'");

        perms = mgr.readMetadata(CUSTOMER2_URI, new DocumentMetadataHandle()).getPermissions();
        assertEquals(2, perms.get("data-hub-operator").size());
        assertNull(perms.get("qconsole-user"),
            "The second customer shouldn't have a qconsole-user permission since it doesn't have a name of 'Jane'");
    }

    @Test
    void missingInterceptorModule() {
        RunFlowResponse response = runFlow(new FlowInputs("stepInterceptors", "2"));
        assertEquals(JobStatus.STOP_ON_ERROR.toString(), response.getJobStatus(),
            "The job should have failed because step 2 references an invalid path");

        final RunStepResponse stepResponse = response.getStepResponses().get("2");
        String stepOutput = stepResponse.getStepOutput().get(0);
        assertTrue(stepOutput.contains("XDMP-MODNOTFOUND"), "The step output should have a single entry with an " +
            "error message indicating that the module was not found and thus XDMP-MODNOTFOUND should be present; " +
            "actual step output: " + stepOutput);

        assertEquals(2, stepResponse.getTotalEvents(), "The two customers should have been processed");
        assertEquals(0, stepResponse.getSuccessfulEvents(), "Both customers should have failed processing");
        assertEquals(2, stepResponse.getFailedEvents(), "Both customers should have failed processing");
        assertEquals(0, stepResponse.getSuccessfulBatches());
        assertEquals(1, stepResponse.getFailedBatches());

        JSONDocumentManager mgr = getHubClient().getFinalClient().newJSONDocumentManager();
        Stream.of(CUSTOMER1_URI, CUSTOMER2_URI).forEach(uri -> {
            assertNull(mgr.exists(uri), "The doc written by the custom step should not have been written, due to the interceptor failure");
        });
    }

    @Test
    void missingWhen() {
        RunFlowResponse response = runFlow(new FlowInputs("stepInterceptors", "3"));
        assertEquals(JobStatus.FINISHED.toString(), response.getJobStatus());

        JSONDocumentManager mgr = getHubClient().getFinalClient().newJSONDocumentManager();
        Stream.of(CUSTOMER1_URI, CUSTOMER2_URI).forEach(uri -> {
            JsonNode customer = mgr.read(uri, new JacksonHandle()).get();
            assertFalse(customer.get("envelope").get("headers").has("hello"),
                "Because the interceptor doesn't have a 'when' property, the interceptor will be ignored (as opposed to throwing an error).");
        });
    }

    @Test
    void stopOnErrorIsTrue() {
        RunFlowResponse response = runFlow(new FlowInputs("stepInterceptors", "5", "1"));

        assertEquals(JobStatus.STOP_ON_ERROR.toString(), response.getJobStatus(), "The job should have stopped after " +
            "running step 5, as the interceptor for that step throws an error, and the flow has stopOnError=true");

        Map<String, RunStepResponse> stepResponses = response.getStepResponses();
        assertEquals(1, stepResponses.keySet().size(), "Should only have a step response for step 5, which is the one " +
            "that failed before the job was stopped");
        assertEquals("5", stepResponses.keySet().iterator().next());
    }
}
