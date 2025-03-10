import React from "react";
import {render, fireEvent, waitForElement} from "@testing-library/react";
import SearchResult from "./search-result";
import {BrowserRouter as Router} from "react-router-dom";
import {entityFromJSON, entityParser} from "../../util/data-conversion";
import {modelResponse} from "../../assets/mock-data/explore/model-response";
import searchPayloadResults from "../../assets/mock-data/explore/search-payload-results";
import {SearchContext} from "../../util/search-context";
import {AuthoritiesService, AuthoritiesContext} from "../../util/authorities";
import {searchContextInterfaceByDefault, defaultSearchOptions} from "@util/uiTestCommonInterface";

describe("Search Result view component", () => {
  const parsedModelData = entityFromJSON(modelResponse);
  const entityDefArray = entityParser(parsedModelData);

  test("Source and instance tooltips render", async () => {
    const authorityService = new AuthoritiesService();
    authorityService.setAuthorities(["readMerging", "readMatching"]);
    const {getByText, getByTestId} = render(
      <Router>
        <AuthoritiesContext.Provider value={authorityService}>
          <SearchResult
            entityDefArray={entityDefArray}
            item={searchPayloadResults[0]}
            tableView={false}
            handleViewChange={""}
          />
        </AuthoritiesContext.Provider>
      </Router>
    );
    expect(getByTestId("source-icon")).toBeInTheDocument();
    expect(getByTestId("instance-icon")).toBeInTheDocument();
    expect(getByTestId("entity-name")).toBeInTheDocument();
    expect(getByTestId("unmerge-icon")).toBeInTheDocument();
    expect(getByTestId("primary-key")).toBeInTheDocument();
    expect(getByTestId("created-on")).toBeInTheDocument();
    expect(getByTestId("record-type")).toBeInTheDocument();
    expect(getByTestId("sources")).toBeInTheDocument();

    fireEvent.mouseOver(getByTestId("source-icon"));
    await (waitForElement(() => (getByText("Show the complete JSON"))));

    fireEvent.mouseOver(getByTestId("instance-icon"));
    await (waitForElement(() => (getByText("Show the processed data"))));

    fireEvent.mouseOver(getByTestId("graph-icon"));
    await (waitForElement(() => (getByText("View entity in graph view"))));

    fireEvent.mouseOver(getByTestId("unmerge-icon"));
    await (waitForElement(() => (getByText("Unmerge Documents"))));
  });

  test("Verify expandable icon closes if page number changes", async () => {
    const {rerender, getByTestId, getByLabelText} = render(
      <SearchContext.Provider value={{...searchContextInterfaceByDefault}
      }>
        <Router>
          <SearchResult
            entityDefArray={entityDefArray}
            item={searchPayloadResults[0]}
            tableView={false}
            handleViewChange={""}
          />
        </Router>
      </SearchContext.Provider>
    );
    expect(getByTestId("expandable-icon")).toBeInTheDocument();
    expect(getByLabelText("icon: chevron-right")).toBeInTheDocument();
    fireEvent.click(getByLabelText("icon: chevron-right"));
    expect(getByLabelText("icon: chevron-down")).toBeInTheDocument();

    rerender(
      <SearchContext.Provider value={{...searchContextInterfaceByDefault, searchOptions: {...defaultSearchOptions, pageNumber: 2}}}>
        <Router>
          <SearchResult
            entityDefArray={entityDefArray}
            item={searchPayloadResults[0]}
            tableView={false}
            handleViewChange={""}

          />
        </Router>
      </SearchContext.Provider>
    );

    expect(getByLabelText("icon: chevron-right")).toBeInTheDocument();
  });
});
