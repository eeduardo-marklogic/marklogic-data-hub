package com.marklogic.hub.central.controllers.steps;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.marklogic.hub.central.controllers.BaseController;
import com.marklogic.hub.central.schemas.MappingStepSchema;
import com.marklogic.hub.dataservices.ArtifactService;
import com.marklogic.hub.dataservices.MappingService;
import com.marklogic.hub.dataservices.StepService;
import io.swagger.annotations.ApiImplicitParam;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;

@Controller
@RequestMapping("/api/steps/mapping")
public class MappingStepController extends BaseController {

    private final static String STEP_DEFINITION_TYPE = "mapping";

    @RequestMapping(method = RequestMethod.GET)
    @ResponseBody
    @ApiOperation(value = "Get all mapping steps", response = MappingSteps.class)
    @Secured("ROLE_readMapping")
    public ResponseEntity<JsonNode> getSteps() {
        return ResponseEntity.ok(ArtifactService.on(getHubClient().getStagingClient()).getList(STEP_DEFINITION_TYPE));
    }

    @RequestMapping(value = "/{stepName}", method = RequestMethod.GET)
    @ApiOperation(value = "Get a step", response = MappingStepSchema.class)
    @Secured("ROLE_readMapping")
    public ResponseEntity<JsonNode> getStep(@PathVariable String stepName) {
        return ResponseEntity.ok(newService().getStep(STEP_DEFINITION_TYPE, stepName));
    }

    @RequestMapping(method = RequestMethod.POST)
    @ApiImplicitParam(name = "step", required = true, paramType = "body", dataTypeClass = MappingStepSchema.class)
    @Secured("ROLE_writeMapping")
    public ResponseEntity<Void> createMappingStep(@RequestBody @ApiParam(name = "step", hidden = true) ObjectNode propertiesToAssign) {
        String stepName = propertiesToAssign.get("name").asText();
        propertiesToAssign.put("name", stepName);
        newService().saveStep(STEP_DEFINITION_TYPE, propertiesToAssign, false, true);
        return emptyOk();
    }

    @RequestMapping(value = "/{stepName}", method = RequestMethod.PUT)
    @ApiImplicitParam(name = "step", required = true, paramType = "body", dataTypeClass = MappingStepSchema.class)
    @Secured("ROLE_writeMapping")
    public ResponseEntity<Void> updateMappingStep(@RequestBody @ApiParam(name = "step", hidden = true) ObjectNode propertiesToAssign, @PathVariable String stepName) {
        propertiesToAssign.put("name", stepName);
        newService().saveStep(STEP_DEFINITION_TYPE, propertiesToAssign, false, false);
        return emptyOk();
    }

    @RequestMapping(value = "/{stepName}", method = RequestMethod.DELETE)
    @Secured("ROLE_writeMapping")
    public ResponseEntity<Void> deleteStep(@PathVariable String stepName) {
        newService().deleteStep(STEP_DEFINITION_TYPE, stepName);
        return emptyOk();
    }

    @RequestMapping(value = "/{stepName}/references",method = RequestMethod.GET)
    @ApiOperation(value = "Get mapping references associated with the step")
    @Secured("ROLE_readMapping")
    public ResponseEntity<JsonNode> getReferences(@PathVariable String stepName) {
        return ResponseEntity.ok(MappingService.on(getHubClient().getStagingClient()).getReferences(stepName));
    }

    @RequestMapping(value = "/{stepName}/uris",method = RequestMethod.GET)
    @ApiOperation(value = "Get uris associated with source query of the step; uris count is determined by 'limit'", response = ArrayList.class)
    @Secured("ROLE_readMapping")
    public ResponseEntity<JsonNode> getUris(@PathVariable String stepName, @RequestParam String limit) {
        JsonNode response = MappingService.on(getHubClient().getStagingClient()).getUris(stepName, Integer.parseInt(limit));
        return ResponseEntity.ok(response);
    }

    @RequestMapping(value = "/{stepName}/doc", method = RequestMethod.GET)
    @ApiOperation(value = "Get an XML or JSON source document (and additional information all formatted as a string of JSON) to facilitate testing a map.")
    @Secured("ROLE_readMapping")
    public ResponseEntity<JsonNode> getDocument(@PathVariable String stepName, @RequestParam String docUri) {
        return ResponseEntity.ok(MappingService.on(getHubClient().getStagingClient()).getDocument(stepName, docUri));
    }

    private StepService newService() {
        return StepService.on(getHubClient().getStagingClient());
    }

    public static class MappingSteps extends ArrayList<MappingStepSchema> {
    }

}
