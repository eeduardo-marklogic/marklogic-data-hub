import React from "react";
import axios from "axios";
import {render, wait} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EntityTypeModal from "./entity-type-modal";
import {ModelingTooltips} from "../../../config/tooltips.config";
import {
  createModelErrorResponse,
  createModelErrorResponseNamespace,
  createModelErrorResponsePrefix,
  createModelResponse
} from "../../../assets/mock-data/modeling/modeling";
import {defaultHubCentralConfig} from "../../../config/modeling.config";

jest.mock("axios");
const axiosMock = axios as jest.Mocked<typeof axios>;

const placeholders = {
  name: "Enter name",
  description: "Enter description",
  namespace: "Example: http://example.org/es/gs",
  namespacePrefix: "Example: esgs",
  version: "0.0.1"
};

const defaultModalOptions = {
  isVisible: true,
  toggleModal: jest.fn(),
  updateEntityTypesAndHideModal: jest.fn(),
  isEditModal: false,
  name: "",
  version: "",
  description: "",
  namespace: "",
  prefix: "",
  updateHubCentralConfig: jest.fn(),
  hubCentralConfig: defaultHubCentralConfig,
  dataModel: [
    {entityName: "Client"},
    {conceptName: "ClothStyle"}
  ]
};

let hubCentralConfig = defaultHubCentralConfig;

describe("EntityTypeModal Component", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("Modal is not visible", () => {
    const {queryByText} = render(
      <EntityTypeModal {...defaultModalOptions} isVisible={false} color="" icon=""/>
    );
    expect(queryByText("Add Entity Type")).toBeNull();
  });

  test("Valid Entity name is used", async () => {
    axiosMock.post["mockImplementationOnce"](jest.fn(() => Promise.resolve({status: 201, data: createModelResponse})));

    const {getByText, getByPlaceholderText, getByTestId, getByTitle} = render(
      <EntityTypeModal {...defaultModalOptions} color="" icon=""/>
    );

    let url = "/api/models";
    let payload = {"name": "AnotherModel", "description": "Testing", "namespace": "", "namespacePrefix": "", "version": "3.0.1"};

    expect(getByText("Add Entity Type")).toBeInTheDocument();
    userEvent.type(getByPlaceholderText(placeholders.name), payload.name);
    userEvent.type(getByPlaceholderText(placeholders.description), payload.description);
    userEvent.type(getByPlaceholderText(placeholders.version), payload.version);

    //modify the entity color via color picker and verify it is sent in hub central config payload
    userEvent.click(getByTestId(`${payload.name}-color-button`));
    userEvent.click(getByTitle("#CEE0ED"));

    await wait(() => {
      expect(getByTestId("AnotherModel-color")).toHaveStyle("background: #CEE0ED");
    });

    await wait(() => {
      userEvent.click(getByText("Add"));
    });
    expect(axiosMock.post).toHaveBeenCalledWith(url, payload);
    expect(axiosMock.post).toHaveBeenCalledTimes(1);

    //Verify the hubCentral payload
    hubCentralConfig.modeling.entities["AnotherModel"] = {color: "#cee0ed"};

    expect(defaultModalOptions.updateHubCentralConfig).toHaveBeenCalledWith(hubCentralConfig);
    expect(defaultModalOptions.updateHubCentralConfig).toHaveBeenCalledTimes(1);
  });

  test("Adding a new Entity with an existing name should show an error message", async () => {
    const {getByText, getByPlaceholderText, getByLabelText} = render(
      <EntityTypeModal {...defaultModalOptions} color="" icon=""/>
    );
    expect(getByText(/Add Entity Type/i)).toBeInTheDocument();

    userEvent.type(getByPlaceholderText(placeholders.name), "Client");
    userEvent.type(getByPlaceholderText(placeholders.description), "Product entity description");

    await wait(() => {
      userEvent.click(getByText("Add"));
    });

    await wait(() => { expect(getByLabelText("entity-name-error")).toBeInTheDocument(); });
  });

  test("Adding an invalid Entity name shows error message", async () => {
    const {getByText, getByPlaceholderText} = render(
      <EntityTypeModal {...defaultModalOptions} color="" icon=""/>
    );
    expect(getByText(/Add Entity Type/i)).toBeInTheDocument();

    userEvent.type(getByPlaceholderText(placeholders.name), "123-Box");
    userEvent.type(getByPlaceholderText(placeholders.description), "Product entity description");

    await wait(() => {
      userEvent.click(getByText("Add"));
    });

    expect(getByText(ModelingTooltips.nameRegex)).toBeInTheDocument();
  });

  test("Creating duplicate entity shows error message", async () => {
    axiosMock.post["mockImplementationOnce"](jest.fn(() =>
      Promise.reject({response: {status: 400, data: createModelErrorResponse}})));

    const {getByText, getByPlaceholderText, getByLabelText} = render(
      <EntityTypeModal {...defaultModalOptions} color="" icon=""/>
    );
    expect(getByText("Add Entity Type")).toBeInTheDocument();

    let url = "/api/models";
    let payload = {"name": "Testing", "description": "", "namespace": "", "namespacePrefix": "", "version": ""};

    userEvent.type(getByPlaceholderText(placeholders.name), payload.name);
    userEvent.type(getByPlaceholderText(placeholders.description), payload.description);

    await wait(() => {
      userEvent.click(getByText("Add"));
    });
    expect(axiosMock.post).toHaveBeenCalledWith(url, payload);
    expect(axiosMock.post).toHaveBeenCalledTimes(1);

    await wait(() => { expect(getByLabelText("entity-name-error")).toBeInTheDocument(); });
  });

  test("Edit modal is not visible", () => {
    const {queryByText} = render(
      <EntityTypeModal {...defaultModalOptions} isVisible={false} isEditModal={true} color="" icon=""/>
    );
    expect(queryByText("Edit Entity Type")).toBeNull();
  });

  test("Edit modal is visible", async () => {
    const {getByText, getByDisplayValue, queryByText, getByTestId, getByLabelText, getByPlaceholderText} = render(
      <EntityTypeModal {...defaultModalOptions} isEditModal={true}
        name={"ModelName"} description={"Model description"} color="#CEE0ED" icon="FaUserAlt" version="3.0.1"/>
    );

    expect(getByText("Edit Entity Type")).toBeInTheDocument();
    expect(queryByText("*")).toBeNull();
    expect(getByText("ModelName")).toBeInTheDocument();
    expect(getByDisplayValue("Model description")).toBeInTheDocument();
    expect(getByPlaceholderText(placeholders.version)).toHaveValue("3.0.1");

    //proper color and icon is displayed
    expect(getByTestId("ModelName-color")).toHaveStyle("background: #CEE0ED");

    expect(getByLabelText("ModelName-FaUserAlt-icon")).toBeInTheDocument();
  });

  test("Entity description, namespace, version, prefix, color and icon selection are updated", async () => {
    axiosMock.put["mockImplementationOnce"](jest.fn(() => Promise.resolve({status: 200})));

    const {getByText, getByPlaceholderText, getByTestId, getByTitle} = render(
      <EntityTypeModal {...defaultModalOptions} isEditModal={true}
        name={"ModelName"} description={"Model description"} color="#CEE0ED" icon=""/>
    );

    let url = "/api/models/ModelName/info";
    let payload = {"description": "Updated Description", "namespace": "http://example.org/updated", "namespacePrefix": "updated", "version": "3.0.1"};

    userEvent.clear(getByPlaceholderText(placeholders.description));
    userEvent.type(getByPlaceholderText(placeholders.description), payload.description);
    userEvent.type(getByPlaceholderText(placeholders.namespace), payload.namespace);
    userEvent.type(getByPlaceholderText(placeholders.namespacePrefix), payload.namespacePrefix);
    userEvent.type(getByPlaceholderText(placeholders.version), payload.version);
    //edit the entity color via color picker and verify it is sent in payload
    userEvent.click(getByTestId("ModelName-color-button"));
    userEvent.click(getByTitle("#F8F8DE"));

    await wait(() => {
      expect(getByTestId("ModelName-color")).toHaveStyle("background: #F8F8DE");
    });

    await wait(() => {
      userEvent.click(getByText("OK"));
    });
    expect(axiosMock.put).toHaveBeenCalledWith(url, payload);
    expect(axiosMock.put).toHaveBeenCalledTimes(1);

    //Verify the hubCentral payload
    hubCentralConfig.modeling.entities["ModelName"] = {color: "#f8f8de"};

    expect(defaultModalOptions.updateHubCentralConfig).toHaveBeenCalledWith(hubCentralConfig);
    expect(defaultModalOptions.updateHubCentralConfig).toHaveBeenCalledTimes(1);
  });

  test("Submitting invalid namespace shows error message", async () => {
    axiosMock.post["mockImplementationOnce"](jest.fn(() =>
      Promise.reject({response: {status: 400, data: createModelErrorResponseNamespace}})));

    const {getByText, getByPlaceholderText} = render(
      <EntityTypeModal {...defaultModalOptions} color="" icon=""/>
    );
    expect(getByText("Add Entity Type")).toBeInTheDocument();

    let url = "/api/models";
    let payload = {"name": "Testing", "description": "", "namespace": "badURI", "namespacePrefix": "test", "version": ""};

    userEvent.type(getByPlaceholderText(placeholders.name), payload.name);
    userEvent.type(getByPlaceholderText(placeholders.description), payload.description);
    userEvent.type(getByPlaceholderText(placeholders.namespace), payload.namespace);
    userEvent.type(getByPlaceholderText(placeholders.namespacePrefix), payload.namespacePrefix);

    await wait(() => {
      userEvent.click(getByText("Add"));
    });
    expect(axiosMock.post).toHaveBeenCalledWith(url, payload);
    expect(axiosMock.post).toHaveBeenCalledTimes(1);

    expect(getByText(createModelErrorResponseNamespace.message)).toBeInTheDocument();
  });

  test("Submitting invalid namespace prefix shows error message", async () => {
    axiosMock.post["mockImplementationOnce"](jest.fn(() =>
      Promise.reject({response: {status: 400, data: createModelErrorResponsePrefix}})));

    const {getByText, getByPlaceholderText} = render(
      <EntityTypeModal {...defaultModalOptions} color="" icon=""/>
    );
    expect(getByText("Add Entity Type")).toBeInTheDocument();

    let url = "/api/models";
    let payload = {"name": "Testing", "description": "", "namespace": "http://example.org/test", "namespacePrefix": "xml", "version": ""};


    userEvent.type(getByPlaceholderText(placeholders.name), payload.name);
    userEvent.type(getByPlaceholderText(placeholders.description), payload.description);
    userEvent.type(getByPlaceholderText(placeholders.namespace), payload.namespace);
    userEvent.type(getByPlaceholderText(placeholders.namespacePrefix), payload.namespacePrefix);

    await wait(() => {
      userEvent.click(getByText("Add"));
    });
    expect(axiosMock.post).toHaveBeenCalledWith(url, payload);
    expect(axiosMock.post).toHaveBeenCalledTimes(1);

    expect(getByText(createModelErrorResponsePrefix.message)).toBeInTheDocument();
  });

});

