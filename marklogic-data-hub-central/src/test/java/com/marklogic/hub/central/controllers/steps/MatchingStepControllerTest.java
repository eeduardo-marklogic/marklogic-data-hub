package com.marklogic.hub.central.controllers.steps;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.marklogic.client.FailedRequestException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class MatchingStepControllerTest extends AbstractStepControllerTest {

    private final static String PATH = "/api/steps/matching";

    public static class MatchingStep {
        public String name;
        public String description;
        public String selectedSource;
        public String sourceQuery;
        public String targetEntityType;
    }

    public static MatchingStep newDefaultMatchingStep(String name) {
        MatchingStep step = new MatchingStep();
        step.name = name;
        step.description = "optional";
        step.selectedSource = "collection";
        step.sourceQuery = "cts.collectionQuery('test')";
        step.targetEntityType = "http://example.org/Customer-0.0.1/Customer";
        return step;
    }

    @Test
    void test() throws Exception {
        loginAsTestUserWithRoles("hub-central-match-merge-writer");
        verifyCommonStepEndpoints(PATH, objectMapper.valueToTree(newDefaultMatchingStep("myMatchingStep")), "default-matching", "matching");
    }

    @Test
    void getMatchingSteps() throws Exception {
        installOnlyReferenceModelEntities();
        loginAsTestUserWithRoles("hub-central-match-merge-writer");

        postJson(PATH, newDefaultMatchingStep("firstStep"));
        postJson(PATH, newDefaultMatchingStep("firstStep")).andDo(result -> {
            assertTrue(result.getResolvedException() instanceof FailedRequestException);
            assertTrue(result.getResolvedException().getMessage().contains("A step of type 'matching' with the name 'firstStep' already exists"));
        });
        postJson(PATH, newDefaultMatchingStep("secondStep"));

        loginAsTestUserWithRoles("hub-central-match-merge-reader");

        getJson(PATH)
            .andExpect(status().isOk())
            .andDo(result -> {
                ArrayNode array = (ArrayNode) parseJsonResponse(result);
                assertEquals(2, array.size());
                int entityIndex = 0;
                if (array.get(entityIndex).get("entityType").asText().equals("Order")) {
                    entityIndex = 1;
                }
                JsonNode artifactsArray = array.get(entityIndex).get("artifacts");
                List<String> actual = Arrays.asList(artifactsArray.get(0).get("name").asText(), artifactsArray.get(1).get("name").asText());
                assertTrue(actual.contains("firstStep"));
                assertTrue(actual.contains("secondStep"));
            });
    }

    @Test
    void createAndReadExclusionLists() throws Exception {
        installOnlyReferenceModelEntities();
        loginAsTestUserWithRoles("hub-central-match-merge-writer");
        ObjectNode myList = objectMapper.createObjectNode().put("name", "myList");
        myList.putArray("values").add("null");
        putJson(PATH + "/exclusionList/myList", myList);

        loginAsTestUserWithRoles("hub-central-match-merge-reader");

        getJson(PATH + "/exclusionList")
                .andExpect(status().isOk())
                .andDo(result -> {
                    ArrayNode array = (ArrayNode) parseJsonResponse(result);
                    assertEquals(1, array.size());
                    assertEquals("null", array.get(0).path("values").get(0).asText());
                });
        loginAsTestUserWithRoles("hub-central-match-merge-writer");

        myList.put("name", "myListRename");
        putJson(PATH + "/exclusionList/myList", myList);

        getJson(PATH + "/exclusionList/myList")
                .andExpect(status().isNotFound());

        getJson(PATH + "/exclusionList/myListRename")
                .andExpect(status().isOk());

        delete(PATH + "/exclusionList/myListRename");

        loginAsTestUserWithRoles("hub-central-match-merge-reader");

        getJson(PATH + "/exclusionList")
                .andExpect(status().isOk())
                .andDo(result -> {
                    ArrayNode array = (ArrayNode) parseJsonResponse(result);
                    assertEquals(0, array.size());
                });

    }

    @Test
    void permittedReadUser() throws Exception {
        loginAsTestUserWithRoles("hub-central-match-merge-writer");

        postJson(PATH, newDefaultMatchingStep("firstStep"));

        loginAsTestUserWithRoles("hub-central-match-merge-reader");

        getJson(PATH + "/firstStep")
            .andDo(result -> {
                MockHttpServletResponse response = result.getResponse();
                assertEquals(HttpStatus.OK.value(), response.getStatus());
            });

        getJson(PATH + "/firstStep/calculateMatchingActivity")
                .andDo(result -> {
                    MockHttpServletResponse response = result.getResponse();
                    assertEquals(HttpStatus.OK.value(), response.getStatus());
                });

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("sampleSize", "20");
        postWithParams(PATH + "/firstStep/previewMatchingActivity", params)
            .andExpect(status().isOk())
            .andDo(result -> {
                MockHttpServletResponse response = result.getResponse();
                assertEquals(HttpStatus.OK.value(), response.getStatus());
            });

        getJson(PATH + "/firstStep/validate")
            .andDo(result -> {
                MockHttpServletResponse response = result.getResponse();
                assertEquals(HttpStatus.OK.value(), response.getStatus());
            });
    }

    @Test
    void forbiddenReadUser() throws Exception {
        loginAsTestUserWithRoles("hub-central-user");
        mockMvc.perform(get(PATH).session(mockHttpSession))
            .andDo(result -> {
                assertTrue(result.getResolvedException() instanceof AccessDeniedException);
            });
    }

    @Test
    void forbiddenWriteUser() throws Exception {
        loginAsTestUserWithRoles("hub-central-match-merge-reader");
        postJson(PATH, newDefaultMatchingStep("firstStep"))
            .andDo(result -> {
                assertTrue(result.getResolvedException() instanceof AccessDeniedException);
            });
    }
}
