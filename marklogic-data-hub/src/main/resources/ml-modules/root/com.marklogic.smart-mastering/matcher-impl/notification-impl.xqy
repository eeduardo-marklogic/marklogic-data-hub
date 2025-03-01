xquery version "1.0-ml";

(:
 : This is an implementation library, not an interface to the Smart Mastering functionality.
 :
 : Notifications are used to record matches that do not have high enough
 : confidence to automerge. This way a human reviewer can have a set of
 : potential matches to review. Notification documents include a list of URIs
 : and a threshold level.
 :
 : Functionality in this module provides for saving (creating), finding,
 : reading, counting, updating the status of, and deleting notifications.
 :
 : Notification documents are stored as XML, but a function here can convert
 : them to JSON.
 :
 : Notifications may be supplemented with information from the source documents
 : that they refer to. This is useful when presenting information to users. For
 : instance, if the documents contain Person entities, you might want to show
 : the full names of the people referred to in each notification.
 :)

module namespace notify-impl = "http://marklogic.com/smart-mastering/notification-impl";

import module namespace coll-impl = "http://marklogic.com/smart-mastering/survivorship/collections"
  at "/com.marklogic.smart-mastering/survivorship/merging/collections.xqy";
import module namespace config = "http://marklogic.com/data-hub/config"
  at "/com.marklogic.hub/config.xqy";
import module namespace const = "http://marklogic.com/smart-mastering/constants"
  at "/com.marklogic.smart-mastering/constants.xqy";
import module namespace json="http://marklogic.com/xdmp/json"
  at "/MarkLogic/json/json.xqy";
import module namespace merge-impl = "http://marklogic.com/smart-mastering/survivorship/merging"
  at "/com.marklogic.smart-mastering/survivorship/merging/options.xqy";

declare namespace merging = "http://marklogic.com/smart-mastering/merging";
declare namespace sm = "http://marklogic.com/smart-mastering";

declare option xdmp:mapping "false";

declare variable $notification-uris-operated-on as map:map := map:map();
(:
 : Create a new notification document. If there is already a notification for
 : this combination of label and URIs, that notification will be replaced.
 : @param $threshold-label  a human-readable label
 : @param $uris  sequence of URIs of the documents that might be matches
 : @return in-memory version of the notification document
 :)
declare function notify-impl:save-match-notification(
  $threshold-label as xs:string,
  $uris as xs:string*,
  $options as element(merging:options)?
) as element(sm:notification)?
{
  for $action in notify-impl:build-match-notification($threshold-label, $uris, $options)
  let $context := $action => map:get("context")
  let $_database-update :=
      xdmp:document-insert(
        $action => map:get("uri"),
        $action => map:get("value"),
        $context => map:get("permissions"),
        $context => map:get("collections")
      )
  return (
    $action => map:get("value")
  )
};

declare variable $_notifications-inserted := map:map();
declare function notify-impl:build-match-notification(
  $threshold-label as xs:string,
  $uris as xs:string*,
  $options as item()?
) as map:map?
{
  notify-impl:build-match-notification($threshold-label, $uris, $options, ())
};
(:
 : Create a new notification document. If there is already a notification for
 : this combination of label and URIs, that notification will be replaced.
 : @param $threshold-label  a human-readable label
 : @param $uris  sequence of URIs of the documents that might be matches
 : @return in-memory version of the notification document
 :)
declare function notify-impl:build-match-notification(
  $threshold-label as xs:string,
  $uris as xs:string*,
  $options as item()?,
  $query as cts:query?
) as map:map?
{
  let $options-node := merge-impl:options-to-node($options)
  let $target-collections := merge-impl:build-target-collections($options-node)
  let $existing-notification :=
    notify-impl:get-existing-match-notification($threshold-label, $uris)
  let $doc-uris :=
    for $uri in notify-impl:find-notify-uris($uris, $existing-notification)
    order by $uri
    return $uri
  let $notification-uri :=
    if (fn:exists($existing-notification)) then
      xdmp:node-uri(fn:head($existing-notification))
    else
      notify-impl:build-notification-uri($threshold-label, $doc-uris)
  let $notification-operated-on := $_notifications-inserted => map:contains($notification-uri)
  where fn:not($notification-operated-on)
  return (
    $_notifications-inserted => map:put($notification-uri, fn:true()),
    map:new((
      map:entry("uri", $notification-uri),
      map:entry("value",
          element sm:notification {
            element sm:meta {
              element sm:dateTime {fn:current-dateTime()},
              element sm:user {xdmp:get-current-user()},
              element sm:status { $const:STATUS-UNREAD }
            },
            element sm:threshold-label {$threshold-label},
            element sm:document-uris {
              $doc-uris
            },
            $query ! element sm:query {.}
          }
        ),
      map:entry("context",
        map:new((
          map:entry("permissions",
            let $perms := xdmp:default-permissions($notification-uri, "objects")
            return if (fn:exists($perms)) then $perms else config:get-default-data-hub-permissions()
          ),
          map:entry("collections", coll-impl:on-notification(
            map:map(),
              $target-collections => map:get("onNotification")
          ))
        ))
      )
    ))
  )
};

declare function notify-impl:build-notification-uri(
  $threshold-label as xs:string,
  $doc-uris as xs:string*
) {
  "/com.marklogic.smart-mastering/matcher/notifications/" || xdmp:md5(fn:string-join(($threshold-label, $doc-uris ! fn:string(.)), "|")) || ".xml"
};

(:
 : It may be the case that one of the URIs has already been merged with some
 : other document. In that case, replace it with the URI of the doc it was
 : merged into. This can happen when process-match-and-merge gets run multiple
 : times in a single transaction. Document merges happen in a child transaction
 : so that they will be visible here.
 : @param $uris  sequence of uris for a notification
 : @param $existing-notification  sequence of notification docs that were
 :                                already in the database
 : @return sequence of elements holding updated, distinct URIs
 :)
declare function notify-impl:find-notify-uris(
  $uris as xs:string*,
  $existing-notification as element(sm:notification)*
) as element(sm:document-uri)*
{
  (: check each URI to see whether it appears in a merged document :)
  let $updated-uris :=
    for $uri in $uris
    let $merged-uri :=
      cts:uris((), (),
        cts:and-query((
          cts:collection-query($const:CONTENT-COLL),
          cts:collection-query($const:MERGED-COLL),
          cts:element-value-query(xs:QName("sm:document-uri"), $uri))
        ))
    return fn:head(($merged-uri, $uri))
  let $distinct-uris :=
    fn:distinct-values((
      $updated-uris,
      $existing-notification
      /sm:document-uris
        /sm:document-uri ! fn:string(.)
    ))
  for $uri in $distinct-uris
  return
    element sm:document-uri {
      $uri
    }
};

(:
 : Find notifications that have the same label and an overlapping set of URIs.
 : @param $threshold-label  a human-readable label
 : @param $uris  sequence of content document URIs that would appear in a
 :               notification document together
 : @return return related notification documents
 :)
declare function notify-impl:get-existing-match-notification(
  $threshold-label as xs:string?,
  $uris as xs:string*
) as element(sm:notification)*
{
  cts:search(fn:collection()/sm:notification,
    cts:and-query((
      if (fn:exists($threshold-label)) then
        cts:element-value-query(
          xs:QName("sm:threshold-label"),
          $threshold-label,
          "exact",
          0
        )
      else (),
      if (fn:exists($uris)) then
        cts:element-value-query(
          xs:QName("sm:document-uri"),
          $uris,
          "exact",
          0
        )
      else ()
    )),
    ("unfiltered","score-random"),
    0
  )
};

(:
 : Retrieve data from the source documents and add it to the notification XML.
 : Note that we decided *not* to store extracted information in the
 : notification document, as the properties to be requested could change, or
 : different properties could be requested for different use cases within the
 : same application. Thus, extracted values are added dynamically.
 : @param $notification  a notification document
 : @param $extractions  map of information to extract from source documents and
 :                      add to returned version of notification. map key: the
 :                      label that will be used for this extraction; map value:
 :                      localname of the element/property to be read from the
 :                      source docs
 : @return dynamic version of the notification doc, supplemented with extracted info
 :)
declare function notify-impl:enhance-notification-xml(
  $notification as element(sm:notification),
  $extractions as map:map)
as element(sm:notification)
{
  element sm:notification {
    $notification/@*,
    attribute xml:base { xdmp:node-uri($notification) },
    $notification/node(),

    (: build extractions :)
    let $keys := map:keys($extractions)
    where fn:exists($keys)
    return
      for $uri in $notification/sm:document-uris/sm:document-uri
      let $doc := fn:doc($uri)
      return
        element sm:extractions {
          attribute uri { $uri },
          for $key in map:keys($extractions)
          let $xpath := "$doc//*:" || map:get($extractions, $key)
          let $value := fn:head(xdmp:value($xpath))
          return
            element sm:extraction {
              attribute name { $key },
              fn:string($value)
            }
        }
  }
};


(:
 : Delete the specified notification
 : @param $uri  URI of the notification document itself
 : TODO: do we want to add any provenance tracking to this?
 :)
declare function notify-impl:delete-notification($uri as xs:string)
  as empty-sequence()
{
  xdmp:document-delete($uri)
};

(:
 : Translate a notifcation into JSON.
 :)
declare function notify-impl:notification-to-json(
  $notification as element(sm:notification))
  as object-node()
{
  object-node {
    "meta": object-node {
      "dateTime": $notification/sm:meta/sm:dateTime/fn:string(),
      "user": $notification/sm:meta/sm:user/fn:string(),
      "uri": fn:string($notification/sm:meta/sm:uri),
      "status": $notification/sm:meta/sm:status/fn:string(),
      "entityName": fn:string($notification/sm:meta/sm:entityName),
      "matchStepName": fn:string($notification/sm:meta/sm:matchStepName),
      "matchStepFlow": fn:string($notification/sm:meta/sm:matchStepFlow),
      "label": fn:string($notification/sm:meta/sm:label)
    },
    "thresholdLabel": $notification/sm:threshold-label/fn:string(),
    "uris": array-node {
      for $uri in $notification/sm:document-uris/sm:document-uri
      return
        object-node { "uri": $uri/fn:string() }
    },
    "extractions": xdmp:to-json(
      let $o := json:object()
      let $_ :=
        for $extractions in $notification/sm:extractions
        let $ee := json:object()
        let $_ :=
          for $extraction in $extractions/sm:extraction
          return
            map:put($ee, $extraction/@name, $extraction/fn:data(.))
        return
          map:put($o, $extractions/@uri, $ee)
      return $o
    )
  }
};

(:
 : Paged retrieval of notifications
 :)
declare function notify-impl:get-notifications-as-xml(
  $start as xs:int,
  $end as xs:int,
  $extractions as map:map)
as element(sm:notification)*
{
  let $hc-config := fn:doc("/config/hubCentral.json")
  for $n in cts:search(/sm:notification, cts:true-query(), "unfiltered", 0)[$start to $end]
    let $notification-uri := fn:base-uri($n)
    let $entity-name := $n/sm:meta/sm:entityName/text()
    return if(fn:compare($entity-name, "") ne 0) then
      let $entity-model-uri := fn:concat("/entities/", $entity-name, ".entity.json")
      let $model := fn:doc($entity-model-uri)
      let $entity-label := $hc-config/modeling/entities/*[name()=$entity-name]/label
      let $primary-key :=
        if(fn:compare($entity-label, "") eq 0 or fn:empty($entity-label)) then
          xdmp:value(fn:concat("$model/*:definitions/", $entity-name, "/*:primaryKey"))
        else $entity-label
      let $uris := $n/sm:document-uris/sm:document-uri/text()
      let $label-seq := for $uri in $uris
        return if(fn:compare($primary-key, "") ne 0) then
          let $doc := fn:doc($uri)
          let $xpath := fn:concat("$doc//*:", "envelope/*:instance/*:", $entity-name, "/*:",$primary-key)
          let $value := fn:head(xdmp:value($xpath))
          return fn:string($value)
        else ""
      let $updated-label-seq := for $label in $label-seq
        return if(fn:compare($label, "") eq 0) then
          "undefined"
        else
          $label
      let $updated-notifications := notify-impl:insert-notification-labels($n, fn:string-join(($updated-label-seq),", "), $notification-uri)
      return notify-impl:enhance-notification-xml($updated-notifications, $extractions)
    else
      notify-impl:enhance-notification-xml($n, $extractions)
};

declare %private function notify-impl:insert-notification-labels(
  $nodes as node()*,
  $label as xs:string,
  $notification-uri as xs:string
)
{
  for $node in $nodes
  return
    typeswitch($node)
      case element(sm:meta)
        return
          element { name($node) } {
            $node/@*,
            notify-impl:insert-notification-labels($node/node(), $label, $notification-uri),
            element sm:label { $label },
            element sm:uri { $notification-uri }
          }
      case element()
        return
          element { name($node) } {
            $node/@*,
            notify-impl:insert-notification-labels($node/node(), $label, $notification-uri)
          }
      default
        return $node
};

(:
 : Paged retrieval of notifications
 :)
declare function notify-impl:get-notifications-as-json($start as xs:int, $end as xs:int, $extractions as map:map)
as array-node()
{
  array-node {
    notify-impl:get-notifications-as-xml($start, $end, $extractions) ! notify-impl:notification-to-json(.)
  }
};

(:
 : Return a count of all notifications
 :)
declare function notify-impl:count-notifications()
as xs:int
{
  let $collections := cts:collection-match($const:NOTIFICATION-COLL)
  return if (fn:exists($collections)) then xdmp:estimate(fn:collection($collections)) else 0
};

(:
 : Return a count of unread notifications
 :)
declare function notify-impl:count-unread-notifications()
as xs:int
{
  xdmp:estimate(
    cts:search(
      fn:collection(cts:collection-match($const:NOTIFICATION-COLL)),
      cts:element-value-query(xs:QName("sm:status"), $const:STATUS-UNREAD))
  )
};

(:
 : Modify the status of a notification document. While the intended values are
 : $const:STATUS-READ and $const:STATUS-UNREAD, no restrictions are placed on
 : the value here.
 :)
declare function notify-impl:update-notification-status(
  $uri as xs:string+,
  $status as xs:string
) as empty-sequence()
{
  xdmp:node-replace(
    fn:doc($uri)/sm:notification/sm:meta/sm:status,
    element sm:status { $status }
  )
};
