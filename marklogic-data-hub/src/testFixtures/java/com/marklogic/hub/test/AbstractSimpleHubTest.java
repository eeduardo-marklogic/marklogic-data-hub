package com.marklogic.hub.test;

import com.marklogic.hub.HubClient;
import com.marklogic.hub.HubProject;
import com.marklogic.hub.impl.HubConfigImpl;
import com.marklogic.hub.impl.HubProjectImpl;
import com.marklogic.mgmt.ManageConfig;
import org.junit.jupiter.api.BeforeEach;

import java.io.File;
import java.util.HashMap;
import java.util.Properties;

/**
 * Subprojects that wish to reuse this testFixtures module can likely have their tests extend this class.
 * It implements the abstract methods in AbstractHubTest with a simple implementation for creating a HubProject,
 * resetting the databases, and running as a data-hub-developer user.
 */
public abstract class AbstractSimpleHubTest extends AbstractHubTest {

    private HubConfigImpl hubConfig;
    private HubClient hubClient;
    private HubProject testHubProject;
    private String testProjectDirectory = "build/hub-test";

    @BeforeEach
    void beforeEachSimpleHubTest() {
        testHubProject = new HubProjectImpl();
        testHubProject.createProject(testProjectDirectory);
        testHubProject.init(new HashMap<>());
        hubConfig = new HubConfigImpl(testHubProject);
        resetHubProject();
        runAsDataHubDeveloper();
    }

    @Override
    protected HubClient getHubClient() {
        if (hubClient == null) {
            hubClient = getHubConfig().newHubClient();
        }
        return hubClient;
    }

    @Override
    protected HubClient doRunAsUser(String username, String password) {
        Properties props = new Properties();
        props.setProperty("mlUsername", username);
        props.setProperty("mlPassword", password);
        hubConfig.applyProperties(props);
        if (!username.equals(getHubClient().getUsername())) {
            hubClient = null;
        }
        return getHubClient();
    }

    @Override
    protected void doRunWithHubClient(HubClient hubClient) {
        Properties props = new Properties();
        ManageConfig manageConfig = hubClient.getManageClient().getManageConfig();
        props.setProperty("mlUsername", manageConfig.getUsername());
        props.setProperty("mlPassword", manageConfig.getPassword());
        hubConfig.applyProperties(props);
        this.hubClient = hubClient;
    }

    @Override
    protected HubConfigImpl getHubConfig() {
        return hubConfig;
    }

    @Override
    protected File getTestProjectDirectory() {
        return new File(testProjectDirectory);
    }
}
