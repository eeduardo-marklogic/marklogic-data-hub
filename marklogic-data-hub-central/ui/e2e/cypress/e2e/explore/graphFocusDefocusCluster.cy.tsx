import {toolbar} from "../../support/components/common";
import browsePage from "../../support/pages/browse";
import graphExplore from "../../support/pages/graphExplore";
import LoginPage from "../../support/pages/login";
import {ExploreGraphNodes} from "../../support/types/explore-graph-nodes";
import graphExploreSidePanel from "../../support/components/explore/graph-explore-side-panel";

describe("Focus Defocus clusters", () => {
  before(() => {
    cy.visit("/");

    cy.log("**Logging into the app as a developer**");
    cy.loginAsDeveloper().withRequest();
    LoginPage.postLogin();
    cy.log("**Navigate to Explore**");
    toolbar.getExploreToolbarIcon().click();
    browsePage.waitForSpinnerToDisappear();
    //Graph view
    cy.log("**Go to graph view**");
    browsePage.clickGraphView();
    browsePage.waitForSpinnerToDisappear();
    graphExplore.getGraphVisCanvas().should("be.visible");
    cy.wait(2000);
    browsePage.waitForSpinnerToDisappear();
    cy.waitForAsyncRequest();
    //Saving Local Storage to preserve session
    cy.saveLocalStorage();
  });
  beforeEach(() => {
    //Restoring Local Storage to Preserve Session
    cy.restoreLocalStorage();
  });

  it("Validate focus and defocus cluster options are working correctly", () => {
    cy.log("**Picking up customer node and validate it is available in canvas**");
    graphExplore.focusNode(ExploreGraphNodes.CUSTOMER_102);
    graphExplore.getPositionsOfNodes(ExploreGraphNodes.CUSTOMER_102).then((nodePositions: any) => {
      let customerCoordinates: any = nodePositions[ExploreGraphNodes.CUSTOMER_102];
      const canvas = graphExplore.getGraphVisCanvas();
      //Click on node to open side panel
      canvas.trigger("mouseover", customerCoordinates.x, customerCoordinates.y, {force: true});
      canvas.click(customerCoordinates.x, customerCoordinates.y, {force: true});
    });
    cy.wait(3000);
    cy.log("**View customer record type information**");
    graphExplore.getRecordTab().click();
    graphExplore.getJsonRecordData().should("be.visible");
  });
  it("Right click on a node to choose focus on cluster ", () => {
    graphExplore.focusNode(ExploreGraphNodes.BABY_REGISTRY_3039);
    graphExplore.getPositionsOfNodes(ExploreGraphNodes.BABY_REGISTRY_3039).then((nodePositions: any) => {
      let babyRegistryCoordinates: any = nodePositions[ExploreGraphNodes.BABY_REGISTRY_3039];
      const canvas = graphExplore.getGraphVisCanvas();

      //Click on node to open side panel
      canvas.rightclick(babyRegistryCoordinates.x, babyRegistryCoordinates.y, {force: true});
      canvas.rightclick(babyRegistryCoordinates.x, babyRegistryCoordinates.y, {force: true});
    });

    cy.log("**Focussing on the cluster with baby registry node**");
    graphExplore.getContextMenu().scrollIntoView().should("be.visible");
    graphExplore.showRecordsInCluster();

    graphExploreSidePanel.getSidePanel().should("not.exist");
  });
  it("Verify Customer node is not visible in the canvas", () => {
    graphExplore.focusNode(ExploreGraphNodes.CUSTOMER_102);
    graphExplore.getPositionsOfNodes(ExploreGraphNodes.CUSTOMER_102).then((nodePositions: any) => {
      let customerCoordinates: any = nodePositions[ExploreGraphNodes.CUSTOMER_102];
      const canvas = graphExplore.getGraphVisCanvas();

      //Click on node to open side panel
      canvas.click(customerCoordinates.x, customerCoordinates.y, {force: true});
      canvas.click(customerCoordinates.x, customerCoordinates.y, {force: true});
      graphExploreSidePanel.getSidePanel().should("not.exist");
    });
    cy.wait(2000);
  });
  it("Again right-click on Baby Registry node to defocus and show all records from the query", () => {
    graphExplore.focusNode(ExploreGraphNodes.BABY_REGISTRY_3039);
    graphExplore.getPositionsOfNodes(ExploreGraphNodes.BABY_REGISTRY_3039).then((nodePositions: any) => {
      let babyRegistryCoordinates: any = nodePositions[ExploreGraphNodes.BABY_REGISTRY_3039];
      const canvas = graphExplore.getGraphVisCanvas();
      //Click on node to open side panel
      canvas.rightclick(babyRegistryCoordinates.x, babyRegistryCoordinates.y, {force: true});
      canvas.rightclick(babyRegistryCoordinates.x, babyRegistryCoordinates.y, {force: true});
    });

    cy.log("**Show all records from the query**");
    graphExplore.getContextMenu().scrollIntoView().should("be.visible");
    graphExplore.showAllRecordsFromQuery();

    cy.log("**Verify Customer node exists in the canvas now**");
    graphExplore.focusNode(ExploreGraphNodes.CUSTOMER_102);
    graphExplore.getPositionsOfNodes(ExploreGraphNodes.CUSTOMER_102).then((nodePositions: any) => {
      let customerCoordinates: any = nodePositions[ExploreGraphNodes.CUSTOMER_102];
      expect(customerCoordinates).to.not.equal(undefined);
    });
  });
});
