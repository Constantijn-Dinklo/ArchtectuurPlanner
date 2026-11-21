import { UserJwtPayload } from "../middelware";
import { Types } from "mongoose";
import Component from "../models/component.model";
import InformationObject from "../models/information/informationObject.models";

// A table is a component of its database. These are the questions other services ask about tables

// The tables of the environment, optionally only these ids or the tables of these databases
export async function findTables(environmentId: string | Types.ObjectId, filter: { ids?: string[], databaseIds?: string[] } = {}) {
    const or = [
        ...(filter.ids ? [{ _id: { $in: filter.ids } }] : []),
        ...(filter.databaseIds ? [{ resourceId: { $in: filter.databaseIds } }] : [])
    ];
    return Component.find({ environmentId, kind: 'table', ...(or.length ? { $or: or } : {}) });
}

// The database a table is part of, or undefined when the id is not a table
export async function getTableDatabaseId(user: Pick<UserJwtPayload, 'environmentId'>, tableId: string) {
    const table = await Component.findOne({ _id: tableId, environmentId: user.environmentId, kind: 'table' });
    return table?.resourceId.toString();
}

// The table gets a column for the information; a table only has fields, so an object gives a column for each of its fields
export async function addTableInformation(user: Pick<UserJwtPayload, 'environmentId'>, tableId: string, kind: 'field' | 'object', informationId: string) {
    const fieldIds = kind === 'field'
        ? [informationId]
        : ((await InformationObject.findOne({ _id: informationId, environmentId: user.environmentId }))?.informationFieldIds ?? []).map((id) => id.toString());
    if(!fieldIds.length) return;
    await Component.updateOne(
        { _id: tableId, environmentId: user.environmentId, kind: 'table' },
        { $addToSet: { informationFieldIds: { $each: fieldIds } } }
    );
}
