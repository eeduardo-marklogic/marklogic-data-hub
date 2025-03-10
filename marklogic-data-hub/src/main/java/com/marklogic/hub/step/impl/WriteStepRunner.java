/*
 * Copyright (c) 2021 MarkLogic Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.marklogic.hub.step.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.dataformat.csv.CsvSchema;
import com.marklogic.client.datamovement.DataMovementManager;
import com.marklogic.client.datamovement.JacksonCSVSplitter;
import com.marklogic.client.datamovement.JobTicket;
import com.marklogic.client.datamovement.WriteBatcher;
import com.marklogic.client.datamovement.WriteEvent;
import com.marklogic.client.document.ServerTransform;
import com.marklogic.client.ext.util.DefaultDocumentPermissionsParser;
import com.marklogic.client.ext.util.DocumentPermissionsParser;
import com.marklogic.client.io.DocumentMetadataHandle;
import com.marklogic.client.io.Format;
import com.marklogic.client.io.InputStreamHandle;
import com.marklogic.client.io.JacksonHandle;
import com.marklogic.hub.DatabaseKind;
import com.marklogic.hub.HubClient;
import com.marklogic.hub.HubProject;
import com.marklogic.hub.util.DiskQueue;
import com.marklogic.hub.dataservices.JobService;
import com.marklogic.hub.error.DataHubConfigurationException;
import com.marklogic.hub.flow.Flow;
import com.marklogic.hub.flow.impl.JobStatus;
import com.marklogic.hub.step.RunStepResponse;
import com.marklogic.hub.step.StepDefinition;
import com.marklogic.hub.step.StepItemCompleteListener;
import com.marklogic.hub.step.StepItemFailureListener;
import com.marklogic.hub.step.StepRunner;
import com.marklogic.hub.step.StepStatusListener;
import com.marklogic.hub.util.json.JSONObject;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.SystemUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Vector;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Stream;

public class WriteStepRunner implements StepRunner {

    private static final int MAX_ERROR_MESSAGES = 10;
    private Flow flow;
    private int batchSize;
    private int threadCount;
    private String destinationDatabase;
    private int previousPercentComplete;
    protected long csvFilesProcessed;
    private String currentCsvFile;
    private Map<String, Object> combinedOptions;
    private boolean stopOnFailure = false;
    private String jobId;
    protected final Logger logger = LoggerFactory.getLogger(getClass());

    private String step = "1";
    private static final String DATE_TIME_FORMAT_PATTERN = "yyyy-MM-dd'T'HH:mm:ss.SSS";
    private List<StepItemCompleteListener> stepItemCompleteListeners = new ArrayList<>();
    private List<StepItemFailureListener> stepItemFailureListeners = new ArrayList<>();
    private List<StepStatusListener> stepStatusListeners = new ArrayList<>();

    private HubClient hubClient;
    private HubProject hubProject;

    private Thread runningThread = null;
    private DataMovementManager dataMovementManager = null;
    private WriteBatcher writeBatcher = null;
    // setting these values to protected so their values can be tested
    protected String inputFilePath = null;
    protected String outputCollections;
    protected String outputPermissions;
    protected String outputFormat;
    protected String inputFileType;
    protected String outputURIReplacement;
    protected String outputURIPrefix;
    protected String separator = ",";
    protected AtomicBoolean isStopped = new AtomicBoolean(false);
    private IngestionStepDefinitionImpl stepDef;
    private Map<String, Object> stepConfig = new HashMap<>();
    private DocumentPermissionsParser documentPermissionsParser = new DefaultDocumentPermissionsParser();

    public WriteStepRunner(HubClient hubClient, HubProject hubProject) {
        this.hubClient = hubClient;
        this.hubProject = hubProject;
    }

    public StepRunner withFlow(Flow flow) {
        this.flow = flow;
        return this;
    }

    public StepRunner withStep(String step) {
        this.step = step;
        return this;
    }

    public StepRunner withJobId(String jobId) {
        this.jobId = jobId;
        return this;
    }

    public StepRunner withStepDefinition(StepDefinition stepDefinition){
        this.stepDef = (IngestionStepDefinitionImpl) stepDefinition;
        return this;
    }

    @Override
    public StepRunner withBatchSize(int batchSize) {
        this.batchSize = batchSize;
        return this;
    }

    @Override
    public StepRunner withThreadCount(int threadCount) {
        this.threadCount = threadCount;
        return this;
    }

    public StepRunner withDestinationDatabase(String destinationDatabase) {
        this.destinationDatabase = destinationDatabase;
        return this;
    }

    @Override
    public StepRunner withStopOnFailure(boolean stopOnFailure) {
        this.stopOnFailure = stopOnFailure;
        return this;
    }

    @Override
    @SuppressWarnings("unchecked")
    public StepRunner withRuntimeOptions(Map<String, Object> runtimeOptions) {
        if(flow == null){
            throw new DataHubConfigurationException("Flow has to be set before setting options");
        }
        this.combinedOptions = StepRunnerUtil.makeCombinedOptions(this.flow, this.stepDef, this.step, runtimeOptions);
        return this;
    }

    @Override
    public StepRunner withStepConfig(Map<String, Object> stepConfig) {
        this.stepConfig = stepConfig;
        return this;
    }

    @Override
    public StepRunner onItemComplete(StepItemCompleteListener listener) {
        this.stepItemCompleteListeners.add(listener);
        return this;
    }

    @Override
    public StepRunner onItemFailed(StepItemFailureListener listener) {
        this.stepItemFailureListeners.add(listener);
        return this;
    }

    @Override
    public StepRunner onStatusChanged(StepStatusListener listener) {
        this.stepStatusListeners.add(listener);
        return this;
    }

    @Override
    public void awaitCompletion() {
        try {
            awaitCompletion(Long.MAX_VALUE, TimeUnit.DAYS);
        } catch (InterruptedException | TimeoutException e) {
        }
    }

    @Override
    public void awaitCompletion(long timeout, TimeUnit unit) throws InterruptedException,TimeoutException {
        if (runningThread != null) {
            runningThread.join(unit.convert(timeout, unit));
            if (runningThread.getState() != Thread.State.TERMINATED) {
                if ( dataMovementManager != null && writeBatcher != null ) {
                    dataMovementManager.stopJob(writeBatcher);
                }
                runningThread.interrupt();
                throw new TimeoutException("Timeout occurred after "+timeout+" "+unit.toString());
            }
        }
    }

    @Override
    public int getBatchSize(){
        return this.batchSize;
    }

    private boolean jobOutputIsEnabled() {
        if (combinedOptions != null && combinedOptions.containsKey("disableJobOutput")) {
            return !Boolean.parseBoolean(combinedOptions.get("disableJobOutput").toString());
        }
        return true;
    }

    @Override
    public RunStepResponse run() {
        if (combinedOptions == null) {
            combinedOptions = new HashMap<>();
        }

        runningThread = null;
        RunStepResponse runStepResponse = StepRunnerUtil.createStepResponse(flow, step, jobId);
        loadStepRunnerParameters();
        if("csv".equalsIgnoreCase(inputFileType)){
            combinedOptions.put("inputFileType", "csv");
        }
        combinedOptions.put("flow", this.flow.getName());

        if (jobOutputIsEnabled()) {
            JobService.on(hubClient.getJobsClient()).startStep(jobId, step, flow.getName(), new ObjectMapper().valueToTree(this.combinedOptions));
        }

        Collection<String> uris;
        try {
            uris = runFileCollector();
        } catch (Exception e) {
            runStepResponse.setCounts(0,0, 0, 0, 0)
                .withStatus(JobStatus.FAILED_PREFIX + step);
            StringWriter errors = new StringWriter();
            e.printStackTrace(new PrintWriter(errors));
            runStepResponse.withStepOutput(errors.toString());
            if (jobOutputIsEnabled()) {
                JsonNode jobDoc = JobService.on(hubClient.getJobsClient()).finishStep(jobId, step, JobStatus.FAILED_PREFIX + step, runStepResponse.toObjectNode());

                //If not able to read the step resp from the job doc, send the in-memory resp without start/end time
                try {
                    return StepRunnerUtil.getResponse(jobDoc, step);
                }
                catch (Exception ignored) {}
            }
            return runStepResponse;
        }
        return this.runIngester(runStepResponse,uris);
    }

    @Override
    public RunStepResponse run(Collection<String> uris) {
        runningThread = null;
        RunStepResponse runStepResponse = StepRunnerUtil.createStepResponse(flow, step, jobId);
        if (jobOutputIsEnabled()) {
            JobService.on(hubClient.getJobsClient()).startStep(jobId, step, flow.getName(), new ObjectMapper().valueToTree(this.combinedOptions));
        }
        return this.runIngester(runStepResponse,uris);
    }

    @Override
    public void stop() {
        isStopped.set(true);
        if(writeBatcher != null) {
            dataMovementManager.stopJob(writeBatcher);
        }
    }

    @SuppressWarnings("unchecked")
    protected void loadStepRunnerParameters(){
        JsonNode comboOptions = null;
        try {
            comboOptions = JSONObject.readInput(JSONObject.writeValueAsString(combinedOptions));
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        JSONObject obj = new JSONObject(comboOptions);


        if (obj.getArrayString("collections", false) != null) {
            outputCollections = StringUtils.join(obj.getArrayString("collections", false), ",");
        }
        if (obj.getString("permissions") != null) {
            outputPermissions = obj.getString("permissions");
        }
        if (obj.getString("targetDatabase") != null) {
            this.withDestinationDatabase(obj.getString("targetDatabase"));
        }
        if (obj.getString("outputFormat") != null) {
            outputFormat = obj.getString("outputFormat");
        }

        ObjectMapper mapper = new ObjectMapper();
        Map<String, Object> stepDefFileLocation = new HashMap<>();
        Map<String, Object> stepFileLocation = new HashMap<>();
        Map<String, Object> fileLocations = new HashMap<>();
        if(stepDef.getFileLocations() != null) {
            stepDefFileLocation = mapper.convertValue(stepDef.getFileLocations(), Map.class);
            fileLocations.putAll(stepDefFileLocation);
        }
        if(flow.getStep(step).getFileLocations() != null) {
            stepFileLocation =  mapper.convertValue(flow.getStep(step).getFileLocations(), Map.class);
            fileLocations.putAll(stepFileLocation);
        }
        if(stepConfig.get("batchSize") != null){
            this.batchSize = Integer.parseInt(stepConfig.get("batchSize").toString());
        }
        if(stepConfig.get("threadCount") != null) {
            this.threadCount = Integer.parseInt(stepConfig.get("threadCount").toString());
        }
        if(stepConfig.get("fileLocations") != null) {
            fileLocations.putAll((Map<String, String>) stepConfig.get("fileLocations"));
        }
        if (!fileLocations.isEmpty()) {
            inputFilePath = (String)fileLocations.get("inputFilePath");
            inputFileType = (String)fileLocations.get("inputFileType");
            outputURIReplacement = (String)fileLocations.get("outputURIReplacement");
            outputURIPrefix = (String)fileLocations.get("outputURIPrefix");
            if (inputFileType.equalsIgnoreCase("csv") && fileLocations.get("separator") != null) {
                this.separator =((String) fileLocations.get("separator"));
                if (!"\t".equals(this.separator)) {
                    this.separator = this.separator.trim();
                }
            }
        }

        if (separator != null && separator.equalsIgnoreCase("\\t")) {
            this.separator = "\t";
        }

        if(stepConfig.get("stopOnFailure") != null){
            this.withStopOnFailure(Boolean.parseBoolean(stepConfig.get("stopOnFailure").toString()));
        }

        if(StringUtils.isNotEmpty(outputURIReplacement)){
            if(outputURIPrefix != null){
                throw new RuntimeException("'outputURIPrefix' and 'outputURIReplacement' cannot be set simultaneously");
            }
        }
        else{
            //set 'outputURIPrefix' to "" if it's not set and 'outputURIReplacement' is also not set
            if(outputURIPrefix == null){
                outputURIPrefix = "";
            }
        }

        if (inputFilePath == null || inputFileType == null) {
            throw new RuntimeException("File path and type cannot be empty");
        }
    }

    protected Path determineInputFilePath(String inputFilePath) {
        Path dirPath = Paths.get(inputFilePath);
        if (dirPath.isAbsolute()) {
            return dirPath;
        }

        if (this.hubProject != null) {
            String projectDirString = hubProject.getProjectDirString();
            return new File(projectDirString, dirPath.toString()).toPath().toAbsolutePath();
        }

        Path inputPath = new File(dirPath.toString()).toPath().toAbsolutePath();
        logger.info("No HubProject available to resolve relative inputFilePath; will ingest from: " + inputPath);
        return inputPath;
    }

    private Collection<String> runFileCollector() {
        stepStatusListeners.forEach((StepStatusListener listener) -> {
            listener.onStatusChange(this.jobId, 0, JobStatus.RUNNING_PREFIX + step, 0, 0,  "fetching files");
        });
        final DiskQueue<String> uris;
        if(!isStopped.get()) {
            uris = new FileCollector(inputFileType).run(determineInputFilePath(this.inputFilePath));
        }
        else {
            uris = null;
        }
        return uris;
    }

    private RunStepResponse runIngester(RunStepResponse runStepResponse, Collection<String> uris) {
        StepMetrics stepMetrics = new StepMetrics();
        stepStatusListeners.forEach((StepStatusListener listener) -> {
            listener.onStatusChange(runStepResponse.getJobId(), 0, JobStatus.RUNNING_PREFIX + step, 0, 0, "starting step execution");
        });

        if (uris == null || uris.size() == 0 ) {
            JsonNode jobDoc = null;
            final String stepStatus;
            if(isStopped.get()) {
                stepStatus = JobStatus.CANCELED_PREFIX + step;
            }
            else {
                stepStatus = JobStatus.COMPLETED_PREFIX + step;
            }

            stepStatusListeners.forEach((StepStatusListener listener) -> {
                listener.onStatusChange(runStepResponse.getJobId(), 100, stepStatus, 0, 0,
                    (stepStatus.contains(JobStatus.COMPLETED_PREFIX) ? "provided file path returned 0 items" : "job was stopped"));
            });
            runStepResponse.setCounts(0,0,0,0,0);
            runStepResponse.withStatus(stepStatus);

            if (jobOutputIsEnabled()) {
                jobDoc = JobService.on(hubClient.getJobsClient()).finishStep(jobId, step, stepStatus, runStepResponse.toObjectNode());
                try {
                    return StepRunnerUtil.getResponse(jobDoc, step);
                }
                catch (Exception ex) {
                    return runStepResponse;
                }
            } else {
                return runStepResponse;
            }
        }

        Vector<String> errorMessages = new Vector<>();

        // Optimize for Hub databases associated with Hub app servers, but allow other values
        dataMovementManager = destinationDatabase.equals(hubClient.getDbName(DatabaseKind.FINAL)) ?
            hubClient.getFinalClient().newDataMovementManager() :
            hubClient.getStagingClient(destinationDatabase).newDataMovementManager();

        HashMap<String, JobTicket> ticketWrapper = new HashMap<>();

        double uriSize = uris.size();

        ServerTransform serverTransform = new ServerTransform("mlRunIngest");
        serverTransform.addParameter("job-id", jobId);
        serverTransform.addParameter("step", step);
        serverTransform.addParameter("flow-name", flow.getName());
        String optionString = jsonToString(combinedOptions);
        serverTransform.addParameter("options", optionString);

        writeBatcher = dataMovementManager.newWriteBatcher()
            .withBatchSize(batchSize)
            .withThreadCount(threadCount)
            .withJobId(runStepResponse.getJobId())
            .withTransform(serverTransform)
            .onBatchSuccess(batch ->{
                //TODO: There is one additional item returned, it has to be investigated
                stepMetrics.getSuccessfulEvents().addAndGet(batch.getItems().length-1);
                stepMetrics.getSuccessfulBatches().addAndGet(1);
                logger.debug(String.format("Current SuccessfulEvents: %d - FailedEvents: %d", stepMetrics.getSuccessfulEventsCount(), stepMetrics.getFailedEventsCount()));
                runStatusListener(uriSize, stepMetrics);
                if (stepItemCompleteListeners.size() > 0) {
                    Arrays.stream(batch.getItems()).forEach((WriteEvent e) -> {
                        stepItemCompleteListeners.forEach((StepItemCompleteListener listener) -> {
                            listener.processCompletion(runStepResponse.getJobId(), e.getTargetUri());
                        });
                    });
                }
            })
            .onBatchFailure((batch, ex) -> {
                stepMetrics.getFailedEvents().addAndGet(batch.getItems().length-1);
                stepMetrics.getFailedBatches().addAndGet(1);
                runStatusListener(uriSize, stepMetrics);
                if (errorMessages.size() < MAX_ERROR_MESSAGES) {
                    errorMessages.add(ex.getLocalizedMessage());
                }
                if(stepItemFailureListeners.size() > 0) {
                    Arrays.stream(batch.getItems()).forEach((WriteEvent e) -> {
                        stepItemFailureListeners.forEach((StepItemFailureListener listener) -> {
                            listener.processFailure(runStepResponse.getJobId(), e.getTargetUri());
                        });
                    });
                }
                if (stopOnFailure ) {
                    JobTicket jobTicket = ticketWrapper.get("jobTicket");
                    if (jobTicket != null) {
                        dataMovementManager.stopJob(jobTicket);
                    }
                }
            });

        DocumentMetadataHandle metadataHandle = new DocumentMetadataHandle();
        //Apply permissions
        if(StringUtils.isNotEmpty(outputPermissions)) {
            try{
                documentPermissionsParser.parsePermissions(outputPermissions, metadataHandle.getPermissions());
            }
            catch (Exception e){
                throw e;
            }
        }
        //Set the collections
        if(StringUtils.isNotEmpty(outputCollections)) {
            metadataHandle.withCollections(outputCollections.split(","));
        }

        if(flow.getName().equals("default-ingestion")) {
            metadataHandle.withCollections("default-ingestion");
        }
        // Set metadata values
        DocumentMetadataHandle.DocumentMetadataValues metadataValues = metadataHandle.getMetadataValues();
        metadataValues.add("datahubCreatedByJob", jobId);
        metadataValues.add("datahubCreatedInFlow", flow.getName());
        metadataValues.add("datahubRanBySteps", flow.getStep(step).getName());
        metadataValues.add("datahubCreatedByStep", flow.getStep(step).getName());
        // TODO createdOn/createdBy data may not be accurate enough. Unfortunately REST transforms don't allow for writing metadata
        metadataValues.add("datahubCreatedOn", new SimpleDateFormat(DATE_TIME_FORMAT_PATTERN).format(new Date()));
        metadataValues.add("datahubCreatedBy", hubClient.getUsername());
        writeBatcher.withDefaultMetadata(metadataHandle);
        Format format = null;
        switch (inputFileType.toLowerCase()) {
            case "xml":
                format = Format.XML;
                break;
            case "json":
                format = Format.JSON;
                break;
            case "csv":
                format = Format.JSON;
                break;
            case "text":
                format = Format.TEXT;
                break;
            default:
                format = Format.BINARY;
        }
        final Format fileFormat = format;
        Iterator itr = uris.iterator();
        if(!isStopped.get()){
            JobTicket jobTicket = dataMovementManager.startJob(writeBatcher);
            ticketWrapper.put("jobTicket", jobTicket);
            while(itr.hasNext()) {
                try {
                    File file = new File((String) itr.next());
                    addToBatcher(file, fileFormat);
                }
                catch (Exception e) {
                    throw new RuntimeException(e);
                }
            }
        }

        runningThread = new Thread(() -> {
            try {
                writeBatcher.flushAndWait();
            }
            catch (IllegalStateException e) {
                logger.error("WriteBatcher has been stopped");
            }

            String stepStatus;
            if (stepMetrics.getFailedEventsCount() > 0 && stopOnFailure) {
                stepStatus = JobStatus.STOP_ON_ERROR_PREFIX + step;
            } else if (isStopped.get()){
                stepStatus = JobStatus.CANCELED_PREFIX + step;
            } else if (stepMetrics.getFailedEventsCount() > 0 && stepMetrics.getSuccessfulEventsCount() > 0) {
                stepStatus = JobStatus.COMPLETED_WITH_ERRORS_PREFIX + step;
            } else if (stepMetrics.getFailedEventsCount() == 0 && stepMetrics.getSuccessfulEventsCount() > 0)  {
                stepStatus = JobStatus.COMPLETED_PREFIX + step ;
            } else {
                stepStatus = JobStatus.FAILED_PREFIX + step;
            }

            stepStatusListeners.forEach((StepStatusListener listener) -> {
                listener.onStatusChange(runStepResponse.getJobId(), 100, stepStatus, stepMetrics.getSuccessfulEventsCount(), stepMetrics.getFailedEventsCount(), "Ingestion completed");
            });

            dataMovementManager.stopJob(writeBatcher);

            runStepResponse.setCounts(stepMetrics.getSuccessfulEventsCount() + stepMetrics.getFailedEventsCount(),stepMetrics.getSuccessfulEventsCount(), stepMetrics.getFailedEventsCount(), stepMetrics.getSuccessfulBatchesCount(), stepMetrics.getFailedBatchesCount());
            runStepResponse.withStatus(stepStatus);
            if (errorMessages.size() > 0) {
                runStepResponse.withStepOutput(errorMessages);
            }

            if (jobOutputIsEnabled()) {
                JsonNode jobDoc = null;
                try {
                    jobDoc = JobService.on(hubClient.getJobsClient()).finishStep(jobId,  step, stepStatus, runStepResponse.toObjectNode());
                }
                catch (Exception e) {
                    logger.error("Unable to update job document, cause: " + e.getMessage());
                }
                if(jobDoc != null) {
                    try {
                        RunStepResponse tempResp =  StepRunnerUtil.getResponse(jobDoc, step);
                        runStepResponse.setStepStartTime(tempResp.getStepStartTime());
                        runStepResponse.setStepEndTime(tempResp.getStepEndTime());
                    }
                    catch (Exception ex) {
                        logger.error("Unable to update step response, cause: " + ex.getMessage());
                    }
                }
            }
        });

        runningThread.start();
        return runStepResponse;
    }

    private void processCsv(JacksonHandle jacksonHandle, File file) {
        ObjectMapper mapper = jacksonHandle.getMapper();
        JsonNode originalContent = jacksonHandle.get();
        ObjectNode node = mapper.createObjectNode();

        // Per DHFPROD-6665, this custom file ingester now does the same thing MLCP does when constructing XML from
        // a delimited file, which is to include a no-namespaced "root" element around the elements that were built
        // from a particular row
        if (this.outputFormat != null && this.outputFormat.equalsIgnoreCase("xml")) {
            node.putObject("content").set("root", originalContent);
        } else {
            node.set("content",originalContent);
        }

        node.put("file", file.getAbsolutePath());
        jacksonHandle.set(node);
        try {
            writeBatcher.add(generateUriForCsv(file.getParent(), SystemUtils.OS_NAME.toLowerCase()), jacksonHandle);
        }
        catch (IllegalStateException e) {
            logger.error("WriteBatcher has been stopped");
        }
        if (!file.getAbsolutePath().equalsIgnoreCase(currentCsvFile)) {
            currentCsvFile = file.getAbsolutePath();
            ++csvFilesProcessed;
        }
    }

    protected String generateUriForCsv(String parentPath, String os){
        String uri;
        if(outputURIPrefix != null){
            try {
                uri = generateAndEncodeURI(outputURIPrefix).replace("%", "%%");
            } catch (URISyntaxException e) {
                throw new RuntimeException(e);
            }
        }
        else {
            uri = parentPath;
            if(os.contains("windows")){
                uri = "/" + FilenameUtils.separatorsToUnix(StringUtils.replaceOnce(uri, ":", ""));
            }
            try {
                uri =  generateAndEncodeURI(outputURIReplace(uri)).replace("%", "%%");
            } catch (URISyntaxException e) {
                throw new RuntimeException(e);
            }
            uri = uri + "/";
        }
        return String.format(uri +"%s." + ("xml".equalsIgnoreCase(outputFormat) ? "xml":"json"), UUID.randomUUID());
    }

    private void addToBatcher(File file, Format fileFormat) throws IOException {
        // Coverity is saying that the docStream is a resource leak, but the comment below this indicates that it must
        // not be closed. Because this is for DHFPROD-3695 and we're close to releasing 5.1.0, leaving this as-is for now.

        // This docStream must not be closed, or use try-resource due to WriteBatcher needing the stream open
        FileInputStream docStream = new FileInputStream(file);
        //note these ORs are for forward compatibility if we swap out the filecollector for another lib
        if (inputFileType.equalsIgnoreCase("csv") || inputFileType.equalsIgnoreCase("tsv") || inputFileType.equalsIgnoreCase("psv")) {
            CsvSchema schema = CsvSchema.emptySchema()
                .withHeader()
                .withColumnSeparator(separator.charAt(0));
            JacksonCSVSplitter splitter = new JacksonCSVSplitter().withCsvSchema(schema);
            try {
                if (!writeBatcher.isStopped()) {
                    Stream<JacksonHandle> contentStream = splitter.split(docStream);
                    contentStream.forEach(jacksonHandle -> this.processCsv(jacksonHandle, file));
                }
            } catch (Exception e) {
                IOUtils.closeQuietly(docStream);
                throw new RuntimeException(e);
            }
        } else {
            InputStreamHandle handle = new InputStreamHandle(docStream);
            try {
                handle.setFormat(fileFormat);
                if (!writeBatcher.isStopped()) {
                    try {
                        String uri;
                        if(outputURIPrefix != null){
                            uri = getPrefixedEncodedURI(file.getName());
                        }
                        else {
                            uri = file.getAbsolutePath();
                            //In case of Windows, C:\\Documents\\abc.json will be converted to /c/Documents/abc.json
                            if (SystemUtils.OS_NAME.toLowerCase().contains("windows")) {
                                uri = "/" + FilenameUtils.separatorsToUnix(StringUtils.replaceOnce(uri, ":", ""));
                            }
                            uri = generateAndEncodeURI(outputURIReplace(uri));
                        }
                        writeBatcher.add(uri, handle);
                    } catch (IllegalStateException e) {
                        logger.error("WriteBatcher has been stopped");
                    }
                }
            } catch (URISyntaxException e) {
                IOUtils.closeQuietly(handle);
                throw new RuntimeException(e);
            }
        }
    }

    protected String getPrefixedEncodedURI(String filename) throws  URISyntaxException{
        return generateAndEncodeURI(new StringBuilder().append(outputURIPrefix).append(filename).toString());
    }

    private String generateAndEncodeURI(String path) throws  URISyntaxException {
        URI uri = new URI(null, null, null, 0, path, null, null);
        return uri.toString();
    }

    private String outputURIReplace(String uri) {
        if (StringUtils.isNotEmpty(outputURIReplacement)) {
            String[] replace = outputURIReplacement.split(",");
            // URI replace comes in pattern and replacement pairs.
            if (replace.length % 2 != 0) {
                throw new IllegalArgumentException(
                    "Invalid argument for URI replacement: " + outputURIReplacement);
            }
            // Replacement string is expected to be in ''
            for (int i = 0; i < replace.length - 1; i++) {
                String replacement = replace[++i].trim();
                if (!replacement.startsWith("'") ||
                    !replacement.endsWith("'")) {
                    throw new IllegalArgumentException(
                        "Invalid argument for URI replacement: " + outputURIReplacement);
                }
            }
            for (int i = 0; i < replace.length - 1; i += 2) {
                String replacement = replace[i + 1].trim();
                replacement = replacement.substring(1, replacement.length() - 1);
                uri = uri.replaceAll(replace[i], replacement);
            }
        }
        return uri;
    }

    //percentComplete for csv files is (csvFilesProcessed/ urisCount) * 100.0
    //The number of csv files would probably be less than that of regular files, so the step status listeners are updated more frequently
    //'uris' is backed by DiskQueue whose size changes as the Collection is iterated, so size is calculated before iteration
    protected void runStatusListener(double uriSize, StepMetrics stepMetrics) {
        double batchCount = Math.ceil(uriSize / (double) batchSize);
        long totalRunBatches = stepMetrics.getSuccessfulBatchesCount() + stepMetrics.getFailedBatchesCount();
        int percentComplete;
        if("csv".equalsIgnoreCase(inputFileType)) {
            percentComplete = (int) (((double) csvFilesProcessed/ uriSize) * 100.0);
            if (percentComplete != previousPercentComplete && (percentComplete % 2 == 0)) {
                previousPercentComplete = percentComplete;
                stepStatusListeners.forEach((StepStatusListener listener) -> {
                    listener.onStatusChange(jobId, percentComplete, JobStatus.RUNNING_PREFIX + step, stepMetrics.getSuccessfulEventsCount(), stepMetrics.getFailedEventsCount(), "Ingesting");
                });
            }
        }
        else {
            percentComplete = (int) (((double) totalRunBatches/ batchCount) * 100.0);
            if (percentComplete != previousPercentComplete && (percentComplete % 5 == 0)) {
                previousPercentComplete = percentComplete;
                stepStatusListeners.forEach((StepStatusListener listener) -> {
                    listener.onStatusChange(jobId, percentComplete, JobStatus.RUNNING_PREFIX + step, stepMetrics.getSuccessfulEventsCount(), stepMetrics.getFailedEventsCount(), "Ingesting");
                });
            }
        }
    }

    private String jsonToString(Map map) {
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            return objectMapper.writeValueAsString(objectMapper.convertValue(map, JsonNode.class));
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }
}
