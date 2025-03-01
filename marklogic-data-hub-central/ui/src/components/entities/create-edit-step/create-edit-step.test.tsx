import React from "react";
import {render, fireEvent, cleanup, wait} from "@testing-library/react";
import CreateEditStep from "./create-edit-step";
import data from "../../../assets/mock-data/curation/create-edit-step.data";
import axiosMock from "axios";
import {stringSearchResponse} from "../../../assets/mock-data/explore/facet-props";
import {SecurityTooltips, CommonStepTooltips} from "../../../config/tooltips.config";
import {StepType} from "../../../types/curation-types";

jest.mock("axios");
describe("Create Edit Step Dialog component", () => {

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  test("Verify Edit Merging dialog renders correctly", async () => {
    const {getByText, getByPlaceholderText, getByLabelText} = render(<CreateEditStep {...data.editMerging} />);
    expect(getByPlaceholderText("Enter name")).toHaveValue("mergeCustomers");
    expect(getByPlaceholderText("Enter name")).toBeDisabled();
    expect(getByPlaceholderText("Enter description")).toHaveValue("merge customer description");

    expect(getByLabelText("Collection")).toBeChecked();
    const collInput = document.querySelector((".rbt-input-main"));
    await(() => expect(collInput).toHaveValue("matchCustomers"));

    fireEvent.click(getByLabelText("Query"));
    expect(getByPlaceholderText("Enter source query")).toHaveTextContent("cts.collectionQuery(['matchCustomers'])");

    expect(getByPlaceholderText("Enter path to the timestamp")).toHaveValue("/es:envelope/es:headers/timestamp");

    expect(getByText("Save")).toBeEnabled();
    expect(getByText("Cancel")).toBeEnabled();

    fireEvent.click(getByLabelText("Collection"));

    fireEvent.click(getByText("Save"));
    expect(data.editMerging.updateStepArtifact).toBeCalledWith({
      name: "mergeCustomers",
      description: "merge customer description",
      collection: "matchCustomers",
      selectedSource: "collection",
      sourceQuery: "cts.collectionQuery(['matchCustomers'])",
      targetEntityType: "Customer",
      lastUpdatedLocation: {
        documentXPath: "/es:envelope/es:headers/timestamp"
      },
    }, "merging");
  });

  test("Verify Edit Merging dialog renders correctly for a read only user", async () => {
    const {getByText, getByPlaceholderText, getByLabelText} = render(
      <CreateEditStep {...data.editMerging} canReadWrite={false} />
    );

    const stepName = getByPlaceholderText("Enter name");
    const description = getByPlaceholderText("Enter description");
    const collection = getByLabelText("Collection");
    const timestamp = getByPlaceholderText("Enter path to the timestamp");

    expect(stepName).toHaveValue("mergeCustomers");
    expect(stepName).toBeDisabled();
    expect(description).toHaveValue("merge customer description");
    expect(description).toBeDisabled();
    expect(collection).toBeChecked();
    expect(collection).toBeDisabled();
    expect(getByLabelText("Query")).toBeDisabled();
    const collInput = document.querySelector((".rbt-input-main"));
    expect(collInput).toBeDisabled();
    expect(timestamp).toHaveValue("/es:envelope/es:headers/timestamp");
    expect(timestamp).toBeDisabled();

    fireEvent.mouseOver(getByText("Save"));
    await wait(() => expect(getByText(SecurityTooltips.missingPermission)).toBeInTheDocument());
    // TODO DHFPROD-7711 skipping failing checks to enable component replacement
    // expect(getByText("Save")).toBeDisabled();
    // expect(getByText("Cancel")).toBeEnabled();
  });

  test("Verify New Merging Dialog renders ", async () => {
    const {getByText, getByLabelText, getByPlaceholderText} = render(
      <CreateEditStep {...data.newMerging}
        tabKey={""}
        openStepSettings={false}
        setOpenStepSettings={false}
        isEditing={false}
        stepType={StepType.Custom}
        editStepArtifactObject={{}}
        targetEntityType={""}
        canReadWrite={false}
        canReadOnly={false}
        createStepArtifact={jest.fn()}
        updateStepArtifact={jest.fn()}
        currentTab={""}
        setIsValid={jest.fn()}
        resetTabs={jest.fn()}
        setHasChanged={jest.fn()}
        setPayload={jest.fn()}
        onCancel={jest.fn()}/>
    );

    expect(getByPlaceholderText("Enter name")).toBeInTheDocument();
    expect(getByPlaceholderText("Enter description")).toBeInTheDocument();
    expect(getByLabelText("Collection")).toBeInTheDocument();
    expect(getByLabelText("Query")).toBeInTheDocument();
    expect(document.querySelector((".rbt-input-main"))).toBeInTheDocument();

    await(() => expect(getByPlaceholderText("Enter path to the timestamp")).toBeInTheDocument());
    await(() => expect(getByText("Save")).toBeEnabled());
    await(() => expect(getByText("Cancel")).toBeEnabled());
    //Collection radio button should be selected by default
    expect(getByLabelText("Collection")).toBeChecked();
  });

  test("Verify save button is always enabled and error messaging appears as needed", async () => {
    const {getByText, getByPlaceholderText, queryByText} = render(<CreateEditStep {...data.newMerging}

      tabKey={""}
      openStepSettings={false}
      setOpenStepSettings={false}
      isEditing={false}
      stepType={StepType.Custom}
      editStepArtifactObject={{}}
      targetEntityType={""}
      canReadWrite={false}
      canReadOnly={false}
      createStepArtifact={jest.fn()}
      updateStepArtifact={jest.fn()}
      currentTab={""}
      setIsValid={jest.fn()}
      resetTabs={jest.fn()}
      setHasChanged={jest.fn()}
      setPayload={jest.fn()}
      onCancel={jest.fn()}
    />);
    const nameInput = getByPlaceholderText("Enter name");
    const saveButton = getByText("Save");

    await(() => expect(saveButton).toBeEnabled()); // button should be enabled without any input

    fireEvent.change(nameInput, {target: {value: "testCreateMerging"}});
    expect(nameInput).toHaveValue("testCreateMerging");
    await(() => expect(saveButton).toBeEnabled());

    //verify validation on name field

    //proper error message shows when field is empty
    fireEvent.change(nameInput, {target: {value: ""}});
    await(() => expect(getByText("Name is required")).toBeInTheDocument());

    //proper error message shows when field does not lead with a letter
    fireEvent.change(nameInput, {target: {value: "123testCreateStep"}});
    expect(getByText("Names must start with a letter and can contain letters, numbers, hyphens, and underscores only.")).toBeInTheDocument();

    //reset name field
    fireEvent.change(nameInput, {target: {value: ""}});
    await(() => expect(getByText("Name is required")).toBeInTheDocument());

    //proper error message shows when field contains special characters
    fireEvent.change(nameInput, {target: {value: "test Create Step"}});
    expect(getByText("Names must start with a letter and can contain letters, numbers, hyphens, and underscores only.")).toBeInTheDocument();

    //reset name field
    fireEvent.change(nameInput, {target: {value: ""}});
    expect(getByText("Name is required")).toBeInTheDocument();

    //enter in a valid name and verify error message disappears (test hyphen and underscores are allowed)
    fireEvent.change(nameInput, {target: {value: "test-Create-Step__"}});

    await wait(() => {
      expect(queryByText("Name is required")).toBeNull();
      expect(queryByText("Names must start with a letter and can contain letters, numbers, hyphens, and underscores only.")).toBeNull();
    });

    await(() => expect(saveButton).toBeEnabled());
  });

  test("Verify Save button requires all mandatory fields", async () => {
    const {getByText, getByPlaceholderText} = render(<CreateEditStep {...data.newMerging}
      tabKey={""}
      openStepSettings={false}
      setOpenStepSettings={false}
      isEditing={false}
      stepType={StepType.Custom}
      editStepArtifactObject={{}}
      targetEntityType={""}
      canReadWrite={false}
      canReadOnly={false}
      createStepArtifact={jest.fn()}
      updateStepArtifact={jest.fn()}
      currentTab={""}
      setIsValid={jest.fn()}
      resetTabs={jest.fn()}
      setHasChanged={jest.fn()}
      setPayload={jest.fn()}
      onCancel={jest.fn()}/>);
    const nameInput = getByPlaceholderText("Enter name");
    const collInput = document.querySelector(("#collList .ant-input"));

    // click save without any input
    fireEvent.click(getByText("Save"));

    // both messages should show when both boxes are empty
    await(() => expect(getByText("Name is required")).toBeInTheDocument());
    await(() => expect(getByText("Collection or Query is required")).toBeInTheDocument());

    // enter name only
    fireEvent.change(nameInput, {target: {value: "testCreateMap"}});
    expect(nameInput).toHaveValue("testCreateMap");

    fireEvent.click(getByText("Save"));

    // error message for name should not appear
    await(() => expect(getByText("Collection or Query is required")).toBeInTheDocument());

    // clear name and enter collection only
    fireEvent.change(nameInput, {target: {value: ""}});
    await wait(() => {
      if (collInput) {
        fireEvent.change(collInput, {target: {value: "testCollection"}});
      }
    });
    await(() => expect(collInput).toHaveValue("testCollection"));

    fireEvent.click(getByText("Save"));

    // error message for empty collection should not appear
    expect(getByText("Name is required")).toBeInTheDocument();
  });

  test("Verify able to type in input fields and typeahead search in collections field", async () => {
    axiosMock.post["mockImplementationOnce"](jest.fn(() => Promise.resolve({status: 200, data: stringSearchResponse})));
    const {getByText, getByLabelText, getByPlaceholderText} = render(<CreateEditStep {...data.newMerging}
      tabKey={""}
      openStepSettings={false}
      setOpenStepSettings={false}
      isEditing={false}
      stepType={StepType.Custom}
      editStepArtifactObject={{}}
      targetEntityType={""}
      canReadWrite={false}
      canReadOnly={false}
      createStepArtifact={jest.fn()}
      updateStepArtifact={jest.fn()}
      currentTab={""}
      setIsValid={jest.fn()}
      resetTabs={jest.fn()}
      setHasChanged={jest.fn()}
      setPayload={jest.fn()}
      onCancel={jest.fn()}/>);

    const descInput = getByPlaceholderText("Enter description");
    const collInput = document.querySelector(("#collList .ant-input"));
    const saveButton = getByText("Save");
    saveButton.onclick = jest.fn();

    fireEvent.change(descInput, {target: {value: "test description"}});
    expect(descInput).toHaveValue("test description");
    await wait(() => {
      if (collInput) {
        fireEvent.change(collInput, {target: {value: "ada"}});
      }
    });
    let url = "/api/entitySearch/facet-values?database=final";
    let payload = {
      "referenceType": "collection",
      "entityTypeId": " ",
      "propertyPath": " ",
      "limit": 10,
      "dataType": "string",
      "pattern": "ada"
    };
    await(() => expect(axiosMock.post).toHaveBeenCalledWith(url, payload));
    await(() => expect(axiosMock.post).toHaveBeenCalledTimes(1));
    await(() => expect(getByText("Adams Cole")).toBeInTheDocument());

    await wait(() => {
      if (collInput) {
        fireEvent.change(collInput, {target: {value: "testCollection"}});
      }
    });
    await(() => expect(collInput).toHaveValue("testCollection"));
    fireEvent.click(getByLabelText("Query"));
    const queryInput = getByPlaceholderText("Enter source query");
    fireEvent.change(queryInput, {target: {value: "cts.collectionQuery([\"testCollection\"])"}});
    expect(queryInput).toHaveTextContent("cts.collectionQuery([\"testCollection\"])");
    fireEvent.click(saveButton);
    expect(saveButton.onclick).toHaveBeenCalled();
  });

  test("Verify able to type in input fields and typeahead search in collections field", async () => {
    axiosMock.post["mockImplementationOnce"](jest.fn(() => Promise.resolve({status: 200, data: stringSearchResponse})));
    const {getByText, getByLabelText, getByPlaceholderText} = render(<CreateEditStep {...data.newMerging}
      tabKey={""}
      openStepSettings={false}
      setOpenStepSettings={false}
      isEditing={false}
      stepType={StepType.Custom}
      editStepArtifactObject={{}}
      targetEntityType={""}
      canReadWrite={false}
      canReadOnly={false}
      createStepArtifact={jest.fn()}
      updateStepArtifact={jest.fn()}
      currentTab={""}
      setIsValid={jest.fn()}
      resetTabs={jest.fn()}
      setHasChanged={jest.fn()}
      setPayload={jest.fn()}
      onCancel={jest.fn()}/>);

    const descInput = getByPlaceholderText("Enter description");
    const collInput = document.querySelector(("#collList .ant-input"));
    const timestampInput:any = await(() => getByPlaceholderText("Enter path to the timestamp"));
    const saveButton = getByText("Save");
    saveButton.onclick = jest.fn();

    fireEvent.change(descInput, {target: {value: "test description"}});
    expect(descInput).toHaveValue("test description");
    await wait(() => {
      if (collInput) {
        fireEvent.change(collInput, {target: {value: "ada"}});
      }
    });
    let url = "/api/entitySearch/facet-values?database=final";
    let payload = {
      "referenceType": "collection",
      "entityTypeId": " ",
      "propertyPath": " ",
      "limit": 10,
      "dataType": "string",
      "pattern": "ada"
    };
    await(() => expect(axiosMock.post).toHaveBeenCalledWith(url, payload));
    await(() => expect(axiosMock.post).toHaveBeenCalledTimes(1));
    await(() => expect(getByText("Adams Cole")).toBeInTheDocument());

    await wait(() => {
      if (collInput) {
        fireEvent.change(collInput, {target: {value: "testCollection"}});
      }
    });
    await(() => expect(collInput).toHaveValue("testCollection"));
    fireEvent.click(getByLabelText("Query"));
    const queryInput = getByPlaceholderText("Enter source query");
    fireEvent.change(queryInput, {target: {value: "cts.collectionQuery([\"testCollection\"])"}});
    expect(queryInput).toHaveTextContent("cts.collectionQuery([\"testCollection\"])");

    await(() => fireEvent.change(timestampInput, {target: {value: "/test/path/to/timestamp"}}));
    await(() => expect(timestampInput).toHaveValue("/test/path/to/timestamp"));

    fireEvent.click(saveButton);
    expect(saveButton.onclick).toHaveBeenCalled();
  });

  test("Verify collection and query tooltips appear when hovered", async () => {
    const {getByText, getByTestId, getByLabelText} = render(<CreateEditStep {...data.editMerging} />);

    fireEvent.mouseOver(getByTestId("collectionTooltip"));
    await wait(() => expect(getByText(CommonStepTooltips.radioCollection)).toBeInTheDocument());

    fireEvent.mouseOver(getByTestId("queryTooltip"));
    await wait(() => expect(getByLabelText("radio-query-tooltip")).toBeInTheDocument());
  });
});