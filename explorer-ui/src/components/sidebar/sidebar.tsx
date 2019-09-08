import React from 'react';
import Facets from '../facets/facets';
import styles from './sidebar.module.scss';

const Sidebar = (props) => {

  let hubFacets = {};
  let entityFacets = {};

  // Facets to display under Hub Properties
  // https://project.marklogic.com/jira/browse/DHFPROD-3042
  const hubKeys = [
    'Collection', 'flowName', 'stepName', 
    'jobID', 'createdOn', 'createdBy'
  ];

  if (props.facets) {
    // Assume if not hub facet, then entity facet
    Object.keys(props.facets).forEach(prop => {
      if (hubKeys.includes(prop)) {
        hubFacets[prop] = props.facets[prop];
      } else {
        entityFacets[prop] = props.facets[prop];
      }
    })
  }

  return (
    <div className={styles.sidebarContainer}>
      <Facets 
        title="Entity Properties"
        data={entityFacets}
      />
      <Facets 
        title="Hub Properties"
        data={hubFacets}
      />
    </div>
  );
}

export default Sidebar;