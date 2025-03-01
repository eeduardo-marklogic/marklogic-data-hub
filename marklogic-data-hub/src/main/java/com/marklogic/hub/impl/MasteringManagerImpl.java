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
package com.marklogic.hub.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.marklogic.client.DatabaseClient;
import com.marklogic.client.extensions.ResourceManager;
import com.marklogic.client.io.JacksonHandle;
import com.marklogic.client.util.RequestParameters;
import com.marklogic.hub.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class MasteringManagerImpl implements MasteringManager {
    protected HubConfig hubConfig;

    @Autowired
    public MasteringManagerImpl(HubConfig hubConfig) {
        this.hubConfig = hubConfig;
    }

    public MasteringManagerImpl(HubClientConfig hubClientConfig) {
        this.hubConfig = (HubConfig) hubClientConfig;
    }

    @Override
    public JsonNode unmerge(String mergeURI, Boolean retainAuditTrail, Boolean blockFutureMerges) {
        return getMergeResource(DatabaseKind.FINAL).unmerge(mergeURI, retainAuditTrail, blockFutureMerges);
    }

    @Override
    public JsonNode unmergeRecord(String mergeURI, Boolean retainAuditTrail, Boolean blockFutureMerges, List<String> removeURIs) {
        return getMergeResource(DatabaseKind.FINAL).unmergeRecord(mergeURI, retainAuditTrail, blockFutureMerges, removeURIs);
    }

    @Override
    public JsonNode merge(List<String> mergeURIs, String flowName, String stepNumber, Boolean preview, JsonNode options) {
        return getMergeResource(DatabaseKind.FINAL).merge(mergeURIs, flowName, stepNumber, preview, options);
    }

    @Override
    public JsonNode mergePreview(String flowName, List<String> uris) {
        return getMergeResource(DatabaseKind.FINAL).mergePreview(flowName, uris);
    }

    @Override
    public JsonNode match(String matchURI, String flowName, String stepNumber, Boolean includeMatchDetails, JsonNode options) {
        return getMatchResource(DatabaseKind.FINAL).match(matchURI, flowName, stepNumber, includeMatchDetails, options);
    }

    @Override
    public JsonNode documentHistory(String mergedURI) {
        return getDocumentHistoryResource(DatabaseKind.FINAL).documentHistory(mergedURI);
    }

    @Override
    public JsonNode notifications(int start, int pageLength)  {
        return getNotificationsResource(DatabaseKind.FINAL).notifications(start, pageLength) ;
    }

    @Override
    public JsonNode deleteNotifications(List<String> uris)  {
        return getNotificationsResource(DatabaseKind.FINAL).deleteNotifications(uris) ;
    }

    private MergeResource getMergeResource(DatabaseKind databaseKind) {
        return new MergeResource(getSrcClient(databaseKind), hubConfig.getDbName(databaseKind));
    }

    private MatchResource getMatchResource(DatabaseKind databaseKind) {
        return new MatchResource(getSrcClient(databaseKind), hubConfig.getDbName(databaseKind));
    }

    private DocumentHistoryResource getDocumentHistoryResource(DatabaseKind databaseKind) {
        return new DocumentHistoryResource(getSrcClient(databaseKind));
    }

    private NotificationsResource getNotificationsResource(DatabaseKind databaseKind) {
        return new NotificationsResource(getSrcClient(databaseKind));
    }

    private DatabaseClient getSrcClient(DatabaseKind databaseKind) {
        switch (databaseKind) {
            case FINAL:
                return hubConfig.newFinalClient(null);
            default:
                return hubConfig.newStagingClient(null);
        }
    }

    static class MergeResource extends ResourceManager {
        private String targetDatabase;

        public MergeResource(DatabaseClient srcClient, String targetDatabase) {
            super();
            this.targetDatabase = targetDatabase;
            srcClient.init("mlSmMerge" , this);
        }

        public JsonNode unmerge(String mergeURI, Boolean retainAuditTrail, Boolean blockFutureMerges) {
            JsonNode resp;

            RequestParameters params = new RequestParameters();
            params.add("mergeURI", mergeURI);
            params.put("retainAuditTrail", retainAuditTrail.toString());
            params.put("blockFutureMerges", blockFutureMerges.toString());
            params.put("targetDatabase", targetDatabase);
            params.put("sourceDatabase", targetDatabase);
            JacksonHandle handle = new JacksonHandle();
            resp = this.getServices().delete(params, handle).get();
            return resp;
        }

        public JsonNode unmergeRecord(String mergeURI, Boolean retainAuditTrail, Boolean blockFutureMerges,  List<String> removeURIs) {
            JsonNode resp;

            RequestParameters params = new RequestParameters();
            params.put("mergeURI", mergeURI);
            params.put("retainAuditTrail", retainAuditTrail.toString());
            params.put("blockFutureMerges", blockFutureMerges.toString());
            params.put("targetDatabase", targetDatabase);
            params.put("sourceDatabase", targetDatabase);
            params.put("removeURI", removeURIs);
            JacksonHandle handle = new JacksonHandle();
            resp = this.getServices().delete(params, handle).get();
            return resp;
        }

        public JsonNode merge(List<String> mergeURIs, String flowName, String stepNumber, Boolean preview, JsonNode options) {
            JsonNode resp;

            RequestParameters params = new RequestParameters();
            params.put("uri", mergeURIs);
            params.put("preview", preview.toString());
            params.put("flowName", flowName);
            params.put("step", stepNumber);
            params.put("targetDatabase", targetDatabase);
            params.put("sourceDatabase", targetDatabase);
            JacksonHandle jsonOptions = new JacksonHandle().with(options);
            resp = this.getServices().post(params, jsonOptions, new JacksonHandle()).get();
            return resp;
        }

        public JsonNode mergePreview(String flowName, List<String> uris) {
            JsonNode resp;
            JsonNode jsonOptions = new ObjectMapper().createObjectNode();
            ((ObjectNode) jsonOptions).put("preview", "true");
            RequestParameters params = new RequestParameters();
            params.put("flowName", flowName);
            params.put("uri", uris);
            params.put("targetDatabase", targetDatabase);
            params.put("sourceDatabase", targetDatabase);

            resp = this.getServices().post(params, new JacksonHandle(jsonOptions), new JacksonHandle()).get();
            return resp.get("mergedDocument");
        }
    }

    static class MatchResource extends ResourceManager {
        private String targetDatabase;

        public MatchResource(DatabaseClient srcClient, String targetDatabase) {
            super();
            this.targetDatabase = targetDatabase;
            srcClient.init("mlSmMatch" , this);
        }

        public JsonNode match(String matchURI, String flowName, String stepNumber, Boolean includeMatchDetails, JsonNode options) {
            JsonNode resp;

            RequestParameters params = new RequestParameters();
            params.put("uri", matchURI);
            params.put("includeMatchDetails", includeMatchDetails.toString());
            params.put("flowName", flowName);
            params.put("step", stepNumber);
            params.put("targetDatabase", targetDatabase);
            params.put("sourceDatabase", targetDatabase);
            JacksonHandle jsonOptions = new JacksonHandle().with(options);
            resp = this.getServices().post(params, jsonOptions, new JacksonHandle()).get();
            return resp;
        }
    }

    static class DocumentHistoryResource extends ResourceManager {

        public DocumentHistoryResource(DatabaseClient srcClient) {
            super();
            srcClient.init("mlSmHistoryDocument" , this);
        }

        public JsonNode documentHistory(String mergedURI) {
            JsonNode resp;

            RequestParameters params = new RequestParameters();
            params.put("uri", mergedURI);
            resp = this.getServices().get(params, new JacksonHandle()).get();
            return resp;
        }
    }

    static class NotificationsResource extends ResourceManager {

        public NotificationsResource(DatabaseClient srcClient) {
            super();
            srcClient.init("mlSmNotifications" , this);
        }

        public JsonNode notifications(int start, int pageLength) {
            JsonNode resp;

            RequestParameters params = new RequestParameters();
            params.put("start", String.valueOf(start));
            params.put("pageLength", String.valueOf(pageLength));
            resp = this.getServices().get(params, new JacksonHandle()).get();
            return resp;
        }

        public JsonNode deleteNotifications(List<String> uris) {
            JsonNode resp;

            RequestParameters params = new RequestParameters();
            params.put("uri", uris);
            resp = this.getServices().delete(params, new JacksonHandle()).get();
            return resp;
        }
    }
}
