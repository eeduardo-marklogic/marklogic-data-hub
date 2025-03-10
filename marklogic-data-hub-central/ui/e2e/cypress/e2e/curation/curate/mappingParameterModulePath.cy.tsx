import {Application} from "../../../support/application.config";
import {toolbar} from "../../../support/components/common";
import {
  advancedSettingsDialog,
  createEditMappingDialog,
} from "../../../support/components/mapping/index";
import curatePage from "../../../support/pages/curate";
import LoginPage from "../../../support/pages/login";
import "cypress-wait-until";

const loadStep = "loadOrderCustomHeader";
const mapStep = "mapParameterModule";

describe("Create and Edit Mapping Steps with Parameter Module Path", () => {
  before(() => {
    cy.visit("/");
    cy.contains(Application.title);
    cy.loginAsTestUserWithRoles("hub-central-flow-writer", "hub-central-mapping-writer", "hub-central-load-writer").withRequest();
    LoginPage.postLogin();
    //Saving Local Storage to preserve session
    cy.saveLocalStorage();
  });
  beforeEach(() => {
    //Restoring Local Storage to Preserve Session
    cy.restoreLocalStorage();
  });
  after(() => {
    cy.loginAsDeveloper().withRequest();
    cy.deleteSteps("mapping", "mapParameterModule");

    cy.resetTestUser();
    cy.waitForAsyncRequest();
  });

  it("Create mapping step with parameter module path", () => {
    toolbar.getCurateToolbarIcon().click();
    curatePage.getEntityTypePanel("Customer").should("be.visible");
    curatePage.toggleEntityTypeId("Order");
    curatePage.addNewStep("Order").should("be.visible").click();
    createEditMappingDialog.setMappingName(mapStep);
    createEditMappingDialog.setMappingDescription("An order mapping with custom header");
    createEditMappingDialog.setSourceRadio("Query");
    createEditMappingDialog.setQueryInput(`cts.collectionQuery(['${loadStep}'])`);

    cy.log("**Switch to Advanced tab to modify parameter module path**");
    curatePage.switchEditAdvanced().click();
    advancedSettingsDialog.setParameterModulePath("faultyPath");

    cy.log("**Save settings and verify error message with invalid module path**");
    advancedSettingsDialog.saveButton().should("be.visible").click({force: true});
    advancedSettingsDialog.verifyInvalidPathError().should("be.visible");
    advancedSettingsDialog.confirmError();

    cy.log("**Fix error and verify step is saved**");
    advancedSettingsDialog.setParameterModulePath("/custom-modules/custom/user-params.sjs");

    advancedSettingsDialog.saveButton().should("be.visible").click({force: true});
    curatePage.verifyStepDetailsOpen(mapStep);
  });
  it("Edit Mapping step with parameter module path", () => {
    cy.restoreLocalStorage();
    //Go back to curate homepage
    cy.visit("/tiles/curate");
    cy.waitForAsyncRequest();

    cy.log("**Open Order to see steps**");
    curatePage.getEntityTypePanel("Order").should("be.visible").click({force: true});

    cy.log("**Open step settings and switch to Advanced tab**");
    // there's a re-render.
    cy.wait(1000);
    curatePage.editStep(mapStep).should("be.visible").click({force: true});
    curatePage.switchEditAdvanced().should("be.visible").click({force: true});

    cy.log("**Save settings and verify error message with invalid module path**");
    advancedSettingsDialog.setParameterModulePath("faultyPath");
    advancedSettingsDialog.saveButton().should("be.visible").click({force: true});
    advancedSettingsDialog.verifyInvalidPathError().should("be.visible");
    advancedSettingsDialog.confirmError();

    cy.log("**Fix error and verify step is saved**");
    advancedSettingsDialog.setParameterModulePath("/custom-modules/custom/user-params.sjs");

    advancedSettingsDialog.saveButton().should("be.visible").click({force: true});
    advancedSettingsDialog.verifyInvalidPathError().should("not.exist");
  });
});