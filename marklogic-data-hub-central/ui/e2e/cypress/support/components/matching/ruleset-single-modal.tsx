class RulesetSingleModal {

  selectPropertyToMatch(property: string) {
    cy.get(".rc-tree-select-selector").trigger("mouseover").click();
    cy.findByLabelText(`${property}-option`).then($option => {
      $option[0].click();
    });
    cy.waitUntil(() => cy.findByLabelText(`${property}-option`).should("not.be.visible", {timeout: 10000}));
  }

  selectStructuredPropertyToMatch(parent: string, property: string) {
    const structuredProperty = property.split(" > ").pop();
    //open the dropDown
    cy.get(".rc-tree-select-selector").trigger("mouseover").click();
    // select structured property
    cy.get(`[aria-label="${parent}-option"]`).find(`[aria-label="icon: caret-down"]`).should("be.visible").click({force: true});
    // click on the property selected
    cy.get(`[aria-label="${structuredProperty}-option"]`).should("be.visible").click({force: true});
    cy.waitUntil(() => cy.findByLabelText(`${property}-option`).should("not.be.visible", {timeout: 10000}));
  }

  selectMatchTypeDropdown(matchType: string) {
    cy.get("#match-type-select-wrapper").click();
    cy.get(`#match-type-select-MenuList [aria-label="${matchType}-option"]`).should("have.length.gt", 0).click();
  }

  setUriText(str: string) {
    cy.get("#uri-input").focus().type(str);
  }

  setFunctionText(str: string) {
    cy.get("#function-input").focus().type(str);
  }

  setNamespaceText(str: string) {
    cy.get("#namespace-input").focus().type(str);
  }

  cancelButton() {
    return cy.findByLabelText("cancel-single-ruleset");
  }

  saveButton() {
    return cy.findByLabelText("confirm-single-ruleset");
  }

  closeButton() {
    return cy.findByLabelText("Close");
  }

  setDictionaryUri(str: string) {
    cy.get("#dictionary-uri-input").focus().type(str);
  }

  setDistanceThreshold(str: string) {
    cy.get("#distance-threshold-input").focus().type(str);
  }

  setThesaurus(str: string) {
    cy.get("#thesaurus-uri-input").focus().type(str);
  }

  reduceButton() {
    return cy.findByLabelText("reduceToggle");
  }

  getElementWithID(id: string) {
    return cy.get(`#${id}`);
  }

  saveModalButton(label: string) {
    cy.get(`[aria-label=${label}]`).click();
  }

  addListTitle(id: string, title: string) {
    cy.get(`[id$=${id}]`).type(title);
  }

  addValuesToListToIgnore(word: string) {
    cy.get(`*[class^="rbt-input-main"]`).click();
    cy.get(`*[class^="rbt-input-main"]`).type(word).then(() => {
      cy.get(`[id^=custom-selections-item]`).click();
    });
  }

  editFirstList() {
    return cy.get("[id^=edit-]").first();
  }

  selectValuesToIgnoreInput() {
    cy.get(`[id="valuesToIgnore"]`).click({force: true});
  }

  hoverItemPresetList() {
    cy.findByText("Preset List 1").trigger("mouseover");
  }

}

const rulesetSingleModal = new RulesetSingleModal();
export default rulesetSingleModal;
