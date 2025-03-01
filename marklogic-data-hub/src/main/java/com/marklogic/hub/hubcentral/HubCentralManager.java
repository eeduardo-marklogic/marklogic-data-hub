package com.marklogic.hub.hubcentral;

import com.fasterxml.jackson.core.util.DefaultIndenter;
import com.fasterxml.jackson.core.util.DefaultPrettyPrinter;
import com.fasterxml.jackson.core.util.Separators;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.marklogic.appdeployer.ConfigDir;
import com.marklogic.client.ext.helper.LoggingObject;
import com.marklogic.client.io.DocumentMetadataHandle;
import com.marklogic.client.io.JacksonHandle;
import com.marklogic.hub.DatabaseKind;
import com.marklogic.hub.HubClient;
import com.marklogic.hub.HubConfig;
import com.marklogic.hub.HubProject;
import com.marklogic.hub.dataservices.ArtifactService;
import com.marklogic.hub.impl.HubConfigImpl;
import com.marklogic.hub.impl.HubProjectImpl;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.springframework.util.FileCopyUtils;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Properties;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipOutputStream;

/**
 * Manager interface for operations that are distinctly HubCentral-specific.
 */
public class HubCentralManager extends LoggingObject {

    public void writeHubCentralFilesAsZip(HubClient hubClient, OutputStream outputStream) {
        ArrayNode artifacts = (ArrayNode) ArtifactService.on(hubClient.getStagingClient()).getArtifactsWithProjectPaths();

        final ZipOutputStream zipOutputStream = new ZipOutputStream(outputStream);
        final ObjectWriter prettyWriter = buildPrettyWriter();

        try {
            artifacts.forEach(artifact -> {
                ZipEntry entry = new ZipEntry(artifact.get("path").asText());
                try {
                    zipOutputStream.putNextEntry(entry);
                    if (artifact.has("xml")) {
                        byte[] bytes = artifact.get("xml").asText().getBytes();
                        zipOutputStream.write(bytes, 0, bytes.length);
                    } else {
                        byte[] bytes = prettyWriter.writeValueAsString(artifact.get("json")).getBytes();
                        zipOutputStream.write(bytes, 0, bytes.length);
                    }
                    zipOutputStream.closeEntry();
                } catch (IOException ex) {
                    throw new RuntimeException("Unable to download configuration files as a zip, cause: " + ex.getMessage(), ex);
                }
            });
        } finally {
            IOUtils.closeQuietly(zipOutputStream);
        }
    }

    public void writeProjectFilesAsZip(HubClient hubClient, OutputStream outputStream){
        HubProjectImpl hubProject = new HubProjectImpl();
        Path projectPath = null;
        try {
            projectPath = Files.createTempDirectory("");
            hubProject.createProject(projectPath.toFile().getAbsolutePath());
            HubConfigImpl hubConfig = new HubConfigImpl(hubProject);
            Properties dbProperties = hubConfig.getHubPropertiesFromDb(hubClient.getStagingClient());
            hubConfig.applyProperties(dbProperties);
            hubConfig.initHubProject();
            writeHubCentralFilesToProject(hubProject, hubClient);
            writeDhsGradlePropertiesFile(hubProject);
            hubProject.exportProject(outputStream, Stream.of("gradle-local.properties", "gradle-dhs.properties").collect(Collectors.toList()));
        } catch (IOException ex) {
            throw new RuntimeException("Unable to download project files as a zip, cause: " + ex.getMessage(), ex);
        }
        finally {
            IOUtils.closeQuietly(outputStream);
            FileUtils.deleteQuietly(projectPath.toFile());
        }
    }

    public void deployHubCentralConfig(HubClient hubClient, JsonNode config, String docUri) {
        JacksonHandle handle = new JacksonHandle().with(config);
        DocumentMetadataHandle documentMetadataHandle = new DocumentMetadataHandle()
            .withPermission("data-hub-common", DocumentMetadataHandle.Capability.READ)
            .withPermission("hub-central-entity-model-reader", DocumentMetadataHandle.Capability.UPDATE)
            .withCollections("http://marklogic.com/hub-central/ui-config");
        hubClient.getFinalClient().newJSONDocumentManager().write(docUri, documentMetadataHandle, handle);
        hubClient.getStagingClient().newJSONDocumentManager().write(docUri, documentMetadataHandle, handle);
    }

    public void deleteHubCentralConfig(HubClient hubClient) {
        hubClient.getFinalClient().newJSONDocumentManager().delete("/config/hubCentral.json");
        hubClient.getStagingClient().newJSONDocumentManager().delete("/config/hubCentral.json");
    }

    private void writeDhsGradlePropertiesFile(HubProjectImpl hubProject) {
        try (OutputStream outputStream = new FileOutputStream(hubProject.getProjectDir().resolve("gradle-dhs.properties").toFile())) {
            Properties properties = new Properties();
            properties.setProperty("mlHost", "");
            properties.setProperty("mlUsername", "");
            properties.setProperty("mlPassword", "");
            properties.setProperty("hubDhs", "true");
            properties.store(outputStream, null);
        } catch (IOException ex) {
            throw new RuntimeException("Unable to write gradle-dhs.properties, cause: " + ex.getMessage(), ex);
        }
    }

    private void writeHubCentralFilesToProject(HubProject hubProject, HubClient hubClient){
        ArrayNode artifacts = (ArrayNode) ArtifactService.on(hubClient.getStagingClient()).getArtifactsWithProjectPaths();
        final File projectDir = hubProject.getProjectDir().toFile();
        final ObjectWriter prettyWriter = buildPrettyWriter();

        artifacts.forEach(artifact -> {
            String path = artifact.get("path").asText();
            byte[] bytes;
            try{
                if (artifact.has("xml")) {
                    bytes = artifact.get("xml").asText().getBytes();
                } else {
                    bytes = prettyWriter.writeValueAsString(artifact.get("json")).getBytes();
                }
                File outputFile = new File(projectDir, path);
                outputFile.getParentFile().mkdirs();
                try(FileOutputStream fileOut = new FileOutputStream(outputFile)){
                    FileCopyUtils.copy(bytes, fileOut);
                }
            }
            catch (IOException ex){
                throw new RuntimeException("Unable to download project files as a zip, cause: " + ex.getMessage(), ex);
            }
        });
    }

    /**
     * @param hubProject
     * @param zipFile
     */
    public void applyHubCentralZipToProject(HubProject hubProject, File zipFile) {
        if (zipFile == null || !zipFile.exists()) {
            throw new RuntimeException("Unable to apply zip file to project, file does not exist: " + zipFile);
        }

        deleteUserArtifacts(hubProject);
        deleteEntityBasedArtifacts(hubProject);

        // Initialize the project so that the user config directories are present, even if the downloaded zip file
        // doesn't have any files of a particular type. Don't need a valid tokens map here as it's assumed that the
        // gradle.properties file already exists.
        hubProject.init(new HashMap<>());

        extractZipToProject(hubProject, zipFile);
    }

    /**
     * @param hubProject
     */
    protected void deleteUserArtifacts(HubProject hubProject) {
        Stream.of(
            hubProject.getFlowsDir(),
            hubProject.getHubEntitiesDir(),
            hubProject.getHubCentralConfigPath()
        ).forEach(path -> deleteDirectory(path.toFile()));

        // For 5.3.0, have to be careful with the steps path, as we only want to delete ingestion and mapping directories
        File stepsDir = hubProject.getStepsPath().toFile();
        if (stepsDir.exists() && stepsDir.isDirectory()) {
            deleteDirectory(new File(stepsDir, "ingestion"));
            deleteDirectory(new File(stepsDir, "mapping"));
        }
    }

    private void deleteDirectory(File dir) {
        if (dir.exists() && dir.isDirectory()) {
            try {
                logger.info("Deleting directory: " + dir);
                FileUtils.deleteDirectory(dir);
            } catch (IOException ex) {
                throw new RuntimeException("Unable to delete directory: " + dir + "; cause: " + ex.getMessage(), ex);
            }
        }
    }

    /**
     * @param hubProject
     */
    protected void deleteEntityBasedArtifacts(HubProject hubProject) {
        File userConfigDir = hubProject.getUserConfigDir().toFile();
        if (userConfigDir.exists()) {
            ConfigDir configDir = new ConfigDir(userConfigDir);
            File ppDir = configDir.getProtectedPathsDir();
            if (ppDir.exists()) {
                for (File file : ppDir.listFiles((dir, name) -> name.contains(HubConfig.PII_PROTECTED_PATHS_FILE))) {
                    logger.info("Deleting entity-based protected path file: " + file.getAbsolutePath());
                    file.delete();
                }
            }

            File qrDir = configDir.getQueryRolesetsDir();
            if (qrDir.exists()) {
                File file = new File(qrDir, HubConfig.PII_QUERY_ROLESET_FILE);
                if (file.exists()) {
                    logger.info("Deleting entity-based PII query roleset file: " + file.getAbsolutePath());
                    file.delete();
                }
            }
        }

        File entityConfigDir = hubProject.getEntityConfigDir().toFile();
        if (entityConfigDir.exists()) {
            logger.info("Deleting entity-config directory: " + entityConfigDir.getAbsolutePath());
            try {
                FileUtils.deleteDirectory(entityConfigDir);
            } catch (IOException e) {
                throw new RuntimeException("Unable to delete entity-config directory at: " +
                    entityConfigDir.getAbsolutePath() + "; cause: " + e.getMessage(), e);
            }
        }
    }

    /**
     * @param hubProject
     * @param zipFile
     */
    protected void extractZipToProject(HubProject hubProject, File zipFile) {
        final File projectDir = hubProject.getProjectDir().toFile();
        logger.info("Extracting zip file into project directory: " + projectDir.getAbsolutePath());
        try (ZipFile zip = new ZipFile(zipFile)) {
            Enumeration<?> entries = zip.entries();
            while (entries.hasMoreElements()) {
                ZipEntry entry = (ZipEntry) entries.nextElement();
                int entrySize = (int) entry.getSize();
                byte[] buffer = new byte[entrySize];
                File outputFile = new File(projectDir, entry.getName());
                outputFile.getParentFile().mkdirs();
                try (InputStream inputStream = zip.getInputStream(entry);
                     FileOutputStream fileOut = new FileOutputStream(outputFile)) {
                    if (inputStream.read(buffer, 0, entrySize) > 0) {
                        logger.info("Writing file: " + outputFile);
                        FileCopyUtils.copy(buffer, fileOut);
                    }
                }
            }
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
    }

    protected ObjectWriter buildPrettyWriter() {
        ObjectMapper prettyMapper = new ObjectMapper();
        prettyMapper.enable(SerializationFeature.INDENT_OUTPUT);
        return prettyMapper.writer(new CustomPrettyPrinter());
    }

    class CustomPrettyPrinter extends DefaultPrettyPrinter {
        @Override
        public DefaultPrettyPrinter withSeparators(Separators separators) {
            _separators = separators;
            // Jackson does " : " by default; ": " is used by qconsole and Intellij, so defaulting to that instead
            _objectFieldValueSeparatorWithSpaces = ": ";
            return this;
        }

        /**
         * Jackson 2.9.x does not require this, and DH core is currently depending on that.
         * But Hub Central uses jackson 2.10.x, and that version of jackson requires this method to be overridden.
         *
         * @return
         */
        @Override
        public DefaultPrettyPrinter createInstance() {
            CustomPrettyPrinter printer = new CustomPrettyPrinter();
            printer.indentArraysWith(DefaultIndenter.SYSTEM_LINEFEED_INSTANCE);
            return printer;
        }
    }
}
