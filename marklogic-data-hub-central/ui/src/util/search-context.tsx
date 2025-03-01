import React, {useState, useEffect, useContext} from "react";
import {getUserPreferences, updateUserPreferences} from "../services/user-preferences";
import {UserContext} from "./user-context";
import {QueryOptions} from "../types/query-types";

type SearchContextInterface = {
  query: string,
  entityTypeIds: string[],
  baseEntities: any[], //list of entities
  relatedEntityTypeIds: string[],
  conceptFilterTypeIds: string[],
  nextEntityType: string, //This can change to a boolean for the All Data/All Entities toggle.
  start: number,
  pageNumber: number,
  mergeUnmerge: boolean,
  pageLength: number,
  pageSize: number,
  selectedFacets: any,
  maxRowsPerPage: number,
  selectedQuery: string,
  sidebarQuery: string,
  selectedTableProperties: any,
  view: JSX.Element | null,
  tileId: string,
  sortOrder: any,
  database: string,
  datasource: string,
  preselectedFacets: string[]
}

const defaultSearchOptions = {
  query: "",
  entityTypeIds: [],
  baseEntities: [],
  relatedEntityTypeIds: [],
  conceptFilterTypeIds: [],
  nextEntityType: "",
  start: 1,
  pageNumber: 1,
  mergeUnmerge: false,
  pageLength: 20,
  pageSize: 20,
  selectedFacets: {},
  maxRowsPerPage: 100,
  sidebarQuery: "Select a saved query",
  selectedQuery: "select a query",
  selectedTableProperties: [],
  view: null,
  tileId: "",
  sortOrder: [],
  database: "final",
  datasource: "entities",
  preselectedFacets: []
};


interface ISearchContextInterface {
  searchOptions: SearchContextInterface;
  setSearchFromUserPref: (username: string) => void;
  setQuery: (searchString: string) => void;
  setPage: (pageNumber: number, totalDocuments: number) => void;
  setPageLength: (current: number, pageSize: number) => void;
  toggleMergeUnmerge: (current: boolean) => void;
  setSearchFacets: (constraint: string, vals: string[]) => void;
  setEntity: () => void;
  setEntityTypeIds: (setEntityIds: string[]) => void;
  setNextEntity: (option: string) => void;
  setRelatedEntityTypeIds: (option: any[]) => void;
  setConceptFilterTypeIds: (option: any[]) => void;
  setAllFilterTypeIds: (entities: any[], concepts: any[]) => void;
  setEntityClearQuery: (option: string) => void;
  setLatestJobFacet: (vals: string, entityName: string, stepName: string, targetDatabase?: string, collectionVals?: string) => void;
  clearFacet: (constraint: string, val: string) => void;
  clearAllFacets: () => void;
  clearAllFacetsLS: () => void;
  clearDateFacet: () => void;
  clearRangeFacet: (range: string) => void;
  clearGreyDateFacet: () => void;
  clearGreyRangeFacet: (range: string) => void;
  resetSearchOptions: (tileIconClicked?: boolean) => void;
  setAllSearchFacets: (facets: any) => void;
  greyedOptions: SearchContextInterface;
  setAllGreyedOptions: (facets: any) => void;
  setQueryGreyedOptions: (searchString: string) => void;
  clearGreyFacet: (constraint: string, val: string) => void;
  clearConstraint: (constraint: string) => void;
  clearAllGreyFacets: () => void;
  resetGreyedOptions: () => void;
  applySaveQuery: (query: QueryOptions) => void;
  setSelectedQuery: (query: string) => void;
  setSidebarQuery: (query: string) => void;
  setSelectedTableProperties: (propertiesToDisplay: string[]) => void;
  setBaseEntitiesWithProperties: (baseEntities: string[], propertiesToDisplay: string[]) => void;
  setView: (tileId: string, viewId: JSX.Element | null) => void;
  setPageWithEntity: (option: [], pageNumber: number, start: number, facets: any, searchString: string, sortOrder: [], targetDatabase: string) => void;
  setSortOrder: (propertyName: string, sortOrder: any) => void;
  savedQueries: any;
  setSavedQueries: (queries: any) => void;
  setDatabase: (option: string) => void;
  setLatestDatabase: (option: string, jobId: string) => void;
  entityDefinitionsArray: any;
  setEntityDefinitionsArray: (entDefinitionsArray: any) => void;
  setGraphViewOptions: (entityInstanceId: string | undefined) => void;
  setDatasource: (option: string) => void;
  savedNode: any,
  setSavedNode: (node: any) => void;
  setSearchOptions: (searchOptions: SearchContextInterface) => void;
  entityInstanceId: string | undefined;
  setDatabaseAndDatasource: (option: any) => void;
}

export const SearchContext = React.createContext<ISearchContextInterface>({
  searchOptions: defaultSearchOptions,
  greyedOptions: defaultSearchOptions,
  savedQueries: [],
  setSavedQueries: () => { },
  savedNode: undefined,
  setSavedNode: () => { },
  entityInstanceId: undefined,
  entityDefinitionsArray: [],
  setEntityDefinitionsArray: () => { },
  setSearchFromUserPref: () => { },
  setQuery: () => { },
  setPage: () => { },
  toggleMergeUnmerge: () => { },
  setPageLength: () => { },
  setSearchFacets: () => { },
  setEntity: () => { },
  setEntityTypeIds: () => { },
  setNextEntity: () => { },
  setRelatedEntityTypeIds: () => { },
  setConceptFilterTypeIds: () => { },
  setAllFilterTypeIds: () => { },
  setEntityClearQuery: () => { },
  setLatestJobFacet: () => { },
  clearFacet: () => { },
  clearAllFacets: () => { },
  clearAllFacetsLS: () => { },
  clearDateFacet: () => { },
  clearRangeFacet: () => { },
  clearGreyDateFacet: () => { },
  clearGreyRangeFacet: () => { },
  resetSearchOptions: () => { },
  setAllSearchFacets: () => { },
  setAllGreyedOptions: () => { },
  setQueryGreyedOptions: () => { },
  clearGreyFacet: () => { },
  clearConstraint: () => { },
  clearAllGreyFacets: () => { },
  resetGreyedOptions: () => { },
  applySaveQuery: () => { },
  setSelectedQuery: () => { },
  setSidebarQuery: () => { },
  setSelectedTableProperties: () => { },
  setBaseEntitiesWithProperties: () => { },
  setView: () => { },
  setPageWithEntity: () => { },
  setSortOrder: () => { },
  setDatabase: () => { },
  setLatestDatabase: () => { },
  setGraphViewOptions: () => { },
  setDatasource: () => { },
  setSearchOptions: () => { },
  setDatabaseAndDatasource: () => { },
});

const SearchProvider: React.FC<{ children: any }> = ({children}) => {

  const [searchOptions, setSearchOptions] = useState<SearchContextInterface>(defaultSearchOptions);
  const [greyedOptions, setGreyedOptions] = useState<SearchContextInterface>(defaultSearchOptions);
  const [savedQueries, setSavedQueries] = useState<any>([]);
  const [savedNode, setSavedNode] = useState<any>();
  const [entityInstanceId, setEntityInstanceId] = useState(undefined);
  const [entityDefinitionsArray, setEntityDefinitionsArray] = useState<any>([]);

  const {user} = useContext(UserContext);

  const setSearchFromUserPref = (username: string) => {

    let userPreferences = getUserPreferences(username);
    if (userPreferences) {
      let values = JSON.parse(userPreferences);
      setSearchOptions({
        ...searchOptions,
        start: 1,
        pageNumber: 1,
        query: values.query.searchText,
        entityTypeIds: values.query.entityTypeIds,
        selectedFacets: values.query.selectedFacets,
        pageLength: values.pageLength,
        selectedQuery: values.selectedQuery,
        sidebarQuery: values.sidebarQuery,
        baseEntities: values.baseEntities,
        preselectedFacets: values.preselectedFacets,
      });
    }
  };

  const setQuery = (searchString: string) => {
    setSearchOptions({
      ...searchOptions,
      start: 1,
      query: searchString,
      pageNumber: 1,
      pageLength: searchOptions.pageSize
    });
  };
  const setQueryGreyedOptions = (searchString: string) => {
    setGreyedOptions({
      ...greyedOptions,
      query: searchString,
    });
  };

  const setPage = (pageNumber: number, totalDocuments: number) => {
    let pageLength = searchOptions.pageSize;
    let start = pageNumber === 1 ? 1 : (pageNumber - 1) * searchOptions.pageSize + 1;

    if ((totalDocuments - ((pageNumber - 1) * searchOptions.pageSize)) < searchOptions.pageSize) {
      pageLength = (totalDocuments - ((pageNumber - 1) * searchOptions.pageLength));
    }
    setSearchOptions({
      ...searchOptions,
      start,
      pageNumber,
      pageLength,
    });
  };


  const setPageLength = (current: number, pageSize: number) => {
    setSearchOptions({
      ...searchOptions,
      start: 1,
      pageNumber: 1,
      pageLength: pageSize,
      pageSize,
    });
  };

  const toggleMergeUnmerge = (current: boolean) => {
    setSearchOptions({
      ...searchOptions,
      mergeUnmerge: !current
    });
  };

  const setSearchFacets = (constraint: string, vals: string[]) => {
    let facets = {};
    if (vals.length > 0) {
      facets = {...searchOptions.selectedFacets, [constraint]: vals};
    } else {
      facets = {...searchOptions.selectedFacets};
      delete facets[constraint];
    }
    setSearchOptions({
      ...searchOptions,
      start: 1,
      selectedFacets: facets,
      pageNumber: 1,
      pageLength: searchOptions.pageSize
    });
  };

  const setEntity = () => {

    setSearchOptions({
      ...searchOptions,
      start: 1,
      query: "",
      pageNumber: 1,
      // selectedFacets: {},
      pageLength: searchOptions.pageSize,
      selectedQuery: "select a query",
      selectedTableProperties: [],
      sortOrder: []
    });

    setGreyedOptions({
      ...greyedOptions,
      start: 1,
      query: "",
      pageNumber: 1,
      // selectedFacets: {},
      pageLength: greyedOptions.pageSize,
      sortOrder: []
    });
  };

  const setNextEntity = (option: string) => {
    setSearchOptions({
      ...searchOptions,
      nextEntityType: option,
    });
    setGreyedOptions({
      ...greyedOptions,
      nextEntityType: option,
    });
  };

  const setRelatedEntityTypeIds = (option: any[]) => {
    setSearchOptions({
      ...searchOptions,
      relatedEntityTypeIds: option
    });
  };

  const setConceptFilterTypeIds = (option: any[]) => {
    setSearchOptions({
      ...searchOptions,
      conceptFilterTypeIds: option
    });
  };

  const setAllFilterTypeIds = (entities: any[], concepts: any[]) => {
    setSearchOptions({
      ...searchOptions,
      relatedEntityTypeIds: entities,
      conceptFilterTypeIds: concepts
    });
  };

  const setEntityClearQuery = (option: string) => {
    setSearchOptions({
      ...searchOptions,
      selectedFacets: {},
      start: 1,
      entityTypeIds: [option],
      nextEntityType: option,
      selectedTableProperties: [],
      pageNumber: 1,
      pageLength: searchOptions.pageSize,
    });
  };

  //The "targetDatabase" parameter is temporary optional. Passing the database from the model view needs to be handleled in the separate story DHFPROD-6152.
  const setLatestJobFacet = (vals: string, entityName: string, stepName: string, targetDatabase?: string, collectionValues?: string) => {
    let facets = {};
    facets = {
      createdByJob: {
        dataType: "string",
        stringValues: [vals]
      },
      ranByStep: {
        dataType: "string",
        stringValues: [stepName]
      },
    };

    if (collectionValues) {
      facets["Collection"] = {dataType: "string", stringValues: [collectionValues]};
    }
    const NEWOPTIONS = {
      ...searchOptions,
      start: 1,
      selectedFacets: facets,
      entityTypeIds: entityName === "All Entities" ? entityDefinitionsArray.map(entity => entity.name) : [entityName],
      nextEntityType: entityName ? "All Entities" : "All Data",
      datasource: entityName ? "entities" : "all-data",
      selectedTableProperties: [],
      pageNumber: 1,
      pageLength: searchOptions.pageSize,
      database: targetDatabase ? targetDatabase : "final",
      stepName: stepName,
    };
    setSearchOptions(NEWOPTIONS);
  };

  const setLatestDatabase = (targetDatabase: string, jobId: string) => {
    let facets = {};
    facets = {createdByJob: {dataType: "string", stringValues: [jobId]}};
    const NEWOPTIONS = {
      ...searchOptions,
      start: 1,
      selectedFacets: facets,
      entityTypeIds: [],
      nextEntityType: "All Data",
      datasource: "all-data",
      pageNumber: 1,
      selectedTableProperties: [],
      database: targetDatabase
    };
    setSearchOptions(NEWOPTIONS);
  };

  const clearFacet = (constraint: string, val: string) => {
    let facets = {...searchOptions.selectedFacets};
    if (facets && facets[constraint]) {
      let valueKey = "";
      if (facets[constraint].dataType === "xs:string" || facets[constraint].dataType === "string") {
        valueKey = "stringValues";
      }
      if (facets[constraint][valueKey].length > 1) {
        facets[constraint][valueKey] = facets[constraint][valueKey].filter(option => option !== val);
      } else {
        delete facets[constraint];
      }
      setSearchOptions({...searchOptions, selectedFacets: facets});
      if (Object.entries(greyedOptions.selectedFacets).length > 0 && greyedOptions.selectedFacets.hasOwnProperty(constraint)) { clearGreyFacet(constraint, val); }
    }
  };


  const clearAllFacets = () => {
    setSearchOptions({
      ...searchOptions,
      query: "",
      selectedFacets: {},
      start: 1,
      pageNumber: 1,
      pageLength: searchOptions.pageSize
    });
    // searchOptions.selectedFacets = {};
    clearAllGreyFacets();
    clearAllFacetsLS();
  };

  const clearAllFacetsLS = () => {
    const defaultPreferences = getUserPreferences(user.name);
    if (defaultPreferences !== null) {
      let oldOptions = JSON.parse(defaultPreferences);
      let newOptions = {
        ...oldOptions, preselectedFacets: undefined
      };
      updateUserPreferences(user.name, newOptions);
    }
  };

  /*
    const setDateFacet = (dates) => {
     setSearchOptions({
        ...searchOptions,
        start: 1,
        pageNumber: 1,
        pageLength: searchOptions.pageSize,
        selectedFacets: {
          ...searchOptions.selectedFacets,
          createdOnRange: dates
        }
      });
    }
  */

  const clearDateFacet = () => {
    let facets = {...searchOptions.selectedFacets};
    if (facets.hasOwnProperty("createdOnRange")) {
      delete facets.createdOnRange;
      setSearchOptions({
        ...searchOptions,
        selectedFacets: facets,
        start: 1,
        pageNumber: 1,
        pageLength: searchOptions.pageSize
      });
    }
  };

  const clearRangeFacet = (range: string) => {
    let facets = {...searchOptions.selectedFacets};
    let constraints = Object.keys(facets);
    constraints.forEach(facet => {
      if (facets[facet].hasOwnProperty("rangeValues") && facet === range) {
        delete facets[facet];
      }
    });

    setSearchOptions({
      ...searchOptions,
      selectedFacets: facets,
      start: 1,
      pageNumber: 1,
      pageLength: searchOptions.pageSize
    });
    if (Object.entries(greyedOptions.selectedFacets).length > 0) { clearGreyRangeFacet(range); }
  };


  const resetSearchOptions = (tileIconClicked = false) => {
    if (tileIconClicked) { setSearchOptions({...defaultSearchOptions, tileId: "explore", view: searchOptions.view, nextEntityType: "All Entities"}); } else { setSearchOptions({...defaultSearchOptions}); }
  };


  const setAllSearchFacets = (facets: any) => {
    setSearchOptions({
      ...searchOptions,
      selectedFacets: facets,
      start: 1,
      pageNumber: 1,
      pageLength: searchOptions.pageSize
    });
  };

  const clearGreyDateFacetLS = () => {
    let userPreferences = getUserPreferences(user.name);
    if (userPreferences) {
      let oldOptions = JSON.parse(userPreferences);
      let newOptions = {
        ...oldOptions, preselectedFacets: {... oldOptions.preselectedFacets, createdOnRange: undefined}
      };
      updateUserPreferences(user.name, newOptions);
    }
  };

  const clearGreyDateFacet = () => {
    let facets = {...greyedOptions.selectedFacets};
    if (facets.hasOwnProperty("createdOnRange")) {
      delete facets.createdOnRange;
      setGreyedOptions({
        ...greyedOptions,
        selectedFacets: facets,
        start: 1,
        pageNumber: 1,
        pageLength: greyedOptions.pageSize
      });
      clearGreyDateFacetLS();
    }
  };

  const clearGreyRangeFacet = (range: string) => {
    let facets = {...greyedOptions.selectedFacets};
    let constraints = Object.keys(facets);
    constraints.forEach(facet => {
      if (facets[facet].hasOwnProperty("rangeValues") && facet === range) {
        delete facets[facet];
      }
    });

    setGreyedOptions({
      ...greyedOptions,
      selectedFacets: facets,
      start: 1,
      pageNumber: 1,
      pageLength: greyedOptions.pageSize
    });
  };

  const clearConstraint = (constraint: string) => {
    let selectedFacet = {...searchOptions.selectedFacets};
    let greyFacets = {...greyedOptions.selectedFacets};
    if (Object.entries(greyedOptions.selectedFacets).length > 0 && greyedOptions.selectedFacets.hasOwnProperty(constraint)) {
      delete greyFacets[constraint];
      setGreyedOptions({...greyedOptions, selectedFacets: greyFacets});
    }
    if (Object.entries(searchOptions.selectedFacets).length > 0 && searchOptions.selectedFacets.hasOwnProperty(constraint)) {
      delete selectedFacet[constraint];
      setSearchOptions({...searchOptions, selectedFacets: selectedFacet});
    }
  };


  const clearGreyFacet = (constraint: string, val: string) => {
    let facets = {...greyedOptions.selectedFacets};
    let valueKey = "";
    if (facets[constraint].dataType === "xs:string" || facets[constraint].dataType === "string") {
      valueKey = "stringValues";
    }
    if (facets[constraint][valueKey].length > 1) {
      facets[constraint][valueKey] = facets[constraint][valueKey].filter(option => option !== val);
    } else {
      delete facets[constraint];
    }
    setGreyedOptions({...greyedOptions, selectedFacets: facets});
    clearGreyFacetLS(constraint, val, valueKey);
  };


  const clearGreyFacetLS = (constraint: string, val: string, valueKey: string) => {
    const defaultPreferences = getUserPreferences(user.name);

    if (defaultPreferences !== null) {
      let oldOptions = JSON.parse(defaultPreferences);
      let greyFacetsLS = oldOptions?.preselectedFacets;

      if (greyFacetsLS[constraint][valueKey]?.length > 1) {
        greyFacetsLS[constraint][valueKey] = greyFacetsLS[constraint][valueKey]?.filter(option => option !== val);
      } else {
        delete greyFacetsLS[constraint];
      }

      let newOptions = {
        ...oldOptions, preselectedFacets: greyFacetsLS
      };
      updateUserPreferences(user.name, newOptions);
    }
  };

  const clearAllGreyFacets = () => {
    setGreyedOptions({
      ...greyedOptions,
      query: "",
      selectedFacets: {},
      start: 1,
      pageNumber: 1,
      pageLength: greyedOptions.pageSize
    });
  };



  const resetGreyedOptions = () => {
    setGreyedOptions({...defaultSearchOptions});
  };

  const setAllGreyedOptions = (facets: any) => {
    setGreyedOptions({
      ...greyedOptions,
      selectedFacets: facets,
      start: 1,
      pageNumber: 1,
      pageLength: greyedOptions.pageSize
    });
  };



  const applySaveQuery = (query: QueryOptions) => {
    setSearchOptions({
      ...searchOptions,
      start: 1,
      selectedFacets: query.selectedFacets,
      query: query.searchText,
      entityTypeIds: query.entityTypeIds,
      nextEntityType: "All Entities",
      pageNumber: 1,
      pageLength: searchOptions.pageSize,
      selectedQuery: query.selectedQuery,
      selectedTableProperties: query.propertiesToDisplay,
      sortOrder: query.sortOrder,
      database: query.database,
    });
  };

  const setBaseEntitiesWithProperties = (entityTypeIds: string[], propertiesToDisplay: string[]) => {
    setSearchOptions({
      ...searchOptions,
      entityTypeIds: entityTypeIds,
      selectedTableProperties: propertiesToDisplay,
      pageLength: 20,
      start: 1,
      pageNumber: 1
    });
  };

  const setSelectedTableProperties = (propertiesToDisplay: string[]) => {
    setSearchOptions({
      ...searchOptions,
      selectedTableProperties: propertiesToDisplay
    });
  };

  const setSelectedQuery = (query: string) => {
    setSearchOptions({
      ...searchOptions,
      start: 1,
      pageNumber: 1,
      pageLength: searchOptions.pageSize,
      selectedQuery: query
    });
  };

  const setSidebarQuery = (query: string) => {
    setSearchOptions({
      ...searchOptions,
      sidebarQuery: query
    });
  };


  const setView = (tileId: string, viewId: JSX.Element | null) => {
    setSearchOptions({
      ...searchOptions,
      view: viewId,
      tileId: tileId,

    });
  };

  const setPageWithEntity = (option: [], pageNumber: number, start: number, facets: any, searchString: string, sortOrder: [], targetDatabase: string) => {
    setSearchOptions({
      ...searchOptions,
      entityTypeIds: option,
      selectedFacets: facets,
      query: searchString,
      start: start,
      pageNumber: pageNumber,
      sortOrder: sortOrder,
      database: targetDatabase,
    });
  };

  const setSortOrder = (propertyName: string, sortOrder: any) => {
    let sortingOrder: any = [];
    switch (sortOrder) {
    case "ascend":
      sortingOrder = [{
        propertyName: propertyName,
        sortDirection: "ascending"
      }];
      break;
    case "descend":
      sortingOrder = [{
        propertyName: propertyName,
        sortDirection: "descending"
      }];
      break;
    default:
      sortingOrder = [];
      break;
    }
    setSearchOptions({
      ...searchOptions,
      sortOrder: sortingOrder
    });
  };

  const setDatabase = (option: string) => {
    setSearchOptions({
      ...searchOptions,
      start: 1,
      query: "",
      pageNumber: 1,
      pageLength: 20,
      pageSize: 20,
      selectedFacets: {},
      selectedQuery: "select a query",
      database: option
    });
  };

  const setGraphViewOptions = (entityInstanceId) => {
    setEntityInstanceId(entityInstanceId);
  };

  const setDatasource = (datasource: string) => {
    let nextEntityType = "All Data";
    if (datasource === "entities") {
      nextEntityType = "All Entities";
    }
    setSearchOptions({
      ...searchOptions,
      datasource,
      nextEntityType
    });
  };

  const setDatabaseAndDatasource = (option: any) => {
    let {database, datasource} = option;

    let nextEntityType = "All Data";
    if (datasource === "entities") {
      nextEntityType = "All Entities";
    }
    setSearchOptions({
      ...searchOptions,
      start: 1,
      query: "",
      pageNumber: 1,
      pageLength: 20,
      pageSize: 20,
      selectedFacets: {},
      selectedQuery: "select a query",
      database,
      datasource,
      nextEntityType
    });
  };

  const setEntityTypeIds = (entityTypeIds: string[]) => {
    const NEWOPTIONS = {
      ...searchOptions,
      entityTypeIds: entityTypeIds,
    };
    setSearchOptions(NEWOPTIONS);
  };

  useEffect(() => {
    if (user.authenticated) {
      setSearchFromUserPref(user.name);
    }
  }, [user.authenticated]);

  return (
    <SearchContext.Provider value={{
      searchOptions,
      greyedOptions,
      savedQueries,
      setSavedQueries,
      savedNode,
      setSavedNode,
      entityInstanceId,
      entityDefinitionsArray,
      setEntityDefinitionsArray,
      setSearchFromUserPref,
      setQuery,
      setPage,
      setPageLength,
      toggleMergeUnmerge,
      setSearchFacets,
      setEntity,
      setNextEntity,
      setRelatedEntityTypeIds,
      setConceptFilterTypeIds,
      setAllFilterTypeIds,
      setEntityClearQuery,
      clearFacet,
      clearAllFacets,
      clearAllFacetsLS,
      setLatestJobFacet,
      clearDateFacet,
      clearRangeFacet,
      clearGreyDateFacet,
      clearGreyRangeFacet,
      resetSearchOptions,
      setAllSearchFacets,
      setAllGreyedOptions,
      setQueryGreyedOptions,
      clearGreyFacet,
      clearConstraint,
      clearAllGreyFacets,
      resetGreyedOptions,
      applySaveQuery,
      setSelectedQuery,
      setSidebarQuery,
      setSelectedTableProperties,
      setBaseEntitiesWithProperties,
      setView,
      setPageWithEntity,
      setSortOrder,
      setDatabase,
      setLatestDatabase,
      setGraphViewOptions,
      setDatasource,
      setEntityTypeIds,
      setSearchOptions,
      setDatabaseAndDatasource
    }}>
      {children}
    </SearchContext.Provider>
  );
};

export default SearchProvider;
