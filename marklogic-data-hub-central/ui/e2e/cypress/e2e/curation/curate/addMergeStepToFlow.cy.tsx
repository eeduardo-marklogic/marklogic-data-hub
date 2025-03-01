import "cypress-wait-until";
import {Application} from "../../../support/application.config";
import {
  toolbar,
  createEditStepDialog,
} from "../../../support/components/common/index";
import curatePage from "../../../support/pages/curate";
import loadPage from "../../../support/pages/load";
import runPage from "../../../support/pages/run";
import LoginPage from "../../../support/pages/login";
import {generateUniqueName} from "../../../support/helper";

const mergeStep = generateUniqueName("mergeStep");
const flowName1 = generateUniqueName("flow1");
const flowName2 = generateUniqueName("flow2");

describe("Add Merge step to a flow", () => {
  before(() => {
    cy.visit("/");
    cy.contains(Application.title);
    cy.loginAsDeveloper().withRequest();
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
    cy.deleteFlows(flowName2, flowName1);
    cy.resetTestUser();
  });
  it("Navigating to Customer Merge tab", () => {
    toolbar.getCurateToolbarIcon().should("be.visible").click();
    curatePage.getEntityTypePanel("Customer").should("be.visible");
    curatePage.toggleEntityTypeId("Customer");
    curatePage.selectMergeTab("Customer");
  });
  it("Create a new merge step", () => {
    curatePage.addNewStep("Customer").should("be.visible").click();
    createEditStepDialog.stepNameInput().type(mergeStep, {timeout: 2000});
    createEditStepDialog.stepDescriptionInput().type("merge order step example", {timeout: 2000});
    createEditStepDialog.setSourceRadio("Query");
    createEditStepDialog.setQueryInput(`cts.collectionQuery(['${mergeStep}'])`);
    createEditStepDialog.setTimestampInput().type("/envelop/headers/createdOn", {timeout: 2000});
    createEditStepDialog.saveButton("merging").click();
    cy.waitForAsyncRequest();
    createEditStepDialog.cancelButton("merging").click();
    curatePage.verifyStepNameIsVisible(mergeStep);
  });
  it("Create merge step with duplicate name and verify duplicate name modal is displayed", () => {
    curatePage.addNewStep("Customer").should("be.visible").click();
    createEditStepDialog.stepNameInput().type(mergeStep);
    createEditStepDialog.stepDescriptionInput().type("merge order step example");
    createEditStepDialog.setSourceRadio("Query");
    createEditStepDialog.setQueryInput("test");
    createEditStepDialog.saveButton("merging").click();
    cy.waitForAsyncRequest();

    loadPage.duplicateStepErrorMessage().then(() => {
      loadPage.confirmationOptions("Ok").click({force: true}).then(() => {
        loadPage.duplicateStepErrorMessageClosed();
      });
    });
  });
  it("Add the Merge step to new flow and Run the step(new)", {defaultCommandTimeout: 120000}, () => {
    curatePage.addToNewFlow("Customer", mergeStep);
    cy.waitForAsyncRequest();
    cy.findByText("New Flow").should("be.visible");
    runPage.setFlowName(flowName1);
    runPage.setFlowDescription(`${flowName1} description`);
    cy.wait(500);
    loadPage.confirmationOptions("Save").click();
    cy.wait(500);
    cy.waitForAsyncRequest();
    runPage.getRunStep(mergeStep, flowName1).should("be.visible");
    runPage.runStep(mergeStep, flowName1);

    runPage.verifyStepRunResult(mergeStep, "success");
    runPage.closeFlowStatusModal(flowName1);
  });
  it("Delete the step and Navigate back to merge tab", () => {
    runPage.deleteStep(mergeStep, flowName1).click();
    loadPage.confirmationOptions("Yes").click();
    cy.waitForAsyncRequest();
    toolbar.getCurateToolbarIcon().should("be.visible").click();
    curatePage.getEntityTypePanel("Customer").should("be.visible");
    //curatePage.toggleEntityTypeId("Customer");
    curatePage.selectMergeTab("Customer");
  });
  it("Add the Merge step to an existing flow and Run the step(existing)", {defaultCommandTimeout: 120000}, () => {
    curatePage.openExistingFlowDropdown("Customer", mergeStep);
    curatePage.getExistingFlowFromDropdown(mergeStep, flowName1).click({force: true});
    curatePage.addStepToFlowConfirmationMessage();
    curatePage.confirmAddStepToFlow(mergeStep, flowName1);
    cy.waitForAsyncRequest();
    runPage.runStep(mergeStep, flowName1);

    runPage.verifyStepRunResult(mergeStep, "success");
    runPage.closeFlowStatusModal(flowName1);
  });
  it("Delete the merge step", () => {
    runPage.deleteStep(mergeStep, flowName1).click();
    loadPage.confirmationOptions("Yes").click();
    cy.waitForAsyncRequest();
    runPage.expandFlow(flowName1);
  });
  it("Add the Merge step to new flow from card run button", {defaultCommandTimeout: 120000}, () => {
    runPage.createFlowButton().click();
    runPage.newFlowModal().should("be.visible");
    runPage.setFlowName(flowName2);
    runPage.setFlowDescription(`${flowName2} description`);
    cy.wait(500);
    loadPage.confirmationOptions("Save").click();
    cy.wait(500);
    cy.waitForAsyncRequest();
    runPage.getFlowName(flowName2).should("be.visible");
    runPage.addStep(flowName2);
    runPage.addStepToFlow(mergeStep);
    runPage.runStep(mergeStep, flowName2);

    runPage.verifyStepRunResult(mergeStep, "success");
    runPage.closeFlowStatusModal(flowName2);
  });
  it("Delete the merge step and Navigating to merge tab", () => {
    runPage.deleteStep(mergeStep, flowName2).click();
    loadPage.confirmationOptionsAll("Yes").eq(0).click();
    cy.waitForAsyncRequest();
    toolbar.getCurateToolbarIcon().should("be.visible").click();
    curatePage.getEntityTypePanel("Customer").should("be.visible");
    curatePage.selectMergeTab("Customer");
  });
  it("Add the Merge step to an existing flow from card run button and should automatically run", {defaultCommandTimeout: 120000}, () => {
    curatePage.runStepInCardView(mergeStep).click();
    curatePage.runStepSelectFlowConfirmation().should("be.visible");
    curatePage.selectFlowToRunIn(flowName2);
    cy.waitForAsyncRequest();
    runPage.getFlowStatusSuccess(flowName2).should("be.visible");
    runPage.verifyStepRunResult(mergeStep, "success");
    runPage.closeFlowStatusModal(flowName2);
    runPage.getRunStep(mergeStep, flowName2).should("be.visible");
  });
  it("Navigating to merge tab", () => {
    toolbar.getCurateToolbarIcon().should("be.visible").click();
    curatePage.getEntityTypePanel("Customer").should("be.visible");
    curatePage.selectMergeTab("Customer");
  });
  it("Run the Merge step from card run button and should automatically run in the flow where step exists", {defaultCommandTimeout: 120000}, () => {
    curatePage.runStepInCardView(mergeStep).click();
    curatePage.runStepExistsOneFlowConfirmation().should("be.visible");
    curatePage.confirmContinueRun();
    cy.waitForAsyncRequest();
    runPage.getFlowStatusSuccess(flowName2).should("be.visible");

    runPage.verifyStepRunResult(mergeStep, "success");
    runPage.closeFlowStatusModal(flowName2);
    runPage.getRunStep(mergeStep, flowName2).should("be.visible");
  });
  it("Navigating to merge tab", () => {
    toolbar.getCurateToolbarIcon().should("be.visible").click();
    curatePage.getEntityTypePanel("Customer").should("be.visible");
    curatePage.selectMergeTab("Customer");
  });
  it("Add the merge step to a second flow and verify it was added", () => {
    curatePage.openExistingFlowDropdown("Customer", mergeStep);
    curatePage.getExistingFlowFromDropdown(mergeStep, flowName1).click({force: true});
    curatePage.addStepToFlowConfirmationMessage();
    curatePage.confirmAddStepToFlow(mergeStep, flowName1);
    cy.waitForAsyncRequest();
    runPage.getRunStep(mergeStep, flowName1).should("be.visible");
  });

  it("Navigating to merge tab", () => {
    toolbar.getCurateToolbarIcon().should("be.visible").click();
    curatePage.getEntityTypePanel("Customer").should("be.visible");
    curatePage.selectMergeTab("Customer");
  });

  it("Run the Merge step from card run button and should display all flows where step exists, choose one to automatically run in", {defaultCommandTimeout: 120000}, () => {
    curatePage.runStepInCardView(mergeStep).click();
    curatePage.runStepExistsMultFlowsConfirmation().should("be.visible");
    curatePage.selectFlowToRunIn(flowName1);
    cy.waitForAsyncRequest();
    runPage.getFlowStatusSuccess(flowName1).should("be.visible");

    runPage.verifyStepRunResult(mergeStep, "success");
    runPage.closeFlowStatusModal(flowName1);
    runPage.getRunStep(mergeStep, flowName1).should("be.visible");
  });

  it("Delete the merge step", () => {
    toolbar.getCurateToolbarIcon().should("be.visible").click();
    curatePage.getEntityTypePanel("Customer").should("be.visible");
    curatePage.selectMergeTab("Customer");
    curatePage.deleteMappingStepButton(mergeStep).should("be.visible").click();
    curatePage.deleteConfirmation("Yes").click();
  });

  it("Validate merge step is removed from flows", () => {
    toolbar.getRunToolbarIcon().should("be.visible").click();
    runPage.expandFlow(flowName1);
    runPage.verifyNoStepsInFlow();
    toolbar.getRunToolbarIcon().should("be.visible").click();
    runPage.expandFlow(flowName2);
    runPage.verifyNoStepsInFlow();
  });

});
