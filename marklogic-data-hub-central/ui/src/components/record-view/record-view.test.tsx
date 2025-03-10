import React from "react";
import {render, fireEvent, waitForElement, waitForElementToBeRemoved} from "@testing-library/react";
import {entitySearch} from "../../assets/mock-data/explore/entity-search";
import {BrowserRouter as Router} from "react-router-dom";
import RecordCardView from "./record-view";
import axiosMock from "axios";
import {MemoryRouter} from "react-router-dom";
import {SearchContext} from "../../util/search-context";
import testData from "../../assets/mock-data/explore/Non-entity-document-payload";
import {AuthoritiesService, AuthoritiesContext} from "../../util/authorities";
import {searchContextInterfaceByDefault} from "@util/uiTestCommonInterface";

jest.mock("axios");

describe("Raw data card view component", () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("Raw data card with data renders", async () => {
    const {getByTestId, getByText, getAllByText} = render(
      <Router>
        <RecordCardView
          data={entitySearch.results}
        />
      </Router>
    );
    // Check raw data cards are rendered
    expect(getByTestId("/Customer/Cust1.json-URI")).toBeInTheDocument();
    expect(getByTestId("/Customer/Cust1.json-InfoIcon")).toBeInTheDocument();
    expect(getByTestId("/Customer/Cust1.json-sourceFormat")).toBeInTheDocument();
    expect(getByTestId("/Customer/Cust1.json-detailViewIcon")).toBeInTheDocument();

    expect(getByTestId("/Customer/Cust2.json-URI")).toBeInTheDocument();
    expect(getByTestId("/Customer/Cust2.json-InfoIcon")).toBeInTheDocument();
    expect(getByTestId("/Customer/Cust2.json-sourceFormat")).toBeInTheDocument();
    expect(getByTestId("/Customer/Cust2.json-detailViewIcon")).toBeInTheDocument();

    expect(getByTestId("/Customer/Cust3.json-URI")).toBeInTheDocument();
    expect(getByTestId("/Customer/Cust3.json-InfoIcon")).toBeInTheDocument();
    expect(getByTestId("/Customer/Cust3.json-sourceFormat")).toBeInTheDocument();
    expect(getByTestId("/Customer/Cust3.json-detailViewIcon")).toBeInTheDocument();

    //verify tooltips
    fireEvent.mouseOver(getByTestId("/Customer/Cust1.json-URI"));
    await waitForElement(() => getByText("/Customer/Cust1.json"));

    fireEvent.mouseOver(getByTestId("/Customer/Cust1.json-InfoIcon"));
    await waitForElement(() => getByText("View info"));

    fireEvent.mouseOver(getByTestId("/Customer/Cust1.json-detailViewIcon"));
    await waitForElement(() => getByText("View details"));

    //verify snippet content for json/xml/text docs
    expect(getByTestId("/Customer/Cust1.json-snippet").textContent).toContain(entitySearch.results[0].matches[0]["match-text"][0]);
    expect(getByTestId("/Customer.xml-snippet").textContent).toContain(entitySearch.results[6].matches[0]["match-text"][0]);
    expect(getByTestId("/Customer.txt-snippet").textContent).toContain(entitySearch.results[7].matches[0]["match-text"][0]);

    //verify snippet content for binary doc
    expect(getByTestId("/Customer/Customer.pdf-noPreview").textContent).toContain("No preview available");

    //verify popover metadata info
    fireEvent.click(getByTestId("/Customer/Cust1.json-InfoIcon"));
    expect(getByTestId("/Customer/Cust1.json-sources")).toBeInTheDocument();
    expect(getByText("loadPersonJSON")).toBeInTheDocument();
    expect(getByText("personJSON")).toBeInTheDocument();
    expect(getByText("mapPersonJSON")).toBeInTheDocument();
    expect(getByText("2020-October-09")).toBeInTheDocument();
    //verify popover metadata info for missing properties
    fireEvent.click(getByTestId("/Customer/Cust2.json-InfoIcon"));
    expect(getAllByText("none")).toHaveLength(4);
  });

  test("Verify file download and merge on Raw data card ", async () => {
    const authorityService = new AuthoritiesService();
    authorityService.setAuthorities(["readMerging", "readMatching"]);
    axiosMock.get["mockImplementationOnce"](jest.fn(() => Promise.resolve(testData.allDataRecordDownloadResponse)));

    const {getByLabelText, getByTestId, getByText} = render(<MemoryRouter>
      <AuthoritiesContext.Provider value={authorityService}>
        <SearchContext.Provider value={{...searchContextInterfaceByDefault}}>
          <RecordCardView
            entityDefArray={[{name: "Customer", properties: []}]}
            data={entitySearch.results}
          />
        </SearchContext.Provider>
      </AuthoritiesContext.Provider></MemoryRouter>);

    //verify merge icon tooltip
    fireEvent.mouseOver(getByTestId("merge-icon"));
    await (waitForElement(() => (getByText("Merge Documents"))));

    //verify download icon
    expect(getByTestId("/Customer/Cust1.json-download-icon")).toBeInTheDocument();
    //verify download icon tooltip
    fireEvent.mouseOver(getByTestId("/Customer/Cust1.json-download-icon"));
    await waitForElement(() => getByText("Download (815 B)"));
    //click on download icon and verify api call.
    fireEvent.click(getByTestId("/Customer/Cust1.json-download-icon"));
    expect(axiosMock).toHaveBeenCalledWith({"method": "GET", "responseType": "blob", "url": "/api/record/download?docUri=%2FCustomer%2FCust1.json&database=final"});

    jest.clearAllMocks();
    axiosMock.get["mockImplementation"](jest.fn(() => Promise.resolve({tatus: 200, data: {data: {envelope: {instance: {}}}, value: {envelope: {instance: {}}}}})));
    axiosMock.put["mockImplementation"](jest.fn(() => Promise.resolve({status: 200})));
    axiosMock.delete["mockImplementation"](jest.fn(() => {
      return Promise.resolve({status: 204});
    }));
    //click on merge icon and verify api call.
    fireEvent.click(getByTestId("merge-icon"));
    await waitForElement(() => getByLabelText("confirm-merge-unmerge"));
    fireEvent.click(getByLabelText("confirm-merge-unmerge"));
    await waitForElement(() => getByLabelText("Yes"));
    fireEvent.click(getByLabelText("Yes"));
    await waitForElementToBeRemoved(() => getByLabelText("Yes"));
    expect(axiosMock.delete).toHaveBeenCalledWith("/api/steps/merging/notifications?uri=%2Fcom.marklogic.smart-mastering%2Fmatcher%2Fnotifications%2F613ba6185e0d3a08d6dbfdb01edbe8d3.xml");
  });
});
