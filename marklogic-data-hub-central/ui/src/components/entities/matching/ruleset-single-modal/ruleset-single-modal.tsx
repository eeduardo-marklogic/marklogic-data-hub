import React, {useState, useEffect, useContext} from "react";
import {Row, Col, Modal, Form, FormLabel, FormCheck} from "react-bootstrap";
import Select, {components as SelectComponents, components, /*OptionProps*/} from "react-select";
import reactSelectThemeConfig from "@config/react-select-theme.config";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faLayerGroup, faTrashAlt} from "@fortawesome/free-solid-svg-icons";
import styles from "./ruleset-single-modal.module.scss";
import "./ruleset-single-modal.scss";
import arrayIcon from "../../../../assets/icon_array.png";
import EntityPropertyTreeSelect from "../../../entity-property-tree-select/entity-property-tree-select";
import {CurationContext} from "@util/curation-context";
import {MatchingStep, MatchRule, MatchRuleset} from "../../../../types/curation-types";
import {Definition} from "../../../../types/modeling-types";
import {MatchingStepTooltips} from "@config/tooltips.config";
import {updateMatchingArtifact} from "@api/matching";
import DeleteModal from "../delete-modal/delete-modal";
import {QuestionCircleFill} from "react-bootstrap-icons";
import {ConfirmYesNo, HCInput, HCButton, HCTooltip, HCModal} from "@components/common";
import {themeColors} from "@config/themes.config";
import {faCopy, faPencilAlt} from "@fortawesome/free-solid-svg-icons";
import ListModal from "../list-modal/list-modal";

type Props = {
  editRuleset: any;
  isVisible: boolean;
  toggleModal: (isVisible: boolean) => void;

};

const DEFAULT_ENTITY_DEFINITION: Definition = {
  name: "",
  properties: []
};

const MATCH_TYPE_OPTIONS = [
  {name: "Exact", value: "exact"},
  {name: "Synonym", value: "synonym"},
  {name: "Double Metaphone", value: "doubleMetaphone"},
  {name: "Zip", value: "zip"},
  {name: "Custom", value: "custom"},
];

const presetListMock=[
  {value: "Preset List 0", label: "Preset List 0", valuesToIgnore: []},
  {value: "Preset List 1", label: "Preset List 1", valuesToIgnore: ["item one", "item two", "word three", "word 3", "word 4", "word 5", "word 6", "word 7"]},
  {value: "Preset List 2", label: "Preset List 2", valuesToIgnore: ["word 1", "word 2", "word 3", "word 3"]},
  {value: "Preset List 3", label: "Preset List 3", valuesToIgnore: ["word 1"]}
];

const MatchRulesetModal: React.FC<Props> = (props) => {
  const {curationOptions, updateActiveStepArtifact} = useContext(CurationContext);

  const [entityTypeDefinition, setEntityTypeDefinition] = useState<Definition>(DEFAULT_ENTITY_DEFINITION);

  const [selectedProperty, setSelectedProperty] = useState<string | undefined>(undefined);
  const [propertyTypeErrorMessage, setPropertyTypeErrorMessage] = useState("");
  const [isPropertyTypeTouched, setIsPropertyTypeTouched] = useState(false);

  const [matchType, setMatchType] = useState<string | undefined>(undefined);
  const [matchTypeErrorMessage, setMatchTypeErrorMessage] = useState("");
  const [isMatchTypeTouched, setIsMatchTypeTouched] = useState(false);

  const [thesaurusValue, setThesaurusValue] = useState("");
  const [thesaurusErrorMessage, setThesaurusErrorMessage] = useState("");
  const [isThesaurusTouched, setIsThesaurusTouched] = useState(false);

  const [filterValue, setFilterValue] = useState("");
  const [isFilterTouched, setIsFilterTouched] = useState(false);

  const [dictionaryValue, setDictionaryValue] = useState("");
  const [dictionaryErrorMessage, setDictionaryErrorMessage] = useState("");
  const [isDictionaryTouched, setIsDictionaryTouched] = useState(false);

  const [distanceThresholdValue, setDistanceThresholdValue] = useState("");
  const [distanceThresholdErrorMessage, setDistanceThresholdErrorMessage] = useState("");
  const [isDistanceTouched, setIsDistanceTouched] = useState(false);

  const [uriValue, setUriValue] = useState("");
  const [uriErrorMessage, setUriErrorMessage] = useState("");
  const [isUriTouched, setIsUriTouched] = useState(false);

  const [functionValue, setFunctionValue] = useState("");
  const [functionErrorMessage, setFunctionErrorMessage] = useState("");
  const [isFunctionTouched, setIsFunctionTouched] = useState(false);
  const [showDeleteConfirmModal, toggleDeleteConfirmModal] = useState(false);
  const [namespaceValue, setNamespaceValue] = useState("");
  const [isNamespaceTouched, setIsNamespaceTouched] = useState(false);
  const [discardChangesVisible, setDiscardChangesVisible] = useState(false);
  const [reduceValue, setReduceValue] = useState(false);
  const [fuzzyMatching, setFuzzyMatching] = useState(false);

  const [showListModal, setShowListModal] = useState(false);
  const [actionListModal, setActionListModal] = useState("C");
  const [listName, setListName] = useState("");
  const [listValues, setListValues] = useState<string[]>([]);

  let curationRuleset = props.editRuleset;
  if (props.editRuleset.hasOwnProperty("index")) {
    let index = props.editRuleset.index;
    curationRuleset = ({...curationOptions.activeStep.stepArtifact.matchRulesets[props.editRuleset.index], index});
  }

  useEffect(() => {
    if (props.isVisible && curationOptions.entityDefinitionsArray.length > 0 && curationOptions.activeStep.entityName !== "") {
      let entityTypeDefinition: Definition = curationOptions.entityDefinitionsArray.find(entityDefinition => entityDefinition.name === curationOptions.activeStep.entityName) || DEFAULT_ENTITY_DEFINITION;
      setEntityTypeDefinition(entityTypeDefinition);
    }

    if (Object.keys(curationRuleset).length !== 0 && props.isVisible) {
      let editRuleset = curationRuleset;
      setSelectedProperty(editRuleset.name.split(" ")[0].split(".").join(" > "));
      let matchType = editRuleset["matchRules"][0]["matchType"];
      if (editRuleset.reduce) {
        setReduceValue(true);
      }
      if (editRuleset.fuzzyMatch) {
        setFuzzyMatching(true);
      }
      setMatchType(matchType);
      if (matchType === "custom") {
        setUriValue(editRuleset["matchRules"][0]["algorithmModulePath"]);
        setFunctionValue(editRuleset["matchRules"][0]["algorithmFunction"]);
        setNamespaceValue(editRuleset["matchRules"][0]["algorithmModuleNamespace"]);

      } else if (matchType === "doubleMetaphone") {
        setDictionaryValue(editRuleset["matchRules"][0]["options"]["dictionaryURI"]);
        setDistanceThresholdValue(editRuleset["matchRules"][0]["options"]["distanceThreshold"]);

      } else if (matchType === "synonym") {
        setThesaurusValue(editRuleset["matchRules"][0]["options"]["thesaurusURI"]);
        setFilterValue(editRuleset["matchRules"][0]["options"]["filter"]);

      }
    }
  }, [props.isVisible]);

  const handleInputChange = (event) => {
    switch (event.target.id) {
    case "thesaurus-uri-input":
      if (event.target.value === "") {
        setIsThesaurusTouched(false);
        setThesaurusErrorMessage("A thesaurus URI is required");
      } else {
        setThesaurusErrorMessage("");
      }
      setIsThesaurusTouched(true);
      setThesaurusValue(event.target.value);
      break;

    case "filter-input":
      setIsFilterTouched(true);
      setFilterValue(event.target.value);
      break;

    case "dictionary-uri-input":
      if (event.target.value === "") {
        setIsDictionaryTouched(false);
        setDictionaryErrorMessage("A dictionary URI is required");
      } else {
        setDictionaryErrorMessage("");
      }
      setIsDictionaryTouched(true);
      setDictionaryValue(event.target.value);
      break;

    case "distance-threshold-input":
      if (event.target.value === "") {
        setIsDistanceTouched(false);
        setDistanceThresholdErrorMessage("A distance threshold is required");
      } else {
        setDistanceThresholdErrorMessage("");
      }
      setIsDistanceTouched(true);
      setDistanceThresholdValue(event.target.value);
      break;

    case "uri-input":
      if (event.target.value === "") {
        setIsUriTouched(false);
        setUriErrorMessage("A URI is required");
      } else {
        setUriErrorMessage("");
      }
      setIsUriTouched(true);
      setUriValue(event.target.value);
      break;

    case "function-input":
      if (event.target.value === "") {
        setIsFunctionTouched(false);
        setFunctionErrorMessage("A function is required");
      } else {
        setFunctionErrorMessage("");
      }
      setIsFunctionTouched(true);
      setFunctionValue(event.target.value);
      break;

    case "namespace-input":
      setIsNamespaceTouched(true);
      setNamespaceValue(event.target.value);
      break;

    default:
      break;
    }
  };

  const closeModal = () => {
    if (hasFormChanged()) {
      setDiscardChangesVisible(true);
    } else {
      resetModal();
      props.toggleModal(false);
    }
  };

  const resetModalValuesIgnore = () => {
    setListName("");
    setListValues([]);
  };

  const resetModal = () => {
    setSelectedProperty(undefined);
    setMatchType(undefined);
    setReduceValue(false);
    setFuzzyMatching(false);
    setPropertyTypeErrorMessage("");
    setMatchTypeErrorMessage("");
    setThesaurusValue("");
    setThesaurusErrorMessage("");
    setFilterValue("");
    setDictionaryValue("");
    setDictionaryErrorMessage("");
    setDistanceThresholdValue("");
    setDistanceThresholdErrorMessage("");
    setUriValue("");
    setUriErrorMessage("");
    setFunctionValue("");
    setFunctionErrorMessage("");
    setNamespaceValue("");
    resetTouched();
  };

  const resetTouched = () => {
    setDiscardChangesVisible(false);
    setIsPropertyTypeTouched(false);
    setIsMatchTypeTouched(false);
    setIsThesaurusTouched(false);
    setIsFilterTouched(false);
    setIsDictionaryTouched(false);
    setIsDistanceTouched(false);
    setIsUriTouched(false);
    setIsFunctionTouched(false);
    setIsNamespaceTouched(false);
    setReduceValue(false);
    setFuzzyMatching(false);
  };

  const getSelectedPropertyValue = (selectedProperty) => {
    return selectedProperty ? selectedProperty.split(" > ").join(".") : "";
  };

  const onSubmit = (event) => {
    event.preventDefault();
    let propertyErrorMessage = "";
    let matchErrorMessage = "";
    let rulesetName = "";
    let propertyName = getSelectedPropertyValue(selectedProperty) || "";

    if (selectedProperty === "" || selectedProperty === undefined) {
      propertyErrorMessage = "A property to match is required";
    }
    if (matchType === "" || matchType === undefined) {
      matchErrorMessage = "A match type is required";
    } else {
      rulesetName = `${propertyName} - ${matchType.charAt(0).toUpperCase() + matchType.slice(1)}`;
    }

    switch (matchType) {
    case "exact":
    case "zip":
    {
      let matchRule: MatchRule = {
        entityPropertyPath: propertyName,
        matchType: matchType,
        options: {}
      };

      let matchRuleset: MatchRuleset = {
        name: rulesetName,
        weight: Object.keys(curationRuleset).length !== 0 ? curationRuleset["weight"] : 0,
        ...({reduce: reduceValue}),
        fuzzyMatch: fuzzyMatching,
        matchRules: [matchRule]
      };

      if (propertyErrorMessage === "" && matchErrorMessage === "") {
        updateStepArtifact(matchRuleset);
        props.toggleModal(false);
        resetModal();
      }
      break;
    }

    case "synonym":
    {
      let thesaurusErrorMessage = "";
      if (thesaurusValue === "") {
        thesaurusErrorMessage = "A thesaurus URI is required";
      }

      let synonymMatchRule: MatchRule = {
        entityPropertyPath: propertyName,
        matchType: matchType,
        options: {
          thesaurusURI: thesaurusValue,
          filter: filterValue
        }
      };

      let matchRuleset: MatchRuleset = {
        name: rulesetName,
        weight: Object.keys(curationRuleset).length !== 0 ? curationRuleset["weight"] : 0,
        ...({reduce: reduceValue}),
        fuzzyMatch: fuzzyMatching,
        matchRules: [synonymMatchRule]
      };

      if (thesaurusErrorMessage === "" && propertyErrorMessage === "") {
        updateStepArtifact(matchRuleset);
        props.toggleModal(false);
        resetModal();
      }
      setThesaurusErrorMessage(thesaurusErrorMessage);
      break;
    }

    case "doubleMetaphone":
    {
      let dictionaryUriErrorMessage = "";
      if (dictionaryValue === "") {
        dictionaryUriErrorMessage = "A dictionary URI is required";
      }

      let distanceThresholdErrorMessage = "";
      if (distanceThresholdValue === "") {
        distanceThresholdErrorMessage = "A distance threshold is required";
      }

      rulesetName = `${propertyName} - Double Metaphone`;

      let doubleMetaphoneMatchRule: MatchRule = {
        entityPropertyPath: propertyName,
        matchType: matchType,
        options: {
          dictionaryURI: dictionaryValue,
          distanceThreshold: distanceThresholdValue
        }
      };

      let matchRuleset: MatchRuleset = {
        name: rulesetName,
        weight: Object.keys(curationRuleset).length !== 0 ? curationRuleset["weight"] : 0,
        ...({reduce: reduceValue}),
        fuzzyMatch: fuzzyMatching,
        matchRules: [doubleMetaphoneMatchRule]
      };

      if (propertyErrorMessage === "" && dictionaryUriErrorMessage === "" && distanceThresholdErrorMessage === "") {
        updateStepArtifact(matchRuleset);
        props.toggleModal(false);
        resetModal();
      }
      setDictionaryErrorMessage(dictionaryUriErrorMessage);
      setDistanceThresholdErrorMessage(distanceThresholdErrorMessage);
      break;
    }

    case "custom":
    {
      let uriErrorMessage = "";
      if (uriValue === "") {
        uriErrorMessage = "A URI is required";
      }

      let functionErrorMessage = "";
      if (functionValue === "") {
        functionErrorMessage = "A function is required";
      }

      let customMatchRule: MatchRule = {
        entityPropertyPath: propertyName,
        matchType: matchType,
        algorithmModulePath: uriValue,
        algorithmFunction: functionValue,
        algorithmModuleNamespace: namespaceValue,
        options: {}
      };

      let matchRuleset: MatchRuleset = {
        name: rulesetName,
        weight: Object.keys(curationRuleset).length !== 0 ? curationRuleset["weight"] : 0,
        ...({reduce: reduceValue}),
        fuzzyMatch: fuzzyMatching,
        matchRules: [customMatchRule]
      };

      if (propertyErrorMessage === "" && uriErrorMessage === "" && functionErrorMessage === "") {
        updateStepArtifact(matchRuleset);
        props.toggleModal(false);
        resetModal();
      }
      setUriErrorMessage(uriErrorMessage);
      setFunctionErrorMessage(functionErrorMessage);
      break;
    }

    default:
      break;
    }
    setMatchTypeErrorMessage(matchErrorMessage);
    setPropertyTypeErrorMessage(propertyErrorMessage);
  };

  const onPropertySelect = (value: string | undefined) => {
    setPropertyTypeErrorMessage("");
    setIsPropertyTypeTouched(true);
    setSelectedProperty(value);
  };

  const onMatchTypeSelect = (selectedItem: any) => {
    setMatchTypeErrorMessage("");
    setIsMatchTypeTouched(true);
    setMatchType(selectedItem.value);
  };

  const updateStepArtifact = async (matchRuleset: MatchRuleset) => {
    // avoid triggering update of active step prior to persisting the database
    let updateStep: MatchingStep = {...curationOptions.activeStep.stepArtifact};
    updateStep.matchRulesets = [...updateStep.matchRulesets];
    if (Object.keys(curationRuleset).length !== 0) {
      // edit match step
      updateStep.matchRulesets[curationRuleset["index"]] = matchRuleset;
    } else {
      // add match step
      if (updateStep.matchRulesets) { updateStep.matchRulesets.push(matchRuleset); }
    }
    let success = await updateMatchingArtifact(updateStep);
    if (success) {
      updateActiveStepArtifact(updateStep);
    }
  };

  const hasFormChanged = () => {
    if (matchType === "custom") {
      let checkCustomValues = hasCustomFormValuesChanged();
      if (!isPropertyTypeTouched
        && !isMatchTypeTouched
        && !checkCustomValues
      ) {
        return false;
      } else {
        return true;
      }
    } else if (matchType === "synonym") {
      let checkSynonymValues = hasSynonymFormValuesChanged();
      if (!isPropertyTypeTouched
        && !isMatchTypeTouched
        && !checkSynonymValues
      ) {
        return false;
      } else {
        return true;
      }
    } else if (matchType === "doubleMetaphone") {
      let checkDoubleMetaphoneValues = hasDoubleMetaphoneFormValuesChanged();
      if (!isPropertyTypeTouched
        && !isMatchTypeTouched
        && !checkDoubleMetaphoneValues
      ) {
        return false;
      } else {
        return true;
      }
    } else {
      if (!isPropertyTypeTouched && !isMatchTypeTouched) {
        return false;
      } else {
        return true;
      }
    }
  };

  const hasCustomFormValuesChanged = () => {
    if (!isUriTouched
      && !isFunctionTouched
      && !isNamespaceTouched
    ) {
      return false;
    } else {
      return true;
    }
  };

  const hasSynonymFormValuesChanged = () => {
    if (!isThesaurusTouched
      && !isFilterTouched
    ) {
      return false;
    } else {
      return true;
    }
  };

  const hasDoubleMetaphoneFormValuesChanged = () => {
    if (!isDictionaryTouched
      && !isDistanceTouched
    ) {
      return false;
    } else {
      return true;
    }
  };

  const discardOk = () => {
    resetModal();
    props.toggleModal(false);
  };

  const discardCancel = () => {
    resetTouched();
  };

  const discardChanges = <ConfirmYesNo
    visible={discardChangesVisible}
    type="discardChanges"
    onYes={discardOk}
    onNo={discardCancel}
  />;

  const renderMatchOptions = MATCH_TYPE_OPTIONS.map((matchType, index) => ({value: matchType.value, label: matchType.name}));

  const renderSynonymOptions = (
    <>
      <Row className={"mb-3"}>
        <FormLabel column lg={3}>{"Thesaurus URI:"}<span className={styles.asterisk}>*</span></FormLabel>
        <Col>
          <Row>
            <Col className={thesaurusErrorMessage ? "d-flex has-error" : "d-flex"}>
              <HCInput
                id="thesaurus-uri-input"
                ariaLabel="thesaurus-uri-input"
                placeholder="Enter thesaurus URI"
                className={styles.inputAux}
                value={thesaurusValue}
                onChange={handleInputChange}
                onBlur={handleInputChange}
              />
              <div className={"p-2 d-flex align-items-center"}>
                <HCTooltip text={MatchingStepTooltips.thesaurusUri} id="thesaurus-uri-tooltip" placement="top">
                  <QuestionCircleFill color={themeColors.defaults.questionCircle} className={styles.icon} size={13} aria-label="icon: question-circle" />
                </HCTooltip>
              </div>
            </Col>
            <Col xs={12} className={styles.validationError}>
              {thesaurusErrorMessage}
            </Col>
          </Row>
        </Col>
      </Row>

      <Row className={"mb-3"}>
        <FormLabel column lg={3}>{"Filter:"}</FormLabel>
        <Col className={"d-flex"}>
          <HCInput
            id="filter-input"
            ariaLabel="filter-input"
            placeholder="Enter a node in the thesaurus to use as a filter"
            className={styles.inputAux}
            value={filterValue}
            onChange={handleInputChange}
            onBlur={handleInputChange}
          />
          <div className={"p-2 d-flex align-items-center"}>
            <HCTooltip text={MatchingStepTooltips.filter} id="filter-tooltip" placement="top">
              <QuestionCircleFill color={themeColors.defaults.questionCircle} className={styles.icon} size={13} aria-label="icon: question-circle" />
            </HCTooltip>
          </div>
        </Col>
      </Row>
    </>
  );

  const renderDoubleMetaphoneOptions = (
    <>
      <Row className={"mb-3"}>
        <FormLabel column lg={3}>{"Dictionary URI:"}<span className={styles.asterisk}>*</span></FormLabel>
        <Col>
          <Row>
            <Col className={dictionaryErrorMessage ? "d-flex has-error" : "d-flex"}>
              <HCInput
                id="dictionary-uri-input"
                ariaLabel="dictionary-uri-input"
                placeholder="Enter dictionary URI"
                className={styles.inputDictionaryUriAndDistance}
                value={dictionaryValue}
                onChange={handleInputChange}
                onBlur={handleInputChange}
              />
              <div className={"p-2 d-flex align-items-center"}>
                <HCTooltip text={MatchingStepTooltips.dictionaryUri} id="dictionary-uri-tooltip" placement="top">
                  <QuestionCircleFill color={themeColors.defaults.questionCircle} className={styles.icon} size={13} aria-label="icon: question-circle" />
                </HCTooltip>
              </div>
            </Col>
            <Col xs={12} className={styles.validationError}>
              {dictionaryErrorMessage}
            </Col>
          </Row>
        </Col>
      </Row>

      <Row className={"mb-3"}>
        <FormLabel column lg={3}>{"Distance Threshold:"}<span className={styles.asterisk}>*</span></FormLabel>
        <Col>
          <Row>
            <Col className={distanceThresholdErrorMessage ? "d-flex has-error" : "d-flex"}>
              <HCInput
                id="distance-threshold-input"
                ariaLabel="distance-threshold-input"
                placeholder="Enter distance threshold"
                className={styles.inputDictionaryUriAndDistance}
                value={distanceThresholdValue}
                onChange={handleInputChange}
                onBlur={handleInputChange}
              />
              <div className={"p-2 d-flex align-items-center"}>
                <HCTooltip text={MatchingStepTooltips.distanceThreshold} id="distance-threshold-tooltip" placement="top">
                  <QuestionCircleFill color={themeColors.defaults.questionCircle} className={styles.icon} size={13} aria-label="icon: question-circle" />
                </HCTooltip>
              </div>
            </Col>
            <Col xs={12} className={styles.validationError}>
              {distanceThresholdErrorMessage}
            </Col>
          </Row>
        </Col>
      </Row>
    </>
  );

  const renderCustomOptions = (
    <>
      <Row className={"mb-3"}>
        <FormLabel column lg={3}>{"URI:"}<span className={styles.asterisk}>*</span></FormLabel>
        <Col>
          <Row>
            <Col className={uriErrorMessage ? "d-flex has-error" : "d-flex"}>
              <HCInput
                id="uri-input"
                ariaLabel="uri-input"
                placeholder="Enter URI"
                className={styles.input}
                value={uriValue}
                onChange={handleInputChange}
                onBlur={handleInputChange}
              />
              <div className={"p-2 d-flex align-items-center"}>
                <HCTooltip text={MatchingStepTooltips.uri} id="uri-tooltip" placement="top">
                  <QuestionCircleFill color={themeColors.defaults.questionCircle} className={styles.icon} size={13} aria-label="icon: question-circle" />
                </HCTooltip>
              </div>
            </Col>
            <Col xs={12} className={styles.validationError}>
              {uriErrorMessage}
            </Col>
          </Row>
        </Col>
      </Row>
      <Row className={"mb-3"}>
        <FormLabel column lg={3}>{"Function:"}<span className={styles.asterisk}>*</span></FormLabel>
        <Col>
          <Row>
            <Col className={functionErrorMessage ? "d-flex has-error" : "d-flex"}>
              <HCInput
                id="function-input"
                ariaLabel="function-input"
                placeholder="Enter a function"
                className={styles.input}
                value={functionValue}
                onChange={handleInputChange}
                onBlur={handleInputChange}
              />
              <div className={"p-2 d-flex align-items-center"}>
                <HCTooltip text={MatchingStepTooltips.function} id="function-tooltip" placement="top">
                  <QuestionCircleFill color={themeColors.defaults.questionCircle} className={styles.icon} size={13} aria-label="icon: question-circle" />
                </HCTooltip>
              </div>
            </Col>
            <Col xs={12} className={styles.validationError}>
              {functionErrorMessage}
            </Col>
          </Row>
        </Col>
      </Row>
      <Row className={"mb-3"}>
        <FormLabel column lg={3}>{"Namespace:"}</FormLabel>
        <Col className={"d-flex"}>
          <HCInput
            id="namespace-input"
            ariaLabel="namespace-input"
            placeholder="Enter a namespace"
            className={styles.input}
            value={namespaceValue}
            onChange={handleInputChange}
            onBlur={handleInputChange}
          />
          <div className={"p-2 d-flex align-items-center"}>
            <HCTooltip text={MatchingStepTooltips.namespace} id="namespace-tooltip" placement="top">
              <QuestionCircleFill color={themeColors.defaults.questionCircle} className={styles.icon} size={13} aria-label="icon: question-circle" />
            </HCTooltip>
          </div>
        </Col>
      </Row>
    </>
  );

  const modalFooter = (
    <div className={styles.editFooter}>
      {(Object.keys(curationRuleset).length !== 0) && <HCButton size="sm" aria-label="editSingleRulesetDeleteIcon" variant="link" onClick={() => { toggleDeleteConfirmModal(true); }}>
        <FontAwesomeIcon className={styles.trashIcon} icon={faTrashAlt} />
      </HCButton>}
      <div className={((Object.keys(curationRuleset).length) === 0) ? styles.footerNewRuleset : styles.footer}>
        <HCButton
          size="sm"
          variant="outline-light"
          aria-label={`cancel-single-ruleset`}
          onClick={closeModal}
        >Cancel</HCButton>
        <HCButton
          className={styles.saveButton}
          aria-label={`confirm-single-ruleset`}
          variant="primary"
          size="sm"
          onClick={(e) => onSubmit(e)}
        >Save</HCButton>
      </div>
    </div>
  );

  const onToggleReduce = ({target}) => {
    const {checked} = target;
    if (checked) {
      setReduceValue(true);
    } else {
      setReduceValue(false);
    }
  };

  const onFuzzyMatching = ({target}) => {
    const {checked} = target;
    if (checked) {
      setFuzzyMatching(true);
    } else {
      setFuzzyMatching(false);
    }
  };

  const confirmAction = () => {
    props.toggleModal(false);
    resetModal();
  };

  const MenuList = (selector, props) => (
    <div id={`${selector}-select-MenuList`}>
      <SelectComponents.MenuList {...props} />
    </div>
  );

  const handleClick = (event, btn) => {
    setShowListModal(true);
    if (btn === "A") {
      setActionListModal("A");
      resetModalValuesIgnore();
    } else if (btn === "C") {
      setActionListModal("C");
      resetModalValuesIgnore();
    } else if (btn === "E") {
      setListName("Preset List 1");
      setListValues(["Word 1", "word 2", "word 3"]);
      setActionListModal("E");
    } else if (btn === "D") {
      setActionListModal("D");
      resetModalValuesIgnore();
    }
    event.stopPropagation();
  };

  const formatTextTooltip = (arrText) => {
    if (Array.isArray(arrText)) {
      const itemsToShow = 5;
      if (arrText.length <= itemsToShow) {
        return  arrText.join(", ");
      }
      return  (
        <div data-testid="tooltipListPreset">
          {arrText.slice(0, itemsToShow).join(", ")}<span style={{color: "#808080"}}>{" + " + (arrText.length - itemsToShow) + " more"  }</span>
        </div>);
    }
  };

  const Option = (renderMatchOptions) => {
    return (
      <div>
        {renderMatchOptions.data.label === "Preset List 0" && <components.MenuList {...renderMatchOptions} >
          <div className={styles.createNewListOption} id="createNewListOption" data-test-id="createNewListOption" onClick={(event) => { handleClick(event, "A"); }}>Create new list</div>
        </components.MenuList>}
        {renderMatchOptions.data.label !== "Preset List 0" &&
              <components.Option {...renderMatchOptions}>
                <HCTooltip text={<span aria-label="reduce-tooltip-text">{formatTextTooltip(renderMatchOptions.data.valuesToIgnore)}</span>} id="reduce-tooltip" placement="top">
                  <div>{renderMatchOptions.data.label} </div>
                </HCTooltip>
                <div className={styles.optionsList}>
                  <i><FontAwesomeIcon className={styles.iconHover} id={`edit-${renderMatchOptions.data.label}`} icon={faPencilAlt} color={themeColors.info} size="sm" onClick={(event) => { handleClick(event, "E"); }} /></i>
                  <i><FontAwesomeIcon className={styles.iconHover} id={`copy-${renderMatchOptions.data.label}`} icon={faCopy} color={themeColors.info} size="sm" onClick={(event) => { handleClick(event, "C"); }} /></i>
                  <i><FontAwesomeIcon className={styles.iconHover} id={`delete-${renderMatchOptions.data.label}`} icon={faTrashAlt} color={themeColors.info} size="sm" onClick={(event) => { handleClick(event, "D"); }} /></i>
                </div>
              </components.Option>
        }
      </div>
    );
  };


  return (
    <HCModal
      show={props.isVisible}
      size={"lg"}
      onHide={closeModal}
    >
      <Modal.Header className={"pb-0"} >
        <div>
          <div className={"fs-5"}>{Object.keys(curationRuleset).length !== 0 ? "Edit Match Ruleset for Single Property" : "Add Match Ruleset for Single Property"}</div>
        </div>
        <div className={`flex-column ${styles.modalTitleLegend}`}>
          <button type="button" className="btn-close" aria-label="Close" onClick={closeModal}></button>
          <div className={"d-flex mt-3"}>
            <div className={styles.legendText}><img className={styles.arrayImage} src={arrayIcon} />Multiple</div>
            <div className={styles.legendText}><FontAwesomeIcon className={styles.structuredIcon} icon={faLayerGroup} /> Structured Type</div>
          </div>
        </div>
      </Modal.Header>
      <Modal.Body>
        <Form
          id="matching-single-ruleset"
          onSubmit={onSubmit}
          className={"container-fluid"}
        >
          <Row className={"mb-3"}>
            <FormLabel column lg={3} className={styles.reduceWeightText}>{"Reduce Weight"}</FormLabel>
            <Col className={"d-flex align-items-center"}>
              <FormCheck
                type="switch"
                data-testid="reduceToggle"
                defaultChecked={props.editRuleset.reduce}
                className={styles.switchReduceToggle}
                onChange={onToggleReduce}
                aria-label="reduceToggle"
              />
              <div className={"p-2 d-flex align-items-center"}>
                <HCTooltip text={<span aria-label="reduce-tooltip-text">{MatchingStepTooltips.reduceToggle}</span>} id="reduce-tooltip" placement="top">
                  <QuestionCircleFill color={themeColors.defaults.questionCircle} className={styles.icon} size={13} aria-label="icon: question-circle-reduce" />
                </HCTooltip>
              </div>
            </Col>
          </Row>
          <Row className={"mb-3"}>
            <FormLabel column lg={3} className={styles.reduceWeightText}>{"Fuzzy Matching"}</FormLabel>
            <Col className={"d-flex align-items-center"}>
              <FormCheck
                type="switch"
                data-testid="fuzzyMatching"
                defaultChecked={props.editRuleset.fuzzyMatch}
                className={styles.switchReduceToggle}
                onChange={onFuzzyMatching}
                aria-label="fuzzyMatching"
              />
              <div className={"p-2 d-flex align-items-center"}>
                <HCTooltip text={<span aria-label="fuzzy-tooltip-text">{MatchingStepTooltips.fuzzyMatching}</span>} id="fuzzy-tooltip" placement="top">
                  <QuestionCircleFill color={themeColors.defaults.questionCircle} className={styles.icon} size={13} aria-label="icon: question-circle" />
                </HCTooltip>
              </div>
            </Col>
          </Row>

          <Row className={"mb-3"}>
            <FormLabel column lg={3}>{"Property to Match:"}<span className={styles.asterisk}>*</span></FormLabel>
            <Col>
              <Row>
                <Col className={propertyTypeErrorMessage ? "d-flex has-error" : "d-flex"}>
                  <EntityPropertyTreeSelect
                    isForMerge={false}
                    propertyDropdownOptions={entityTypeDefinition.properties}
                    entityDefinitionsArray={curationOptions.entityDefinitionsArray}
                    value={selectedProperty}
                    onValueSelected={onPropertySelect}
                  />
                </Col>
                <Col xs={12} className={styles.validationError}>
                  {propertyTypeErrorMessage}
                </Col>
              </Row>
            </Col>
          </Row>

          <Row className={"mb-3"}>
            <FormLabel column lg={3}>{"Match Type:"}<span className={styles.asterisk}>*</span></FormLabel>
            <Col>
              <Row>
                <Col className={matchTypeErrorMessage ? "d-flex has-error" : "d-flex"}>
                  <div className={styles.inputMatchType}>
                    <Select
                      id="match-type-select-wrapper"
                      inputId="match-type"
                      components={{MenuList: props => MenuList("match-type", props)}}
                      placeholder="Select match type"
                      value={renderMatchOptions.find(oItem => oItem.value === matchType)}
                      onChange={onMatchTypeSelect}
                      aria-label="match-type-dropdown"
                      options={renderMatchOptions}
                      styles={reactSelectThemeConfig}
                      formatOptionLabel={({value, label}) => {
                        return (
                          <span aria-label={`${value}-option`}>
                            {label}
                          </span>
                        );
                      }}
                    />
                  </div>
                </Col>
                <Col xs={12} className={styles.validationError}>
                  {matchTypeErrorMessage}
                </Col>
              </Row>
            </Col>
          </Row>
          <Row className={"mb-3"}>
            <FormLabel column lg={3}>{"Values to Ignore:"}</FormLabel>
            <Col>
              <Row>
                <Col className={matchTypeErrorMessage ? "d-flex has-error" : "d-flex"}>
                  <div className={styles.selectIgnore}>
                    <Select
                      inputId="valuesToIgnore"
                      data-testid="valuesToIgnore"
                      isMulti
                      closeMenuOnSelect={false}
                      isClearable={true}
                      isSearchable={true}
                      components={{Option}}
                      placeholder="Search previous lists"
                      //value={renderMatchOptions.find(oItem => oItem.value === matchType)}
                      //onChange={onMatchTypeSelect}
                      //options={renderMatchOptions}
                      options={presetListMock}
                      styles={reactSelectThemeConfig}
                      formatOptionLabel={({value, label}) => {
                        return (
                          <span aria-label={`${value}-option`} style={{backgroundColor: "silver", width: "100%"}}>
                            <div>
                              {label}
                            </div>
                          </span>
                        );
                      }}
                    />
                  </div>
                  <div className={"p-2 d-flex align-items-center"}>
                    <HCTooltip text={<span aria-label="values-ignore-tooltip-text">{MatchingStepTooltips.valuesToIgnore}</span>} id="reduce-tooltip" placement="top">
                      <QuestionCircleFill color={themeColors.defaults.questionCircle} className={styles.icon} size={13} aria-label="icon: question-circle-values-ignore" />
                    </HCTooltip>
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>

          {matchType === "synonym" && renderSynonymOptions}
          {matchType === "doubleMetaphone" && renderDoubleMetaphoneOptions}
          {matchType === "custom" && renderCustomOptions}
          {modalFooter}
        </Form>
        {discardChanges}
        <ListModal
          isVisible={showListModal}
          toggleModal={setShowListModal}
          action={actionListModal}
          listName={listName}
          listValues={listValues}
          confirmAction={confirmAction}
        />
        <DeleteModal
          isVisible={showDeleteConfirmModal}
          toggleModal={toggleDeleteConfirmModal}
          editRuleset={curationRuleset}
          confirmAction={confirmAction}
        />
      </Modal.Body>
    </HCModal>
  );
};

export default MatchRulesetModal;