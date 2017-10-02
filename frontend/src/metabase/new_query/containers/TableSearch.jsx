import React, { Component } from 'react'
import { connect } from 'react-redux'
import _ from 'underscore'

import { fetchDatabases, fetchSegments } from "metabase/redux/metadata";
import LoadingAndErrorWrapper from "metabase/components/LoadingAndErrorWrapper";
import EntitySearch, { DATABASE_GROUPING, NAME_GROUPING } from "metabase/containers/EntitySearch";
import { getMetadata, getMetadataFetched } from "metabase/selectors/metadata";

import Metadata from "metabase-lib/lib/metadata/Metadata";
import type { Segment } from "metabase/meta/types/Segment";
import EmptyState from "metabase/components/EmptyState";

import type { StructuredQuery } from "metabase/meta/types/Query";
import { getCurrentQuery } from "metabase/new_query/selectors";
import { resetQuery } from '../new_query'
import Table from "metabase-lib/lib/metadata/Table";

const mapStateToProps = state => ({
    query: getCurrentQuery(state),
    metadata: getMetadata(state),
    metadataFetched: getMetadataFetched(state)
})
const mapDispatchToProps = {
    fetchSegments,
    fetchDatabases,
    resetQuery
}

@connect(mapStateToProps, mapDispatchToProps)
export default class TableSearch extends Component {
    props: {
        getUrlForQuery: (StructuredQuery) => void,
        backButtonUrl: string,

        query: StructuredQuery,
        metadata: Metadata,
        metadataFetched: any,
        fetchSegments: () => void,
        fetchDatabases: () => void,
        resetQuery: () => void
    }

    componentDidMount() {
        this.props.fetchDatabases() // load databases if not loaded yet
        this.props.fetchSegments(true) // segments may change more often so always reload them
        this.props.resetQuery();
    }

    getUrlForTable = (table: Table) => {
        const updatedQuery = this.props.query
            .setDatabase(table.db)
            .setTable(table)

        return this.props.getUrlForQuery(updatedQuery);
    }

    getUrlForSegment = (segment: Segment) => {
        const updatedQuery = this.props.query
            .setDatabase(segment.table.database)
            .setTable(segment.table)
            .addFilter(segment.filterClause())

        return this.props.getUrlForQuery(updatedQuery);
    }

    // TODO Atte Keinänen 9/11/17: How to differentiate tables and segments from each other?
    getUrlForEntity = (segmentOrTable) => {
        if (segmentOrTable.isTable) {
            // Table object format doesn't match with other entity types
            // so that's why the Table metadata object is stored in underlyingTable prop
            return this.getUrlForTable(segmentOrTable.table)
        } else {
            // For segments we can use the object as-is
            return this.getUrlForSegment(segmentOrTable)
        }
    }

    getTableInEntitySearchFormat = (table, segmentsList) => {
        const dbHasMultipleSchemas = table.db.schemaNames().length > 1
        const getEntitySearchDescription = ({currentGrouping}) => {
            const showDbName = currentGrouping.id !== "database"
            const showSchemaName = dbHasMultipleSchemas && table.schema
            return (
                <span>
                <b>{showDbName && table.db.name}</b>
                {showDbName && showSchemaName && ' - '}
                {showSchemaName && table.schema}
            </span>
            )
        }

        return {
            name: table.display_name,
            isTable: true,
            table,
            children:
                // TODO Atte Keinänen 9/29/17: Should this be optimized, i.e. can the count of segments be high?
                segmentsList
                    .filter(segment => segment.table_id === table.id)
                    .map(segment => Object.assign(segment, { getEntitySearchDescription })),
            getEntitySearchDescription
        }
    }

    render() {
        const { backButtonUrl, metadataFetched, metadata } = this.props;

        const isLoading = !metadataFetched.segments || !metadataFetched.databases

        // TODO Atte Keinänen 8/22/17: If you call `/api/table/:id/table_metadata` it returns
        // all segments (also retired ones) and they are missing both `is_active` and `creator` props. Currently this
        // filters them out but we should definitely update the endpoints in the upcoming metadata API refactoring.
        const segmentsList = metadata.segmentsList()
            .filter(segment => segment.isActive() && segment.table)

        return (
            <LoadingAndErrorWrapper loading={isLoading}>
                {() => {
                    const sortedTables = _.chain(metadata.tables)
                        // Don't include tables that are hidden or are part of Saved Questions virtual db
                        .filter(({visibility_type, db}) => !visibility_type && !db.is_saved_questions)
                        .sortBy(({display_name}) => display_name.toLowerCase())
                        .map((table) => this.getTableInEntitySearchFormat(table, segmentsList))
                        .value()

                    if (sortedTables.length > 0) {
                        return <EntitySearch
                            title="Which table?"
                            entities={sortedTables}
                            getUrlForEntity={this.getUrlForEntity}
                            backButtonUrl={backButtonUrl}
                            groupings={[NAME_GROUPING, DATABASE_GROUPING]}
                        />
                    } else {
                        return (
                            <div className="mt2 flex-full flex align-center justify-center">
                                <EmptyState
                                    message={<span>Defining common segments for your team makes it even easier to ask questions</span>}
                                    image="/app/img/segments_illustration"
                                    action="How to create segments"
                                    link="http://www.metabase.com/docs/latest/administration-guide/07-segments-and-metrics.html"
                                    className="mt2"
                                    imageClassName="mln2"
                                />
                            </div>
                        )
                    }
                }}
            </LoadingAndErrorWrapper>
        )
    }

}
